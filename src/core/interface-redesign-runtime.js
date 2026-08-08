import { pointInsideRect } from '../arena.js';
import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from '../game-data.js';
import { RELEASE_VERSION } from '../release.js';
import { UI_COLORS, label } from '../ui-renderer.js';
import { OneBulletArtDirectionRuntime } from './art-direction-runtime.js';

export const INTERFACE_REDESIGN_RUNTIME_VERSION = '3.5.0-interface-redesign';

const UPGRADE_SPECS = Object.freeze({
  vitality: Object.freeze({ category: 'VITALITY', glyph: '♥', accent: '#ff627e', fill: 'rgba(45, 8, 22, 0.92)' }),
  defense: Object.freeze({ category: 'DEFENSE', glyph: '◇', accent: '#5f9dff', fill: 'rgba(7, 20, 47, 0.94)' }),
  motion: Object.freeze({ category: 'MOTION', glyph: '≫', accent: '#55f4ff', fill: 'rgba(4, 31, 43, 0.94)' }),
  recall: Object.freeze({ category: 'RECALL', glyph: '↺', accent: '#a27cff', fill: 'rgba(24, 12, 48, 0.94)' }),
  ricochet: Object.freeze({ category: 'RICOCHET', glyph: '⌁', accent: '#ffd86b', fill: 'rgba(43, 31, 7, 0.94)' }),
  impact: Object.freeze({ category: 'IMPACT', glyph: 'ϟ', accent: '#ff8a5c', fill: 'rgba(45, 18, 8, 0.94)' }),
  ballistics: Object.freeze({ category: 'BALLISTICS', glyph: '◆', accent: '#ffd86b', fill: 'rgba(40, 28, 7, 0.94)' }),
});

function chamferPath(ctx, x, y, w, h, cut = 12) {
  const c = Math.max(0, Math.min(cut, Math.min(w, h) / 3));
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

function upgradeSpec(upgrade) {
  const id = String(upgrade?.id || '');
  const tag = String(upgrade?.tag || '');
  if (id === 'vitality' || tag.includes('صحة')) return UPGRADE_SPECS.vitality;
  if (id === 'wave-shield' || id === 'second-chance' || tag.includes('دفاع') || tag.includes('نجاة')) return UPGRADE_SPECS.defense;
  if (id === 'quick-dash' || id === 'swift-steps' || tag.includes('حركة')) return UPGRADE_SPECS.motion;
  if (id.includes('recall') || tag.includes('استعادة')) return UPGRADE_SPECS.recall;
  if (id.includes('ricochet') || tag.includes('ارتداد')) return UPGRADE_SPECS.ricochet;
  if (id === 'shock-impact' || tag.includes('منطقة')) return UPGRADE_SPECS.impact;
  return UPGRADE_SPECS.ballistics;
}

function drawRtlBlock(ctx, text, rightX, topY, maxWidth, lineHeight, fontSize, color, weight = 700, maxLines = 2) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return;
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${weight} ${fontSize}px "Segoe UI", Tahoma, Arial, sans-serif`;
  ctx.fillStyle = color;

  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);

  const visible = lines.slice(0, maxLines);
  if (lines.length > maxLines && visible.length) {
    let last = visible[visible.length - 1];
    while (last && ctx.measureText(`${last}…`).width > maxWidth) {
      const pieces = last.split(' ');
      pieces.pop();
      last = pieces.join(' ');
    }
    visible[visible.length - 1] = `${last || ''}…`;
  }

  visible.forEach((value, index) => ctx.fillText(value, rightX, topY + index * lineHeight));
  ctx.restore();
}

function drawPanel(ctx, rect, accent, fill = 'rgba(3, 8, 21, 0.94)', glow = 0) {
  ctx.save();
  if (glow > 0) {
    ctx.shadowColor = accent;
    ctx.shadowBlur = glow;
  }
  chamferPath(ctx, rect.x, rect.y, rect.w, rect.h, 14);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.globalAlpha = 0.65;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(rect.x + 18, rect.y + 3);
  ctx.lineTo(rect.x + Math.min(126, rect.w * 0.42), rect.y + 3);
  ctx.moveTo(rect.x + rect.w - 18, rect.y + rect.h - 3);
  ctx.lineTo(rect.x + rect.w - Math.min(126, rect.w * 0.42), rect.y + rect.h - 3);
  ctx.stroke();
  ctx.restore();
}

export class OneBulletInterfaceRedesignRuntime extends OneBulletArtDirectionRuntime {
  constructor(canvas, liveRegion = null) {
    super(canvas, liveRegion);
    this.interfaceRedesignRuntimeVersion = INTERFACE_REDESIGN_RUNTIME_VERSION;
  }

  drawMenu() {
    const ctx = this.ctx;
    const checkpoint = this.hasContinueCheckpoint() ? this.savedCheckpoint : null;
    const palette = this.palette();

    this.drawMenuBackdrop(palette);
    label(ctx, 'ONE BULLET ARENA', WIDTH / 2, 46, 10, UI_COLORS.player, 900);
    label(ctx, 'حلبة الطلقة الواحدة', WIDTH / 2, 96, 40, UI_COLORS.text, 900);
    label(
      ctx,
      checkpoint ? 'نقطة الحفظ جاهزة — اختر كيف تريد مواصلة الجولة' : 'طلقة واحدة. استعدها. طوّر أسلوبك. واصل الصمود.',
      WIDTH / 2,
      126,
      11,
      UI_COLORS.muted,
      700,
    );

    if (checkpoint) this.drawCheckpointCommandCenter(checkpoint, palette);
    else this.drawFreshRunCommandCenter(palette);

    const footer = this.touchMode
      ? 'PROGRESS SAVED LOCALLY  ·  TAP TO SELECT'
      : 'C CONTINUE  ·  N NEW RUN  ·  PROGRESS SAVED LOCALLY';
    label(ctx, footer, 120, HEIGHT - 18, 8, '#7183a4', 800, 'left');
    label(ctx, `v${RELEASE_VERSION}`, WIDTH - 20, HEIGHT - 18, 8, '#7183a4', 800, 'right');
  }

  drawMenuBackdrop(palette) {
    const ctx = this.ctx;
    ctx.save();
    const wash = ctx.createRadialGradient(WIDTH * 0.48, 300, 90, WIDTH * 0.48, 330, 650);
    wash.addColorStop(0, 'rgba(8, 27, 54, 0.28)');
    wash.addColorStop(0.58, 'rgba(2, 10, 25, 0.22)');
    wash.addColorStop(1, 'rgba(0, 2, 8, 0.72)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = palette.primary;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(120, 145);
    ctx.lineTo(WIDTH - 120, 145);
    ctx.moveTo(120, 604);
    ctx.lineTo(WIDTH - 120, 604);
    ctx.stroke();

    ctx.globalAlpha = 0.2;
    ctx.fillStyle = palette.warm;
    ctx.fillRect(WIDTH / 2 - 28, 143, 56, 2);
    ctx.restore();
  }

  drawCheckpointCommandCenter(checkpoint, palette) {
    const hero = { x: 120, y: 166, w: 704, h: 404 };
    const rail = { x: 846, y: 166, w: 314, h: 404 };
    const wave = String(checkpoint.wave).padStart(2, '0');
    const upgrades = checkpoint.stats?.upgrades ?? 0;
    const score = Number(checkpoint.score || 0).toLocaleString('en-US');

    drawPanel(this.ctx, hero, 'rgba(91, 136, 196, 0.58)', 'rgba(3, 9, 23, 0.93)');
    drawPanel(this.ctx, rail, 'rgba(91, 136, 196, 0.42)', 'rgba(3, 8, 20, 0.9)');

    label(this.ctx, 'CHECKPOINT // ONLINE', hero.x + 30, hero.y + 34, 9, UI_COLORS.success, 900, 'left');
    label(this.ctx, 'واصل من آخر نقطة حفظ', hero.x + hero.w - 30, hero.y + 70, 24, UI_COLORS.text, 900, 'right');
    drawRtlBlock(
      this.ctx,
      'كل التطويرات والتقدم المحفوظ سيعودان كما هما. المتابعة هي الإجراء الرئيسي، ويمكنك بدء جولة جديدة من اللوحة الجانبية.',
      hero.x + hero.w - 30,
      hero.y + 98,
      465,
      20,
      11,
      UI_COLORS.muted,
      650,
      2,
    );

    this.drawWaveIdentity(hero.x + 30, hero.y + 132, wave, palette.warm);
    this.drawCheckpointMetric(hero.x + 250, hero.y + 147, 196, 'UPGRADES', upgrades, '#6ba5ff');
    this.drawCheckpointMetric(hero.x + 466, hero.y + 147, 208, 'RUN SCORE', score, palette.primary);

    this.drawMenuAction(
      { x: hero.x + 28, y: hero.y + 278, w: hero.w - 56, h: 78 },
      'متابعة الجولة',
      `WAVE ${wave}  //  RESTORE CHECKPOINT`,
      UI_COLORS.bullet,
      () => this.continueFromCheckpoint(),
      true,
      this.touchMode ? null : 'C',
    );
    label(this.ctx, 'يتم الحفظ محليًا عند بداية أعلى موجة وصلت إليها.', hero.x + 30, hero.y + 384, 9, UI_COLORS.muted, 700, 'left');

    this.drawRecordRail(rail, checkpoint, palette);
  }

  drawFreshRunCommandCenter(palette) {
    const hero = { x: 120, y: 166, w: 704, h: 404 };
    const rail = { x: 846, y: 166, w: 314, h: 404 };

    drawPanel(this.ctx, hero, 'rgba(91, 136, 196, 0.58)', 'rgba(3, 9, 23, 0.93)');
    drawPanel(this.ctx, rail, 'rgba(91, 136, 196, 0.42)', 'rgba(3, 8, 20, 0.9)');

    label(this.ctx, 'NEW RUN // READY', hero.x + 30, hero.y + 34, 9, UI_COLORS.player, 900, 'left');
    label(this.ctx, 'ابدأ جولة جديدة', hero.x + hero.w - 30, hero.y + 76, 28, UI_COLORS.text, 900, 'right');
    drawRtlBlock(
      this.ctx,
      'قاعدة واحدة فقط: أطلق الطلقة، استخدم الارتدادات بذكاء، ثم استدعها إليك قبل أن تحاصرك الموجة.',
      hero.x + hero.w - 30,
      hero.y + 110,
      540,
      22,
      12,
      UI_COLORS.muted,
      650,
      2,
    );

    this.drawRunFlow(hero.x + 30, hero.y + 174, hero.w - 60, palette);
    this.drawMenuAction(
      { x: hero.x + 28, y: hero.y + 278, w: hero.w - 56, h: 78 },
      'ابدأ الجولة',
      'NEW RUN  //  WAVE 01',
      UI_COLORS.bullet,
      () => this.startRun(),
      true,
      this.touchMode ? null : 'ENTER',
    );
    label(this.ctx, 'لا توجد عملات أو متجر أو تقدم دائم — كل جولة تعتمد على اختياراتك.', hero.x + 30, hero.y + 384, 9, UI_COLORS.muted, 700, 'left');

    this.drawFreshRunRail(rail, palette);
  }

  drawWaveIdentity(x, y, wave, accent) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    ctx.strokeStyle = 'rgba(126, 157, 205, 0.24)';
    ctx.lineWidth = 1;
    chamferPath(ctx, x, y, 192, 116, 12);
    ctx.fill();
    ctx.stroke();
    label(ctx, 'WAVE', x + 20, y + 27, 9, UI_COLORS.muted, 900, 'left');
    label(ctx, wave, x + 20, y + 92, 58, accent, 900, 'left');
    ctx.restore();
  }

  drawCheckpointMetric(x, y, w, title, value, accent) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    ctx.strokeStyle = 'rgba(126, 157, 205, 0.2)';
    ctx.lineWidth = 1;
    chamferPath(ctx, x, y, w, 86, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.fillRect(x + 14, y + 14, 3, 58);
    label(ctx, title, x + 30, y + 30, 8, UI_COLORS.muted, 900, 'left');
    label(ctx, value, x + 30, y + 65, 20, UI_COLORS.text, 900, 'left');
    ctx.restore();
  }

  drawRecordRail(rect, checkpoint, palette) {
    const ctx = this.ctx;
    label(ctx, 'RUN RECORD', rect.x + 24, rect.y + 34, 9, UI_COLORS.player, 900, 'left');
    label(ctx, 'سجل الجولة', rect.x + rect.w - 24, rect.y + 62, 17, UI_COLORS.text, 900, 'right');

    this.drawRecordRow(rect.x + 20, rect.y + 84, rect.w - 40, 'HIGH SCORE', this.highScore.toLocaleString('en-US'), palette.primary);
    this.drawRecordRow(rect.x + 20, rect.y + 148, rect.w - 40, 'BEST WAVE', this.highWave, '#6ba5ff');
    this.drawRecordRow(rect.x + 20, rect.y + 212, rect.w - 40, 'CHECKPOINT', `WAVE ${checkpoint.wave}`, UI_COLORS.success);

    this.drawMenuAction(
      { x: rect.x + 20, y: rect.y + 290, w: rect.w - 40, h: 52 },
      'جولة جديدة',
      'RESET CURRENT RUN',
      '#7188b8',
      () => this.startRun(),
      false,
      this.touchMode ? null : 'N',
    );
    this.drawMenuAction(
      { x: rect.x + 20, y: rect.y + 350, w: rect.w - 40, h: 34 },
      'حذف نقطة الحفظ',
      null,
      UI_COLORS.danger,
      () => this.clearCheckpoint(),
      false,
      null,
      true,
    );
  }

  drawFreshRunRail(rect, palette) {
    const ctx = this.ctx;
    label(ctx, 'PILOT RECORD', rect.x + 24, rect.y + 34, 9, UI_COLORS.player, 900, 'left');
    label(ctx, 'أفضل نتائجك', rect.x + rect.w - 24, rect.y + 62, 17, UI_COLORS.text, 900, 'right');

    this.drawRecordRow(rect.x + 20, rect.y + 84, rect.w - 40, 'HIGH SCORE', this.highScore.toLocaleString('en-US'), palette.primary);
    this.drawRecordRow(rect.x + 20, rect.y + 148, rect.w - 40, 'BEST WAVE', this.highWave, '#6ba5ff');
    this.drawRecordRow(rect.x + 20, rect.y + 212, rect.w - 40, 'SAVE', 'LOCAL', UI_COLORS.success);

    label(ctx, 'QUICK CONTROLS', rect.x + 24, rect.y + 306, 8, UI_COLORS.muted, 900, 'left');
    const controls = this.touchMode
      ? ['LEFT // MOVE', 'RIGHT // FIRE', 'RECALL + DASH']
      : ['WASD // MOVE', 'MOUSE // FIRE', 'Q // RECALL   SPACE // DASH'];
    controls.forEach((text, index) => label(ctx, text, rect.x + 24, rect.y + 330 + index * 20, 8, index === 2 ? palette.warm : '#9eacc6', 800, 'left'));
  }

  drawRunFlow(x, y, w, palette) {
    const ctx = this.ctx;
    const gap = 12;
    const cellW = (w - gap * 2) / 3;
    const steps = [
      ['01', 'FIRE', 'أطلق'],
      ['02', 'RICOCHET', 'ارتد'],
      ['03', 'RECALL', 'استعد'],
    ];

    steps.forEach(([number, code, arabic], index) => {
      const cellX = x + index * (cellW + gap);
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.025)';
      ctx.strokeStyle = 'rgba(112, 148, 199, 0.24)';
      ctx.lineWidth = 1;
      chamferPath(ctx, cellX, y, cellW, 76, 9);
      ctx.fill();
      ctx.stroke();
      label(ctx, number, cellX + 14, y + 22, 8, index === 2 ? palette.primary : UI_COLORS.muted, 900, 'left');
      label(ctx, code, cellX + 14, y + 44, 10, index === 0 ? palette.warm : index === 2 ? palette.primary : '#88a4cf', 900, 'left');
      label(ctx, arabic, cellX + cellW - 14, y + 60, 11, UI_COLORS.text, 800, 'right');
      ctx.restore();
    });
  }

  drawRecordRow(x, y, w, title, value, accent) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    ctx.strokeStyle = 'rgba(112, 148, 199, 0.18)';
    ctx.lineWidth = 1;
    chamferPath(ctx, x, y, w, 54, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.fillRect(x + 10, y + 10, 2, 34);
    label(ctx, title, x + 22, y + 22, 7, UI_COLORS.muted, 900, 'left');
    label(ctx, value, x + w - 18, y + 36, 16, UI_COLORS.text, 900, 'right');
    ctx.restore();
  }

  drawMenuAction(rect, title, meta, accent, action, primary = false, keyHint = null, danger = false) {
    const ctx = this.ctx;
    const hovered = pointInsideRect(this.pointer, rect);
    let fill = hovered ? 'rgba(14, 27, 51, 0.98)' : 'rgba(5, 11, 25, 0.96)';
    if (primary) fill = hovered ? 'rgba(72, 57, 14, 0.99)' : 'rgba(48, 39, 12, 0.98)';
    if (danger) fill = hovered ? 'rgba(46, 12, 22, 0.92)' : 'rgba(18, 8, 16, 0.86)';

    drawPanel(ctx, rect, accent, fill, hovered || primary ? 10 : 0);
    if (primary) {
      const gradient = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y);
      gradient.addColorStop(0, 'rgba(255,230,109,0.04)');
      gradient.addColorStop(1, 'rgba(255,230,109,0.15)');
      ctx.save();
      chamferPath(ctx, rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4, 12);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.restore();
    }

    if (keyHint) {
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.045)';
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      chamferPath(ctx, rect.x + 16, rect.y + Math.max(8, (rect.h - 28) / 2), Math.max(34, keyHint.length * 9 + 18), 28, 6);
      ctx.fill();
      ctx.stroke();
      label(ctx, keyHint, rect.x + 33, rect.y + rect.h / 2 + 4, 8, accent, 900, 'left');
      ctx.restore();
    }

    const titleColor = danger ? '#ff8499' : primary ? UI_COLORS.bullet : UI_COLORS.text;
    label(ctx, title, rect.x + rect.w - 18, rect.y + (meta ? 25 : rect.h / 2 + 5), meta ? 16 : 12, titleColor, 900, 'right');
    if (meta) label(ctx, meta, rect.x + rect.w - 18, rect.y + rect.h - 14, 7, primary ? '#d9c77b' : UI_COLORS.muted, 800, 'right');
    this.addUiRegion(rect.x, rect.y, rect.w, rect.h, action);
  }

  drawUpgradeSelection() {
    const ctx = this.ctx;
    ctx.save();
    const veil = ctx.createLinearGradient(0, 98, 0, HEIGHT);
    veil.addColorStop(0, 'rgba(0, 3, 12, 0.42)');
    veil.addColorStop(0.22, 'rgba(0, 4, 14, 0.86)');
    veil.addColorStop(1, 'rgba(0, 2, 8, 0.96)');
    ctx.fillStyle = veil;
    ctx.fillRect(0, 96, WIDTH, HEIGHT - 96);
    ctx.restore();

    label(ctx, `WAVE ${String(this.wave).padStart(2, '0')} CLEARED`, WIDTH / 2, 128, 12, UI_COLORS.success, 900);
    label(ctx, 'اختر تطويرًا واحدًا', WIDTH / 2, 173, 36, UI_COLORS.text, 900);
    label(ctx, 'سيتم تطبيق الاختيار فورًا على الجولة الحالية', WIDTH / 2, 202, 11, UI_COLORS.muted, 700);

    const cardWidth = 320;
    const gap = 24;
    const cardHeight = 384;
    const total = this.upgradeChoices.length * cardWidth + Math.max(0, this.upgradeChoices.length - 1) * gap;
    const startX = WIDTH / 2 - total / 2;
    this.upgradeChoices.forEach((upgrade, index) => {
      this.drawCategoryUpgradeCard(upgrade, index, startX + index * (cardWidth + gap), 224, cardWidth, cardHeight);
    });

    label(ctx, 'CLICK A CARD  ·  OR PRESS 1 / 2 / 3', WIDTH / 2, 674, 9, UI_COLORS.muted, 900);
  }

  drawCategoryUpgradeCard(upgrade, index, x, y, width, height) {
    const ctx = this.ctx;
    const spec = upgradeSpec(upgrade);
    const current = this.stack(upgrade.id);
    const next = Math.min(upgrade.maxStacks, current + 1);
    const hovered = pointInsideRect(this.pointer, { x, y, w: width, h: height });
    const lift = hovered ? -5 : 0;
    const cardY = y + lift;

    ctx.save();
    if (hovered) {
      ctx.shadowColor = spec.accent;
      ctx.shadowBlur = 22;
    }
    chamferPath(ctx, x, cardY, width, height, 16);
    ctx.fillStyle = spec.fill;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = spec.accent;
    ctx.lineWidth = hovered ? 2.6 : 1.6;
    ctx.stroke();

    const header = ctx.createLinearGradient(x, cardY, x + width, cardY);
    header.addColorStop(0, 'rgba(255,255,255,0)');
    header.addColorStop(1, `${spec.accent}2e`);
    ctx.fillStyle = header;
    chamferPath(ctx, x + 2, cardY + 2, width - 4, 92, 14);
    ctx.fill();

    ctx.globalAlpha = 0.78;
    ctx.strokeStyle = spec.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + 58, cardY + 61, 31, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.arc(x + 58, cardY + 61, 42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    label(ctx, spec.glyph, x + 58, cardY + 70, 25, spec.accent, 900);

    label(ctx, String(index + 1), x + width - 22, cardY + 31, 13, spec.accent, 900, 'right');
    label(ctx, spec.category, x + width - 22, cardY + 55, 9, spec.accent, 900, 'right');

    drawRtlBlock(ctx, upgrade.name, x + width - 24, cardY + 137, width - 48, 31, 25, UI_COLORS.text, 900, 2);
    drawRtlBlock(ctx, upgrade.description, x + width - 24, cardY + 194, width - 48, 22, 13, UI_COLORS.muted, 650, 3);

    drawPanel(ctx, { x: x + 18, y: cardY + 258, w: width - 36, h: 68 }, spec.accent, 'rgba(2, 7, 18, 0.72)');
    label(ctx, 'LEVEL CHANGE', x + 34, cardY + 279, 8, spec.accent, 900, 'left');
    label(ctx, `CURRENT ${current}`, x + width - 34, cardY + 286, 9, UI_COLORS.muted, 900, 'right');
    label(ctx, `NEXT ${next}`, x + width - 34, cardY + 307, 15, UI_COLORS.text, 900, 'right');
    label(ctx, `MAX ${upgrade.maxStacks}`, x + 34, cardY + 310, 8, UI_COLORS.muted, 800, 'left');

    label(ctx, `LEVEL ${current}/${upgrade.maxStacks}`, x + 20, cardY + height - 22, 9, current > 0 ? spec.accent : UI_COLORS.muted, 900, 'left');
    this.drawUpgradeLevelDots(x + width - 22, cardY + height - 25, current, upgrade.maxStacks, spec.accent);
    ctx.restore();

    this.addUiRegion(x, y, width, height, () => this.chooseUpgrade(index));
  }

  drawUpgradeLevelDots(rightX, y, current, maxStacks, accent) {
    const ctx = this.ctx;
    const count = Math.max(1, Math.min(8, maxStacks));
    ctx.save();
    for (let index = 0; index < count; index += 1) {
      ctx.fillStyle = index < current ? accent : 'rgba(140, 165, 205, 0.24)';
      ctx.beginPath();
      ctx.arc(rightX - index * 14, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  getSnapshot() {
    return {
      ...super.getSnapshot(),
      releaseVersion: RELEASE_VERSION,
      interfaceRedesignRuntimeVersion: INTERFACE_REDESIGN_RUNTIME_VERSION,
      interfaceRedesignActive: true,
      menuArtDirectionRevision: 'checkpoint-command-center-v4',
      upgradeArtDirectionRevision: 'category-upgrade-cards-v3',
      gameplayGeometryChanged: false,
      collisionGeometryChanged: false,
    };
  }
}
