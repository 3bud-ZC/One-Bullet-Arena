import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from '../game-data.js';
import { RELEASE_VERSION } from '../release.js';
import { UI_FONT, upgradeEffectText, wrapRtl } from '../ui-renderer.js';
import { OneBulletUnifiedUiRuntime } from './unified-ui-runtime.js';

export const PRODUCTION_ART_RUNTIME_VERSION = '3.5.0-production-art';
export const PRODUCTION_ART_REVISION = 'production-command-suite-v1';

const ART = Object.freeze({
  bg0: '#020711',
  bg1: '#061421',
  bg2: '#081d2b',
  panel: 'rgba(5, 18, 31, 0.94)',
  panel2: 'rgba(7, 25, 40, 0.9)',
  panelSoft: 'rgba(7, 25, 40, 0.62)',
  cyan: '#62d5f3',
  cyanSoft: '#92c8db',
  cyanDim: 'rgba(98, 213, 243, 0.18)',
  gold: '#e8bc45',
  goldSoft: '#f5d878',
  green: '#55d79b',
  red: '#df6879',
  white: '#f4f8fa',
  soft: '#b6cad4',
  muted: '#6f8e9d',
  line: 'rgba(91, 180, 214, 0.22)',
});

const STAGE_WAVES = Object.freeze([1, 3, 6, 9, 13, 18, 25, 35]);

function path(ctx, x, y, w, h, cut = 12) {
  const c = Math.max(2, Math.min(cut, Math.min(w, h) / 3));
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

function text(ctx, value, x, y, size, color, weight = 700, align = 'center', direction = 'rtl') {
  ctx.save();
  ctx.direction = direction;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${weight} ${size}px ${UI_FONT}`;
  ctx.fillStyle = color;
  ctx.fillText(String(value), x, y);
  ctx.restore();
}

function stageForWave(wave) {
  let index = 0;
  for (let i = 0; i < STAGE_WAVES.length; i += 1) if (wave >= STAGE_WAVES[i]) index = i;
  return index;
}

export class OneBulletProductionArtRuntime extends OneBulletUnifiedUiRuntime {
  constructor(canvas, liveRegion = null) {
    super(canvas, liveRegion);
    this.productionArtRuntimeVersion = PRODUCTION_ART_RUNTIME_VERSION;
    this.productionArtRevision = PRODUCTION_ART_REVISION;
    this.productionHover = Object.create(null);
  }

  mix(key, active) {
    const current = Number(this.productionHover[key] || 0);
    const target = active ? 1 : 0;
    const next = current + (target - current) * 0.18;
    this.productionHover[key] = Math.abs(target - next) < 0.01 ? target : next;
    return this.productionHover[key];
  }

  panel(rect, options = {}) {
    const ctx = this.ctx;
    const border = options.border || 'rgba(83, 174, 210, 0.3)';
    ctx.save();
    if (options.shadow) {
      ctx.shadowColor = options.shadowColor || border;
      ctx.shadowBlur = options.shadow;
    }
    path(ctx, rect.x, rect.y, rect.w, rect.h, options.cut ?? 12);
    ctx.fillStyle = options.fill || ART.panel;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = border;
    ctx.lineWidth = options.lineWidth || 1;
    ctx.stroke();
    if (options.inner) {
      path(ctx, rect.x + 4, rect.y + 4, rect.w - 8, rect.h - 8, Math.max(4, (options.cut ?? 12) - 4));
      ctx.strokeStyle = options.inner;
      ctx.stroke();
    }
    ctx.restore();
  }

  drawProductionBackground() {
    const ctx = this.ctx;
    const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    bg.addColorStop(0, ART.bg0);
    bg.addColorStop(0.52, ART.bg1);
    bg.addColorStop(1, '#020913');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const glow = ctx.createRadialGradient(WIDTH * 0.42, HEIGHT * 0.43, 30, WIDTH * 0.42, HEIGHT * 0.43, 560);
    glow.addColorStop(0, 'rgba(36, 133, 173, 0.16)');
    glow.addColorStop(0.42, 'rgba(19, 73, 102, 0.06)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.save();
    ctx.strokeStyle = 'rgba(74, 148, 181, 0.045)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= WIDTH; x += 96) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= HEIGHT; y += 96) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y);
      ctx.stroke();
    }
    ctx.restore();

    const vignette = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 260, WIDTH / 2, HEIGHT / 2, 780);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,3,9,0.62)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  drawBrand(checkpoint) {
    const status = checkpoint ? 'CHECKPOINT READY' : 'NEW RUN READY';
    const statusColor = checkpoint ? ART.green : ART.cyan;

    text(this.ctx, 'ONE BULLET ARENA', 64, 54, 10, ART.cyan, 900, 'left', 'ltr');
    text(this.ctx, 'حلبة الطلقة الواحدة', 64, 93, 29, ART.white, 900, 'left');
    text(this.ctx, 'SINGLE ROUND  /  ZERO WASTE', 64, 116, 7.5, ART.muted, 850, 'left', 'ltr');

    const statusRect = { x: 947, y: 46, w: 269, h: 44 };
    this.panel(statusRect, {
      fill: 'rgba(5, 23, 35, 0.72)',
      border: checkpoint ? 'rgba(85,215,155,0.34)' : 'rgba(98,213,243,0.28)',
      cut: 9,
    });
    this.ctx.fillStyle = statusColor;
    this.ctx.beginPath();
    this.ctx.arc(statusRect.x + 23, statusRect.y + 22, 5, 0, Math.PI * 2);
    this.ctx.fill();
    text(this.ctx, status, statusRect.x + 40, statusRect.y + 20, 7.6, statusColor, 900, 'left', 'ltr');
    text(this.ctx, checkpoint ? 'محفوظ محليًا وجاهز للاستكمال' : 'ابدأ من الموجة الأولى', statusRect.x + 40, statusRect.y + 34, 8.4, ART.soft, 700, 'left');
  }

  drawMetricTile(rect, label, value, accent = ART.cyan) {
    this.panel(rect, {
      fill: 'rgba(6, 24, 39, 0.78)',
      border: 'rgba(75, 153, 187, 0.22)',
      cut: 8,
    });
    this.ctx.fillStyle = accent;
    this.ctx.fillRect(rect.x + 12, rect.y + 12, 2, rect.h - 24);
    text(this.ctx, label, rect.x + 26, rect.y + 21, 7.5, ART.muted, 850, 'left', 'ltr');
    text(this.ctx, value, rect.x + 26, rect.y + 45, 16, ART.white, 900, 'left', 'ltr');
  }

  drawProductionButton(rect, key, label, action, options = {}) {
    const hover = this.menuHover(rect);
    const m = this.mix(key, hover);
    const primary = Boolean(options.primary);
    const danger = Boolean(options.danger);
    const accent = danger ? ART.red : primary ? ART.gold : ART.cyan;
    const fill = danger
      ? `rgba(48, 13, 24, ${0.58 + m * 0.18})`
      : primary
        ? `rgba(72, 53, 13, ${0.92 + m * 0.06})`
        : `rgba(5, 24, 40, ${0.76 + m * 0.16})`;

    this.panel(rect, {
      fill,
      border: danger
        ? `rgba(223,104,121,${0.38 + m * 0.45})`
        : primary
          ? `rgba(232,188,69,${0.68 + m * 0.26})`
          : `rgba(98,213,243,${0.28 + m * 0.35})`,
      cut: primary ? 11 : 9,
      shadow: primary ? 5 + m * 7 : 0,
      shadowColor: ART.gold,
      inner: primary ? 'rgba(255,230,145,0.055)' : null,
    });

    if (primary) {
      this.ctx.fillStyle = `rgba(255,218,85,${0.62 + m * 0.2})`;
      this.ctx.fillRect(rect.x + 16, rect.y + 5, 108, 2);
      this.ctx.fillRect(rect.x + rect.w - 108, rect.y + rect.h - 7, 92, 2);
    }

    if (options.icon) {
      const box = { x: rect.x + 16, y: rect.y + (rect.h - 34) / 2, w: 34, h: 34 };
      this.panel(box, {
        fill: 'rgba(3,14,24,0.82)',
        border: primary ? 'rgba(232,188,69,0.5)' : 'rgba(98,213,243,0.3)',
        cut: 7,
      });
      text(this.ctx, options.icon, box.x + 17, box.y + 23, 14, primary ? ART.goldSoft : ART.cyanSoft, 900, 'center', 'ltr');
    }

    if (options.badge) {
      const badge = { x: rect.x + rect.w - 98, y: rect.y + (rect.h - 28) / 2, w: 82, h: 28 };
      this.panel(badge, {
        fill: 'rgba(3,14,24,0.66)',
        border: primary ? 'rgba(232,188,69,0.32)' : 'rgba(98,213,243,0.22)',
        cut: 6,
      });
      text(this.ctx, options.badge, badge.x + 41, badge.y + 19, 8, primary ? ART.goldSoft : ART.cyanSoft, 900, 'center', 'ltr');
    }

    const left = options.icon ? rect.x + 58 : rect.x + 18;
    const right = options.badge ? rect.x + rect.w - 110 : rect.x + rect.w - 18;
    text(this.ctx, label, (left + right) / 2, rect.y + rect.h / 2 + 6, primary ? 15 : danger ? 10.5 : 12.5, primary ? ART.goldSoft : danger ? ART.red : ART.cyanSoft, 900);
    this.addUiRegion(rect.x, rect.y, rect.w, rect.h, action);
  }

  drawRecordCard(rect, title, english, value, accent, glyph) {
    this.panel(rect, {
      fill: 'rgba(5, 21, 35, 0.8)',
      border: 'rgba(72, 153, 188, 0.2)',
      cut: 9,
    });
    const icon = { x: rect.x + 14, y: rect.y + 16, w: 42, h: 42 };
    this.panel(icon, { fill: 'rgba(3,14,24,0.86)', border: `${accent}77`, cut: 9 });
    text(this.ctx, glyph, icon.x + 21, icon.y + 27, 13, accent, 900, 'center', 'ltr');
    text(this.ctx, title, rect.x + 70, rect.y + 31, 10.2, accent, 900, 'left');
    text(this.ctx, english, rect.x + 70, rect.y + 49, 6.8, ART.muted, 850, 'left', 'ltr');
    const s = String(value);
    text(this.ctx, s, rect.x + rect.w - 16, rect.y + 46, s.length > 8 ? 15 : s.length > 6 ? 17 : 21, ART.white, 900, 'right', 'ltr');
  }

  drawProgressRail(rect, checkpoint) {
    this.panel(rect, {
      fill: 'rgba(3, 15, 27, 0.8)',
      border: 'rgba(78, 165, 202, 0.28)',
      cut: 13,
    });
    text(this.ctx, 'RUN INTELLIGENCE', rect.x + 22, rect.y + 31, 8, ART.cyan, 900, 'left', 'ltr');
    text(this.ctx, 'سجل الجولة', rect.x + 22, rect.y + 57, 19, ART.white, 900, 'left');
    this.ctx.fillStyle = ART.line;
    this.ctx.fillRect(rect.x + 22, rect.y + 72, rect.w - 44, 1);

    const cardX = rect.x + 16;
    const cardW = rect.w - 32;
    this.drawRecordCard({ x: cardX, y: rect.y + 88, w: cardW, h: 75 }, 'أفضل موجة', 'BEST WAVE', this.highWave, ART.cyan, '◎');
    this.drawRecordCard({ x: cardX, y: rect.y + 174, w: cardW, h: 75 }, 'أعلى نتيجة', 'HIGH SCORE', this.highScore.toLocaleString('en-US'), ART.gold, '◉');
    this.drawRecordCard({ x: cardX, y: rect.y + 260, w: cardW, h: 75 }, 'نقطة الحفظ', 'CHECKPOINT', checkpoint ? `WAVE ${checkpoint.wave}` : 'EMPTY', checkpoint ? ART.green : ART.muted, '◆');

    const stageWave = checkpoint?.wave || 1;
    const stage = stageForWave(stageWave);
    const final = stage >= STAGE_WAVES.length - 1;
    const info = { x: cardX, y: rect.y + 352, w: cardW, h: 89 };
    this.panel(info, {
      fill: 'rgba(8, 28, 42, 0.58)',
      border: 'rgba(91, 181, 214, 0.18)',
      cut: 9,
    });
    text(this.ctx, 'WORLD PROGRESSION', info.x + 14, info.y + 19, 6.8, ART.muted, 900, 'left', 'ltr');
    text(this.ctx, final ? 'العالم مفتوح بالكامل' : `القطاع ${stage + 1} من ${STAGE_WAVES.length}`, info.x + 14, info.y + 42, 11, final ? ART.green : ART.cyanSoft, 850, 'left');
    if (!final) {
      text(this.ctx, `NEXT EXPANSION  /  WAVE ${STAGE_WAVES[stage + 1]}`, info.x + 14, info.y + 65, 7.2, ART.goldSoft, 850, 'left', 'ltr');
      const progress = Math.max(0, Math.min(1, (stageWave - STAGE_WAVES[stage]) / (STAGE_WAVES[stage + 1] - STAGE_WAVES[stage])));
      this.ctx.fillStyle = 'rgba(108,158,181,0.14)';
      this.ctx.fillRect(info.x + 14, info.y + 75, info.w - 28, 4);
      this.ctx.fillStyle = ART.cyan;
      this.ctx.fillRect(info.x + 14, info.y + 75, (info.w - 28) * progress, 4);
    } else {
      text(this.ctx, 'FINAL BELT ONLINE', info.x + 14, info.y + 66, 7.3, ART.muted, 850, 'left', 'ltr');
    }
  }

  drawMenu() {
    const checkpoint = this.hasContinueCheckpoint() ? this.savedCheckpoint : null;
    this.drawProductionBackground();
    this.drawBrand(checkpoint);

    const main = { x: 64, y: 139, w: 820, h: 512 };
    const rail = { x: 910, y: 139, w: 306, h: 512 };
    this.panel(main, {
      fill: 'rgba(4, 17, 30, 0.88)',
      border: 'rgba(83, 174, 210, 0.29)',
      cut: 15,
      inner: 'rgba(83,174,210,0.035)',
    });

    const wave = checkpoint ? checkpoint.wave : 1;
    text(this.ctx, checkpoint ? 'ACTIVE CHECKPOINT' : 'NEW RUN', main.x + 40, main.y + 42, 7.6, checkpoint ? ART.green : ART.cyan, 900, 'left', 'ltr');
    text(this.ctx, checkpoint ? 'استكمال التقدم المحفوظ' : 'ابدأ رحلة جديدة', main.x + 40, main.y + 69, 16, ART.soft, 850, 'left');

    const hero = { x: main.x + 40, y: main.y + 92, w: main.w - 80, h: 152 };
    this.panel(hero, {
      fill: 'rgba(5, 23, 38, 0.58)',
      border: checkpoint ? 'rgba(232,188,69,0.26)' : 'rgba(98,213,243,0.22)',
      cut: 12,
    });
    text(this.ctx, 'CURRENT WAVE', hero.x + 24, hero.y + 27, 7.2, ART.muted, 850, 'left', 'ltr');
    text(this.ctx, String(wave).padStart(2, '0'), hero.x + 24, hero.y + 104, 70, checkpoint ? ART.goldSoft : ART.cyanSoft, 900, 'left', 'ltr');
    text(this.ctx, checkpoint ? 'نقطة حفظ جاهزة للعودة' : 'طلقة واحدة. كل قرار مهم.', hero.x + 178, hero.y + 66, 15, ART.white, 900, 'left');
    text(this.ctx, checkpoint ? 'استرجع كل ترقياتك وواصل من بداية الموجة.' : 'أطلق، ارتد، استرجع الطلقة، ثم تحرك قبل أن تُحاصر.', hero.x + 178, hero.y + 94, 10.5, ART.soft, 650, 'left');
    text(this.ctx, 'FIRE  •  RICOCHET  •  RECALL  •  SURVIVE', hero.x + 178, hero.y + 121, 7.2, ART.muted, 850, 'left', 'ltr');

    const metricY = main.y + 261;
    const metricW = 222;
    this.drawMetricTile({ x: main.x + 40, y: metricY, w: metricW, h: 58 }, 'UPGRADES', checkpoint ? checkpoint.stats.upgrades.toLocaleString('en-US') : '0', ART.cyan);
    this.drawMetricTile({ x: main.x + 278, y: metricY, w: metricW, h: 58 }, 'RUN SCORE', checkpoint ? checkpoint.score.toLocaleString('en-US') : '0', ART.gold);
    this.drawMetricTile({ x: main.x + 516, y: metricY, w: metricW, h: 58 }, 'SAVE STATUS', checkpoint ? 'READY' : 'EMPTY', checkpoint ? ART.green : ART.muted);

    if (checkpoint) {
      this.drawProductionButton(
        { x: main.x + 40, y: main.y + 337, w: main.w - 80, h: 64 },
        'continue-production',
        `متابعة من الموجة ${checkpoint.wave}`,
        () => this.continueFromCheckpoint(),
        { primary: true, icon: '▶', badge: `WAVE ${String(checkpoint.wave).padStart(2, '0')}` },
      );
      this.drawProductionButton(
        { x: main.x + 40, y: main.y + 413, w: main.w - 80, h: 48 },
        'new-production',
        'بدء جولة جديدة من البداية',
        () => this.startRun(),
        { icon: '↻' },
      );
      this.drawProductionButton(
        { x: main.x + 264, y: main.y + 473, w: main.w - 528, h: 27 },
        'delete-production',
        'حذف نقطة الحفظ',
        () => this.clearCheckpoint(),
        { danger: true },
      );
    } else {
      this.drawProductionButton(
        { x: main.x + 40, y: main.y + 356, w: main.w - 80, h: 66 },
        'start-production',
        'ابدأ الجولة الأولى',
        () => this.startRun(),
        { primary: true, icon: '▶', badge: 'WAVE 01' },
      );
      text(this.ctx, 'WASD MOVE   •   MOUSE FIRE   •   Q RECALL   •   SPACE DASH', main.x + main.w / 2, main.y + 474, 8, ART.muted, 850, 'center', 'ltr');
    }

    this.drawProgressRail(rail, checkpoint);

    text(this.ctx, checkpoint ? 'C  CONTINUE' : 'ENTER  START', 70, 686, 7.4, ART.muted, 850, 'left', 'ltr');
    text(this.ctx, 'N  NEW RUN', 216, 686, 7.4, ART.muted, 850, 'left', 'ltr');
    text(this.ctx, 'F  FULLSCREEN', 338, 686, 7.4, ART.muted, 850, 'left', 'ltr');
    text(this.ctx, `v${RELEASE_VERSION}`, WIDTH - 28, 686, 7.2, '#466b7c', 800, 'right', 'ltr');
  }

  drawHudBar(x, y, w, h, ratio, color) {
    const value = Math.max(0, Math.min(1, Number(ratio) || 0));
    this.ctx.fillStyle = 'rgba(118,168,191,0.13)';
    this.ctx.fillRect(x, y, w, h);
    if (value <= 0) return;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w * value, h);
  }

  drawHud() {
    const ctx = this.ctx;
    const left = { x: 18, y: 14, w: 315, h: 64 };
    const center = { x: 448, y: 14, w: 384, h: 64 };
    const right = { x: 947, y: 14, w: 315, h: 64 };
    const bulletColor = this.bullet.held ? ART.gold : ART.cyan;

    for (const [rect, accent] of [[left, bulletColor], [center, ART.cyan], [right, this.player.health <= Math.max(1, this.player.maxHealth * 0.34) ? ART.red : ART.green]]) {
      this.panel(rect, { fill: 'rgba(3,15,27,0.82)', border: 'rgba(77,161,197,0.28)', cut: 10 });
      ctx.fillStyle = accent;
      ctx.fillRect(rect.x + 14, rect.y + 5, 56, 2);
    }

    text(ctx, this.bullet.held ? 'الطلقة جاهزة' : this.bullet.recalling ? 'الطلقة عائدة' : 'الطلقة في الميدان', left.x + 18, left.y + 25, 10.5, bulletColor, 900, 'left');
    text(ctx, this.bullet.held ? 'READY TO FIRE' : this.bullet.recalling ? 'RETURNING' : 'Q  RECALL', left.x + 18, left.y + 42, 6.8, ART.muted, 900, 'left', 'ltr');
    const recallMax = Math.max(1.15, 3.8 - this.stack('magnetic-recall') * 0.38);
    this.drawHudBar(left.x + 18, left.y + 51, left.w - 36, 4, this.bullet.held ? 1 : 1 - this.bullet.recallCooldown / recallMax, bulletColor);

    text(ctx, `WAVE ${String(this.wave).padStart(2, '0')}`, center.x + center.w / 2, center.y + 27, 16, ART.white, 900, 'center', 'ltr');
    text(ctx, this.currentEncounter?.name || 'ضغط متوازن', center.x + center.w / 2, center.y + 44, 8.8, ART.goldSoft, 850);
    text(ctx, `${this.enemies.length} ENEMIES  •  ${this.score.toLocaleString('en-US')} SCORE  •  S${this.arenaStage.id + 1}`, center.x + center.w / 2, center.y + 58, 6.6, ART.muted, 850, 'center', 'ltr');

    const hpRatio = this.player.maxHealth > 0 ? this.player.health / this.player.maxHealth : 0;
    text(ctx, `HP ${this.player.health}/${this.player.maxHealth}`, right.x + 18, right.y + 25, 10.5, ART.white, 900, 'left', 'ltr');
    text(ctx, this.player.shield > 0 ? 'SHIELD ACTIVE' : `${this.stats.upgrades} UPGRADES`, right.x + right.w - 18, right.y + 25, 6.8, this.player.shield > 0 ? ART.cyan : ART.muted, 900, 'right', 'ltr');
    this.drawHudBar(right.x + 18, right.y + 37, right.w - 36, 6, hpRatio, hpRatio <= 0.34 ? ART.red : '#e77884');
    const dashMax = Math.max(0.36, 1.12 * Math.pow(0.86, this.stack('quick-dash')));
    this.drawHudBar(right.x + 18, right.y + 51, right.w - 36, 4, 1 - this.player.dashCooldown / dashMax, ART.cyan);

    if (!this.touchMode && this.arenaStage.id >= 4) this.drawMiniMap();
    if (this.state === 'playing' && this.wave === 1 && this.tutorialStep < 3) this.drawTutorial();
  }

  drawMiniMap() {
    const rect = { x: WIDTH - 184, y: 92, w: 166, h: 104 };
    this.panel(rect, { fill: 'rgba(3,15,27,0.82)', border: 'rgba(75,158,194,0.26)', cut: 9 });
    text(this.ctx, `SECTOR ${this.arenaStage.id + 1}`, rect.x + 12, rect.y + 17, 6.5, ART.cyanSoft, 900, 'left', 'ltr');
    text(this.ctx, 'TACTICAL MAP', rect.x + rect.w - 12, rect.y + 17, 5.8, ART.muted, 850, 'right', 'ltr');

    const bounds = this.arenaStage.bounds;
    const inner = { x: rect.x + 11, y: rect.y + 28, w: rect.w - 22, h: rect.h - 39 };
    const scale = Math.min(inner.w / bounds.w, inner.h / bounds.h);
    const mapW = bounds.w * scale;
    const mapH = bounds.h * scale;
    const mapX = inner.x + (inner.w - mapW) / 2;
    const mapY = inner.y + (inner.h - mapH) / 2;
    const project = (p) => ({ x: mapX + (p.x - bounds.x) * scale, y: mapY + (p.y - bounds.y) * scale });

    this.ctx.fillStyle = 'rgba(44,86,111,0.11)';
    this.ctx.fillRect(mapX, mapY, mapW, mapH);
    this.ctx.strokeStyle = 'rgba(98,213,243,0.28)';
    this.ctx.strokeRect(mapX, mapY, mapW, mapH);

    this.ctx.fillStyle = 'rgba(85,215,155,0.24)';
    for (const point of this.explorationTrail) {
      const p = project(point);
      this.ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
    }
    const view = this.viewportWorldBounds();
    const viewP = project(view);
    this.ctx.strokeStyle = 'rgba(232,188,69,0.6)';
    this.ctx.strokeRect(viewP.x, viewP.y, view.w * scale, view.h * scale);
    const player = project(this.player);
    this.ctx.fillStyle = ART.cyan;
    this.ctx.beginPath();
    this.ctx.arc(player.x, player.y, 2.8, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawArena() {
    super.drawArena();
    if (this.state === 'menu') return;
    const bounds = this.arenaStage.bounds;
    const palette = this.palette();
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = `${palette.primary}55`;
    ctx.lineWidth = 2;
    const inset = 22;
    const arm = 56;
    for (const [x, y, sx, sy] of [
      [bounds.x + inset, bounds.y + inset, 1, 1],
      [bounds.x + bounds.w - inset, bounds.y + inset, -1, 1],
      [bounds.x + inset, bounds.y + bounds.h - inset, 1, -1],
      [bounds.x + bounds.w - inset, bounds.y + bounds.h - inset, -1, -1],
    ]) {
      ctx.beginPath();
      ctx.moveTo(x, y + sy * arm);
      ctx.lineTo(x, y);
      ctx.lineTo(x + sx * arm, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = palette.primary;
    const spacing = Math.max(380, Math.min(620, bounds.w / 4));
    for (let x = bounds.x + spacing; x < bounds.x + bounds.w; x += spacing) ctx.fillRect(x, bounds.y + 12, 1, bounds.h - 24);
    ctx.restore();
  }

  drawCameraVignette() {
    const ctx = this.ctx;
    const v = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 260, WIDTH / 2, HEIGHT / 2, 750);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(0.76, 'rgba(0,0,0,0.035)');
    v.addColorStop(1, 'rgba(0,4,12,0.42)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  drawModalShell(rect, accent, kicker, title, subtitle) {
    this.panel(rect, {
      fill: 'rgba(4,16,29,0.975)',
      border: `${accent}80`,
      cut: 15,
      shadow: 9,
      shadowColor: `${accent}55`,
    });
    this.ctx.fillStyle = accent;
    this.ctx.fillRect(rect.x + 22, rect.y + 7, 90, 2);
    text(this.ctx, kicker, rect.x + rect.w / 2, rect.y + 37, 8, accent, 900, 'center', 'ltr');
    text(this.ctx, title, rect.x + rect.w / 2, rect.y + 76, 29, ART.white, 900);
    if (subtitle) text(this.ctx, subtitle, rect.x + rect.w / 2, rect.y + 101, 9.5, ART.soft, 650);
  }

  drawPause() {
    this.drawModalBackdrop(0.68);
    const panel = { x: WIDTH / 2 - 290, y: 137, w: 580, h: 438 };
    this.drawModalShell(panel, ART.cyan, 'TACTICAL PAUSE', 'متوقف مؤقتًا', 'الجولة محفوظة في الذاكرة حتى تستكملها');

    const y = panel.y + 120;
    this.drawMetricTile({ x: panel.x + 54, y, w: 144, h: 54 }, 'WAVE', String(this.wave).padStart(2, '0'), ART.gold);
    this.drawMetricTile({ x: panel.x + 218, y, w: 144, h: 54 }, 'SCORE', this.score.toLocaleString('en-US'), ART.cyan);
    this.drawMetricTile({ x: panel.x + 382, y, w: 144, h: 54 }, 'SECTOR', String((this.arenaStage?.id ?? 0) + 1), ART.green);

    this.drawProductionButton({ x: panel.x + 62, y: panel.y + 195, w: panel.w - 124, h: 60 }, 'pause-resume-prod', 'استكمال الجولة', () => this.resume(), { primary: true, icon: '▶', badge: `WAVE ${String(this.wave).padStart(2, '0')}` });
    this.drawProductionButton({ x: panel.x + 62, y: panel.y + 269, w: panel.w - 124, h: 45 }, 'pause-new-prod', 'بدء جولة جديدة', () => this.startRun(), { icon: '↻' });
    this.drawProductionButton({ x: panel.x + 62, y: panel.y + 326, w: panel.w - 124, h: 43 }, 'pause-menu-prod', 'العودة إلى القائمة الرئيسية', () => this.goToMenu());
    text(this.ctx, 'P / ESC  RESUME   •   F  FULLSCREEN', panel.x + panel.w / 2, panel.y + 410, 7.5, ART.muted, 850, 'center', 'ltr');
  }

  drawGameOver() {
    const checkpoint = this.hasContinueCheckpoint() ? this.savedCheckpoint : null;
    this.drawModalBackdrop(0.78);
    const panel = { x: WIDTH / 2 - 350, y: 74, w: 700, h: 566 };
    this.drawModalShell(panel, ART.red, 'RUN TERMINATED', 'انتهت الجولة', `وصلت إلى الموجة ${this.wave}`);

    const y = panel.y + 121;
    const metrics = [
      ['SCORE', this.score.toLocaleString('en-US'), ART.gold],
      ['KILLS', String(this.stats.kills), ART.cyan],
      ['TIME', `${Math.floor(this.runTime / 60)}:${String(Math.floor(this.runTime % 60)).padStart(2, '0')}`, ART.green],
      ['UPGRADES', String(this.stats.upgrades), ART.cyanSoft],
    ];
    metrics.forEach(([label, value, accent], i) => this.drawMetricTile({ x: panel.x + 44 + i * 153, y, w: 138, h: 54 }, label, value, accent));

    if (checkpoint) {
      text(this.ctx, `CHECKPOINT READY  •  WAVE ${checkpoint.wave}`, panel.x + panel.w / 2, panel.y + 207, 8.2, ART.green, 900, 'center', 'ltr');
      this.drawProductionButton({ x: panel.x + 84, y: panel.y + 230, w: panel.w - 168, h: 60 }, 'over-continue-prod', `متابعة من الموجة ${checkpoint.wave}`, () => this.continueFromCheckpoint(), { primary: true, icon: '▶', badge: `WAVE ${String(checkpoint.wave).padStart(2, '0')}` });
      this.drawProductionButton({ x: panel.x + 84, y: panel.y + 304, w: panel.w - 168, h: 45 }, 'over-new-prod', 'بدء جولة جديدة من البداية', () => this.startRun(), { icon: '↻' });
      this.drawProductionButton({ x: panel.x + 84, y: panel.y + 361, w: panel.w - 168, h: 43 }, 'over-menu-prod', 'العودة إلى القائمة الرئيسية', () => this.goToMenu());
    } else {
      this.drawProductionButton({ x: panel.x + 84, y: panel.y + 235, w: panel.w - 168, h: 60 }, 'over-retry-prod', 'ابدأ جولة جديدة', () => this.startRun(), { primary: true, icon: '↻', badge: 'WAVE 01' });
      this.drawProductionButton({ x: panel.x + 84, y: panel.y + 309, w: panel.w - 168, h: 45 }, 'over-menu-prod', 'العودة إلى القائمة الرئيسية', () => this.goToMenu());
    }
    text(this.ctx, 'ONE BULLET. ONE DECISION AT A TIME.', panel.x + panel.w / 2, panel.y + 522, 7.4, ART.muted, 850, 'center', 'ltr');
  }

  drawUpgradeSelection() {
    this.drawModalBackdrop(0.7);
    text(this.ctx, 'UPGRADE PROTOCOL', WIDTH / 2, 44, 8.5, ART.cyan, 900, 'center', 'ltr');
    text(this.ctx, 'اختر تطويرًا واحدًا', WIDTH / 2, 82, 29, ART.white, 900);
    text(this.ctx, `WAVE ${this.wave} CLEARED  •  BUILD ${this.stats.upgrades + 1}`, WIDTH / 2, 105, 7.8, ART.muted, 850, 'center', 'ltr');

    const cardW = 350;
    const cardH = 438;
    const gap = 24;
    const total = this.upgradeChoices.length * cardW + (this.upgradeChoices.length - 1) * gap;
    const startX = WIDTH / 2 - total / 2;
    const y = 132;

    this.upgradeChoices.forEach((upgrade, index) => {
      const rect = { x: startX + index * (cardW + gap), y, w: cardW, h: cardH };
      const hover = this.menuHover(rect);
      const accent = index === 1 ? ART.gold : ART.cyan;
      this.panel(rect, {
        fill: hover ? 'rgba(8,31,50,0.98)' : 'rgba(4,17,30,0.96)',
        border: hover ? `${accent}cc` : 'rgba(78,160,194,0.3)',
        cut: 14,
        shadow: hover ? 7 : 0,
        shadowColor: accent,
      });
      this.ctx.fillStyle = accent;
      this.ctx.fillRect(rect.x + 20, rect.y + 7, 70, 2);
      text(this.ctx, `0${index + 1}`, rect.x + 22, rect.y + 39, 9, accent, 900, 'left', 'ltr');
      text(this.ctx, upgrade.tag, rect.x + rect.w - 22, rect.y + 39, 9, accent, 900, 'right');
      wrapRtl(this.ctx, upgrade.name, rect.x + rect.w - 24, rect.y + 88, rect.w - 48, 30, 23, ART.white, 900, 2);
      wrapRtl(this.ctx, upgrade.description, rect.x + rect.w - 24, rect.y + 156, rect.w - 48, 24, 13.5, ART.soft, 600, 3);
      this.ctx.fillStyle = ART.line;
      this.ctx.fillRect(rect.x + 24, rect.y + 248, rect.w - 48, 1);
      text(this.ctx, 'التأثير التالي', rect.x + rect.w - 24, rect.y + 276, 8.5, ART.cyanSoft, 850, 'right');
      wrapRtl(this.ctx, upgradeEffectText(upgrade, this.stack(upgrade.id)), rect.x + rect.w - 24, rect.y + 304, rect.w - 48, 20, 11.5, ART.soft, 700, 3);
      text(this.ctx, `LEVEL ${this.stack(upgrade.id)} / ${upgrade.maxStacks}`, rect.x + 22, rect.y + rect.h - 25, 7.5, ART.muted, 900, 'left', 'ltr');
      text(this.ctx, hover ? 'SELECT' : 'READY', rect.x + rect.w - 22, rect.y + rect.h - 25, 7.5, hover ? accent : ART.muted, 900, 'right', 'ltr');
      this.addUiRegion(rect.x, rect.y, rect.w, rect.h, () => this.chooseUpgrade(index));
    });
    text(this.ctx, 'CLICK A CARD  •  1 / 2 / 3', WIDTH / 2, 608, 7.5, ART.muted, 850, 'center', 'ltr');
  }

  getSnapshot() {
    return {
      ...super.getSnapshot(),
      productionArtRuntimeVersion: PRODUCTION_ART_RUNTIME_VERSION,
      productionArtRevision: PRODUCTION_ART_REVISION,
      productionArtActive: true,
      productionDashboard: true,
      productionCombatHud: true,
      productionArenaPass: true,
      productionOverlaySuite: true,
    };
  }
}
