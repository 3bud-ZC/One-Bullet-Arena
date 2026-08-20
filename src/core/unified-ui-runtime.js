import { combatSafeZones, resolveCombatCircle } from '../arena.js';
import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from '../game-data.js';
import { i18n } from '../i18n.js';
import {
  TOUCH_LAYOUT,
  UI_FONT,
  formatRunTime,
  upgradeEffectText,
  wrapRtl,
} from '../ui-renderer.js';
import { OneBulletWorldExpansionRuntime } from './world-expansion-runtime.js';

export const UNIFIED_UI_RUNTIME_VERSION = '3.4.0-unified-ui';

const THEME = Object.freeze({
  surface: 'rgba(4, 17, 30, 0.94)',
  surfaceSoft: 'rgba(5, 22, 37, 0.84)',
  border: 'rgba(77, 164, 202, 0.42)',
  cyan: '#63cce9',
  cyanBright: '#78ddf3',
  cyanSoft: '#92ccdf',
  gold: '#e5bd45',
  goldText: '#f5df88',
  green: '#57d59a',
  red: '#d86473',
  text: '#eef6f8',
  soft: '#b6cbd4',
  muted: '#7896a5',
});

const EXPANDED_PALETTES = Object.freeze([
  Object.freeze({ primary: '#70d8ff', secondary: '#4977d4', warm: '#e6ba57', danger: '#e35e78' }),
  Object.freeze({ primary: '#64dfc0', secondary: '#4588d8', warm: '#e3a85a', danger: '#e56570' }),
  Object.freeze({ primary: '#ab95ff', secondary: '#4b96d4', warm: '#e6c45d', danger: '#df617e' }),
  Object.freeze({ primary: '#e7c867', secondary: '#5ba4d2', warm: '#ed9d5e', danger: '#e76775' }),
]);

function drawText(ctx, text, x, y, size, color, weight = 700, align = 'center', direction = 'rtl') {
  ctx.save();
  ctx.direction = direction;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${weight} ${size}px ${UI_FONT}`;
  ctx.fillStyle = color;
  ctx.fillText(String(text), x, y);
  ctx.restore();
}

export class OneBulletUnifiedUiRuntime extends OneBulletWorldExpansionRuntime {
  constructor(canvas, liveRegion = null) {
    super(canvas, liveRegion);
    this.unifiedUiRuntimeVersion = UNIFIED_UI_RUNTIME_VERSION;
  }

  palette() {
    const stage = this.arenaStage?.id ?? 0;
    if (stage < 4) return super.palette();
    return EXPANDED_PALETTES[Math.min(EXPANDED_PALETTES.length - 1, stage - 4)];
  }

  startNextWave() {
    const restoringCheckpoint = Boolean(this.pendingCheckpoint);
    const startingFresh = this.wave <= 0;
    const result = super.startNextWave();

    if (this.worldCamera && (startingFresh || restoringCheckpoint)) {
      this.worldCamera.x = this.player.x;
      this.worldCamera.y = this.player.y;
      this.worldCamera.zoom = this.worldCamera.targetZoom;
      this.explorationTrail = [{ x: this.player.x, y: this.player.y }];
      this.explorationDistance = 0;
      this.lastExplorationPoint = { x: this.player.x, y: this.player.y };
    }

    if (restoringCheckpoint && this.banner) {
      this.banner.subtitle = 'تم استعادة التطويرات والتقدم عند بداية الموجة';
    }
    return result;
  }

  worldCombatSafeZones() {
    const zones = combatSafeZones(this.touchMode);
    if (!this.worldCamera) return zones;

    const zoom = Math.max(0.01, Number(this.worldCamera.zoom) || 1);
    return zones.map((zone) => {
      const topLeft = this.screenToWorld(zone.x, zone.y);
      return {
        ...zone,
        x: topLeft.x,
        y: topLeft.y,
        w: zone.w / zoom,
        h: zone.h / zoom,
      };
    });
  }

  constrainCombatCircle(circle) {
    resolveCombatCircle(
      circle,
      this.arenaStage.bounds,
      this.arenaStage.obstacles,
      this.worldCombatSafeZones(),
    );
  }

  sanitizeSpawnPoint(point, radius = 34) {
    const candidate = { x: point.x, y: point.y, radius };
    resolveCombatCircle(
      candidate,
      this.arenaStage.bounds,
      this.arenaStage.obstacles,
      this.worldCombatSafeZones(),
    );
    return { x: candidate.x, y: candidate.y };
  }

  drawHudBar(x, y, w, h, value, color) {
    const ctx = this.ctx;
    const ratio = Math.max(0, Math.min(1, Number(value) || 0));
    ctx.fillStyle = 'rgba(116, 169, 194, 0.14)';
    ctx.fillRect(x, y, w, h);
    if (ratio > 0) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w * ratio, h);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.fillRect(x, y, w * ratio, 1);
    }
  }

  drawCombatHudPanel(rect, accent = THEME.cyan) {
    this.drawSurface(rect, {
      fill: 'rgba(3, 15, 27, 0.88)',
      border: 'rgba(74, 161, 199, 0.4)',
      cut: 11,
      inner: 'rgba(85, 181, 217, 0.055)',
    });
    this.ctx.fillStyle = accent;
    this.ctx.globalAlpha = 0.68;
    this.ctx.fillRect(rect.x + 14, rect.y + 6, 66, 2);
    this.ctx.globalAlpha = 1;
  }

  drawHud() {
    const ctx = this.ctx;
    const h = 76;
    const left = { x: 18, y: 13, w: 340, h };
    const center = { x: 450, y: 13, w: 380, h };
    const right = { x: 922, y: 13, w: 340, h };

    const bulletColor = this.bullet.held ? THEME.gold : THEME.cyan;
    this.drawCombatHudPanel(left, bulletColor);
    this.drawCombatHudPanel(center, THEME.cyan);
    this.drawCombatHudPanel(right, this.player.health <= Math.max(1, this.player.maxHealth * 0.34) ? THEME.red : THEME.green);

    const bulletIcon = { x: left.x + 16, y: left.y + 17, w: 38, h: 38 };
    this.drawSurface(bulletIcon, {
      fill: 'rgba(3, 13, 23, 0.9)',
      border: this.bullet.held ? 'rgba(229, 189, 69, 0.58)' : 'rgba(99, 204, 233, 0.5)',
      cut: 9,
    });
    ctx.save();
    ctx.beginPath();
    ctx.arc(bulletIcon.x + 19, bulletIcon.y + 19, this.bullet.held ? 5 : 4, 0, Math.PI * 2);
    ctx.fillStyle = bulletColor;
    ctx.fill();
    ctx.restore();

    const bulletTitle = this.bullet.held ? 'الطلقة جاهزة' : this.bullet.recalling ? 'الطلقة عائدة' : 'الطلقة في الميدان';
    drawText(ctx, bulletTitle, left.x + left.w - 17, left.y + 29, 11.5, bulletColor, 900, 'right');
    drawText(
      ctx,
      this.bullet.held ? 'READY TO FIRE' : this.bullet.recalling ? 'RETURNING' : 'Q  RECALL',
      left.x + left.w - 17,
      left.y + 48,
      7.2,
      THEME.muted,
      900,
      'right',
      'ltr',
    );
    const recallMax = Math.max(0.75, 3.8 - this.stack('magnetic-recall') * 0.52);
    const recallRatio = this.bullet.held ? 1 : 1 - this.bullet.recallCooldown / recallMax;
    this.drawHudBar(left.x + 67, left.y + 61, left.w - 84, 4, recallRatio, bulletColor);

    drawText(ctx, `WAVE ${String(this.wave).padStart(2, '0')}`, center.x + center.w / 2, center.y + 28, 17, THEME.text, 900, 'center', 'ltr');
    drawText(ctx, this.currentEncounter?.name || 'ضغط متوازن', center.x + center.w / 2, center.y + 49, 9.5, THEME.goldText, 850);
    drawText(
      ctx,
      `${this.enemies.length} ENEMIES   ·   ${this.score.toLocaleString('en-US')} SCORE   ·   S${this.arenaStage.id + 1}`,
      center.x + center.w / 2,
      center.y + 67,
      7,
      THEME.muted,
      850,
      'center',
      'ltr',
    );

    const healthRatio = this.player.maxHealth > 0 ? this.player.health / this.player.maxHealth : 0;
    const healthColor = healthRatio <= 0.34 ? THEME.red : '#ef7d87';
    drawText(ctx, `HP ${this.player.health}/${this.player.maxHealth}`, right.x + 18, right.y + 29, 11.5, THEME.text, 900, 'left', 'ltr');
    drawText(
      ctx,
      this.player.shield > 0 ? 'SHIELD ACTIVE' : `${this.stats.upgrades} UPGRADES`,
      right.x + right.w - 18,
      right.y + 29,
      7.4,
      this.player.shield > 0 ? THEME.cyanBright : THEME.muted,
      900,
      'right',
      'ltr',
    );
    drawText(ctx, 'HEALTH', right.x + 18, right.y + 47, 6.5, THEME.muted, 900, 'left', 'ltr');
    this.drawHudBar(right.x + 68, right.y + 43, right.w - 86, 6, healthRatio, healthColor);
    const dashMax = Math.max(0.36, 1.12 * Math.pow(0.86, this.stack('quick-dash')));
    drawText(ctx, 'DASH', right.x + 18, right.y + 66, 6.5, THEME.muted, 900, 'left', 'ltr');
    this.drawHudBar(right.x + 68, right.y + 62, right.w - 86, 4, 1 - this.player.dashCooldown / dashMax, THEME.cyan);

    if (!this.touchMode && this.arenaStage.id >= 4) this.drawMiniMap();
    if (this.state === 'playing' && this.wave === 1 && this.tutorialStep < 3) this.drawTutorial();
  }

  drawMiniMap() {
    const ctx = this.ctx;
    const rect = { x: WIDTH - 206, y: 104, w: 188, h: 116 };
    this.drawSurface(rect, {
      fill: 'rgba(3, 15, 27, 0.86)',
      border: 'rgba(74, 161, 199, 0.34)',
      cut: 10,
      inner: 'rgba(82, 173, 208, 0.05)',
    });

    ctx.fillStyle = 'rgba(99, 204, 233, 0.62)';
    ctx.fillRect(rect.x + 13, rect.y + 6, 58, 2);
    drawText(ctx, `SECTOR ${this.arenaStage.id + 1}`, rect.x + 13, rect.y + 18, 6.8, THEME.cyanSoft, 900, 'left', 'ltr');
    drawText(ctx, 'TACTICAL MAP', rect.x + rect.w - 13, rect.y + 18, 6.2, THEME.muted, 850, 'right', 'ltr');

    const bounds = this.arenaStage.bounds;
    const inner = { x: rect.x + 12, y: rect.y + 29, w: rect.w - 24, h: rect.h - 41 };
    const scale = Math.min(inner.w / bounds.w, inner.h / bounds.h);
    const mapW = bounds.w * scale;
    const mapH = bounds.h * scale;
    const mapX = inner.x + (inner.w - mapW) / 2;
    const mapY = inner.y + (inner.h - mapH) / 2;
    const project = (point) => ({
      x: mapX + (point.x - bounds.x) * scale,
      y: mapY + (point.y - bounds.y) * scale,
    });

    ctx.fillStyle = 'rgba(45, 86, 112, 0.11)';
    ctx.fillRect(mapX, mapY, mapW, mapH);
    ctx.strokeStyle = 'rgba(93, 177, 210, 0.38)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mapX, mapY, mapW, mapH);

    ctx.fillStyle = 'rgba(87, 213, 154, 0.28)';
    for (const point of this.explorationTrail) {
      const p = project(point);
      if (p.x < mapX || p.x > mapX + mapW || p.y < mapY || p.y > mapY + mapH) continue;
      ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
    }

    const viewport = this.viewportWorldBounds();
    const view = project(viewport);
    ctx.strokeStyle = 'rgba(229, 189, 69, 0.66)';
    ctx.strokeRect(view.x, view.y, viewport.w * scale, viewport.h * scale);

    const player = project(this.player);
    ctx.save();
    ctx.shadowColor = THEME.cyan;
    ctx.shadowBlur = 6;
    ctx.fillStyle = THEME.cyanBright;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawModalBackdrop(alpha = 0.76) {
    const ctx = this.ctx;
    const overlay = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    overlay.addColorStop(0, `rgba(1, 7, 15, ${Math.min(0.94, alpha + 0.08)})`);
    overlay.addColorStop(0.52, `rgba(0, 5, 12, ${alpha})`);
    overlay.addColorStop(1, `rgba(0, 3, 9, ${Math.min(0.96, alpha + 0.04)})`);
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const focus = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 40, WIDTH / 2, HEIGHT / 2, 430);
    focus.addColorStop(0, 'rgba(61, 151, 190, 0.08)');
    focus.addColorStop(0.58, 'rgba(29, 91, 120, 0.028)');
    focus.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = focus;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.strokeStyle = 'rgba(87, 171, 204, 0.035)';
    ctx.lineWidth = 1;
    for (let x = 80; x < WIDTH; x += 120) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
    }
  }

  drawModalMetric(rect, label, value, accent = THEME.cyan) {
    this.drawSurface(rect, {
      fill: 'rgba(4, 19, 32, 0.78)',
      border: 'rgba(78, 160, 194, 0.24)',
      cut: 8,
      inner: 'rgba(78, 160, 194, 0.045)',
    });

    this.ctx.fillStyle = accent;
    this.ctx.globalAlpha = 0.8;
    this.ctx.fillRect(rect.x + 12, rect.y + 10, 2, rect.h - 20);
    this.ctx.globalAlpha = 1;
    drawText(this.ctx, label, rect.x + rect.w - 15, rect.y + 18, 7.2, THEME.muted, 900, 'right', 'ltr');
    drawText(this.ctx, value, rect.x + rect.w - 15, rect.y + 39, 13.5, THEME.text, 900, 'right', 'ltr');
  }

  drawUpgradeSelection() {
    const ctx = this.ctx;
    this.drawModalBackdrop(0.72);

    ctx.fillStyle = 'rgba(99, 204, 233, 0.22)';
    ctx.fillRect(WIDTH / 2 - 250, 36, 155, 1);
    ctx.fillRect(WIDTH / 2 + 95, 36, 155, 1);
    drawText(ctx, 'UPGRADE PROTOCOL', WIDTH / 2, 48, 9, THEME.cyanBright, 900, 'center', 'ltr');
    drawText(ctx, 'اختر تطويرًا واحدًا', WIDTH / 2, 88, 32, THEME.text, 900);
    drawText(ctx, `WAVE ${this.wave} CLEARED  ·  BUILD ${this.stats.upgrades + 1}`, WIDTH / 2, 112, 8.5, THEME.muted, 800, 'center', 'ltr');

    const cardW = 338;
    const cardH = 430;
    const gap = 28;
    const total = this.upgradeChoices.length * cardW + Math.max(0, this.upgradeChoices.length - 1) * gap;
    const startX = WIDTH / 2 - total / 2;
    const y = 142;

    this.upgradeChoices.forEach((upgrade, index) => {
      this.drawUnifiedUpgradeCard(upgrade, index, { x: startX + index * (cardW + gap), y, w: cardW, h: cardH });
    });

    drawText(ctx, 'CLICK A CARD   ·   1 / 2 / 3', WIDTH / 2, 608, 8.5, THEME.muted, 800, 'center', 'ltr');
  }

  drawUnifiedUpgradeCard(upgrade, index, rect) {
    const ctx = this.ctx;
    const hovered = this.menuHover(rect);
    const current = this.stack(upgrade.id);
    const accent = index === 1 ? THEME.gold : THEME.cyan;

    this.drawSurface(rect, {
      fill: hovered ? 'rgba(8, 31, 50, 0.98)' : THEME.surface,
      border: hovered ? accent : THEME.border,
      cut: 15,
      shadow: hovered ? 8 : 0,
      shadowColor: accent,
      inner: hovered ? `${accent}18` : 'rgba(89, 177, 211, 0.045)',
    });

    ctx.fillStyle = accent;
    ctx.globalAlpha = hovered ? 0.98 : 0.74;
    ctx.fillRect(rect.x + 22, rect.y + 18, 54, 2);
    ctx.fillRect(rect.x + rect.w - 76, rect.y + rect.h - 20, 54, 2);
    ctx.globalAlpha = 1;

    drawText(ctx, `0${index + 1}`, rect.x + 24, rect.y + 48, 10, accent, 900, 'left', 'ltr');
    drawText(ctx, upgrade.tag, rect.x + rect.w - 24, rect.y + 48, 10, accent, 900, 'right');
    wrapRtl(ctx, upgrade.name, rect.x + rect.w - 24, rect.y + 98, rect.w - 48, 32, 24, THEME.text, 900, 2);
    wrapRtl(ctx, upgrade.description, rect.x + rect.w - 24, rect.y + 166, rect.w - 48, 25, 14, THEME.soft, 600, 3);

    ctx.fillStyle = 'rgba(90, 168, 202, 0.16)';
    ctx.fillRect(rect.x + 24, rect.y + 254, rect.w - 48, 1);
    drawText(ctx, 'التأثير', rect.x + rect.w - 24, rect.y + 282, 9, THEME.cyanSoft, 800, 'right');
    wrapRtl(ctx, upgradeEffectText(upgrade, current), rect.x + rect.w - 24, rect.y + 310, rect.w - 48, 21, 12, THEME.soft, 700, 3);

    drawText(ctx, `LEVEL ${current} / ${upgrade.maxStacks}`, rect.x + 24, rect.y + rect.h - 27, 8.5, THEME.muted, 900, 'left', 'ltr');
    drawText(ctx, hovered ? 'SELECT' : 'READY', rect.x + rect.w - 24, rect.y + rect.h - 27, 8.5, hovered ? accent : THEME.muted, 900, 'right', 'ltr');

    this.addUiRegion(rect.x, rect.y, rect.w, rect.h, () => this.chooseUpgrade(index));
  }

  drawPause() {
    const ctx = this.ctx;
    this.drawModalBackdrop(0.68);

    const panel = { x: WIDTH / 2 - 300, y: 145, w: 600, h: 432 };
    this.drawSurface(panel, {
      fill: 'rgba(4, 16, 29, 0.97)',
      border: 'rgba(88, 184, 219, 0.48)',
      cut: 17,
      inner: 'rgba(92, 189, 225, 0.065)',
      shadow: 10,
      shadowColor: 'rgba(49, 147, 183, 0.48)',
    });

    ctx.fillStyle = 'rgba(99, 204, 233, 0.75)';
    ctx.fillRect(panel.x + 24, panel.y + 7, 92, 2);
    ctx.fillStyle = 'rgba(229, 189, 69, 0.55)';
    ctx.fillRect(panel.x + panel.w - 116, panel.y + panel.h - 9, 92, 2);

    drawText(ctx, 'TACTICAL PAUSE', WIDTH / 2, panel.y + 39, 8.5, THEME.cyanBright, 900, 'center', 'ltr');
    drawText(ctx, 'متوقف مؤقتًا', WIDTH / 2, panel.y + 78, 30, THEME.text, 900);
    drawText(ctx, 'تم حفظ حالة الجولة الحالية مؤقتًا', WIDTH / 2, panel.y + 103, 9.5, THEME.soft, 650);

    const metricY = panel.y + 122;
    const metricW = 150;
    const gap = 14;
    const metricsX = panel.x + 54;
    this.drawModalMetric({ x: metricsX, y: metricY, w: metricW, h: 50 }, 'WAVE', String(this.wave).padStart(2, '0'), THEME.gold);
    this.drawModalMetric({ x: metricsX + metricW + gap, y: metricY, w: metricW, h: 50 }, 'SCORE', this.score.toLocaleString('en-US'), THEME.cyan);
    this.drawModalMetric({ x: metricsX + (metricW + gap) * 2, y: metricY, w: metricW, h: 50 }, 'SECTOR', String((this.arenaStage?.id ?? 0) + 1).padStart(2, '0'), THEME.green);

    this.drawAction(
      { x: panel.x + 72, y: panel.y + 190, w: panel.w - 144, h: 58 },
      'pause-resume',
      'استكمال الجولة',
      () => this.resume(),
      { primary: true, icon: '▶', badge: `WAVE ${String(this.wave).padStart(2, '0')}` },
    );
    this.drawAction(
      { x: panel.x + 72, y: panel.y + 264, w: panel.w - 144, h: 44 },
      'pause-restart',
      'بدء جولة جديدة',
      () => this.startRun(),
      { icon: '↻' },
    );
    this.drawAction(
      { x: panel.x + 72, y: panel.y + 322, w: panel.w - 144, h: 44 },
      'pause-menu',
      'العودة إلى القائمة الرئيسية',
      () => this.goToMenu(),
    );

    ctx.fillStyle = 'rgba(89, 168, 201, 0.14)';
    ctx.fillRect(panel.x + 72, panel.y + 388, panel.w - 144, 1);
    drawText(ctx, 'P / ESC   RESUME', panel.x + 90, panel.y + 414, 8, THEME.muted, 900, 'left', 'ltr');
    drawText(ctx, 'F   FULLSCREEN', panel.x + panel.w - 90, panel.y + 414, 8, THEME.muted, 900, 'right', 'ltr');
  }

  drawGameOver() {
    const ctx = this.ctx;
    const checkpoint = this.hasContinueCheckpoint() ? this.savedCheckpoint : null;
    this.drawModalBackdrop(0.78);
    const panel = { x: WIDTH / 2 - 350, y: 78, w: 700, h: 560 };
    this.drawSurface(panel, {
      fill: 'rgba(5, 16, 29, 0.98)',
      border: 'rgba(211, 91, 111, 0.48)',
      cut: 17,
      inner: 'rgba(211, 91, 111, 0.055)',
      shadow: 9,
      shadowColor: 'rgba(163, 45, 67, 0.36)',
    });

    ctx.fillStyle = 'rgba(216, 100, 115, 0.72)';
    ctx.fillRect(panel.x + 24, panel.y + 7, 104, 2);
    ctx.fillStyle = 'rgba(229, 189, 69, 0.52)';
    ctx.fillRect(panel.x + panel.w - 128, panel.y + panel.h - 9, 104, 2);

    drawText(ctx, 'RUN TERMINATED', WIDTH / 2, panel.y + 38, 9, THEME.red, 900, 'center', 'ltr');
    drawText(ctx, 'انتهت الجولة', WIDTH / 2, panel.y + 79, 31, THEME.text, 900);
    drawText(ctx, `WAVE ${this.wave}`, WIDTH / 2, panel.y + 108, 13, THEME.gold, 900, 'center', 'ltr');

    const statY = panel.y + 137;
    const metricW = 136;
    const gap = 12;
    const metricX = panel.x + 54;
    this.drawModalMetric({ x: metricX, y: statY, w: metricW, h: 52 }, 'SCORE', this.score.toLocaleString('en-US'), THEME.gold);
    this.drawModalMetric({ x: metricX + (metricW + gap), y: statY, w: metricW, h: 52 }, 'KILLS', String(this.stats.kills), THEME.cyan);
    this.drawModalMetric({ x: metricX + (metricW + gap) * 2, y: statY, w: metricW, h: 52 }, 'TIME', formatRunTime(this.runTime), THEME.green);
    this.drawModalMetric({ x: metricX + (metricW + gap) * 3, y: statY, w: metricW, h: 52 }, 'UPGRADES', String(this.stats.upgrades), THEME.cyanSoft);

    ctx.fillStyle = 'rgba(89, 164, 198, 0.14)';
    ctx.fillRect(panel.x + 54, panel.y + 211, panel.w - 108, 1);

    if (checkpoint) {
      drawText(ctx, `CHECKPOINT  ·  WAVE ${checkpoint.wave}`, WIDTH / 2, panel.y + 241, 9, THEME.green, 900, 'center', 'ltr');
      this.drawAction(
        { x: panel.x + 92, y: panel.y + 266, w: panel.w - 184, h: 58 },
        'gameover-continue',
        `متابعة من الموجة ${checkpoint.wave}`,
        () => this.continueFromCheckpoint(),
        { primary: true, icon: '▶', badge: `WAVE ${String(checkpoint.wave).padStart(2, '0')}` },
      );
      this.drawAction(
        { x: panel.x + 92, y: panel.y + 340, w: panel.w - 184, h: 45 },
        'gameover-new',
        'بدء جولة جديدة من البداية',
        () => this.startRun(),
        { icon: '↻' },
      );
      this.drawAction(
        { x: panel.x + 92, y: panel.y + 399, w: panel.w - 184, h: 43 },
        'gameover-menu',
        'العودة إلى القائمة الرئيسية',
        () => this.goToMenu(),
      );
    } else {
      this.drawAction(
        { x: panel.x + 92, y: panel.y + 274, w: panel.w - 184, h: 58 },
        'gameover-new',
        'ابدأ جولة جديدة',
        () => this.startRun(),
        { primary: true, icon: '↻', badge: 'WAVE 01' },
      );
      this.drawAction(
        { x: panel.x + 92, y: panel.y + 348, w: panel.w - 184, h: 45 },
        'gameover-menu',
        'العودة إلى القائمة الرئيسية',
        () => this.goToMenu(),
      );
    }

    drawText(ctx, 'ENTER   PRIMARY ACTION   ·   N   NEW RUN', WIDTH / 2, panel.y + 518, 8, THEME.muted, 850, 'center', 'ltr');
  }

  drawBanner() {
    if (!this.banner) return;
    const ctx = this.ctx;
    const alpha = Math.max(0, Math.min(1, this.banner.time * 1.45));
    const rect = { x: WIDTH / 2 - 230, y: 112, w: 460, h: 76 };
    ctx.save();
    ctx.globalAlpha = alpha;
    this.drawSurface(rect, {
      fill: 'rgba(4, 17, 30, 0.93)',
      border: this.arenaExpansionPulse > 0 ? 'rgba(99, 204, 233, 0.7)' : 'rgba(229, 189, 69, 0.52)',
      cut: 11,
      inner: this.arenaExpansionPulse > 0 ? 'rgba(99, 204, 233, 0.07)' : 'rgba(229, 189, 69, 0.06)',
    });
    ctx.fillStyle = this.arenaExpansionPulse > 0 ? 'rgba(99, 204, 233, 0.66)' : 'rgba(229, 189, 69, 0.58)';
    ctx.fillRect(rect.x + 18, rect.y + 6, 82, 2);
    drawText(ctx, this.banner.title, WIDTH / 2, rect.y + 31, 17, THEME.text, 900);
    drawText(ctx, this.banner.subtitle, WIDTH / 2, rect.y + 55, 10, THEME.goldText, 700);
    ctx.restore();
  }

  drawTouchControls() {
    const ctx = this.ctx;
    const origin = this.touchMove
      ? { x: this.touchMove.originX, y: this.touchMove.originY }
      : { x: TOUCH_LAYOUT.move.x, y: TOUCH_LAYOUT.move.y };
    const touchVector = this.touchMove
      ? {
        x: Math.max(-72, Math.min(72, this.touchMove.x - this.touchMove.originX)),
        y: Math.max(-72, Math.min(72, this.touchMove.y - this.touchMove.originY)),
      }
      : { x: 0, y: 0 };
    const touchMagnitude = Math.min(1, Math.hypot(touchVector.x, touchVector.y) / 72);

    ctx.save();
    ctx.globalAlpha = 0.78;
    ctx.fillStyle = 'rgba(4, 16, 29, 0.58)';
    ctx.strokeStyle = this.touchMove ? 'rgba(120, 221, 243, 0.92)' : 'rgba(99, 204, 233, 0.58)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, TOUCH_LAYOUT.move.radius + 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 0.32 + touchMagnitude * 0.36;
    ctx.strokeStyle = THEME.gold;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, TOUCH_LAYOUT.move.radius + 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * touchMagnitude);
    ctx.stroke();
    const knob = this.touchMove ? {
      x: origin.x + Math.max(-47, Math.min(47, this.touchMove.x - this.touchMove.originX)),
      y: origin.y + Math.max(-47, Math.min(47, this.touchMove.y - this.touchMove.originY)),
    } : origin;
    ctx.globalAlpha = 0.86;
    ctx.fillStyle = this.touchMove ? 'rgba(120, 221, 243, 0.62)' : 'rgba(99, 204, 233, 0.34)';
    ctx.beginPath();
    ctx.arc(knob.x, knob.y, this.touchMove ? 25 : 21, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (this.touchAim) this.drawTouchAimIndicator();

    const dashReady = this.player.dashCooldown <= 0;
    const recallReady = this.bullet.held || this.bullet.recallCooldown <= 0;
    this.drawUnifiedTouchButton(
      TOUCH_LAYOUT.dash.x,
      TOUCH_LAYOUT.dash.y,
      TOUCH_LAYOUT.dash.radius,
      dashReady ? i18n.t('touch.dash') : this.player.dashCooldown.toFixed(1),
      THEME.cyan,
      () => { this.dashRequested = true; },
      dashReady,
    );
    this.drawUnifiedTouchButton(
      TOUCH_LAYOUT.recall.x,
      TOUCH_LAYOUT.recall.y,
      TOUCH_LAYOUT.recall.radius,
      i18n.t('touch.recall'),
      '#6fa7ff',
      () => this.recallBullet(),
      recallReady,
    );
    this.drawUnifiedTouchButton(TOUCH_LAYOUT.pause.x, TOUCH_LAYOUT.pause.y, TOUCH_LAYOUT.pause.radius, 'II', THEME.muted, () => this.pause(), true);
  }

  drawTouchAimIndicator() {
    const ctx = this.ctx;
    const aimX = Math.max(18, Math.min(WIDTH - 18, this.pointer.x));
    const aimY = Math.max(18, Math.min(HEIGHT - 18, this.pointer.y));
    const player = this.player || { x: WIDTH / 2, y: HEIGHT / 2 };
    ctx.save();
    ctx.globalAlpha = 0.58;
    ctx.strokeStyle = 'rgba(245, 223, 136, 0.72)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(aimX, aimY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.82;
    ctx.strokeStyle = THEME.goldText;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(aimX, aimY, 23, 0, Math.PI * 2);
    ctx.moveTo(aimX - 34, aimY);
    ctx.lineTo(aimX - 12, aimY);
    ctx.moveTo(aimX + 12, aimY);
    ctx.lineTo(aimX + 34, aimY);
    ctx.moveTo(aimX, aimY - 34);
    ctx.lineTo(aimX, aimY - 12);
    ctx.moveTo(aimX, aimY + 12);
    ctx.lineTo(aimX, aimY + 34);
    ctx.stroke();
    ctx.restore();
  }

  drawUnifiedTouchButton(x, y, radius, text, color, action, ready = true) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = ready ? 'rgba(4, 18, 31, 0.82)' : 'rgba(4, 18, 31, 0.52)';
    ctx.strokeStyle = ready ? color : 'rgba(120, 150, 165, 0.55)';
    ctx.globalAlpha = ready ? 0.86 : 0.62;
    ctx.lineWidth = ready ? 2.4 : 1.8;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha *= 0.24;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x - radius * 0.18, y - radius * 0.18, radius * 0.58, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    drawText(ctx, text, x, y + 4, String(text).length > 5 ? 8 : 10, ready ? color : THEME.muted, 900, 'center', i18n.isRtl ? 'rtl' : 'ltr');
    ctx.restore();
    this.addUiRegion(x - radius, y - radius, radius * 2, radius * 2, action);
  }

  getSnapshot() {
    return {
      ...super.getSnapshot(),
      unifiedUiRuntimeVersion: UNIFIED_UI_RUNTIME_VERSION,
      unifiedInterfaceLanguage: true,
      unifiedUpgradeCards: true,
      unifiedPauseOverlay: true,
      unifiedGameOverOverlay: true,
      unifiedTouchControls: true,
      mobileCombatTouchHud: true,
      cleanCameraRunTransitions: true,
      sectorVisualIdentity: true,
      cameraSafeZonesActive: true,
    };
  }
}
