import { AudioEngine } from './audio.js';
import {
  ARENA_STAGE_COUNT,
  arenaStageForWave,
  circleOverlap,
  circleRectOverlap,
  clamp,
  combatSafeZones,
  constrainCombatCircle,
  distance,
  normalize,
  pointInsideBounds,
} from './arena.js';
import { COLORS, GAME_HEIGHT as HEIGHT, GAME_STATES, GAME_VERSION, GAME_WIDTH as WIDTH, MAX_ACTIVE_ENEMIES, PHYSICS, STORAGE_KEYS } from './config.js';
import { ENEMY_TYPES, buildWaveComposition, enemyScaleForWave, pickUpgradeChoices } from './game-data.js';
import { InputController } from './input.js';
import { WorldRenderer } from './render.js';
import { readNumber, writeNumber } from './storage.js';
import { CanvasUi } from './ui.js';

export class OneBulletGame {
  constructor(canvas, liveRegion = null) {
    if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError('A canvas element is required.');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable.');

    this.canvas = canvas;
    this.ctx = context;
    this.liveRegion = liveRegion;
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    this.version = GAME_VERSION;
    this.allowedStates = [...GAME_STATES];
    this.audio = new AudioEngine();
    this.worldRenderer = new WorldRenderer(context);
    this.ui = new CanvasUi(context);
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
    this.state = 'menu';
    this.lastTime = 0;
    this.elapsed = 0;
    this.nextEnemyId = 1;
    this.highScore = readNumber(STORAGE_KEYS.highScore);
    this.highWave = readNumber(STORAGE_KEYS.highWave);

    this.input = new InputController(canvas, {
      onInteraction: () => this.audio.ensure(),
      onUiPointer: (point) => this.ui.handlePointer(point),
      onFire: (point) => {
        this.input.pointer.x = point.x;
        this.input.pointer.y = point.y;
        this.fireBullet();
      },
      onKeyDown: (key) => this.handleKeyDown(key),
      onBlur: () => {
        if (this.state === 'playing') this.pause();
      },
    });

    this.resetRun();
    this.audio.setScene('menu');
    requestAnimationFrame((time) => this.loop(time));
  }

  handleKeyDown(key) {
    if (key === 'escape' || key === 'p') {
      if (this.state === 'playing') this.pause();
      else if (this.state === 'paused') this.resume();
      else if (this.state === 'gameover') this.goToMenu();
      return;
    }
    if ((key === ' ' || key === 'shift') && this.state === 'playing') this.dashRequested = true;
    if (key === 'q' && this.state === 'playing') this.recallBullet();
    if (key === 'm') this.toggleMute();
    if (this.state === 'upgrade' && ['1', '2', '3'].includes(key)) this.chooseUpgrade(Number(key) - 1);
    if ((key === 'enter' || key === ' ') && this.state === 'menu') this.startRun();
    if ((key === 'enter' || key === 'r') && this.state === 'gameover') this.startRun();
  }

  resetRun() {
    this.player = {
      x: WIDTH / 2,
      y: HEIGHT / 2,
      radius: 18,
      health: 3,
      maxHealth: 3,
      shield: 0,
      invulnerability: 0,
      dashCooldown: 0,
      dashRemaining: 0,
      dashDirection: { x: 0, y: 0 },
    };
    this.bullet = {
      x: this.player.x,
      y: this.player.y,
      radius: 8,
      vx: 0,
      vy: 0,
      held: true,
      recalling: false,
      recoverDelay: 0,
      recallCooldown: 0,
      bounceCount: 0,
      bouncesRemaining: 4,
      hitEnemyIds: new Set(),
      trail: [],
    };
    this.arenaStage = arenaStageForWave(1);
    this.enemies = [];
    this.enemyShots = [];
    this.particles = [];
    this.floatingTexts = [];
    this.wave = 0;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.waveClearTimer = 0;
    this.waveEnding = false;
    this.runTime = 0;
    this.upgradeStacks = {};
    this.upgradeChoices = [];
    this.previousUpgradeChoices = [];
    this.secondChanceUsed = false;
    this.dashRequested = false;
    this.banner = null;
    this.shake = 0;
    this.flash = 0;
    this.stats = { shots: 0, hits: 0, kills: 0, upgrades: 0, damageTaken: 0 };
  }

  startRun() {
    this.audio.play('click');
    this.resetRun();
    this.setState('playing');
    this.audio.setScene('combat');
    this.startNextWave();
  }

  goToMenu() {
    this.audio.play('click');
    this.resetRun();
    this.setState('menu');
    this.audio.setScene('menu');
  }

  pause() {
    if (this.state !== 'playing') return;
    this.setState('paused');
    this.audio.setScene('menu');
  }

  resume() {
    if (this.state !== 'paused') return;
    this.setState('playing');
    this.audio.setScene('combat');
  }

  toggleMute() {
    this.audio.toggleMute();
    this.audio.play('click');
  }

  setState(state) {
    if (!this.allowedStates.includes(state)) throw new Error(`Unknown state: ${state}`);
    this.state = state;
    const messages = {
      menu: 'القائمة الرئيسية',
      playing: `الموجة ${this.wave || 1}`,
      upgrade: 'اختر قدرة واحدة',
      paused: 'اللعبة متوقفة مؤقتًا',
      gameover: `انتهت الجولة عند الموجة ${this.wave}`,
    };
    this.announce(messages[state]);
  }

  announce(message) {
    if (!this.liveRegion || !message) return;
    this.liveRegion.textContent = '';
    requestAnimationFrame(() => { this.liveRegion.textContent = message; });
  }

  stack(id) {
    return Math.max(0, Number(this.upgradeStacks[id]) || 0);
  }

  startNextWave() {
    this.wave += 1;
    const previousStageId = this.arenaStage.id;
    this.arenaStage = arenaStageForWave(this.wave);
    this.highWave = Math.max(this.highWave, this.wave);
    writeNumber(STORAGE_KEYS.highWave, this.highWave);
    this.enemies = [];
    this.enemyShots = [];
    this.waveClearTimer = 0;
    this.waveEnding = false;
    this.player.shield = this.stack('wave-shield') > 0 ? 1 : 0;
    this.constrainCombatCircle(this.player);
    this.resetBulletToPlayer();
    this.bullet.recallCooldown = 0;
    this.player.dashCooldown = 0;

    const composition = buildWaveComposition(this.wave);
    composition.forEach((type, index) => this.spawnEnemy(type, index));
    const expanded = this.arenaStage.id > previousStageId;
    this.banner = {
      title: `الموجة ${this.wave}`,
      subtitle: expanded ? `${this.arenaStage.name} — مساحة جديدة اتفتحت` : 'اهزم كل الأعداء',
      time: expanded ? 2.2 : 1.45,
    };
    if (expanded) this.createRing(WIDTH / 2, HEIGHT / 2, COLORS.player, 220);
    this.createBurst(this.player.x, this.player.y, COLORS.player, 18, 220);
    this.announce(`بدأت الموجة ${this.wave}. ${composition.length} أعداء.`);
  }

  spawnEnemy(type, index = 0, options = {}) {
    if (this.enemies.length >= MAX_ACTIVE_ENEMIES) return null;
    const definition = ENEMY_TYPES[type] || ENEMY_TYPES.scout;
    const scale = enemyScaleForWave(this.wave);
    const miniScale = options.mini ? 0.66 : 1;
    const radius = definition.radius * miniScale;
    const point = options.point
      ? this.sanitizeSpawnPoint(options.point, radius)
      : this.findSpawnPoint(index, radius);
    const health = definition.health * scale.health * (options.mini ? 0.62 : 1);
    const enemy = {
      id: this.nextEnemyId++,
      type: definition.id,
      x: point.x,
      y: point.y,
      radius,
      speed: definition.speed * scale.speed * (options.mini ? 1.16 : 1),
      health,
      maxHealth: health,
      score: Math.round(definition.score * (1 + this.wave * 0.025) * (options.mini ? 0.45 : 1)),
      color: definition.color,
      attackCooldown: 1 + (index % 4) * 0.2,
      shotTelegraph: 0,
      chargeTelegraph: 0,
      chargeRemaining: 0,
      chargeDirection: { x: 0, y: 0 },
      telegraphDirection: null,
      phase: index * 0.77,
      spawnTime: 0.55,
      hitFlash: 0,
      mini: Boolean(options.mini),
    };
    this.enemies.push(enemy);
    return enemy;
  }

  findSpawnPoint(seed = 0, radius = 34) {
    const bounds = this.arenaStage.bounds;
    for (let attempt = 0; attempt < 72; attempt += 1) {
      const state = hash(seed + 1, this.wave + 1, attempt + 1);
      const x = bounds.x + 55 + (state % 1000) / 999 * Math.max(1, bounds.w - 110);
      const yState = hash(attempt + 11, this.wave + 19, seed + 31);
      const y = bounds.y + 55 + (yState % 1000) / 999 * Math.max(1, bounds.h - 110);
      const candidate = { x, y, radius };
      this.constrainCombatCircle(candidate);
      if (distance(candidate, this.player) < 220) continue;
      if (this.enemies.some((enemy) => circleOverlap(candidate, enemy, 24))) continue;
      if (this.arenaStage.obstacles.some((rect) => circleRectOverlap(candidate, rect))) continue;
      if (combatSafeZones(this.input.touchMode).some((rect) => circleRectOverlap(candidate, rect))) continue;
      return { x: candidate.x, y: candidate.y };
    }

    const columns = 7;
    const rows = 5;
    for (let index = 0; index < columns * rows; index += 1) {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const candidate = {
        x: bounds.x + (column + 1) * bounds.w / (columns + 1),
        y: bounds.y + (row + 1) * bounds.h / (rows + 1),
        radius,
      };
      this.constrainCombatCircle(candidate);
      if (distance(candidate, this.player) >= 180 && !this.enemies.some((enemy) => circleOverlap(candidate, enemy, 14))) {
        return { x: candidate.x, y: candidate.y };
      }
    }
    return { x: bounds.x + radius + 8, y: bounds.y + bounds.h - radius - 8 };
  }

  sanitizeSpawnPoint(point, radius = 34) {
    const candidate = { x: point.x, y: point.y, radius };
    this.constrainCombatCircle(candidate);
    return { x: candidate.x, y: candidate.y };
  }

  resetBulletToPlayer() {
    Object.assign(this.bullet, {
      x: this.player.x,
      y: this.player.y,
      vx: 0,
      vy: 0,
      held: true,
      recalling: false,
      recoverDelay: 0,
      bounceCount: 0,
      bouncesRemaining: 4 + this.stack('extended-ricochet') * 2,
      trail: [],
    });
    this.bullet.hitEnemyIds.clear();
  }

  fireBullet() {
    if (this.state !== 'playing' || !this.bullet.held || this.waveEnding) return false;
    const direction = normalize(this.input.pointer.x - this.player.x, this.input.pointer.y - this.player.y);
    if (!direction.x && !direction.y) return false;
    const speed = PHYSICS.baseBulletSpeed * (1 + this.stack('bullet-velocity') * 0.07);
    Object.assign(this.bullet, {
      x: this.player.x + direction.x * 30,
      y: this.player.y + direction.y * 30,
      vx: direction.x * speed,
      vy: direction.y * speed,
      held: false,
      recalling: false,
      recoverDelay: 0.2,
      bounceCount: 0,
      bouncesRemaining: 4 + this.stack('extended-ricochet') * 2,
      trail: [],
    });
    this.bullet.hitEnemyIds.clear();
    this.stats.shots += 1;
    this.audio.play('shoot');
    this.createBurst(this.bullet.x, this.bullet.y, COLORS.bullet, 9, 155);
    this.shake = Math.max(this.shake, 4);
    return true;
  }

  recallBullet(automatic = false) {
    if (this.state !== 'playing' || this.bullet.held || this.bullet.recalling) return false;
    if (!automatic && this.bullet.recallCooldown > 0) return false;
    this.bullet.recalling = true;
    this.bullet.hitEnemyIds.clear();
    if (!automatic) this.bullet.recallCooldown = Math.max(1.15, 3.8 - this.stack('magnetic-recall') * 0.38);
    this.audio.play('recover');
    return true;
  }

  tryDash() {
    if (!this.dashRequested) return;
    this.dashRequested = false;
    if (this.player.dashCooldown > 0 || this.player.dashRemaining > 0 || this.waveEnding) return;
    const movement = this.input.movementDirection();
    const aim = normalize(this.input.pointer.x - this.player.x, this.input.pointer.y - this.player.y);
    const direction = movement.x || movement.y ? movement : aim;
    if (!direction.x && !direction.y) return;
    this.player.dashDirection = direction;
    this.player.dashRemaining = 0.15;
    this.player.dashCooldown = Math.max(0.36, 1.12 * Math.pow(0.86, this.stack('quick-dash')));
    this.player.invulnerability = Math.max(this.player.invulnerability, 0.22);
    this.audio.play('dash');
    this.createBurst(this.player.x, this.player.y, COLORS.player, 11, 185);
  }

  update(dt) {
    this.elapsed += dt;
    this.runTime += dt;
    this.shake = Math.max(0, this.shake - dt * 22);
    this.flash = Math.max(0, this.flash - dt * 3.4);
    this.player.invulnerability = Math.max(0, this.player.invulnerability - dt);
    this.player.dashCooldown = Math.max(0, this.player.dashCooldown - dt);
    this.bullet.recallCooldown = Math.max(0, this.bullet.recallCooldown - dt);
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (this.comboTimer <= 0) this.combo = 0;
    if (this.banner && (this.banner.time -= dt) <= 0) this.banner = null;

    this.tryDash();
    this.updatePlayer(dt);
    this.updateBullet(dt);
    this.updateEnemies(dt);
    this.updateEnemyShots(dt);
    this.updateParticles(dt);
    this.updateFloatingTexts(dt);
    this.updateWaveCompletion(dt);
  }

  updateWaveCompletion(dt) {
    if (this.enemies.length > 0) {
      this.waveClearTimer = 0;
      this.waveEnding = false;
      return;
    }

    this.waveClearTimer += dt;
    this.waveEnding = true;
    if (!this.bullet.held && this.waveClearTimer >= 0.22) {
      if (!this.bullet.recalling) this.recallBullet(true);
    }
    if (this.bullet.held && this.waveClearTimer >= 0.62) this.openUpgradeSelection();
  }

  updatePlayer(dt) {
    let direction = this.input.movementDirection();
    let speed = PHYSICS.playerSpeed * (1 + this.stack('swift-steps') * 0.07);
    if (this.player.dashRemaining > 0) {
      this.player.dashRemaining -= dt;
      direction = this.player.dashDirection;
      speed = PHYSICS.dashSpeed;
      if (!this.reducedMotion && Math.random() > 0.42) this.createParticle(this.player.x, this.player.y, COLORS.player, 75);
    }
    this.player.x += direction.x * speed * dt;
    this.player.y += direction.y * speed * dt;
    this.constrainCombatCircle(this.player);
  }

  updateBullet(dt) {
    if (this.bullet.held) {
      const aim = normalize(this.input.pointer.x - this.player.x, this.input.pointer.y - this.player.y);
      this.bullet.x = this.player.x + aim.x * 30;
      this.bullet.y = this.player.y + aim.y * 30;
      this.bullet.trail = [];
      return;
    }

    this.bullet.recoverDelay = Math.max(0, this.bullet.recoverDelay - dt);
    this.bullet.trail.unshift({ x: this.bullet.x, y: this.bullet.y });
    this.bullet.trail.length = Math.min(16, this.bullet.trail.length);
    if (this.bullet.recalling) {
      const direction = normalize(this.player.x - this.bullet.x, this.player.y - this.bullet.y);
      const speed = 760 + this.stack('magnetic-recall') * 95 + (this.waveEnding ? 180 : 0);
      this.bullet.vx = direction.x * speed;
      this.bullet.vy = direction.y * speed;
    }

    const travel = Math.hypot(this.bullet.vx * dt, this.bullet.vy * dt);
    const steps = Math.max(1, Math.ceil(travel / PHYSICS.bulletStep));
    const stepDt = dt / steps;
    for (let step = 0; step < steps && !this.bullet.held; step += 1) {
      const previous = { x: this.bullet.x, y: this.bullet.y };
      this.bullet.x += this.bullet.vx * stepDt;
      this.bullet.y += this.bullet.vy * stepDt;
      if (!this.bullet.recalling) {
        this.handleArenaRicochet();
        this.handleObstacleRicochet(previous);
      }
      this.handleBulletEnemyHits();
      if (this.bullet.recoverDelay <= 0 && circleOverlap(this.bullet, this.player, 11)) this.catchBullet();
    }
  }

  handleBulletEnemyHits() {
    for (const enemy of [...this.enemies]) {
      if (enemy.spawnTime > 0 || this.bullet.hitEnemyIds.has(enemy.id) || !circleOverlap(this.bullet, enemy)) continue;
      this.bullet.hitEnemyIds.add(enemy.id);
      this.damageEnemy(enemy, this.currentBulletDamage(), true);
      this.bullet.vx *= 0.91;
      this.bullet.vy *= 0.91;
    }
  }

  handleArenaRicochet() {
    const bounds = this.arenaStage.bounds;
    const minX = bounds.x + this.bullet.radius;
    const maxX = bounds.x + bounds.w - this.bullet.radius;
    const minY = bounds.y + this.bullet.radius;
    const maxY = bounds.y + bounds.h - this.bullet.radius;
    let bounced = false;
    if (this.bullet.x <= minX || this.bullet.x >= maxX) {
      this.bullet.x = clamp(this.bullet.x, minX, maxX);
      this.bullet.vx *= -1;
      bounced = true;
    }
    if (this.bullet.y <= minY || this.bullet.y >= maxY) {
      this.bullet.y = clamp(this.bullet.y, minY, maxY);
      this.bullet.vy *= -1;
      bounced = true;
    }
    if (bounced) this.onRicochet();
  }

  handleObstacleRicochet(previous) {
    for (const obstacle of this.arenaStage.obstacles) {
      if (!circleRectOverlap(this.bullet, obstacle)) continue;
      const fromLeft = previous.x + this.bullet.radius <= obstacle.x;
      const fromRight = previous.x - this.bullet.radius >= obstacle.x + obstacle.w;
      const fromTop = previous.y + this.bullet.radius <= obstacle.y;
      const fromBottom = previous.y - this.bullet.radius >= obstacle.y + obstacle.h;
      if (fromLeft || fromRight) {
        this.bullet.vx *= -1;
        this.bullet.x = fromLeft ? obstacle.x - this.bullet.radius - 0.5 : obstacle.x + obstacle.w + this.bullet.radius + 0.5;
      } else if (fromTop || fromBottom) {
        this.bullet.vy *= -1;
        this.bullet.y = fromTop ? obstacle.y - this.bullet.radius - 0.5 : obstacle.y + obstacle.h + this.bullet.radius + 0.5;
      } else {
        const overlapX = Math.min(
          Math.abs(this.bullet.x - (obstacle.x - this.bullet.radius)),
          Math.abs(this.bullet.x - (obstacle.x + obstacle.w + this.bullet.radius)),
        );
        const overlapY = Math.min(
          Math.abs(this.bullet.y - (obstacle.y - this.bullet.radius)),
          Math.abs(this.bullet.y - (obstacle.y + obstacle.h + this.bullet.radius)),
        );
        if (overlapX < overlapY) this.bullet.vx *= -1;
        else this.bullet.vy *= -1;
        this.bullet.x = previous.x;
        this.bullet.y = previous.y;
      }
      this.onRicochet();
      return;
    }
  }

  onRicochet() {
    this.bullet.bounceCount += 1;
    this.bullet.bouncesRemaining -= 1;
    this.bullet.hitEnemyIds.clear();
    this.audio.play('ricochet');
    this.createBurst(this.bullet.x, this.bullet.y, COLORS.bullet, 6, 115);
    if (this.bullet.bouncesRemaining <= 0) {
      const speed = Math.hypot(this.bullet.vx, this.bullet.vy);
      if (speed > 260) {
        const direction = normalize(this.bullet.vx, this.bullet.vy);
        this.bullet.vx = direction.x * Math.max(260, speed * 0.62);
        this.bullet.vy = direction.y * Math.max(260, speed * 0.62);
      }
    }
  }

  currentBulletDamage() {
    let damage = 1 + this.stack('heavy-shot') * 0.35;
    damage += this.bullet.bounceCount * this.stack('hot-ricochet') * 0.24;
    if (this.bullet.recalling) damage *= 1 + this.stack('recall-strike') * 0.3;
    return damage;
  }

  catchBullet() {
    this.resetBulletToPlayer();
    this.audio.play('recover');
    this.createBurst(this.player.x, this.player.y, COLORS.bullet, 12, 150);
  }

  damageEnemy(enemy, damage, fromBullet = false) {
    if (!this.enemies.includes(enemy)) return;
    enemy.health -= damage;
    enemy.hitFlash = 0.14;
    if (fromBullet) this.stats.hits += 1;
    this.audio.play(enemy.health <= 0 ? 'kill' : 'hit');
    this.createBurst(enemy.x, enemy.y, enemy.color, enemy.health <= 0 ? 17 : 8, enemy.health <= 0 ? 270 : 150);
    this.addFloatingText(enemy.x, enemy.y - enemy.radius - 12, `-${formatDamage(damage)}`, COLORS.text);
    if (fromBullet && this.stack('shock-impact') > 0) this.applyShock(enemy);
    if (enemy.health <= 0) this.killEnemy(enemy);
  }

  applyShock(origin) {
    const radius = 82 + this.stack('shock-impact') * 20;
    const damage = 0.18 + this.stack('shock-impact') * 0.2;
    this.createRing(origin.x, origin.y, COLORS.electric, radius);
    for (const enemy of [...this.enemies]) {
      if (enemy.id === origin.id || distance(enemy, origin) > radius) continue;
      enemy.health -= damage;
      enemy.hitFlash = 0.12;
      if (enemy.health <= 0) this.killEnemy(enemy);
    }
  }

  killEnemy(enemy) {
    if (!this.enemies.includes(enemy)) return;
    this.enemies = this.enemies.filter((candidate) => candidate.id !== enemy.id);
    this.combo += 1;
    this.comboTimer = 2.15;
    const gained = Math.round(enemy.score * Math.max(1, Math.min(8, this.combo)));
    this.score += gained;
    this.stats.kills += 1;
    this.highScore = Math.max(this.highScore, this.score);
    writeNumber(STORAGE_KEYS.highScore, this.highScore);
    this.addFloatingText(enemy.x, enemy.y, `+${gained}`, COLORS.bullet);

    if (enemy.type === 'splitter' && !enemy.mini) {
      const children = Math.min(2, Math.max(0, MAX_ACTIVE_ENEMIES - this.enemies.length));
      for (let index = 0; index < children; index += 1) {
        this.spawnEnemy('scout', index, {
          mini: true,
          point: { x: enemy.x + (index === 0 ? -30 : 30), y: enemy.y },
        });
      }
    }
  }

  updateEnemies(dt) {
    const scale = enemyScaleForWave(this.wave);
    for (const enemy of [...this.enemies]) {
      enemy.spawnTime = Math.max(0, enemy.spawnTime - dt);
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      enemy.attackCooldown -= dt;
      enemy.phase += dt * 2;
      const toPlayer = normalize(this.player.x - enemy.x, this.player.y - enemy.y);

      if (enemy.type === 'sniper') this.updateSniper(enemy, toPlayer, scale, dt);
      else if (enemy.type === 'charger') this.updateCharger(enemy, toPlayer, dt);
      else {
        const orbit = enemy.type === 'scout' ? Math.sin(enemy.phase) * 0.18 : 0;
        enemy.x += (toPlayer.x - toPlayer.y * orbit) * enemy.speed * dt;
        enemy.y += (toPlayer.y + toPlayer.x * orbit) * enemy.speed * dt;
      }
      this.constrainCombatCircle(enemy);
      if (enemy.spawnTime <= 0 && circleOverlap(enemy, this.player, -2)) this.damagePlayer(enemy.x, enemy.y);
    }
    this.separateEnemies();
  }

  updateSniper(enemy, toPlayer, scale, dt) {
    if (enemy.shotTelegraph > 0) {
      enemy.shotTelegraph -= dt;
      if (enemy.shotTelegraph <= 0) {
        const direction = enemy.telegraphDirection || toPlayer;
        this.fireEnemyShot(enemy, direction, 340 * scale.shotSpeed);
        enemy.telegraphDirection = null;
        enemy.attackCooldown = Math.max(1.05, 1.9 - this.wave * 0.022);
      }
      return;
    }

    const currentDistance = distance(enemy, this.player);
    const desired = currentDistance < 270 ? -1 : currentDistance > 440 ? 1 : 0;
    const strafe = { x: -toPlayer.y, y: toPlayer.x };
    enemy.x += (toPlayer.x * desired + strafe.x * Math.sin(enemy.phase) * 0.42) * enemy.speed * dt;
    enemy.y += (toPlayer.y * desired + strafe.y * Math.sin(enemy.phase) * 0.42) * enemy.speed * dt;
    if (enemy.attackCooldown <= 0) {
      enemy.telegraphDirection = { ...toPlayer };
      enemy.shotTelegraph = 0.55;
    }
  }

  updateCharger(enemy, toPlayer, dt) {
    if (enemy.chargeRemaining > 0) {
      enemy.chargeRemaining -= dt;
      enemy.x += enemy.chargeDirection.x * 500 * dt;
      enemy.y += enemy.chargeDirection.y * 500 * dt;
      return;
    }
    if (enemy.chargeTelegraph > 0) {
      enemy.chargeTelegraph -= dt;
      if (enemy.chargeTelegraph <= 0) {
        enemy.chargeDirection = enemy.telegraphDirection || toPlayer;
        enemy.telegraphDirection = null;
        enemy.chargeRemaining = 0.32;
      }
      return;
    }
    enemy.x += toPlayer.x * enemy.speed * dt;
    enemy.y += toPlayer.y * enemy.speed * dt;
    if (enemy.attackCooldown <= 0) {
      enemy.telegraphDirection = { ...toPlayer };
      enemy.chargeTelegraph = 0.62;
      enemy.attackCooldown = Math.max(1.8, 3.1 - this.wave * 0.03);
    }
  }

  separateEnemies() {
    for (let firstIndex = 0; firstIndex < this.enemies.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < this.enemies.length; secondIndex += 1) {
        const first = this.enemies[firstIndex];
        const second = this.enemies[secondIndex];
        let dx = second.x - first.x;
        let dy = second.y - first.y;
        let length = Math.hypot(dx, dy);
        if (length < 0.001) {
          const angle = (first.id * 2.399963) % (Math.PI * 2);
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          length = 1;
        }
        const minimum = first.radius + second.radius + 4;
        if (length >= minimum) continue;
        const push = (minimum - length) * 0.5;
        first.x -= dx / length * push;
        first.y -= dy / length * push;
        second.x += dx / length * push;
        second.y += dy / length * push;
        this.constrainCombatCircle(first);
        this.constrainCombatCircle(second);
      }
    }
  }

  fireEnemyShot(enemy, direction, speed) {
    this.enemyShots.push({ x: enemy.x, y: enemy.y, vx: direction.x * speed, vy: direction.y * speed, radius: 7, life: 4 });
    this.audio.play('enemy-shot');
  }

  updateEnemyShots(dt) {
    for (const shot of this.enemyShots) {
      const travel = Math.hypot(shot.vx * dt, shot.vy * dt);
      const steps = Math.max(1, Math.ceil(travel / PHYSICS.enemyShotStep));
      const stepDt = dt / steps;
      for (let step = 0; step < steps && shot.life > 0; step += 1) {
        shot.x += shot.vx * stepDt;
        shot.y += shot.vy * stepDt;
        if (this.arenaStage.obstacles.some((rect) => circleRectOverlap(shot, rect))) {
          shot.life = 0;
          break;
        }
        if (circleOverlap(shot, this.player)) {
          shot.life = 0;
          this.damagePlayer(shot.x, shot.y);
          break;
        }
      }
      shot.life -= dt;
    }
    this.enemyShots = this.enemyShots.filter((shot) => shot.life > 0 && pointInsideBounds(shot, this.arenaStage.bounds, 20));
  }

  damagePlayer(sourceX, sourceY) {
    if (this.player.invulnerability > 0 || this.state !== 'playing') return;
    if (this.player.shield > 0) {
      this.player.shield = 0;
      this.player.invulnerability = 0.55;
      this.audio.play('shield');
      this.createRing(this.player.x, this.player.y, COLORS.electric, 62);
      this.addFloatingText(this.player.x, this.player.y - 38, 'تم صد الضربة', COLORS.electric);
      return;
    }

    this.player.health -= 1;
    this.stats.damageTaken += 1;
    this.player.invulnerability = 1.05;
    const push = normalize(this.player.x - sourceX, this.player.y - sourceY);
    this.player.x += push.x * 44;
    this.player.y += push.y * 44;
    this.constrainCombatCircle(this.player);
    this.audio.play('damage');
    this.shake = 15;
    this.flash = 0.5;

    if (this.player.health > 0) return;
    if (this.stack('second-chance') > 0 && !this.secondChanceUsed) {
      this.secondChanceUsed = true;
      this.player.health = 1;
      this.player.shield = 1;
      this.addFloatingText(this.player.x, this.player.y - 52, 'فرصة أخيرة', COLORS.success);
      this.createRing(this.player.x, this.player.y, COLORS.success, 92);
      return;
    }
    this.finishRun();
  }

  finishRun() {
    if (this.state === 'gameover') return;
    this.setState('gameover');
    this.audio.setScene('menu');
    this.audio.play('damage');
    this.highScore = Math.max(this.highScore, this.score);
    this.highWave = Math.max(this.highWave, this.wave);
    writeNumber(STORAGE_KEYS.highScore, this.highScore);
    writeNumber(STORAGE_KEYS.highWave, this.highWave);
  }

  openUpgradeSelection() {
    if (this.state !== 'playing') return;
    this.waveEnding = false;
    this.upgradeChoices = pickUpgradeChoices(this.upgradeStacks, 3, Math.random, this.previousUpgradeChoices);
    if (this.upgradeChoices.length === 0) {
      this.score += 750;
      this.player.health = Math.min(this.player.maxHealth, this.player.health + 1);
      this.startNextWave();
      return;
    }
    this.previousUpgradeChoices = this.upgradeChoices.map((upgrade) => upgrade.id);
    this.setState('upgrade');
    this.audio.setScene('menu');
    this.audio.play('upgrade');
  }

  chooseUpgrade(index) {
    if (this.state !== 'upgrade') return false;
    const upgrade = this.upgradeChoices[index];
    if (!upgrade) return false;
    this.upgradeStacks[upgrade.id] = this.stack(upgrade.id) + 1;
    if (upgrade.id === 'vitality') {
      this.player.maxHealth += 1;
      this.player.health = Math.min(this.player.maxHealth, this.player.health + 1);
    }
    if (upgrade.id === 'wave-shield') this.player.shield = 1;
    this.stats.upgrades += 1;
    this.upgradeChoices = [];
    this.setState('playing');
    this.audio.setScene('combat');
    this.startNextWave();
    return true;
  }

  constrainCombatCircle(circle) {
    return constrainCombatCircle(circle, this.arenaStage, this.input.touchMode, 5);
  }

  currentHint() {
    if (this.wave !== 1 || this.state !== 'playing') return null;
    if (this.stats.shots === 0) {
      return this.input.touchMode
        ? 'حرّك بالعصا اليسرى، ثم المس أي مكان خارجها لإطلاق الطلقة'
        : 'تحرك بـ WASD، صوّب بالماوس، واضغط لإطلاق طلقتك الوحيدة';
    }
    if (!this.bullet.held && !this.bullet.recalling) {
      return this.input.touchMode ? 'اضغط استدعاء لاسترجاع الطلقة' : 'اضغط Q لاستدعاء الطلقة';
    }
    if (this.stats.kills === 0 && this.bullet.held) return 'استخدم الجدران والعوائق لتغيير اتجاه الطلقة';
    return null;
  }

  updateParticles(dt) {
    for (const particle of this.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      if (particle.type === 'ring') particle.radius += particle.speed * dt;
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  updateFloatingTexts(dt) {
    for (const item of this.floatingTexts) {
      item.life -= dt;
      item.y -= 34 * dt;
    }
    this.floatingTexts = this.floatingTexts.filter((item) => item.life > 0);
  }

  createParticle(x, y, color, speed = 150) {
    if (this.reducedMotion) return;
    const angle = Math.random() * Math.PI * 2;
    this.particles.push({
      type: 'particle', x, y, color,
      vx: Math.cos(angle) * speed * (0.35 + Math.random()),
      vy: Math.sin(angle) * speed * (0.35 + Math.random()),
      size: 3 + Math.random() * 3,
      life: 0.38 + Math.random() * 0.3,
      maxLife: 0.68,
    });
    if (this.particles.length > 190) this.particles.splice(0, this.particles.length - 190);
  }

  createBurst(x, y, color, count = 12, speed = 180) {
    if (this.reducedMotion) return;
    for (let index = 0; index < count; index += 1) this.createParticle(x, y, color, speed);
  }

  createRing(x, y, color, radius = 80) {
    this.particles.push({ type: 'ring', x, y, color, radius: 8, speed: radius * 2.2, vx: 0, vy: 0, life: 0.45, maxLife: 0.45 });
    if (this.particles.length > 190) this.particles.splice(0, this.particles.length - 190);
  }

  addFloatingText(x, y, text, color) {
    this.floatingTexts.push({ x, y, text, color, life: 0.85, maxLife: 0.85 });
    if (this.floatingTexts.length > 50) this.floatingTexts.splice(0, this.floatingTexts.length - 50);
  }

  loop(time) {
    const dt = Math.min(0.033, Math.max(0, (time - this.lastTime) / 1000 || 0));
    this.lastTime = time;
    if (this.state === 'playing') this.update(dt);
    else {
      this.elapsed += dt;
      this.updateParticles(dt);
      this.updateFloatingTexts(dt);
    }
    this.draw();
    requestAnimationFrame((nextTime) => this.loop(nextTime));
  }

  draw() {
    this.worldRenderer.draw(this);
    this.ui.draw(this);
  }

  getSnapshot() {
    return {
      version: this.version,
      state: this.state,
      allowedStates: [...this.allowedStates],
      wave: this.wave,
      score: this.score,
      enemies: this.enemies.length,
      enemyTypes: this.enemies.map((enemy) => enemy.type),
      enemyShots: this.enemyShots.length,
      upgrades: this.stats.upgrades,
      upgradeChoices: this.upgradeChoices.map((item) => item.id),
      bulletHeld: this.bullet.held,
      bulletRecalling: this.bullet.recalling,
      waveEnding: this.waveEnding,
      health: this.player.health,
      maxHealth: this.player.maxHealth,
      shield: this.player.shield,
      arenaStage: this.arenaStage.id,
      arenaName: this.arenaStage.name,
      arenaBounds: { ...this.arenaStage.bounds },
      arenaFullyUnlocked: this.arenaStage.id === ARENA_STAGE_COUNT - 1,
      arenaProgressionAutomatic: true,
      puzzleObjectivesPresent: false,
      removedSystemsPresent: false,
      touchMode: this.input.touchMode,
      touchSafeZones: this.input.touchMode ? combatSafeZones(true) : [],
      uiRegions: this.ui.regions.length,
      audioMuted: this.audio.settings.muted,
    };
  }
}

function hash(a, b, c) {
  let value = (a * 73856093) ^ (b * 19349663) ^ (c * 83492791);
  value ^= value >>> 13;
  value = Math.imul(value, 1274126177);
  return value >>> 0;
}

function formatDamage(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
