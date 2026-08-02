import {
  clamp,
  circlesOverlap,
  distanceSquared,
  normalize,
  randomPointOutsideRadius,
} from './math.js';
import { AudioEngine } from './audio.js';
import {
  GAME_HEIGHT as HEIGHT,
  GAME_WIDTH as WIDTH,
  TOTAL_WAVES,
  arenaForWave,
  bossArena,
  pickUpgradeChoices,
} from './content.js';

export const GAME_VERSION = '0.2.0';

const PLAYER_SPEED = 285;
const DASH_SPEED = 760;
const BULLET_SPEED = 920;
const FONT = 'Changa, "Segoe UI", Tahoma, sans-serif';

const COLORS = {
  background: '#050711', panel: '#11162a', panelStrong: '#171d35', grid: 'rgba(97,124,255,.075)', border: '#303962',
  player: '#62f3ff', playerGlow: 'rgba(98,243,255,.4)', bullet: '#ffe66d', bulletGlow: 'rgba(255,230,109,.46)',
  scout: '#ff5f78', brute: '#ff9f43', sniper: '#b983ff', charger: '#53f2a1', splitter: '#ff79d1', boss: '#ff355f',
  enemyShot: '#ffd0dc', text: '#f8f9ff', muted: '#929bbf', success: '#65f59a', danger: '#ff526a', hazard: '#ff3d7f', electric: '#58a6ff',
};

const ENEMY_TYPES = {
  scout: { radius: 17, speed: 132, hp: 1, score: 100 },
  brute: { radius: 27, speed: 74, hp: 3, score: 260 },
  sniper: { radius: 20, speed: 58, hp: 2, score: 210 },
  charger: { radius: 21, speed: 68, hp: 2, score: 240 },
  splitter: { radius: 24, speed: 78, hp: 3, score: 320 },
};

const UI = { buttonWidth: 330, buttonHeight: 58, cardWidth: 330, cardHeight: 300 };

export class OneBulletArena {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    this.audio = new AudioEngine();
    this.keys = new Set();
    this.pointer = { x: WIDTH / 2, y: HEIGHT / 2, down: false };
    this.touchMove = null;
    this.touchMode = window.matchMedia?.('(pointer: coarse)').matches || false;
    this.state = 'menu';
    this.settingsReturnState = 'menu';
    this.lastTime = 0;
    this.elapsed = 0;
    this.highScore = Number(localStorage.getItem('one-bullet-arena-high-score') || 0);
    this.highWave = Number(localStorage.getItem('one-bullet-arena-high-wave') || 0);
    this.particles = [];
    this.floatingTexts = [];
    this.shake = 0;
    this.flash = 0;
    this.hitStop = 0;
    this.slowMotion = 0;
    this.nextEnemyId = 1;
    this.uiRegions = [];
    this.dashRequested = false;
    this.banner = null;
    this.bossIntroTimer = 0;
    this.victoryTimer = 0;
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
      if (key === 'escape') { this.handleEscape(); return; }
      if (key === 'p' && this.state === 'playing') { this.pauseGame(); return; }
      if (key === 'p' && this.state === 'paused') { this.resumeGame(); return; }
      if (key === ' ' || key === 'shift') this.dashRequested = true;
      if (key === 'q' && this.state === 'playing') this.recallBullet();
      if (key === 'm') this.audio.toggleMute();
      if (this.state === 'upgrade' && ['1', '2', '3'].includes(key)) { this.chooseUpgrade(Number(key) - 1); return; }
      if ((key === 'enter' || key === ' ') && this.state === 'menu') { this.startRun(); return; }
      if ((key === 'enter' || key === 'r') && ['gameover', 'victory'].includes(this.state)) this.startRun();
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
      if (this.touchMove?.id === event.pointerId) { this.touchMove.x = this.pointer.x; this.touchMove.y = this.pointer.y; }
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
        if (this.pointer.x < WIDTH * 0.46 && this.pointer.y > HEIGHT * 0.34) {
          this.touchMove = { id: event.pointerId, originX: this.pointer.x, originY: this.pointer.y, x: this.pointer.x, y: this.pointer.y };
          return;
        }
        if (Math.hypot(this.pointer.x - (WIDTH - 105), this.pointer.y - (HEIGHT - 105)) < 72) { this.dashRequested = true; return; }
      }
      this.fireBullet();
    });
    const releasePointer = (event) => { this.pointer.down = false; if (this.touchMove?.id === event.pointerId) this.touchMove = null; };
    this.canvas.addEventListener('pointerup', releasePointer);
    this.canvas.addEventListener('pointercancel', releasePointer);
    window.addEventListener('blur', () => { this.keys.clear(); this.touchMove = null; if (this.state === 'playing') this.pauseGame(); });
  }

  handleEscape() {
    if (this.state === 'playing') this.pauseGame();
    else if (this.state === 'paused') this.resumeGame();
    else if (this.state === 'settings') this.state = this.settingsReturnState;
    else if (this.state === 'howto') this.state = 'menu';
    else if (['gameover', 'victory'].includes(this.state)) this.goToMenu();
  }

  pauseGame() { if (this.state === 'playing') { this.state = 'paused'; this.audio.setScene('menu'); } }
  resumeGame() { if (this.state === 'paused') { this.state = 'playing'; this.audio.setScene(this.boss ? 'boss' : 'combat'); } }
  goToMenu() { this.state = 'menu'; this.audio.setScene('menu'); this.resetRun(); }

  resetRun() {
    this.player = { x: WIDTH / 2, y: HEIGHT / 2, radius: 18, health: 3, maxHealth: 3, shield: 0, invulnerability: 0, hazardCooldown: 0, dashCooldown: 0, dashRemaining: 0, dashDirection: { x: 0, y: 0 } };
    this.bullet = { x: this.player.x, y: this.player.y, radius: 8, vx: 0, vy: 0, held: true, recoverDelay: 0, bouncesRemaining: 4, bounceCount: 0, hitEnemyIds: new Set(), trail: [], recalling: false, recallCooldown: 0 };
    this.enemies = [];
    this.enemyShots = [];
    this.boss = null;
    this.wave = 0;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.waveClearTimer = 0;
    this.runTime = 0;
    this.arena = arenaForWave(1);
    this.upgradeStacks = {};
    this.upgradeChoices = [];
    this.pendingStage = null;
    this.particles = [];
    this.floatingTexts = [];
    this.stats = { shots: 0, hits: 0, kills: 0, ricochets: 0, damageTaken: 0, perfectCatches: 0, upgrades: 0 };
  }

  startRun() {
    this.audio.play('click');
    this.resetRun();
    this.state = 'playing';
    this.audio.setScene('combat');
    this.spawnNextWave();
  }

  waveComposition(wave) {
    if (wave === 1) return ['scout', 'scout', 'scout'];
    if (wave === 2) return ['scout', 'scout', 'scout', 'scout', 'brute'];
    if (wave === 3) return ['scout', 'scout', 'scout', 'sniper', 'charger', 'brute'];
    if (wave === 4) return ['scout', 'scout', 'scout', 'scout', 'brute', 'brute', 'sniper', 'splitter'];
    return ['scout', 'scout', 'scout', 'scout', 'brute', 'brute', 'sniper', 'sniper', 'charger', 'splitter'];
  }

  spawnNextWave() {
    this.wave += 1;
    this.highWave = Math.max(this.highWave, this.wave);
    localStorage.setItem('one-bullet-arena-high-wave', String(this.highWave));
    this.arena = arenaForWave(this.wave);
    this.enemies = [];
    this.enemyShots = [];
    this.waveComposition(this.wave).forEach((type, index) => this.spawnEnemy(type, { elite: this.wave >= 4 && index % 5 === 4 }));
    this.banner = { title: `الموجة ${this.wave}`, subtitle: `${this.arena.name} — ${this.arena.subtitle}`, time: 2.2 };
    this.createBurst(this.player.x, this.player.y, COLORS.player, 22, 250);
  }

  spawnEnemy(type, options = {}) {
    const template = ENEMY_TYPES[type];
    const point = options.point || this.findSpawnPoint();
    const eliteMultiplier = options.elite ? 1.45 : 1;
    const miniMultiplier = options.mini ? 0.68 : 1;
    this.enemies.push({
      id: this.nextEnemyId++, type, x: point.x, y: point.y, radius: template.radius * miniMultiplier,
      speed: template.speed * (options.mini ? 1.18 : 1) * (options.elite ? 1.1 : 1),
      hp: template.hp * eliteMultiplier * (options.mini ? 0.7 : 1), maxHp: template.hp * eliteMultiplier * (options.mini ? 0.7 : 1),
      score: Math.round(template.score * eliteMultiplier * (options.mini ? 0.55 : 1)), shootCooldown: 0.65 + Math.random() * 0.8,
      attackCooldown: 0.8 + Math.random(), chargeTelegraph: 0, chargeRemaining: 0, chargeDirection: { x: 0, y: 0 },
      phase: Math.random() * Math.PI * 2, knockbackX: 0, knockbackY: 0, hitFlash: 0, spawnTime: 0.5, hazardCooldown: 0,
      elite: Boolean(options.elite), mini: Boolean(options.mini),
    });
  }

  findSpawnPoint() {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const point = randomPointOutsideRadius(WIDTH, HEIGHT, this.player, 255, 70);
      if (!this.arena.obstacles.some((obstacle) => circleRectOverlap({ ...point, radius: 36 }, obstacle))) return point;
    }
    return { x: 80, y: 80 };
  }

  fireBullet() {
    if (!this.bullet.held || this.state !== 'playing') return;
    const direction = normalize(this.pointer.x - this.player.x, this.pointer.y - this.player.y);
    if (direction.x === 0 && direction.y === 0) return;
    const speed = BULLET_SPEED * (1 - this.stack('heavy-core') * 0.12);
    Object.assign(this.bullet, {
      held: false, x: this.player.x + direction.x * 30, y: this.player.y + direction.y * 30,
      vx: direction.x * speed, vy: direction.y * speed, recoverDelay: 0.24,
      bouncesRemaining: 4 + this.stack('extended-charge') * 2, bounceCount: 0, recalling: false, trail: [],
    });
    this.bullet.hitEnemyIds.clear();
    this.stats.shots += 1;
    this.audio.play('shoot');
    this.createBurst(this.bullet.x, this.bullet.y, COLORS.bullet, 10, 150);
    this.shake = 6;
  }

  recallBullet() {
    if (this.stack('magnetic-recall') <= 0 || this.bullet.held || this.bullet.recallCooldown > 0) return;
    this.bullet.recalling = true;
    this.bullet.recallCooldown = Math.max(1.7, 4.2 - this.stack('magnetic-recall') * 1.1);
    this.audio.play('recover');
  }

  tryDash() {
    if (!this.dashRequested) return;
    this.dashRequested = false;
    if (this.player.dashCooldown > 0 || this.player.dashRemaining > 0) return;
    const movement = this.getMovementDirection();
    const fallback = normalize(this.pointer.x - this.player.x, this.pointer.y - this.player.y);
    const direction = movement.x === 0 && movement.y === 0 ? fallback : movement;
    if (direction.x === 0 && direction.y === 0) return;
    this.player.dashDirection = direction;
    this.player.dashRemaining = 0.15;
    this.player.dashCooldown = 1.15 * Math.pow(0.78, this.stack('quick-recovery'));
    this.player.invulnerability = Math.max(this.player.invulnerability, 0.2);
    this.audio.play('dash');
    this.createBurst(this.player.x, this.player.y, COLORS.player, 12, 190);
  }

  getMovementDirection() {
    let horizontal = Number(this.keys.has('d') || this.keys.has('arrowright')) - Number(this.keys.has('a') || this.keys.has('arrowleft'));
    let vertical = Number(this.keys.has('s') || this.keys.has('arrowdown')) - Number(this.keys.has('w') || this.keys.has('arrowup'));
    if (this.touchMove) {
      const dx = clamp(this.touchMove.x - this.touchMove.originX, -70, 70);
      const dy = clamp(this.touchMove.y - this.touchMove.originY, -70, 70);
      if (Math.hypot(dx, dy) > 8) { horizontal += dx / 70; vertical += dy / 70; }
    }
    return normalize(horizontal, vertical);
  }

  update(dt) {
    this.elapsed += dt;
    this.runTime += dt;
    this.flash = Math.max(0, this.flash - dt * 3.4);
    this.shake = Math.max(0, this.shake - dt * 20);
    this.player.invulnerability = Math.max(0, this.player.invulnerability - dt);
    this.player.hazardCooldown = Math.max(0, this.player.hazardCooldown - dt);
    this.player.dashCooldown = Math.max(0, this.player.dashCooldown - dt);
    this.bullet.recallCooldown = Math.max(0, this.bullet.recallCooldown - dt);
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (this.comboTimer === 0) this.combo = 0;
    if (this.banner && (this.banner.time -= dt) <= 0) this.banner = null;
    for (const obstacle of this.arena.obstacles) obstacle.hitFlash = Math.max(0, (obstacle.hitFlash || 0) - dt);
    this.tryDash();
    this.updatePlayer(dt);
    this.updateBullet(dt);
    this.updateEnemies(dt);
    this.updateBoss(dt);
    this.updateEnemyShots(dt);
    this.updateArenaHazards(dt);
    this.updateParticles(dt);
    this.updateFloatingTexts(dt);
    if (this.victoryTimer > 0) { this.victoryTimer -= dt; if (this.victoryTimer <= 0) this.finishRun(true); return; }
    if (!this.boss && this.enemies.length === 0 && this.state === 'playing') {
      this.waveClearTimer += dt;
      if (this.waveClearTimer >= 0.9 && this.bullet.held) { this.waveClearTimer = 0; this.openUpgradeSelection(this.wave >= TOTAL_WAVES ? 'boss' : 'wave'); }
    } else this.waveClearTimer = 0;
  }

  updatePlayer(dt) {
    let direction = this.getMovementDirection();
    let speed = PLAYER_SPEED;
    if (this.player.dashRemaining > 0) {
      this.player.dashRemaining -= dt; direction = this.player.dashDirection; speed = DASH_SPEED;
      if (Math.random() > 0.3) this.createParticle(this.player.x, this.player.y, COLORS.player, 70);
    }
    this.player.x = clamp(this.player.x + direction.x * speed * dt, 30, WIDTH - 30);
    this.player.y = clamp(this.player.y + direction.y * speed * dt, 30, HEIGHT - 30);
    this.resolveEntityObstacles(this.player);
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
    this.bullet.trail.length = Math.min(this.bullet.trail.length, 18);
    if (this.bullet.recalling) {
      const direction = normalize(this.player.x - this.bullet.x, this.player.y - this.bullet.y);
      const speed = 680 + this.stack('magnetic-recall') * 150;
      this.bullet.vx = direction.x * speed; this.bullet.vy = direction.y * speed;
    }
    const previous = { x: this.bullet.x, y: this.bullet.y };
    this.bullet.x += this.bullet.vx * dt; this.bullet.y += this.bullet.vy * dt;
    if (!this.bullet.recalling) { this.handleOuterWallRicochet(); this.handleObstacleRicochet(previous); }
    if (Math.hypot(this.bullet.vx, this.bullet.vy) < 85 && !this.bullet.recalling) {
      this.bullet.vx *= Math.max(0, 1 - dt * 4); this.bullet.vy *= Math.max(0, 1 - dt * 4);
    }
    this.handleBulletNodes();
    for (const enemy of [...this.enemies]) {
      if (!this.bullet.hitEnemyIds.has(enemy.id) && circlesOverlap(this.bullet, enemy)) {
        this.bullet.hitEnemyIds.add(enemy.id);
        this.damageEnemy(enemy, this.currentBulletDamage(), this.bullet.vx, this.bullet.vy, true);
        this.bullet.vx *= 0.88; this.bullet.vy *= 0.88;
      }
    }
    if (this.boss && !this.boss.dead && !this.bullet.hitEnemyIds.has('boss') && circlesOverlap(this.bullet, this.boss)) {
      this.bullet.hitEnemyIds.add('boss'); this.damageBoss(this.currentBulletDamage()); this.bullet.vx *= 0.86; this.bullet.vy *= 0.86;
    }
    const pickupPadding = 10 + this.stack('quick-recovery') * 12;
    if (this.bullet.recoverDelay === 0 && circlesOverlap(this.bullet, this.player, pickupPadding)) this.catchBullet();
  }

  handleOuterWallRicochet() {
    let bounced = false;
    if (this.bullet.x <= this.bullet.radius || this.bullet.x >= WIDTH - this.bullet.radius) {
      this.bullet.x = clamp(this.bullet.x, this.bullet.radius, WIDTH - this.bullet.radius); this.bullet.vx *= -1; bounced = true;
    }
    if (this.bullet.y <= this.bullet.radius || this.bullet.y >= HEIGHT - this.bullet.radius) {
      this.bullet.y = clamp(this.bullet.y, this.bullet.radius, HEIGHT - this.bullet.radius); this.bullet.vy *= -1; bounced = true;
    }
    if (bounced) this.onRicochet();
  }

  handleObstacleRicochet(previous) {
    for (const obstacle of [...this.arena.obstacles]) {
      if (!circleRectOverlap(this.bullet, obstacle)) continue;
      if (obstacle.kind === 'breakable') {
        obstacle.hp -= Math.max(1, this.currentBulletDamage() * 0.6); obstacle.hitFlash = 0.2;
        if (obstacle.hp <= 0) {
          this.arena.obstacles = this.arena.obstacles.filter((item) => item.id !== obstacle.id);
          this.audio.play('explosion'); this.createBurst(obstacle.x + obstacle.w / 2, obstacle.y + obstacle.h / 2, COLORS.bullet, 22, 260); this.score += 150; continue;
        }
      }
      const left = previous.x + this.bullet.radius <= obstacle.x;
      const right = previous.x - this.bullet.radius >= obstacle.x + obstacle.w;
      const top = previous.y + this.bullet.radius <= obstacle.y;
      const bottom = previous.y - this.bullet.radius >= obstacle.y + obstacle.h;
      if (left || right) { this.bullet.vx *= -1; this.bullet.x = left ? obstacle.x - this.bullet.radius - 1 : obstacle.x + obstacle.w + this.bullet.radius + 1; }
      else if (top || bottom) { this.bullet.vy *= -1; this.bullet.y = top ? obstacle.y - this.bullet.radius - 1 : obstacle.y + obstacle.h + this.bullet.radius + 1; }
      else {
        const dx = Math.min(Math.abs(this.bullet.x - obstacle.x), Math.abs(this.bullet.x - obstacle.x - obstacle.w));
        const dy = Math.min(Math.abs(this.bullet.y - obstacle.y), Math.abs(this.bullet.y - obstacle.y - obstacle.h));
        if (dx < dy) this.bullet.vx *= -1; else this.bullet.vy *= -1;
      }
      this.onRicochet(); break;
    }
  }

  onRicochet() {
    this.bullet.bouncesRemaining -= 1; this.bullet.bounceCount += 1; this.bullet.hitEnemyIds.clear(); this.stats.ricochets += 1;
    this.shake = Math.max(this.shake, 4); this.audio.play('ricochet'); this.createBurst(this.bullet.x, this.bullet.y, COLORS.bullet, 7, 125);
    if (this.bullet.bouncesRemaining <= 0) { this.bullet.vx *= 0.2; this.bullet.vy *= 0.2; }
  }

  currentBulletDamage() {
    let damage = 1 + this.stack('heavy-core') + this.bullet.bounceCount * this.stack('hot-ricochet') * 0.55;
    if (this.player.health === 1 && this.stack('last-heart') > 0) damage *= 2;
    return damage;
  }

  catchBullet() {
    const speed = Math.hypot(this.bullet.vx, this.bullet.vy);
    const perfect = speed > 360 && this.stack('perfect-catch') > 0 && !this.bullet.recalling;
    Object.assign(this.bullet, { held: true, recalling: false, vx: 0, vy: 0, trail: [] });
    this.audio.play('recover'); this.createBurst(this.player.x, this.player.y, COLORS.bullet, perfect ? 22 : 14, perfect ? 230 : 165);
    if (perfect) {
      this.player.shield = Math.max(this.player.shield, 1); this.stats.perfectCatches += 1;
      const bonus = 250 * this.stack('perfect-catch'); this.score += bonus;
      this.addFloatingText(this.player.x, this.player.y - 35, `التقاط مثالي +${bonus}`, COLORS.bullet); this.hitStop = Math.max(this.hitStop, 0.045);
    }
  }

  handleBulletNodes() {
    for (const node of this.arena.nodes) if (node.active && circlesOverlap(this.bullet, node)) { node.active = false; this.explodeNode(node); }
  }

  explodeNode(node) {
    this.audio.play('explosion'); this.shake = 18; this.flash = Math.max(this.flash, 0.35); this.createBurst(node.x, node.y, COLORS.hazard, 42, 420);
    for (const enemy of [...this.enemies]) if (distanceSquared(node, enemy) <= node.blastRadius ** 2) this.damageEnemy(enemy, 3, enemy.x - node.x, enemy.y - node.y, false);
    if (this.boss && distanceSquared(node, this.boss) <= node.blastRadius ** 2) this.damageBoss(2, true);
    if (distanceSquared(node, this.player) <= node.blastRadius ** 2) this.damagePlayer(node.x, node.y);
  }

  damageEnemy(enemy, damage, forceX, forceY, fromBullet) {
    enemy.hp -= damage; enemy.hitFlash = 0.16;
    const push = normalize(forceX, forceY); enemy.knockbackX += push.x * 180; enemy.knockbackY += push.y * 180;
    if (fromBullet) this.stats.hits += 1;
    this.shake = Math.max(this.shake, enemy.type === 'brute' ? 8 : 6); this.hitStop = Math.max(this.hitStop, enemy.hp <= 0 ? 0.07 : 0.035);
    this.audio.play(enemy.hp <= 0 ? 'kill' : 'hit'); this.createBurst(enemy.x, enemy.y, this.enemyColor(enemy.type), enemy.hp <= 0 ? 22 : 12, enemy.hp <= 0 ? 320 : 230);
    this.addFloatingText(enemy.x, enemy.y - enemy.radius - 12, `-${formatDamage(damage)}`, COLORS.text);
    if (fromBullet && this.stack('shock-impact') > 0) this.applyShockWave(enemy, damage * 0.38 * this.stack('shock-impact'));
    if (enemy.hp <= 0) this.killEnemy(enemy);
  }

  applyShockWave(origin, damage) {
    const radius = 105 + this.stack('shock-impact') * 25;
    this.createRing(origin.x, origin.y, COLORS.electric, radius);
    for (const enemy of [...this.enemies]) {
      if (enemy.id === origin.id || distanceSquared(origin, enemy) > radius ** 2) continue;
      enemy.hp -= damage; enemy.hitFlash = 0.12; this.createBurst(enemy.x, enemy.y, COLORS.electric, 7, 150);
      if (enemy.hp <= 0) this.killEnemy(enemy);
    }
  }

  killEnemy(enemy) {
    if (!this.enemies.some((candidate) => candidate.id === enemy.id)) return;
    this.enemies = this.enemies.filter((candidate) => candidate.id !== enemy.id);
    this.combo += 1; this.comboTimer = 2.35;
    const gained = Math.round(enemy.score * Math.max(1, this.combo));
    this.score += gained; this.stats.kills += 1; this.highScore = Math.max(this.highScore, this.score);
    localStorage.setItem('one-bullet-arena-high-score', String(this.highScore)); this.addFloatingText(enemy.x, enemy.y, `+${gained}`, COLORS.bullet);
    if (enemy.type === 'splitter' && !enemy.mini) {
      for (let index = 0; index < 2; index += 1) this.spawnEnemy('scout', { mini: true, point: { x: clamp(enemy.x + (index ? 34 : -34), 50, WIDTH - 50), y: clamp(enemy.y + (Math.random() - 0.5) * 45, 50, HEIGHT - 50) } });
    }
  }

  updateEnemies(dt) {
    for (const enemy of [...this.enemies]) {
      enemy.phase += dt * 2; enemy.hitFlash = Math.max(0, enemy.hitFlash - dt); enemy.spawnTime = Math.max(0, enemy.spawnTime - dt);
      enemy.hazardCooldown = Math.max(0, enemy.hazardCooldown - dt); enemy.attackCooldown -= dt;
      enemy.x += enemy.knockbackX * dt; enemy.y += enemy.knockbackY * dt;
      enemy.knockbackX *= Math.max(0, 1 - dt * 7); enemy.knockbackY *= Math.max(0, 1 - dt * 7);
      const toPlayer = normalize(this.player.x - enemy.x, this.player.y - enemy.y);
      if (enemy.type === 'sniper') this.updateSniper(enemy, toPlayer, dt);
      else if (enemy.type === 'charger') this.updateCharger(enemy, toPlayer, dt);
      else {
        const orbit = Math.sin(enemy.phase) * (enemy.type === 'scout' ? 0.22 : enemy.type === 'splitter' ? 0.12 : 0);
        enemy.x += (toPlayer.x - toPlayer.y * orbit) * enemy.speed * dt; enemy.y += (toPlayer.y + toPlayer.x * orbit) * enemy.speed * dt;
      }
      enemy.x = clamp(enemy.x, enemy.radius, WIDTH - enemy.radius); enemy.y = clamp(enemy.y, enemy.radius, HEIGHT - enemy.radius);
      this.resolveEntityObstacles(enemy); if (circlesOverlap(enemy, this.player, -2)) this.damagePlayer(enemy.x, enemy.y);
    }
  }

  updateSniper(enemy, toPlayer, dt) {
    const distance = Math.sqrt(distanceSquared(enemy, this.player));
    const desired = distance < 275 ? -1 : distance > 455 ? 1 : 0;
    const strafe = { x: -toPlayer.y, y: toPlayer.x };
    enemy.x += (toPlayer.x * desired + strafe.x * Math.sin(enemy.phase) * 0.5) * enemy.speed * dt;
    enemy.y += (toPlayer.y * desired + strafe.y * Math.sin(enemy.phase) * 0.5) * enemy.speed * dt;
    if (enemy.attackCooldown <= 0) { this.fireEnemyShot(enemy, toPlayer, enemy.elite ? 440 : 370); enemy.attackCooldown = Math.max(0.82, 1.7 - this.wave * 0.08); }
  }

  updateCharger(enemy, toPlayer, dt) {
    if (enemy.chargeRemaining > 0) { enemy.chargeRemaining -= dt; enemy.x += enemy.chargeDirection.x * 550 * dt; enemy.y += enemy.chargeDirection.y * 550 * dt; return; }
    if (enemy.chargeTelegraph > 0) {
      enemy.chargeTelegraph -= dt;
      if (enemy.chargeTelegraph <= 0) { enemy.chargeDirection = normalize(this.player.x - enemy.x, this.player.y - enemy.y); enemy.chargeRemaining = 0.38; this.audio.play('dash'); }
      return;
    }
    enemy.x += toPlayer.x * enemy.speed * dt; enemy.y += toPlayer.y * enemy.speed * dt;
    if (enemy.attackCooldown <= 0) { enemy.chargeTelegraph = 0.62; enemy.attackCooldown = 2.4; }
  }

  fireEnemyShot(enemy, direction, speed = 370) {
    this.enemyShots.push({ x: enemy.x, y: enemy.y, vx: direction.x * speed, vy: direction.y * speed, radius: enemy.elite ? 8 : 7, life: 3.6, color: enemy.type === 'sniper' ? COLORS.sniper : COLORS.enemyShot });
    this.createBurst(enemy.x, enemy.y, COLORS.sniper, 6, 100);
  }

  fireRadialShots(origin, count, speed, offset = 0) {
    for (let index = 0; index < count; index += 1) {
      const angle = offset + index / count * Math.PI * 2;
      this.enemyShots.push({ x: origin.x, y: origin.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius: 8, life: 4.2, color: COLORS.boss });
    }
  }

  updateEnemyShots(dt) {
    for (const shot of this.enemyShots) {
      shot.x += shot.vx * dt; shot.y += shot.vy * dt; shot.life -= dt;
      if (this.arena.obstacles.some((obstacle) => circleRectOverlap(shot, obstacle))) { shot.life = 0; continue; }
      if (circlesOverlap(shot, this.player)) { shot.life = 0; this.damagePlayer(shot.x, shot.y); }
    }
    this.enemyShots = this.enemyShots.filter((shot) => shot.life > 0 && shot.x > -30 && shot.x < WIDTH + 30 && shot.y > -30 && shot.y < HEIGHT + 30);
  }

  updateArenaHazards(dt) {
    for (const hazard of this.arena.hazards) {
      hazard.pulse += dt * 3;
      if (this.player.hazardCooldown <= 0 && circleRectOverlap(this.player, hazard)) { this.player.hazardCooldown = hazard.damageInterval; this.damagePlayer(hazard.x + hazard.w / 2, hazard.y + hazard.h / 2); }
      for (const enemy of [...this.enemies]) if (enemy.hazardCooldown <= 0 && circleRectOverlap(enemy, hazard)) { enemy.hazardCooldown = 0.8; this.damageEnemy(enemy, 0.55, enemy.x - hazard.x - hazard.w / 2, enemy.y - hazard.y - hazard.h / 2, false); }
    }
  }

  resolveEntityObstacles(entity) { for (const obstacle of this.arena.obstacles) resolveCircleRect(entity, obstacle); }

  damagePlayer(sourceX, sourceY) {
    if (this.player.invulnerability > 0 || this.player.dashRemaining > 0 || ['gameover', 'victory'].includes(this.state)) return;
    if (this.player.shield > 0) {
      this.player.shield -= 1; this.player.invulnerability = 0.5; this.audio.play('hit'); this.createBurst(this.player.x, this.player.y, COLORS.electric, 20, 260);
      this.addFloatingText(this.player.x, this.player.y - 34, 'تم كسر الدرع', COLORS.electric); return;
    }
    this.player.health -= 1; this.stats.damageTaken += 1; this.player.invulnerability = 1.05; this.flash = 1; this.shake = 15; this.combo = 0;
    this.audio.play('damage'); this.createBurst(this.player.x, this.player.y, COLORS.danger, 28, 340);
    const push = normalize(this.player.x - sourceX, this.player.y - sourceY);
    this.player.x = clamp(this.player.x + push.x * 45, 34, WIDTH - 34); this.player.y = clamp(this.player.y + push.y * 45, 34, HEIGHT - 34);
    this.resolveEntityObstacles(this.player); if (this.player.health <= 0) this.finishRun(false);
  }

  startBoss() {
    this.state = 'bossIntro'; this.audio.setScene('boss'); this.audio.play('boss'); this.arena = bossArena(); this.enemies = []; this.enemyShots = []; this.bossIntroTimer = 2.8;
    this.boss = { x: WIDTH / 2, y: 245, radius: 62, hp: 18, maxHp: 18, phase: 1, previousPhase: 1, attackCooldown: 1.3, telegraph: 0, dashRemaining: 0, dashDirection: { x: 0, y: 0 }, angle: 0, hitFlash: 0, dead: false };
  }

  updateBossIntro(dt) {
    this.elapsed += dt; this.bossIntroTimer -= dt; this.updateParticles(dt);
    if (this.bossIntroTimer <= 0) { this.state = 'playing'; this.banner = { title: 'حارس النواة', subtitle: 'في المرحلة الأولى: لا تؤذيه إلا طلقة ارتدت عن جدار', time: 3.2 }; }
  }

  updateBoss(dt) {
    const boss = this.boss;
    if (!boss || boss.dead) return;
    boss.hitFlash = Math.max(0, boss.hitFlash - dt); boss.angle += dt * (0.8 + boss.phase * 0.2); boss.previousPhase = boss.phase;
    boss.phase = boss.hp > 12 ? 1 : boss.hp > 6 ? 2 : 3;
    if (boss.phase !== boss.previousPhase) {
      this.banner = { title: boss.phase === 2 ? 'انكسر الدرع' : 'تحميل زائد', subtitle: boss.phase === 2 ? 'الحارس بدأ هجمات الاندفاع' : 'الحلبة الآن في أخطر حالاتها', time: 2.2 };
      this.audio.play('boss'); this.createBurst(boss.x, boss.y, COLORS.boss, 38, 380); this.shake = 18;
    }
    if (boss.dashRemaining > 0) {
      boss.dashRemaining -= dt; boss.x += boss.dashDirection.x * 570 * dt; boss.y += boss.dashDirection.y * 570 * dt;
      boss.x = clamp(boss.x, boss.radius, WIDTH - boss.radius); boss.y = clamp(boss.y, boss.radius, HEIGHT - boss.radius); this.resolveEntityObstacles(boss);
    } else if (boss.telegraph > 0) { boss.telegraph -= dt; if (boss.telegraph <= 0) this.executeBossAttack(); }
    else {
      const toPlayer = normalize(this.player.x - boss.x, this.player.y - boss.y);
      const distance = Math.sqrt(distanceSquared(boss, this.player));
      const desired = boss.phase === 1 ? (distance > 360 ? 1 : -0.3) : 0.45;
      const strafe = { x: -toPlayer.y, y: toPlayer.x };
      boss.x += (toPlayer.x * desired + strafe.x * Math.sin(boss.angle) * 0.75) * (55 + boss.phase * 16) * dt;
      boss.y += (toPlayer.y * desired + strafe.y * Math.sin(boss.angle) * 0.75) * (55 + boss.phase * 16) * dt;
      boss.x = clamp(boss.x, boss.radius, WIDTH - boss.radius); boss.y = clamp(boss.y, boss.radius, HEIGHT - boss.radius); this.resolveEntityObstacles(boss);
      boss.attackCooldown -= dt;
      if (boss.attackCooldown <= 0) { boss.telegraph = boss.phase === 1 ? 0.65 : 0.48; boss.attackCooldown = boss.phase === 1 ? 2.1 : boss.phase === 2 ? 1.7 : 1.15; }
    }
    if (circlesOverlap(boss, this.player, -5)) this.damagePlayer(boss.x, boss.y);
  }

  executeBossAttack() {
    const boss = this.boss;
    if (!boss || boss.dead) return;
    if (boss.phase === 1) this.fireRadialShots(boss, 10, 285, boss.angle);
    else if (boss.phase === 2) { boss.dashDirection = normalize(this.player.x - boss.x, this.player.y - boss.y); boss.dashRemaining = 0.42; this.fireRadialShots(boss, 6, 250, boss.angle); this.audio.play('dash'); }
    else {
      const direction = normalize(this.player.x - boss.x, this.player.y - boss.y); const baseAngle = Math.atan2(direction.y, direction.x);
      for (const offset of [-0.2, 0, 0.2]) this.enemyShots.push({ x: boss.x, y: boss.y, vx: Math.cos(baseAngle + offset) * 455, vy: Math.sin(baseAngle + offset) * 455, radius: 8, life: 3.6, color: COLORS.boss });
      this.fireRadialShots(boss, 8, 230, boss.angle); this.shake = 8;
    }
  }

  damageBoss(damage, bypassShield = false) {
    const boss = this.boss;
    if (!boss || boss.dead) return;
    if (boss.phase === 1 && this.bullet.bounceCount === 0 && !bypassShield) {
      this.audio.play('ricochet'); this.createRing(boss.x, boss.y, COLORS.electric, 92); this.addFloatingText(boss.x, boss.y - 82, 'يجب أن ترتد الطلقة أولًا!', COLORS.electric); this.shake = 5; return;
    }
    boss.hp -= damage; boss.hitFlash = 0.2; this.stats.hits += 1; this.audio.play(boss.hp <= 0 ? 'explosion' : 'hit');
    this.hitStop = Math.max(this.hitStop, boss.hp <= 0 ? 0.14 : 0.055); this.shake = Math.max(this.shake, boss.hp <= 0 ? 24 : 10);
    this.createBurst(boss.x, boss.y, COLORS.boss, boss.hp <= 0 ? 70 : 18, boss.hp <= 0 ? 520 : 260); this.addFloatingText(boss.x, boss.y - 78, `-${formatDamage(damage)}`, COLORS.bullet);
    if (boss.hp <= 0) { boss.hp = 0; boss.dead = true; this.score += 5000; this.stats.kills += 1; this.enemyShots = []; this.slowMotion = 1.4; this.victoryTimer = 1.5; this.audio.play('victory'); }
  }

  openUpgradeSelection(nextStage) {
    this.pendingStage = nextStage; this.upgradeChoices = pickUpgradeChoices(this.upgradeStacks, 3);
    if (this.upgradeChoices.length === 0) { if (nextStage === 'boss') this.startBoss(); else { this.state = 'playing'; this.spawnNextWave(); } return; }
    this.state = 'upgrade'; this.audio.setScene('menu'); this.audio.play('upgrade');
  }

  chooseUpgrade(index) {
    const upgrade = this.upgradeChoices[index];
    if (!upgrade) return;
    this.upgradeStacks[upgrade.id] = (this.upgradeStacks[upgrade.id] || 0) + 1; this.stats.upgrades += 1; this.audio.play('upgrade');
    if (this.pendingStage === 'boss') this.startBoss(); else { this.state = 'playing'; this.audio.setScene('combat'); this.spawnNextWave(); }
  }

  stack(id) { return this.upgradeStacks[id] || 0; }
  finishRun(victory) { this.state = victory ? 'victory' : 'gameover'; this.audio.setScene('menu'); this.highScore = Math.max(this.highScore, this.score); localStorage.setItem('one-bullet-arena-high-score', String(this.highScore)); if (!victory) this.audio.play('damage'); }
  enemyColor(type) { return COLORS[type] || COLORS.scout; }

  createParticle(x, y, color, speed) {
    const angle = Math.random() * Math.PI * 2; const magnitude = speed * (0.35 + Math.random() * 0.65);
    this.particles.push({ type: 'particle', x, y, vx: Math.cos(angle) * magnitude, vy: Math.sin(angle) * magnitude, life: 0.25 + Math.random() * 0.35, maxLife: 0.6, size: 2 + Math.random() * 4, color });
  }
  createBurst(x, y, color, count, speed) { for (let index = 0; index < count; index += 1) this.createParticle(x, y, color, speed); }
  createRing(x, y, color, maxRadius) { this.particles.push({ type: 'ring', x, y, radius: 12, maxRadius, life: 0.45, maxLife: 0.45, color }); }
  addFloatingText(x, y, text, color) { this.floatingTexts.push({ x, y, text, color, life: 0.8, maxLife: 0.8 }); }

  updateParticles(dt) {
    for (const particle of this.particles) {
      if (particle.type === 'ring') particle.radius += (particle.maxRadius - particle.radius) * dt * 9;
      else { particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vx *= Math.max(0, 1 - dt * 4); particle.vy *= Math.max(0, 1 - dt * 4); }
      particle.life -= dt;
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  updateFloatingTexts(dt) { for (const item of this.floatingTexts) { item.y -= 38 * dt; item.life -= dt; } this.floatingTexts = this.floatingTexts.filter((item) => item.life > 0); }

  loop(time) {
    let dt = Math.min(0.033, (time - this.lastTime) / 1000 || 0); this.lastTime = time;
    if (this.hitStop > 0) { this.hitStop -= dt; dt = 0; } else if (this.slowMotion > 0) { this.slowMotion -= dt; dt *= 0.24; }
    if (this.state === 'playing') this.update(dt);
    else if (this.state === 'bossIntro') this.updateBossIntro(dt);
    else { this.elapsed += dt; this.updateParticles(dt); this.updateFloatingTexts(dt); }
    this.draw(); requestAnimationFrame((nextTime) => this.loop(nextTime));
  }

  draw() {
    const ctx = this.ctx; this.uiRegions = []; ctx.save();
    ctx.translate(this.shake ? (Math.random() - 0.5) * this.shake : 0, this.shake ? (Math.random() - 0.5) * this.shake : 0);
    this.drawArena();
    if (this.state === 'menu') this.drawMenu();
    else if (this.state === 'howto') this.drawHowTo();
    else if (this.state === 'settings') this.drawSettings();
    else {
      this.drawBullet(); this.drawEnemies(); this.drawBoss(); this.drawEnemyShots(); this.drawPlayer(); this.drawParticles(); this.drawFloatingTexts(); this.drawHud();
      if (this.touchMode && this.state === 'playing') this.drawTouchControls();
      if (this.banner && this.state === 'playing') this.drawBanner();
      if (this.state === 'bossIntro') this.drawBossIntro();
      if (this.state === 'paused') this.drawPauseMenu();
      if (this.state === 'upgrade') this.drawUpgradeSelection();
      if (this.state === 'gameover') this.drawResult(false);
      if (this.state === 'victory') this.drawResult(true);
    }
    if (this.flash > 0) { ctx.fillStyle = `rgba(255,40,80,${this.flash * 0.16})`; ctx.fillRect(0, 0, WIDTH, HEIGHT); }
    ctx.restore();
  }

  drawArena() {
    const ctx = this.ctx; ctx.fillStyle = COLORS.background; ctx.fillRect(-30, -30, WIDTH + 60, HEIGHT + 60);
    ctx.strokeStyle = COLORS.grid; ctx.lineWidth = 1; const grid = 48; const offset = this.elapsed * 8 % grid;
    for (let x = -grid + offset; x <= WIDTH + grid; x += grid) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke(); }
    for (let y = -grid + offset; y <= HEIGHT + grid; y += grid) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke(); }
    const gradient = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 80, WIDTH / 2, HEIGHT / 2, 650);
    gradient.addColorStop(0, this.boss ? 'rgba(130,30,70,.13)' : 'rgba(40,61,130,.14)'); gradient.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    for (const hazard of this.arena.hazards) this.drawHazard(hazard);
    for (const obstacle of this.arena.obstacles) this.drawObstacle(obstacle);
    for (const node of this.arena.nodes) if (node.active) this.drawNode(node);
    ctx.strokeStyle = COLORS.border; ctx.lineWidth = 4; ctx.strokeRect(2, 2, WIDTH - 4, HEIGHT - 4);
  }

  drawObstacle(obstacle) {
    const ctx = this.ctx; const breakable = obstacle.kind === 'breakable'; ctx.save();
    ctx.shadowColor = breakable ? COLORS.bullet : COLORS.border; ctx.shadowBlur = breakable ? 12 : 7;
    ctx.fillStyle = breakable ? (obstacle.hitFlash > 0 ? '#fff6be' : 'rgba(109,93,48,.82)') : 'rgba(28,36,68,.94)';
    ctx.strokeStyle = breakable ? COLORS.bullet : '#46507d'; ctx.lineWidth = 3; roundRect(ctx, obstacle.x, obstacle.y, obstacle.w, obstacle.h, 8); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = breakable ? 'rgba(255,230,109,.35)' : 'rgba(116,139,255,.22)'; ctx.lineWidth = 2;
    for (let x = obstacle.x + 12; x < obstacle.x + obstacle.w; x += 25) { ctx.beginPath(); ctx.moveTo(x, obstacle.y + 5); ctx.lineTo(x - 10, obstacle.y + obstacle.h - 5); ctx.stroke(); }
    ctx.restore();
  }

  drawHazard(hazard) {
    const ctx = this.ctx; const pulse = 0.35 + Math.sin(hazard.pulse) * 0.12; ctx.save(); ctx.fillStyle = `rgba(255,61,127,${pulse})`; ctx.shadowColor = COLORS.hazard; ctx.shadowBlur = 18; ctx.fillRect(hazard.x, hazard.y, hazard.w, hazard.h);
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 2;
    for (let x = hazard.x - hazard.h; x < hazard.x + hazard.w; x += 28) { ctx.beginPath(); ctx.moveTo(x, hazard.y + hazard.h); ctx.lineTo(x + hazard.h, hazard.y); ctx.stroke(); }
    ctx.restore();
  }

  drawNode(node) {
    const ctx = this.ctx; const pulse = 1 + Math.sin(this.elapsed * 5 + node.x) * 0.1; ctx.save(); ctx.translate(node.x, node.y); ctx.scale(pulse, pulse); ctx.shadowColor = COLORS.hazard; ctx.shadowBlur = 25; ctx.fillStyle = COLORS.hazard; ctx.beginPath(); ctx.arc(0, 0, node.radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = COLORS.text; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(2, 0); ctx.lineTo(-4, 12); ctx.lineTo(10, 1); ctx.stroke(); ctx.restore();
  }

  drawPlayer() {
    const ctx = this.ctx; if (this.player.invulnerability > 0 && Math.floor(this.elapsed * 18) % 2 === 0) return;
    if (this.player.shield > 0) { ctx.strokeStyle = COLORS.electric; ctx.lineWidth = 4; ctx.shadowColor = COLORS.electric; ctx.shadowBlur = 18; ctx.beginPath(); ctx.arc(this.player.x, this.player.y, this.player.radius + 11 + Math.sin(this.elapsed * 7) * 2, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0; }
    ctx.save(); ctx.shadowColor = COLORS.playerGlow; ctx.shadowBlur = 28; ctx.fillStyle = COLORS.player; ctx.beginPath(); ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2); ctx.fill();
    const aim = normalize(this.pointer.x - this.player.x, this.pointer.y - this.player.y); ctx.strokeStyle = '#dcfdff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(this.player.x, this.player.y); ctx.lineTo(this.player.x + aim.x * 29, this.player.y + aim.y * 29); ctx.stroke(); ctx.restore();
  }

  drawBullet() {
    const ctx = this.ctx;
    for (let index = this.bullet.trail.length - 1; index >= 0; index -= 1) { const point = this.bullet.trail[index]; const alpha = (this.bullet.trail.length - index) / this.bullet.trail.length; ctx.fillStyle = `rgba(255,230,109,${alpha * .28})`; ctx.beginPath(); ctx.arc(point.x, point.y, 2 + alpha * 5, 0, Math.PI * 2); ctx.fill(); }
    if (this.bullet.recalling) { ctx.strokeStyle = 'rgba(88,166,255,.45)'; ctx.setLineDash([8, 8]); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(this.player.x, this.player.y); ctx.lineTo(this.bullet.x, this.bullet.y); ctx.stroke(); ctx.setLineDash([]); }
    ctx.save(); ctx.shadowColor = COLORS.bulletGlow; ctx.shadowBlur = 28; ctx.fillStyle = COLORS.bullet; ctx.beginPath(); ctx.arc(this.bullet.x, this.bullet.y, this.bullet.radius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    if (!this.bullet.held) { ctx.strokeStyle = 'rgba(255,230,109,.36)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(this.bullet.x, this.bullet.y, 17 + Math.sin(this.elapsed * 9) * 3, 0, Math.PI * 2); ctx.stroke(); }
  }

  drawEnemies() {
    const ctx = this.ctx;
    for (const enemy of this.enemies) {
      const color = enemy.hitFlash > 0 ? COLORS.text : this.enemyColor(enemy.type); const scale = 1 - enemy.spawnTime * 0.55;
      ctx.save(); ctx.translate(enemy.x, enemy.y); ctx.scale(scale, scale); ctx.rotate(enemy.phase * 0.35); ctx.shadowColor = color; ctx.shadowBlur = enemy.elite ? 25 : 16; ctx.fillStyle = color;
      if (enemy.type === 'scout') polygon(ctx, 4, enemy.radius, Math.PI / 4);
      else if (enemy.type === 'brute') { ctx.fillRect(-enemy.radius, -enemy.radius, enemy.radius * 2, enemy.radius * 2); ctx.fillStyle = COLORS.background; ctx.fillRect(-8, -8, 16, 16); }
      else if (enemy.type === 'sniper') polygon(ctx, 6, enemy.radius, 0);
      else if (enemy.type === 'charger') polygon(ctx, 3, enemy.radius + 3, Math.PI / 2);
      else polygon(ctx, 5, enemy.radius, -Math.PI / 2);
      if (enemy.elite) { ctx.strokeStyle = COLORS.bullet; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, enemy.radius + 8, 0, Math.PI * 2); ctx.stroke(); }
      ctx.rotate(-enemy.phase * 0.35);
      if (enemy.maxHp > 1.05) { ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(-enemy.radius, enemy.radius + 10, enemy.radius * 2, 5); ctx.fillStyle = COLORS.text; ctx.fillRect(-enemy.radius, enemy.radius + 10, enemy.radius * 2 * Math.max(0, enemy.hp / enemy.maxHp), 5); }
      if (enemy.type === 'sniper' && enemy.attackCooldown < 0.45) {
        const direction = normalize(this.player.x - enemy.x, this.player.y - enemy.y); ctx.strokeStyle = `rgba(185,131,255,${0.25 + 0.45 - enemy.attackCooldown})`; ctx.lineWidth = 2; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(direction.x * 650, direction.y * 650); ctx.stroke(); ctx.setLineDash([]);
      }
      if (enemy.type === 'charger' && enemy.chargeTelegraph > 0) { ctx.strokeStyle = COLORS.danger; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, enemy.radius + 10 + Math.sin(this.elapsed * 20) * 4, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
    }
  }

  drawBoss() {
    const boss = this.boss; if (!boss) return; const ctx = this.ctx; ctx.save(); ctx.translate(boss.x, boss.y); ctx.rotate(boss.angle); ctx.globalAlpha = boss.dead ? 0.35 : 1; ctx.shadowColor = COLORS.boss; ctx.shadowBlur = 38; ctx.fillStyle = boss.hitFlash > 0 ? COLORS.text : COLORS.boss; polygon(ctx, 8, boss.radius, Math.PI / 8); ctx.fillStyle = COLORS.background; polygon(ctx, 6, boss.radius * 0.48, 0);
    if (boss.phase === 1 && !boss.dead) { ctx.strokeStyle = COLORS.electric; ctx.lineWidth = 5; ctx.shadowColor = COLORS.electric; ctx.beginPath(); ctx.arc(0, 0, boss.radius + 16 + Math.sin(this.elapsed * 6) * 3, 0, Math.PI * 2); ctx.stroke(); }
    if (boss.telegraph > 0) { ctx.strokeStyle = COLORS.bullet; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, boss.radius + 28 + Math.sin(this.elapsed * 18) * 7, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }

  drawEnemyShots() { const ctx = this.ctx; for (const shot of this.enemyShots) { ctx.save(); ctx.shadowColor = shot.color || COLORS.enemyShot; ctx.shadowBlur = 15; ctx.fillStyle = shot.color || COLORS.enemyShot; ctx.beginPath(); ctx.arc(shot.x, shot.y, shot.radius, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } }

  drawParticles() {
    const ctx = this.ctx;
    for (const particle of this.particles) {
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      if (particle.type === 'ring') { ctx.strokeStyle = particle.color; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2); ctx.stroke(); }
      else { ctx.fillStyle = particle.color; ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size); }
    }
    ctx.globalAlpha = 1;
  }

  drawFloatingTexts() {
    const ctx = this.ctx; ctx.textAlign = 'center'; ctx.direction = 'rtl';
    for (const item of this.floatingTexts) { ctx.globalAlpha = Math.max(0, item.life / item.maxLife); ctx.fillStyle = item.color; ctx.font = `700 22px ${FONT}`; ctx.fillText(item.text, item.x, item.y); }
    ctx.globalAlpha = 1; ctx.direction = 'ltr'; ctx.textAlign = 'left';
  }

  drawHud() {
    const ctx = this.ctx; ctx.direction = 'rtl'; panel(ctx, WIDTH - 390, 18, 370, 102); ctx.textAlign = 'right'; ctx.fillStyle = COLORS.text; ctx.font = `700 23px ${FONT}`;
    ctx.fillText(this.boss ? 'معركة الزعيم' : `الموجة ${this.wave} / ${TOTAL_WAVES}`, WIDTH - 42, 52);
    ctx.font = `600 17px ${FONT}`; ctx.fillStyle = COLORS.muted; ctx.fillText(`النقاط  ${this.score.toLocaleString('ar-EG')}`, WIDTH - 42, 83);
    for (let index = 0; index < this.player.maxHealth; index += 1) { ctx.fillStyle = index < this.player.health ? COLORS.danger : '#252b42'; ctx.beginPath(); ctx.arc(WIDTH - 332 + index * 32, 91, 10, 0, Math.PI * 2); ctx.fill(); }
    if (this.player.shield > 0) { ctx.strokeStyle = COLORS.electric; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(WIDTH - 222, 91, 11, 0, Math.PI * 2); ctx.stroke(); }
    const ready = this.bullet.held; panel(ctx, 20, 18, 350, 102, ready ? COLORS.bullet : COLORS.border); ctx.fillStyle = ready ? COLORS.bullet : COLORS.muted; ctx.font = `800 21px ${FONT}`; ctx.fillText(ready ? 'الطلقة جاهزة' : this.bullet.recalling ? 'الطلقة عائدة' : 'استعد الطلقة', 344, 55);
    ctx.font = `500 15px ${FONT}`; ctx.fillStyle = COLORS.muted; const dash = this.player.dashCooldown <= 0 ? 'جاهز' : `${this.player.dashCooldown.toFixed(1)} ث`; ctx.fillText(`الاندفاع: ${dash}`, 344, 83);
    if (this.stack('magnetic-recall') > 0 && !ready) ctx.fillText(this.bullet.recallCooldown <= 0 ? 'Q للاستدعاء' : `الاستدعاء ${this.bullet.recallCooldown.toFixed(1)} ث`, 344, 105);
    if (this.combo > 1 && this.comboTimer > 0) { ctx.textAlign = 'center'; ctx.fillStyle = COLORS.bullet; ctx.font = `900 31px ${FONT}`; ctx.fillText(`كومبو ×${this.combo}`, WIDTH / 2, 53); }
    if (this.boss) this.drawBossHealthBar();
    if (this.enemies.length === 0 && !ready && !this.boss) { ctx.textAlign = 'center'; ctx.fillStyle = COLORS.bullet; ctx.font = `800 20px ${FONT}`; ctx.fillText('الساحة آمنة — استعد طلقتك للمتابعة', WIDTH / 2, HEIGHT - 28); }
    ctx.direction = 'ltr'; ctx.textAlign = 'left';
  }

  drawBossHealthBar() {
    const boss = this.boss; const ctx = this.ctx; const width = 520; const x = WIDTH / 2 - width / 2; const y = 74;
    ctx.fillStyle = 'rgba(4,5,12,.84)'; roundRect(ctx, x, y, width, 38, 12); ctx.fill(); ctx.fillStyle = COLORS.boss; roundRect(ctx, x + 5, y + 5, (width - 10) * boss.hp / boss.maxHp, 28, 9); ctx.fill();
    ctx.textAlign = 'center'; ctx.direction = 'rtl'; ctx.fillStyle = COLORS.text; ctx.font = `700 16px ${FONT}`; ctx.fillText(`حارس النواة — المرحلة ${boss.phase}`, WIDTH / 2, y + 25); ctx.direction = 'ltr';
  }

  drawMenu() {
    const ctx = this.ctx; const pulse = 1 + Math.sin(this.elapsed * 2.2) * 0.018; ctx.save(); ctx.translate(WIDTH / 2, 180); ctx.scale(pulse, pulse); ctx.textAlign = 'center'; ctx.direction = 'rtl'; ctx.shadowColor = COLORS.player; ctx.shadowBlur = 24; ctx.fillStyle = COLORS.text; ctx.font = `900 70px ${FONT}`; ctx.fillText('حلبة الطلقة', 0, 0); ctx.shadowColor = COLORS.bullet; ctx.fillStyle = COLORS.bullet; ctx.fillText('الواحدة', 0, 74); ctx.restore();
    ctx.textAlign = 'center'; ctx.direction = 'rtl'; ctx.fillStyle = COLORS.muted; ctx.font = `500 22px ${FONT}`; ctx.fillText('طلقة واحدة. زوايا لا تنتهي. استعدها قبل أن يحاصرك الجميع.', WIDTH / 2, 300);
    this.drawButton('ابدأ اللعب', WIDTH / 2 - UI.buttonWidth / 2, 354, UI.buttonWidth, UI.buttonHeight, () => this.startRun(), true);
    this.drawButton('طريقة اللعب', WIDTH / 2 - UI.buttonWidth / 2, 426, UI.buttonWidth, UI.buttonHeight, () => { this.audio.play('click'); this.state = 'howto'; });
    this.drawButton('الإعدادات', WIDTH / 2 - UI.buttonWidth / 2, 498, UI.buttonWidth, UI.buttonHeight, () => this.openSettings('menu'));
    ctx.fillStyle = COLORS.muted; ctx.font = `500 16px ${FONT}`; ctx.fillText(`أعلى نتيجة: ${this.highScore.toLocaleString('ar-EG')}   •   أفضل موجة: ${this.highWave.toLocaleString('ar-EG')}`, WIDTH / 2, 610);
    ctx.fillStyle = 'rgba(146,155,191,.65)'; ctx.font = `500 14px ${FONT}`; ctx.fillText(`الإصدار ${GAME_VERSION}`, WIDTH / 2, 646); ctx.direction = 'ltr';
  }

  drawHowTo() {
    const ctx = this.ctx; this.drawDimmer(0.36); panel(ctx, 205, 74, 870, 570, COLORS.player); ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.fillStyle = COLORS.text; ctx.font = `900 44px ${FONT}`; ctx.fillText('كيف تنجو بطلقة واحدة؟', WIDTH / 2, 132);
    const rows = [
      ['الحركة', 'WASD أو الأسهم — وعلى الهاتف اسحب عصا الحركة اليسرى.'], ['التصويب والإطلاق', 'حرّك الماوس واضغط لإطلاق طلقتك الوحيدة.'],
      ['الاستعادة', 'المس الطلقة بعد إطلاقها حتى تتمكن من إطلاقها من جديد.'], ['الاندفاع', 'Space أو Shift لتفادي الضربات والعبور من الخطر.'],
      ['الارتداد', 'استخدم الجدران والعوائق لضرب الأعداء من زوايا مستحيلة.'], ['الترقيات', 'بعد كل موجة اختر قوة واحدة تغيّر أسلوب الجولة.'],
      ['حارس النواة', 'في مرحلته الأولى لا يتضرر إلا بعد ارتداد الطلقة.'],
    ];
    let y = 184;
    for (const [title, text] of rows) { ctx.textAlign = 'right'; ctx.fillStyle = COLORS.bullet; ctx.font = `800 19px ${FONT}`; ctx.fillText(title, 1015, y); ctx.fillStyle = COLORS.muted; ctx.font = `500 17px ${FONT}`; ctx.fillText(text, 1015, y + 28); y += 60; }
    this.drawButton('العودة', WIDTH / 2 - 130, 568, 260, 52, () => { this.audio.play('click'); this.state = 'menu'; }, true); ctx.direction = 'ltr';
  }

  openSettings(returnState) { this.audio.play('click'); this.settingsReturnState = returnState; this.state = 'settings'; this.audio.setScene('menu'); }

  drawSettings() {
    const ctx = this.ctx; this.drawDimmer(0.42); panel(ctx, 315, 105, 650, 510, COLORS.electric); ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.fillStyle = COLORS.text; ctx.font = `900 46px ${FONT}`; ctx.fillText('الإعدادات', WIDTH / 2, 165);
    this.drawVolumeControl('الموسيقى', this.audio.settings.music, 225, (value) => this.audio.setMusic(value));
    this.drawVolumeControl('المؤثرات الصوتية', this.audio.settings.sfx, 320, (value) => { this.audio.setSfx(value); this.audio.play('click'); });
    this.drawButton(this.audio.settings.muted ? 'الصوت مكتوم' : 'الصوت يعمل', WIDTH / 2 - 160, 420, 320, 55, () => { this.audio.toggleMute(); this.audio.play('click'); }, !this.audio.settings.muted);
    this.drawButton('حفظ والعودة', WIDTH / 2 - 160, 515, 320, 55, () => { this.audio.play('click'); this.state = this.settingsReturnState; if (this.state === 'playing') this.audio.setScene(this.boss ? 'boss' : 'combat'); }, true); ctx.direction = 'ltr';
  }

  drawVolumeControl(label, value, y, setter) {
    const ctx = this.ctx; ctx.textAlign = 'right'; ctx.direction = 'rtl'; ctx.fillStyle = COLORS.text; ctx.font = `700 22px ${FONT}`; ctx.fillText(label, 865, y); ctx.fillStyle = COLORS.muted; ctx.font = `600 17px ${FONT}`; ctx.fillText(`${Math.round(value * 100)}٪`, 430, y);
    const x = 430; const barY = y + 18; const width = 435; ctx.fillStyle = '#252b42'; roundRect(ctx, x, barY, width, 18, 9); ctx.fill(); ctx.fillStyle = COLORS.electric; roundRect(ctx, x, barY, width * value, 18, 9); ctx.fill();
    for (let index = 0; index <= 10; index += 1) this.addUiRegion(x + index / 11 * width, barY - 14, width / 11, 46, () => setter(index / 10));
  }

  drawPauseMenu() {
    const ctx = this.ctx; this.drawDimmer(0.72); ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.fillStyle = COLORS.text; ctx.font = `900 58px ${FONT}`; ctx.fillText('اللعبة متوقفة', WIDTH / 2, 185); ctx.fillStyle = COLORS.muted; ctx.font = `500 19px ${FONT}`; ctx.fillText('خذ نفسًا... الطلقة لن تتحرك من مكانها.', WIDTH / 2, 225);
    this.drawButton('متابعة', WIDTH / 2 - 165, 282, 330, 56, () => { this.audio.play('click'); this.resumeGame(); }, true);
    this.drawButton('الإعدادات', WIDTH / 2 - 165, 350, 330, 56, () => this.openSettings('paused'));
    this.drawButton('إعادة الجولة', WIDTH / 2 - 165, 418, 330, 56, () => this.startRun());
    this.drawButton('القائمة الرئيسية', WIDTH / 2 - 165, 486, 330, 56, () => { this.audio.play('click'); this.goToMenu(); }); ctx.direction = 'ltr';
  }

  drawUpgradeSelection() {
    const ctx = this.ctx; this.drawDimmer(0.82); ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.fillStyle = COLORS.bullet; ctx.font = `900 43px ${FONT}`; ctx.fillText('اختر تطويرًا واحدًا', WIDTH / 2, 105); ctx.fillStyle = COLORS.muted; ctx.font = `500 18px ${FONT}`; ctx.fillText(this.pendingStage === 'boss' ? 'اختيارك الأخير قبل حارس النواة' : 'كل اختيار يغيّر مسار الجولة', WIDTH / 2, 138);
    const total = this.upgradeChoices.length * UI.cardWidth + (this.upgradeChoices.length - 1) * 28; const start = WIDTH / 2 - total / 2;
    this.upgradeChoices.forEach((upgrade, index) => this.drawUpgradeCard(upgrade, index, start + index * (UI.cardWidth + 28), 185)); ctx.direction = 'ltr';
  }

  drawUpgradeCard(upgrade, index, x, y) {
    const ctx = this.ctx; const hovered = pointInRect(this.pointer, { x, y, w: UI.cardWidth, h: UI.cardHeight }); ctx.save(); ctx.shadowColor = hovered ? COLORS.bullet : 'rgba(0,0,0,.5)'; ctx.shadowBlur = hovered ? 25 : 12; ctx.fillStyle = hovered ? '#1b2139' : COLORS.panel; ctx.strokeStyle = hovered ? COLORS.bullet : COLORS.border; ctx.lineWidth = hovered ? 4 : 2; roundRect(ctx, x, y, UI.cardWidth, UI.cardHeight, 18); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.fillStyle = COLORS.bullet; ctx.font = `800 15px ${FONT}`; ctx.fillText(`${index + 1}  •  ${upgrade.tag}`, x + UI.cardWidth - 24, y + 40); ctx.fillStyle = COLORS.text; ctx.font = `900 28px ${FONT}`; wrapText(ctx, upgrade.name, x + UI.cardWidth - 24, y + 92, UI.cardWidth - 48, 35); ctx.fillStyle = COLORS.muted; ctx.font = `500 18px ${FONT}`; wrapText(ctx, upgrade.description, x + UI.cardWidth - 24, y + 157, UI.cardWidth - 48, 30);
    const current = this.stack(upgrade.id); ctx.fillStyle = current > 0 ? COLORS.electric : 'rgba(146,155,191,.55)'; ctx.font = `600 15px ${FONT}`; ctx.fillText(`المستوى الحالي: ${current} / ${upgrade.maxStacks}`, x + UI.cardWidth - 24, y + UI.cardHeight - 26); this.addUiRegion(x, y, UI.cardWidth, UI.cardHeight, () => this.chooseUpgrade(index));
  }

  drawBossIntro() {
    const ctx = this.ctx; this.drawDimmer(0.45); ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.fillStyle = COLORS.boss; ctx.shadowColor = COLORS.boss; ctx.shadowBlur = 28; ctx.font = `900 74px ${FONT}`; ctx.fillText('حارس النواة', WIDTH / 2, 280); ctx.shadowBlur = 0; ctx.fillStyle = COLORS.text; ctx.font = `700 24px ${FONT}`; ctx.fillText('المرحلة الأخيرة', WIDTH / 2, 328); ctx.fillStyle = COLORS.electric; ctx.font = `500 18px ${FONT}`; ctx.fillText('تذكّر: درعه الأول لا ينكسر إلا بطلقة مرتدة', WIDTH / 2, 378); ctx.direction = 'ltr';
  }

  drawBanner() {
    const ctx = this.ctx; const alpha = clamp(Math.min(1, this.banner.time * 2), 0, 1); ctx.globalAlpha = alpha; ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.fillStyle = COLORS.text; ctx.font = `900 43px ${FONT}`; ctx.fillText(this.banner.title, WIDTH / 2, HEIGHT / 2 - 25); ctx.fillStyle = COLORS.bullet; ctx.font = `600 19px ${FONT}`; ctx.fillText(this.banner.subtitle, WIDTH / 2, HEIGHT / 2 + 18); ctx.globalAlpha = 1; ctx.direction = 'ltr';
  }

  drawResult(victory) {
    const ctx = this.ctx; this.drawDimmer(0.84); ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.fillStyle = victory ? COLORS.success : COLORS.danger; ctx.font = `900 61px ${FONT}`; ctx.fillText(victory ? 'تم إسقاط حارس النواة' : 'انتهت الجولة', WIDTH / 2, 170); ctx.fillStyle = COLORS.text; ctx.font = `700 22px ${FONT}`; ctx.fillText(victory ? 'أتقنت الطلقة الوحيدة.' : `وصلت إلى الموجة ${this.wave}`, WIDTH / 2, 212);
    panel(ctx, 330, 248, 620, 238, victory ? COLORS.success : COLORS.danger);
    const stats = [['النقاط', this.score.toLocaleString('ar-EG')], ['الوقت', `${this.runTime.toFixed(1)} ث`], ['الإطلاقات', this.stats.shots.toLocaleString('ar-EG')], ['الإصابات', this.stats.hits.toLocaleString('ar-EG')], ['الارتدادات', this.stats.ricochets.toLocaleString('ar-EG')], ['الأعداء', this.stats.kills.toLocaleString('ar-EG')]];
    stats.forEach(([label, value], index) => { const column = index % 2; const row = Math.floor(index / 2); const x = column === 0 ? 610 : 900; const y = 292 + row * 64; ctx.textAlign = 'right'; ctx.fillStyle = COLORS.muted; ctx.font = `500 16px ${FONT}`; ctx.fillText(label, x, y); ctx.fillStyle = COLORS.text; ctx.font = `800 24px ${FONT}`; ctx.fillText(value, x, y + 27); });
    this.drawButton('العب من جديد', WIDTH / 2 - 330, 530, 300, 58, () => this.startRun(), true);
    this.drawButton('القائمة الرئيسية', WIDTH / 2 + 30, 530, 300, 58, () => { this.audio.play('click'); this.goToMenu(); }); ctx.fillStyle = COLORS.muted; ctx.font = `500 15px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(`أعلى نتيجة: ${this.highScore.toLocaleString('ar-EG')}`, WIDTH / 2, 630); ctx.direction = 'ltr';
  }

  drawTouchControls() {
    const ctx = this.ctx; const origin = this.touchMove || { originX: 105, originY: HEIGHT - 105, x: 105, y: HEIGHT - 105 }; ctx.globalAlpha = 0.35; ctx.strokeStyle = COLORS.player; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(origin.originX, origin.originY, 58, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = COLORS.player; ctx.beginPath(); ctx.arc(clamp(origin.x, origin.originX - 48, origin.originX + 48), clamp(origin.y, origin.originY - 48, origin.originY + 48), 22, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = COLORS.bullet; ctx.beginPath(); ctx.arc(WIDTH - 105, HEIGHT - 105, 58, 0, Math.PI * 2); ctx.stroke(); ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.fillStyle = COLORS.bullet; ctx.font = `700 17px ${FONT}`; ctx.fillText('اندفاع', WIDTH - 105, HEIGHT - 99); ctx.direction = 'ltr'; ctx.globalAlpha = 1;
  }

  drawDimmer(alpha) { this.ctx.fillStyle = `rgba(2,3,9,${alpha})`; this.ctx.fillRect(0, 0, WIDTH, HEIGHT); }

  drawButton(label, x, y, w, h, action, primary = false) {
    const ctx = this.ctx; const hovered = pointInRect(this.pointer, { x, y, w, h }); ctx.save(); ctx.shadowColor = primary ? COLORS.player : COLORS.border; ctx.shadowBlur = hovered ? 22 : 8; ctx.fillStyle = primary ? (hovered ? '#2a6375' : '#174653') : (hovered ? COLORS.panelStrong : COLORS.panel); ctx.strokeStyle = primary ? COLORS.player : hovered ? COLORS.bullet : COLORS.border; ctx.lineWidth = hovered ? 3 : 2; roundRect(ctx, x, y, w, h, 14); ctx.fill(); ctx.stroke(); ctx.restore(); ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.fillStyle = primary ? COLORS.text : hovered ? COLORS.bullet : COLORS.text; ctx.font = `800 20px ${FONT}`; ctx.fillText(label, x + w / 2, y + h / 2 + 8); this.addUiRegion(x, y, w, h, action);
  }

  addUiRegion(x, y, w, h, action) { this.uiRegions.push({ x, y, w, h, action }); }
  handleUiClick(x, y) { for (let index = this.uiRegions.length - 1; index >= 0; index -= 1) { const region = this.uiRegions[index]; if (x >= region.x && x <= region.x + region.w && y >= region.y && y <= region.y + region.h) { region.action(); return true; } } return false; }
}

function formatDamage(value) { return Number.isInteger(value) ? String(value) : value.toFixed(1); }
function pointInRect(point, rect) { return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h; }
function circleRectOverlap(circle, rect) { const x = clamp(circle.x, rect.x, rect.x + rect.w); const y = clamp(circle.y, rect.y, rect.y + rect.h); return (circle.x - x) ** 2 + (circle.y - y) ** 2 <= circle.radius ** 2; }

function resolveCircleRect(circle, rect) {
  if (!circleRectOverlap(circle, rect)) return false;
  const x = clamp(circle.x, rect.x, rect.x + rect.w); const y = clamp(circle.y, rect.y, rect.y + rect.h); let dx = circle.x - x; let dy = circle.y - y;
  if (dx === 0 && dy === 0) {
    const options = [
      { axis: 'x', direction: -1, value: Math.abs(circle.x - rect.x) }, { axis: 'x', direction: 1, value: Math.abs(rect.x + rect.w - circle.x) },
      { axis: 'y', direction: -1, value: Math.abs(circle.y - rect.y) }, { axis: 'y', direction: 1, value: Math.abs(rect.y + rect.h - circle.y) },
    ].sort((a, b) => a.value - b.value);
    const nearest = options[0]; if (nearest.axis === 'x') circle.x += nearest.direction * (circle.radius + nearest.value); else circle.y += nearest.direction * (circle.radius + nearest.value); return true;
  }
  const distance = Math.hypot(dx, dy) || 1; const overlap = circle.radius - distance; dx /= distance; dy /= distance; circle.x += dx * overlap; circle.y += dy * overlap; return true;
}

function roundRect(ctx, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function panel(ctx, x, y, w, h, stroke = COLORS.border) { ctx.save(); ctx.fillStyle = 'rgba(7,9,20,.88)'; ctx.strokeStyle = stroke; ctx.lineWidth = 2; roundRect(ctx, x, y, w, h, 14); ctx.fill(); ctx.stroke(); ctx.restore(); }
function polygon(ctx, sides, radius, rotation = 0) { ctx.beginPath(); for (let point = 0; point < sides; point += 1) { const angle = rotation + point / sides * Math.PI * 2; const x = Math.cos(angle) * radius; const y = Math.sin(angle) * radius; if (point === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.closePath(); ctx.fill(); }

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' '); const lines = []; let line = '';
  for (const word of words) { const test = line ? `${line} ${word}` : word; if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; } else line = test; }
  if (line) lines.push(line); ctx.textAlign = 'right'; lines.forEach((item, index) => ctx.fillText(item, x, y + index * lineHeight));
}
