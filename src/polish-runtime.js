import { OneBulletRuntime } from './game-runtime.js';
import { ARENA_STAGE_COUNT, clamp, pointInsideRect } from './arena.js';
import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from './game-data.js';
import {
  TOUCH_LAYOUT,
  UI_COLORS,
  dim,
  label,
  panel,
  progressBar,
  roundedRect,
  upgradeEffectText,
  wrapRtl,
} from './ui-renderer.js';

export const POLISH_VERSION = '2.5.0-polish';

export function bulletPresentationState(bullet = {}) {
  if (bullet.held) return { code: 'READY', label: 'جاهزة للإطلاق', color: UI_COLORS.bullet };
  if (bullet.recalling) return { code: 'RETURNING', label: 'عائدة إليك', color: UI_COLORS.electric };
  return { code: 'FIRED', label: 'داخل الساحة', color: UI_COLORS.danger };
}

export function upgradeVisualKind(upgrade = {}) {
  const id = String(upgrade.id || '');
  if (id.includes('dash') || id.includes('steps')) return 'movement';
  if (id.includes('recall')) return 'recall';
  if (id.includes('shield') || id.includes('chance')) return 'defense';
  if (id.includes('vitality')) return 'health';
  if (id.includes('ricochet')) return 'ricochet';
  if (id.includes('shock')) return 'shock';
  return 'bullet';
}

export class OneBulletPolishRuntime extends OneBulletRuntime {
  constructor(canvas, liveRegion = null) {
    super(canvas, liveRegion);
    this.version = POLISH_VERSION;
  }

  resetRun() {
    super.resetRun();
    this.hitStopTimer = 0;
    this.impactFlash = 0;
    this.clearBannerTimer = 0;
    this.recallPulse = 0;
    this.muzzleFlash = 0;
    this.arenaExpansionPulse = 0;
  }

  startNextWave() {
    const previousStage = this.arenaStage?.id ?? 0;
    super.startNextWave();
    const expanded = this.arenaStage.id > previousStage;
    this.arenaExpansionPulse = expanded ? 1 : 0;
    this.banner = {
      title: `WAVE ${this.wave}`,
      subtitle: expanded
        ? `${this.arenaStage.name} — توسعت الساحة`
        : `${this.enemies.length} أعداء — اهزمهم جميعًا`,
      time: expanded ? 2 : 1.25,
    };
  }

  fireBullet() {
    const fired = super.fireBullet();
    if (fired) {
      this.muzzleFlash = 0.16;
      this.impactFlash = Math.max(this.impactFlash, 0.04);
    }
    return fired;
  }

  recallBullet() {
    const recalled = super.recallBullet();
    if (recalled) this.recallPulse = 0.42;
    return recalled;
  }

  catchBullet() {
    const wasReturning = this.bullet.recalling;
    super.catchBullet();
    if (wasReturning) {
      this.recallPulse = 0.65;
      this.shake = Math.max(this.shake, this.reducedMotion ? 1 : 3.5);
      this.createRing(this.player.x, this.player.y, UI_COLORS.electric, 74);
    }
  }

  onRicochet() {
    super.onRicochet();
    this.impactFlash = Math.max(this.impactFlash, 0.045);
    this.shake = Math.max(this.shake, this.reducedMotion ? 0 : 2.2);
  }

  damageEnemy(enemy, damage, fromBullet = false) {
    if (!this.enemies.includes(enemy)) return;
    const lethal = enemy.health - damage <= 0;
    super.damageEnemy(enemy, damage, fromBullet);
    if (!fromBullet) return;
    this.hitStopTimer = Math.max(this.hitStopTimer, this.reducedMotion ? 0 : lethal ? 0.052 : 0.024);
    this.impactFlash = Math.max(this.impactFlash, lethal ? 0.16 : 0.08);
    this.shake = Math.max(this.shake, this.reducedMotion ? 0 : lethal ? 7 : 3.2);
  }

  killEnemy(enemy) {
    if (!this.enemies.includes(enemy)) return;
    const snapshot = {
      x: enemy.x,
      y: enemy.y,
      type: enemy.type,
      color: enemy.color,
      mini: enemy.mini,
    };
    super.killEnemy(enemy);

    const profiles = {
      scout: { count: 10, speed: 190, ring: 42 },
      brute: { count: 24, speed: 300, ring: 88 },
      sniper: { count: 16, speed: 235, ring: 66 },
      charger: { count: 20, speed: 285, ring: 72 },
      splitter: { count: 22, speed: 250, ring: 82 },
    };
    const profile = profiles[snapshot.type] || profiles.scout;
    this.createBurst(snapshot.x, snapshot.y, snapshot.color, snapshot.mini ? 7 : profile.count, profile.speed);
    if (!snapshot.mini) this.createRing(snapshot.x, snapshot.y, snapshot.color, profile.ring);

    if (snapshot.type === 'brute') this.createRing(snapshot.x, snapshot.y, UI_COLORS.danger, 112);
    if (snapshot.type === 'sniper') this.createBurst(snapshot.x, snapshot.y, UI_COLORS.text, 8, 330);
    if (snapshot.type === 'charger') this.createRing(snapshot.x, snapshot.y, UI_COLORS.success, 104);
    if (snapshot.type === 'splitter') this.createRing(snapshot.x, snapshot.y, '#ff79d1', 118);

    if (this.enemies.length === 0) {
      this.clearBannerTimer = 1.15;
      this.impactFlash = Math.max(this.impactFlash, 0.18);
    }
  }

  update(dt) {
    this.impactFlash = Math.max(0, this.impactFlash - dt * 4.8);
    this.clearBannerTimer = Math.max(0, this.clearBannerTimer - dt);
    this.recallPulse = Math.max(0, this.recallPulse - dt * 2.2);
    this.muzzleFlash = Math.max(0, this.muzzleFlash - dt * 3.8);
    this.arenaExpansionPulse = Math.max(0, this.arenaExpansionPulse - dt * 0.75);

    if (this.hitStopTimer > 0) {
      this.hitStopTimer = Math.max(0, this.hitStopTimer - dt);
      this.elapsed += dt * 0.18;
      this.shake = Math.max(0, this.shake - dt * 34);
      this.updateParticles(dt * 0.18);
      this.updateFloatingTexts(dt * 0.18);
      return;
    }
    super.update(dt);
  }

  draw() {
    super.draw();
    if (this.impactFlash <= 0) return;
    this.ctx.save();
    this.ctx.fillStyle = `rgba(255,255,255,${this.impactFlash * 0.22})`;
    this.ctx.fillRect(0, 0, WIDTH, HEIGHT);
    this.ctx.restore();
  }

  drawBullet() {
    const ctx = this.ctx;
    ctx.save();

    if (this.bullet.trail.length > 1) {
      ctx.lineCap = 'round';
      for (let index = this.bullet.trail.length - 1; index > 0; index -= 1) {
        const point = this.bullet.trail[index];
        const next = this.bullet.trail[index - 1];
        const strength = 1 - index / this.bullet.trail.length;
        ctx.strokeStyle = this.bullet.recalling
          ? `rgba(88,166,255,${0.1 + strength * 0.42})`
          : `rgba(255,230,109,${0.08 + strength * 0.48})`;
        ctx.lineWidth = 1.5 + strength * 7;
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(next.x, next.y);
        ctx.stroke();
      }
    }

    if (this.bullet.recalling) {
      const gradient = ctx.createLinearGradient(this.player.x, this.player.y, this.bullet.x, this.bullet.y);
      gradient.addColorStop(0, 'rgba(98,243,255,0.08)');
      gradient.addColorStop(1, 'rgba(88,166,255,0.72)');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3 + Math.sin(this.elapsed * 18) * 0.8;
      ctx.setLineDash([12, 10]);
      ctx.beginPath();
      ctx.moveTo(this.player.x, this.player.y);
      ctx.lineTo(this.bullet.x, this.bullet.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const pulse = 1 + Math.sin(this.elapsed * 16) * 0.12;
    ctx.fillStyle = this.bullet.recalling ? UI_COLORS.electric : UI_COLORS.bullet;
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 28;
    ctx.beginPath();
    ctx.arc(this.bullet.x, this.bullet.y, this.bullet.radius * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.bullet.x, this.bullet.y, Math.max(2, this.bullet.radius * 0.42), 0, Math.PI * 2);
    ctx.stroke();

    if (this.muzzleFlash > 0) {
      ctx.globalAlpha = Math.min(1, this.muzzleFlash * 7);
      ctx.strokeStyle = UI_COLORS.bullet;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, 28 + (0.16 - this.muzzleFlash) * 130, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawHud() {
    const ctx = this.ctx;
    const bulletState = bulletPresentationState(this.bullet);
    const recallMax = Math.max(1.15, 3.8 - this.stack('magnetic-recall') * 0.38);
    const dashMax = Math.max(0.36, 1.12 * Math.pow(0.86, this.stack('quick-dash')));
    const healthRatio = this.player.maxHealth > 0 ? this.player.health / this.player.maxHealth : 0;

    panel(ctx, 14, 12, 342, 90, bulletState.color, 'rgba(7,12,27,0.93)', 7);
    drawPill(ctx, bulletState.code, 30, 25, 112, 26, bulletState.color);
    label(ctx, bulletState.label, 334, 43, 18, UI_COLORS.text, 900, 'right');
    label(ctx, this.bullet.held ? 'ماوس: إطلاق' : 'Q: استدعاء', 334, 67, 12, UI_COLORS.muted, 700, 'right');
    progressBar(ctx, 30, 80, 304, 8, 1 - this.bullet.recallCooldown / recallMax, UI_COLORS.electric);

    panel(ctx, WIDTH / 2 - 190, 12, 380, 90, UI_COLORS.border, 'rgba(7,12,27,0.93)', 5);
    label(ctx, `WAVE ${this.wave}`, WIDTH / 2, 41, 23, UI_COLORS.text, 900);
    label(ctx, `${this.enemies.length} متبقٍ  •  ${this.score.toLocaleString('en-US')} نقطة`, WIDTH / 2, 66, 14, UI_COLORS.muted, 700);
    const comboText = this.combo > 1 ? `COMBO ×${this.combo}` : `${this.stats.upgrades} تطويرات`;
    label(ctx, `${comboText}  •  الساحة ${this.arenaStage.id + 1}/${ARENA_STAGE_COUNT}`, WIDTH / 2, 90, 12, this.combo > 1 ? UI_COLORS.bullet : UI_COLORS.muted, 800);

    panel(ctx, WIDTH - 356, 12, 342, 90, UI_COLORS.player, 'rgba(7,12,27,0.93)', 7);
    label(ctx, `الصحة ${this.player.health}/${this.player.maxHealth}`, WIDTH - 36, 39, 16, UI_COLORS.text, 900, 'right');
    progressBar(ctx, WIDTH - 334, 51, 304, 10, healthRatio, UI_COLORS.danger);
    label(ctx, this.player.shield > 0 ? 'درع نشط' : 'الاندفاع', WIDTH - 36, 82, 12, this.player.shield > 0 ? UI_COLORS.electric : UI_COLORS.muted, 800, 'right');
    progressBar(ctx, WIDTH - 244, 77, 214, 7, 1 - this.player.dashCooldown / dashMax, UI_COLORS.player);

    if (this.state === 'playing' && this.wave === 1 && this.tutorialStep < 3) this.drawTutorial();
    if (this.clearBannerTimer > 0 && this.state === 'playing') this.drawWaveClearCallout();
  }

  drawTutorial() {
    const ctx = this.ctx;
    const steps = this.touchMode
      ? [
        { key: 'MOVE', title: 'حرّك العصا اليسرى' },
        { key: 'FIRE', title: 'المس الساحة للإطلاق' },
        { key: 'RECALL', title: 'اضغط زر الاستدعاء' },
      ]
      : [
        { key: 'WASD', title: 'تحرك في أي اتجاه' },
        { key: 'MOUSE', title: 'صوّب وانقر للإطلاق' },
        { key: 'Q', title: 'استدعِ الطلقة والتقطها' },
      ];

    panel(ctx, WIDTH / 2 - 356, 116, 712, 78, UI_COLORS.bullet, 'rgba(6,10,24,0.95)', 8);
    steps.forEach((step, index) => {
      const x = WIDTH / 2 - 326 + index * 220;
      const active = index === this.tutorialStep;
      drawPill(ctx, step.key, x, 130, 82, 24, active ? UI_COLORS.bullet : UI_COLORS.border);
      label(ctx, step.title, x + 96, 169, 13, active ? UI_COLORS.text : UI_COLORS.muted, active ? 900 : 600, 'center');
    });
  }

  drawWaveClearCallout() {
    const ctx = this.ctx;
    const alpha = clamp(this.clearBannerTimer * 1.7, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    panel(ctx, WIDTH / 2 - 206, 116, 412, 62, UI_COLORS.success, 'rgba(5,20,22,0.94)', 14);
    label(ctx, 'WAVE CLEARED', WIDTH / 2, 145, 22, UI_COLORS.success, 900);
    label(ctx, 'الطلقة تعود تلقائيًا', WIDTH / 2, 168, 12, UI_COLORS.text, 700);
    ctx.restore();
  }

  drawUpgradeSelection() {
    const ctx = this.ctx;
    dim(ctx, 0.9);
    label(ctx, `WAVE ${this.wave} CLEARED`, WIDTH / 2, 50, 18, UI_COLORS.success, 900);
    label(ctx, 'اختر تطويرًا واحدًا', WIDTH / 2, 97, 36, UI_COLORS.bullet, 900);
    label(ctx, 'كل اختيار يغيّر الجولة الحالية فقط', WIDTH / 2, 124, 13, UI_COLORS.muted, 600);

    const cardWidth = 342;
    const gap = 18;
    const total = this.upgradeChoices.length * cardWidth + Math.max(0, this.upgradeChoices.length - 1) * gap;
    const start = WIDTH / 2 - total / 2;
    this.upgradeChoices.forEach((upgrade, index) => {
      this.drawUpgradeCard(upgrade, index, start + index * (cardWidth + gap), 150, cardWidth, 382);
    });
    label(ctx, 'اختيار بالماوس أو المفاتيح 1 / 2 / 3', WIDTH / 2, 570, 14, UI_COLORS.muted, 700);
  }

  drawUpgradeCard(upgrade, index, x, y, width, height) {
    const hovered = pointInsideRect(this.pointer, { x, y, w: width, h: height });
    const current = this.stack(upgrade.id);
    const ctx = this.ctx;
    const accent = hovered ? UI_COLORS.bullet : current > 0 ? UI_COLORS.electric : UI_COLORS.border;
    panel(ctx, x, y, width, height, accent, hovered ? '#18223e' : UI_COLORS.panel, hovered ? 18 : 7);

    drawUpgradeIcon(ctx, upgradeVisualKind(upgrade), x + 48, y + 52, accent);
    drawPill(ctx, `${index + 1}`, x + width - 61, y + 24, 38, 28, UI_COLORS.bullet);
    label(ctx, upgrade.tag, x + width - 78, y + 44, 13, UI_COLORS.bullet, 800, 'right');
    wrapRtl(ctx, upgrade.name, x + width - 24, y + 104, width - 48, 32, 25, UI_COLORS.text, 900, 2);
    wrapRtl(ctx, upgrade.description, x + width - 24, y + 173, width - 48, 25, 15, UI_COLORS.muted, 500, 3);

    panel(ctx, x + 18, y + 252, width - 36, 76, UI_COLORS.electric, 'rgba(5,11,27,0.9)', 3);
    label(ctx, 'التأثير', x + width - 36, y + 275, 11, UI_COLORS.electric, 900, 'right');
    wrapRtl(ctx, upgradeEffectText(upgrade, current), x + width - 36, y + 302, width - 72, 21, 13, UI_COLORS.text, 700, 2);

    drawLevelDots(ctx, x + 24, y + height - 31, width - 48, upgrade.maxStacks, current, accent);
    label(ctx, `LV ${current} → ${Math.min(upgrade.maxStacks, current + 1)}`, x + width - 24, y + height - 16, 12, UI_COLORS.muted, 800, 'right');
    this.addUiRegion(x, y, width, height, () => this.chooseUpgrade(index));
  }

  drawBanner() {
    if (!this.banner) return;
    const ctx = this.ctx;
    const alpha = clamp(this.banner.time * 1.5, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    panel(ctx, WIDTH / 2 - 260, HEIGHT / 2 - 62, 520, 124, this.arenaExpansionPulse > 0 ? UI_COLORS.player : UI_COLORS.bullet, 'rgba(4,8,22,0.9)', 18);
    label(ctx, this.banner.title, WIDTH / 2, HEIGHT / 2 - 10, 38, UI_COLORS.text, 900);
    label(ctx, this.banner.subtitle, WIDTH / 2, HEIGHT / 2 + 28, 16, this.arenaExpansionPulse > 0 ? UI_COLORS.player : UI_COLORS.bullet, 800);
    ctx.restore();
  }

  drawTouchControls() {
    const ctx = this.ctx;
    const origin = TOUCH_LAYOUT.move;
    ctx.save();
    ctx.globalAlpha = 0.58;
    ctx.fillStyle = 'rgba(98,243,255,0.08)';
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
    ctx.fillStyle = 'rgba(98,243,255,0.46)';
    ctx.beginPath();
    ctx.arc(knobX, knobY, 23, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const dashMax = Math.max(0.36, 1.12 * Math.pow(0.86, this.stack('quick-dash')));
    const recallMax = Math.max(1.15, 3.8 - this.stack('magnetic-recall') * 0.38);
    drawTouchAction(this, TOUCH_LAYOUT.dash, 'DASH', UI_COLORS.player, 1 - this.player.dashCooldown / dashMax, () => { this.dashRequested = true; });
    drawTouchAction(this, TOUCH_LAYOUT.recall, this.bullet.held ? 'READY' : 'RECALL', UI_COLORS.electric, 1 - this.bullet.recallCooldown / recallMax, () => this.recallBullet());
    drawTouchAction(this, TOUCH_LAYOUT.pause, 'PAUSE', UI_COLORS.muted, 1, () => this.pause());
  }

  getSnapshot() {
    return {
      ...super.getSnapshot(),
      combatPolish: true,
      hudRevision: 'compact-status-hud',
      upgradeCardRevision: 'icon-value-cards',
      hitStopEnabled: !this.reducedMotion,
      bulletStatus: bulletPresentationState(this.bullet).code,
      clearBannerActive: this.clearBannerTimer > 0,
      impactFeedbackActive: this.hitStopTimer > 0 || this.impactFlash > 0,
    };
  }
}

function drawPill(ctx, text, x, y, width, height, accent) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  roundedRect(ctx, x, y, width, height, height / 2);
  ctx.fill();
  ctx.stroke();
  label(ctx, text, x + width / 2, y + height / 2 + 5, 11, accent, 900);
  ctx.restore();
}

function drawUpgradeIcon(ctx, kind, x, y, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 27, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (kind === 'movement') {
    ctx.beginPath(); ctx.moveTo(-13, 7); ctx.lineTo(0, -7); ctx.lineTo(13, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-13, 15); ctx.lineTo(0, 1); ctx.lineTo(13, 15); ctx.stroke();
  } else if (kind === 'recall') {
    ctx.beginPath(); ctx.arc(0, 1, 13, Math.PI * 0.2, Math.PI * 1.65); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-12, -8); ctx.lineTo(-17, -2); ctx.lineTo(-8, 0); ctx.stroke();
  } else if (kind === 'defense') {
    ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(14, -10); ctx.lineTo(11, 8); ctx.lineTo(0, 17); ctx.lineTo(-11, 8); ctx.lineTo(-14, -10); ctx.closePath(); ctx.stroke();
  } else if (kind === 'health') {
    ctx.beginPath(); ctx.moveTo(-13, 0); ctx.lineTo(13, 0); ctx.moveTo(0, -13); ctx.lineTo(0, 13); ctx.stroke();
  } else if (kind === 'ricochet') {
    ctx.beginPath(); ctx.moveTo(-16, 11); ctx.lineTo(-5, -9); ctx.lineTo(5, 9); ctx.lineTo(16, -11); ctx.stroke();
  } else if (kind === 'shock') {
    ctx.beginPath(); ctx.moveTo(4, -17); ctx.lineTo(-8, 2); ctx.lineTo(1, 2); ctx.lineTo(-4, 17); ctx.lineTo(12, -5); ctx.lineTo(3, -5); ctx.closePath(); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(14, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(7, -8); ctx.lineTo(16, 0); ctx.lineTo(7, 8); ctx.stroke();
  }
  ctx.restore();
}

function drawLevelDots(ctx, x, y, width, maxStacks, current, accent) {
  const count = Math.max(1, Math.min(10, maxStacks));
  const gap = count === 1 ? 0 : width / (count - 1);
  ctx.save();
  for (let index = 0; index < count; index += 1) {
    ctx.fillStyle = index < current ? accent : 'rgba(255,255,255,0.14)';
    ctx.beginPath();
    ctx.arc(x + index * gap, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTouchAction(game, layout, text, color, progress, action) {
  const ctx = game.ctx;
  const safeProgress = clamp(progress, 0, 1);
  ctx.save();
  ctx.fillStyle = 'rgba(5,10,25,0.72)';
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(layout.x, layout.y, layout.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(layout.x, layout.y, layout.radius - 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * safeProgress);
  ctx.stroke();
  label(ctx, text, layout.x, layout.y + 5, layout.radius > 45 ? 11 : 9, color, 900);
  ctx.restore();
  game.addUiRegion(layout.x - layout.radius, layout.y - layout.radius, layout.radius * 2, layout.radius * 2, action);
}
