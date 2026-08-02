import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from './content.js';
import { formatUiNumber } from './ui-polish.js';

const FONT = 'Changa, "Segoe UI", Tahoma, sans-serif';
const NUMERIC_FONT = 'Inter, "Segoe UI", Arial, sans-serif';
const COLORS = {
  panel: 'rgba(10, 14, 29, 0.95)',
  panelSoft: 'rgba(18, 24, 48, 0.86)',
  border: '#33406f',
  cyan: '#62f3ff',
  yellow: '#ffe66d',
  red: '#ff526a',
  text: '#f8f9ff',
  muted: '#aeb7da',
};

function nowMs() {
  return globalThis.performance?.now?.() ?? Date.now();
}

export function settleTerminalEffects() {
  return {
    shake: 0,
    flash: 0,
    hitStop: 0,
    slowMotion: 0,
  };
}

export function defeatPulseStrength(startedAt, currentTime, duration = 620) {
  const elapsed = Math.max(0, Number(currentTime) - Number(startedAt));
  return Math.max(0, Math.min(1, 1 - elapsed / Math.max(1, Number(duration))));
}

function roundedRect(ctx, x, y, width, height, radius = 18) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawPanel(ctx, x, y, width, height, accent = COLORS.border) {
  ctx.save();
  ctx.fillStyle = COLORS.panel;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 18;
  roundedRect(ctx, x, y, width, height, 20);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();
  ctx.restore();
}

function drawLabel(ctx, text, x, y, size, color = COLORS.text, weight = 700, align = 'center') {
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawNumber(ctx, value, x, y, size, color = COLORS.text, align = 'center') {
  ctx.save();
  ctx.direction = 'ltr';
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.font = `800 ${size}px ${NUMERIC_FONT}`;
  ctx.fillText(String(value), x, y);
  ctx.restore();
}

function drawStatTile(ctx, label, value, x, y, accent) {
  ctx.save();
  ctx.fillStyle = COLORS.panelSoft;
  ctx.strokeStyle = 'rgba(80, 99, 164, 0.62)';
  ctx.lineWidth = 1.5;
  roundedRect(ctx, x, y, 250, 61, 14);
  ctx.fill();
  ctx.stroke();
  drawLabel(ctx, label, x + 226, y + 24, 13, COLORS.muted, 600, 'right');
  drawNumber(ctx, value, x + 226, y + 49, 20, accent, 'right');
  ctx.restore();
}

function drawCornerAccents(ctx) {
  ctx.save();
  ctx.strokeStyle = 'rgba(98, 243, 255, 0.28)';
  ctx.lineWidth = 2;
  const inset = 74;
  const length = 74;
  for (const [x, y, sx, sy] of [
    [inset, inset, 1, 1],
    [WIDTH - inset, inset, -1, 1],
    [inset, HEIGHT - inset, 1, -1],
    [WIDTH - inset, HEIGHT - inset, -1, -1],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x + sx * length, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + sy * length);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDefeatPulse(game) {
  if (!game.defeatStartedAt) return;
  const strength = defeatPulseStrength(game.defeatStartedAt, nowMs());
  if (strength <= 0) return;

  const ctx = game.ctx;
  ctx.save();
  const gradient = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 140, WIDTH / 2, HEIGHT / 2, 730);
  gradient.addColorStop(0, 'rgba(255, 82, 106, 0)');
  gradient.addColorStop(1, `rgba(255, 40, 78, ${0.28 * strength})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = `rgba(255, 82, 106, ${0.68 * strength})`;
  ctx.lineWidth = 12 * strength;
  ctx.strokeRect(5, 5, WIDTH - 10, HEIGHT - 10);
  ctx.restore();
}

export function installDefeatUiRefine(GameClass) {
  const prototype = GameClass.prototype;
  if (prototype.__defeatUiRefineInstalled) return;
  prototype.__defeatUiRefineInstalled = true;

  const originalFinishRun = prototype.finishRun;
  prototype.finishRun = function finishRunWithoutPersistentCombatEffects(victory) {
    const result = originalFinishRun.call(this, victory);
    Object.assign(this, settleTerminalEffects());
    this.enemyShots = [];
    this.dashRequested = false;
    this.banner = null;
    this.defeatStartedAt = victory ? 0 : nowMs();
    return result;
  };

  prototype.drawMenu = function drawRefinedMenu() {
    const ctx = this.ctx;
    const digits = this.uiSettings?.latinDigits !== false;
    drawCornerAccents(ctx);

    ctx.save();
    ctx.fillStyle = 'rgba(255, 230, 109, 0.09)';
    ctx.strokeStyle = 'rgba(255, 230, 109, 0.44)';
    ctx.lineWidth = 1.5;
    roundedRect(ctx, WIDTH / 2 - 100, 76, 200, 34, 17);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    drawLabel(ctx, 'ARCADE RUN  •  v0.3.2', WIDTH / 2, 99, 13, COLORS.yellow, 800);

    drawLabel(ctx, 'حلبة الطلقة', WIDTH / 2, 174, 61, COLORS.text, 900);
    drawLabel(ctx, 'الواحدة', WIDTH / 2, 233, 67, COLORS.yellow, 900);
    drawLabel(ctx, 'طلقة واحدة • قرار محسوب • لا مكان للإهدار', WIDTH / 2, 270, 17, COLORS.muted, 500);

    drawPanel(ctx, 326, 302, 628, 254, COLORS.cyan);
    this.drawButton('ابدأ الجولة', 370, 328, 540, 60, () => this.startRun(), true);
    this.drawButton('طريقة اللعب', 370, 404, 258, 53, () => {
      this.audio.play('click');
      this.state = 'howto';
    });
    this.drawButton('الإعدادات', 652, 404, 258, 53, () => this.openSettings('menu'));

    drawStatTile(
      ctx,
      'أعلى نتيجة',
      formatUiNumber(this.highScore, digits),
      370,
      474,
      COLORS.yellow,
    );
    drawStatTile(
      ctx,
      'أفضل موجة',
      formatUiNumber(this.highWave, digits),
      660,
      474,
      COLORS.cyan,
    );

    drawLabel(ctx, 'Enter للبدء  •  F لملء الشاشة  •  M لكتم الصوت', WIDTH / 2, 622, 14, COLORS.muted, 600);
  };

  const originalDraw = prototype.draw;
  prototype.draw = function drawWithFiniteDefeatPulse(...args) {
    originalDraw.apply(this, args);
    if (this.state === 'gameover') drawDefeatPulse(this);
  };
}
