import { clamp, pointInsideRect } from '../arena.js';
import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from '../game-data.js';
import { RELEASE_VERSION } from '../release.js';
import { UI_COLORS, label, roundedRect } from '../ui-renderer.js';
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
      continue;
    }
    lines.push(line);
    line = word;
    if (lines.length >= maxLines - 1) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  lines.slice(0, maxLines).forEach((value, index) => ctx.fillText(value, rightX, topY + index * lineHeight));
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

    ctx.save();
    const wash = ctx.createRadialGradient(WIDTH / 2, 270, 80, WIDTH / 2, 300, 620);
    wash.addColorStop(0, 'rgba(8, 28, 58, 0.22)');
    wash.addColorStop(0.58, 'rgba(3, 12, 29, 0.14)');
    wash.addColorStop(1, 'rgba(0, 2, 8, 0.62)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.restore();

    this.drawMenuOrbit();
    label(ctx, 'ONE BULLET ARENA', WIDTH / 2, 66, 12, UI_COLORS.player, 900);
    label(ctx, 'حلبة الطلقة', WIDTH / 2, 125, 48, UI_COLORS.text, 900);
    label(ctx, 'الواحدة', WIDTH / 2, 177, 48, UI_COLORS.bullet, 900);

    if (checkpoint) this.drawCheckpointCommandCenter(checkpoint, palette);
    else this.drawFreshRunCommandCenter(palette);

    label(ctx, `v${RELEASE_VERSION}`, WIDTH - 20, HEIGHT - 16, 9, '#6f82a7', 800, 'right');
  }

  drawCheckpointCommandCenter(checkpoint, palette) {
    const ctx = this.ctx;
    label(ctx, 'CHECKPOINT PROGRESSION ONLINE', WIDTH / 2, 214, 10, UI_COLORS.success, 900);
    label(
      ctx,
      `WAVE ${String(checkpoint.wave).padStart(2, '0')}  ·  ${checkpoint.stats.upgrades} UPGRADES  ·  ${checkpoint.score.toLocaleString('en-US')} SCORE  ·  آخر نقطة حفظ`,
      WIDTH / 2,
      239,
      11,
      UI_COLORS.text,
      800,
    );

    this.drawCommandButton(
      { x: 654, y: 258, w: 302, h: 54 },
      `متابعة من WAVE ${String(checkpoint.wave).padStart(2, '0')}`,
      UI_COLORS.bullet,
      () => this.continueFromCheckpoint(),
      true,
    );
    this.drawCommandButton(
      { x: 324, y: 258, w: 302, h: 54 },
      'جولة جديدة من البداية',
      '#6f86b8',
      () => this.startRun(),
    );

    const cards = [
      { x: 142, number: '01', title: 'احفظ', text: 'تُحفظ أعلى موجة تلقائيًا عند بدايتها.', accent: UI_COLORS.success, glyph: '▣' },
      { x: 490, number: '02', title: 'استكمل', text: 'ارجع بنفس التطويرات والتقدم المحفوظ.', accent: '#5f9dff', glyph: '⇧' },
      { x: 838, number: '03', title: 'اختر', text: 'ابدأ من الصفر أو استخدم نقطة الحفظ.', accent: palette.primary, glyph: '⚑' },
    ];
    cards.forEach((card) => this.drawCommandCard(card.x, 338, 300, 142, card));

    this.drawStatCell(270, 510, 230, 'CHECKPOINT', `WAVE ${checkpoint.wave}`, UI_COLORS.success);
    this.drawStatCell(525, 510, 230, 'BEST WAVE', this.highWave, '#5f9dff');
    this.drawStatCell(780, 510, 230, 'HIGH SCORE', this.highScore.toLocaleString('en-US'), palette.primary);

    this.drawCommandButton({ x: 515, y: 592, w: 250, h: 42 }, 'حذف نقطة الحفظ', UI_COLORS.danger, () => this.clearCheckpoint());
    const controls = this.touchMode
      ? 'TAP A BUTTON TO CHOOSE  ·  PROGRESS IS SAVED LOCALLY'
      : 'C CONTINUE  ·  N NEW RUN  ·  PROGRESS IS SAVED LOCALLY';
    label(ctx, controls, WIDTH / 2, 680, 9, UI_COLORS.muted, 800);
  }

  drawFreshRunCommandCenter(palette) {
    const ctx = this.ctx;
    label(ctx, 'ONE SHOT  ·  ONE RECALL  ·  KEEP MOVING', WIDTH / 2, 219, 10, UI_COLORS.muted, 900);
    label(ctx, 'استخدم الارتداد، استعد الطلقة، واصمد أمام الموجات المتصاعدة.', WIDTH / 2, 246, 13, UI_COLORS.text, 700);
    this.drawCommandButton({ x: 460, y: 270, w: 360, h: 58 }, 'ابدأ الجولة', UI_COLORS.bullet, () => this.startRun(), true);

    const cards = [
      { x: 142, number: '01', title: 'أطلق', text: 'طلقة واحدة، كل زاوية وارتداد لهما قيمة.', accent: UI_COLORS.bullet, glyph: '◆' },
      { x: 490, number: '02', title: 'استعد', text: 'استدعِ الطلقة وتحرك لالتقاطها من جديد.', accent: '#5f9dff', glyph: '↺' },
      { x: 838, number: '03', title: 'تطوّر', text: 'اختر تطويرًا واحدًا بعد كل موجة.', accent: palette.primary, glyph: '⇧' },
    ];
    cards.forEach((card) => this.drawCommandCard(card.x, 360, 300, 142, card));
    this.drawStatCell(390, 535, 240, 'BEST WAVE', this.highWave, '#5f9dff');
    this.drawStatCell(650, 535, 240, 'HIGH SCORE', this.highScore.toLocaleString('en-US'), palette.primary);
    const controls = this.touchMode
      ? 'LEFT STICK MOVE  ·  TAP FIRE  ·  RECALL / DASH'
      : 'WASD MOVE  ·  MOUSE FIRE  ·  Q RECALL  ·  SPACE DASH  ·  P PAUSE';
    label(ctx, controls, WIDTH / 2, 680, 9, UI_COLORS.muted, 800);
  }

  drawCommandCard(x, y, w, h, card) {
    const ctx = this.ctx;
    drawPanel(ctx, { x, y, w, h }, card.accent, 'rgba(4, 12, 29, 0.88)');
    label(ctx, card.number, x + 20, y + 26, 9, card.accent, 900, 'left');

    ctx.save();
    ctx.globalAlpha = 0.78;
    ctx.strokeStyle = card.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x + 55, y + 76, 29, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.arc(x + 55, y + 76, 40, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    label(ctx, card.glyph, x + 55, y + 84, 22, card.accent, 900);
    label(ctx, card.title, x + w - 24, y + 52, 22, UI_COLORS.text, 900, 'right');
    drawRtlBlock(ctx, card.text, x + w - 24, y + 88, w - 118, 21, 12, UI_COLORS.muted, 650, 2);
  }

  drawStatCell(x, y, w, title, value, accent) {
    const ctx = this.ctx;
    drawPanel(ctx, { x, y, w, h: 56 }, 'rgba(106, 139, 193, 0.62)', 'rgba(4, 10, 24, 0.82)');
    label(ctx, title, x + 16, y + 21, 8, UI_COLORS.muted, 900, 'left');
    label(ctx, value, x + w - 16, y + 39, 18, UI_COLORS.text, 900, 'right');
    ctx.save();
    ctx.fillStyle = accent;
    ctx.fillRect(x + 2, y + 10, 3, 36);
    ctx.restore();
  }

  drawCommandButton(rect, text, accent, action, primary = false) {
    const hovered = pointInsideRect(this.pointer, rect);
    const fill = primary
      ? hovered ? 'rgba(70, 57, 15, 0.98)' : 'rgba(48, 39, 13, 0.96)'
      : hovered ? 'rgba(15, 29, 56, 0.97)' : 'rgba(5, 11, 26, 0.94)';
    drawPanel(this.ctx, rect, accent, fill, hovered || primary ? 12 : 0);
    label(this.ctx, text, rect.x + rect.w / 2, rect.y + rect.h / 2 + 6, 15, primary ? UI_COLORS.bullet : UI_COLORS.text, 900);
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
    label(ctx, `${current}  →  ${next}`, x + width - 34, cardY + 299, 18, UI_COLORS.text, 900, 'right');
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
      menuArtDirectionRevision: 'checkpoint-command-center-v3',
      upgradeArtDirectionRevision: 'category-upgrade-cards-v3',
      gameplayGeometryChanged: false,
      collisionGeometryChanged: false,
    };
  }
}
