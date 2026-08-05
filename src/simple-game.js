import { AudioEngine } from './audio.js';
import {
  ENEMY_TYPES,
  GAME_HEIGHT as HEIGHT,
  GAME_WIDTH as WIDTH,
  SIMPLE_GAME_VERSION,
  buildWaveComposition,
  enemyScaleForWave,
  pickUpgradeChoices,
} from './simple-data.js';

const FONT = 'Changa, "Segoe UI", Tahoma, sans-serif';
const STORAGE = Object.freeze({
  highScore: 'one-bullet-simple-high-score',
  highWave: 'one-bullet-simple-high-wave',
});

const COLORS = Object.freeze({
  background: '#050711',
  panel: 'rgba(12, 18, 38, 0.96)',
  panelSoft: 'rgba(19, 27, 53, 0.94)',
  border: '#35416e',
  grid: 'rgba(98, 122, 190, 0.08)',
  text: '#f8f9ff',
  muted: '#aeb7da',
  player: '#62f3ff',
  bullet: '#ffe66d',
  danger: '#ff526a',
  success: '#53f2a1',
  electric: '#58a6ff',
  purple: '#b983ff',
});

const BASE_PLAYER_SPEED = 285;
const DASH_SPEED = 760;
const BASE_BULLET_SPEED = 920;

export class SimpleOneBulletArena {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    this.version = SIMPLE_GAME_VERSION;
    this.allowedStates = ['menu', 'howto', 'playing', 'upgrade', 'paused', 'gameover'];
    this.audio = new AudioEngine();
    this.keys = new Set();
    this.pointer = { x: WIDTH / 2, y: HEIGHT / 2, down: false };
    this.touchMode = window.matchMedia?.('(pointer: coarse)').matches || false;
    this.touchMove = null;
    this.state = 'menu';
    this.lastTime = 0;
    this.elapsed = 0;
    this.shake = 0;
    this.flash = 0;
    this.hitStop = 0;
    this.slowMotion = 0;
    this.uiRegions = [];
    this.nextEnemyId = 1;
    this.banner = null;
    this.highScore = Number(localStorage.getItem(STORAGE.highScore) || 0);
    this.highWave = Number(localStorage.getItem(STORAGE.highWave) || 0);
    this.bindInput();
    this.resetRun();
    requestAnimationFrame((time) => this.loop(time));
  }

  bindInput() {
    window.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      this.keys.add(key);
      this.audio.ensure();
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
      if (key === 'escape') {
        if (this.state === 'playing') this.pause();
        else if (this.state === 'paused') this.resume();
        else if (this.state === 'howto' || this.state === 'gameover') this.goToMenu();
        return;
      }
      if (key === 'p' && this.state === 'playing') { this.pause(); return; }
      if (key === 'p' && this.state === 'paused') { this.resume(); return; }
      if ((key === ' ' || key === 'shift') && this.state === 'playing') this.dashRequested = true;
      if (key === 'q' && this.state === 'playing') this.recallBullet();
      if (key === 'm') this.audio.toggleMute();
      if (this.state === 'upgrade' && ['1', '2', '3'].includes(key)) this.chooseUpgrade(Number(key) - 1);
      if ((key === 'enter' || key === ' ') && this.state === 'menu') this.startRun();
      if ((key === 'enter' || key === 'r') && this.state === 'gameover') this.startRun();
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.key.toLowerCase()));

    const updatePointer = (event) => {
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rect.left) / rect.width) * WIDTH;
      this.pointer.y = ((event.clientY - rect.top) / rect.height) * HEIGHT;
    };

    this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    this.canvas.addEventListener('pointermove', (event) => {
      updatePointer(event);
      if (this.touchMove?.id === event.pointerId) {
        this.touchMove.x = this.pointer.x;
        this.touchMove.y = this.pointer.y;
      }
    });
    this.canvas.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      updatePointer(event);
      this.pointer.down = true;
      this.audio.ensure();
      this.canvas.setPointerCapture?.(event.pointerId);
      if (this.handleUiClick(this.pointer.x, this.pointer.y)) return;
      if (this.state !== 'playing') return;
      if (event.pointerType === 'touch') {
        this.touchMode = true;
        if (this.pointer.x < WIDTH * 0.44 && this.pointer.y > HEIGHT * 0.34) {
          this.touchMove = {
            id: event.pointerId,
            originX: this.pointer.x,
            originY: this.pointer.y,
            x: this.pointer.x,
            y: this.pointer.y,
          };
          return;
        }
      }
      this.fireBullet();
    });
    const releasePointer = (event) => {
      this.pointer.down = false;
      if (this.touchMove?.id === event.pointerId) this.touchMove = null;
    };
    this.canvas.addEventListener('pointerup', releasePointer);
    this.canvas.addEventListener('pointercancel', releasePointer);
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.touchMove = null;
      if (this.state === 'playing') this.pause();
    });
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
    this.enemies = [];
    this.enemyShots = [];
    this.particles = [];
    this.floatingTexts = [];
    this.wave = 0;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.waveClearTimer = 0;
    this.runTime = 0;
    this.upgradeStacks = {};
    this.upgradeChoices = [];
    this.secondChanceUsed = false;
    this.dashRequested = false;
    this.banner = null;
    this.arena = createSimpleArena();
    this.stats = { shots: 0, hits: 0, kills: 0, upgrades: 0, damageTaken: 0 };
  }

  startRun() {
    this.audio.play('click');
    this.resetRun();
    this.state = 'playing';
    this.audio.setScene('combat');
    this.spawnNextWave();
  }

  goToMenu() {
    this.audio.play('click');
    this.resetRun();
    this.state = 'menu';
    this.audio.setScene('menu');
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.audio.setScene('menu');
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.audio.setScene('combat');
  }

  stack(id) {
    return Math.max(0, Number(this.upgradeStacks[id]) || 0);
  }

  spawnNextWave() {
    this.wave += 1;
    this.highWave = Math.max(this.highWave, this.wave);
    localStorage.setItem(STORAGE.highWave, String(this.highWave));
    this.enemies = [];
    this.enemyShots = [];
    this.waveClearTimer = 0;
    this.player.shield = Math.max(this.player.shield, this.stack('wave-shield') > 0 ? 1 : 0);
    this.resetBulletToPlayer();
    const composition = buildWaveComposition(this.wave);
    composition.forEach((type, index) => this.spawnEnemy(type, index));
    this.banner = { title: `الموجة ${this.wave}`, subtitle: 'اهزم الجميع ثم اختر قدرة جديدة', time: 1.8 };
    this.createBurst(this.player.x, this.player.y, COLORS.player, 22, 250);
  }

  spawnEnemy(type, index = 0, options = {}) {
    const definition = ENEMY_TYPES[type] || ENEMY_TYPES.scout;
    const scale = enemyScaleForWave(this.wave);
    const point = options.point || this.findSpawnPoint(index);
    const miniScale = options.mini ? 0.68 : 1;
    const health = definition.health * scale.health * (options.mini ? 0.65 : 1);
    this.enemies.push({
      id: this.nextEnemyId++,
      type: definition.id,
      x: point.x,
      y: point.y,
      radius: definition.radius * miniScale,
      speed: definition.speed * scale.speed * (options.mini ? 1.18 : 1),
      health,
      maxHealth: health,
      score: Math.round(definition.score * (1 + this.wave * 0.03) * (options.mini ? 0.5 : 1)),
      color: definition.color,
      attackCooldown: 0.9 + (index % 4) * 0.22,
      chargeTelegraph: 0,
      chargeRemaining: 0,
      chargeDirection: { x: 0, y: 0 },
      phase: index * 0.77,
      spawnTime: 0.42,
      hitFlash: 0,
      slowTimer: 0,
      mini: Boolean(options.mini),
    });
  }

  findSpawnPoint(seed = 0) {
    const positions = [
      { x: 90, y: 110 }, { x: WIDTH - 90, y: 110 },
      { x: 90, y: HEIGHT - 110 }, { x: WIDTH - 90, y: HEIGHT - 110 },
      { x: WIDTH / 2, y: 90 }, { x: WIDTH / 2, y: HEIGHT - 90 },
      { x: 120, y: HEIGHT / 2 }, { x: WIDTH - 120, y: HEIGHT / 2 },
    ];
    for (let attempt = 0; attempt < positions.length; attempt += 1) {
      const point = positions[(seed + attempt + this.wave) % positions.length];
      if (distance(point, this.player) > 250 && !this.arena.obstacles.some((item) => circleRectOverlap({ ...point, radius: 34 }, item))) return { ...point };
    }
    return { x: 80, y: 80 };
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
    if (this.state !== 'playing' || !this.bullet.held) return false;
    const direction = normalize(this.pointer.x - this.player.x, this.pointer.y - this.player.y);
    if (direction.x === 0 && direction.y === 0) return false;
    const speed = BASE_BULLET_SPEED * (1 + this.stack('bullet-velocity') * 0.08);
    Object.assign(this.bullet, {
      x: this.player.x + direction.x * 30,
      y: this.player.y + direction.y * 30,
      vx: direction.x * speed,
      vy: direction.y * speed,
      held: false,
      recalling: false,
      recoverDelay: 0.22,
      bounceCount: 0,
      bouncesRemaining: 4 + this.stack('extended-ricochet') * 2,
      trail: [],
    });
    this.bullet.hitEnemyIds.clear();
    this.stats.shots += 1;
    this.audio.play('shoot');
    this.createBurst(this.bullet.x, this.bullet.y, COLORS.bullet, 10, 160);
    this.shake = 5;
    return true;
  }

  recallBullet() {
    if (this.state !== 'playing' || this.bullet.held || this.bullet.recalling || this.bullet.recallCooldown > 0) return false;
    this.bullet.recalling = true;
    this.bullet.hitEnemyIds.clear();
    this.bullet.recallCooldown = Math.max(1.2, 4 - this.stack('magnetic-recall') * 0.42);
    this.audio.play('recover');
    return true;
  }

  getMovementDirection() {
    let horizontal = Number(this.keys.has('d') || this.keys.has('arrowright')) - Number(this.keys.has('a') || this.keys.has('arrowleft'));
    let vertical = Number(this.keys.has('s') || this.keys.has('arrowdown')) - Number(this.keys.has('w') || this.keys.has('arrowup'));
    if (this.touchMove) {
      const dx = clamp(this.touchMove.x - this.touchMove.originX, -72, 72);
      const dy = clamp(this.touchMove.y - this.touchMove.originY, -72, 72);
      if (Math.hypot(dx, dy) > 8) {
        horizontal += dx / 72;
        vertical += dy / 72;
      }
    }
    return normalize(horizontal, vertical);
  }

  tryDash() {
    if (!this.dashRequested) return;
    this.dashRequested = false;
    if (this.player.dashCooldown > 0 || this.player.dashRemaining > 0) return;
    const movement = this.getMovementDirection();
    const fallback = normalize(this.pointer.x - this.player.x, this.pointer.y - this.player.y);
    const direction = movement.x || movement.y ? movement : fallback;
    if (!direction.x && !direction.y) return;
    this.player.dashDirection = direction;
    this.player.dashRemaining = 0.15;
    this.player.dashCooldown = Math.max(0.38, 1.15 * Math.pow(0.86, this.stack('quick-dash')));
    this.player.invulnerability = Math.max(this.player.invulnerability, 0.22);
    this.audio.play('dash');
    this.createBurst(this.player.x, this.player.y, COLORS.player, 12, 190);
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
    if (this.enemies.length === 0 && this.state === 'playing') {
      this.waveClearTimer += dt;
      if (this.waveClearTimer >= 0.75 && this.bullet.held) this.openUpgradeSelection();
    } else {
      this.waveClearTimer = 0;
    }
  }

  updatePlayer(dt) {
    let direction = this.getMovementDirection();
    let speed = BASE_PLAYER_SPEED * (1 + this.stack('swift-steps') * 0.08);
    if (this.player.dashRemaining > 0) {
      this.player.dashRemaining -= dt;
      direction = this.player.dashDirection;
      speed = DASH_SPEED;
      if (Math.random() > 0.35) this.createParticle(this.player.x, this.player.y, COLORS.player, 75);
    }
    this.player.x = clamp(this.player.x + direction.x * speed * dt, 28, WIDTH - 28);
    this.player.y = clamp(this.player.y + direction.y * speed * dt, 28, HEIGHT - 28);
    this.resolveObstacle(this.player);
  }

  updateBullet(dt) {
    if (this.bullet.held) {
      const aim = normalize(this.pointer.x - this.player.x, this.pointer.y - this.player.y);
      this.bullet.x = this.player.x + aim.x * 30;
      this.bullet.y = this.player.y + aim.y * 30;
      this.bullet.trail = [];
      return;
    }
    this.bullet.recoverDelay = Math.max(0, this.bullet.recoverDelay - dt);
    this.bullet.trail.unshift({ x: this.bullet.x, y: this.bullet.y });
    this.bullet.trail.length = Math.min(18, this.bullet.trail.length);
    if (this.bullet.recalling) {
      const direction = normalize(this.player.x - this.bullet.x, this.player.y - this.bullet.y);
      const speed = 700 + this.stack('magnetic-recall') * 105;
      this.bullet.vx = direction.x * speed;
      this.bullet.vy = direction.y * speed;
    }
    const previous = { x: this.bullet.x, y: this.bullet.y };
    this.bullet.x += this.bullet.vx * dt;
    this.bullet.y += this.bullet.vy * dt;
    if (!this.bullet.recalling) {
      this.handleOuterRicochet();
      this.handleObstacleRicochet(previous);
    }
    for (const enemy of [...this.enemies]) {
      if (this.bullet.hitEnemyIds.has(enemy.id) || !circleOverlap(this.bullet, enemy)) continue;
      this.bullet.hitEnemyIds.add(enemy.id);
      this.damageEnemy(enemy, this.currentBulletDamage(), true);
      this.bullet.vx *= 0.9;
      this.bullet.vy *= 0.9;
    }
    if (this.bullet.recoverDelay <= 0 && circleOverlap(this.bullet, this.player, 11)) this.catchBullet();
  }

  handleOuterRicochet() {
    let bounced = false;
    if (this.bullet.x <= this.bullet.radius || this.bullet.x >= WIDTH - this.bullet.radius) {
      this.bullet.x = clamp(this.bullet.x, this.bullet.radius, WIDTH - this.bullet.radius);
      this.bullet.vx *= -1;
      bounced = true;
    }
    if (this.bullet.y <= this.bullet.radius || this.bullet.y >= HEIGHT - this.bullet.radius) {
      this.bullet.y = clamp(this.bullet.y, this.bullet.radius, HEIGHT - this.bullet.radius);
      this.bullet.vy *= -1;
      bounced = true;
    }
    if (bounced) this.onRicochet();
  }

  handleObstacleRicochet(previous) {
    for (const obstacle of this.arena.obstacles) {
      if (!circleRectOverlap(this.bullet, obstacle)) continue;
      const fromLeft = previous.x + this.bullet.radius <= obstacle.x;
      const fromRight = previous.x - this.bullet.radius >= obstacle.x + obstacle.w;
      const fromTop = previous.y + this.bullet.radius <= obstacle.y;
      const fromBottom = previous.y - this.bullet.radius >= obstacle.y + obstacle.h;
      if (fromLeft || fromRight) {
        this.bullet.vx *= -1;
        this.bullet.x = fromLeft ? obstacle.x - this.bullet.radius - 1 : obstacle.x + obstacle.w + this.bullet.radius + 1;
      } else if (fromTop || fromBottom) {
        this.bullet.vy *= -1;
        this.bullet.y = fromTop ? obstacle.y - this.bullet.radius - 1 : obstacle.y + obstacle.h + this.bullet.radius + 1;
      } else {
        this.bullet.vx *= -1;
        this.bullet.vy *= -1;
      }
      this.onRicochet();
      break;
    }
  }

  onRicochet() {
    this.bullet.bounceCount += 1;
    this.bullet.bouncesRemaining -= 1;
    this.bullet.hitEnemyIds.clear();
    this.audio.play('ricochet');
    this.createBurst(this.bullet.x, this.bullet.y, COLORS.bullet, 7, 125);
    if (this.bullet.bouncesRemaining <= 0) {
      this.bullet.vx *= 0.25;
      this.bullet.vy *= 0.25;
    }
  }

  currentBulletDamage() {
    let damage = 1 + this.stack('heavy-shot') * 0.45;
    damage += this.bullet.bounceCount * this.stack('hot-ricochet') * 0.3;
    if (this.bullet.recalling) damage *= 1 + this.stack('recall-strike') * 0.35;
    return damage;
  }

  catchBullet() {
    const speed = Math.hypot(this.bullet.vx, this.bullet.vy);
    const perfect = speed > 420 && this.stack('perfect-catch') > 0 && !this.bullet.recalling;
    this.resetBulletToPlayer();
    this.audio.play('recover');
    this.createBurst(this.player.x, this.player.y, COLORS.bullet, perfect ? 22 : 13, perfect ? 230 : 160);
    if (perfect) {
      this.player.shield = Math.max(1, this.player.shield);
      const bonus = 180 * this.stack('perfect-catch');
      this.score += bonus;
      this.addFloatingText(this.player.x, this.player.y - 38, `التقاط مثالي +${bonus}`, COLORS.bullet);
    }
  }

  damageEnemy(enemy, damage, fromBullet = false) {
    enemy.health -= damage;
    enemy.hitFlash = 0.15;
    if (fromBullet) this.stats.hits += 1;
    this.audio.play(enemy.health <= 0 ? 'kill' : 'hit');
    this.createBurst(enemy.x, enemy.y, enemy.color, enemy.health <= 0 ? 20 : 10, enemy.health <= 0 ? 300 : 180);
    this.addFloatingText(enemy.x, enemy.y - enemy.radius - 12, `-${formatDamage(damage)}`, COLORS.text);
    if (fromBullet && this.stack('shock-impact') > 0) this.applyShock(enemy);
    if (enemy.health <= 0) this.killEnemy(enemy);
  }

  applyShock(origin) {
    const radius = 88 + this.stack('shock-impact') * 22;
    const damage = 0.22 + this.stack('shock-impact') * 0.22;
    this.createRing(origin.x, origin.y, COLORS.electric, radius);
    for (const enemy of [...this.enemies]) {
      if (enemy.id === origin.id || distance(enemy, origin) > radius) continue;
      enemy.health -= damage;
      enemy.hitFlash = 0.12;
      this.createBurst(enemy.x, enemy.y, COLORS.electric, 7, 130);
      if (enemy.health <= 0) this.killEnemy(enemy);
    }
  }

  killEnemy(enemy) {
    if (!this.enemies.some((candidate) => candidate.id === enemy.id)) return;
    this.enemies = this.enemies.filter((candidate) => candidate.id !== enemy.id);
    this.combo += 1;
    this.comboTimer = 2.2;
    const gained = Math.round(enemy.score * Math.max(1, this.combo));
    this.score += gained;
    this.stats.kills += 1;
    this.highScore = Math.max(this.highScore, this.score);
    localStorage.setItem(STORAGE.highScore, String(this.highScore));
    this.addFloatingText(enemy.x, enemy.y, `+${gained}`, COLORS.bullet);
    if (enemy.type === 'splitter' && !enemy.mini) {
      this.spawnEnemy('scout', 0, { mini: true, point: { x: clamp(enemy.x - 32, 45, WIDTH - 45), y: enemy.y } });
      this.spawnEnemy('scout', 1, { mini: true, point: { x: clamp(enemy.x + 32, 45, WIDTH - 45), y: enemy.y } });
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
      if (enemy.type === 'sniper') {
        const currentDistance = distance(enemy, this.player);
        const desired = currentDistance < 260 ? -1 : currentDistance > 430 ? 1 : 0;
        const strafe = { x: -toPlayer.y, y: toPlayer.x };
        enemy.x += (toPlayer.x * desired + strafe.x * Math.sin(enemy.phase) * 0.45) * enemy.speed * dt;
        enemy.y += (toPlayer.y * desired + strafe.y * Math.sin(enemy.phase) * 0.45) * enemy.speed * dt;
        if (enemy.attackCooldown <= 0) {
          this.fireEnemyShot(enemy, toPlayer, 350 * scale.shotSpeed);
          enemy.attackCooldown = Math.max(0.85, 1.8 - this.wave * 0.025);
        }
      } else if (enemy.type === 'charger') {
        if (enemy.chargeRemaining > 0) {
          enemy.chargeRemaining -= dt;
          enemy.x += enemy.chargeDirection.x * 520 * dt;
          enemy.y += enemy.chargeDirection.y * 520 * dt;
        } else if (enemy.chargeTelegraph > 0) {
          enemy.chargeTelegraph -= dt;
          if (enemy.chargeTelegraph <= 0) {
            enemy.chargeDirection = normalize(this.player.x - enemy.x, this.player.y - enemy.y);
            enemy.chargeRemaining = 0.34;
          }
        } else {
          enemy.x += toPlayer.x * enemy.speed * dt;
          enemy.y += toPlayer.y * enemy.speed * dt;
          if (enemy.attackCooldown <= 0) {
            enemy.chargeTelegraph = 0.55;
            enemy.attackCooldown = Math.max(1.6, 3 - this.wave * 0.035);
          }
        }
      } else {
        const orbit = enemy.type === 'scout' ? Math.sin(enemy.phase) * 0.18 : 0;
        enemy.x += (toPlayer.x - toPlayer.y * orbit) * enemy.speed * dt;
        enemy.y += (toPlayer.y + toPlayer.x * orbit) * enemy.speed * dt;
      }
      enemy.x = clamp(enemy.x, enemy.radius, WIDTH - enemy.radius);
      enemy.y = clamp(enemy.y, enemy.radius, HEIGHT - enemy.radius);
      this.resolveObstacle(enemy);
      if (circleOverlap(enemy, this.player, -2)) this.damagePlayer(enemy.x, enemy.y);
    }
  }

  fireEnemyShot(enemy, direction, speed) {
    this.enemyShots.push({
      x: enemy.x,
      y: enemy.y,
      vx: direction.x * speed,
      vy: direction.y * speed,
      radius: 7,
      life: 4,
    });
  }

  updateEnemyShots(dt) {
    for (const shot of this.enemyShots) {
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      shot.life -= dt;
      if (circleOverlap(shot, this.player)) {
        shot.life = 0;
        this.damagePlayer(shot.x, shot.y);
      }
    }
    this.enemyShots = this.enemyShots.filter((shot) => shot.life > 0 && shot.x > -20 && shot.x < WIDTH + 20 && shot.y > -20 && shot.y < HEIGHT + 20);
  }

  damagePlayer(sourceX, sourceY) {
    if (this.player.invulnerability > 0 || this.state !== 'playing') return;
    if (this.player.shield > 0) {
      this.player.shield -= 1;
      this.player.invulnerability = 0.55;
      this.audio.play('hit');
      this.createRing(this.player.x, this.player.y, COLORS.electric, 62);
      this.addFloatingText(this.player.x, this.player.y - 38, 'تم صد الضربة', COLORS.electric);
      return;
    }
    this.player.health -= 1;
    this.stats.damageTaken += 1;
    this.player.invulnerability = 1.05;
    const push = normalize(this.player.x - sourceX, this.player.y - sourceY);
    this.player.x = clamp(this.player.x + push.x * 44, 30, WIDTH - 30);
    this.player.y = clamp(this.player.y + push.y * 44, 30, HEIGHT - 30);
    this.audio.play('damage');
    this.shake = 16;
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
    this.state = 'gameover';
    this.audio.setScene('menu');
    this.audio.play('damage');
    this.highScore = Math.max(this.highScore, this.score);
    this.highWave = Math.max(this.highWave, this.wave);
    localStorage.setItem(STORAGE.highScore, String(this.highScore));
    localStorage.setItem(STORAGE.highWave, String(this.highWave));
  }

  openUpgradeSelection() {
    if (this.state !== 'playing') return;
    this.upgradeChoices = pickUpgradeChoices(this.upgradeStacks, 3);
    if (this.upgradeChoices.length === 0) {
      this.score += 1000;
      this.spawnNextWave();
      return;
    }
    this.state = 'upgrade';
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
    if (upgrade.id === 'wave-shield') this.player.shield = Math.max(1, this.player.shield);
    this.stats.upgrades += 1;
    this.upgradeChoices = [];
    this.state = 'playing';
    this.audio.setScene('combat');
    this.spawnNextWave();
    return true;
  }

  resolveObstacle(entity) {
    for (const obstacle of this.arena.obstacles) {
      if (!circleRectOverlap(entity, obstacle)) continue;
      const nearestX = clamp(entity.x, obstacle.x, obstacle.x + obstacle.w);
      const nearestY = clamp(entity.y, obstacle.y, obstacle.y + obstacle.h);
      const dx = entity.x - nearestX;
      const dy = entity.y - nearestY;
      const length = Math.hypot(dx, dy) || 1;
      const overlap = entity.radius - length + 1;
      entity.x += dx / length * overlap;
      entity.y += dy / length * overlap;
    }
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
      item.y -= 36 * dt;
    }
    this.floatingTexts = this.floatingTexts.filter((item) => item.life > 0);
  }

  createParticle(x, y, color, speed = 150) {
    const angle = Math.random() * Math.PI * 2;
    this.particles.push({
      type: 'particle', x, y, color,
      vx: Math.cos(angle) * speed * (0.35 + Math.random()),
      vy: Math.sin(angle) * speed * (0.35 + Math.random()),
      size: 3 + Math.random() * 4,
      life: 0.4 + Math.random() * 0.35,
      maxLife: 0.75,
    });
  }

  createBurst(x, y, color, count = 12, speed = 180) {
    for (let index = 0; index < count; index += 1) this.createParticle(x, y, color, speed);
  }

  createRing(x, y, color, radius = 80) {
    this.particles.push({ type: 'ring', x, y, color, radius: 8, speed: radius * 2.2, vx: 0, vy: 0, life: 0.45, maxLife: 0.45 });
  }

  addFloatingText(x, y, text, color) {
    this.floatingTexts.push({ x, y, text, color, life: 0.9, maxLife: 0.9 });
  }

  loop(time) {
    let dt = Math.min(0.033, (time - this.lastTime) / 1000 || 0);
    this.lastTime = time;
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      dt = 0;
    } else if (this.slowMotion > 0) {
      this.slowMotion -= dt;
      dt *= 0.3;
    }
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
    const ctx = this.ctx;
    this.uiRegions = [];
    ctx.save();
    if (this.shake > 0) ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    this.drawArena();
    if (this.state === 'menu') this.drawMenu();
    else if (this.state === 'howto') this.drawHowTo();
    else {
      this.drawBullet();
      this.drawEnemies();
      this.drawEnemyShots();
      this.drawPlayer();
      this.drawParticles();
      this.drawFloatingTexts();
      this.drawHud();
      if (this.touchMode && this.state === 'playing') this.drawTouchControls();
      if (this.banner && this.state === 'playing') this.drawBanner();
      if (this.state === 'upgrade') this.drawUpgradeSelection();
      if (this.state === 'paused') this.drawPause();
      if (this.state === 'gameover') this.drawGameOver();
    }
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255, 45, 82, ${this.flash * 0.16})`;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
    ctx.restore();
  }

  drawArena() {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(-20, -20, WIDTH + 40, HEIGHT + 40);
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    const grid = 48;
    const offset = this.elapsed * 7 % grid;
    for (let x = -grid + offset; x <= WIDTH + grid; x += grid) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke();
    }
    for (let y = -grid + offset; y <= HEIGHT + grid; y += grid) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke();
    }
    const glow = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 70, WIDTH / 2, HEIGHT / 2, 650);
    glow.addColorStop(0, 'rgba(45, 76, 150, 0.16)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    for (const obstacle of this.arena.obstacles) this.drawObstacle(obstacle);
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, WIDTH - 4, HEIGHT - 4);
  }

  drawObstacle(obstacle) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(24, 33, 65, 0.92)';
    ctx.strokeStyle = '#465482';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#465482';
    ctx.shadowBlur = 8;
    roundedRect(ctx, obstacle.x, obstacle.y, obstacle.w, obstacle.h, 10);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawPlayer() {
    if (this.player.invulnerability > 0 && Math.floor(this.elapsed * 18) % 2 === 0) return;
    const ctx = this.ctx;
    if (this.player.shield > 0) {
      ctx.strokeStyle = COLORS.electric;
      ctx.lineWidth = 4;
      ctx.shadowColor = COLORS.electric;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, this.player.radius + 11 + Math.sin(this.elapsed * 7) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.save();
    ctx.fillStyle = COLORS.player;
    ctx.shadowColor = COLORS.player;
    ctx.shadowBlur = 28;
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
    ctx.fill();
    const aim = normalize(this.pointer.x - this.player.x, this.pointer.y - this.player.y);
    ctx.strokeStyle = '#e4feff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(this.player.x, this.player.y);
    ctx.lineTo(this.player.x + aim.x * 29, this.player.y + aim.y * 29);
    ctx.stroke();
    ctx.restore();
  }

  drawBullet() {
    const ctx = this.ctx;
    for (let index = this.bullet.trail.length - 1; index >= 0; index -= 1) {
      const point = this.bullet.trail[index];
      const alpha = (this.bullet.trail.length - index) / Math.max(1, this.bullet.trail.length);
      ctx.fillStyle = `rgba(255, 230, 109, ${alpha * 0.3})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2 + alpha * 5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (this.bullet.recalling) {
      ctx.strokeStyle = 'rgba(88, 166, 255, 0.5)';
      ctx.lineWidth = 3;
      ctx.setLineDash([9, 9]);
      ctx.beginPath();
      ctx.moveTo(this.player.x, this.player.y);
      ctx.lineTo(this.bullet.x, this.bullet.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.save();
    ctx.fillStyle = COLORS.bullet;
    ctx.shadowColor = COLORS.bullet;
    ctx.shadowBlur = 26;
    ctx.beginPath();
    ctx.arc(this.bullet.x, this.bullet.y, this.bullet.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawEnemies() {
    const ctx = this.ctx;
    for (const enemy of this.enemies) {
      const color = enemy.hitFlash > 0 ? COLORS.text : enemy.color;
      const scale = 1 - enemy.spawnTime * 0.6;
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.scale(scale, scale);
      ctx.rotate(enemy.phase * 0.24);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
      if (enemy.type === 'scout') polygon(ctx, 4, enemy.radius, Math.PI / 4);
      else if (enemy.type === 'brute') {
        ctx.fillRect(-enemy.radius, -enemy.radius, enemy.radius * 2, enemy.radius * 2);
        ctx.fillStyle = COLORS.background;
        ctx.fillRect(-8, -8, 16, 16);
      } else if (enemy.type === 'sniper') polygon(ctx, 6, enemy.radius, 0);
      else if (enemy.type === 'charger') polygon(ctx, 3, enemy.radius + 3, Math.PI / 2);
      else polygon(ctx, 5, enemy.radius, -Math.PI / 2);
      ctx.restore();
      if (enemy.maxHealth > 1.1) {
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(enemy.x - enemy.radius, enemy.y + enemy.radius + 10, enemy.radius * 2, 5);
        ctx.fillStyle = COLORS.text;
        ctx.fillRect(enemy.x - enemy.radius, enemy.y + enemy.radius + 10, enemy.radius * 2 * Math.max(0, enemy.health / enemy.maxHealth), 5);
      }
      if (enemy.type === 'charger' && enemy.chargeTelegraph > 0) {
        ctx.strokeStyle = COLORS.danger;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius + 10 + Math.sin(this.elapsed * 20) * 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  drawEnemyShots() {
    const ctx = this.ctx;
    for (const shot of this.enemyShots) {
      ctx.save();
      ctx.fillStyle = '#ffd0dc';
      ctx.shadowColor = '#ffd0dc';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(shot.x, shot.y, shot.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawParticles() {
    const ctx = this.ctx;
    for (const particle of this.particles) {
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      if (particle.type === 'ring') {
        ctx.strokeStyle = particle.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
      }
    }
    ctx.globalAlpha = 1;
  }

  drawFloatingTexts() {
    const ctx = this.ctx;
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    for (const item of this.floatingTexts) {
      ctx.globalAlpha = Math.max(0, item.life / item.maxLife);
      ctx.fillStyle = item.color;
      ctx.font = `700 21px ${FONT}`;
      ctx.fillText(item.text, item.x, item.y);
    }
    ctx.globalAlpha = 1;
  }

  drawHud() {
    const ctx = this.ctx;
    panel(ctx, WIDTH - 330, 18, 312, 88, COLORS.player);
    label(ctx, `الموجة ${this.wave}`, WIDTH - 42, 51, 21, COLORS.text, 900, 'right');
    label(ctx, `النقاط ${this.score.toLocaleString('en-US')}`, WIDTH - 42, 80, 14, COLORS.muted, 600, 'right');
    for (let index = 0; index < this.player.maxHealth; index += 1) {
      ctx.fillStyle = index < this.player.health ? COLORS.danger : '#252b42';
      ctx.beginPath();
      ctx.arc(WIDTH - 296 + index * 28, 83, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    if (this.player.shield > 0) {
      ctx.strokeStyle = COLORS.electric;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(WIDTH - 165, 82, 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    panel(ctx, 18, 18, 326, 88, this.bullet.held ? COLORS.bullet : COLORS.border);
    label(ctx, this.bullet.held ? 'الطلقة جاهزة' : this.bullet.recalling ? 'الطلقة عائدة' : 'استعد الطلقة', 320, 52, 19, this.bullet.held ? COLORS.bullet : COLORS.text, 900, 'right');
    const dashText = this.player.dashCooldown <= 0 ? 'جاهز' : `${this.player.dashCooldown.toFixed(1)}ث`;
    const recallText = this.bullet.recallCooldown <= 0 ? 'جاهز' : `${this.bullet.recallCooldown.toFixed(1)}ث`;
    label(ctx, `اندفاع ${dashText}  •  استدعاء ${recallText}`, 320, 80, 13, COLORS.muted, 600, 'right');

    panel(ctx, WIDTH / 2 - 118, 18, 236, 50, COLORS.border, 'rgba(10,15,31,0.88)', 4);
    label(ctx, `${this.stats.upgrades} قدرات`, WIDTH / 2, 51, 14, COLORS.muted, 700);
  }

  drawMenu() {
    const ctx = this.ctx;
    const pulse = 1 + Math.sin(this.elapsed * 2.1) * 0.018;
    ctx.save();
    ctx.translate(WIDTH / 2, 185);
    ctx.scale(pulse, pulse);
    label(ctx, 'حلبة الطلقة', 0, 0, 70, COLORS.text, 900);
    label(ctx, 'الواحدة', 0, 75, 70, COLORS.bullet, 900);
    ctx.restore();
    label(ctx, 'وضع واحد فقط: اهزم الموجة، اختر قدرة، وواصل حتى تسقط.', WIDTH / 2, 310, 20, COLORS.muted, 500);
    this.drawButton('ابدأ اللعب', WIDTH / 2 - 180, 365, 360, 62, () => this.startRun(), true);
    this.drawButton('طريقة اللعب', WIDTH / 2 - 180, 443, 360, 58, () => { this.audio.play('click'); this.state = 'howto'; });
    label(ctx, `أعلى موجة ${this.highWave}  •  أعلى نتيجة ${this.highScore.toLocaleString('en-US')}`, WIDTH / 2, 550, 15, COLORS.muted, 600);
    label(ctx, `v${SIMPLE_GAME_VERSION}`, WIDTH / 2, 675, 12, '#68739a', 600);
  }

  drawHowTo() {
    const ctx = this.ctx;
    dim(ctx, 0.82);
    label(ctx, 'طريقة اللعب', WIDTH / 2, 90, 48, COLORS.text, 900);
    panel(ctx, 235, 135, 810, 420, COLORS.player);
    const lines = [
      'حرّك اللاعب بـ WASD أو الأسهم.',
      'وجّه بالماوس واضغط لإطلاق الطلقة الوحيدة.',
      'استعد الطلقة بلمسها أو اضغط Q لاستدعائها.',
      'استخدم Space أو Shift للاندفاع وتفادي الضربات.',
      'بعد إنهاء كل موجة اختر قدرة واحدة من ثلاث.',
      'لا توجد أوضاع أخرى، ولا خرائط، ولا مهام جانبية.',
    ];
    lines.forEach((text, index) => label(ctx, `• ${text}`, 980, 195 + index * 52, 19, index === 4 ? COLORS.bullet : COLORS.text, index === 4 ? 800 : 600, 'right'));
    this.drawButton('العودة', WIDTH / 2 - 165, 590, 330, 58, () => this.goToMenu());
  }

  drawUpgradeSelection() {
    const ctx = this.ctx;
    dim(ctx, 0.84);
    label(ctx, `انتهت الموجة ${this.wave}`, WIDTH / 2, 78, 22, COLORS.success, 800);
    label(ctx, 'اختر قدرة واحدة', WIDTH / 2, 125, 42, COLORS.bullet, 900);
    const cardWidth = 330;
    const gap = 28;
    const total = this.upgradeChoices.length * cardWidth + Math.max(0, this.upgradeChoices.length - 1) * gap;
    const start = WIDTH / 2 - total / 2;
    this.upgradeChoices.forEach((upgrade, index) => this.drawUpgradeCard(upgrade, index, start + index * (cardWidth + gap), 175, cardWidth, 320));
    label(ctx, 'اضغط على بطاقة أو استخدم 1 / 2 / 3', WIDTH / 2, 555, 15, COLORS.muted, 600);
  }

  drawUpgradeCard(upgrade, index, x, y, width, height) {
    const hovered = pointInRect(this.pointer, { x, y, w: width, h: height });
    const ctx = this.ctx;
    panel(ctx, x, y, width, height, hovered ? COLORS.bullet : COLORS.border, hovered ? '#1b2440' : COLORS.panel, hovered ? 18 : 7);
    label(ctx, `${index + 1}  •  ${upgrade.tag}`, x + width - 24, y + 42, 14, COLORS.bullet, 800, 'right');
    wrapRtl(ctx, upgrade.name, x + width - 24, y + 94, width - 48, 34, 28, COLORS.text, 900, 2);
    wrapRtl(ctx, upgrade.description, x + width - 24, y + 168, width - 48, 29, 17, COLORS.muted, 500, 3);
    label(ctx, `المستوى ${this.stack(upgrade.id)} / ${upgrade.maxStacks}`, x + width - 24, y + height - 30, 14, this.stack(upgrade.id) ? COLORS.electric : COLORS.muted, 700, 'right');
    this.addUiRegion(x, y, width, height, () => this.chooseUpgrade(index));
  }

  drawPause() {
    dim(this.ctx, 0.82);
    label(this.ctx, 'متوقف مؤقتًا', WIDTH / 2, 210, 52, COLORS.text, 900);
    this.drawButton('استكمال', WIDTH / 2 - 170, 285, 340, 58, () => this.resume(), true);
    this.drawButton('إعادة الجولة', WIDTH / 2 - 170, 360, 340, 58, () => this.startRun());
    this.drawButton('القائمة الرئيسية', WIDTH / 2 - 170, 435, 340, 58, () => this.goToMenu());
  }

  drawGameOver() {
    dim(this.ctx, 0.86);
    label(this.ctx, 'انتهت الجولة', WIDTH / 2, 160, 58, COLORS.danger, 900);
    label(this.ctx, `وصلت إلى الموجة ${this.wave}`, WIDTH / 2, 220, 24, COLORS.text, 700);
    label(this.ctx, `النتيجة ${this.score.toLocaleString('en-US')}  •  القدرات ${this.stats.upgrades}`, WIDTH / 2, 260, 18, COLORS.muted, 600);
    this.drawButton('العب من جديد', WIDTH / 2 - 180, 330, 360, 62, () => this.startRun(), true);
    this.drawButton('القائمة الرئيسية', WIDTH / 2 - 180, 410, 360, 58, () => this.goToMenu());
  }

  drawBanner() {
    const ctx = this.ctx;
    const alpha = clamp(this.banner.time * 1.7, 0, 1);
    ctx.globalAlpha = alpha;
    label(ctx, this.banner.title, WIDTH / 2, HEIGHT / 2 - 22, 44, COLORS.text, 900);
    label(ctx, this.banner.subtitle, WIDTH / 2, HEIGHT / 2 + 22, 18, COLORS.bullet, 600);
    ctx.globalAlpha = 1;
  }

  drawTouchControls() {
    const ctx = this.ctx;
    const origin = this.touchMove ? { x: this.touchMove.originX, y: this.touchMove.originY } : { x: 118, y: HEIGHT - 112 };
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = 'rgba(98,243,255,0.12)';
    ctx.strokeStyle = COLORS.player;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 66, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    const knob = this.touchMove ? {
      x: origin.x + clamp(this.touchMove.x - origin.x, -48, 48),
      y: origin.y + clamp(this.touchMove.y - origin.y, -48, 48),
    } : origin;
    ctx.fillStyle = 'rgba(98,243,255,0.42)';
    ctx.beginPath();
    ctx.arc(knob.x, knob.y, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    this.drawCircleButton(WIDTH - 92, HEIGHT - 92, 55, 'اندفاع', COLORS.player, () => { this.dashRequested = true; });
    this.drawCircleButton(WIDTH - 92, HEIGHT - 222, 48, 'استدعاء', COLORS.electric, () => this.recallBullet());
    this.drawCircleButton(WIDTH - 220, HEIGHT - 92, 42, 'إيقاف', COLORS.muted, () => this.pause());
  }

  drawCircleButton(x, y, radius, text, color, action) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(10,16,35,0.82)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    label(ctx, text, x, y + 5, 12, color, 800);
    ctx.restore();
    this.addUiRegion(x - radius, y - radius, radius * 2, radius * 2, action);
  }

  drawButton(text, x, y, width, height, action, primary = false) {
    const hovered = pointInRect(this.pointer, { x, y, w: width, h: height });
    panel(this.ctx, x, y, width, height, primary || hovered ? COLORS.bullet : COLORS.border, primary ? 'rgba(56,48,17,0.94)' : hovered ? '#1a2441' : COLORS.panelSoft, primary || hovered ? 13 : 5);
    label(this.ctx, text, x + width / 2, y + height / 2 + 7, 18, primary ? COLORS.bullet : COLORS.text, 800);
    this.addUiRegion(x, y, width, height, action);
  }

  addUiRegion(x, y, w, h, action) {
    this.uiRegions.push({ x, y, w, h, action });
  }

  handleUiClick(x, y) {
    for (let index = this.uiRegions.length - 1; index >= 0; index -= 1) {
      const region = this.uiRegions[index];
      if (!pointInRect({ x, y }, region)) continue;
      region.action?.();
      return true;
    }
    return false;
  }

  getSnapshot() {
    return {
      version: this.version,
      state: this.state,
      allowedStates: [...this.allowedStates],
      wave: this.wave,
      score: this.score,
      enemies: this.enemies.length,
      upgrades: this.stats.upgrades,
      upgradeChoices: this.upgradeChoices.map((item) => item.id),
      bulletHeld: this.bullet.held,
      health: this.player.health,
      maxHealth: this.player.maxHealth,
      removedSystemsPresent: Boolean(this.runtime || this.selectedMission || this.protocolRun || this.endlessRun || this.bossRushRun || this.objectiveRoom),
    };
  }
}

function createSimpleArena() {
  return {
    obstacles: [
      { x: 280, y: 205, w: 90, h: 310 },
      { x: WIDTH - 370, y: 205, w: 90, h: 310 },
      { x: WIDTH / 2 - 105, y: 110, w: 210, h: 64 },
      { x: WIDTH / 2 - 105, y: HEIGHT - 174, w: 210, h: 64 },
    ],
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalize(x, y) {
  const length = Math.hypot(x, y);
  if (length < 0.0001) return { x: 0, y: 0 };
  return { x: x / length, y: y / length };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function circleOverlap(a, b, padding = 0) {
  return distance(a, b) <= (a.radius || 0) + (b.radius || 0) + padding;
}

function circleRectOverlap(circle, rect) {
  const nearestX = clamp(circle.x, rect.x, rect.x + rect.w);
  const nearestY = clamp(circle.y, rect.y, rect.y + rect.h);
  return (circle.x - nearestX) ** 2 + (circle.y - nearestY) ** 2 <= (circle.radius || 0) ** 2;
}

function pointInRect(point, rect) {
  return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
}

function roundedRect(ctx, x, y, width, height, radius = 14) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, width, height, radius);
  else ctx.rect(x, y, width, height);
}

function panel(ctx, x, y, width, height, accent = COLORS.border, fill = COLORS.panel, glow = 8) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.shadowColor = accent;
  ctx.shadowBlur = glow;
  roundedRect(ctx, x, y, width, height, 15);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();
  ctx.restore();
}

function label(ctx, text, x, y, size, color = COLORS.text, weight = 700, align = 'center') {
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillText(String(text), x, y);
  ctx.restore();
}

function wrapRtl(ctx, text, x, y, maxWidth, lineHeight, size, color, weight, maxLines = 3) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) line = candidate;
    else {
      if (line) lines.push(line);
      line = word;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  lines.forEach((item, index) => ctx.fillText(item, x, y + index * lineHeight));
  ctx.restore();
}

function dim(ctx, alpha = 0.84) {
  ctx.fillStyle = `rgba(2, 4, 12, ${alpha})`;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function polygon(ctx, sides, radius, rotation = 0) {
  ctx.beginPath();
  for (let index = 0; index < sides; index += 1) {
    const angle = rotation + index / sides * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function formatDamage(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
