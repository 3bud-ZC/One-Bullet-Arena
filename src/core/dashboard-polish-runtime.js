import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from '../game-data.js';
import { RELEASE_VERSION } from '../release.js';
import { UI_COLORS, label } from '../ui-renderer.js';
import { OneBulletVisualOverhaulRuntime } from './visual-overhaul-runtime.js';

export const DASHBOARD_POLISH_RUNTIME_VERSION = '3.3.3-dashboard-cockpit';
export const DASHBOARD_POLISH_REVISION = 'tactical-command-hud-v8';

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
    gradient.addColorStop(0.58, 'rgba(2, 11, 25, 0.978)');
    gradient.addColorStop(1, 'rgba(1, 6, 17, 0.997)');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.45;
    ctx.stroke();

    techPath(ctx, rect.x + 6, rect.y + 6, rect.w - 12, rect.h - 12, Math.max(7, cut - 5));
    ctx.strokeStyle = 'rgba(119, 202, 255, 0.13)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.globalAlpha = 0.78;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(rect.x + 24, rect.y + 2.5);
    ctx.lineTo(rect.x + Math.min(182, rect.w * 0.32), rect.y + 2.5);
    ctx.moveTo(rect.x + rect.w - 24, rect.y + rect.h - 2.5);
    ctx.lineTo(rect.x + rect.w - Math.min(158, rect.w * 0.29), rect.y + rect.h - 2.5);
    ctx.stroke();

    ctx.globalAlpha = 0.42;
    ctx.fillStyle = accent;
    ctx.fillRect(rect.x + 11, rect.y + 44, 3, 30);
    ctx.fillRect(rect.x + rect.w - 14, rect.y + rect.h - 74, 3, 30);
    ctx.restore();
  }

  drawHex(cx, cy, accent, glyph, radius = 22) {
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowColor = accent;
    ctx.shadowBlur = 9;
    hexPath(ctx, cx, cy, radius);
    ctx.fillStyle = 'rgba(3, 18, 35, 0.985)';
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.globalAlpha = 0.32;
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
    const statusColor = checkpoint ? UI_COLORS.success : UI_COLORS.player;

    label(ctx, 'ONE BULLET ARENA', WIDTH / 2, 46, 12, '#35dcff', 900);

    ctx.save();
    ctx.shadowColor = 'rgba(83, 181, 255, 0.58)';
    ctx.shadowBlur = 11;
    label(ctx, 'حلبة الطلقة الواحدة', WIDTH / 2, 105, 47, UI_COLORS.text, 900);
    ctx.restore();

    this.drawHex(WIDTH / 2 - 165, 143, statusColor, checkpoint ? '✓' : '◆', 14);
    label(
      ctx,
      checkpoint ? 'نقطة الحفظ جاهزة  //  حفظ محلي' : 'جولة جديدة جاهزة  //  حفظ محلي',
      WIDTH / 2 + 8,
      148,
      12,
      statusColor,
      900,
    );

    ctx.save();
    ctx.strokeStyle = '#28b8ff';
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2 - 300, 166);
    ctx.lineTo(WIDTH / 2 - 205, 166);
    ctx.moveTo(WIDTH / 2 + 205, 166);
    ctx.lineTo(WIDTH / 2 + 300, 166);
    ctx.stroke();
    ctx.restore();
  }

  drawHeroCockpit(rect, checkpoint) {
    const ctx = this.ctx;
    const accent = checkpoint ? '#ffd640' : '#3dd6ff';
    const wave = checkpoint ? String(checkpoint.wave).padStart(2, '0') : '01';

    this.drawPanel(rect, 'rgba(39, 172, 255, 0.5)', 'rgba(2, 15, 31, 0.82)', 0, 13);

    label(
      ctx,
      checkpoint ? 'نقطة الحفظ النشطة' : 'جولة جديدة',
      rect.x + rect.w / 2,
      rect.y + 27,
      11,
      checkpoint ? UI_COLORS.success : UI_COLORS.player,
      900,
    );

    ctx.save();
    const glow = ctx.createRadialGradient(rect.x + rect.w / 2, rect.y + 88, 12, rect.x + rect.w / 2, rect.y + 88, 245);
    glow.addColorStop(0, checkpoint ? 'rgba(255, 201, 49, 0.22)' : 'rgba(48, 205, 255, 0.17)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(rect.x + 42, rect.y + 35, rect.w - 84, 112);
    ctx.restore();

    label(ctx, '»', rect.x + 116, rect.y + 98, 29, accent, 900);
    label(ctx, `WAVE ${wave}`, rect.x + rect.w / 2, rect.y + 108, 60, accent, 900);
    label(ctx, '«', rect.x + rect.w - 116, rect.y + 98, 29, accent, 900);

    label(
      ctx,
      checkpoint ? 'آخر نقطة حفظ جاهزة للمتابعة' : 'طلقة واحدة. استرجعها. واصل القتال.',
      rect.x + rect.w / 2,
      rect.y + 140,
      14,
      UI_COLORS.text,
      800,
    );

    ctx.save();
    ctx.strokeStyle = 'rgba(69, 180, 242, 0.32)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rect.x + 120, rect.y + 154);
    ctx.lineTo(rect.x + rect.w - 120, rect.y + 154);
    ctx.stroke();
    ctx.restore();

    if (checkpoint) {
      this.drawCockpitMetric(rect.x + 150, rect.y + 175, '⇈', 'الترقيات', checkpoint.stats.upgrades.toLocaleString('en-US'));
      ctx.fillStyle = 'rgba(70, 174, 232, 0.26)';
      ctx.fillRect(rect.x + rect.w / 2, rect.y + 161, 1, 40);
      this.drawCockpitMetric(rect.x + rect.w / 2 + 55, rect.y + 175, '◎', 'نقاط الجولة', checkpoint.score.toLocaleString('en-US'));
    } else {
      label(ctx, 'FIRE  ·  RICOCHET  ·  RECALL  ·  SURVIVE', rect.x + rect.w / 2, rect.y + 182, 10, '#75c9f2', 900);
    }
  }

  drawCockpitMetric(x, y, glyph, title, value) {
    const ctx = this.ctx;
    this.drawHex(x, y, '#32c7ff', glyph, 17);
    label(ctx, title, x + 34, y - 3, 9, '#69cdf7', 800, 'left');
    label(ctx, String(value), x + 34, y + 18, 14, '#b7eaff', 900, 'left');
  }

  drawActionButton(rect, text, accent, action, options = {}) {
    const ctx = this.ctx;
    const hovered = this.menuHover(rect);
    const primary = Boolean(options.primary);
    const danger = Boolean(options.danger);
    const icon = options.icon || '';

    const fill = danger
      ? hovered ? 'rgba(74, 8, 25, 0.995)' : 'rgba(38, 5, 16, 0.975)'
      : primary
        ? hovered ? 'rgba(115, 81, 4, 0.998)' : 'rgba(70, 49, 4, 0.98)'
        : hovered ? 'rgba(7, 43, 78, 0.995)' : 'rgba(3, 19, 40, 0.975)';

    this.drawPanel(rect, accent, fill, hovered || primary ? 11 : 3, primary ? 13 : 11);

    if (primary) {
      ctx.save();
      const sheen = ctx.createLinearGradient(rect.x, 0, rect.x + rect.w, 0);
      sheen.addColorStop(0, 'rgba(255, 213, 50, 0)');
      sheen.addColorStop(0.5, 'rgba(255, 226, 100, 0.13)');
      sheen.addColorStop(1, 'rgba(255, 213, 50, 0)');
      ctx.fillStyle = sheen;
      techPath(ctx, rect.x + 8, rect.y + 8, rect.w - 16, rect.h - 16, 8);
      ctx.fill();
      ctx.restore();
    }

    if (icon) label(ctx, icon, rect.x + 42, rect.y + rect.h / 2 + 8, primary ? 24 : 18, accent, 900);
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
    this.drawPanel(rect, accent, 'rgba(2, 17, 35, 0.96)', 4, 12);
    this.drawHex(rect.x + 48, rect.y + rect.h / 2, accent, glyph, 23);

    const labelX = rect.x + 88;
    label(ctx, arTitle, labelX, rect.y + 33, 12, accent, 900, 'left');
    label(ctx, enTitle, labelX, rect.y + 55, 8, '#78c9ff', 900, 'left');

    ctx.fillStyle = 'rgba(93, 183, 239, 0.22)';
    ctx.fillRect(rect.x + rect.w - 118, rect.y + 21, 1, rect.h - 42);

    const valueText = String(value);
    const valueSize = valueText.length >= 9 ? 17 : valueText.length >= 7 ? 19 : valueText.length >= 5 ? 21 : 25;
    label(ctx, valueText, rect.x + rect.w - 18, rect.y + rect.h / 2 + 10, valueSize, UI_COLORS.text, 900, 'right');
  }

  drawKeycap(x, y, text, accent = '#53c9ff') {
    const ctx = this.ctx;
    const width = text.length > 1 ? 48 : 30;
    ctx.save();
    techPath(ctx, x, y, width, 28, 5);
    ctx.fillStyle = 'rgba(3, 20, 39, 0.985)';
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
    const rect = { x: 174, y: 625, w: 932, h: 60 };
    this.drawPanel(rect, 'rgba(39, 166, 255, 0.78)', 'rgba(2, 12, 27, 0.985)', 2, 12);

    const sectionW = rect.w / 3;
    const divider = (x) => {
      ctx.fillStyle = 'rgba(89, 184, 241, 0.27)';
      ctx.fillRect(x, rect.y + 13, 1, 34);
    };

    const firstX = rect.x + 42;
    const firstWidth = this.drawKeycap(firstX, rect.y + 16, checkpoint ? 'C' : 'ENTER');
    label(ctx, checkpoint ? 'متابعة الجولة' : 'ابدأ الجولة', firstX + firstWidth + 22, rect.y + 37, 12, '#b0e1ff', 800, 'left');
    divider(rect.x + sectionW);

    const secondX = rect.x + sectionW + 46;
    this.drawKeycap(secondX, rect.y + 16, 'N');
    label(ctx, 'جولة جديدة', secondX + 48, rect.y + 37, 12, '#b0e1ff', 800, 'left');
    divider(rect.x + sectionW * 2);

    const thirdX = rect.x + sectionW * 2 + 55;
    this.drawHex(thirdX, rect.y + 30, '#38e59b', '▣', 15);
    label(ctx, 'التقدم يُحفظ محليًا', thirdX + 31, rect.y + 37, 12, '#b0e1ff', 800, 'left');
  }

  drawMenu() {
    const checkpoint = this.hasContinueCheckpoint() ? this.savedCheckpoint : null;
    const ctx = this.ctx;
    const main = { x: 114, y: 184, w: 698, h: 424 };
    const rail = { x: 826, y: 184, w: 340, h: 424 };

    this.drawDashboardBackdrop();
    this.drawOuterTechFrame();
    this.drawHeader(checkpoint);

    this.drawPanel(main, '#159fff', 'rgba(2, 14, 31, 0.972)', 6, 16);
    this.drawPanel(rail, '#159fff', 'rgba(2, 14, 31, 0.968)', 6, 16);

    label(ctx, 'سجلات الجولة', rail.x + rail.w / 2, rail.y + 38, 19, '#5dcbff', 900);
    ctx.fillStyle = 'rgba(45, 170, 245, 0.29)';
    ctx.fillRect(rail.x + 30, rail.y + 61, rail.w - 60, 1);

    const hero = { x: main.x + 30, y: main.y + 28, w: main.w - 60, h: 207 };
    this.drawHeroCockpit(hero, checkpoint);

    if (checkpoint) {
      this.drawActionButton(
        { x: main.x + 40, y: main.y + 249, w: main.w - 80, h: 58 },
        `متابعة الجولة من WAVE ${String(checkpoint.wave).padStart(2, '0')}`,
        '#ffd441',
        () => this.continueFromCheckpoint(),
        { primary: true, icon: '▶' },
      );
      this.drawActionButton(
        { x: main.x + 40, y: main.y + 318, w: main.w - 80, h: 44 },
        'جولة جديدة من البداية',
        '#278fe9',
        () => this.startRun(),
        { icon: '↻' },
      );
      this.drawActionButton(
        { x: main.x + 148, y: main.y + 374, w: main.w - 296, h: 32 },
        'حذف نقطة الحفظ',
        '#ff5065',
        () => this.clearCheckpoint(),
        { danger: true, icon: '▥' },
      );
    } else {
      this.drawActionButton(
        { x: main.x + 40, y: main.y + 266, w: main.w - 80, h: 62 },
        'ابدأ الجولة',
        '#ffd441',
        () => this.startRun(),
        { primary: true, icon: '▶' },
      );
      label(ctx, 'WASD MOVE  ·  MOUSE FIRE  ·  Q RECALL  ·  SPACE DASH', main.x + main.w / 2, main.y + 382, 10, UI_COLORS.muted, 800);
    }

    const cardX = rail.x + 22;
    const cardW = rail.w - 44;
    this.drawRecordCard(
      { x: cardX, y: rail.y + 78, w: cardW, h: 94 },
      'أفضل موجة',
      'BEST WAVE',
      this.highWave,
      '#32c8ff',
      '⌾',
    );
    this.drawRecordCard(
      { x: cardX, y: rail.y + 186, w: cardW, h: 94 },
      'أعلى نتيجة',
      'HIGH SCORE',
      this.highScore.toLocaleString('en-US'),
      '#ffd441',
      '◎',
    );
    this.drawRecordCard(
      { x: cardX, y: rail.y + 294, w: cardW, h: 94 },
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
