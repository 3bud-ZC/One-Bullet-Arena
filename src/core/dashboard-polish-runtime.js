import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from '../game-data.js';
import { RELEASE_VERSION } from '../release.js';
import { UI_COLORS, label } from '../ui-renderer.js';
import { OneBulletVisualOverhaulRuntime } from './visual-overhaul-runtime.js';

export const DASHBOARD_POLISH_RUNTIME_VERSION = '3.3.4-dashboard-smooth';
export const DASHBOARD_POLISH_REVISION = 'tactical-command-hud-v9';

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

  drawDashboardBackdrop() {
    const ctx = this.ctx;
    ctx.save();

    const bg = ctx.createRadialGradient(WIDTH / 2, 300, 90, WIDTH / 2, 360, 760);
    bg.addColorStop(0, 'rgba(5, 23, 40, 0.98)');
    bg.addColorStop(0.52, 'rgba(2, 13, 28, 0.99)');
    bg.addColorStop(1, 'rgba(0, 6, 16, 1)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.strokeStyle = 'rgba(44, 145, 211, 0.075)';
    ctx.lineWidth = 1;
    for (let x = 48; x < WIDTH; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
    }
    for (let y = 44; y < HEIGHT; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(43, 151, 223, 0.09)';
    ctx.lineWidth = 1;
    for (const radius of [300, 470]) {
      ctx.beginPath();
      ctx.arc(WIDTH / 2, 220, radius, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawOuterTechFrame() {
    const ctx = this.ctx;
    const x = 20;
    const y = 18;
    const w = WIDTH - 40;
    const h = HEIGHT - 36;

    ctx.save();
    techPath(ctx, x, y, w, h, 22);
    ctx.strokeStyle = 'rgba(42, 165, 235, 0.58)';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(54, 187, 255, 0.78)';
    ctx.lineWidth = 2;
    const arm = 72;
    const inset = 15;
    for (const [cx, cy, sx, sy] of [
      [x + inset, y + inset, 1, 1],
      [x + w - inset, y + inset, -1, 1],
      [x + inset, y + h - inset, 1, -1],
      [x + w - inset, y + h - inset, -1, -1],
    ]) {
      ctx.beginPath();
      ctx.moveTo(cx, cy + sy * arm);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + sx * arm, cy);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawPanel(rect, accent, fill = 'rgba(3, 15, 30, 0.95)', options = {}) {
    const ctx = this.ctx;
    const hovered = Boolean(options.hovered);
    const glow = options.glow || 0;
    const cut = options.cut || 14;

    ctx.save();
    if (glow > 0) {
      ctx.shadowColor = accent;
      ctx.shadowBlur = glow;
    }

    techPath(ctx, rect.x, rect.y, rect.w, rect.h, cut);
    const gradient = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    gradient.addColorStop(0, fill);
    gradient.addColorStop(1, 'rgba(1, 8, 19, 0.985)');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = accent;
    ctx.globalAlpha = hovered ? 0.95 : 0.62;
    ctx.lineWidth = hovered ? 1.6 : 1.15;
    ctx.stroke();

    ctx.globalAlpha = 0.12;
    techPath(ctx, rect.x + 6, rect.y + 6, rect.w - 12, rect.h - 12, Math.max(7, cut - 5));
    ctx.strokeStyle = '#8ad6ff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  drawHex(cx, cy, accent, glyph, radius = 20, emphasis = false) {
    const ctx = this.ctx;
    ctx.save();
    if (emphasis) {
      ctx.shadowColor = accent;
      ctx.shadowBlur = 5;
    }
    hexPath(ctx, cx, cy, radius);
    ctx.fillStyle = 'rgba(4, 20, 36, 0.96)';
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = accent;
    ctx.globalAlpha = emphasis ? 0.95 : 0.72;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.globalAlpha = 1;
    label(ctx, glyph, cx, cy + 5, Math.max(11, radius * 0.62), accent, 900);
    ctx.restore();
  }

  drawHeader(checkpoint) {
    const ctx = this.ctx;
    const statusColor = checkpoint ? UI_COLORS.success : UI_COLORS.player;

    label(ctx, 'ONE BULLET ARENA', WIDTH / 2, 47, 11, '#43d7f5', 900);
    label(ctx, 'حلبة الطلقة الواحدة', WIDTH / 2, 104, 43, UI_COLORS.text, 900);

    this.drawHex(WIDTH / 2 - 158, 143, statusColor, checkpoint ? '✓' : '◆', 12, false);
    label(
      ctx,
      checkpoint ? 'نقطة الحفظ جاهزة  //  حفظ محلي' : 'جولة جديدة جاهزة  //  حفظ محلي',
      WIDTH / 2 + 7,
      148,
      11,
      statusColor,
      900,
    );
  }

  drawHeroCockpit(rect, checkpoint) {
    const ctx = this.ctx;
    const accent = checkpoint ? '#ffd85a' : '#57d5f5';
    const wave = checkpoint ? String(checkpoint.wave).padStart(2, '0') : '01';

    this.drawPanel(rect, 'rgba(47, 159, 218, 0.72)', 'rgba(4, 18, 34, 0.72)', { cut: 13 });

    label(
      ctx,
      checkpoint ? 'نقطة الحفظ النشطة' : 'جولة جديدة',
      rect.x + rect.w / 2,
      rect.y + 28,
      10,
      checkpoint ? UI_COLORS.success : UI_COLORS.player,
      900,
    );

    ctx.save();
    const glow = ctx.createRadialGradient(rect.x + rect.w / 2, rect.y + 88, 10, rect.x + rect.w / 2, rect.y + 88, 215);
    glow.addColorStop(0, checkpoint ? 'rgba(255, 205, 70, 0.11)' : 'rgba(61, 203, 243, 0.09)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(rect.x + 70, rect.y + 38, rect.w - 140, 106);
    ctx.restore();

    label(ctx, '»', rect.x + 126, rect.y + 98, 24, accent, 900);
    label(ctx, `WAVE ${wave}`, rect.x + rect.w / 2, rect.y + 109, 58, accent, 900);
    label(ctx, '«', rect.x + rect.w - 126, rect.y + 98, 24, accent, 900);
    label(
      ctx,
      checkpoint ? 'آخر نقطة حفظ جاهزة للمتابعة' : 'طلقة واحدة. استرجعها. واصل القتال.',
      rect.x + rect.w / 2,
      rect.y + 141,
      13,
      UI_COLORS.text,
      800,
    );

    ctx.fillStyle = 'rgba(80, 174, 225, 0.2)';
    ctx.fillRect(rect.x + 128, rect.y + 155, rect.w - 256, 1);

    if (checkpoint) {
      this.drawCockpitMetric(rect.x + 162, rect.y + 178, '⇈', 'الترقيات', checkpoint.stats.upgrades.toLocaleString('en-US'));
      ctx.fillStyle = 'rgba(76, 169, 219, 0.18)';
      ctx.fillRect(rect.x + rect.w / 2, rect.y + 165, 1, 34);
      this.drawCockpitMetric(rect.x + rect.w / 2 + 67, rect.y + 178, '◎', 'نقاط الجولة', checkpoint.score.toLocaleString('en-US'));
    } else {
      label(ctx, 'FIRE  ·  RICOCHET  ·  RECALL  ·  SURVIVE', rect.x + rect.w / 2, rect.y + 181, 9, '#79c6e7', 900);
    }
  }

  drawCockpitMetric(x, y, glyph, title, value) {
    const ctx = this.ctx;
    this.drawHex(x, y, '#49bee8', glyph, 15, false);
    label(ctx, title, x + 31, y - 2, 8.5, '#72c4e5', 800, 'left');
    label(ctx, String(value), x + 31, y + 17, 13, '#b7dff0', 900, 'left');
  }

  drawActionButton(rect, text, accent, action, options = {}) {
    const ctx = this.ctx;
    const hovered = this.menuHover(rect);
    const primary = Boolean(options.primary);
    const danger = Boolean(options.danger);
    const icon = options.icon || '';

    const fill = danger
      ? hovered ? 'rgba(54, 11, 23, 0.97)' : 'rgba(28, 8, 18, 0.94)'
      : primary
        ? hovered ? 'rgba(75, 57, 12, 0.985)' : 'rgba(48, 38, 12, 0.965)'
        : hovered ? 'rgba(7, 34, 58, 0.98)' : 'rgba(4, 20, 36, 0.95)';

    this.drawPanel(rect, accent, fill, {
      cut: primary ? 13 : 11,
      hovered,
      glow: primary ? (hovered ? 8 : 4) : 0,
    });

    if (icon) {
      label(ctx, icon, rect.x + 40, rect.y + rect.h / 2 + 7, primary ? 21 : 16, accent, 900);
    }
    label(
      ctx,
      text,
      rect.x + rect.w / 2 + (icon ? 10 : 0),
      rect.y + rect.h / 2 + 7,
      primary ? 17 : danger ? 11.5 : 14,
      primary ? '#ffe889' : danger ? '#ee7180' : '#83c6e5',
      900,
    );
    this.addUiRegion(rect.x, rect.y, rect.w, rect.h, action);
  }

  drawRecordCard(rect, arTitle, enTitle, value, accent, glyph) {
    const ctx = this.ctx;
    this.drawPanel(rect, 'rgba(72, 164, 213, 0.72)', 'rgba(3, 17, 31, 0.94)', { cut: 12 });
    this.drawHex(rect.x + 46, rect.y + rect.h / 2, accent, glyph, 20, false);

    const labelX = rect.x + 82;
    label(ctx, arTitle, labelX, rect.y + 33, 11, accent, 900, 'left');
    label(ctx, enTitle, labelX, rect.y + 53, 7.5, '#6fb8da', 900, 'left');

    const valueText = String(value);
    const valueSize = valueText.length >= 9 ? 16 : valueText.length >= 7 ? 18 : valueText.length >= 5 ? 20 : 23;
    label(ctx, valueText, rect.x + rect.w - 18, rect.y + rect.h / 2 + 9, valueSize, UI_COLORS.text, 900, 'right');
  }

  drawKeycap(x, y, text, accent = '#57bddd') {
    const ctx = this.ctx;
    const width = text.length > 1 ? 46 : 29;
    ctx.save();
    techPath(ctx, x, y, width, 26, 5);
    ctx.fillStyle = 'rgba(4, 20, 35, 0.95)';
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.68;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
    label(ctx, text, x + width / 2, y + 18, text.length > 1 ? 7.5 : 10.5, accent, 900);
    ctx.restore();
    return width;
  }

  drawBottomBar(checkpoint) {
    const ctx = this.ctx;
    const rect = { x: 188, y: 632, w: 904, h: 52 };
    this.drawPanel(rect, 'rgba(57, 143, 190, 0.68)', 'rgba(3, 15, 28, 0.96)', { cut: 12 });

    const sectionW = rect.w / 3;
    const divider = (x) => {
      ctx.fillStyle = 'rgba(93, 171, 210, 0.18)';
      ctx.fillRect(x, rect.y + 12, 1, 28);
    };

    const firstX = rect.x + 42;
    const firstWidth = this.drawKeycap(firstX, rect.y + 13, checkpoint ? 'C' : 'ENTER');
    label(ctx, checkpoint ? 'متابعة الجولة' : 'ابدأ الجولة', firstX + firstWidth + 20, rect.y + 33, 11, '#a9d5e8', 800, 'left');
    divider(rect.x + sectionW);

    const secondX = rect.x + sectionW + 44;
    this.drawKeycap(secondX, rect.y + 13, 'N');
    label(ctx, 'جولة جديدة', secondX + 46, rect.y + 33, 11, '#a9d5e8', 800, 'left');
    divider(rect.x + sectionW * 2);

    const thirdX = rect.x + sectionW * 2 + 55;
    this.drawHex(thirdX, rect.y + 26, '#54d99a', '▣', 13, false);
    label(ctx, 'التقدم يُحفظ محليًا', thirdX + 28, rect.y + 33, 11, '#a9d5e8', 800, 'left');
  }

  drawMenu() {
    const checkpoint = this.hasContinueCheckpoint() ? this.savedCheckpoint : null;
    const ctx = this.ctx;
    const main = { x: 122, y: 186, w: 684, h: 420 };
    const rail = { x: 824, y: 186, w: 334, h: 420 };

    this.drawDashboardBackdrop();
    this.drawOuterTechFrame();
    this.drawHeader(checkpoint);

    this.drawPanel(main, 'rgba(55, 158, 213, 0.76)', 'rgba(3, 15, 29, 0.955)', { cut: 16 });
    this.drawPanel(rail, 'rgba(55, 158, 213, 0.76)', 'rgba(3, 15, 29, 0.955)', { cut: 16 });

    label(ctx, 'سجلات الجولة', rail.x + rail.w / 2, rail.y + 38, 18, '#62c1e8', 900);
    ctx.fillStyle = 'rgba(82, 168, 214, 0.18)';
    ctx.fillRect(rail.x + 32, rail.y + 60, rail.w - 64, 1);

    const hero = { x: main.x + 30, y: main.y + 28, w: main.w - 60, h: 205 };
    this.drawHeroCockpit(hero, checkpoint);

    if (checkpoint) {
      this.drawActionButton(
        { x: main.x + 42, y: main.y + 246, w: main.w - 84, h: 56 },
        `متابعة الجولة من WAVE ${String(checkpoint.wave).padStart(2, '0')}`,
        '#e8bd3f',
        () => this.continueFromCheckpoint(),
        { primary: true, icon: '▶' },
      );
      this.drawActionButton(
        { x: main.x + 42, y: main.y + 314, w: main.w - 84, h: 43 },
        'جولة جديدة من البداية',
        '#3287bd',
        () => this.startRun(),
        { icon: '↻' },
      );
      this.drawActionButton(
        { x: main.x + 156, y: main.y + 370, w: main.w - 312, h: 30 },
        'حذف نقطة الحفظ',
        '#c9485a',
        () => this.clearCheckpoint(),
        { danger: true, icon: '▥' },
      );
    } else {
      this.drawActionButton(
        { x: main.x + 42, y: main.y + 267, w: main.w - 84, h: 58 },
        'ابدأ الجولة',
        '#e8bd3f',
        () => this.startRun(),
        { primary: true, icon: '▶' },
      );
      label(ctx, 'WASD MOVE  ·  MOUSE FIRE  ·  Q RECALL  ·  SPACE DASH', main.x + main.w / 2, main.y + 382, 9, UI_COLORS.muted, 800);
    }

    const cardX = rail.x + 22;
    const cardW = rail.w - 44;
    this.drawRecordCard(
      { x: cardX, y: rail.y + 79, w: cardW, h: 90 },
      'أفضل موجة',
      'BEST WAVE',
      this.highWave,
      '#54c7e9',
      '⌾',
    );
    this.drawRecordCard(
      { x: cardX, y: rail.y + 184, w: cardW, h: 90 },
      'أعلى نتيجة',
      'HIGH SCORE',
      this.highScore.toLocaleString('en-US'),
      '#e4bd46',
      '◎',
    );
    this.drawRecordCard(
      { x: cardX, y: rail.y + 289, w: cardW, h: 90 },
      checkpoint ? 'نقطة الحفظ' : 'حالة الحفظ',
      checkpoint ? 'CHECKPOINT' : 'SAVE STATUS',
      checkpoint ? `WAVE ${checkpoint.wave}` : 'EMPTY',
      checkpoint ? '#52d89a' : '#73879b',
      '▣',
    );

    this.drawBottomBar(checkpoint);
    label(ctx, `v${RELEASE_VERSION}`, WIDTH - 28, HEIGHT - 13, 8, '#537f99', 800, 'right');
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
