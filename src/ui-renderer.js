import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from './game-data.js';

export const UI_FONT = '"Segoe UI", Tahoma, Arial, sans-serif';

export const UI_COLORS = Object.freeze({
  background: '#030611',
  panel: 'rgba(6, 11, 27, 0.95)',
  panelSoft: 'rgba(12, 21, 43, 0.94)',
  border: '#34436f',
  borderBright: '#536795',
  text: '#f7f9ff',
  muted: '#99a8cc',
  player: '#62f3ff',
  bullet: '#ffe66d',
  danger: '#ff526f',
  success: '#53f2a1',
  electric: '#58a6ff',
  warning: '#ffab4f',
  violet: '#b887ff',
});

export const TOUCH_LAYOUT = Object.freeze({
  move: Object.freeze({ x: 118, y: HEIGHT - 112, radius: 64, activationRadius: 92 }),
  dash: Object.freeze({ x: WIDTH - 92, y: HEIGHT - 92, radius: 53 }),
  recall: Object.freeze({ x: WIDTH - 92, y: HEIGHT - 216, radius: 46 }),
  pause: Object.freeze({ x: WIDTH - 216, y: HEIGHT - 92, radius: 40 }),
});

export function roundedRect(ctx, x, y, width, height, radius = 14) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, width, height, radius);
  else ctx.rect(x, y, width, height);
}

export function panel(
  ctx,
  x,
  y,
  width,
  height,
  accent = UI_COLORS.border,
  fill = UI_COLORS.panel,
  glow = 8,
) {
  ctx.save();

  ctx.fillStyle = fill;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = accent;
  ctx.shadowBlur = glow;
  roundedRect(ctx, x, y, width, height, 14);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();

  const sheen = ctx.createLinearGradient(x, y, x + width, y + height);
  sheen.addColorStop(0, 'rgba(255,255,255,0.055)');
  sheen.addColorStop(0.48, 'rgba(255,255,255,0)');
  sheen.addColorStop(1, 'rgba(255,255,255,0.018)');
  ctx.fillStyle = sheen;
  roundedRect(ctx, x + 1, y + 1, width - 2, height - 2, 13);
  ctx.fill();

  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 0.7;
  roundedRect(ctx, x + 5, y + 5, width - 10, height - 10, 10);
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.fillStyle = accent;
  roundedRect(ctx, x + 12, y, Math.max(26, width * 0.15), 2, 1);
  ctx.fill();
  ctx.restore();
}

export function label(
  ctx,
  text,
  x,
  y,
  size,
  color = UI_COLORS.text,
  weight = 700,
  align = 'center',
) {
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${UI_FONT}`;
  ctx.fillText(String(text), x, y);
  ctx.restore();
}

export function wrapRtl(
  ctx,
  text,
  x,
  y,
  maxWidth,
  lineHeight,
  size,
  color,
  weight,
  maxLines = 3,
) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${UI_FONT}`;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) line = candidate;
    else {
      if (line) lines.push(line);
      line = word;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  lines.forEach((item, index) => ctx.fillText(item, x, y + index * lineHeight));
  ctx.restore();
}

export function dim(ctx, alpha = 0.84) {
  const overlay = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  overlay.addColorStop(0, `rgba(2, 4, 13, ${Math.min(1, alpha + 0.04)})`);
  overlay.addColorStop(1, `rgba(1, 2, 8, ${alpha})`);
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

export function polygon(ctx, sides, radius, rotation = 0) {
  ctx.beginPath();
  for (let index = 0; index < sides; index += 1) {
    const angle = rotation + index / sides * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

export function progressBar(
  ctx,
  x,
  y,
  width,
  height,
  value,
  accent,
  background = 'rgba(255,255,255,0.10)',
) {
  const safeValue = Math.max(0, Math.min(1, Number(value) || 0));
  ctx.save();
  ctx.fillStyle = background;
  roundedRect(ctx, x, y, width, height, height / 2);
  ctx.fill();

  if (safeValue > 0) {
    const filledWidth = Math.max(height, width * safeValue);
    const gradient = ctx.createLinearGradient(x, y, x + filledWidth, y);
    gradient.addColorStop(0, accent);
    gradient.addColorStop(1, '#ffffff');
    ctx.fillStyle = gradient;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 7;
    roundedRect(ctx, x, y, filledWidth, height, height / 2);
    ctx.fill();
  }

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#ffffff';
  roundedRect(ctx, x + 1, y + 1, Math.max(0, width - 2), Math.max(1, height * 0.28), height / 2);
  ctx.fill();
  ctx.restore();
}

export function formatRunTime(seconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remaining = String(safeSeconds % 60).padStart(2, '0');
  return `${minutes}:${remaining}`;
}

export function upgradeEffectText(upgrade, currentStack = 0) {
  const current = Math.max(0, Math.trunc(Number(currentStack) || 0));
  const next = Math.min(upgrade.maxStacks, current + 1);
  const pair = (before, after, suffix = '') => `الحالي ${before}${suffix}  •  بعد الاختيار ${after}${suffix}`;

  switch (upgrade.id) {
    case 'heavy-shot':
      return pair((1 + current * 0.35).toFixed(2), (1 + next * 0.35).toFixed(2), '× ضرر');
    case 'bullet-velocity':
      return pair(current * 7, next * 7, '% سرعة');
    case 'extended-ricochet':
      return pair(4 + current * 2, 4 + next * 2, ' ارتدادات');
    case 'hot-ricochet':
      return pair(current * 24, next * 24, '% لكل ارتداد');
    case 'shock-impact':
      return pair(82 + current * 20, 82 + next * 20, ' مدى');
    case 'magnetic-recall':
      return pair(720 + current * 95, 720 + next * 95, ' سرعة عودة');
    case 'recall-strike':
      return pair(current * 30, next * 30, '% ضرر عودة');
    case 'quick-dash':
      return pair(
        Math.max(0.36, 1.12 * Math.pow(0.86, current)).toFixed(2),
        Math.max(0.36, 1.12 * Math.pow(0.86, next)).toFixed(2),
        'ث انتظار',
      );
    case 'swift-steps':
      return pair(current * 7, next * 7, '% حركة');
    case 'vitality':
      return pair(3 + current, 3 + next, ' قلوب');
    case 'wave-shield':
      return 'بعد الاختيار: درع ضربة واحدة في بداية كل موجة';
    case 'second-chance':
      return 'بعد الاختيار: نجاة واحدة من ضربة قاتلة في كل جولة';
    default:
      return `المستوى ${current} ← ${next}`;
  }
}

export function pointInsideCircle(point, circle, extra = 0) {
  return Math.hypot(point.x - circle.x, point.y - circle.y) <= circle.radius + extra;
}
