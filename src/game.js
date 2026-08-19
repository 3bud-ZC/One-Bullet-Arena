import { AudioEngine } from './audio.js';
import {
  ENEMY_TYPES,
  GAME_HEIGHT as HEIGHT,
  GAME_VERSION,
  GAME_WIDTH as WIDTH,
  MAX_ACTIVE_ENEMIES,
  GUARDIAN_PHASE_SECONDS,
  GUARDIAN_TYPES,
  UPGRADE_WAVE_INTERVAL,
  buildWaveComposition,
  enemyScaleForWave,
  guardianForWave,
  guardianScaleForWave,
  pickUpgradeChoices,
} from './game-data.js';
import {
  catchImpulseSynergyScale,
  createWaveDirectiveState,
  resolveWaveDirectiveKill,
  selectPriorityTarget,
  shockImpactSynergyScale,
} from './game-feel.js';
import {
  ARENA_STAGE_COUNT,
  arenaStageForWave,
  circleOverlap,
  circleRectOverlap,
  clamp,
  clampCircleToBounds,
  distance,
  mobileSafeZones,
  normalize,
  pointInsideBounds,
  pointInsideRect,
  pushCircleOutOfSafeZones,
  resolveCircleAgainstRects,
} from './arena.js';
import {
  buildNavigationWaypoints,
  ensureEnemyNavigationState,
  hasClearPath,
  markEnemyNavigationBlocked,
  navigationTargetForEnemy,
  resetEnemyNavigation,
} from './enemy-navigation.js';

const FONT = 'Tahoma, Arial, sans-serif';
const STORAGE = Object.freeze({
  highScore: 'one-bullet-clean-high-score',
  highWave: 'one-bullet-clean-high-wave',
});
const COLORS = Object.freeze({
  background: '#050711',
  panel: 'rgba(10, 16, 34, 0.94)',
  panelSoft: 'rgba(18, 26, 50, 0.93)',
  border: '#35416e',
  grid: 'rgba(98, 122, 190, 0.08)',
  text: '#f8f9ff',
  muted: '#aeb7da',
  player: '#62f3ff',
  bullet: '#ffe66d',
  danger: '#ff526a',
  success: '#53f2a1',
  electric: '#58a6ff',
});
const BASE_PLAYER_SPEED = 285;
const DASH_SPEED = 760;
// Escort size on a Guardian wave. Small enough that the Guardian is the fight.
const GUARDIAN_ESCORT_COUNT = 5;
const BASE_BULLET_SPEED = 900;
const BULLET_STEP = 9;

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
    this.allowedStates = ['menu', 'playing', 'upgrade', 'paused', 'gameover'];
    this.audio = new AudioEngine();
    this.keys = new Set();
    this.pointer = { x: WIDTH / 2, y: HEIGHT / 2, down: false };
    this.touchMode = window.matchMedia?.('(pointer: coarse)').matches || false;
    this.touchMove = null;
    this.state = 'menu';
    this.lastTime = 0;
    this.elapsed = 0;
    this.uiRegions = [];
    this.nextEnemyId = 1;
    this.highScore = readNumber(STORAGE.highScore);
    this.highWave = readNumber(STORAGE.highWave);
    this.bindInput();
    this.resetRun();
    this.audio.setScene('menu');
    requestAnimationFrame((time) => this.loop(time));
  }

  bindInput() {
    window.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      this.keys.add(key);
      this.audio.ensure();
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();

      if (key === 'escape' || key === 'p') {
        if (this.state === 'playing') this.pause();
        else if (this.state === 'paused') this.resume();
        else if (this.state === 'gameover') this.goToMenu();
        return;
      }
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
      if (rect.width <= 0 || rect.height <= 0) return;
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
        if (this.pointer.x < WIDTH * 0.42 && this.pointer.y > HEIGHT * 0.34) {
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
    // Catch-up rewards belong to a resumed checkpoint; a fresh run owes none.
    this.owedUpgrades = 0;
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
    this.enemyNavigationCache = null;
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
    this.previousUpgradeChoices = [];
    this.secondChanceUsed = false;
    this.dashRequested = false;
    this.dashImpactCooldown = 0;
    this.banner = null;
    this.shake = 0;
    this.flash = 0;
    this.stats = { shots: 0, hits: 0, kills: 0, upgrades: 0, damageTaken: 0 };
    this.waveDirective = createWaveDirectiveState(1);
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
    this.waveDirective = createWaveDirectiveState(this.wave);
    const previousStageId = this.arenaStage.id;
    this.arenaStage = arenaStageForWave(this.wave);
    this.enemyNavigationCache = null;
    this.highWave = Math.max(this.highWave, this.wave);
    writeNumber(STORAGE.highWave, this.highWave);
    this.enemies = [];
    this.enemyShots = [];
    this.waveClearTimer = 0;
    this.player.shield = Math.max(this.player.shield, this.stack('wave-shield'));
    clampCircleToBounds(this.player, this.arenaStage.bounds);
    resolveCircleAgainstRects(this.player, this.arenaStage.obstacles);
    this.resetBulletToPlayer();

    // A Guardian wave is the Guardian plus a thinned escort, so the encounter
    // reads as a duel with pressure rather than another crowd with a big enemy
    // hidden inside it.
    const guardian = guardianForWave(this.wave);
    const composition = guardian
      ? buildWaveComposition(this.wave).slice(0, GUARDIAN_ESCORT_COUNT)
      : buildWaveComposition(this.wave);
    if (guardian) this.spawnEnemy(guardian.id, 0, { guardian: true });
    composition.forEach((type, index) => this.spawnEnemy(type, index + 1));
    if (this.waveDirective.id === 'priority') {
      const priority = selectPriorityTarget(this.enemies);
      if (priority) {
        priority.priorityTarget = true;
        this.waveDirective.targetEnemyId = priority.id;
        this.waveDirective.completed = false;
      }
    }
    const expanded = this.arenaStage.id > previousStageId;
    this.banner = {
      title: `الموجة ${this.wave}`,
      subtitle: expanded ? `${this.arenaStage.name} — مساحة جديدة اتفتحت` : this.waveDirective.banner,
      time: expanded ? 2.2 : 1.45,
    };
    if (expanded) this.createRing(WIDTH / 2, HEIGHT / 2, COLORS.player, 220);
    this.createBurst(this.player.x, this.player.y, COLORS.player, 18, 220);
    this.announce(`بدأت الموجة ${this.wave}. ${composition.length} أعداء. ${this.waveDirective.hint}`);
  }

  spawnEnemy(type, index = 0, options = {}) {
    if (this.enemies.length >= MAX_ACTIVE_ENEMIES && !options.mini) return null;
    // Guardians come from their own table but are otherwise ordinary enemies,
    // so they inherit spawn placement, navigation, collision, and damage.
    const guardianDefinition = GUARDIAN_TYPES[type];
    const definition = guardianDefinition || ENEMY_TYPES[type] || ENEMY_TYPES.scout;
    const scale = guardianDefinition ? guardianScaleForWave(this.wave) : enemyScaleForWave(this.wave);
    const point = options.point ? this.sanitizeSpawnPoint(options.point, 34) : this.findSpawnPoint(index);
    const miniScale = options.mini ? 0.66 : 1;
    const health = definition.health * scale.health * (options.mini ? 0.62 : 1);
    const enemy = {
      id: this.nextEnemyId++,
      type: definition.id,
      x: point.x,
      y: point.y,
      radius: definition.radius * miniScale,
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
      physicsVx: 0,
      physicsVy: 0,
      staggerTime: 0,
      phase: index * 0.77,
      spawnTime: 0.55,
      hitFlash: 0,
      mini: Boolean(options.mini),
      nav: null,
    };

    if (guardianDefinition) {
      enemy.guardian = true;
      enemy.guardianId = guardianDefinition.id;
      // Phase machine: 'stalk' closes and is the vulnerable window, 'wind' is
      // the telegraph, 'strike' is the committed attack. Timers are simulation
      // state so behaviour never depends on render cadence.
      enemy.phaseName = 'stalk';
      enemy.phaseTimer = GUARDIAN_PHASE_SECONDS.stalk;
      enemy.phaseIndex = 0;
      enemy.guardAngle = 0;
      enemy.guardSpin = guardianDefinition.guardSpin;
      enemy.requiresBank = Boolean(guardianDefinition.requiresBank);
      enemy.evasive = Boolean(guardianDefinition.evasive);
      enemy.spawnTime = 1.15;
    }

    ensureEnemyNavigationState(enemy);
    this.enemies.push(enemy);
    return enemy;
  }

  findSpawnPoint(seed = 0) {
    const bounds = this.arenaStage.bounds;
    const padding = 66;
    const left = bounds.x + padding;
    const right = bounds.x + bounds.w - padding;
    const top = bounds.y + padding;
    const bottom = bounds.y + bounds.h - padding;
    const centerX = bounds.x + bounds.w / 2;
    const centerY = bounds.y + bounds.h / 2;
    const points = [
      { x: left, y: top }, { x: right, y: top },
      { x: left, y: bottom }, { x: right, y: bottom },
      { x: centerX, y: top }, { x: centerX, y: bottom },
      { x: left, y: centerY }, { x: right, y: centerY },
      { x: left + bounds.w * 0.25, y: top }, { x: right - bounds.w * 0.25, y: bottom },
      { x: right - bounds.w * 0.25, y: top }, { x: left + bounds.w * 0.25, y: bottom },
    ];

    for (let attempt = 0; attempt < points.length; attempt += 1) {
      const point = points[(seed + attempt + this.wave * 2) % points.length];
      if (distance(point, this.player) < 230) continue;
      if (this.arenaStage.obstacles.some((rect) => circleRectOverlap({ ...point, radius: 34 }, rect))) continue;
      if (this.touchMode && mobileSafeZones().some((rect) => pointInsideRect(point, rect))) continue;
      return { ...point };
    }
    return this.sanitizeSpawnPoint({ x: left, y: top }, 34);
  }

  sanitizeSpawnPoint(point, radius = 34) {
    const candidate = { x: point.x, y: point.y, radius };
    clampCircleToBounds(candidate, this.arenaStage.bounds);
    resolveCircleAgainstRects(candidate, this.arenaStage.obstacles);
    if (this.touchMode) pushCircleOutOfSafeZones(candidate);
    clampCircleToBounds(candidate, this.arenaStage.bounds);
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
      bouncesRemaining: 4 + this.stack('extended-ricochet') * 3,
      trail: [],
    });
    this.bullet.hitEnemyIds.clear();
  }

  fireBullet() {
    if (this.state !== 'playing' || !this.bullet.held) return false;
    const direction = normalize(this.pointer.x - this.player.x, this.pointer.y - this.player.y);
    if (!direction.x && !direction.y) return false;
    const speed = BASE_BULLET_SPEED * (1 + this.stack('bullet-velocity') * 0.12);
    Object.assign(this.bullet, {
      x: this.player.x + direction.x * 30,
      y: this.player.y + direction.y * 30,
      vx: direction.x * speed,
      vy: direction.y * speed,
      held: false,
      recalling: false,
      recoverDelay: 0.2,
      bounceCount: 0,
      bouncesRemaining: 4 + this.stack('extended-ricochet') * 3,
      trail: [],
    });
    this.bullet.hitEnemyIds.clear();
    this.stats.shots += 1;
    this.audio.play('shoot');
    this.createBurst(this.bullet.x, this.bullet.y, COLORS.bullet, 9, 155);
    this.shake = Math.max(this.shake, 4);
    return true;
  }

  recallBullet() {
    if (this.state !== 'playing' || this.bullet.held || this.bullet.recalling || this.bullet.recallCooldown > 0) return false;
    this.bullet.recalling = true;
    this.bullet.hitEnemyIds.clear();
    this.bullet.recallCooldown = Math.max(0.75, 3.8 - this.stack('magnetic-recall') * 0.52);
    this.audio.play('recover');
    return true;
  }

  movementDirection() {
    let x = Number(this.keys.has('d') || this.keys.has('arrowright')) - Number(this.keys.has('a') || this.keys.has('arrowleft'));
    let y = Number(this.keys.has('s') || this.keys.has('arrowdown')) - Number(this.keys.has('w') || this.keys.has('arrowup'));
    if (this.touchMove) {
      const dx = clamp(this.touchMove.x - this.touchMove.originX, -72, 72);
      const dy = clamp(this.touchMove.y - this.touchMove.originY, -72, 72);
      if (Math.hypot(dx, dy) > 8) {
        x += dx / 72;
        y += dy / 72;
      }
    }
    return normalize(x, y);
  }

  tryDash() {
    if (!this.dashRequested) return;
    this.dashRequested = false;
    if (this.player.dashCooldown > 0 || this.player.dashRemaining > 0) return;
    const movement = this.movementDirection();
    const aim = normalize(this.pointer.x - this.player.x, this.pointer.y - this.player.y);
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

    if (this.enemies.length === 0) {
      this.waveClearTimer += dt;
      if (this.waveClearTimer >= 0.7 && this.bullet.held) {
        if (this.shouldOfferUpgrade()) this.openUpgradeSelection();
        else this.startNextWave();
      }
    } else {
      this.waveClearTimer = 0;
    }
  }

  updatePlayer(dt) {
    let direction = this.movementDirection();
    let speed = BASE_PLAYER_SPEED * (1 + this.stack('swift-steps') * 0.11);
    if (this.player.dashRemaining > 0) {
      this.player.dashRemaining -= dt;
      direction = this.player.dashDirection;
      speed = DASH_SPEED;
      if (this.stack('dash-impact') > 0) this.applyDashImpact();
      if (Math.random() > 0.42) this.createParticle(this.player.x, this.player.y, COLORS.player, 75);
    }
    this.player.x += direction.x * speed * dt;
    this.player.y += direction.y * speed * dt;
    this.constrainCombatCircle(this.player);
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
    this.bullet.trail.length = Math.min(16, this.bullet.trail.length);
    if (this.bullet.recalling) {
      const direction = normalize(this.player.x - this.bullet.x, this.player.y - this.bullet.y);
      const speed = 720 + this.stack('magnetic-recall') * 150;
      this.bullet.vx = direction.x * speed;
      this.bullet.vy = direction.y * speed;
    }

    const travel = Math.hypot(this.bullet.vx * dt, this.bullet.vy * dt);
    const steps = Math.max(1, Math.ceil(travel / BULLET_STEP));
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
      const retention = Math.min(0.985, 0.91 + this.stack('phase-round') * 0.018);
      this.bullet.vx *= retention;
      this.bullet.vy *= retention;
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
        this.bullet.vx *= -1;
        this.bullet.vy *= -1;
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
    this.createBurst(this.bullet.x, this.bullet.y, COLORS.bullet, 2, 72);
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
    let damage = 1 + this.stack('heavy-shot') * 0.55;
    damage += this.bullet.bounceCount * this.stack('hot-ricochet') * 0.38;
    damage += this.stack('phase-round') * 0.1;
    if (this.bullet.recalling) damage *= 1 + this.stack('recall-strike') * 0.5;
    return damage;
  }

  catchBullet() {
    const wasReturning = this.bullet.recalling;
    const recallDistance = Math.hypot(this.bullet.x - this.player.x, this.bullet.y - this.player.y);
    if (wasReturning) this.applyCatchImpulse(recallDistance);
    this.resetBulletToPlayer();
    this.audio.play('recover');
  }

  damageEnemy(enemy, damage, fromBullet = false) {
    if (!this.enemies.includes(enemy)) return;
    if (fromBullet) {
      enemy.lastHitContext = {
        banked: (Number(this.bullet.bounceCount) || 0) > 0 || (Number(this.bankLevel) || 0) > 0,
        recalling: Boolean(this.bullet.recalling),
        precision: Boolean(this.precisionShotActive),
      };
    }
    enemy.health -= damage;
    enemy.hitFlash = 0.14;
    if (fromBullet) this.stats.hits += 1;
    this.audio.play(enemy.health <= 0 ? 'kill' : 'hit');
    this.createBurst(enemy.x, enemy.y, enemy.color, enemy.health <= 0 ? 5 : 2, enemy.health <= 0 ? 145 : 90);
    this.addFloatingText(enemy.x, enemy.y - enemy.radius - 12, `-${formatDamage(damage)}`, COLORS.text);
    if (fromBullet && this.stack('shock-impact') > 0) this.applyShock(enemy, enemy.lastHitContext);
    if (enemy.health <= 0) this.killEnemy(enemy);
  }

  applyShock(origin, context = {}) {
    const scale = shockImpactSynergyScale(this.upgradeStacks, context);
    const radius = (96 + this.stack('shock-impact') * 32) * scale.radius;
    const damage = (0.28 + this.stack('shock-impact') * 0.35) * scale.damage;
    for (const enemy of [...this.enemies]) {
      if (enemy.id === origin.id || distance(enemy, origin) > radius) continue;
      enemy.health -= damage;
      enemy.hitFlash = 0.12;
      this.pushEnemy(enemy, origin, 42 + this.stack('shock-impact') * 12);
      if (enemy.health <= 0) this.killEnemy(enemy);
    }
  }

  killEnemy(enemy) {
    if (!this.enemies.includes(enemy)) return;
    this.enemies = this.enemies.filter((candidate) => candidate.id !== enemy.id);
    this.combo += 1;
    this.comboTimer = 2.15;
    const directiveKill = resolveWaveDirectiveKill(this.waveDirective, enemy, enemy.lastHitContext);
    const gained = Math.round(
      enemy.score * Math.max(1, Math.min(8, this.combo)) * directiveKill.scoreMultiplier
      + directiveKill.scoreBonus,
    );
    this.score += gained;
    this.stats.kills += 1;
    if (directiveKill.matched) {
      this.waveDirective.bonuses += 1;
      this.waveDirective.completed = this.waveDirective.completed || directiveKill.completesDirective;
      this.addFloatingText(enemy.x, enemy.y - enemy.radius - 30, directiveKill.label, COLORS.success);
      if (enemy.priorityTarget) {
        for (const other of this.enemies) {
          other.attackCooldown = Math.max(other.attackCooldown || 0, 0.45);
          other.staggerTime = Math.max(other.staggerTime || 0, 0.12);
        }
      }
    }
    this.highScore = Math.max(this.highScore, this.score);
    writeNumber(STORAGE.highScore, this.highScore);
    this.addFloatingText(enemy.x, enemy.y, `+${gained}`, COLORS.bullet);

    if (enemy.type === 'splitter' && !enemy.mini) {
      const availableSlots = Math.max(0, MAX_ACTIVE_ENEMIES - this.enemies.length);
      const children = Math.min(2, availableSlots);
      for (let index = 0; index < children; index += 1) {
        this.spawnEnemy('scout', index, {
          mini: true,
          point: { x: enemy.x + (index === 0 ? -30 : 30), y: enemy.y },
        });
      }
    }
  }

  shouldOfferUpgrade() {
    return this.wave > 0 && this.wave % UPGRADE_WAVE_INTERVAL === 0;
  }

  pushEnemy(enemy, origin, strength, stagger = 0.1) {
    if (!enemy || !this.enemies.includes(enemy)) return;
    const direction = normalize(enemy.x - origin.x, enemy.y - origin.y);
    const fallback = direction.x || direction.y ? direction : normalize(enemy.x - this.player.x || 1, enemy.y - this.player.y);
    enemy.physicsVx = (enemy.physicsVx || 0) + fallback.x * strength;
    enemy.physicsVy = (enemy.physicsVy || 0) + fallback.y * strength;
    enemy.staggerTime = Math.max(enemy.staggerTime || 0, stagger);
    resetEnemyNavigation(enemy);
  }

  applyCatchImpulse(recallDistance = 0) {
    const stacks = this.stack('kinetic-catch');
    const scale = catchImpulseSynergyScale(this.upgradeStacks);
    const radius = Math.min(240, (90 + recallDistance * 0.13 + stacks * 24) * scale.radius);
    const strength = Math.min(360, (95 + recallDistance * 0.16 + stacks * 38) * scale.strength);
    for (const enemy of [...this.enemies]) {
      const gap = distance(enemy, this.player);
      if (gap > radius + enemy.radius) continue;
      const falloff = Math.max(0.25, 1 - gap / Math.max(1, radius + enemy.radius));
      this.pushEnemy(enemy, this.player, strength * falloff, 0.12 + falloff * 0.2);
      enemy.attackCooldown = Math.max(enemy.attackCooldown || 0, 0.18 + falloff * 0.18);
    }
  }

  applyDashImpact() {
    if (this.dashImpactCooldown > this.elapsed) return;
    this.dashImpactCooldown = this.elapsed + 0.12;
    const stacks = this.stack('dash-impact');
    const radius = 48 + stacks * 16;
    const damage = 0.25 + stacks * 0.28;
    for (const enemy of [...this.enemies]) {
      if (enemy.spawnTime > 0 || distance(enemy, this.player) > radius + enemy.radius) continue;
      enemy.health -= damage;
      enemy.hitFlash = 0.12;
      this.pushEnemy(enemy, this.player, 125 + stacks * 28, 0.16);
      this.constrainCombatCircle(enemy);
      if (enemy.health <= 0) this.killEnemy(enemy);
    }
  }

  enemyNavigationContext() {
    const obstacles = this.arenaStage.obstacles;
    if (!this.enemyNavigationCache || this.enemyNavigationCache.stageId !== this.arenaStage.id) {
      this.enemyNavigationCache = {
        stageId: this.arenaStage.id,
        waypointsByRadius: new Map(),
      };
    }
    return {
      bounds: this.arenaStage.bounds,
      obstacles,
      waypointsForRadius: (radius) => {
        const key = Math.round(radius);
        if (!this.enemyNavigationCache.waypointsByRadius.has(key)) {
          this.enemyNavigationCache.waypointsByRadius.set(
            key,
            buildNavigationWaypoints(obstacles, this.arenaStage.bounds, radius),
          );
        }
        return this.enemyNavigationCache.waypointsByRadius.get(key);
      },
    };
  }

  moveEnemyWithCollision(enemy, direction, speed, dt) {
    if (speed <= 0 || (!direction.x && !direction.y)) return false;
    const moveX = direction.x * speed;
    const moveY = direction.y * speed;
    const canMove = (dx, dy) => !this.arenaStage.obstacles.some((rect) => circleRectOverlap({
      x: enemy.x + dx,
      y: enemy.y + dy,
      radius: enemy.radius,
    }, rect));

    if (canMove(moveX, moveY)) {
      enemy.x += moveX;
      enemy.y += moveY;
      markEnemyNavigationBlocked(enemy, false, dt);
      return true;
    }

    let moved = false;
    if (Math.abs(moveX) >= Math.abs(moveY)) {
      if (canMove(moveX, 0)) {
        enemy.x += moveX;
        moved = true;
      }
      if (canMove(0, moveY)) {
        enemy.y += moveY;
        moved = true;
      }
    } else {
      if (canMove(0, moveY)) {
        enemy.y += moveY;
        moved = true;
      }
      if (canMove(moveX, 0)) {
        enemy.x += moveX;
        moved = true;
      }
    }
    markEnemyNavigationBlocked(enemy, !moved, dt);
    return moved;
  }

  steerEnemy(enemy, desired, dt, speedScale = 1, options = {}) {
    let direction = normalize(desired.x, desired.y);
    if (!direction.x && !direction.y) return;
    const target = options.target || this.player;
    const behavior = options.behavior || 'direct';
    const toTarget = normalize(target.x - enemy.x, target.y - enemy.y);
    const targetIntent = direction.x * toTarget.x + direction.y * toTarget.y;
    const shouldNavigate = behavior !== 'direct' && targetIntent > 0.18;

    if (shouldNavigate) {
      const context = this.enemyNavigationContext();
      const navigation = navigationTargetForEnemy(enemy, target, {
        bounds: context.bounds,
        obstacles: context.obstacles,
        waypoints: context.waypointsForRadius(enemy.radius),
        replanBudget: this.navReplanBudget,
      }, dt);
      if (!navigation.direct) {
        const routed = normalize(navigation.target.x - enemy.x, navigation.target.y - enemy.y);
        if (routed.x || routed.y) direction = routed;
      }
    } else if (behavior === 'direct' && hasClearPath(enemy, target, this.arenaStage.obstacles, enemy.radius)) {
      resetEnemyNavigation(enemy);
    }

    const speed = enemy.speed * speedScale * dt;
    this.moveEnemyWithCollision(enemy, direction, speed, dt);
  }

  updateEnemies(dt) {
    const scale = enemyScaleForWave(this.wave);
    for (const enemy of [...this.enemies]) {
      enemy.spawnTime = Math.max(0, enemy.spawnTime - dt);
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      enemy.staggerTime = Math.max(0, (enemy.staggerTime || 0) - dt);
      if (Math.abs(enemy.physicsVx || 0) > 0.1 || Math.abs(enemy.physicsVy || 0) > 0.1) {
        enemy.x += (enemy.physicsVx || 0) * dt;
        enemy.y += (enemy.physicsVy || 0) * dt;
        const damping = Math.pow(0.035, dt);
        enemy.physicsVx *= damping;
        enemy.physicsVy *= damping;
      }
      enemy.attackCooldown -= dt;
      enemy.phase += dt * 2;
      const toPlayer = normalize(this.player.x - enemy.x, this.player.y - enemy.y);

      if (enemy.type === 'sniper') this.updateSniper(enemy, toPlayer, scale, dt);
      else if (enemy.type === 'charger') this.updateCharger(enemy, toPlayer, dt);
      else {
        const currentDistance = distance(enemy, this.player);
        const contactDistance = this.player.radius + enemy.radius;
        const orbit = currentDistance <= contactDistance + 34
          ? 0
          : enemy.type === 'scout'
            ? 0.2 + Math.sin(enemy.phase) * 0.08
            : enemy.type === 'brute'
              ? 0.04
              : 0.12;
        const pressure = currentDistance <= contactDistance ? 0.35 : 1;
        const control = enemy.staggerTime > 0 ? 0.35 : 1;
        this.steerEnemy(enemy, {
          x: toPlayer.x * pressure - toPlayer.y * orbit,
          y: toPlayer.y * pressure + toPlayer.x * orbit,
        }, dt, control, { behavior: 'pursuit', target: this.player });
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
        const direction = normalize(this.player.x - enemy.x, this.player.y - enemy.y);
        this.fireEnemyShot(enemy, direction, 340 * scale.shotSpeed);
        enemy.attackCooldown = Math.max(1.05, 1.9 - this.wave * 0.022);
      }
      return;
    }
    const currentDistance = distance(enemy, this.player);
    const desired = currentDistance < 270 ? -1 : currentDistance > 440 ? 1 : 0;
    const strafe = { x: -toPlayer.y, y: toPlayer.x };
    this.steerEnemy(enemy, {
      x: toPlayer.x * desired + strafe.x * Math.sin(enemy.phase) * 0.42,
      y: toPlayer.y * desired + strafe.y * Math.sin(enemy.phase) * 0.42,
    }, dt);
    if (enemy.attackCooldown <= 0) enemy.shotTelegraph = 0.42;
  }

  updateCharger(enemy, toPlayer, dt) {
    if (enemy.chargeRemaining > 0) {
      enemy.chargeRemaining -= dt;
      enemy.x += enemy.chargeDirection.x * 620 * dt;
      enemy.y += enemy.chargeDirection.y * 620 * dt;
      return;
    }
    if (enemy.chargeTelegraph > 0) {
      enemy.chargeTelegraph -= dt;
      if (enemy.chargeTelegraph <= 0) {
        enemy.chargeRemaining = 0.42;
      }
      return;
    }
    const currentDistance = distance(enemy, this.player);
    const strafe = { x: -toPlayer.y, y: toPlayer.x };
    const desired = currentDistance < 210 ? -0.18 : 1;
    this.steerEnemy(enemy, {
      x: toPlayer.x * desired + strafe.x * Math.sin(enemy.phase) * 0.28,
      y: toPlayer.y * desired + strafe.y * Math.sin(enemy.phase) * 0.28,
    }, dt, 1.08);
    if (enemy.attackCooldown <= 0) {
      enemy.chargeDirection = { ...toPlayer };
      enemy.chargeTelegraph = 0.58;
      enemy.attackCooldown = Math.max(1.8, 3.1 - this.wave * 0.03);
    }
  }

  separateEnemies() {
    for (let i = 0; i < this.enemies.length; i += 1) {
      for (let j = i + 1; j < this.enemies.length; j += 1) {
        const first = this.enemies[i];
        const second = this.enemies[j];
        const dx = second.x - first.x;
        const dy = second.y - first.y;
        const length = Math.hypot(dx, dy) || 1;
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
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      shot.life -= dt;
      if (this.arenaStage.obstacles.some((rect) => circleRectOverlap(shot, rect))) shot.life = 0;
      if (shot.life > 0 && circleOverlap(shot, this.player)) {
        shot.life = 0;
        this.damagePlayer(shot.x, shot.y);
      }
    }
    this.enemyShots = this.enemyShots.filter((shot) => shot.life > 0 && pointInsideBounds(shot, this.arenaStage.bounds, 20));
  }

  damagePlayer(sourceX, sourceY) {
    if (this.player.invulnerability > 0 || this.state !== 'playing') return;
    if (this.player.shield > 0) {
      this.player.shield -= 1;
      this.player.invulnerability = 0.55;
      this.audio.play('shield');
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
      this.player.shield = Math.max(this.player.shield, 2);
      this.addFloatingText(this.player.x, this.player.y - 52, 'فرصة أخيرة', COLORS.success);
      return;
    }
    this.finishRun();
  }

  finishRun() {
    this.setState('gameover');
    this.audio.setScene('menu');
    this.audio.play('damage');
    this.highScore = Math.max(this.highScore, this.score);
    this.highWave = Math.max(this.highWave, this.wave);
    writeNumber(STORAGE.highScore, this.highScore);
    writeNumber(STORAGE.highWave, this.highWave);
  }

  // `chained` re-opens the panel straight after a pick while settling owed
  // catch-up rewards, where the state is still 'upgrade' rather than 'playing'.
  openUpgradeSelection(chained = false) {
    if (!chained && this.state !== 'playing') return false;
    this.upgradeChoices = pickUpgradeChoices(this.upgradeStacks, 3, Math.random, this.previousUpgradeChoices);
    if (this.upgradeChoices.length === 0) {
      this.score += 750;
      this.player.health = Math.min(this.player.maxHealth, this.player.health + 1);
      if (!chained) this.startNextWave();
      return false;
    }
    this.previousUpgradeChoices = this.upgradeChoices.map((upgrade) => upgrade.id);
    this.setState('upgrade');
    this.audio.setScene('menu');
    this.audio.play('upgrade');
    return true;
  }

  chooseUpgrade(index) {
    if (this.state !== 'upgrade') return false;
    const upgrade = this.upgradeChoices[index];
    if (!upgrade) return false;
    this.upgradeStacks[upgrade.id] = this.stack(upgrade.id) + 1;
    if (upgrade.id === 'vitality') {
      this.player.maxHealth += 1;
      this.player.health = Math.min(this.player.maxHealth, this.player.health + 2);
    }
    if (upgrade.id === 'field-medic') this.player.health = Math.min(this.player.maxHealth, this.player.health + 2 + this.stack('field-medic'));
    if (upgrade.id === 'wave-shield') this.player.shield = Math.max(this.stack('wave-shield'), this.player.shield);
    this.stats.upgrades += 1;
    this.upgradeChoices = [];

    // Owed catch-up rewards are taken one at a time through this same flow, so
    // the player always chooses. Only once the debt is clear does the wave start.
    if (this.owedUpgrades > 0) {
      this.owedUpgrades -= 1;
      this.persistOwedUpgrades?.();
      // If no upgrade remains to offer, fall through and start the wave.
      if (this.openUpgradeSelection(true)) return true;
    }

    this.setState('playing');
    this.audio.setScene('combat');
    this.startNextWave();
    return true;
  }

  constrainCombatCircle(circle) {
    clampCircleToBounds(circle, this.arenaStage.bounds);
    resolveCircleAgainstRects(circle, this.arenaStage.obstacles);
    if (this.touchMode) pushCircleOutOfSafeZones(circle);
    clampCircleToBounds(circle, this.arenaStage.bounds);
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
    const angle = Math.random() * Math.PI * 2;
    this.particles.push({
      type: 'particle', x, y, color,
      vx: Math.cos(angle) * speed * (0.35 + Math.random()),
      vy: Math.sin(angle) * speed * (0.35 + Math.random()),
      size: 3 + Math.random() * 3,
      life: 0.38 + Math.random() * 0.3,
      maxLife: 0.68,
    });
    if (this.particles.length > 220) this.particles.splice(0, this.particles.length - 220);
  }

  createBurst(x, y, color, count = 12, speed = 180) {
    for (let index = 0; index < count; index += 1) this.createParticle(x, y, color, speed);
  }

  createRing(x, y, color, radius = 80) {
    this.particles.push({ type: 'ring', x, y, color, radius: 8, speed: radius * 2.2, vx: 0, vy: 0, life: 0.45, maxLife: 0.45 });
  }

  addFloatingText(x, y, text, color) {
    this.floatingTexts.push({ x, y, text, color, life: 0.85, maxLife: 0.85 });
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
    const ctx = this.ctx;
    this.uiRegions = [];
    ctx.save();
    if (this.shake > 0) ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    this.drawArena();
    if (this.state === 'menu') this.drawMenu();
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
    const offset = this.elapsed * 6 % grid;
    for (let x = -grid + offset; x <= WIDTH + grid; x += grid) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke();
    }
    for (let y = -grid + offset; y <= HEIGHT + grid; y += grid) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke();
    }
    const glow = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 80, WIDTH / 2, HEIGHT / 2, 640);
    glow.addColorStop(0, 'rgba(45, 76, 150, 0.15)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    if (this.state !== 'menu') {
      this.drawLockedSpace();
      for (const obstacle of this.arenaStage.obstacles) this.drawObstacle(obstacle);
      this.drawArenaBorder();
    }
  }

  drawLockedSpace() {
    const ctx = this.ctx;
    const bounds = this.arenaStage.bounds;
    ctx.save();
    ctx.fillStyle = 'rgba(1, 3, 10, 0.92)';
    ctx.fillRect(0, 0, WIDTH, bounds.y);
    ctx.fillRect(0, bounds.y + bounds.h, WIDTH, HEIGHT - bounds.y - bounds.h);
    ctx.fillRect(0, bounds.y, bounds.x, bounds.h);
    ctx.fillRect(bounds.x + bounds.w, bounds.y, WIDTH - bounds.x - bounds.w, bounds.h);
    ctx.restore();
  }

  drawArenaBorder() {
    const ctx = this.ctx;
    const bounds = this.arenaStage.bounds;
    const pulse = 0.56 + Math.sin(this.elapsed * 3.1) * 0.12;
    ctx.save();
    ctx.strokeStyle = `rgba(98, 243, 255, ${pulse})`;
    ctx.shadowColor = COLORS.player;
    ctx.shadowBlur = 0;
    ctx.lineWidth = 4;
    ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
    ctx.restore();
  }

  drawObstacle(obstacle) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(24, 33, 65, 0.92)';
    ctx.strokeStyle = '#465482';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#465482';
    ctx.shadowBlur = 0;
    roundedRect(ctx, obstacle.x, obstacle.y, obstacle.w, obstacle.h, 9);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawPlayer() {
    if (this.player.invulnerability > 0 && Math.floor(this.elapsed * 18) % 2 === 0) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = COLORS.player;
    ctx.shadowColor = COLORS.player;
    ctx.shadowBlur = 0;
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
      ctx.fillStyle = `rgba(255, 230, 109, ${alpha * 0.28})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2 + alpha * 4, 0, Math.PI * 2);
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
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(this.bullet.x, this.bullet.y, this.bullet.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawEnemies() {
    const ctx = this.ctx;
    for (const enemy of this.enemies) {
      const color = enemy.hitFlash > 0 ? COLORS.text : enemy.color;
      const spawnScale = 1 - enemy.spawnTime * 0.65;
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.scale(spawnScale, spawnScale);
      ctx.rotate(enemy.phase * 0.24);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 0;
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
        ctx.fillRect(enemy.x - enemy.radius, enemy.y + enemy.radius + 9, enemy.radius * 2, 5);
        ctx.fillStyle = COLORS.text;
        ctx.fillRect(enemy.x - enemy.radius, enemy.y + enemy.radius + 9, enemy.radius * 2 * Math.max(0, enemy.health / enemy.maxHealth), 5);
      }
      if (enemy.type === 'charger' && enemy.chargeTelegraph > 0) {
        ctx.strokeStyle = COLORS.danger;
        ctx.lineWidth = 4;
        ctx.beginPath();
        const direction = enemy.chargeDirection?.x || enemy.chargeDirection?.y
          ? enemy.chargeDirection
          : normalize(this.player.x - enemy.x, this.player.y - enemy.y);
        ctx.moveTo(enemy.x, enemy.y);
        ctx.lineTo(enemy.x + direction.x * 180, enemy.y + direction.y * 180);
        ctx.stroke();
      }
      if (enemy.type === 'sniper' && enemy.shotTelegraph > 0) {
        ctx.save();
        ctx.strokeStyle = `rgba(255, 82, 106, ${0.35 + enemy.shotTelegraph})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 7]);
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y);
        ctx.lineTo(this.player.x, this.player.y);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  drawEnemyShots() {
    const ctx = this.ctx;
    for (const shot of this.enemyShots) {
      ctx.save();
      ctx.fillStyle = '#ffd0dc';
      ctx.shadowColor = '#ffd0dc';
      ctx.shadowBlur = 0;
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
      ctx.font = `700 20px ${FONT}`;
      ctx.fillText(item.text, item.x, item.y);
    }
    ctx.globalAlpha = 1;
  }

  drawHud() {
    const ctx = this.ctx;
    panel(ctx, WIDTH - 306, 18, 288, 80, COLORS.player);
    label(ctx, `الموجة ${this.wave}`, WIDTH - 38, 49, 20, COLORS.text, 900, 'right');
    label(ctx, `${this.enemies.length} أعداء  •  ${this.score.toLocaleString('en-US')} نقطة`, WIDTH - 38, 77, 13, COLORS.muted, 600, 'right');

    panel(ctx, 18, 18, 300, 80, this.bullet.held ? COLORS.bullet : COLORS.border);
    label(ctx, this.bullet.held ? 'الطلقة جاهزة' : this.bullet.recalling ? 'الطلقة عائدة' : 'استرجع الطلقة', 294, 48, 18, this.bullet.held ? COLORS.bullet : COLORS.text, 900, 'right');
    const dash = this.player.dashCooldown <= 0 ? 'جاهز' : `${this.player.dashCooldown.toFixed(1)}ث`;
    const recall = this.bullet.recallCooldown <= 0 ? 'جاهز' : `${this.bullet.recallCooldown.toFixed(1)}ث`;
    label(ctx, `اندفاع ${dash}  •  استدعاء ${recall}`, 294, 76, 12, COLORS.muted, 600, 'right');

    panel(ctx, WIDTH / 2 - 112, 18, 224, 48, COLORS.border, 'rgba(10,15,31,0.88)', 4);
    label(ctx, `${this.stats.upgrades} قدرات  •  ${this.arenaStage.id + 1}/${ARENA_STAGE_COUNT}`, WIDTH / 2, 49, 13, COLORS.muted, 700);

    const healthX = WIDTH - 282;
    for (let index = 0; index < this.player.maxHealth; index += 1) {
      ctx.fillStyle = index < this.player.health ? COLORS.danger : '#252b42';
      ctx.beginPath();
      ctx.arc(healthX + index * 25, 91, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    if (this.player.shield > 0) {
      ctx.strokeStyle = COLORS.electric;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(WIDTH - 105, 90, 9, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawMenu() {
    const ctx = this.ctx;
    const pulse = 1 + Math.sin(this.elapsed * 2) * 0.016;
    ctx.save();
    ctx.translate(WIDTH / 2, 176);
    ctx.scale(pulse, pulse);
    label(ctx, 'حلبة الطلقة', 0, 0, 68, COLORS.text, 900);
    label(ctx, 'الواحدة', 0, 72, 68, COLORS.bullet, 900);
    ctx.restore();
    label(ctx, 'اهزم الموجة، اختر قدرة، وادخل موجة أصعب في نفس الساحة.', WIDTH / 2, 300, 19, COLORS.muted, 500);
    this.drawButton('ابدأ اللعب', WIDTH / 2 - 190, 350, 380, 66, () => this.startRun(), true);
    panel(ctx, WIDTH / 2 - 300, 440, 600, 112, COLORS.border, 'rgba(10,15,31,0.78)', 4);
    label(ctx, 'WASD حركة  •  ماوس إطلاق  •  Q استدعاء  •  Space اندفاع', WIDTH / 2, 480, 16, COLORS.text, 700);
    label(ctx, 'M كتم الصوت  •  F ملء الشاشة  •  P إيقاف', WIDTH / 2, 520, 14, COLORS.muted, 600);
    label(ctx, `أعلى موجة ${this.highWave}  •  أعلى نتيجة ${this.highScore.toLocaleString('en-US')}`, WIDTH / 2, 602, 15, COLORS.muted, 600);
    label(ctx, `v${GAME_VERSION}`, WIDTH / 2, 676, 12, '#68739a', 600);
  }

  drawUpgradeSelection() {
    const ctx = this.ctx;
    dim(ctx, 0.86);
    label(ctx, `انتهت الموجة ${this.wave}`, WIDTH / 2, 76, 22, COLORS.success, 800);
    label(ctx, 'اختر قدرة واحدة', WIDTH / 2, 122, 40, COLORS.bullet, 900);
    const cardWidth = 328;
    const gap = 28;
    const total = this.upgradeChoices.length * cardWidth + Math.max(0, this.upgradeChoices.length - 1) * gap;
    const start = WIDTH / 2 - total / 2;
    this.upgradeChoices.forEach((upgrade, index) => this.drawUpgradeCard(upgrade, index, start + index * (cardWidth + gap), 170, cardWidth, 326));
    label(ctx, 'اضغط على بطاقة أو استخدم 1 / 2 / 3', WIDTH / 2, 554, 15, COLORS.muted, 600);
  }

  drawUpgradeCard(upgrade, index, x, y, width, height) {
    const hovered = pointInsideRect(this.pointer, { x, y, w: width, h: height });
    const ctx = this.ctx;
    panel(ctx, x, y, width, height, hovered ? COLORS.bullet : COLORS.border, hovered ? '#1b2440' : COLORS.panel, hovered ? 17 : 7);
    label(ctx, `${index + 1}  •  ${upgrade.tag}`, x + width - 24, y + 42, 14, COLORS.bullet, 800, 'right');
    wrapRtl(ctx, upgrade.name, x + width - 24, y + 94, width - 48, 34, 27, COLORS.text, 900, 2);
    wrapRtl(ctx, upgrade.description, x + width - 24, y + 168, width - 48, 29, 17, COLORS.muted, 500, 3);
    label(ctx, `المستوى الحالي: ${this.stack(upgrade.id)} من ${upgrade.maxStacks}`, x + width - 24, y + height - 30, 14, this.stack(upgrade.id) ? COLORS.electric : COLORS.muted, 700, 'right');
    this.addUiRegion(x, y, width, height, () => this.chooseUpgrade(index));
  }

  drawPause() {
    dim(this.ctx, 0.84);
    label(this.ctx, 'متوقف مؤقتًا', WIDTH / 2, 205, 50, COLORS.text, 900);
    this.drawButton('استكمال', WIDTH / 2 - 170, 280, 340, 58, () => this.resume(), true);
    this.drawButton('إعادة الجولة', WIDTH / 2 - 170, 355, 340, 58, () => this.startRun());
    this.drawButton('القائمة الرئيسية', WIDTH / 2 - 170, 430, 340, 58, () => this.goToMenu());
  }

  drawGameOver() {
    dim(this.ctx, 0.88);
    label(this.ctx, 'انتهت الجولة', WIDTH / 2, 150, 56, COLORS.danger, 900);
    label(this.ctx, `الموجة ${this.wave}`, WIDTH / 2, 215, 26, COLORS.text, 800);
    label(this.ctx, `${this.score.toLocaleString('en-US')} نقطة  •  ${this.stats.kills} عدو  •  ${this.stats.upgrades} قدرات`, WIDTH / 2, 255, 17, COLORS.muted, 600);
    this.drawButton('العب من جديد', WIDTH / 2 - 180, 325, 360, 62, () => this.startRun(), true);
    this.drawButton('القائمة الرئيسية', WIDTH / 2 - 180, 405, 360, 58, () => this.goToMenu());
  }

  drawBanner() {
    const ctx = this.ctx;
    const alpha = clamp(this.banner.time * 1.6, 0, 1);
    ctx.globalAlpha = alpha;
    label(ctx, this.banner.title, WIDTH / 2, HEIGHT / 2 - 20, 42, COLORS.text, 900);
    label(ctx, this.banner.subtitle, WIDTH / 2, HEIGHT / 2 + 24, 18, COLORS.bullet, 600);
    ctx.globalAlpha = 1;
  }

  drawTouchControls() {
    const ctx = this.ctx;
    const origin = this.touchMove ? { x: this.touchMove.originX, y: this.touchMove.originY } : { x: 118, y: HEIGHT - 112 };
    ctx.save();
    ctx.globalAlpha = 0.66;
    ctx.fillStyle = 'rgba(98,243,255,0.10)';
    ctx.strokeStyle = COLORS.player;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 64, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    const knob = this.touchMove ? {
      x: origin.x + clamp(this.touchMove.x - origin.x, -47, 47),
      y: origin.y + clamp(this.touchMove.y - origin.y, -47, 47),
    } : origin;
    ctx.fillStyle = 'rgba(98,243,255,0.4)';
    ctx.beginPath();
    ctx.arc(knob.x, knob.y, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    this.drawCircleButton(WIDTH - 92, HEIGHT - 92, 53, 'اندفاع', COLORS.player, () => { this.dashRequested = true; });
    this.drawCircleButton(WIDTH - 92, HEIGHT - 216, 46, 'استدعاء', COLORS.electric, () => this.recallBullet());
    this.drawCircleButton(WIDTH - 216, HEIGHT - 92, 40, 'إيقاف', COLORS.muted, () => this.pause());
  }

  drawCircleButton(x, y, radius, text, color, action) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(10,16,35,0.76)';
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
    const hovered = pointInsideRect(this.pointer, { x, y, w: width, h: height });
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
      if (!pointInsideRect({ x, y }, region)) continue;
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
      arenaStage: this.arenaStage.id,
      arenaName: this.arenaStage.name,
      arenaBounds: { ...this.arenaStage.bounds },
      arenaFullyUnlocked: this.arenaStage.id === ARENA_STAGE_COUNT - 1,
      arenaProgressionAutomatic: true,
      puzzleObjectivesPresent: false,
      waveDirective: this.waveDirective ? {
        id: this.waveDirective.id,
        name: this.waveDirective.name,
        hint: this.waveDirective.hint,
        targetEnemyId: this.waveDirective.targetEnemyId,
        completed: Boolean(this.waveDirective.completed),
        bonuses: this.waveDirective.bonuses,
      } : null,
      removedSystemsPresent: false,
      touchSafeZones: this.touchMode ? mobileSafeZones() : [],
    };
  }
}

function readNumber(key) {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
  } catch {
    return 0;
  }
}

function writeNumber(key, value) {
  try { localStorage.setItem(key, String(Math.max(0, Math.trunc(Number(value) || 0)))); }
  catch { /* Storage can be unavailable in private or restricted contexts. */ }
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
  ctx.shadowBlur = 0;
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
