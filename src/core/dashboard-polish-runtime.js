import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from '../game-data.js';
import { RELEASE_VERSION } from '../release.js';
import { UI_FONT } from '../ui-renderer.js';
import { OneBulletVisualOverhaulRuntime } from './visual-overhaul-runtime.js';

export const DASHBOARD_POLISH_RUNTIME_VERSION = '3.3.7-dashboard-command-deck';
export const DASHBOARD_POLISH_REVISION = 'command-deck-v12';

const COLORS = Object.freeze({
  bgTop: '#071725',
  bgMid: '#03101c',
  bgBottom: '#010711',
  cyan: '#56c8e8',
  cyanBright: '#81e5fb',
  cyanSoft: '#8dbfd1',
  gold: '#e5bd45',
  goldBright: '#ffd965',
  goldText: '#f7e08b',
  green: '#55d79b',
  red: '#d96678',
  text: '#f3f7f9',
  soft: '#bacdd6',
  muted: '#7594a4',
  surface: 'rgba(4, 17, 30, 0.90)',
  surfaceStrong: 'rgba(4, 18, 32, 0.97)',
  surfaceSoft: 'rgba(6, 24, 40, 0.72)',
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
    const next = current + (target - current) * 0.18;
    this.dashboardHoverMix[key] = Math.abs(next - target) < 0.01 ? target : next;
    return this.dashboardHoverMix[key];
  }

  drawBackdrop() {
    const ctx = this.ctx;
    ctx.save();

    const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    bg.addColorStop(0, COLORS.bgTop);
    bg.addColorStop(0.5, COLORS.bgMid);
    bg.addColorStop(1, COLORS.bgBottom);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const hero = ctx.createRadialGradient(WIDTH * 0.45, 310, 20, WIDTH * 0.45, 310, 520);
    hero.addColorStop(0, 'rgba(45, 142, 182, 0.15)');
    hero.addColorStop(0.48, 'rgba(19, 73, 101, 0.05)');
    hero.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = hero;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.strokeStyle = 'rgba(74, 151, 184, 0.045)';
    ctx.lineWidth = 1;
    for (let x = 72; x < WIDTH; x += 96) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
    }
    for (let y = 76; y < HEIGHT; y += 96) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(89, 184, 219, 0.055)';
    for (const radius of [270, 390]) {
      ctx.beginPath();
      ctx.arc(WIDTH / 2, 260, radius, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
    }

    const vignette = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 280, WIDTH / 2, HEIGHT / 2, 800);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(0.78, 'rgba(0,3,8,0.10)');
    vignette.addColorStop(1, 'rgba(0,3,9,0.62)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.restore();
  }

  drawFrame() {
    const ctx = this.ctx;
    const frame = { x: 27, y: 22, w: WIDTH - 54, h: HEIGHT - 44 };

    ctx.save();
    techPath(ctx, frame.x, frame.y, frame.w, frame.h, 18);
    ctx.strokeStyle = 'rgba(70, 157, 194, 0.28)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const inset = 13;
    const arm = 54;
    ctx.strokeStyle = 'rgba(86, 205, 240, 0.72)';
    ctx.lineWidth = 1.5;
    for (const [cx, cy, sx, sy] of [
      [frame.x + inset, frame.y + inset, 1, 1],
      [frame.x + frame.w - inset, frame.y + inset, -1, 1],
      [frame.x + inset, frame.y + frame.h - inset, 1, -1],
      [frame.x + frame.w - inset, frame.y + frame.h - inset, -1, -1],
    ]) {
      ctx.beginPath();
      ctx.moveTo(cx, cy + sy * arm);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + sx * arm, cy);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(86, 205, 240, 0.34)';
    ctx.fillRect(73, 684, WIDTH - 146, 1);
    ctx.restore();
  }

  drawSurface(rect, options = {}) {
    const ctx = this.ctx;
    const fill = options.fill || COLORS.surface;
    const border = options.border || 'rgba(73, 157, 194, 0.34)';
    const cut = Number(options.cut || 12);
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
    const status = checkpoint ? COLORS.green : COLORS.cyan;

    drawText(ctx, 'ONE BULLET ARENA', WIDTH / 2, 43, 9, COLORS.cyanBright, 900, 'center', 'ltr');
    drawText(ctx, 'حلبة الطلقة الواحدة', WIDTH / 2, 82, 34, COLORS.text, 900);

    ctx.fillStyle = 'rgba(87, 181, 217, 0.15)';
    ctx.fillRect(WIDTH / 2 - 190, 98, 380, 1);

    const pill = { x: WIDTH / 2 - 144, y: 108, w: 288, h: 32 };
    this.drawSurface(pill, {
      fill: 'rgba(4, 19, 31, 0.78)',
      border: checkpoint ? 'rgba(82, 211, 150, 0.42)' : 'rgba(81, 188, 224, 0.4)',
      cut: 8,
      inner: checkpoint ? 'rgba(82, 211, 150, 0.06)' : 'rgba(81, 188, 224, 0.05)',
    });

    ctx.save();
    ctx.translate(pill.x + 23, pill.y + 16);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = status;
    ctx.fillRect(-5, -5, 10, 10);
    ctx.restore();

    drawText(
      ctx,
      checkpoint ? 'نقطة الحفظ جاهزة  •  محفوظ محليًا' : 'جاهز لجولة جديدة  •  حفظ محلي',
      pill.x + pill.w / 2 + 8,
      pill.y + 21,
      9.2,
      status,
      850,
    );
  }

  drawMetric(rect, title, value, accent) {
    this.drawSurface(rect, {
      fill: 'rgba(6, 23, 39, 0.76)',
      border: 'rgba(75, 159, 194, 0.24)',
      cut: 8,
    });

    this.ctx.fillStyle = accent;
    this.ctx.fillRect(rect.x + 11, rect.y + 11, 2, rect.h - 22);
    drawText(this.ctx, title, rect.x + rect.w - 16, rect.y + 20, 8.2, COLORS.cyanSoft, 850, 'right');
    drawText(this.ctx, String(value), rect.x + rect.w - 16, rect.y + 42, 16, COLORS.text, 900, 'right', 'ltr');
  }

  drawHero(main, checkpoint) {
    const ctx = this.ctx;
    const cx = main.x + main.w / 2;
    const wave = checkpoint ? String(checkpoint.wave).padStart(2, '0') : '01';

    drawText(ctx, checkpoint ? 'ACTIVE CHECKPOINT' : 'NEW RUN', cx, main.y + 35, 7.5, checkpoint ? COLORS.green : COLORS.cyan, 900, 'center', 'ltr');
    drawText(ctx, checkpoint ? 'نقطة الحفظ النشطة' : 'بداية جديدة', cx, main.y + 57, 9.5, checkpoint ? COLORS.green : COLORS.cyanSoft, 800);

    const aura = ctx.createRadialGradient(cx, main.y + 114, 0, cx, main.y + 114, 230);
    aura.addColorStop(0, checkpoint ? 'rgba(229, 189, 69, 0.12)' : 'rgba(86, 200, 232, 0.10)');
    aura.addColorStop(0.56, 'rgba(0,0,0,0.02)');
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.fillRect(main.x + 80, main.y + 55, main.w - 160, 135);

    drawText(ctx, `WAVE ${wave}`, cx, main.y + 131, 61, checkpoint ? COLORS.goldText : '#98e5f3', 900, 'center', 'ltr');
    drawText(ctx, checkpoint ? 'آخر نقطة حفظ جاهزة للمتابعة' : 'طلقة واحدة. استرجعها. واصل القتال.', cx, main.y + 161, 12, COLORS.soft, 700);

    ctx.fillStyle = 'rgba(89, 172, 205, 0.16)';
    ctx.fillRect(cx - 198, main.y + 177, 396, 1);

    if (checkpoint) {
      const metricW = 192;
      const y = main.y + 190;
      this.drawMetric({ x: cx - metricW - 9, y, w: metricW, h: 52 }, 'الترقيات', checkpoint.stats.upgrades.toLocaleString('en-US'), COLORS.cyan);
      this.drawMetric({ x: cx + 9, y, w: metricW, h: 52 }, 'نقاط الجولة', checkpoint.score.toLocaleString('en-US'), COLORS.gold);
    } else {
      drawText(ctx, 'FIRE  •  RICOCHET  •  RECALL  •  SURVIVE', cx, main.y + 219, 8, COLORS.muted, 850, 'center', 'ltr');
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
      ? 'rgba(30, 9, 18, 0.55)'
      : primary
        ? 'rgba(74, 56, 15, 0.96)'
        : 'rgba(5, 23, 39, 0.78)';
    const hoverFill = danger
      ? 'rgba(67, 18, 30, 0.86)'
      : primary
        ? 'rgba(105, 80, 20, 0.98)'
        : 'rgba(8, 34, 54, 0.94)';
    const border = danger
      ? `rgba(217, 102, 120, ${0.42 + mix * 0.45})`
      : primary
        ? `rgba(229, 189, 69, ${0.72 + mix * 0.24})`
        : `rgba(82, 176, 212, ${0.34 + mix * 0.42})`;

    this.drawSurface(rect, {
      fill: mix > 0.02 ? hoverFill : idleFill,
      border,
      cut: primary ? 12 : 9,
      shadow: primary ? 4 + mix * 8 : 0,
      shadowColor: primary ? COLORS.gold : COLORS.cyan,
      inner: primary ? 'rgba(255, 224, 112, 0.07)' : 'rgba(90, 187, 222, 0.04)',
    });

    if (primary) {
      const shine = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y);
      shine.addColorStop(0, 'rgba(255, 219, 94, 0.10)');
      shine.addColorStop(0.5, 'rgba(255, 228, 132, 0.025)');
      shine.addColorStop(1, 'rgba(255, 219, 94, 0.08)');
      ctx.save();
      techPath(ctx, rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4, 10);
      ctx.fillStyle = shine;
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = `rgba(255, 215, 80, ${0.62 + mix * 0.25})`;
      ctx.fillRect(rect.x + 18, rect.y + 5, 118, 2);
      ctx.fillRect(rect.x + rect.w - 118, rect.y + rect.h - 7, 100, 2);
    }

    const color = danger ? COLORS.red : primary ? COLORS.goldText : '#9fd6e8';

    if (icon) {
      const iconBox = { x: rect.x + 15, y: rect.y + (rect.h - 34) / 2, w: 34, h: 34 };
      this.drawSurface(iconBox, {
        fill: primary ? 'rgba(31, 24, 7, 0.86)' : 'rgba(4, 17, 29, 0.84)',
        border: primary ? 'rgba(229, 189, 69, 0.55)' : 'rgba(87, 185, 221, 0.34)',
        cut: 7,
      });
      drawText(ctx, icon, iconBox.x + 17, iconBox.y + 23, primary ? 15 : 13, color, 900, 'center', 'ltr');
    }

    if (badge) {
      const badgeRect = { x: rect.x + rect.w - 96, y: rect.y + (rect.h - 27) / 2, w: 80, h: 27 };
      this.drawSurface(badgeRect, {
        fill: primary ? 'rgba(29, 23, 8, 0.82)' : 'rgba(4, 18, 30, 0.78)',
        border: primary ? 'rgba(229, 189, 69, 0.38)' : 'rgba(82, 174, 210, 0.26)',
        cut: 6,
      });
      drawText(ctx, badge, badgeRect.x + badgeRect.w / 2, badgeRect.y + 18, 8, color, 900, 'center', 'ltr');
    }

    const availableLeft = icon ? rect.x + 58 : rect.x + 16;
    const availableRight = badge ? rect.x + rect.w - 108 : rect.x + rect.w - 16;
    drawText(ctx, text, (availableLeft + availableRight) / 2, rect.y + rect.h / 2 + 6, primary ? 15.5 : danger ? 10.5 : 13, color, 900);

    this.addUiRegion(rect.x, rect.y, rect.w, rect.h, action);
  }

  drawRecordRow(rect, title, subtitle, value, accent, glyph) {
    const cy = rect.y + rect.h / 2;
    this.drawSurface(rect, {
      fill: 'rgba(5, 21, 35, 0.78)',
      border: 'rgba(75, 155, 190, 0.22)',
      cut: 9,
    });

    const icon = { x: rect.x + 13, y: cy - 20, w: 40, h: 40 };
    this.drawSurface(icon, {
      fill: 'rgba(3, 14, 24, 0.92)',
      border: `${accent}88`,
      cut: 9,
    });
    drawText(this.ctx, glyph, icon.x + 20, icon.y + 26, 12.5, accent, 900, 'center', 'ltr');

    drawText(this.ctx, title, rect.x + 66, rect.y + 27, 10.2, accent, 900, 'left');
    drawText(this.ctx, subtitle, rect.x + 66, rect.y + 44, 6.8, COLORS.muted, 850, 'left', 'ltr');

    const valueText = String(value);
    const valueSize = valueText.length >= 9 ? 15.5 : valueText.length >= 7 ? 17 : valueText.length >= 5 ? 19 : 22;
    drawText(this.ctx, valueText, rect.x + rect.w - 15, cy + 7, valueSize, COLORS.text, 900, 'right', 'ltr');
  }

  drawRecords(rail, checkpoint) {
    this.drawSurface(rail, {
      fill: 'rgba(3, 15, 27, 0.84)',
      border: 'rgba(73, 159, 196, 0.34)',
      cut: 14,
      inner: 'rgba(73, 159, 196, 0.045)',
    });

    drawText(this.ctx, 'سجل الجولة', rail.x + 22, rail.y + 34, 17, COLORS.cyanBright, 900, 'left');
    drawText(this.ctx, 'RUN RECORDS', rail.x + 22, rail.y + 52, 7.3, COLORS.muted, 900, 'left', 'ltr');
    this.ctx.fillStyle = 'rgba(82, 174, 209, 0.16)';
    this.ctx.fillRect(rail.x + 20, rail.y + 66, rail.w - 40, 1);

    const x = rail.x + 16;
    const w = rail.w - 32;
    this.drawRecordRow({ x, y: rail.y + 82, w, h: 82 }, 'أفضل موجة', 'BEST WAVE', this.highWave, '#69cee8', '◎');
    this.drawRecordRow({ x, y: rail.y + 176, w, h: 82 }, 'أعلى نتيجة', 'HIGH SCORE', this.highScore.toLocaleString('en-US'), COLORS.gold, '◉');
    this.drawRecordRow(
      { x, y: rail.y + 270, w, h: 82 },
      checkpoint ? 'نقطة الحفظ' : 'حالة الحفظ',
      checkpoint ? 'CHECKPOINT' : 'SAVE STATUS',
      checkpoint ? `WAVE ${checkpoint.wave}` : 'EMPTY',
      checkpoint ? COLORS.green : '#7f96a2',
      checkpoint ? '◆' : '◇',
    );

    const status = { x, y: rail.y + 369, w, h: 43 };
    this.drawSurface(status, {
      fill: checkpoint ? 'rgba(17, 60, 46, 0.26)' : 'rgba(15, 42, 57, 0.26)',
      border: checkpoint ? 'rgba(85, 215, 155, 0.26)' : 'rgba(86, 189, 224, 0.22)',
      cut: 8,
    });
    drawText(this.ctx, checkpoint ? 'الحفظ التلقائي نشط' : 'لا توجد نقطة حفظ بعد', status.x + status.w / 2, status.y + 27, 9.4, checkpoint ? COLORS.green : COLORS.cyanSoft, 850);
  }

  drawFooterHints(checkpoint) {
    const y = 645;
    this.ctx.fillStyle = 'rgba(83, 168, 202, 0.12)';
    this.ctx.fillRect(260, y - 16, 760, 1);

    const hints = [
      [370, checkpoint ? 'C' : '↵', checkpoint ? 'متابعة' : 'ابدأ'],
      [625, 'N', 'جولة جديدة'],
      [860, 'F', 'ملء الشاشة'],
    ];
    for (const [x, key, label] of hints) {
      const keyRect = { x: x - 72, y: y - 3, w: 28, h: 24 };
      this.drawSurface(keyRect, { fill: 'rgba(4, 18, 30, 0.72)', border: 'rgba(83, 177, 213, 0.28)', cut: 5 });
      drawText(this.ctx, key, keyRect.x + 14, keyRect.y + 17, 8, COLORS.cyanSoft, 900, 'center', 'ltr');
      drawText(this.ctx, label, keyRect.x + 40, keyRect.y + 17, 8.5, COLORS.muted, 800, 'left');
    }
    drawText(this.ctx, 'LOCAL SAVE  ON', 1010, y + 14, 7.3, '#6fae93', 900, 'right', 'ltr');
  }

  drawMenu() {
    const checkpoint = this.hasContinueCheckpoint() ? this.savedCheckpoint : null;
    const main = { x: 106, y: 158, w: 704, h: 448 };
    const rail = { x: 834, y: 158, w: 340, h: 448 };

    this.drawBackdrop();
    this.drawFrame();
    this.drawHeader(checkpoint);

    this.drawSurface(main, {
      fill: 'rgba(4, 17, 30, 0.88)',
      border: 'rgba(75, 165, 203, 0.38)',
      cut: 15,
      inner: 'rgba(75, 165, 203, 0.045)',
    });
    this.ctx.fillStyle = 'rgba(87, 202, 239, 0.66)';
    this.ctx.fillRect(main.x + 20, main.y + 7, 100, 2);
    this.ctx.fillStyle = checkpoint ? 'rgba(229, 189, 69, 0.5)' : 'rgba(87, 202, 239, 0.4)';
    this.ctx.fillRect(main.x + main.w - 118, main.y + main.h - 8, 98, 2);

    this.drawHero(main, checkpoint);

    if (checkpoint) {
      const waveBadge = `WAVE ${String(checkpoint.wave).padStart(2, '0')}`;
      this.drawAction(
        { x: main.x + 48, y: main.y + 258, w: main.w - 96, h: 62 },
        'continue',
        `متابعة من الموجة ${checkpoint.wave}`,
        () => this.continueFromCheckpoint(),
        { primary: true, icon: '▶', badge: waveBadge },
      );
      this.drawAction(
        { x: main.x + 48, y: main.y + 334, w: main.w - 96, h: 48 },
        'new-run',
        'بدء جولة جديدة من البداية',
        () => this.startRun(),
        { icon: '↻' },
      );
      this.drawAction(
        { x: main.x + 194, y: main.y + 400, w: main.w - 388, h: 31 },
        'delete-save',
        'حذف نقطة الحفظ',
        () => this.clearCheckpoint(),
        { danger: true },
      );
    } else {
      this.drawAction(
        { x: main.x + 48, y: main.y + 282, w: main.w - 96, h: 62 },
        'start-run',
        'ابدأ الجولة الأولى',
        () => this.startRun(),
        { primary: true, icon: '▶', badge: 'WAVE 01' },
      );
      drawText(this.ctx, 'WASD MOVE  •  MOUSE FIRE  •  Q RECALL  •  SPACE DASH', main.x + main.w / 2, main.y + 409, 8.3, COLORS.muted, 850, 'center', 'ltr');
    }

    this.drawRecords(rail, checkpoint);
    this.drawFooterHints(checkpoint);
    drawText(this.ctx, `v${RELEASE_VERSION}`, WIDTH - 29, HEIGHT - 12, 7.2, '#476d7e', 800, 'right', 'ltr');
  }

  getSnapshot() {
    return {
      ...super.getSnapshot(),
      dashboardPolishRuntimeVersion: DASHBOARD_POLISH_RUNTIME_VERSION,
      checkpointDashboardRevision: DASHBOARD_POLISH_REVISION,
      dashboardPolishActive: true,
      dashboardVisualStyle: 'premium-cinematic-command',
      dashboardLayoutRevision: 'balanced-command-deck-v12',
      rtlTypographyAware: true,
      smoothHoverInterpolation: true,
      gameplayGeometryChanged: false,
      collisionGeometryChanged: false,
    };
  }
}
