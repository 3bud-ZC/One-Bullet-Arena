import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from '../game-data.js';
import { RELEASE_VERSION } from '../release.js';
import { UI_COLORS, label } from '../ui-renderer.js';
import { OneBulletVisualOverhaulRuntime } from './visual-overhaul-runtime.js';

export const DASHBOARD_POLISH_RUNTIME_VERSION = '3.3.2-dashboard-composition';
export const DASHBOARD_POLISH_REVISION = 'tactical-command-hud-v7';

function techPath(ctx, x, y, w, h, cut = 14) {
  const c = Math.max(4, Math.min(cut, Math.min(w, h) / 3));
  ctx.beginPath();
  ctx.moveTo(x + c, y);
  ctx.lineTo(x + w - c, y);
  ctx.lineTo(x + w, y + c);
  ctx.lineTo(x + w, y + h - c);
  ctx.lineTo(x + w - c, y + h);
  ctx.lineTo(x + c, y + h);
  ctx.lineTo(x, y + h - c);
  ctx.lineTo(x, y + c);
  ctx.closePath();
}

function hexPath(ctx, cx, cy, radius) {
  ctx.beginPath();
  for (let index = 0; index < 6; index += 1) {
    const angle = Math.PI / 6 + index * Math.PI / 3;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export class OneBulletDashboardPolishRuntime extends OneBulletVisualOverhaulRuntime {
  constructor(canvas, liveRegion = null) {
    super(canvas, liveRegion);
    this.dashboardPolishRuntimeVersion = DASHBOARD_POLISH_RUNTIME_VERSION;
    this.checkpointDashboardRevision = DASHBOARD_POLISH_REVISION;
  }

  drawPanel(rect, accent, fill = 'rgba(2, 13, 29, 0.96)', glow = 4, cut = 15) {
    const ctx = this.ctx;
    ctx.save();
    if (glow > 0) {
      ctx.shadowColor = accent;
      ctx.shadowBlur = glow;
    }
    techPath(ctx, rect.x, rect.y, rect.w, rect.h, cut);
    const gradient = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    gradient.addColorStop(0, fill);
    gradient.addColorStop(0.6, 'rgba(2, 11, 25, 0.975)');
    gradient.addColorStop(1, 'rgba(1, 6, 17, 0.995)');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.45;
    ctx.stroke();

    techPath(ctx, rect.x + 6, rect.y + 6, rect.w - 12, rect.h - 12, Math.max(7, cut - 5));
    ctx.strokeStyle = 'rgba(118, 199, 255, 0.14)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.globalAlpha = 0.72;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(rect.x + 24, rect.y + 2.5);
    ctx.lineTo(rect.x + Math.min(176, rect.w * 0.31), rect.y + 2.5);
    ctx.moveTo(rect.x + rect.w - 24, rect.y + rect.h - 2.5);
    ctx.lineTo(rect.x + rect.w - Math.min(152, rect.w * 0.28), rect.y + rect.h - 2.5);
    ctx.stroke();
    ctx.restore();
  }

  drawHex(cx, cy, accent, glyph, radius = 22) {
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowColor = accent;
    ctx.shadowBlur = 9;
    hexPath(ctx, cx, cy, radius);
    ctx.fillStyle = 'rgba(3, 18, 35, 0.98)';
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.globalAlpha = 0.36;
    hexPath(ctx, cx, cy, radius - 5);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
    label(ctx, glyph, cx, cy + 6, Math.max(12, radius * 0.68), accent, 900);
    ctx.restore();
  }

  drawHeader(checkpoint) {
    const ctx = this.ctx;
    label(ctx, 'ONE BULLET ARENA', WIDTH / 2, 48, 12, '#36dcff', 900);

    ctx.save();
    ctx.shadowColor = 'rgba(81, 179, 255, 0.58)';
    ctx.shadowBlur = 10;
    label(ctx, 'حلبة الطلقة الواحدة', WIDTH / 2, 108, 44, UI_COLORS.text, 900);
    ctx.restore();

    const statusColor = checkpoint ? UI_COLORS.success : UI_COLORS.player;
    label(
      ctx,
      checkpoint ? 'نقطة الحفظ جاهزة  //  حفظ محلي' : 'جولة جديدة جاهزة  //  حفظ محلي',
      WIDTH / 2,
      151,
      12,
      statusColor,
      900,
    );

    ctx.save();
    ctx.strokeStyle = statusColor;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2 - 245, 162);
    ctx.lineTo(WIDTH / 2 - 85, 162);
    ctx.moveTo(WIDTH / 2 + 85, 162);
    ctx.lineTo(WIDTH / 2 + 245, 162);
    ctx.stroke();
    ctx.restore();
  }

  drawHeroModule(rect, checkpoint) {
    const ctx = this.ctx;
    const accent = checkpoint ? '#ffd640' : '#3dd6ff';
    this.drawPanel(rect, 'rgba(42, 174, 255, 0.52)', 'rgba(2, 15, 31, 0.72)', 0, 12);

    label(
      ctx,
      checkpoint ? 'نقطة الحفظ النشطة' : 'جولة جديدة',
      rect.x + rect.w / 2,
      rect.y + 28,
      11,
      checkpoint ? UI_COLORS.success : UI_COLORS.player,
      900,
    );

    ctx.save();
    const glow = ctx.createRadialGradient(rect.x + rect.w / 2, rect.y + 87, 10, rect.x + rect.w / 2, rect.y + 87, 230);
    glow.addColorStop(0, checkpoint ? 'rgba(255, 198, 43, 0.18)' : 'rgba(40, 199, 255, 0.14)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(rect.x + 36, rect.y + 36, rect.w - 72, 112);
    ctx.restore();

    const wave = checkpoint ? String(checkpoint.wave).padStart(2, '0') : '01';
    label(ctx, '»', rect.x + 122, rect.y + 98, 27, accent, 900);
    label(ctx, `WAVE ${wave}`, rect.x + rect.w / 2, rect.y + 107, 54, accent, 900);
    label(ctx, '«', rect.x + rect.w - 122, rect.y + 98, 27, accent, 900);

    label(
      ctx,
      checkpoint ? 'آخر نقطة حفظ جاهزة للمتابعة' : 'طلقة واحدة. استرجعها. واصل القتال.',
      rect.x + rect.w / 2,
      rect.y + 139,
      14,
      UI_COLORS.text,
      800,
    );
  }

  drawMetricCard(rect, glyph, title, value, accent = '#36c9ff') {
    const ctx = this.ctx;
    ctx.save();
    techPath(ctx, rect.x, rect.y, rect.w, rect.h, 9);
    ctx.fillStyle = 'rgba(3, 19, 39, 0.82)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(64, 181, 246, 0.34)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    this.drawHex(rect.x + 31, rect.y + rect.h / 2, accent, glyph, 16);
    label(ctx, title, rect.x + 58, rect.y + 22, 9, '#6ccbf4', 800, 'left');
    label(ctx, String(value), rect.x + 58, rect.y + 42, 14, '#b5e8ff', 900, 'left');
  }

  drawActionButton(rect, text, accent, action, options = {}) {
    const ctx = this.ctx;
    const hovered = this.menuHover(rect);
    const primary = Boolean(options.primary);
    const danger = Boolean(options.danger);
    const icon = options.icon || '';

    const fill = danger
      ? hovered ? 'rgba(72, 8, 24, 0.99)' : 'rgba(38, 5, 16, 0.97)'
      : primary
        ? hovered ? 'rgba(111, 78, 4, 0.995)' : 'rgba(68, 47, 4, 0.975)'
        : hovered ? 'rgba(7, 42, 77, 0.99)' : 'rgba(3, 19, 40, 0.97)';

    this.drawPanel(rect, accent, fill, hovered || primary ? 11 : 3, 12);

    if (primary) {
      ctx.save();
      const sheen = ctx.createLinearGradient(rect.x, 0, rect.x + rect.w, 0);
      sheen.addColorStop(0, 'rgba(255, 213, 50, 0)');
      sheen.addColorStop(0.5, 'rgba(255, 223, 92, 0.11)');
      sheen.addColorStop(1, 'rgba(255, 213, 50, 0)');
      ctx.fillStyle = sheen;
      techPath(ctx, rect.x + 8, rect.y + 8, rect.w - 16, rect.h - 16, 8);
      ctx.fill();
      ctx.restore();
    }

    if (icon) {
      label(ctx, icon, rect.x + 42, rect.y + rect.h / 2 + 8, primary ? 23 : 18, accent, 900);
    }
    label(
      ctx,
      text,
      rect.x + rect.w / 2 + (icon ? 12 : 0),
      rect.y + rect.h / 2 + 7,
      primary ? 18 : danger ? 12 : 15,
      primary ? '#ffe779' : danger ? '#ff7689' : '#80cfff',
      900,
    );
    this.addUiRegion(rect.x, rect.y, rect.w, rect.h, action);
  }

  drawRecordCard(rect, arTitle, enTitle, value, accent, glyph) {
    const ctx = this.ctx;
    this.drawPanel(rect, accent, 'rgba(2, 17, 35, 0.95)', 3, 12);
    this.drawHex(rect.x + 48, rect.y + rect.h / 2, accent, glyph, 22);

    const labelX = rect.x + 86;
    label(ctx, arTitle, labelX, rect.y + 34, 12, accent, 900, 'left');
    label(ctx, enTitle, labelX, rect.y + 55, 8, '#78c9ff', 900, 'left');

    const valueText = String(value);
    const valueSize = valueText.length >= 9 ? 17 : valueText.length >= 7 ? 19 : valueText.length >= 5 ? 21 : 25;
    label(ctx, valueText, rect.x + rect.w - 18, rect.y + rect.h / 2 + 10, valueSize, UI_COLORS.text, 900, 'right');
  }

  drawKeycap(x, y, text, accent = '#53c9ff') {
    const ctx = this.ctx;
    const width = text.length > 1 ? 48 : 30;
    ctx.save();
    techPath(ctx, x, y, width, 28, 5);
    ctx.fillStyle = 'rgba(3, 20, 39, 0.98)';
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.stroke();
    label(ctx, text, x + width / 2, y + 19, text.length > 1 ? 8 : 11, accent, 900);
    ctx.restore();
    return width;
  }

  drawBottomBar(checkpoint) {
    const ctx = this.ctx;
    const rect = { x: 184, y: 636, w: 912, h: 54 };
    this.drawPanel(rect, 'rgba(39, 166, 255, 0.76)', 'rgba(2, 12, 27, 0.98)', 2, 12);

    const divider = (x) => {
      ctx.fillStyle = 'rgba(89, 184, 241, 0.25)';
      ctx.fillRect(x, rect.y + 11, 1, 32);
    };

    const firstWidth = this.drawKeycap(rect.x + 34, rect.y + 13, checkpoint ? 'C' : 'ENTER');
    label(ctx, checkpoint ? 'متابعة الجولة' : 'ابدأ الجولة', rect.x + 34 + firstWidth + 22, rect.y + 34, 12, '#aedfff', 800, 'left');
    divider(rect.x + 296);

    this.drawKeycap(rect.x + 338, rect.y + 13, 'N');
    label(ctx, 'جولة جديدة', rect.x + 385, rect.y + 34, 12, '#aedfff', 800, 'left');
    divider(rect.x + 564);

    this.drawHex(rect.x + 626, rect.y + 27, '#38e59b', '▣', 15);
    label(ctx, 'التقدم يُحفظ محليًا', rect.x + 656, rect.y + 34, 12, '#aedfff', 800, 'left');
  }

  drawMenu() {
    const checkpoint = this.hasContinueCheckpoint() ? this.savedCheckpoint : null;
    const ctx = this.ctx;
    const main = { x: 112, y: 184, w: 700, h: 432 };
    const rail = { x: 830, y: 184, w: 338, h: 432 };

    this.drawDashboardBackdrop();
    this.drawOuterTechFrame();
    this.drawHeader(checkpoint);

    this.drawPanel(main, '#159fff', 'rgba(2, 14, 31, 0.97)', 5, 16);
    this.drawPanel(rail, '#159fff', 'rgba(2, 14, 31, 0.965)', 5, 16);

    label(ctx, 'سجلات الجولة', rail.x + rail.w / 2, rail.y + 38, 18, '#59caff', 900);
    ctx.fillStyle = 'rgba(45, 170, 245, 0.27)';
    ctx.fillRect(rail.x + 30, rail.y + 60, rail.w - 60, 1);

    const hero = { x: main.x + 34, y: main.y + 34, w: main.w - 68, h: 168 };
    this.drawHeroModule(hero, checkpoint);

    if (checkpoint) {
      const metricY = main.y + 216;
      this.drawMetricCard(
        { x: main.x + 70, y: metricY, w: 226, h: 54 },
        '⇈',
        'الترقيات',
        checkpoint.stats.upgrades.toLocaleString('en-US'),
      );
      this.drawMetricCard(
        { x: main.x + 404, y: metricY, w: 226, h: 54 },
        '◎',
        'نقاط الجولة',
        checkpoint.score.toLocaleString('en-US'),
      );

      this.drawActionButton(
        { x: main.x + 42, y: main.y + 286, w: main.w - 84, h: 56 },
        `متابعة الجولة من WAVE ${String(checkpoint.wave).padStart(2, '0')}`,
        '#ffd441',
        () => this.continueFromCheckpoint(),
        { primary: true, icon: '▶' },
      );
      this.drawActionButton(
        { x: main.x + 42, y: main.y + 352, w: main.w - 84, h: 42 },
        'جولة جديدة من البداية',
        '#278fe9',
        () => this.startRun(),
        { icon: '↻' },
      );
      this.drawActionButton(
        { x: main.x + 154, y: main.y + 402, w: main.w - 308, h: 28 },
        'حذف نقطة الحفظ',
        '#ff5065',
        () => this.clearCheckpoint(),
        { danger: true, icon: '▥' },
      );
    } else {
      label(ctx, 'FIRE  ·  RICOCHET  ·  RECALL  ·  SURVIVE', main.x + main.w / 2, main.y + 238, 10, '#72c6ef', 900);
      this.drawActionButton(
        { x: main.x + 42, y: main.y + 278, w: main.w - 84, h: 62 },
        'ابدأ الجولة',
        '#ffd441',
        () => this.startRun(),
        { primary: true, icon: '▶' },
      );
      label(ctx, 'WASD MOVE  ·  MOUSE FIRE  ·  Q RECALL  ·  SPACE DASH', main.x + main.w / 2, main.y + 392, 10, UI_COLORS.muted, 800);
    }

    const cardX = rail.x + 24;
    const cardW = rail.w - 48;
    this.drawRecordCard(
      { x: cardX, y: rail.y + 80, w: cardW, h: 90 },
      'أفضل موجة',
      'BEST WAVE',
      this.highWave,
      '#32c8ff',
      '⌾',
    );
    this.drawRecordCard(
      { x: cardX, y: rail.y + 185, w: cardW, h: 90 },
      'أعلى نتيجة',
      'HIGH SCORE',
      this.highScore.toLocaleString('en-US'),
      '#ffd441',
      '◎',
    );
    this.drawRecordCard(
      { x: cardX, y: rail.y + 290, w: cardW, h: 90 },
      checkpoint ? 'نقطة الحفظ' : 'حالة الحفظ',
      checkpoint ? 'CHECKPOINT' : 'SAVE STATUS',
      checkpoint ? `WAVE ${checkpoint.wave}` : 'EMPTY',
      checkpoint ? '#34ef9a' : '#6784a5',
      '▣',
    );

    this.drawBottomBar(checkpoint);
    label(ctx, `v${RELEASE_VERSION}`, WIDTH - 27, HEIGHT - 13, 8, '#5d91b9', 800, 'right');
  }

  getSnapshot() {
    return {
      ...super.getSnapshot(),
      dashboardPolishRuntimeVersion: DASHBOARD_POLISH_RUNTIME_VERSION,
      checkpointDashboardRevision: DASHBOARD_POLISH_REVISION,
      dashboardPolishActive: true,
      gameplayGeometryChanged: false,
      collisionGeometryChanged: false,
    };
  }
}
