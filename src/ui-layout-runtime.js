import { clamp } from './arena.js';
import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from './game-data.js';
import { OneBulletCombatFeedbackRuntime, comboFeedbackRank } from './combat-feedback-runtime.js';
import { bulletPresentationState } from './polish-runtime.js';
import { RELEASE_INFO, RELEASE_LABEL, RELEASE_VERSION } from './release.js';
import { UI_COLORS, label, panel, progressBar, roundedRect } from './ui-renderer.js';

export const UI_LAYOUT_VERSION = RELEASE_VERSION;

export function compactHudLayout(width = WIDTH) {
  const margin = 16;
  const gap = 14;
  const centerWidth = Math.min(420, Math.max(340, width * 0.328));
  const sideWidth = Math.max(1, (width - margin * 2 - gap * 2 - centerWidth) / 2);
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

export function bulletHudCopy(code = 'READY') {
  const copies = {
    READY: { title: 'IN HAND', subtitle: 'READY TO FIRE' },
    FIRED: { title: 'IN ARENA', subtitle: 'Q TO RECALL' },
    RETURNING: { title: 'RETURNING', subtitle: 'MOVE TO CATCH' },
  };
  return copies[code] || copies.READY;
}

export class OneBulletUiLayoutRuntime extends OneBulletCombatFeedbackRuntime {
  constructor(canvas, liveRegion = null) {
    super(canvas, liveRegion);
    this.version = RELEASE_VERSION;
    this.uiLayoutVersion = RELEASE_VERSION;
    this.releaseInfo = RELEASE_INFO;
  }

  drawHud() {
    const layout = compactHudLayout(WIDTH);
    const bulletState = bulletPresentationState(this.bullet);
    const recallMax = Math.max(1.15, 3.8 - this.stack('magnetic-recall') * 0.38);
    const dashMax = Math.max(0.36, 1.12 * Math.pow(0.86, this.stack('quick-dash')));
    const healthRatio = this.player.maxHealth > 0 ? this.player.health / this.player.maxHealth : 0;
    const recallRatio = 1 - this.bullet.recallCooldown / recallMax;
    const dashRatio = 1 - this.player.dashCooldown / dashMax;

    this.drawCompactPanel(layout.left, bulletState.color);
    this.drawBulletHud(layout.left, bulletState, recallRatio);
    this.drawCompactPanel(layout.center, UI_COLORS.borderBright);
    this.drawRunHud(layout.center);
    this.drawCompactPanel(layout.right, UI_COLORS.player);
    this.drawPilotHud(layout.right, healthRatio, dashRatio);

    if (this.state === 'playing' && this.wave === 1 && this.tutorialStep < 3) this.drawTutorial();
    if (this.clearBannerTimer > 0 && this.state === 'playing') this.drawWaveClearCallout();
    this.drawComboMomentum();
    this.drawFeedbackCallout();
  }

  drawCompactPanel(rect, accent) {
    panel(this.ctx, rect.x, rect.y, rect.w, rect.h, accent, 'rgba(4, 9, 22, 0.9)', 3);
    this.ctx.save();
    this.ctx.globalAlpha = 0.88;
    this.ctx.fillStyle = accent;
    roundedRect(this.ctx, rect.x + 10, rect.y, rect.w - 20, 2, 1);
    this.ctx.fill();
    this.ctx.globalAlpha = 0.1;
    const sheen = this.ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y);
    sheen.addColorStop(0, accent);
    sheen.addColorStop(0.42, 'rgba(255,255,255,0)');
    sheen.addColorStop(1, accent);
    this.ctx.fillStyle = sheen;
    roundedRect(this.ctx, rect.x + 2, rect.y + 2, rect.w - 4, 18, 7);
    this.ctx.fill();
    this.ctx.restore();
  }

  drawBulletHud(rect, bulletState, recallRatio) {
    const copy = bulletHudCopy(bulletState.code);
    const glyph = bulletState.code === 'READY' ? '●' : bulletState.code === 'RETURNING' ? '↺' : '→';
    this.drawStatusPill(rect.x + 14, rect.y + 9, 96, 22, `${glyph} ${bulletState.code}`, bulletState.color);
    label(this.ctx, copy.title, rect.x + rect.w - 16, rect.y + 25, 14, UI_COLORS.text, 900, 'right');
    label(this.ctx, copy.subtitle, rect.x + rect.w - 16, rect.y + 44, 9, UI_COLORS.muted, 850, 'right');
    progressBar(this.ctx, rect.x + 14, rect.y + rect.h - 7, rect.w - 28, 4, clamp(recallRatio, 0, 1), UI_COLORS.electric, 'rgba(255,255,255,0.07)');
  }

  drawRunHud(rect) {
    label(this.ctx, `WAVE ${String(this.wave).padStart(2, '0')}`, rect.x + rect.w / 2, rect.y + 27, 21, UI_COLORS.text, 900);
    label(this.ctx, `ENEMIES ${this.enemies.length}  ·  SCORE ${this.score.toLocaleString('en-US')}  ·  UPGRADES ${this.stats.upgrades}  ·  ARENA ${this.arenaStage.id + 1}/4`, rect.x + rect.w / 2, rect.y + 50, 9, this.combo > 1 ? UI_COLORS.bullet : UI_COLORS.muted, 850);
  }

  drawPilotHud(rect, healthRatio, dashRatio) {
    const shieldOnline = this.player.shield > 0;
    label(this.ctx, `HP ${this.player.health}/${this.player.maxHealth}`, rect.x + rect.w - 16, rect.y + 25, 15, UI_COLORS.text, 900, 'right');
    progressBar(this.ctx, rect.x + 14, rect.y + 31, rect.w - 28, 7, clamp(healthRatio, 0, 1), UI_COLORS.danger, 'rgba(255,255,255,0.07)');
    label(this.ctx, shieldOnline ? 'SHIELD' : 'DASH', rect.x + 14, rect.y + 52, 9, shieldOnline ? UI_COLORS.electric : UI_COLORS.muted, 900, 'left');
    progressBar(this.ctx, rect.x + 92, rect.y + 47, rect.w - 108, 5, clamp(dashRatio, 0, 1), UI_COLORS.player, 'rgba(255,255,255,0.07)');
  }

  drawStatusPill(x, y, width, height, text, color) {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(255,255,255,0.035)';
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1.2;
    roundedRect(this.ctx, x, y, width, height, height / 2);
    this.ctx.fill();
    this.ctx.stroke();
    label(this.ctx, text, x + width / 2, y + 15, 8, color, 900);
    this.ctx.restore();
  }

  drawTutorial() {
    const steps = this.touchMode
      ? [{ key: 'MOVE', title: 'اسحب العصا للتحرك' }, { key: 'TAP', title: 'المس الساحة للإطلاق' }, { key: 'RECALL', title: 'استدعِ الطلقة والتقطها' }]
      : [{ key: 'WASD', title: 'تحرك داخل الساحة' }, { key: 'MOUSE', title: 'صوّب واضغط للإطلاق' }, { key: 'Q', title: 'استدعِ الطلقة والتقطها' }];
    const current = steps[this.tutorialStep] || steps[0];
    const width = 430;
    const x = WIDTH / 2 - width / 2;
    const y = 80;
    panel(this.ctx, x, y, width, 42, UI_COLORS.bullet, 'rgba(4,9,22,0.9)', 3);
    this.drawStatusPill(x + 10, y + 9, 92, 24, current.key, UI_COLORS.bullet);
    label(this.ctx, current.title, x + width - 48, y + 27, 12, UI_COLORS.text, 850, 'right');
    label(this.ctx, `${this.tutorialStep + 1}/3`, x + width - 14, y + 27, 9, UI_COLORS.muted, 900, 'right');
  }

  drawComboMomentum() {
    if (this.state !== 'playing' || this.combo < 2 || (this.wave === 1 && this.tutorialStep < 3)) return;
    const rank = comboFeedbackRank(this.combo);
    const ratio = clamp(this.comboTimer / 2.15, 0, 1);
    const width = 222;
    const x = WIDTH / 2 - width / 2;
    const y = 78;
    this.ctx.save();
    this.ctx.globalAlpha = 0.72 + this.comboPulse * 0.24;
    this.ctx.fillStyle = 'rgba(4,9,22,0.84)';
    this.ctx.strokeStyle = rank.color;
    this.ctx.lineWidth = 1.2 + this.comboPulse;
    roundedRect(this.ctx, x, y, width, 23, 7);
    this.ctx.fill();
    this.ctx.stroke();
    progressBar(this.ctx, x + 8, y + 18, width - 16, 3, ratio, rank.color, 'rgba(255,255,255,0.07)');
    label(this.ctx, `${rank.code}  ·  ×${this.combo}`, WIDTH / 2, y + 14, 9, rank.color, 900);
    this.ctx.restore();
  }

  drawFeedbackCallout() {
    if (!this.feedbackCallout || this.state === 'menu' || this.state === 'upgrade') return;
    const callout = this.feedbackCallout;
    const ratio = clamp(callout.life / callout.maxLife, 0, 1);
    const intro = clamp((1 - ratio) * 7, 0, 1);
    const alpha = Math.min(intro, ratio * 3);
    const x = WIDTH / 2 - 143;
    const tutorialVisible = this.state === 'playing' && this.wave === 1 && this.tutorialStep < 3;
    const y = tutorialVisible ? HEIGHT - 142 : HEIGHT - 92;
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.translate(0, (1 - intro) * 14);
    this.ctx.fillStyle = 'rgba(4,9,22,0.88)';
    this.ctx.strokeStyle = callout.color;
    this.ctx.lineWidth = 1.5;
    this.ctx.shadowColor = callout.color;
    this.ctx.shadowBlur = 8;
    roundedRect(this.ctx, x, y, 286, 52, 8);
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;
    label(this.ctx, callout.title, WIDTH / 2, y + 21, 13, callout.color, 900);
    label(this.ctx, callout.subtitle, WIDTH / 2, y + 40, 10, UI_COLORS.text, 800);
    this.ctx.restore();
  }

  drawMenu() {
    const pulse = 1 + Math.sin(this.elapsed * 2.1) * 0.016;
    this.drawMenuOrbit();
    label(this.ctx, 'ONE BULLET ARENA', WIDTH / 2, 82, 13, UI_COLORS.player, 900);
    this.ctx.save();
    this.ctx.translate(WIDTH / 2, 166);
    this.ctx.scale(pulse, pulse);
    label(this.ctx, 'حلبة الطلقة', 0, 0, 62, UI_COLORS.text, 900);
    label(this.ctx, 'الواحدة', 0, 62, 62, UI_COLORS.bullet, 900);
    this.ctx.restore();
    label(this.ctx, 'ONE SHOT  ·  ONE RECALL  ·  KEEP MOVING', WIDTH / 2, 270, 11, UI_COLORS.muted, 900);
    label(this.ctx, 'استخدم الارتداد، استعد الطلقة، واصمد أمام الموجات المتصاعدة.', WIDTH / 2, 302, 16, UI_COLORS.text, 650);
    this.drawButton('ابدأ الجولة', WIDTH / 2 - 180, 336, 360, 60, () => this.startRun(), true);
    this.drawMenuFeatureCard(122, 430, 316, '01', 'أطلق', 'طلقة واحدة ذات ارتدادات دقيقة.', UI_COLORS.bullet);
    this.drawMenuFeatureCard(482, 430, 316, '02', 'استعد', 'استدعاء مغناطيسي يعيد سلاحك.', UI_COLORS.electric);
    this.drawMenuFeatureCard(842, 430, 316, '03', 'تطوّر', 'اختر قدرة واحدة بعد كل موجة.', UI_COLORS.player);
    this.drawStatChip(372, 596, 250, 'BEST WAVE', this.highWave);
    this.drawStatChip(658, 596, 250, 'HIGH SCORE', this.highScore.toLocaleString('en-US'));
    const controls = this.touchMode ? 'LEFT STICK MOVE  ·  TAP FIRE  ·  RIGHT BUTTONS RECALL / DASH' : 'WASD MOVE  ·  MOUSE FIRE  ·  Q RECALL  ·  SPACE DASH  ·  P PAUSE';
    label(this.ctx, controls, WIDTH / 2, 677, 10, UI_COLORS.muted, 800);
    label(this.ctx, RELEASE_LABEL, WIDTH - 24, 696, 10, '#7182a8', 800, 'right');
  }

  getSnapshot() {
    const layout = compactHudLayout(WIDTH);
    return {
      ...super.getSnapshot(),
      version: RELEASE_VERSION,
      releaseVersion: RELEASE_VERSION,
      releaseChannel: RELEASE_INFO.channel,
      releaseCacheName: RELEASE_INFO.cacheName,
      releaseSchemaVersion: RELEASE_INFO.schemaVersion,
      uiLayoutVersion: RELEASE_VERSION,
      hudLayoutRevision: 'compact-safe-zone-hud',
      hudPanelHeight: layout.height,
      hudSafeBottom: layout.safeBottom,
      tutorialLayoutRevision: 'single-step-context-strip',
      reducedHudGlow: true,
      bidiSafeHudStats: true,
      releaseLabelCorrected: true,
      interfaceLanguageMode: 'arabic-menu-english-technical-hud',
    };
  }
}
