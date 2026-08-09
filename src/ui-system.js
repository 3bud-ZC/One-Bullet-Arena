import { i18n } from './i18n.js';
import { UI_FONT } from './ui-renderer.js';

export const UI_TOKENS = Object.freeze({
  color: Object.freeze({
    bg: '#02070c',
    bgRaised: '#071019',
    graphite: '#0b141d',
    steel: '#12202b',
    cyan: '#69d7f4',
    cyanBright: '#b7efff',
    cyanDim: 'rgba(105, 215, 244, 0.16)',
    cyanLine: 'rgba(105, 215, 244, 0.28)',
    amber: '#e7b84d',
    amberBright: '#ffe09a',
    amberDim: 'rgba(231, 184, 77, 0.16)',
    green: '#58d6a2',
    greenDim: 'rgba(88, 214, 162, 0.14)',
    red: '#dd6675',
    redDim: 'rgba(221, 102, 117, 0.13)',
    text: '#f1f5f7',
    textSoft: '#b6c4cc',
    textMuted: '#6f8591',
    line: 'rgba(130, 173, 193, 0.16)',
    lineStrong: 'rgba(130, 194, 220, 0.28)',
    black: '#000000',
  }),
  radius: Object.freeze({ small: 6, medium: 10, large: 16 }),
  spacing: Object.freeze({ xs: 6, sm: 10, md: 16, lg: 24, xl: 32 }),
  type: Object.freeze({
    brand: 10,
    title: 32,
    hero: 74,
    screen: 28,
    action: 15,
    value: 20,
    body: 11,
    label: 8,
    telemetry: 7,
  }),
});

function localizeFunctionalLiteral(value) {
  const raw = String(value);
  if (!i18n.isRtl) return { value: raw, localized: false };
  let localized = raw.replace(/\bWAVE\s+(\d+)\b/gi, (_, wave) => i18n.t('wave.incoming', { wave }));
  if (localized === 'READY') localized = i18n.t('stat.ready');
  else if (localized === 'RETURNING') localized = i18n.t('stat.returning');
  else if (localized === 'Q RECALL') localized = i18n.t('hud.recallKey');
  return { value: localized, localized: localized !== raw };
}

export function angularPath(ctx, x, y, w, h, cut = 10) {
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

export function drawText(ctx, value, x, y, options = {}) {
  const normalized = localizeFunctionalLiteral(value);
  const {
    size = 12,
    color = UI_TOKENS.color.text,
    weight = 700,
    align = 'left',
    direction = 'ltr',
    baseline = 'alphabetic',
    alpha = 1,
    maxWidth,
  } = options;
  ctx.save();
  ctx.direction = normalized.localized ? 'rtl' : direction;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${UI_FONT}`;
  if (maxWidth) ctx.fillText(normalized.value, x, y, maxWidth);
  else ctx.fillText(normalized.value, x, y);
  ctx.restore();
}

export function drawLocalizedText(ctx, controller, value, x, y, options = {}) {
  const rtl = controller.isRtl;
  const align = options.align ?? (rtl ? 'right' : 'left');
  const direction = options.direction ?? (rtl ? 'rtl' : 'ltr');
  drawText(ctx, value, x, y, { ...options, align, direction });
}

export function wrapText(ctx, controller, value, x, y, maxWidth, options = {}) {
  const text = String(value);
  const size = options.size ?? 11;
  const lineHeight = options.lineHeight ?? Math.round(size * 1.45);
  const maxLines = options.maxLines ?? 3;
  const rtl = controller.isRtl;
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  ctx.save();
  ctx.font = `${options.weight ?? 650} ${size}px ${UI_FONT}`;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !line) line = candidate;
    else {
      lines.push(line);
      line = word;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  ctx.restore();
  lines.forEach((item, index) => drawLocalizedText(ctx, controller, item, x, y + index * lineHeight, {
    size,
    color: options.color,
    weight: options.weight,
    align: options.align ?? (rtl ? 'right' : 'left'),
    direction: rtl ? 'rtl' : 'ltr',
  }));
  return lines.length;
}

export function drawSurface(ctx, rect, options = {}) {
  const color = UI_TOKENS.color;
  ctx.save();
  angularPath(ctx, rect.x, rect.y, rect.w, rect.h, options.cut ?? 12);
  ctx.fillStyle = options.fill ?? 'rgba(5, 14, 22, 0.88)';
  ctx.fill();
  if (options.border !== false) {
    ctx.strokeStyle = options.border ?? color.lineStrong;
    ctx.lineWidth = options.lineWidth ?? 1;
    ctx.stroke();
  }
  if (options.accent) {
    ctx.strokeStyle = options.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rect.x + 18, rect.y);
    ctx.lineTo(rect.x + Math.min(rect.w * 0.28, 122), rect.y);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawButton(ctx, rect, state = {}) {
  const color = UI_TOKENS.color;
  const hover = Math.max(0, Math.min(1, state.hover ?? 0));
  const primary = Boolean(state.primary);
  const danger = Boolean(state.danger);
  const accent = danger ? color.red : primary ? color.amber : color.cyan;
  const fill = danger
    ? `rgba(37, 11, 17, ${0.72 + hover * 0.12})`
    : primary
      ? `rgba(43, 32, 11, ${0.88 + hover * 0.08})`
      : `rgba(7, 20, 29, ${0.82 + hover * 0.10})`;
  ctx.save();
  if (primary && hover > 0.02) {
    ctx.shadowColor = color.amber;
    ctx.shadowBlur = 8 * hover;
  }
  drawSurface(ctx, rect, {
    fill,
    border: state.disabled ? color.line : `${accent}${primary ? '99' : '66'}`,
    accent: state.disabled ? color.textMuted : accent,
    cut: primary ? 12 : 9,
  });
  ctx.shadowBlur = 0;
  if (primary) {
    const sweep = rect.x + 18 + (rect.w - 36) * (state.sweep ?? 0);
    const gradient = ctx.createLinearGradient(sweep - 80, 0, sweep + 80, 0);
    gradient.addColorStop(0, 'rgba(255,224,154,0)');
    gradient.addColorStop(0.5, 'rgba(255,224,154,0.08)');
    gradient.addColorStop(1, 'rgba(255,224,154,0)');
    ctx.fillStyle = gradient;
    angularPath(ctx, rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2, 11);
    ctx.fill();
  }
  ctx.restore();
}

export function drawGauge(ctx, x, y, width, value, accent, options = {}) {
  const safe = Math.max(0, Math.min(1, Number(value) || 0));
  const height = options.height ?? 4;
  ctx.save();
  ctx.fillStyle = options.background ?? 'rgba(255,255,255,0.08)';
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = accent;
  ctx.fillRect(x, y, width * safe, height);
  if (options.marker) {
    ctx.fillStyle = UI_TOKENS.color.text;
    ctx.fillRect(x + width * safe - 1, y - 2, 2, height + 4);
  }
  ctx.restore();
}

export function drawBulletGlyph(ctx, x, y, options = {}) {
  const color = options.color ?? UI_TOKENS.color.amber;
  const scale = options.scale ?? 1;
  const angle = options.angle ?? 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(5, -5);
  ctx.lineTo(-10, -5);
  ctx.lineTo(-14, 0);
  ctx.lineTo(-10, 5);
  ctx.lineTo(5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawTargetGlyph(ctx, x, y, radius = 12, color = UI_TOKENS.color.cyan) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.moveTo(x - radius - 5, y);
  ctx.lineTo(x - radius + 3, y);
  ctx.moveTo(x + radius - 3, y);
  ctx.lineTo(x + radius + 5, y);
  ctx.moveTo(x, y - radius - 5);
  ctx.lineTo(x, y - radius + 3);
  ctx.moveTo(x, y + radius - 3);
  ctx.lineTo(x, y + radius + 5);
  ctx.stroke();
  ctx.restore();
}

export function drawTrajectoryBackground(ctx, width, height, time = 0, reducedMotion = false) {
  const color = UI_TOKENS.color;
  ctx.fillStyle = color.bg;
  ctx.fillRect(0, 0, width, height);

  const radial = ctx.createRadialGradient(width * 0.52, height * 0.44, 80, width * 0.52, height * 0.44, 680);
  radial.addColorStop(0, 'rgba(18, 63, 82, 0.20)');
  radial.addColorStop(0.55, 'rgba(8, 28, 39, 0.08)');
  radial.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.strokeStyle = 'rgba(105,215,244,0.045)';
  ctx.lineWidth = 1;
  for (let x = 40; x < width; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 40; y < height; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const drift = reducedMotion ? 0 : ((time * 18) % 240);
  ctx.strokeStyle = 'rgba(231,184,77,0.14)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-40 + drift, height * 0.74);
  ctx.lineTo(width * 0.31 + drift * 0.18, height * 0.51);
  ctx.lineTo(width * 0.56 + drift * 0.08, height * 0.66);
  ctx.lineTo(width + 40, height * 0.38);
  ctx.stroke();
  drawTargetGlyph(ctx, width * 0.56 + drift * 0.08, height * 0.66, 8, 'rgba(231,184,77,0.20)');

  ctx.strokeStyle = 'rgba(105,215,244,0.07)';
  ctx.beginPath();
  ctx.arc(width * 0.16, height * 0.54, 260, -1.0, 0.7);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(width * 0.88, height * 0.52, 320, 2.35, 4.05);
  ctx.stroke();
  ctx.restore();

  const vignette = ctx.createRadialGradient(width / 2, height / 2, 260, width / 2, height / 2, 780);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.60)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}
