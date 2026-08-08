import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from '../game-data.js';
import { RELEASE_VERSION } from '../release.js';
import { UI_COLORS, label } from '../ui-renderer.js';
import { OneBulletVisualOverhaulRuntime } from './visual-overhaul-runtime.js';

export const DASHBOARD_POLISH_RUNTIME_VERSION = '3.3.5-dashboard-premium-minimal';
export const DASHBOARD_POLISH_REVISION = 'tactical-command-hud-v10';

function techPath(ctx, x, y, w, h, cut = 12) {
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

    const bg = ctx.createRadialGradient(WIDTH / 2, 240, 40, WIDTH / 2, 360, 780);
    bg.addColorStop(0, '#061a2a');
    bg.addColorStop(0.5, '#03101e');
    bg.addColorStop(1, '#010711');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.strokeStyle = 'rgba(67, 148, 194, 0.045)';
    ctx.lineWidth = 1;
    for (let x = 72; x < WIDTH; x += 96) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
    }
    for (let y = 64; y < HEIGHT; y += 96) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(50, 136, 187, 0.055)';
    for (const radius of [360, 520]) {
      ctx.beginPath();
      ctx.arc(WIDTH / 2, 210, radius, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawOuterTechFrame() {
    const ctx = this.ctx;
    const x = 22;
    const y = 20;
    const w = WIDTH - 44;
    const h = HEIGHT - 40;

    ctx.save();
    techPath(ctx, x, y, w, h, 20);
    ctx.strokeStyle = 'rgba(66, 163, 212, 0.34)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(68, 190, 239, 0.66)';
    ctx.lineWidth = 1.5;
    const arm = 58;
    const inset = 16;
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

  drawSurface(rect, accent = 'rgba(61, 150, 196, 0.5)', fill = 'rgba(3, 15, 28, 0.88)', options = {}) {
    const ctx = this.ctx;
    const hovered = Boolean(options.hovered);
    const glow = Number(options.glow || 0);
    const cut = Number(options.cut || 14);

    ctx.save();
    if (glow > 0) {
      ctx.shadowColor = accent;
      ctx.shadowBlur = glow;
    }
    techPath(ctx, rect.x, rect.y, rect.w, rect.h, cut);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = accent;
    ctx.globalAlpha = hovered ? 0.9 : 0.58;
    ctx.lineWidth = hovered ? 1.5 : 1;
    ctx.stroke();
    ctx.restore();
  }

  drawHex(cx, cy, accent, glyph, radius = 16, emphasis = false) {
    const ctx = this.ctx;
    ctx.save();
    if (emphasis) {
      ctx.shadowColor = accent;
      ctx.shadowBlur = 4;
    }
    hexPath(ctx, cx, cy, radius);
    ctx.fillStyle = 'rgba(4, 21, 35, 0.9)';
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = accent;
    ctx.globalAlpha = emphasis ? 0.9 : 0.62;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
    label(ctx, glyph, cx, cy + 4, Math.max(9, radius * 0.6), accent, 900);
    ctx.restore();
  }

  drawHeader(checkpoint) {
    const ctx = this.ctx;
    const statusColor = checkpoint ? '#55d59a' : '#5ac8e9';

    label(ctx, 'ONE BULLET ARENA', WIDTH / 2, 42, 10, '#53cce9', 900);
    label(ctx, 'حلبة الطلقة الواحدة', WIDTH / 2, 92, 39, UI_COLORS.text, 900);

    ctx.fillStyle = 'rgba(83, 176, 218, 0.16)';
    ctx.fillRect(WIDTH / 2 - 255, 113, 510, 1);

    this.drawHex(WIDTH / 2 - 142, 137, statusColor, checkpoint ? '✓' : '◆', 11, false);
    label(
      ctx,
      checkpoint ? 'نقطة الحفظ جاهزة  ·  حفظ محلي' : 'جولة جديدة جاهزة  ·  حفظ محلي',
      WIDTH / 2 + 12,
      142,
      10.5,
      statusColor,
      900,
    );
  }

  drawMetric(x, y, glyph, title, value) {
    const ctx = this.ctx;
    this.drawHex(x, y, '#4cb9dc', glyph, 14, false);
    label(ctx, title, x + 29, y - 2, 8.5, '#72bddb', 800, 'left');
    label(ctx, String(value), x + 29, y + 16, 12.5, '#c1e4f2', 900, 'left');
  }

  drawHero(main, checkpoint) {
    const ctx = this.ctx;
    const accent = checkpoint ? '#f0c84e' : '#66cfe9';
    const wave = checkpoint ? String(checkpoint.wave).padStart(2, '0') : '01';
    const cx = main.x + main.w / 2;

    label(
      ctx,
      checkpoint ? 'نقطة الحفظ النشطة' : 'جولة جديدة',
      cx,
      main.y + 44,
      10,
      checkpoint ? '#56d697' : '#62cde9',
      900,
    );

    ctx.save();
    const glow = ctx.createRadialGradient(cx, main.y + 108, 0, cx, main.y + 108, 220);
    glow.addColorStop(0, checkpoint ? 'rgba(240, 196, 55, 0.075)' : 'rgba(75, 190, 225, 0.07)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(main.x + 70, main.y + 50, main.w - 140, 120);
    ctx.restore();

    label(ctx, `WAVE ${wave}`, cx, main.y + 124, 62, accent, 900);
    label(
      ctx,
      checkpoint ? 'آخر نقطة حفظ جاهزة للمتابعة' : 'طلقة واحدة. استرجعها. واصل القتال.',
      cx,
      main.y + 158,
      13,
      '#dce8ee',
      800,
    );

    ctx.fillStyle = 'rgba(89, 169, 204, 0.16)';
    ctx.fillRect(main.x + 150, main.y + 176, main.w - 300, 1);

    if (checkpoint) {
      this.drawMetric(main.x + 216, main.y + 205, '⇈', 'الترقيات', checkpoint.stats.upgrades.toLocaleString('en-US'));
      ctx.fillStyle = 'rgba(92, 168, 204, 0.14)';
      ctx.fillRect(cx, main.y + 190, 1, 32);
      this.drawMetric(cx + 77, main.y + 205, '◎', 'نقاط الجولة', checkpoint.score.toLocaleString('en-US'));
    } else {
      label(ctx, 'FIRE  ·  RICOCHET  ·  RECALL  ·  SURVIVE', cx, main.y + 208, 9, '#7bb9d3', 900);
    }
  }

  drawActionButton(rect, text, accent, action, options = {}) {
    const ctx = this.ctx;
    const hovered = this.menuHover(rect);
    const primary = Boolean(options.primary);
    const danger = Boolean(options.danger);
    const icon = options.icon || '';

    const fill = danger
      ? hovered ? 'rgba(58, 14, 24, 0.94)' : 'rgba(24, 8, 16, 0.78)'
      : primary
        ? hovered ? 'rgba(76, 59, 15, 0.97)' : 'rgba(48, 39, 14, 0.91)'
        : hovered ? 'rgba(8, 36, 58, 0.96)' : 'rgba(4, 20, 34, 0.84)';

    this.drawSurface(rect, accent, fill, {
      cut: primary ? 13 : 10,
      hovered,
      glow: primary ? (hovered ? 7 : 2) : 0,
    });

    if (primary) {
      ctx.fillStyle = hovered ? '#f7d458' : '#e4bc42';
      ctx.fillRect(rect.x + 1, rect.y + 12, 3, rect.h - 24);
    }

    if (icon) {
      label(ctx, icon, rect.x + 38, rect.y + rect.h / 2 + 6, primary ? 19 : 15, accent, 900);
    }
    label(
      ctx,
      text,
      rect.x + rect.w / 2 + (icon ? 8 : 0),
      rect.y + rect.h / 2 + 6,
      primary ? 16 : danger ? 10.5 : 13.5,
      primary ? '#f8df86' : danger ? '#db6b79' : '#82bed8',
      900,
    );
    this.addUiRegion(rect.x, rect.y, rect.w, rect.h, action);
  }

  drawRecordRow(rect, arTitle, enTitle, value, accent, glyph) {
    const ctx = this.ctx;
    const rowFill = 'rgba(4, 19, 33, 0.72)';
    this.drawSurface(rect, 'rgba(73, 150, 188, 0.34)', rowFill, { cut: 10 });

    this.drawHex(rect.x + 38, rect.y + rect.h / 2, accent, glyph, 16, false);
    const textX = rect.x + 70;
    label(ctx, arTitle, textX, rect.y + 31, 10.5, accent, 900, 'left');
    label(ctx, enTitle, textX, rect.y + 48, 7, '#699eb7', 800, 'left');

    const valueText = String(value);
    const valueSize = valueText.length >= 9 ? 16 : valueText.length >= 7 ? 17.5 : valueText.length >= 5 ? 19 : 22;
    label(ctx, valueText, rect.x + rect.w - 16, rect.y + rect.h / 2 + 8, valueSize, '#e8f0f3', 900, 'right');
  }

  drawBottomHintBar(checkpoint) {
    const ctx = this.ctx;
    const y = 648;

    ctx.fillStyle = 'rgba(72, 150, 189, 0.12)';
    ctx.fillRect(230, y - 1, 820, 1);

    label(ctx, checkpoint ? '[ C ]  متابعة الجولة' : '[ ENTER ]  ابدأ الجولة', 350, y + 23, 10.5, '#88b6cb', 800);
    label(ctx, '[ N ]  جولة جديدة', 640, y + 23, 10.5, '#88b6cb', 800);
    label(ctx, '▣  التقدم محفوظ محليًا', 925, y + 23, 10.5, '#7fbfa8', 800);
  }

  drawMenu() {
    const checkpoint = this.hasContinueCheckpoint() ? this.savedCheckpoint : null;
    const ctx = this.ctx;
    const main = { x: 136, y: 174, w: 680, h: 430 };
    const rail = { x: 842, y: 174, w: 304, h: 430 };

    this.drawDashboardBackdrop();
    this.drawOuterTechFrame();
    this.drawHeader(checkpoint);

    this.drawSurface(main, 'rgba(66, 152, 194, 0.5)', 'rgba(3, 15, 28, 0.83)', { cut: 16 });
    this.drawSurface(rail, 'rgba(66, 152, 194, 0.44)', 'rgba(3, 15, 28, 0.78)', { cut: 16 });

    this.drawHero(main, checkpoint);

    if (checkpoint) {
      this.drawActionButton(
        { x: main.x + 48, y: main.y + 245, w: main.w - 96, h: 56 },
        `متابعة الجولة من WAVE ${String(checkpoint.wave).padStart(2, '0')}`,
        '#e5bd45',
        () => this.continueFromCheckpoint(),
        { primary: true, icon: '▶' },
      );
      this.drawActionButton(
        { x: main.x + 48, y: main.y + 315, w: main.w - 96, h: 42 },
        'جولة جديدة من البداية',
        '#347fa8',
        () => this.startRun(),
        { icon: '↻' },
      );
      this.drawActionButton(
        { x: main.x + 190, y: main.y + 376, w: main.w - 380, h: 28 },
        'حذف نقطة الحفظ',
        '#a84655',
        () => this.clearCheckpoint(),
        { danger: true },
      );
    } else {
      this.drawActionButton(
        { x: main.x + 48, y: main.y + 274, w: main.w - 96, h: 58 },
        'ابدأ الجولة',
        '#e5bd45',
        () => this.startRun(),
        { primary: true, icon: '▶' },
      );
      label(ctx, 'WASD MOVE  ·  MOUSE FIRE  ·  Q RECALL  ·  SPACE DASH', main.x + main.w / 2, main.y + 390, 9, '#6f91a2', 800);
    }

    label(ctx, 'سجلات الجولة', rail.x + rail.w / 2, rail.y + 41, 17, '#64b9da', 900);
    ctx.fillStyle = 'rgba(79, 157, 194, 0.16)';
    ctx.fillRect(rail.x + 34, rail.y + 60, rail.w - 68, 1);

    const rowX = rail.x + 20;
    const rowW = rail.w - 40;
    this.drawRecordRow(
      { x: rowX, y: rail.y + 82, w: rowW, h: 82 },
      'أفضل موجة',
      'BEST WAVE',
      this.highWave,
      '#54bddf',
      '⌾',
    );
    this.drawRecordRow(
      { x: rowX, y: rail.y + 177, w: rowW, h: 82 },
      'أعلى نتيجة',
      'HIGH SCORE',
      this.highScore.toLocaleString('en-US'),
      '#d9b747',
      '◎',
    );
    this.drawRecordRow(
      { x: rowX, y: rail.y + 272, w: rowW, h: 82 },
      checkpoint ? 'نقطة الحفظ' : 'حالة الحفظ',
      checkpoint ? 'CHECKPOINT' : 'SAVE STATUS',
      checkpoint ? `WAVE ${checkpoint.wave}` : 'EMPTY',
      checkpoint ? '#55c993' : '#728491',
      '▣',
    );

    this.drawBottomHintBar(checkpoint);
    label(ctx, `v${RELEASE_VERSION}`, WIDTH - 30, HEIGHT - 13, 8, '#466d82', 800, 'right');
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
