import { OneBulletGame } from './game.js';
import {
  ARENA_STAGE_COUNT,
  circleOverlap,
  clamp,
  combatSafeZones,
  distance,
  normalize,
  pointInsideRect,
  resolveCombatCircle,
} from './arena.js';
import {
  GAME_HEIGHT as HEIGHT,
  GAME_WIDTH as WIDTH,
  enemyScaleForWave,
} from './game-data.js';
import { InputController } from './input-controller.js';
import { selectSpawnPoint } from './spawn-system.js';
import {
  TOUCH_LAYOUT,
  UI_COLORS,
  dim,
  formatRunTime,
  label,
  panel,
  polygon,
  progressBar,
  upgradeEffectText,
  wrapRtl,
} from './ui-renderer.js';

export class OneBulletRuntime extends OneBulletGame {
  constructor(canvas, liveRegion = null) {
    super(canvas, liveRegion);
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
  }

  bindInput() {
    this.inputController = new InputController(this);
    this.inputController.bind();
  }

  resetRun() {
    super.resetRun();
    this.maxCombo = 0;
    this.tutorialStep = 0;
    this.waveClearRecallStarted = false;
  }

  startNextWave() {
    this.waveClearRecallStarted = false;
    super.startNextWave();
    if (this.wave > 1) this.tutorialStep = 3;
  }

  spawnEnemy(type, index = 0, options = {}) {
    const enemy = super.spawnEnemy(type, index, options);
    if (!enemy) return null;
    enemy.shotDirection = { x: 0, y: 0 };
    enemy.chargeDirection = { x: 0, y: 0 };
    return enemy;
  }

  findSpawnPoint(seed = 0) {
    return selectSpawnPoint({
      bounds: this.arenaStage.bounds,
      obstacles: this.arenaStage.obstacles,
      safeZones: combatSafeZones(this.touchMode),
      player: this.player,
      existingEnemies: this.enemies,
      seed,
      wave: this.wave,
      radius: 34,
      sanitize: (point, radius) => this.sanitizeSpawnPoint(point, radius),
    });
  }

  sanitizeSpawnPoint(point, radius = 34) {
    const candidate = { x: point.x, y: point.y, radius };
    resolveCombatCircle(
      candidate,
      this.arenaStage.bounds,
      this.arenaStage.obstacles,
      combatSafeZones(this.touchMode),
    );
    return { x: candidate.x, y: candidate.y };
  }

  constrainCombatCircle(circle) {
    resolveCombatCircle(
      circle,
      this.arenaStage.bounds,
      this.arenaStage.obstacles,
      combatSafeZones(this.touchMode),
    );
  }

  fireBullet() {
    const fired = super.fireBullet();
    if (fired && this.wave === 1) this.tutorialStep = Math.max(this.tutorialStep, 2);
    return fired;
  }

  recallBullet() {
    const recalled = super.recallBullet();
    if (recalled && this.wave === 1) this.tutorialStep = Math.max(this.tutorialStep, 2);
    return recalled;
  }

  catchBullet() {
    super.catchBullet();
    if (this.wave === 1) this.tutorialStep = 3;
  }

  killEnemy(enemy) {
    super.killEnemy(enemy);
    this.maxCombo = Math.max(this.maxCombo, this.combo);
  }

  createParticle(x, y, color, speed = 150) {
    if (this.reducedMotion && Math.random() < 0.68) return;
    super.createParticle(x, y, color, speed);
  }

  update(dt) {
    this.elapsed += dt;
    this.runTime += dt;
    this.shake = Math.max(0, this.shake - dt * (this.reducedMotion ? 60 : 22));
    this.flash = Math.max(0, this.flash - dt * 3.4);
    this.player.invulnerability = Math.max(0, this.player.invulnerability - dt);
    this.player.dashCooldown = Math.max(0, this.player.dashCooldown - dt);
    this.bullet.recallCooldown = Math.max(0, this.bullet.recallCooldown - dt);
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (this.comboTimer <= 0) this.combo = 0;
    if (this.banner && (this.banner.time -= dt) <= 0) this.banner = null;

    if (this.wave === 1 && this.tutorialStep === 0) {
      const movement = this.movementDirection();
      if (movement.x || movement.y) this.tutorialStep = 1;
    }

    this.tryDash();
    this.updatePlayer(dt);
    this.updateBullet(dt);
    this.updateEnemies(dt);
    this.updateEnemyShots(dt);
    this.updateParticles(dt);
    this.updateFloatingTexts(dt);

    if (this.enemies.length === 0) {
      this.waveClearTimer += dt;
      if (this.waveClearTimer >= 0.2 && !this.bullet.held && !this.bullet.recalling) {
        this.bullet.recalling = true;
        this.bullet.hitEnemyIds.clear();
        this.waveClearRecallStarted = true;
        this.announce('تم إنهاء الموجة. الطلقة تعود تلقائيًا.');
      }
      if (this.waveClearTimer >= 0.7 && this.bullet.held) this.openUpgradeSelection();
    } else {
      this.waveClearTimer = 0;
      this.waveClearRecallStarted = false;
    }
  }

  updateSniper(enemy, toPlayer, scale, dt) {
    if (enemy.shotTelegraph > 0) {
      enemy.shotTelegraph -= dt;
      if (enemy.shotTelegraph <= 0) {
        const direction = enemy.shotDirection?.x || enemy.shotDirection?.y
          ? enemy.shotDirection
          : toPlayer;
        this.fireEnemyShot(enemy, direction, 340 * scale.shotSpeed);
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
      enemy.shotDirection = { ...toPlayer };
      enemy.shotTelegraph = 0.5;
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
      if (enemy.chargeTelegraph <= 0) enemy.chargeRemaining = 0.32;
      return;
    }

    enemy.x += toPlayer.x * enemy.speed * dt;
    enemy.y += toPlayer.y * enemy.speed * dt;
    if (enemy.attackCooldown <= 0) {
      enemy.chargeDirection = { ...toPlayer };
      enemy.chargeTelegraph = 0.62;
      enemy.attackCooldown = Math.max(1.8, 3.1 - this.wave * 0.03);
    }
  }

  drawEnemies() {
    const ctx = this.ctx;
    for (const enemy of this.enemies) {
      const color = enemy.hitFlash > 0 ? UI_COLORS.text : enemy.color;
      const spawnScale = Math.max(0.25, 1 - enemy.spawnTime * 0.65);
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.scale(spawnScale, spawnScale);
      ctx.rotate(enemy.phase * 0.24);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      if (enemy.type === 'scout') polygon(ctx, 4, enemy.radius, Math.PI / 4);
      else if (enemy.type === 'brute') {
        ctx.fillRect(-enemy.radius, -enemy.radius, enemy.radius * 2, enemy.radius * 2);
        ctx.fillStyle = UI_COLORS.background;
        ctx.fillRect(-8, -8, 16, 16);
      } else if (enemy.type === 'sniper') polygon(ctx, 6, enemy.radius, 0);
      else if (enemy.type === 'charger') polygon(ctx, 3, enemy.radius + 3, Math.PI / 2);
      else polygon(ctx, 5, enemy.radius, -Math.PI / 2);
      ctx.restore();

      if (enemy.maxHealth > 1.1) {
        progressBar(
          ctx,
          enemy.x - enemy.radius,
          enemy.y + enemy.radius + 9,
          enemy.radius * 2,
          5,
          Math.max(0, enemy.health / enemy.maxHealth),
          UI_COLORS.text,
        );
      }

      if (enemy.type === 'charger' && enemy.chargeTelegraph > 0) {
        const direction = enemy.chargeDirection?.x || enemy.chargeDirection?.y
          ? enemy.chargeDirection
          : normalize(this.player.x - enemy.x, this.player.y - enemy.y);
        ctx.save();
        ctx.strokeStyle = UI_COLORS.danger;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius + 10 + Math.sin(this.elapsed * 20) * 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.65;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y);
        ctx.lineTo(enemy.x + direction.x * 180, enemy.y + direction.y * 180);
        ctx.stroke();
        ctx.restore();
      }

      if (enemy.type === 'sniper' && enemy.shotTelegraph > 0) {
        const direction = enemy.shotDirection?.x || enemy.shotDirection?.y
          ? enemy.shotDirection
          : normalize(this.player.x - enemy.x, this.player.y - enemy.y);
        ctx.save();
        ctx.strokeStyle = `rgba(255, 82, 106, ${0.42 + enemy.shotTelegraph * 0.8})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 7]);
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y);
        ctx.lineTo(enemy.x + direction.x * 1100, enemy.y + direction.y * 1100);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  drawHud() {
    const ctx = this.ctx;
    const leftX = 16;
    const centerX = WIDTH / 2 - 184;
    const rightX = WIDTH - 356;

    panel(ctx, leftX, 14, 340, 88, this.bullet.held ? UI_COLORS.bullet : UI_COLORS.border);
    const bulletTitle = this.bullet.held
      ? 'الطلقة جاهزة'
      : this.bullet.recalling
        ? 'الطلقة عائدة إليك'
        : 'استدعِ الطلقة';
    label(ctx, bulletTitle, leftX + 318, 46, 18, this.bullet.held ? UI_COLORS.bullet : UI_COLORS.text, 900, 'right');
    const recallMax = Math.max(1.15, 3.8 - this.stack('magnetic-recall') * 0.38);
    progressBar(ctx, leftX + 22, 61, 296, 8, 1 - this.bullet.recallCooldown / recallMax, UI_COLORS.electric);
    label(ctx, this.bullet.held ? 'انقر للإطلاق' : 'Q للاستدعاء', leftX + 318, 91, 13, UI_COLORS.muted, 600, 'right');

    panel(ctx, centerX, 14, 368, 88, UI_COLORS.border, 'rgba(10,15,31,0.91)', 5);
    label(ctx, `الموجة ${this.wave}`, WIDTH / 2, 43, 21, UI_COLORS.text, 900);
    label(ctx, `${this.enemies.length} أعداء  •  ${this.score.toLocaleString('en-US')} نقطة`, WIDTH / 2, 69, 14, UI_COLORS.muted, 700);
    const sound = this.audio.settings.muted ? 'الصوت مكتوم' : 'الصوت يعمل';
    label(ctx, `${this.stats.upgrades} قدرات  •  ${this.arenaStage.id + 1}/${ARENA_STAGE_COUNT} ساحة  •  ${sound}`, WIDTH / 2, 92, 12, this.audio.settings.muted ? UI_COLORS.danger : UI_COLORS.muted, 600);

    panel(ctx, rightX, 14, 340, 88, UI_COLORS.player);
    label(ctx, 'الحالة', rightX + 318, 43, 16, UI_COLORS.text, 900, 'right');
    const healthRatio = this.player.maxHealth > 0 ? this.player.health / this.player.maxHealth : 0;
    progressBar(ctx, rightX + 22, 54, 296, 10, healthRatio, UI_COLORS.danger);
    const dashMax = Math.max(0.36, 1.12 * Math.pow(0.86, this.stack('quick-dash')));
    progressBar(ctx, rightX + 22, 76, 210, 7, 1 - this.player.dashCooldown / dashMax, UI_COLORS.player);
    label(ctx, `❤ ${this.player.health}/${this.player.maxHealth}`, rightX + 318, 88, 14, UI_COLORS.text, 800, 'right');
    if (this.player.shield > 0) label(ctx, 'درع نشط', rightX + 96, 88, 12, UI_COLORS.electric, 800);

    if (this.state === 'playing' && this.wave === 1 && this.tutorialStep < 3) this.drawTutorial();
  }

  drawTutorial() {
    const messages = this.touchMode
      ? [
        'حرّك إصبعك داخل العصا اليسرى.',
        'المس أي مكان في الساحة لإطلاق طلقتك الوحيدة.',
        'استدعِ الطلقة من الزر الأزرق، ثم التقطها.',
      ]
      : [
        'تحرّك باستخدام WASD أو الأسهم.',
        'وجّه بالماوس وانقر لإطلاق طلقتك الوحيدة.',
        'اضغط Q لاستدعاء الطلقة، ثم التقطها.',
      ];
    panel(this.ctx, WIDTH / 2 - 330, 112, 660, 54, UI_COLORS.bullet, 'rgba(8,12,28,0.94)', 8);
    label(this.ctx, messages[this.tutorialStep] || messages.at(-1), WIDTH / 2, 146, 16, UI_COLORS.text, 800);
  }

  drawMenu() {
    const ctx = this.ctx;
    label(ctx, 'حلبة الطلقة الواحدة', WIDTH / 2, 128, 58, UI_COLORS.text, 900);
    label(ctx, 'طلقة واحدة. ارتدادات محسوبة. موجات بلا طرق جانبية.', WIDTH / 2, 176, 19, UI_COLORS.bullet, 700);

    const cards = [
      ['1', 'أطلق', 'استخدم زاوية التصويب والارتداد لضرب أكثر من عدو.'],
      ['2', 'استعد', 'استدعِ الطلقة والتقطها قبل أن تُحاصر.'],
      ['3', 'تطوّر', 'اختر قدرة واحدة ثم ادخل موجة أصعب.'],
    ];
    cards.forEach(([number, title, description], index) => {
      const x = 124 + index * 352;
      panel(ctx, x, 228, 328, 138, index === 1 ? UI_COLORS.bullet : UI_COLORS.border, 'rgba(10,15,31,0.86)', 6);
      label(ctx, number, x + 42, 272, 30, UI_COLORS.bullet, 900);
      label(ctx, title, x + 296, 270, 22, UI_COLORS.text, 900, 'right');
      wrapRtl(ctx, description, x + 296, 308, 248, 24, 15, UI_COLORS.muted, 500, 2);
    });

    this.drawButton('ابدأ الجولة', WIDTH / 2 - 190, 405, 380, 66, () => this.startRun(), true);

    const controls = this.touchMode
      ? 'العصا اليسرى للحركة  •  لمس الساحة للإطلاق  •  أزرار الاستدعاء والاندفاع يمينًا'
      : 'WASD حركة  •  ماوس إطلاق  •  Q استدعاء  •  Space اندفاع  •  P إيقاف';
    label(ctx, controls, WIDTH / 2, 520, 15, UI_COLORS.text, 700);
    label(ctx, `M للصوت  •  F ملء الشاشة  •  أعلى موجة ${this.highWave}  •  أعلى نتيجة ${this.highScore.toLocaleString('en-US')}`, WIDTH / 2, 555, 13, UI_COLORS.muted, 600);
    label(ctx, `v${this.version}`, WIDTH / 2, 678, 12, '#68739a', 600);
  }

  drawUpgradeSelection() {
    const ctx = this.ctx;
    dim(ctx, 0.88);
    label(ctx, `اكتملت الموجة ${this.wave}`, WIDTH / 2, 62, 19, UI_COLORS.success, 800);
    label(ctx, 'اختر تطويرًا واحدًا', WIDTH / 2, 108, 37, UI_COLORS.bullet, 900);
    const cardWidth = 336;
    const gap = 24;
    const total = this.upgradeChoices.length * cardWidth + Math.max(0, this.upgradeChoices.length - 1) * gap;
    const start = WIDTH / 2 - total / 2;
    this.upgradeChoices.forEach((upgrade, index) => {
      this.drawUpgradeCard(upgrade, index, start + index * (cardWidth + gap), 148, cardWidth, 360);
    });
    label(ctx, 'انقر على بطاقة أو استخدم 1 / 2 / 3', WIDTH / 2, 552, 15, UI_COLORS.muted, 600);
  }

  drawUpgradeCard(upgrade, index, x, y, width, height) {
    const hovered = pointInsideRect(this.pointer, { x, y, w: width, h: height });
    const ctx = this.ctx;
    panel(
      ctx,
      x,
      y,
      width,
      height,
      hovered ? UI_COLORS.bullet : UI_COLORS.border,
      hovered ? '#1b2440' : UI_COLORS.panel,
      hovered ? 17 : 7,
    );
    label(ctx, `${index + 1}  •  ${upgrade.tag}`, x + width - 24, y + 40, 14, UI_COLORS.bullet, 800, 'right');
    wrapRtl(ctx, upgrade.name, x + width - 24, y + 91, width - 48, 34, 27, UI_COLORS.text, 900, 2);
    wrapRtl(ctx, upgrade.description, x + width - 24, y + 165, width - 48, 27, 16, UI_COLORS.muted, 500, 3);
    panel(ctx, x + 20, y + 252, width - 40, 64, UI_COLORS.electric, 'rgba(7,13,30,0.82)', 3);
    wrapRtl(
      ctx,
      upgradeEffectText(upgrade, this.stack(upgrade.id)),
      x + width - 40,
      y + 278,
      width - 80,
      22,
      13,
      UI_COLORS.text,
      700,
      2,
    );
    label(
      ctx,
      `المستوى ${this.stack(upgrade.id)} من ${upgrade.maxStacks}`,
      x + width - 24,
      y + height - 18,
      13,
      this.stack(upgrade.id) ? UI_COLORS.electric : UI_COLORS.muted,
      700,
      'right',
    );
    this.addUiRegion(x, y, width, height, () => this.chooseUpgrade(index));
  }

  drawGameOver() {
    dim(this.ctx, 0.9);
    label(this.ctx, 'انتهت الجولة', WIDTH / 2, 112, 52, UI_COLORS.danger, 900);
    label(this.ctx, `وصلت إلى الموجة ${this.wave}`, WIDTH / 2, 162, 22, UI_COLORS.text, 800);

    const items = [
      ['النتيجة', this.score.toLocaleString('en-US')],
      ['الوقت', formatRunTime(this.runTime)],
      ['الأعداء', this.stats.kills],
      ['أفضل سلسلة', this.maxCombo],
      ['الإطلاقات', this.stats.shots],
      ['الإصابات', this.stats.hits],
      ['القدرات', this.stats.upgrades],
      ['الضرر المستلم', this.stats.damageTaken],
    ];
    items.forEach(([title, value], index) => {
      const column = index % 4;
      const row = Math.floor(index / 4);
      const x = 132 + column * 258;
      const y = 205 + row * 92;
      panel(this.ctx, x, y, 240, 72, UI_COLORS.border, 'rgba(10,15,31,0.84)', 3);
      label(this.ctx, title, x + 216, y + 27, 13, UI_COLORS.muted, 600, 'right');
      label(this.ctx, value, x + 216, y + 56, 21, UI_COLORS.text, 900, 'right');
    });

    this.drawButton('العب من جديد', WIDTH / 2 - 180, 430, 360, 62, () => this.startRun(), true);
    this.drawButton('القائمة الرئيسية', WIDTH / 2 - 180, 510, 360, 58, () => this.goToMenu());
  }

  drawTouchControls() {
    const ctx = this.ctx;
    const origin = TOUCH_LAYOUT.move;
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = 'rgba(98,243,255,0.10)';
    ctx.strokeStyle = UI_COLORS.player;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, origin.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    let knobX = origin.x;
    let knobY = origin.y;
    if (this.touchMove) {
      const dx = this.touchMove.x - origin.x;
      const dy = this.touchMove.y - origin.y;
      const length = Math.hypot(dx, dy);
      const scale = length > 47 ? 47 / length : 1;
      knobX += dx * scale;
      knobY += dy * scale;
    }
    ctx.fillStyle = 'rgba(98,243,255,0.42)';
    ctx.beginPath();
    ctx.arc(knobX, knobY, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    this.drawCircleButton(
      TOUCH_LAYOUT.dash.x,
      TOUCH_LAYOUT.dash.y,
      TOUCH_LAYOUT.dash.radius,
      this.player.dashCooldown <= 0 ? 'اندفاع' : this.player.dashCooldown.toFixed(1),
      UI_COLORS.player,
      () => { this.dashRequested = true; },
    );
    this.drawCircleButton(
      TOUCH_LAYOUT.recall.x,
      TOUCH_LAYOUT.recall.y,
      TOUCH_LAYOUT.recall.radius,
      this.bullet.held ? 'جاهزة' : 'استدعاء',
      UI_COLORS.electric,
      () => this.recallBullet(),
    );
    this.drawCircleButton(
      TOUCH_LAYOUT.pause.x,
      TOUCH_LAYOUT.pause.y,
      TOUCH_LAYOUT.pause.radius,
      'إيقاف',
      UI_COLORS.muted,
      () => this.pause(),
    );
  }

  getSnapshot() {
    return {
      ...super.getSnapshot(),
      runtimeArchitecture: 'modular-runtime',
      autoRecallAfterWave: true,
      telegraphsLockDirection: true,
      bulletRecalling: this.bullet.recalling,
      tutorialStep: this.tutorialStep,
      maxCombo: this.maxCombo,
      muted: this.audio.settings.muted,
    };
  }
}
