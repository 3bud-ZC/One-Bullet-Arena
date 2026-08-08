import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from '../game-data.js';
import { RELEASE_VERSION } from '../release.js';
import { UI_COLORS, label } from '../ui-renderer.js';
import { OneBulletVisualOverhaulRuntime } from './visual-overhaul-runtime.js';

export const DASHBOARD_POLISH_RUNTIME_VERSION = '3.3.1-dashboard-polish';
export const DASHBOARD_POLISH_REVISION = 'tactical-command-hud-v6';

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

  drawPolishPanel(rect, accent, fill = 'rgba(2, 13, 29, 0.95)', glow = 4) {
    const ctx = this.ctx;
    ctx.save();
    if (glow > 0) {
      ctx.shadowColor = accent;
      ctx.shadowBlur = glow;
    }
    techPath(ctx, rect.x, rect.y, rect.w, rect.h, 15);
    const gradient = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    gradient.addColorStop(0, fill);
    gradient.addColorStop(0.55, 'rgba(2, 12, 27, 0.965)');
    gradient.addColorStop(1, 'rgba(1, 7, 18, 0.99)');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.35;
    ctx.stroke();

    techPath(ctx, rect.x + 6, rect.y + 6, rect.w - 12, rect.h - 12, 10);
    ctx.strokeStyle = 'rgba(103, 191, 255, 0.13)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(rect.x + 22, rect.y + 2.5);
    ctx.lineTo(rect.x + Math.min(155, rect.w * 0.3), rect.y + 2.5);
    ctx.moveTo(rect.x + rect.w - 22, rect.y + rect.h - 2.5);
    ctx.lineTo(rect.x + rect.w - Math.min(132, rect.w * 0.27), rect.y + rect.h - 2.5);
    ctx.stroke();
    ctx.restore();
  }

  drawPolishHex(cx, cy, accent, glyph, radius = 22) {
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowColor = accent;
    ctx.shadowBlur = 8;
    hexPath(ctx, cx, cy, radius);
    ctx.fillStyle = 'rgba(3, 18, 34, 0.97)';
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.35;
    ctx.stroke();
    ctx.shadowBlur = 0;
    label(ctx, glyph, cx, cy + 6, Math.max(13, radius * 0.72), accent, 900);
    ctx.restore();
  }

  drawRecordCard(rect, arTitle, enTitle, value, accent, glyph) {
    const ctx = this.ctx;
    this.drawPolishPanel(rect, accent, 'rgba(2, 16, 33, 0.95)', 3);
    this.drawPolishHex(rect.x + 45, rect.y + rect.h / 2, accent, glyph, 21);

    const textX = rect.x + 82;
    label(ctx, arTitle, textX, rect.y + 32, 11, accent, 900, 'left');
    label(ctx, enTitle, textX, rect.y + 51, 7.5, '#7fc7ff', 900, 'left');

    const valueText = String(value);
    const valueSize = valueText.length >= 8 ? 18 : valueText.length >= 6 ? 20 : 24;
    label(ctx, valueText, rect.x + rect.w - 17, rect.y + rect.h / 2 + 9, valueSize, UI_COLORS.text, 900, 'right');
  }

  drawKeycap(x, y, text, accent = '#55c9ff') {
    const ctx = this.ctx;
    const width = text.length > 1 ? 44 : 28;
    ctx.save();
    techPath(ctx, x, y, width, 26, 5);
    ctx.fillStyle = 'rgba(3, 20, 39, 0.96)';
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.stroke();
    label(ctx, text, x + width / 2, y + 18, text.length > 1 ? 8 : 11, accent, 900);
    ctx.restore();
  }

  drawActionButton(rect, text, accent, action, options = {}) {
    const ctx = this.ctx;
    const hovered = this.menuHover(rect);
    const primary = Boolean(options.primary);
    const danger = Boolean(options.danger);
    const icon = options.icon || '';
    const fill = danger
      ? hovered ? 'rgba(68, 8, 23, 0.99)' : 'rgba(37, 5, 16, 0.96)'
      : primary
        ? hovered ? 'rgba(103, 75, 5, 0.995)' : 'rgba(64, 46, 5, 0.97)'
        : hovered ? 'rgba(7, 38, 70, 0.99)' : 'rgba(3, 18, 39, 0.965)';

    this.drawPolishPanel(rect, accent, fill, hovered || primary ? 10 : 3);
    if (icon) label(ctx, icon, rect.x + 39, rect.y + rect.h / 2 + 7, primary ? 22 : 17, accent, 900);
    label(
      ctx,
      text,
      rect.x + rect.w / 2 + (icon ? 12 : 0),
      rect.y + rect.h / 2 + 7,
      primary ? 17 : danger ? 13 : 14,
      primary ? '#ffe470' : danger ? '#ff7586' : '#78c9ff',
      900,
    );
    this.addUiRegion(rect.x, rect.y, rect.w, rect.h, action);
  }

  drawMetric(x, y, glyph, title, value) {
    const ctx = this.ctx;
    this.drawPolishHex(x, y, '#2ec6ff', glyph, 19);
    label(ctx, title, x + 34, y - 4, 9, '#63c7f4', 800, 'left');
    label(ctx, String(value), x + 34, y + 17, 14, '#a4e3ff', 900, 'left');
  }

  drawBottomBar(checkpoint) {
    const ctx = this.ctx;
    const rect = { x: 190, y: 640, w: 900, h: 48 };
    this.drawPolishPanel(rect, 'rgba(38, 163, 255, 0.72)', 'rgba(2, 12, 27, 0.97)', 2);

    const divider = (x) => {
      ctx.fillStyle = 'rgba(88, 177, 235, 0.25)';
      ctx.fillRect(x, rect.y + 10, 1, 28);
    };

    this.drawKeycap(rect.x + 36, rect.y + 11, checkpoint ? 'C' : 'ENTER');
    label(ctx, checkpoint ? 'متابعة الجولة' : 'ابدأ الجولة', rect.x + 92, rect.y + 30, 11, '#a9dcff', 800, 'left');
    divider(rect.x + 286);

    this.drawKeycap(rect.x + 330, rect.y + 11, 'N');
    label(ctx, 'جولة جديدة', rect.x + 378, rect.y + 30, 11, '#a9dcff', 800, 'left');
    divider(rect.x + 548);

    this.drawPolishHex(rect.x + 610, rect.y + 24, '#39e59b', '▣', 14);
    label(ctx, 'التقدم يُحفظ محليًا', rect.x + 640, rect.y + 30, 11, '#a9dcff', 800, 'left');
  }

  drawMenu() {
    const checkpoint = this.hasContinueCheckpoint() ? this.savedCheckpoint : null;
    const ctx = this.ctx;
    const main = { x: 116, y: 184, w: 692, h: 432 };
    const rail = { x: 828, y: 184, w: 336, h: 432 };

    this.drawDashboardBackdrop();
    this.drawOuterTechFrame();

    label(ctx, 'ONE BULLET ARENA', WIDTH / 2, 54, 11, '#31dfff', 900);

    ctx.save();
    ctx.shadowColor = 'rgba(70, 173, 255, 0.55)';
    ctx.shadowBlur = 9;
    label(ctx, 'حلبة الطلقة الواحدة', WIDTH / 2, 118, 38, UI_COLORS.text, 900);
    ctx.restore();

    label(
      ctx,
      checkpoint ? '✓  نقطة الحفظ جاهزة   //   حفظ محلي' : '◆  الجولة جاهزة   //   حفظ محلي',
      WIDTH / 2,
      153,
      11,
      checkpoint ? UI_COLORS.success : UI_COLORS.player,
      900,
    );

    this.drawPolishPanel(main, '#159eff', 'rgba(2, 14, 31, 0.965)', 5);
    this.drawPolishPanel(rail, '#159eff', 'rgba(2, 14, 31, 0.96)', 5);

    label(ctx, 'سجلات الجولة', rail.x + rail.w / 2, rail.y + 38, 17, '#55c7ff', 900);
    ctx.fillStyle = 'rgba(42, 167, 245, 0.25)';
    ctx.fillRect(rail.x + 30, rail.y + 58, rail.w - 60, 1);

    if (checkpoint) {
      label(ctx, '▣  نقطة الحفظ النشطة', main.x + main.w / 2, main.y + 38, 11, UI_COLORS.success, 900);

      ctx.save();
      const waveGlow = ctx.createRadialGradient(main.x + main.w / 2, main.y + 118, 18, main.x + main.w / 2, main.y + 118, 195);
      waveGlow.addColorStop(0, 'rgba(255, 198, 48, 0.15)');
      waveGlow.addColorStop(1, 'rgba(255, 198, 48, 0)');
      ctx.fillStyle = waveGlow;
      ctx.fillRect(main.x + 70, main.y + 48, main.w - 140, 140);
      ctx.restore();

      label(ctx, '»', main.x + 148, main.y + 126, 26, UI_COLORS.bullet, 900);
      label(ctx, `WAVE ${String(checkpoint.wave).padStart(2, '0')}`, main.x + main.w / 2, main.y + 137, 52, UI_COLORS.bullet, 900);
      label(ctx, '«', main.x + main.w - 148, main.y + 126, 26, UI_COLORS.bullet, 900);
      label(ctx, 'آخر نقطة حفظ جاهزة للمتابعة', main.x + main.w / 2, main.y + 168, 14, UI_COLORS.text, 800);

      ctx.fillStyle = 'rgba(63, 175, 245, 0.25)';
      ctx.fillRect(main.x + 150, main.y + 190, main.w - 300, 1);
      this.drawMetric(main.x + 260, main.y + 220, '⇈', 'الترقيات', checkpoint.stats.upgrades.toLocaleString('en-US'));
      ctx.fillStyle = 'rgba(73, 169, 230, 0.28)';
      ctx.fillRect(main.x + main.w / 2, main.y + 202, 1, 38);
      this.drawMetric(main.x + 432, main.y + 220, '◎', 'نقاط الجولة', checkpoint.score.toLocaleString('en-US'));

      this.drawActionButton(
        { x: main.x + 43, y: main.y + 254, w: main.w - 86, h: 60 },
        `متابعة الجولة من WAVE ${String(checkpoint.wave).padStart(2, '0')}`,
        '#ffd441',
        () => this.continueFromCheckpoint(),
        { primary: true, icon: '▶' },
      );
      this.drawActionButton(
        { x: main.x + 43, y: main.y + 326, w: main.w - 86, h: 46 },
        'جولة جديدة من البداية',
        '#238ee8',
        () => this.startRun(),
        { icon: '↻' },
      );
      this.drawActionButton(
        { x: main.x + 142, y: main.y + 384, w: main.w - 284, h: 34 },
        'حذف نقطة الحفظ',
        '#ff4f63',
        () => this.clearCheckpoint(),
        { danger: true, icon: '▥' },
      );
    } else {
      label(ctx, '◆  جولة جديدة', main.x + main.w / 2, main.y + 38, 11, UI_COLORS.player, 900);
      label(ctx, 'WAVE 01', main.x + main.w / 2, main.y + 137, 52, UI_COLORS.player, 900);
      label(ctx, 'طلقة واحدة. استرجعها. واصل القتال.', main.x + main.w / 2, main.y + 168, 14, UI_COLORS.text, 800);
      label(ctx, 'FIRE  ·  RICOCHET  ·  RECALL  ·  SURVIVE', main.x + main.w / 2, main.y + 220, 10, '#77bde8', 900);
      this.drawActionButton(
        { x: main.x + 43, y: main.y + 266, w: main.w - 86, h: 62 },
        'ابدأ الجولة',
        '#ffd441',
        () => this.startRun(),
        { primary: true, icon: '▶' },
      );
      label(ctx, 'WASD MOVE  ·  MOUSE FIRE  ·  Q RECALL  ·  SPACE DASH', main.x + main.w / 2, main.y + 382, 9, UI_COLORS.muted, 800);
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
