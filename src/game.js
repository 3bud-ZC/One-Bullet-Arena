import {
  clamp,
  circlesOverlap,
  distanceSquared,
  normalize,
  randomPointOutsideRadius,
} from './math.js';

const WIDTH = 1280;
const HEIGHT = 720;
const PLAYER_SPEED = 285;
const DASH_SPEED = 760;
const BULLET_SPEED = 920;
const TOTAL_WAVES = 5;

const COLORS = {
  background: '#070912',
  panel: '#111526',
  grid: 'rgba(106, 119, 255, 0.07)',
  border: '#2b3154',
  player: '#66f4ff',
  playerGlow: 'rgba(102, 244, 255, 0.35)',
  bullet: '#ffe66d',
  bulletGlow: 'rgba(255, 230, 109, 0.38)',
  scout: '#ff5f78',
  brute: '#ff9f43',
  sniper: '#b983ff',
  enemyShot: '#ffcad4',
  text: '#f6f7ff',
  muted: '#8e96b8',
  success: '#65f59a',
  danger: '#ff526a',
};

const ENEMY_TYPES = {
  scout: { radius: 17, speed: 132, hp: 1, score: 100 },
  brute: { radius: 27, speed: 74, hp: 2, score: 240 },
  sniper: { radius: 20, speed: 58, hp: 1, score: 180 },
};

export class OneBulletArena {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;

    this.keys = new Set();
    this.pointer = { x: WIDTH / 2, y: HEIGHT / 2, down: false };
    this.state = 'menu';
    this.lastTime = 0;
    this.elapsed = 0;
    this.highScore = Number(localStorage.getItem('one-bullet-arena-high-score') || 0);
    this.highWave = Number(localStorage.getItem('one-bullet-arena-high-wave') || 0);
    this.particles = [];
    this.shake = 0;
    this.flash = 0;
    this.nextEnemyId = 1;

    this.bindInput();
    this.resetRun();
    requestAnimationFrame((time) => this.loop(time));
  }

  bindInput() {
    window.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      this.keys.add(key);

      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        event.preventDefault();
      }

      if (key === 'p' && this.state === 'playing') this.state = 'paused';
      else if (key === 'p' && this.state === 'paused') this.state = 'playing';

      if ((key === 'enter' || key === 'r') && ['gameover', 'victory'].includes(this.state)) {
        this.startRun();
      }

      if ((key === 'enter' || key === ' ') && this.state === 'menu') this.startRun();
    });

    window.addEventListener('keyup', (event) => this.keys.delete(event.key.toLowerCase()));

    const updatePointer = (event) => {
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rect.left) / rect.width) * WIDTH;
      this.pointer.y = ((event.clientY - rect.top) / rect.height) * HEIGHT;
    };

    this.canvas.addEventListener('pointermove', updatePointer);
    this.canvas.addEventListener('pointerdown', (event) => {
      updatePointer(event);
      this.pointer.down = true;

      if (this.state === 'menu') this.startRun();
      else if (['gameover', 'victory'].includes(this.state)) this.startRun();
      else if (this.state === 'playing') this.fireBullet();
    });
    window.addEventListener('pointerup', () => {
      this.pointer.down = false;
    });

    window.addEventListener('blur', () => {
      this.keys.clear();
      if (this.state === 'playing') this.state = 'paused';
    });
  }

  resetRun() {
    this.player = {
      x: WIDTH / 2,
      y: HEIGHT / 2,
      radius: 18,
      health: 3,
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
      recoverDelay: 0,
      bouncesRemaining: 4,
      hitEnemyIds: new Set(),
      trail: [],
    };

    this.enemies = [];
    this.enemyShots = [];
    this.wave = 0;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.waveDelay = 0.8;
    this.runTime = 0;
    this.particles = [];
  }

  startRun() {
    this.resetRun();
    this.state = 'playing';
    this.spawnNextWave();
  }

  spawnNextWave() {
    this.wave += 1;
    this.highWave = Math.max(this.highWave, this.wave);
    localStorage.setItem('one-bullet-arena-high-wave', String(this.highWave));

    const composition = [];
    const scoutCount = 2 + this.wave;
    for (let index = 0; index < scoutCount; index += 1) composition.push('scout');
    if (this.wave >= 2) composition.push('brute');
    if (this.wave >= 3) composition.push('sniper');
    if (this.wave >= 4) composition.push('brute');
    if (this.wave === TOTAL_WAVES) composition.push('sniper', 'brute');

    composition.forEach((type) => this.spawnEnemy(type));
    this.createBurst(this.player.x, this.player.y, COLORS.player, 18, 250);
  }

  spawnEnemy(type) {
    const template = ENEMY_TYPES[type];
    const point = randomPointOutsideRadius(WIDTH, HEIGHT, this.player, 250, 70);
    this.enemies.push({
      id: this.nextEnemyId++,
      type,
      x: point.x,
      y: point.y,
      radius: template.radius,
      speed: template.speed,
      hp: template.hp,
      maxHp: template.hp,
      score: template.score,
      shootCooldown: 0.65 + Math.random() * 0.8,
      phase: Math.random() * Math.PI * 2,
    });
  }

  fireBullet() {
    if (!this.bullet.held) return;

    const direction = normalize(this.pointer.x - this.player.x, this.pointer.y - this.player.y);
    if (direction.x === 0 && direction.y === 0) return;

    this.bullet.held = false;
    this.bullet.x = this.player.x + direction.x * 28;
    this.bullet.y = this.player.y + direction.y * 28;
    this.bullet.vx = direction.x * BULLET_SPEED;
    this.bullet.vy = direction.y * BULLET_SPEED;
    this.bullet.recoverDelay = 0.24;
    this.bullet.bouncesRemaining = 4;
    this.bullet.hitEnemyIds.clear();
    this.bullet.trail = [];
    this.createBurst(this.bullet.x, this.bullet.y, COLORS.bullet, 8, 140);
    this.shake = 5;
  }

  tryDash() {
    if (this.player.dashCooldown > 0 || this.player.dashRemaining > 0) return;
    if (!this.keys.has(' ') && !this.keys.has('shift')) return;

    const movement = this.getMovementDirection();
    const fallback = normalize(this.pointer.x - this.player.x, this.pointer.y - this.player.y);
    const direction = movement.x === 0 && movement.y === 0 ? fallback : movement;
    if (direction.x === 0 && direction.y === 0) return;

    this.player.dashDirection = direction;
    this.player.dashRemaining = 0.15;
    this.player.dashCooldown = 1.15;
    this.player.invulnerability = Math.max(this.player.invulnerability, 0.18);
    this.createBurst(this.player.x, this.player.y, COLORS.player, 10, 180);
  }

  getMovementDirection() {
    const horizontal = Number(this.keys.has('d') || this.keys.has('arrowright'))
      - Number(this.keys.has('a') || this.keys.has('arrowleft'));
    const vertical = Number(this.keys.has('s') || this.keys.has('arrowdown'))
      - Number(this.keys.has('w') || this.keys.has('arrowup'));
    return normalize(horizontal, vertical);
  }

  update(dt) {
    this.elapsed += dt;
    this.runTime += dt;
    this.flash = Math.max(0, this.flash - dt * 3.4);
    this.shake = Math.max(0, this.shake - dt * 20);
    this.player.invulnerability = Math.max(0, this.player.invulnerability - dt);
    this.player.dashCooldown = Math.max(0, this.player.dashCooldown - dt);
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (this.comboTimer === 0) this.combo = 0;

    this.tryDash();
    this.updatePlayer(dt);
    this.updateBullet(dt);
    this.updateEnemies(dt);
    this.updateEnemyShots(dt);
    this.updateParticles(dt);

    if (this.enemies.length === 0 && this.state === 'playing') {
      this.waveDelay -= dt;
      if (this.waveDelay <= 0 && this.bullet.held) {
        if (this.wave >= TOTAL_WAVES) this.finishRun(true);
        else {
          this.waveDelay = 1.1;
          this.spawnNextWave();
        }
      }
    } else {
      this.waveDelay = 1.1;
    }
  }

  updatePlayer(dt) {
    let direction = this.getMovementDirection();
    let speed = PLAYER_SPEED;

    if (this.player.dashRemaining > 0) {
      this.player.dashRemaining -= dt;
      direction = this.player.dashDirection;
      speed = DASH_SPEED;
      if (Math.random() > 0.35) this.createParticle(this.player.x, this.player.y, COLORS.player, 55);
    }

    this.player.x = clamp(this.player.x + direction.x * speed * dt, 38, WIDTH - 38);
    this.player.y = clamp(this.player.y + direction.y * speed * dt, 38, HEIGHT - 38);
  }

  updateBullet(dt) {
    if (this.bullet.held) {
      const aim = normalize(this.pointer.x - this.player.x, this.pointer.y - this.player.y);
      this.bullet.x = this.player.x + aim.x * 28;
      this.bullet.y = this.player.y + aim.y * 28;
      this.bullet.trail = [];
      return;
    }

    this.bullet.recoverDelay = Math.max(0, this.bullet.recoverDelay - dt);
    this.bullet.trail.unshift({ x: this.bullet.x, y: this.bullet.y });
    this.bullet.trail.length = Math.min(this.bullet.trail.length, 14);

    this.bullet.x += this.bullet.vx * dt;
    this.bullet.y += this.bullet.vy * dt;

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

    if (bounced) {
      this.bullet.bouncesRemaining -= 1;
      this.shake = Math.max(this.shake, 3);
      this.createBurst(this.bullet.x, this.bullet.y, COLORS.bullet, 5, 100);
      if (this.bullet.bouncesRemaining <= 0) {
        this.bullet.vx *= 0.18;
        this.bullet.vy *= 0.18;
      }
    }

    if (Math.hypot(this.bullet.vx, this.bullet.vy) < 85) {
      this.bullet.vx *= Math.max(0, 1 - dt * 4);
      this.bullet.vy *= Math.max(0, 1 - dt * 4);
    }

    for (const enemy of [...this.enemies]) {
      if (!this.bullet.hitEnemyIds.has(enemy.id) && circlesOverlap(this.bullet, enemy)) {
        this.bullet.hitEnemyIds.add(enemy.id);
        enemy.hp -= 1;
        this.bullet.vx *= 0.9;
        this.bullet.vy *= 0.9;
        this.shake = 8;
        this.createBurst(enemy.x, enemy.y, this.enemyColor(enemy.type), 12, 240);

        if (enemy.hp <= 0) this.killEnemy(enemy);
      }
    }

    if (this.bullet.recoverDelay === 0 && circlesOverlap(this.bullet, this.player, 8)) {
      this.bullet.held = true;
      this.bullet.vx = 0;
      this.bullet.vy = 0;
      this.bullet.trail = [];
      this.createBurst(this.player.x, this.player.y, COLORS.bullet, 12, 160);
    }
  }

  updateEnemies(dt) {
    for (const enemy of this.enemies) {
      enemy.phase += dt * 2;
      const toPlayer = normalize(this.player.x - enemy.x, this.player.y - enemy.y);

      if (enemy.type === 'sniper') {
        const distance = Math.sqrt(distanceSquared(enemy, this.player));
        const desired = distance < 280 ? -1 : distance > 440 ? 1 : 0;
        const strafe = { x: -toPlayer.y, y: toPlayer.x };
        enemy.x += (toPlayer.x * desired + strafe.x * Math.sin(enemy.phase) * 0.45) * enemy.speed * dt;
        enemy.y += (toPlayer.y * desired + strafe.y * Math.sin(enemy.phase) * 0.45) * enemy.speed * dt;
        enemy.shootCooldown -= dt;
        if (enemy.shootCooldown <= 0) {
          this.fireEnemyShot(enemy, toPlayer);
          enemy.shootCooldown = Math.max(0.8, 1.65 - this.wave * 0.08);
        }
      } else {
        const orbit = enemy.type === 'scout' ? Math.sin(enemy.phase) * 0.2 : 0;
        enemy.x += (toPlayer.x - toPlayer.y * orbit) * enemy.speed * dt;
        enemy.y += (toPlayer.y + toPlayer.x * orbit) * enemy.speed * dt;
      }

      enemy.x = clamp(enemy.x, enemy.radius, WIDTH - enemy.radius);
      enemy.y = clamp(enemy.y, enemy.radius, HEIGHT - enemy.radius);

      if (circlesOverlap(enemy, this.player, -2)) this.damagePlayer(enemy.x, enemy.y);
    }
  }

  fireEnemyShot(enemy, direction) {
    this.enemyShots.push({
      x: enemy.x,
      y: enemy.y,
      vx: direction.x * 360,
      vy: direction.y * 360,
      radius: 7,
      life: 3.2,
    });
    this.createBurst(enemy.x, enemy.y, COLORS.sniper, 5, 90);
  }

  updateEnemyShots(dt) {
    for (const shot of this.enemyShots) {
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      shot.life -= dt;

      if (circlesOverlap(shot, this.player)) {
        shot.life = 0;
        this.damagePlayer(shot.x, shot.y);
      }
    }

    this.enemyShots = this.enemyShots.filter((shot) => (
      shot.life > 0 && shot.x > -20 && shot.x < WIDTH + 20 && shot.y > -20 && shot.y < HEIGHT + 20
    ));
  }

  damagePlayer(sourceX, sourceY) {
    if (this.player.invulnerability > 0 || this.player.dashRemaining > 0) return;

    this.player.health -= 1;
    this.player.invulnerability = 1.05;
    this.flash = 1;
    this.shake = 14;
    this.combo = 0;
    this.createBurst(this.player.x, this.player.y, COLORS.danger, 24, 320);

    const push = normalize(this.player.x - sourceX, this.player.y - sourceY);
    this.player.x = clamp(this.player.x + push.x * 42, 38, WIDTH - 38);
    this.player.y = clamp(this.player.y + push.y * 42, 38, HEIGHT - 38);

    if (this.player.health <= 0) this.finishRun(false);
  }

  killEnemy(enemy) {
    this.enemies = this.enemies.filter((candidate) => candidate.id !== enemy.id);
    this.combo += 1;
    this.comboTimer = 2.2;
    this.score += enemy.score * Math.max(1, this.combo);
    this.highScore = Math.max(this.highScore, this.score);
    localStorage.setItem('one-bullet-arena-high-score', String(this.highScore));
  }

  finishRun(victory) {
    this.state = victory ? 'victory' : 'gameover';
    this.highScore = Math.max(this.highScore, this.score);
    localStorage.setItem('one-bullet-arena-high-score', String(this.highScore));
  }

  enemyColor(type) {
    return COLORS[type] || COLORS.scout;
  }

  createParticle(x, y, color, speed) {
    const angle = Math.random() * Math.PI * 2;
    const magnitude = speed * (0.35 + Math.random() * 0.65);
    this.particles.push({
      x,
      y,
      vx: Math.cos(angle) * magnitude,
      vy: Math.sin(angle) * magnitude,
      life: 0.25 + Math.random() * 0.35,
      maxLife: 0.6,
      size: 2 + Math.random() * 4,
      color,
    });
  }

  createBurst(x, y, color, count, speed) {
    for (let index = 0; index < count; index += 1) this.createParticle(x, y, color, speed);
  }

  updateParticles(dt) {
    for (const particle of this.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.max(0, 1 - dt * 4);
      particle.vy *= Math.max(0, 1 - dt * 4);
      particle.life -= dt;
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  loop(time) {
    const dt = Math.min(0.033, (time - this.lastTime) / 1000 || 0);
    this.lastTime = time;

    if (this.state === 'playing') this.update(dt);
    else this.updateParticles(dt);

    this.draw();
    requestAnimationFrame((nextTime) => this.loop(nextTime));
  }

  draw() {
    const ctx = this.ctx;
    ctx.save();
    const shakeX = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    const shakeY = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    ctx.translate(shakeX, shakeY);

    this.drawArena();

    if (this.state === 'menu') this.drawMenu();
    else {
      this.drawBullet();
      this.drawEnemies();
      this.drawEnemyShots();
      this.drawPlayer();
      this.drawParticles();
      this.drawHud();

      if (this.state === 'paused') this.drawOverlay('PAUSED', 'Press P to return to the arena');
      if (this.state === 'gameover') this.drawResult(false);
      if (this.state === 'victory') this.drawResult(true);
    }

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255, 40, 70, ${this.flash * 0.16})`;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }

    ctx.restore();
  }

  drawArena() {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(-30, -30, WIDTH + 60, HEIGHT + 60);

    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    const gridSize = 48;
    for (let x = 0; x <= WIDTH; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= HEIGHT; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y);
      ctx.stroke();
    }

    const gradient = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 80, WIDTH / 2, HEIGHT / 2, 620);
    gradient.addColorStop(0, 'rgba(40, 61, 130, 0.13)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, WIDTH - 4, HEIGHT - 4);
  }

  drawPlayer() {
    const ctx = this.ctx;
    const flicker = this.player.invulnerability > 0 && Math.floor(this.elapsed * 18) % 2 === 0;
    if (flicker) return;

    ctx.save();
    ctx.shadowColor = COLORS.playerGlow;
    ctx.shadowBlur = 26;
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
    ctx.fill();

    const aim = normalize(this.pointer.x - this.player.x, this.pointer.y - this.player.y);
    ctx.strokeStyle = '#d8fdff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(this.player.x, this.player.y);
    ctx.lineTo(this.player.x + aim.x * 27, this.player.y + aim.y * 27);
    ctx.stroke();
    ctx.restore();
  }

  drawBullet() {
    const ctx = this.ctx;
    for (let index = this.bullet.trail.length - 1; index >= 0; index -= 1) {
      const point = this.bullet.trail[index];
      const alpha = (this.bullet.trail.length - index) / this.bullet.trail.length;
      ctx.fillStyle = `rgba(255, 230, 109, ${alpha * 0.22})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2 + alpha * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.shadowColor = COLORS.bulletGlow;
    ctx.shadowBlur = 25;
    ctx.fillStyle = COLORS.bullet;
    ctx.beginPath();
    ctx.arc(this.bullet.x, this.bullet.y, this.bullet.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (!this.bullet.held) {
      ctx.strokeStyle = 'rgba(255, 230, 109, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.bullet.x, this.bullet.y, 16 + Math.sin(this.elapsed * 9) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawEnemies() {
    const ctx = this.ctx;
    for (const enemy of this.enemies) {
      const color = this.enemyColor(enemy.type);
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.rotate(enemy.phase * 0.35);
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
      ctx.fillStyle = color;

      if (enemy.type === 'scout') {
        ctx.beginPath();
        ctx.moveTo(enemy.radius, 0);
        ctx.lineTo(0, enemy.radius);
        ctx.lineTo(-enemy.radius, 0);
        ctx.lineTo(0, -enemy.radius);
        ctx.closePath();
        ctx.fill();
      } else if (enemy.type === 'brute') {
        ctx.fillRect(-enemy.radius, -enemy.radius, enemy.radius * 2, enemy.radius * 2);
        ctx.fillStyle = COLORS.background;
        ctx.fillRect(-8, -8, 16, 16);
      } else {
        ctx.beginPath();
        for (let point = 0; point < 6; point += 1) {
          const angle = (point / 6) * Math.PI * 2;
          const x = Math.cos(angle) * enemy.radius;
          const y = Math.sin(angle) * enemy.radius;
          if (point === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
      }

      if (enemy.maxHp > 1) {
        ctx.rotate(-enemy.phase * 0.35);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(-enemy.radius, enemy.radius + 8, enemy.radius * 2, 4);
        ctx.fillStyle = COLORS.text;
        ctx.fillRect(-enemy.radius, enemy.radius + 8, enemy.radius * 2 * (enemy.hp / enemy.maxHp), 4);
      }
      ctx.restore();
    }
  }

  drawEnemyShots() {
    const ctx = this.ctx;
    for (const shot of this.enemyShots) {
      ctx.save();
      ctx.shadowColor = COLORS.enemyShot;
      ctx.shadowBlur = 14;
      ctx.fillStyle = COLORS.enemyShot;
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
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
    }
    ctx.globalAlpha = 1;
  }

  drawHud() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(7, 9, 18, 0.78)';
    ctx.fillRect(22, 20, 365, 92);
    ctx.strokeStyle = COLORS.border;
    ctx.strokeRect(22, 20, 365, 92);

    ctx.fillStyle = COLORS.text;
    ctx.font = '700 24px Inter, system-ui, sans-serif';
    ctx.fillText(`WAVE ${this.wave}/${TOTAL_WAVES}`, 42, 54);
    ctx.font = '600 18px Inter, system-ui, sans-serif';
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(`SCORE  ${this.score.toLocaleString()}`, 42, 86);

    for (let index = 0; index < 3; index += 1) {
      ctx.fillStyle = index < this.player.health ? COLORS.danger : '#242a40';
      ctx.beginPath();
      ctx.arc(280 + index * 31, 67, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    const ready = this.bullet.held;
    ctx.fillStyle = 'rgba(7, 9, 18, 0.78)';
    ctx.fillRect(WIDTH - 320, 20, 298, 92);
    ctx.strokeStyle = ready ? COLORS.bullet : COLORS.border;
    ctx.strokeRect(WIDTH - 320, 20, 298, 92);
    ctx.fillStyle = ready ? COLORS.bullet : COLORS.muted;
    ctx.font = '800 21px Inter, system-ui, sans-serif';
    ctx.fillText(ready ? 'BULLET READY' : 'RECOVER THE BULLET', WIDTH - 298, 56);
    ctx.font = '500 15px Inter, system-ui, sans-serif';
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(`DASH ${this.player.dashCooldown <= 0 ? 'READY' : this.player.dashCooldown.toFixed(1) + 's'}`, WIDTH - 298, 86);

    if (this.combo > 1 && this.comboTimer > 0) {
      ctx.textAlign = 'center';
      ctx.fillStyle = COLORS.bullet;
      ctx.font = '900 30px Inter, system-ui, sans-serif';
      ctx.fillText(`×${this.combo} COMBO`, WIDTH / 2, 54);
      ctx.textAlign = 'left';
    }

    if (this.enemies.length === 0 && !this.bullet.held) {
      ctx.textAlign = 'center';
      ctx.fillStyle = COLORS.bullet;
      ctx.font = '800 20px Inter, system-ui, sans-serif';
      ctx.fillText('Arena clear — recover your bullet', WIDTH / 2, HEIGHT - 32);
      ctx.textAlign = 'left';
    }
  }

  drawMenu() {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.text;
    ctx.font = '900 74px Inter, system-ui, sans-serif';
    ctx.fillText('ONE BULLET', WIDTH / 2, 205);
    ctx.fillStyle = COLORS.bullet;
    ctx.fillText('ARENA', WIDTH / 2, 280);

    ctx.fillStyle = COLORS.muted;
    ctx.font = '500 23px Inter, system-ui, sans-serif';
    ctx.fillText('Fire once. Read the ricochet. Recover your only shot.', WIDTH / 2, 332);

    ctx.fillStyle = COLORS.panel;
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 2;
    ctx.fillRect(WIDTH / 2 - 280, 378, 560, 145);
    ctx.strokeRect(WIDTH / 2 - 280, 378, 560, 145);

    ctx.fillStyle = COLORS.text;
    ctx.font = '700 18px Inter, system-ui, sans-serif';
    ctx.fillText('WASD / ARROWS — MOVE', WIDTH / 2, 416);
    ctx.fillText('MOUSE — AIM & FIRE', WIDTH / 2, 451);
    ctx.fillText('SPACE / SHIFT — DASH     P — PAUSE', WIDTH / 2, 486);

    ctx.fillStyle = COLORS.player;
    ctx.font = '800 22px Inter, system-ui, sans-serif';
    ctx.fillText('CLICK OR PRESS ENTER TO START', WIDTH / 2, 584);

    ctx.fillStyle = COLORS.muted;
    ctx.font = '500 16px Inter, system-ui, sans-serif';
    ctx.fillText(`High score: ${this.highScore.toLocaleString()}   •   Best wave: ${this.highWave}`, WIDTH / 2, 626);
    ctx.textAlign = 'left';
  }

  drawOverlay(title, subtitle) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(3, 4, 10, 0.76)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.text;
    ctx.font = '900 64px Inter, system-ui, sans-serif';
    ctx.fillText(title, WIDTH / 2, HEIGHT / 2 - 18);
    ctx.fillStyle = COLORS.muted;
    ctx.font = '500 21px Inter, system-ui, sans-serif';
    ctx.fillText(subtitle, WIDTH / 2, HEIGHT / 2 + 35);
    ctx.textAlign = 'left';
  }

  drawResult(victory) {
    const title = victory ? 'ARENA CONQUERED' : 'RUN TERMINATED';
    const subtitle = victory
      ? `Five waves cleared in ${this.runTime.toFixed(1)} seconds`
      : `You reached wave ${this.wave} with ${this.score.toLocaleString()} points`;

    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(3, 4, 10, 0.82)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.textAlign = 'center';
    ctx.fillStyle = victory ? COLORS.success : COLORS.danger;
    ctx.font = '900 60px Inter, system-ui, sans-serif';
    ctx.fillText(title, WIDTH / 2, 280);
    ctx.fillStyle = COLORS.text;
    ctx.font = '600 22px Inter, system-ui, sans-serif';
    ctx.fillText(subtitle, WIDTH / 2, 330);
    ctx.fillStyle = COLORS.bullet;
    ctx.font = '800 22px Inter, system-ui, sans-serif';
    ctx.fillText('CLICK OR PRESS R TO RUN AGAIN', WIDTH / 2, 414);
    ctx.fillStyle = COLORS.muted;
    ctx.font = '500 17px Inter, system-ui, sans-serif';
    ctx.fillText(`High score: ${this.highScore.toLocaleString()}`, WIDTH / 2, 453);
    ctx.textAlign = 'left';
  }
}
