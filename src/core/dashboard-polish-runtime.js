import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from '../game-data.js';
import { RELEASE_VERSION } from '../release.js';
import { UI_COLORS, UI_FONT } from '../ui-renderer.js';
import { OneBulletVisualOverhaulRuntime } from './visual-overhaul-runtime.js';

export const DASHBOARD_POLISH_RUNTIME_VERSION = '3.3.6-dashboard-cinematic-command';
export const DASHBOARD_POLISH_REVISION = 'cinematic-command-menu-v11';

const COLORS = Object.freeze({
  bgTop: '#061522',
  bgMid: '#03101c',
  bgBottom: '#010711',
  cyan: '#59c8e7',
  cyanSoft: '#78b9d0',
  cyanDim: 'rgba(83, 171, 207, 0.22)',
  line: 'rgba(89, 168, 201, 0.22)',
  surface: 'rgba(5, 18, 31, 0.82)',
  surfaceStrong: 'rgba(5, 20, 34, 0.94)',
  surfaceHover: 'rgba(8, 31, 50, 0.96)',
  gold: '#e7bf4b',
  goldText: '#f6df86',
  goldFill: 'rgba(76, 59, 17, 0.9)',
  green: '#57d59a',
  red: '#c85e6c',
  text: '#f1f6f8',
  textSoft: '#b4c9d3',
  muted: '#6f91a3',
});

function techPath(ctx, x, y, w, h, cut = 12) {
  const c = Math.max(3, Math.min(cut, Math.min(w, h) / 3));
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

export class OneBulletDashboardPolishRuntime extends OneBulletVisualOverhaulRuntime {
  constructor(canvas, liveRegion = null) {
    super(canvas, liveRegion);
    this.dashboardPolishRuntimeVersion = DASHBOARD_POLISH_RUNTIME_VERSION;
    this.checkpointDashboardRevision = DASHBOARD_POLISH_REVISION;
    this.dashboardHoverMix = Object.create(null);
  }

  hoverMix(key, active) {
    const current = Number(this.dashboardHoverMix[key] || 0);
    const target = active ? 1 : 0;
    const next = current + (target - current) * 0.2;
    this.dashboardHoverMix[key] = Math.abs(next - target) < 0.01 ? target : next;
    return this.dashboardHoverMix[key];
  }

  drawBackdrop() {
    const ctx = this.ctx;
    ctx.save();

    const background = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    background.addColorStop(0, COLORS.bgTop);
    background.addColorStop(0.48, COLORS.bgMid);
    background.addColorStop(1, COLORS.bgBottom);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const focus = ctx.createRadialGradient(WIDTH * 0.44, 270, 40, WIDTH * 0.44, 300, 540);
    focus.addColorStop(0, 'rgba(37, 119, 159, 0.12)');
    focus.addColorStop(0.5, 'rgba(16, 64, 91, 0.045)');
    focus.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = focus;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.strokeStyle = 'rgba(71, 139, 171, 0.035)';
    ctx.lineWidth = 1;
    for (let x = 80; x < WIDTH; x += 120) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
    }
    for (let y = 80; y < HEIGHT; y += 120) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y);
      ctx.stroke();
    }

    const vignette = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 250, WIDTH / 2, HEIGHT / 2, 760);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(0, 3, 9, 0.52)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.restore();
  }

  drawFrame() {
    const ctx = this.ctx;
    const x = 28;
    const y = 24;
    const w = WIDTH - 56;
    const h = HEIGHT - 48;

    ctx.save();
    techPath(ctx, x, y, w, h, 18);
    ctx.strokeStyle = 'rgba(72, 156, 194, 0.24)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const arm = 56;
    const inset = 14;
    ctx.strokeStyle = 'rgba(76, 190, 230, 0.56)';
    ctx.lineWidth = 1.5;
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

  drawSurface(rect, options = {}) {
    const ctx = this.ctx;
    const fill = options.fill || COLORS.surface;
    const border = options.border || 'rgba(73, 156, 194, 0.38)';
    const cut = Number(options.cut || 14);
    const shadow = Number(options.shadow || 0);

    ctx.save();
    if (shadow > 0) {
      ctx.shadowColor = options.shadowColor || border;
      ctx.shadowBlur = shadow;
    }
    techPath(ctx, rect.x, rect.y, rect.w, rect.h, cut);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = border;
    ctx.lineWidth = Number(options.lineWidth || 1);
    ctx.stroke();
    ctx.restore();
  }

  drawHeader(checkpoint) {
    const ctx = this.ctx;
    const statusColor = checkpoint ? COLORS.green : COLORS.cyan;

    drawText(ctx, 'ONE BULLET ARENA', WIDTH / 2, 48, 10, COLORS.cyan, 900, 'center', 'ltr');
    drawText(ctx, 'حلبة الطلقة الواحدة', WIDTH / 2, 95, 36, COLORS.text, 900);

    const pill = { x: WIDTH / 2 - 142, y: 116, w: 284, h: 34 };
    this.drawSurface(pill, {
      fill: 'rgba(4, 19, 30, 0.62)',
      border: checkpoint ? 'rgba(76, 192, 139, 0.42)' : 'rgba(74, 175, 211, 0.4)',
      cut: 9,
    });

    ctx.save();
    ctx.beginPath();
    ctx.arc(pill.x + 25, pill.y + 17, 6, 0, Math.PI * 2);
    ctx.fillStyle = statusColor;
    ctx.globalAlpha = 0.9;
    ctx.fill();
    ctx.restore();

    drawText(
      ctx,
      checkpoint ? 'نقطة الحفظ جاهزة  ·  محفوظ محليًا' : 'جاهز لجولة جديدة  ·  حفظ محلي',
      pill.x + pill.w / 2 + 10,
      pill.y + 22,
      10,
      statusColor,
      800,
    );
  }

  drawMetric(rect, title, value, accent) {
    const ctx = this.ctx;
    this.drawSurface(rect, {
      fill: 'rgba(6, 23, 38, 0.56)',
      border: 'rgba(78, 153, 186, 0.2)',
      cut: 8,
    });

    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.78;
    ctx.fillRect(rect.x + 12, rect.y + 12, 2, rect.h - 24);
    ctx.globalAlpha = 1;

    drawText(ctx, title, rect.x + 26, rect.y + 20, 8.5, COLORS.cyanSoft, 800, 'left');
    drawText(ctx, String(value), rect.x + 26, rect.y + 42, 15, COLORS.text, 900, 'left', 'ltr');
  }

  drawHero(main, checkpoint) {
    const ctx = this.ctx;
    const wave = checkpoint ? String(checkpoint.wave).padStart(2, '0') : '01';
    const cx = main.x + main.w / 2;
    const waveColor = checkpoint ? COLORS.goldText : '#89def0';

    drawText(
      ctx,
      checkpoint ? 'نقطة الحفظ النشطة' : 'بداية جديدة',
      cx,
      main.y + 43,
      10,
      checkpoint ? COLORS.green : COLORS.cyan,
      800,
    );

    ctx.save();
    const aura = ctx.createRadialGradient(cx, main.y + 112, 0, cx, main.y + 112, 210);
    aura.addColorStop(0, checkpoint ? 'rgba(224, 179, 48, 0.08)' : 'rgba(69, 176, 208, 0.07)');
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aura;
    ctx.fillRect(main.x + 90, main.y + 55, main.w - 180, 120);
    ctx.restore();

    drawText(ctx, `WAVE ${wave}`, cx, main.y + 126, 60, waveColor, 900, 'center', 'ltr');
    drawText(
      ctx,
      checkpoint ? 'آخر نقطة حفظ جاهزة للمتابعة' : 'طلقة واحدة. استرجعها. واصل القتال.',
      cx,
      main.y + 158,
      12.5,
      COLORS.textSoft,
      700,
    );

    if (checkpoint) {
      const metricW = 186;
      const metricY = main.y + 181;
      this.drawMetric(
        { x: cx - metricW - 9, y: metricY, w: metricW, h: 54 },
        'الترقيات',
        checkpoint.stats.upgrades.toLocaleString('en-US'),
        '#55bddd',
      );
      this.drawMetric(
        { x: cx + 9, y: metricY, w: metricW, h: 54 },
        'نقاط الجولة',
        checkpoint.score.toLocaleString('en-US'),
        '#55bddd',
      );
    } else {
      drawText(ctx, 'FIRE  ·  RICOCHET  ·  RECALL  ·  SURVIVE', cx, main.y + 212, 8.5, COLORS.muted, 800, 'center', 'ltr');
    }
  }

  drawAction(rect, key, text, action, options = {}) {
    const ctx = this.ctx;
    const hovered = this.menuHover(rect);
    const mix = this.hoverMix(key, hovered);
    const primary = Boolean(options.primary);
    const danger = Boolean(options.danger);
    const icon = options.icon || '';

    const idleFill = danger
      ? 'rgba(28, 9, 17, 0.36)'
      : primary
        ? COLORS.goldFill
        : 'rgba(5, 22, 37, 0.62)';
    const hoverFill = danger
      ? 'rgba(64, 17, 28, 0.72)'
      : primary
        ? 'rgba(102, 79, 22, 0.96)'
        : COLORS.surfaceHover;

    const border = danger
      ? `rgba(200, 94, 108, ${0.34 + mix * 0.5})`
      : primary
        ? `rgba(231, 191, 75, ${0.62 + mix * 0.32})`
        : `rgba(80, 161, 197, ${0.28 + mix * 0.45})`;

    this.drawSurface(rect, {
      fill: mix > 0.02 ? hoverFill : idleFill,
      border,
      cut: primary ? 12 : 9,
      shadow: primary ? 2 + mix * 5 : 0,
      shadowColor: COLORS.gold,
    });

    if (primary) {
      const sheen = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y);
      sheen.addColorStop(0, 'rgba(255, 226, 113, 0)');
      sheen.addColorStop(0.5, `rgba(255, 226, 113, ${0.035 + mix * 0.045})`);
      sheen.addColorStop(1, 'rgba(255, 226, 113, 0)');
      ctx.save();
      techPath(ctx, rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4, 10);
      ctx.fillStyle = sheen;
      ctx.fill();
      ctx.restore();
    }

    const color = danger ? COLORS.red : primary ? COLORS.goldText : '#91cbe0';
    if (icon) drawText(ctx, icon, rect.x + 34, rect.y + rect.h / 2 + 6, primary ? 18 : 14, color, 900, 'center', 'ltr');
    drawText(ctx, text, rect.x + rect.w / 2 + (icon ? 7 : 0), rect.y + rect.h / 2 + 6, primary ? 15.5 : danger ? 10.5 : 13, color, 900);

    this.addUiRegion(rect.x, rect.y, rect.w, rect.h, action);
  }

  drawRecordRow(rect, title, subtitle, value, accent) {
    const ctx = this.ctx;
    const cy = rect.y + rect.h / 2;

    ctx.fillStyle = 'rgba(73, 151, 187, 0.11)';
    ctx.fillRect(rect.x, rect.y + rect.h - 1, rect.w, 1);

    ctx.save();
    ctx.beginPath();
    ctx.arc(rect.x + 18, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.9;
    ctx.fill();
    ctx.restore();

    drawText(ctx, title, rect.x + 36, rect.y + 29, 10.5, accent, 900, 'left');
    drawText(ctx, subtitle, rect.x + 36, rect.y + 47, 7.2, COLORS.muted, 800, 'left', 'ltr');

    const valueText = String(value);
    const valueSize = valueText.length >= 9 ? 16 : valueText.length >= 7 ? 17.5 : valueText.length >= 5 ? 19 : 22;
    drawText(ctx, valueText, rect.x + rect.w, cy + 7, valueSize, COLORS.text, 900, 'right', 'ltr');
  }

  drawRecords(rail, checkpoint) {
    const ctx = this.ctx;
    drawText(ctx, 'سجل الجولة', rail.x + 2, rail.y + 33, 16, COLORS.cyan, 900, 'left');
    drawText(ctx, 'RUN RECORDS', rail.x + 2, rail.y + 52, 7.5, COLORS.muted, 900, 'left', 'ltr');

    const rowX = rail.x + 2;
    const rowW = rail.w - 4;
    this.drawRecordRow(
      { x: rowX, y: rail.y + 78, w: rowW, h: 76 },
      'أفضل موجة',
      'BEST WAVE',
      this.highWave,
      '#66c8e4',
    );
    this.drawRecordRow(
      { x: rowX, y: rail.y + 168, w: rowW, h: 76 },
      'أعلى نتيجة',
      'HIGH SCORE',
      this.highScore.toLocaleString('en-US'),
      '#dfbb50',
    );
    this.drawRecordRow(
      { x: rowX, y: rail.y + 258, w: rowW, h: 76 },
      checkpoint ? 'نقطة الحفظ' : 'حالة الحفظ',
      checkpoint ? 'CHECKPOINT' : 'SAVE STATUS',
      checkpoint ? `WAVE ${checkpoint.wave}` : 'EMPTY',
      checkpoint ? COLORS.green : '#7f96a2',
    );

    const statusY = rail.y + 368;
    ctx.fillStyle = checkpoint ? 'rgba(78, 195, 140, 0.08)' : 'rgba(85, 156, 190, 0.07)';
    ctx.fillRect(rail.x + 2, statusY, rail.w - 4, 42);
    drawText(
      ctx,
      checkpoint ? 'الحفظ التلقائي نشط' : 'لا توجد نقطة حفظ بعد',
      rail.x + rail.w / 2,
      statusY + 26,
      9.5,
      checkpoint ? COLORS.green : COLORS.cyanSoft,
      800,
    );
  }

  drawFooterHints(checkpoint) {
    const ctx = this.ctx;
    const y = 656;
    ctx.fillStyle = 'rgba(79, 158, 193, 0.1)';
    ctx.fillRect(248, y - 13, 784, 1);

    drawText(ctx, checkpoint ? 'C   متابعة' : 'ENTER   ابدأ', 360, y + 13, 9, COLORS.muted, 800, 'center', 'ltr');
    drawText(ctx, 'N   جولة جديدة', 640, y + 13, 9, COLORS.muted, 800, 'center', 'ltr');
    drawText(ctx, 'LOCAL SAVE   ON', 918, y + 13, 9, '#6eaa91', 800, 'center', 'ltr');
  }

  drawMenu() {
    const checkpoint = this.hasContinueCheckpoint() ? this.savedCheckpoint : null;
    const main = { x: 126, y: 172, w: 720, h: 430 };
    const rail = { x: 888, y: 178, w: 270, h: 420 };

    this.drawBackdrop();
    this.drawFrame();
    this.drawHeader(checkpoint);

    this.drawSurface(main, {
      fill: 'rgba(4, 17, 30, 0.76)',
      border: 'rgba(75, 157, 193, 0.34)',
      cut: 16,
    });

    this.drawHero(main, checkpoint);

    if (checkpoint) {
      this.drawAction(
        { x: main.x + 58, y: main.y + 251, w: main.w - 116, h: 58 },
        'continue',
        `متابعة الجولة من WAVE ${String(checkpoint.wave).padStart(2, '0')}`,
        () => this.continueFromCheckpoint(),
        { primary: true, icon: '▶' },
      );
      this.drawAction(
        { x: main.x + 58, y: main.y + 324, w: main.w - 116, h: 44 },
        'new-run',
        'جولة جديدة من البداية',
        () => this.startRun(),
        { icon: '↻' },
      );
      this.drawAction(
        { x: main.x + 218, y: main.y + 386, w: main.w - 436, h: 28 },
        'delete-save',
        'حذف نقطة الحفظ',
        () => this.clearCheckpoint(),
        { danger: true },
      );
    } else {
      this.drawAction(
        { x: main.x + 58, y: main.y + 278, w: main.w - 116, h: 60 },
        'start-run',
        'ابدأ الجولة',
        () => this.startRun(),
        { primary: true, icon: '▶' },
      );
      drawText(ctx, 'WASD MOVE   ·   MOUSE FIRE   ·   Q RECALL   ·   SPACE DASH', main.x + main.w / 2, main.y + 398, 8.5, COLORS.muted, 800, 'center', 'ltr');
    }

    this.drawRecords(rail, checkpoint);
    this.drawFooterHints(checkpoint);
    drawText(this.ctx, `v${RELEASE_VERSION}`, WIDTH - 31, HEIGHT - 13, 7.5, '#456b7d', 800, 'right', 'ltr');
  }

  getSnapshot() {
    return {
      ...super.getSnapshot(),
      dashboardPolishRuntimeVersion: DASHBOARD_POLISH_RUNTIME_VERSION,
      checkpointDashboardRevision: DASHBOARD_POLISH_REVISION,
      dashboardPolishActive: true,
      dashboardVisualStyle: 'premium-cinematic-command',
      rtlTypographyAware: true,
      smoothHoverInterpolation: true,
      gameplayGeometryChanged: false,
      collisionGeometryChanged: false,
    };
  }
}
