import { i18n } from './i18n.js';
import { UI_FONT } from './ui-renderer.js';

export const UI_TOKENS = Object.freeze({
  color: Object.freeze({
    bg: '#01070c',
    bgRaised: '#06121b',
    graphite: '#091620',
    steel: '#102532',
    cyan: '#53cdf5',
    cyanBright: '#a9ecff',
    cyanDim: 'rgba(105, 215, 244, 0.16)',
    cyanLine: 'rgba(105, 215, 244, 0.28)',
    amber: '#f0bd4d',
    amberBright: '#ffe09a',
    amberDim: 'rgba(231, 184, 77, 0.16)',
    green: '#55e0b0',
    greenDim: 'rgba(88, 214, 162, 0.14)',
    red: '#ee6678',
    redDim: 'rgba(221, 102, 117, 0.13)',
    text: '#f1f5f7',
    textSoft: '#c2d0d8',
    textMuted: '#718995',
    line: 'rgba(130, 173, 193, 0.16)',
    lineStrong: 'rgba(130, 194, 220, 0.28)',
    black: '#000000',
  }),
  radius: Object.freeze({ small: 6, medium: 10, large: 16 }),
  spacing: Object.freeze({
    xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48, hero: 64,
  }),
  type: Object.freeze({
    brand: 10, hero: 70, title: 32, screen: 27, cardTitle: 18,
    action: 14, value: 18, body: 11, label: 9, telemetry: 8, combat: 10,
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
  if (rect.w > 120 && rect.h > 40) {
    const topFade = ctx.createLinearGradient(rect.x + 12, 0, rect.x + Math.min(rect.w * 0.44, 260), 0);
    topFade.addColorStop(0, 'rgba(169,236,255,0.13)');
    topFade.addColorStop(1, 'rgba(169,236,255,0)');
    ctx.strokeStyle = topFade;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rect.x + 18, rect.y + 5);
    ctx.lineTo(rect.x + Math.min(rect.w * 0.40, 230), rect.y + 5);
    ctx.stroke();
  }
  if (options.accent) {
    ctx.strokeStyle = options.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rect.x + 18, rect.y);
    ctx.lineTo(rect.x + Math.min(rect.w * 0.24, 112), rect.y);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawButton(ctx, rect, state = {}) {
  const color = UI_TOKENS.color;
  const hover = Math.max(0, Math.min(1, state.hover ?? 0));
  const pressed = Boolean(state.pressed);
  const focused = Boolean(state.focused);
  const disabled = Boolean(state.disabled);
  const primary = Boolean(state.primary);
  const danger = Boolean(state.danger);
  const accent = danger ? color.red : primary ? color.amber : color.cyan;
  const lift = disabled ? 0 : pressed ? 1 : hover * 1.5;
  const r = { ...rect, y: rect.y - lift };
  const fill = danger
    ? `rgba(42, 10, 18, ${0.72 + hover * 0.10})`
    : primary
      ? `rgba(54, 37, 8, ${0.90 + hover * 0.06})`
      : `rgba(5, 18, 27, ${0.84 + hover * 0.07})`;

  ctx.save();
  if (!disabled && hover > 0.04) {
    ctx.shadowColor = accent;
    ctx.shadowBlur = primary ? 8 * hover : 4 * hover;
  }
  drawSurface(ctx, r, {
    fill,
    border: disabled ? color.line : `${accent}${focused ? 'CC' : primary ? 'AA' : hover > 0.02 ? '88' : '55'}`,
    accent: disabled ? color.textMuted : accent,
    cut: primary ? 13 : 9,
  });
  ctx.shadowBlur = 0;
  if (primary && !disabled) {
    ctx.strokeStyle = `${accent}66`;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(r.x + 11, r.y + r.h / 2); ctx.lineTo(r.x + 24, r.y + r.h / 2);
    ctx.moveTo(r.x + r.w - 24, r.y + r.h / 2); ctx.lineTo(r.x + r.w - 11, r.y + r.h / 2);
    ctx.stroke();
  }
  if (focused) {
    ctx.strokeStyle = `${accent}99`;
    ctx.setLineDash([4, 5]);
    angularPath(ctx, r.x + 4, r.y + 4, r.w - 8, r.h - 8, primary ? 10 : 7);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (primary && !disabled) {
    const sweep = r.x + 18 + (r.w - 36) * (state.sweep ?? 0);
    const gradient = ctx.createLinearGradient(sweep - 92, 0, sweep + 92, 0);
    gradient.addColorStop(0, 'rgba(255,225,154,0)');
    gradient.addColorStop(0.5, `rgba(255,225,154,${0.045 + hover * 0.055})`);
    gradient.addColorStop(1, 'rgba(255,225,154,0)');
    ctx.fillStyle = gradient;
    angularPath(ctx, r.x + 1, r.y + 1, r.w - 2, r.h - 2, 12);
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

export function drawUiIcon(ctx, kind, x, y, options = {}) {
  const color = options.color ?? UI_TOKENS.color.cyan;
  const scale = options.scale ?? 1;
  const alpha = options.alpha ?? 1;
  const active = options.active ?? true;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const line = (...pts) => {
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.stroke();
  };
  switch (kind) {
    case 'bullet':
      ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(4, -4); ctx.lineTo(-8, -4);
      ctx.lineTo(-11, 0); ctx.lineTo(-8, 4); ctx.lineTo(4, 4); ctx.closePath(); ctx.fill(); break;
    case 'language':
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, 4, 9, 0, 0, Math.PI * 2); ctx.stroke();
      line(-8, 0, 8, 0); line(-6, -5, 6, -5); line(-6, 5, 6, 5); break;
    case 'audio':
      ctx.beginPath(); ctx.moveTo(-9, -3); ctx.lineTo(-4, -3); ctx.lineTo(2, -8);
      ctx.lineTo(2, 8); ctx.lineTo(-4, 3); ctx.lineTo(-9, 3); ctx.closePath(); ctx.stroke();
      if (active) { ctx.beginPath(); ctx.arc(2, 0, 7, -0.85, 0.85); ctx.stroke();
        ctx.beginPath(); ctx.arc(2, 0, 11, -0.7, 0.7); ctx.stroke(); }
      else { line(6, -6, 12, 6); line(12, -6, 6, 6); } break;
    case 'fullscreen':
      line(-9, -3, -9, -9, -3, -9); line(3, -9, 9, -9, 9, -3);
      line(9, 3, 9, 9, 3, 9); line(-3, 9, -9, 9, -9, 3); break;
    case 'restart':
      ctx.beginPath(); ctx.arc(0, 0, 8, -2.45, 2.15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-7, -7); ctx.lineTo(-10, -1); ctx.lineTo(-3, -2); ctx.closePath(); ctx.fill(); break;
    case 'menu':
      line(-9, -6, 9, -6); line(-9, 0, 9, 0); line(-9, 6, 9, 6); break;
    case 'settings':
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 8; i += 1) { const a = i * Math.PI / 4; line(Math.cos(a) * 7, Math.sin(a) * 7, Math.cos(a) * 11, Math.sin(a) * 11); } break;
    case 'check':
      line(-8, 0, -2, 6, 9, -7); break;
    case 'health':
      ctx.beginPath(); ctx.moveTo(0, 9); ctx.bezierCurveTo(-2, 5, -10, 0, -10, -5);
      ctx.bezierCurveTo(-10, -10, -3, -11, 0, -6); ctx.bezierCurveTo(3, -11, 10, -10, 10, -5);
      ctx.bezierCurveTo(10, 0, 2, 5, 0, 9); ctx.stroke(); break;
    case 'shield':
      ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(9, -6); ctx.lineTo(7, 4);
      ctx.quadraticCurveTo(4, 9, 0, 11); ctx.quadraticCurveTo(-4, 9, -7, 4);
      ctx.lineTo(-9, -6); ctx.closePath(); ctx.stroke(); break;
    case 'dash':
      line(-11, -5, 1, -5); line(-8, 0, 6, 0); line(-11, 5, 1, 5);
      ctx.beginPath(); ctx.moveTo(3, -8); ctx.lineTo(11, 0); ctx.lineTo(3, 8); ctx.stroke(); break;
    case 'score':
      ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(3, -3); ctx.lineTo(10, -3);
      ctx.lineTo(5, 2); ctx.lineTo(7, 9); ctx.lineTo(0, 5); ctx.lineTo(-7, 9);
      ctx.lineTo(-5, 2); ctx.lineTo(-10, -3); ctx.lineTo(-3, -3); ctx.closePath(); ctx.stroke(); break;
    case 'wave':
      line(-11, 3, -7, -2, -3, 3, 1, -2, 5, 3, 9, -2); break;
    case 'checkpoint':
      ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(9, 0); ctx.lineTo(0, 10);
      ctx.lineTo(-9, 0); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill(); break;
    case 'upgrade':
      line(0, 10, 0, -7); line(-6, -1, 0, -8, 6, -1); line(-8, 10, 8, 10); break;
    case 'sector':
      ctx.strokeRect(-9, -9, 7, 7); ctx.strokeRect(2, -9, 7, 7);
      ctx.strokeRect(-9, 2, 7, 7); ctx.strokeRect(2, 2, 7, 7); break;
    case 'ricochet':
      line(-10, 7, -1, -2, 5, 4, 11, -2);
      ctx.beginPath(); ctx.moveTo(7, -4); ctx.lineTo(12, -3); ctx.lineTo(10, 2); ctx.fill(); break;
    case 'recall':
      ctx.beginPath(); ctx.arc(0, 0, 8, -1.9, 2.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-8, -5); ctx.lineTo(-10, 1); ctx.lineTo(-4, -1); ctx.closePath(); ctx.fill(); break;
    case 'movement':
      line(-10, 0, 10, 0); line(-10, 0, -5, -5); line(-10, 0, -5, 5);
      line(10, 0, 5, -5); line(10, 0, 5, 5); break;
    case 'electric':
      ctx.beginPath(); ctx.moveTo(3, -11); ctx.lineTo(-7, 2); ctx.lineTo(-1, 2);
      ctx.lineTo(-4, 11); ctx.lineTo(8, -3); ctx.lineTo(2, -3); ctx.closePath(); ctx.fill(); break;
    case 'second-chance':
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.stroke();
      line(0, -6, 0, 3); ctx.beginPath(); ctx.arc(0, 6, 1.4, 0, Math.PI * 2); ctx.fill(); break;
    default:
      ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

export function drawTrajectoryBackground(ctx, width, height, time = 0, reducedMotion = false) {
  const color = UI_TOKENS.color;
  ctx.fillStyle = color.bg;
  ctx.fillRect(0, 0, width, height);

  const radialA = ctx.createRadialGradient(width * 0.34, height * 0.38, 40, width * 0.34, height * 0.38, 520);
  radialA.addColorStop(0, 'rgba(15, 61, 83, 0.22)');
  radialA.addColorStop(0.55, 'rgba(6, 29, 42, 0.08)');
  radialA.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = radialA; ctx.fillRect(0, 0, width, height);

  const radialB = ctx.createRadialGradient(width * 0.78, height * 0.42, 50, width * 0.78, height * 0.42, 440);
  radialB.addColorStop(0, 'rgba(6, 43, 59, 0.16)');
  radialB.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = radialB; ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.strokeStyle = 'rgba(83,205,245,0.040)';
  ctx.lineWidth = 1;
  for (let x = 32; x < width; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
  for (let y = 32; y < height; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }

  ctx.strokeStyle = 'rgba(83,205,245,0.055)';
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.arc(width * 0.52, height * 0.46, 110 + i * 54, -2.8, 0.65);
    ctx.stroke();
  }

  const drift = reducedMotion ? 0 : ((time * 14) % 220);
  ctx.strokeStyle = 'rgba(240,189,77,0.10)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-120 + drift, height * 0.72);
  ctx.lineTo(width * 0.28 + drift * 0.13, height * 0.52);
  ctx.lineTo(width * 0.49 + drift * 0.05, height * 0.63);
  ctx.lineTo(width + 80, height * 0.36);
  ctx.stroke();
  ctx.restore();

  const vignette = ctx.createRadialGradient(width / 2, height / 2, 250, width / 2, height / 2, 790);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.66)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}
