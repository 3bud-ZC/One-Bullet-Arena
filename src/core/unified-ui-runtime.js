import { combatSafeZones, resolveCombatCircle } from '../arena.js';
import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from '../game-data.js';
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

  drawModalBackdrop(alpha = 0.8) {
    const ctx = this.ctx;
    const overlay = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    overlay.addColorStop(0, `rgba(1, 7, 15, ${Math.min(0.96, alpha + 0.07)})`);
    overlay.addColorStop(1, `rgba(0, 3, 9, ${alpha})`);
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  drawUpgradeSelection() {
    const ctx = this.ctx;
    this.drawModalBackdrop(0.76);

    drawText(ctx, 'UPGRADE PROTOCOL', WIDTH / 2, 48, 9, THEME.cyan, 900, 'center', 'ltr');
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

    drawText(ctx, 'CLICK A CARD   ·   1 / 2 / 3', WIDTH / 2, 606, 8.5, THEME.muted, 800, 'center', 'ltr');
  }

  drawUnifiedUpgradeCard(upgrade, index, rect) {
    const ctx = this.ctx;
    const hovered = this.menuHover(rect);
    const current = this.stack(upgrade.id);
    const accent = index === 1 ? THEME.gold : THEME.cyan;

    this.drawSurface(rect, {
      fill: hovered ? 'rgba(8, 31, 50, 0.97)' : THEME.surface,
      border: hovered ? accent : THEME.border,
      cut: 15,
      shadow: hovered ? 7 : 0,
      shadowColor: accent,
    });

    ctx.fillStyle = accent;
    ctx.globalAlpha = hovered ? 0.95 : 0.72;
    ctx.fillRect(rect.x + 22, rect.y + 18, 44, 2);
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
    this.drawModalBackdrop(0.82);
    const panel = { x: WIDTH / 2 - 260, y: 112, w: 520, h: 486 };
    this.drawSurface(panel, { fill: THEME.surface, border: THEME.border, cut: 16 });

    drawText(ctx, 'PAUSED', WIDTH / 2, panel.y + 48, 9, THEME.cyan, 900, 'center', 'ltr');
    drawText(ctx, 'متوقف مؤقتًا', WIDTH / 2, panel.y + 92, 30, THEME.text, 900);
    drawText(ctx, `WAVE ${this.wave}  ·  ${this.currentEncounter?.name || 'ضغط متوازن'}`, WIDTH / 2, panel.y + 122, 9, THEME.muted, 800);

    this.drawAction(
      { x: panel.x + 58, y: panel.y + 164, w: panel.w - 116, h: 58 },
      'pause-resume',
      'استكمال الجولة',
      () => this.resume(),
      { primary: true, icon: '▶' },
    );
    this.drawAction(
      { x: panel.x + 58, y: panel.y + 240, w: panel.w - 116, h: 46 },
      'pause-restart',
      'جولة جديدة',
      () => this.startRun(),
      { icon: '↻' },
    );
    this.drawAction(
      { x: panel.x + 58, y: panel.y + 302, w: panel.w - 116, h: 46 },
      'pause-menu',
      'القائمة الرئيسية',
      () => this.goToMenu(),
    );

    drawText(ctx, 'P / ESC   RESUME', WIDTH / 2, panel.y + 414, 8.5, THEME.muted, 800, 'center', 'ltr');
  }

  drawGameOver() {
    const ctx = this.ctx;
    const checkpoint = this.hasContinueCheckpoint() ? this.savedCheckpoint : null;
    this.drawModalBackdrop(0.87);
    const panel = { x: WIDTH / 2 - 330, y: 72, w: 660, h: 574 };
    this.drawSurface(panel, { fill: 'rgba(5, 16, 29, 0.97)', border: 'rgba(197, 82, 102, 0.42)', cut: 17 });

    drawText(ctx, 'RUN TERMINATED', WIDTH / 2, panel.y + 42, 9, THEME.red, 900, 'center', 'ltr');
    drawText(ctx, 'انتهت الجولة', WIDTH / 2, panel.y + 85, 31, THEME.text, 900);
    drawText(ctx, `WAVE ${this.wave}`, WIDTH / 2, panel.y + 118, 14, THEME.gold, 900, 'center', 'ltr');

    const statY = panel.y + 154;
    const stats = [
      ['SCORE', this.score.toLocaleString('en-US')],
      ['KILLS', this.stats.kills],
      ['TIME', formatRunTime(this.runTime)],
      ['UPGRADES', this.stats.upgrades],
    ];
    stats.forEach(([title, value], index) => {
      const x = panel.x + 48 + index * 142;
      drawText(ctx, title, x, statY, 7.5, THEME.muted, 900, 'left', 'ltr');
      drawText(ctx, value, x, statY + 27, 15, THEME.text, 900, 'left', 'ltr');
    });

    ctx.fillStyle = 'rgba(89, 164, 198, 0.14)';
    ctx.fillRect(panel.x + 48, panel.y + 210, panel.w - 96, 1);

    if (checkpoint) {
      drawText(ctx, `CHECKPOINT  WAVE ${checkpoint.wave}`, WIDTH / 2, panel.y + 246, 9, THEME.green, 900, 'center', 'ltr');
      this.drawAction(
        { x: panel.x + 80, y: panel.y + 274, w: panel.w - 160, h: 58 },
        'gameover-continue',
        `متابعة من WAVE ${checkpoint.wave}`,
        () => this.continueFromCheckpoint(),
        { primary: true, icon: '▶' },
      );
      this.drawAction(
        { x: panel.x + 80, y: panel.y + 350, w: panel.w - 160, h: 46 },
        'gameover-new',
        'جولة جديدة من البداية',
        () => this.startRun(),
        { icon: '↻' },
      );
      this.drawAction(
        { x: panel.x + 80, y: panel.y + 412, w: panel.w - 160, h: 42 },
        'gameover-menu',
        'القائمة الرئيسية',
        () => this.goToMenu(),
      );
    } else {
      this.drawAction(
        { x: panel.x + 80, y: panel.y + 274, w: panel.w - 160, h: 58 },
        'gameover-new',
        'العب من جديد',
        () => this.startRun(),
        { primary: true, icon: '↻' },
      );
      this.drawAction(
        { x: panel.x + 80, y: panel.y + 350, w: panel.w - 160, h: 46 },
        'gameover-menu',
        'القائمة الرئيسية',
        () => this.goToMenu(),
      );
    }
  }

  drawBanner() {
    if (!this.banner) return;
    const ctx = this.ctx;
    const alpha = Math.max(0, Math.min(1, this.banner.time * 1.45));
    const rect = { x: WIDTH / 2 - 230, y: 112, w: 460, h: 76 };
    ctx.save();
    ctx.globalAlpha = alpha;
    this.drawSurface(rect, {
      fill: 'rgba(4, 17, 30, 0.9)',
      border: this.arenaExpansionPulse > 0 ? 'rgba(99, 204, 233, 0.62)' : 'rgba(229, 189, 69, 0.46)',
      cut: 11,
    });
    drawText(ctx, this.banner.title, WIDTH / 2, rect.y + 31, 17, THEME.text, 900);
    drawText(ctx, this.banner.subtitle, WIDTH / 2, rect.y + 55, 10, THEME.goldText, 700);
    ctx.restore();
  }

  drawTouchControls() {
    const ctx = this.ctx;
    const origin = this.touchMove
      ? { x: this.touchMove.originX, y: this.touchMove.originY }
      : { x: TOUCH_LAYOUT.move.x, y: TOUCH_LAYOUT.move.y };

    ctx.save();
    ctx.globalAlpha = 0.66;
    ctx.fillStyle = 'rgba(6, 25, 40, 0.5)';
    ctx.strokeStyle = 'rgba(99, 204, 233, 0.62)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, TOUCH_LAYOUT.move.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    const knob = this.touchMove ? {
      x: origin.x + Math.max(-47, Math.min(47, this.touchMove.x - origin.x)),
      y: origin.y + Math.max(-47, Math.min(47, this.touchMove.y - origin.y)),
    } : origin;
    ctx.fillStyle = 'rgba(99, 204, 233, 0.34)';
    ctx.beginPath();
    ctx.arc(knob.x, knob.y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    this.drawUnifiedTouchButton(TOUCH_LAYOUT.dash.x, TOUCH_LAYOUT.dash.y, TOUCH_LAYOUT.dash.radius, 'DASH', THEME.cyan, () => { this.dashRequested = true; });
    this.drawUnifiedTouchButton(TOUCH_LAYOUT.recall.x, TOUCH_LAYOUT.recall.y, TOUCH_LAYOUT.recall.radius, 'RECALL', '#6fa7ff', () => this.recallBullet());
    this.drawUnifiedTouchButton(TOUCH_LAYOUT.pause.x, TOUCH_LAYOUT.pause.y, TOUCH_LAYOUT.pause.radius, 'II', THEME.muted, () => this.pause());
  }

  drawUnifiedTouchButton(x, y, radius, text, color, action) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(4, 18, 31, 0.72)';
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.76;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;
    drawText(ctx, text, x, y + 4, text.length > 4 ? 7 : 9, color, 900, 'center', 'ltr');
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
      cleanCameraRunTransitions: true,
      sectorVisualIdentity: true,
      cameraSafeZonesActive: true,
    };
  }
}
