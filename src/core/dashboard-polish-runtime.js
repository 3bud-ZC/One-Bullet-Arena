import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from '../game-data.js';
import { RELEASE_VERSION } from '../release.js';
import { UI_FONT } from '../ui-renderer.js';
import { OneBulletVisualOverhaulRuntime } from './visual-overhaul-runtime.js';

export const DASHBOARD_POLISH_RUNTIME_VERSION = '3.3.6-dashboard-cinematic-command';
export const DASHBOARD_POLISH_REVISION = 'cinematic-command-menu-v11';

const COLORS = Object.freeze({
  bgTop: '#061522',
  bgMid: '#03101c',
  bgBottom: '#010711',
  cyan: '#59c8e7',
  cyanBright: '#76dcf4',
  cyanSoft: '#8bbfd2',
  cyanDim: 'rgba(83, 171, 207, 0.22)',
  line: 'rgba(89, 168, 201, 0.22)',
  surface: 'rgba(5, 18, 31, 0.82)',
  surfaceStrong: 'rgba(5, 20, 34, 0.96)',
  surfaceHover: 'rgba(8, 31, 50, 0.98)',
  gold: '#e7bf4b',
  goldBright: '#ffd861',
  goldText: '#f8df86',
  goldFill: 'rgba(64, 49, 14, 0.94)',
  green: '#57d59a',
  red: '#d76576',
  text: '#f1f6f8',
  textSoft: '#b9ccd5',
  muted: '#7293a4',
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
    background.addColorStop(0.46, COLORS.bgMid);
    background.addColorStop(1, COLORS.bgBottom);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const heroGlow = ctx.createRadialGradient(WIDTH * 0.43, 300, 30, WIDTH * 0.43, 300, 500);
    heroGlow.addColorStop(0, 'rgba(45, 145, 188, 0.15)');
    heroGlow.addColorStop(0.48, 'rgba(16, 66, 94, 0.06)');
    heroGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = heroGlow;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const railGlow = ctx.createRadialGradient(WIDTH * 0.83, 360, 0, WIDTH * 0.83, 360, 310);
    railGlow.addColorStop(0, 'rgba(31, 106, 139, 0.08)');
    railGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = railGlow;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.strokeStyle = 'rgba(71, 139, 171, 0.048)';
    ctx.lineWidth = 1;
    for (let x = 76; x < WIDTH; x += 94) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
    }
    for (let y = 72; y < HEIGHT; y += 94) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(80, 177, 214, 0.055)';
    ctx.lineWidth = 1;
    for (const radius of [235, 335, 455]) {
      ctx.beginPath();
      ctx.arc(WIDTH / 2, 255, radius, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
    }

    const vignette = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 240, WIDTH / 2, HEIGHT / 2, 780);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(0.76, 'rgba(0, 2, 8, 0.12)');
    vignette.addColorStop(1, 'rgba(0, 3, 9, 0.62)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.restore();
  }

  drawFrame() {
    const ctx = this.ctx;
    const x = 27;
    const y = 23;
    const w = WIDTH - 54;
    const h = HEIGHT - 46;

    ctx.save();
    techPath(ctx, x, y, w, h, 18);
    ctx.strokeStyle = 'rgba(72, 156, 194, 0.28)';
    ctx.lineWidth = 1;
    ctx.stroke();

    techPath(ctx, x + 11, y + 11, w - 22, h - 22, 14);
    ctx.strokeStyle = 'rgba(70, 139, 170, 0.1)';
    ctx.stroke();

    const arm = 58;
    const inset = 15;
    ctx.strokeStyle = 'rgba(86, 202, 239, 0.68)';
    ctx.lineWidth = 1.6;
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

    ctx.strokeStyle = 'rgba(231, 191, 75, 0.36)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2 - 72, y + 11);
    ctx.lineTo(WIDTH / 2 + 72, y + 11);
    ctx.stroke();

    ctx.fillStyle = 'rgba(86, 202, 239, 0.52)';
    for (const dx of [-96, 96]) ctx.fillRect(WIDTH / 2 + dx - 10, y + 10, 20, 2);
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

    if (options.inner) {
      techPath(ctx, rect.x + 5, rect.y + 5, rect.w - 10, rect.h - 10, Math.max(4, cut - 4));
      ctx.strokeStyle = options.inner;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  drawHeader(checkpoint) {
    const ctx = this.ctx;
    const statusColor = checkpoint ? COLORS.green : COLORS.cyan;

    drawText(ctx, 'ONE BULLET ARENA', WIDTH / 2, 47, 10, COLORS.cyanBright, 900, 'center', 'ltr');
    drawText(ctx, 'حلبة الطلقة الواحدة', WIDTH / 2, 94, 37, COLORS.text, 900);

    ctx.fillStyle = 'rgba(85, 178, 215, 0.13)';
    ctx.fillRect(WIDTH / 2 - 210, 107, 420, 1);

    const pill = { x: WIDTH / 2 - 148, y: 116, w: 296, h: 35 };
    this.drawSurface(pill, {
      fill: 'rgba(4, 19, 30, 0.72)',
      border: checkpoint ? 'rgba(76, 202, 144, 0.48)' : 'rgba(74, 184, 221, 0.44)',
      cut: 9,
      inner: checkpoint ? 'rgba(76, 202, 144, 0.08)' : 'rgba(74, 184, 221, 0.07)',
    });

    ctx.save();
    ctx.translate(pill.x + 25, pill.y + 17.5);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = statusColor;
    ctx.globalAlpha = 0.95;
    ctx.fillRect(-5, -5, 10, 10);
    ctx.restore();

    drawText(
      ctx,
      checkpoint ? 'نقطة الحفظ جاهزة  ·  محفوظ محليًا' : 'جاهز لجولة جديدة  ·  حفظ محلي',
      pill.x + pill.w / 2 + 10,
      pill.y + 22.5,
      10,
      statusColor,
      850,
    );
  }

  drawMetric(rect, title, value, accent) {
    const ctx = this.ctx;
    this.drawSurface(rect, {
      fill: 'rgba(5, 22, 37, 0.7)',
      border: 'rgba(77, 159, 194, 0.28)',
      cut: 8,
      inner: 'rgba(74, 157, 191, 0.055)',
    });

    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(rect.x + 12, rect.y + 11, 2, rect.h - 22);
    ctx.fillRect(rect.x + 14, rect.y + 10, 24, 1.5);
    ctx.globalAlpha = 1;

    drawText(ctx, title, rect.x + rect.w - 18, rect.y + 20, 8.4, COLORS.cyanSoft, 800, 'right');
    drawText(ctx, String(value), rect.x + rect.w - 18, rect.y + 43, 16, COLORS.text, 900, 'right', 'ltr');
  }

  drawHero(main, checkpoint) {
    const ctx = this.ctx;
    const wave = checkpoint ? String(checkpoint.wave).padStart(2, '0') : '01';
    const cx = main.x + main.w / 2;
    const waveColor = checkpoint ? COLORS.goldText : '#9be7f4';

    drawText(
      ctx,
      checkpoint ? 'نقطة الحفظ النشطة' : 'بداية جديدة',
      cx,
      main.y + 42,
      10,
      checkpoint ? COLORS.green : COLORS.cyan,
      850,
    );

    ctx.save();
    const aura = ctx.createRadialGradient(cx, main.y + 112, 0, cx, main.y + 112, 235);
    aura.addColorStop(0, checkpoint ? 'rgba(231, 191, 75, 0.11)' : 'rgba(89, 200, 231, 0.09)');
    aura.addColorStop(0.55, checkpoint ? 'rgba(231, 191, 75, 0.025)' : 'rgba(89, 200, 231, 0.02)');
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aura;
    ctx.fillRect(main.x + 55, main.y + 52, main.w - 110, 135);
    ctx.restore();

    drawText(ctx, '‹‹', cx - 215, main.y + 122, 22, checkpoint ? COLORS.gold : COLORS.cyan, 900, 'center', 'ltr');
    drawText(ctx, `WAVE ${wave}`, cx, main.y + 126, 60, waveColor, 900, 'center', 'ltr');
    drawText(ctx, '››', cx + 215, main.y + 122, 22, checkpoint ? COLORS.gold : COLORS.cyan, 900, 'center', 'ltr');

    drawText(
      ctx,
      checkpoint ? 'آخر نقطة حفظ جاهزة للمتابعة' : 'طلقة واحدة. استرجعها. واصل القتال.',
      cx,
      main.y + 158,
      12.5,
      COLORS.textSoft,
      700,
    );

    ctx.fillStyle = 'rgba(90, 168, 202, 0.17)';
    ctx.fillRect(cx - 205, main.y + 174, 410, 1);

    if (checkpoint) {
      const metricW = 194;
      const metricY = main.y + 186;
      this.drawMetric(
        { x: cx - metricW - 10, y: metricY, w: metricW, h: 54 },
        'الترقيات',
        checkpoint.stats.upgrades.toLocaleString('en-US'),
        '#59c8e7',
      );
      this.drawMetric(
        { x: cx + 10, y: metricY, w: metricW, h: 54 },
        'نقاط الجولة',
        checkpoint.score.toLocaleString('en-US'),
        COLORS.gold,
      );
    } else {
      drawText(ctx, 'FIRE  ·  RICOCHET  ·  RECALL  ·  SURVIVE', cx, main.y + 214, 8.5, COLORS.muted, 800, 'center', 'ltr');
    }
  }

  drawAction(rect, key, text, action, options = {}) {
    const ctx = this.ctx;
    const hovered = this.menuHover(rect);
    const mix = this.hoverMix(key, hovered);
    const primary = Boolean(options.primary);
    const danger = Boolean(options.danger);
    const icon = options.icon || '';
    const badge = options.badge || '';

    const idleFill = danger
      ? 'rgba(27, 8, 16, 0.52)'
      : primary
        ? COLORS.goldFill
        : 'rgba(5, 22, 37, 0.78)';
    const hoverFill = danger
      ? 'rgba(67, 18, 30, 0.82)'
      : primary
        ? 'rgba(91, 69, 18, 0.98)'
        : COLORS.surfaceHover;

    const border = danger
      ? `rgba(215, 101, 118, ${0.4 + mix * 0.5})`
      : primary
        ? `rgba(231, 191, 75, ${0.7 + mix * 0.28})`
        : `rgba(80, 171, 210, ${0.34 + mix * 0.45})`;

    this.drawSurface(rect, {
      fill: mix > 0.02 ? hoverFill : idleFill,
      border,
      cut: primary ? 12 : 9,
      shadow: primary ? 4 + mix * 8 : mix * 2,
      shadowColor: primary ? COLORS.gold : COLORS.cyan,
      inner: primary ? 'rgba(255, 220, 100, 0.08)' : 'rgba(95, 190, 224, 0.05)',
    });

    if (primary) {
      const sheen = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
      sheen.addColorStop(0, 'rgba(255, 218, 86, 0.12)');
      sheen.addColorStop(0.52, `rgba(255, 226, 113, ${0.035 + mix * 0.05})`);
      sheen.addColorStop(1, 'rgba(255, 209, 65, 0.01)');
      ctx.save();
      techPath(ctx, rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4, 10);
      ctx.fillStyle = sheen;
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = `rgba(255, 216, 80, ${0.64 + mix * 0.24})`;
      ctx.fillRect(rect.x + 18, rect.y + 5, Math.min(130, rect.w * 0.2), 2);
      ctx.fillRect(rect.x + rect.w - 126, rect.y + rect.h - 7, 108, 2);
    }

    const color = danger ? COLORS.red : primary ? COLORS.goldText : '#9bd2e5';

    if (icon) {
      const iconBox = { x: rect.x + 16, y: rect.y + (rect.h - 32) / 2, w: 32, h: 32 };
      this.drawSurface(iconBox, {
        fill: primary ? 'rgba(35, 28, 9, 0.74)' : 'rgba(4, 18, 30, 0.72)',
        border: primary ? 'rgba(231, 191, 75, 0.55)' : 'rgba(86, 188, 226, 0.36)',
        cut: 7,
      });
      drawText(ctx, icon, iconBox.x + iconBox.w / 2, iconBox.y + 22, primary ? 15 : 13, color, 900, 'center', 'ltr');
    }

    if (badge) {
      const badgeW = 82;
      const badgeRect = { x: rect.x + rect.w - badgeW - 15, y: rect.y + (rect.h - 26) / 2, w: badgeW, h: 26 };
      this.drawSurface(badgeRect, {
        fill: primary ? 'rgba(29, 23, 8, 0.7)' : 'rgba(4, 19, 31, 0.72)',
        border: primary ? 'rgba(231, 191, 75, 0.4)' : 'rgba(86, 184, 219, 0.28)',
        cut: 6,
      });
      drawText(ctx, badge, badgeRect.x + badgeRect.w / 2, badgeRect.y + 18, 8, color, 900, 'center', 'ltr');
    }

    const textOffset = icon && !badge ? 8 : 0;
    drawText(
      ctx,
      text,
      rect.x + rect.w / 2 + textOffset,
      rect.y + rect.h / 2 + 6,
      primary ? 15.5 : danger ? 10.5 : 13,
      color,
      900,
    );

    this.addUiRegion(rect.x, rect.y, rect.w, rect.h, action);
  }

  drawRecordRow(rect, title, subtitle, value, accent, glyph = '•') {
    const ctx = this.ctx;
    const cy = rect.y + rect.h / 2;

    this.drawSurface(rect, {
      fill: 'rgba(4, 18, 31, 0.72)',
      border: 'rgba(72, 153, 188, 0.22)',
      cut: 9,
      inner: 'rgba(78, 162, 196, 0.045)',
    });

    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.82;
    ctx.fillRect(rect.x + 14, rect.y + 7, 42, 2);
    ctx.globalAlpha = 1;

    const icon = { x: rect.x + 13, y: cy - 20, w: 40, h: 40 };
    this.drawSurface(icon, {
      fill: 'rgba(3, 15, 26, 0.86)',
      border: `${accent}99`,
      cut: 9,
    });
    drawText(ctx, glyph, icon.x + icon.w / 2, icon.y + 26, 13, accent, 900, 'center', 'ltr');

    drawText(ctx, title, rect.x + 68, rect.y + 28, 10.5, accent, 900, 'left');
    drawText(ctx, subtitle, rect.x + 68, rect.y + 46, 7.2, COLORS.muted, 800, 'left', 'ltr');

    const valueText = String(value);
    const valueSize = valueText.length >= 9 ? 15.5 : valueText.length >= 7 ? 17 : valueText.length >= 5 ? 19 : 22;
    drawText(ctx, valueText, rect.x + rect.w - 15, cy + 7, valueSize, COLORS.text, 900, 'right', 'ltr');
  }

  drawRecords(rail, checkpoint) {
    const ctx = this.ctx;
    this.drawSurface(rail, {
      fill: 'rgba(3, 15, 27, 0.72)',
      border: 'rgba(75, 161, 199, 0.3)',
      cut: 15,
      inner: 'rgba(74, 159, 197, 0.055)',
    });

    drawText(ctx, 'سجل الجولة', rail.x + 24, rail.y + 36, 17, COLORS.cyanBright, 900, 'left');
    drawText(ctx, 'RUN RECORDS', rail.x + 24, rail.y + 55, 7.5, COLORS.muted, 900, 'left', 'ltr');

    ctx.fillStyle = 'rgba(82, 174, 209, 0.18)';
    ctx.fillRect(rail.x + 22, rail.y + 68, rail.w - 44, 1);

    const rowX = rail.x + 18;
    const rowW = rail.w - 36;
    this.drawRecordRow(
      { x: rowX, y: rail.y + 87, w: rowW, h: 78 },
      'أفضل موجة',
      'BEST WAVE',
      this.highWave,
      '#66c8e4',
      '◎',
    );
    this.drawRecordRow(
      { x: rowX, y: rail.y + 178, w: rowW, h: 78 },
      'أعلى نتيجة',
      'HIGH SCORE',
      this.highScore.toLocaleString('en-US'),
      '#e3bd49',
      '◉',
    );
    this.drawRecordRow(
      { x: rowX, y: rail.y + 269, w: rowW, h: 78 },
      checkpoint ? 'نقطة الحفظ' : 'حالة الحفظ',
      checkpoint ? 'CHECKPOINT' : 'SAVE STATUS',
      checkpoint ? `WAVE ${checkpoint.wave}` : 'EMPTY',
      checkpoint ? COLORS.green : '#7f96a2',
      checkpoint ? '◆' : '◇',
    );

    const status = { x: rail.x + 18, y: rail.y + 365, w: rail.w - 36, h: 42 };
    this.drawSurface(status, {
      fill: checkpoint ? 'rgba(18, 63, 48, 0.24)' : 'rgba(18, 43, 58, 0.24)',
      border: checkpoint ? 'rgba(87, 213, 154, 0.25)' : 'rgba(89, 200, 231, 0.2)',
      cut: 8,
    });
    drawText(
      ctx,
      checkpoint ? 'الحفظ التلقائي نشط' : 'لا توجد نقطة حفظ بعد',
      status.x + status.w / 2,
      status.y + 26,
      9.5,
      checkpoint ? COLORS.green : COLORS.cyanSoft,
      850,
    );
  }

  drawKeyHint(x, y, key, label, accent = COLORS.cyanSoft) {
    const ctx = this.ctx;
    const keyRect = { x, y, w: 30, h: 27 };
    this.drawSurface(keyRect, {
      fill: 'rgba(4, 18, 30, 0.78)',
      border: 'rgba(83, 177, 213, 0.34)',
      cut: 6,
    });
    drawText(ctx, key, keyRect.x + keyRect.w / 2, keyRect.y + 19, 9, accent, 900, 'center', 'ltr');
    drawText(ctx, label, keyRect.x + 43, keyRect.y + 19, 9, COLORS.muted, 800, 'left');
  }

  drawFooterHints(checkpoint) {
    const footer = { x: 220, y: 625, w: 840, h: 50 };
    this.drawSurface(footer, {
      fill: 'rgba(3, 15, 26, 0.58)',
      border: 'rgba(74, 157, 193, 0.22)',
      cut: 11,
      inner: 'rgba(74, 157, 193, 0.04)',
    });

    this.drawKeyHint(footer.x + 34, footer.y + 11, checkpoint ? 'C' : '↵', checkpoint ? 'متابعة' : 'ابدأ');
    this.drawKeyHint(footer.x + 300, footer.y + 11, 'N', 'جولة جديدة');
    this.drawKeyHint(footer.x + 564, footer.y + 11, 'F', 'ملء الشاشة', COLORS.green);

    drawText(this.ctx, 'LOCAL SAVE  ON', footer.x + footer.w - 25, footer.y + 31, 7.5, '#6fae93', 900, 'right', 'ltr');
  }

  drawMenu() {
    const checkpoint = this.hasContinueCheckpoint() ? this.savedCheckpoint : null;
    const main = { x: 112, y: 174, w: 750, h: 430 };
    const rail = { x: 884, y: 174, w: 282, h: 430 };

    this.drawBackdrop();
    this.drawFrame();
    this.drawHeader(checkpoint);

    this.drawSurface(main, {
      fill: 'rgba(4, 17, 30, 0.84)',
      border: 'rgba(75, 166, 204, 0.4)',
      cut: 16,
      inner: 'rgba(74, 166, 205, 0.06)',
    });

    this.ctx.fillStyle = 'rgba(84, 190, 228, 0.62)';
    this.ctx.fillRect(main.x + 24, main.y + 7, 112, 2);
    this.ctx.fillStyle = checkpoint ? 'rgba(231, 191, 75, 0.52)' : 'rgba(84, 190, 228, 0.4)';
    this.ctx.fillRect(main.x + main.w - 150, main.y + main.h - 8, 118, 2);

    this.drawHero(main, checkpoint);

    if (checkpoint) {
      const waveLabel = `WAVE ${String(checkpoint.wave).padStart(2, '0')}`;
      this.drawAction(
        { x: main.x + 56, y: main.y + 252, w: main.w - 112, h: 60 },
        'continue',
        `متابعة من الموجة ${checkpoint.wave}`,
        () => this.continueFromCheckpoint(),
        { primary: true, icon: '▶', badge: waveLabel },
      );
      this.drawAction(
        { x: main.x + 56, y: main.y + 326, w: main.w - 112, h: 46 },
        'new-run',
        'بدء جولة جديدة من البداية',
        () => this.startRun(),
        { icon: '↻' },
      );
      this.drawAction(
        { x: main.x + 220, y: main.y + 387, w: main.w - 440, h: 30 },
        'delete-save',
        'حذف نقطة الحفظ',
        () => this.clearCheckpoint(),
        { danger: true },
      );
    } else {
      this.drawAction(
        { x: main.x + 56, y: main.y + 278, w: main.w - 112, h: 60 },
        'start-run',
        'ابدأ الجولة الأولى',
        () => this.startRun(),
        { primary: true, icon: '▶', badge: 'WAVE 01' },
      );
      drawText(this.ctx, 'WASD MOVE   ·   MOUSE FIRE   ·   Q RECALL   ·   SPACE DASH', main.x + main.w / 2, main.y + 400, 8.5, COLORS.muted, 800, 'center', 'ltr');
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
