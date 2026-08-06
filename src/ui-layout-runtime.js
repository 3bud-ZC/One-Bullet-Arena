import { clamp } from './arena.js';
import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from './game-data.js';
import { OneBulletCombatFeedbackRuntime, comboFeedbackRank } from './combat-feedback-runtime.js';
import { bulletPresentationState } from './polish-runtime.js';
import { UI_COLORS, label, panel, progressBar, roundedRect } from './ui-renderer.js';

export const UI_LAYOUT_VERSION = '2.7.1-ui';

export function compactHudLayout(width = WIDTH) {
  const margin = 16;
  const gap = 14;
  const centerWidth = Math.min(420, Math.max(340, width * 0.328));
  const sideWidth = Math.max(300, (width - margin * 2 - gap * 2 - centerWidth) / 2);
  const y = 10;
  const height = 62;

  return {
    margin,
    gap,
    y,
    height,
    safeBottom: y + height + 8,
    left: { x: margin, y, w: sideWidth, h: height },
    center: { x: margin + sideWidth + gap, y, w: centerWidth, h: height },
    right: { x: width - margin - sideWidth, y, w: sideWidth, h: height },
  };
}

export class OneBulletUiLayoutRuntime extends OneBulletCombatFeedbackRuntime {
  constructor(canvas, liveRegion = null) {
    super(canvas, liveRegion);
    this.uiLayoutVersion = UI_LAYOUT_VERSION;
  }

  drawHud() {
    const ctx = this.ctx;
    const layout = compactHudLayout(WIDTH);
    const bulletState = bulletPresentationState(this.bullet);
    const recallMax = Math.max(1.15, 3.8 - this.stack('magnetic-recall') * 0.38);
    const dashMax = Math.max(0.36, 1.12 * Math.pow(0.86, this.stack('quick-dash')));
    const healthRatio = this.player.maxHealth > 0 ? this.player.health / this.player.maxHealth : 0;
    const recallRatio = 1 - this.bullet.recallCooldown / recallMax;
    const dashRatio = 1 - this.player.dashCooldown / dashMax;

    this.drawCompactPanel(layout.left, bulletState.color, 'BULLET SYSTEM');
    this.drawBulletHud(layout.left, bulletState, recallRatio);

    this.drawCompactPanel(layout.center, UI_COLORS.borderBright, 'RUN STATUS');
    this.drawRunHud(layout.center);

    this.drawCompactPanel(layout.right, UI_COLORS.player, 'PILOT STATUS');
    this.drawPilotHud(layout.right, healthRatio, dashRatio);

    if (this.state === 'playing' && this.wave === 1 && this.tutorialStep < 3) this.drawTutorial();
    if (this.clearBannerTimer > 0 && this.state === 'playing') this.drawWaveClearCallout();

    this.drawComboMomentum();
    this.drawFeedbackCallout();
  }

  drawCompactPanel(rect, accent, kicker) {
    const ctx = this.ctx;
    panel(ctx, rect.x, rect.y, rect.w, rect.h, accent, 'rgba(4, 9, 22, 0.88)', 3);

    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = accent;
    roundedRect(ctx, rect.x + 10, rect.y, rect.w - 20, 2, 1);
    ctx.fill();

    ctx.globalAlpha = 0.12;
    const sheen = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y);
    sheen.addColorStop(0, accent);
    sheen.addColorStop(0.38, 'rgba(255,255,255,0)');
    sheen.addColorStop(1, accent);
    ctx.fillStyle = sheen;
    roundedRect(ctx, rect.x + 2, rect.y + 2, rect.w - 4, 20, 7);
    ctx.fill();
    ctx.restore();

    label(ctx, kicker, rect.x + 14, rect.y + 15, 8, accent, 900, 'left');
  }

  drawBulletHud(rect, bulletState, recallRatio) {
    const ctx = this.ctx;
    const glyph = bulletState.code === 'READY' ? '●' : bulletState.code === 'RETURNING' ? '↺' : '→';

    this.drawStatusPill(rect.x + 14, rect.y + 23, 104, 23, `${glyph}  ${bulletState.code}`, bulletState.color);
    label(ctx, bulletState.label, rect.x + rect.w - 16, rect.y + 31, 15, UI_COLORS.text, 900, 'right');
    label(
      ctx,
      this.bullet.held ? 'جاهزة للإطلاق' : this.bullet.recalling ? 'تعود إليك' : 'Q للاستدعاء',
      rect.x + rect.w - 16,
      rect.y + 48,
      9,
      UI_COLORS.muted,
      800,
      'right',
    );
    progressBar(
      ctx,
      rect.x + 14,
      rect.y + rect.h - 7,
      rect.w - 28,
      4,
      clamp(recallRatio, 0, 1),
      UI_COLORS.electric,
      'rgba(255,255,255,0.07)',
    );
  }

  drawRunHud(rect) {
    const ctx = this.ctx;
    const waveText = `WAVE ${String(this.wave).padStart(2, '0')}`;
    const enemiesText = `${this.enemies.length} ENEMIES`;
    const scoreText = `${this.score.toLocaleString('en-US')} SCORE`;
    const arenaText = `ARENA ${this.arenaStage.id + 1}/4`;
    const upgradesText = `${this.stats.upgrades} UPGRADES`;

    label(ctx, waveText, rect.x + rect.w / 2, rect.y + 29, 21, UI_COLORS.text, 900);
    label(
      ctx,
      `${enemiesText}  ·  ${scoreText}  ·  ${upgradesText}  ·  ${arenaText}`,
      rect.x + rect.w / 2,
      rect.y + 51,
      9,
      this.combo > 1 ? UI_COLORS.bullet : UI_COLORS.muted,
      850,
    );
  }

  drawPilotHud(rect, healthRatio, dashRatio) {
    const ctx = this.ctx;
    const shieldOnline = this.player.shield > 0;

    label(
      ctx,
      `HP ${this.player.health}/${this.player.maxHealth}`,
      rect.x + rect.w - 16,
      rect.y + 27,
      15,
      UI_COLORS.text,
      900,
      'right',
    );
    progressBar(
      ctx,
      rect.x + 14,
      rect.y + 33,
      rect.w - 28,
      7,
      clamp(healthRatio, 0, 1),
      UI_COLORS.danger,
      'rgba(255,255,255,0.07)',
    );

    label(
      ctx,
      shieldOnline ? 'SHIELD ONLINE' : 'DASH',
      rect.x + 14,
      rect.y + 53,
      9,
      shieldOnline ? UI_COLORS.electric : UI_COLORS.muted,
      900,
      'left',
    );
    progressBar(
      ctx,
      rect.x + 112,
      rect.y + 48,
      rect.w - 128,
      5,
      clamp(dashRatio, 0, 1),
      UI_COLORS.player,
      'rgba(255,255,255,0.07)',
    );
  }

  drawStatusPill(x, y, width, height, text, color) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    roundedRect(ctx, x, y, width, height, height / 2);
    ctx.fill();
    ctx.stroke();
    label(ctx, text, x + width / 2, y + 16, 9, color, 900);
    ctx.restore();
  }

  drawTutorial() {
    const steps = this.touchMode
      ? [
        { key: 'MOVE', title: 'اسحب العصا للتحرك' },
        { key: 'TAP', title: 'المس الساحة للإطلاق' },
        { key: 'RECALL', title: 'استدعِ الطلقة والتقطها' },
      ]
      : [
        { key: 'WASD', title: 'تحرك داخل الساحة' },
        { key: 'MOUSE', title: 'صوّب واضغط للإطلاق' },
        { key: 'Q', title: 'استدعِ الطلقة والتقطها' },
      ];
    const current = steps[this.tutorialStep] || steps[0];
    const ctx = this.ctx;
    const width = 430;
    const height = 42;
    const x = WIDTH / 2 - width / 2;
    const y = 80;

    panel(ctx, x, y, width, height, UI_COLORS.bullet, 'rgba(4,9,22,0.9)', 3);
    this.drawStatusPill(x + 10, y + 9, 92, 24, current.key, UI_COLORS.bullet);
    label(ctx, current.title, x + width - 48, y + 27, 12, UI_COLORS.text, 850, 'right');
    label(ctx, `${this.tutorialStep + 1}/3`, x + width - 14, y + 27, 9, UI_COLORS.muted, 900, 'right');
  }

  drawComboMomentum() {
    if (this.state !== 'playing' || this.combo < 2) return;
    if (this.wave === 1 && this.tutorialStep < 3) return;

    const ctx = this.ctx;
    const rank = comboFeedbackRank(this.combo);
    const ratio = clamp(this.comboTimer / 2.15, 0, 1);
    const width = 222;
    const height = 23;
    const x = WIDTH / 2 - width / 2;
    const y = 78;

    ctx.save();
    ctx.globalAlpha = 0.72 + this.comboPulse * 0.24;
    ctx.fillStyle = 'rgba(4,9,22,0.84)';
    ctx.strokeStyle = rank.color;
    ctx.lineWidth = 1.2 + this.comboPulse;
    roundedRect(ctx, x, y, width, height, 7);
    ctx.fill();
    ctx.stroke();
    progressBar(ctx, x + 8, y + height - 5, width - 16, 3, ratio, rank.color, 'rgba(255,255,255,0.07)');
    label(ctx, `${rank.code}  ·  ×${this.combo}`, WIDTH / 2, y + 14, 9, rank.color, 900);
    ctx.restore();
  }

  drawFeedbackCallout() {
    if (!this.feedbackCallout || this.state === 'menu' || this.state === 'upgrade') return;
    const callout = this.feedbackCallout;
    const ratio = clamp(callout.life / callout.maxLife, 0, 1);
    const intro = clamp((1 - ratio) * 7, 0, 1);
    const alpha = Math.min(intro, ratio * 3);
    const width = 286;
    const height = 52;
    const x = WIDTH / 2 - width / 2;
    const tutorialVisible = this.state === 'playing' && this.wave === 1 && this.tutorialStep < 3;
    const y = tutorialVisible ? HEIGHT - 142 : HEIGHT - 92;
    const slide = (1 - intro) * 14;
    const ctx = this.ctx;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(0, slide);
    ctx.fillStyle = 'rgba(4,9,22,0.88)';
    ctx.strokeStyle = callout.color;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = callout.color;
    ctx.shadowBlur = 8;
    roundedRect(ctx, x, y, width, height, 8);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    label(ctx, callout.title, WIDTH / 2, y + 21, 13, callout.color, 900);
    label(ctx, callout.subtitle, WIDTH / 2, y + 40, 10, UI_COLORS.text, 800);
    ctx.restore();
  }

  getSnapshot() {
    const layout = compactHudLayout(WIDTH);
    return {
      ...super.getSnapshot(),
      uiLayoutVersion: UI_LAYOUT_VERSION,
      hudLayoutRevision: 'compact-safe-zone-hud',
      hudPanelHeight: layout.height,
      hudSafeBottom: layout.safeBottom,
      tutorialLayoutRevision: 'single-step-context-strip',
      reducedHudGlow: true,
    };
  }
}
