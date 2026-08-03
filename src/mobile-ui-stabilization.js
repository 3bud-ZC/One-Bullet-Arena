import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from './content.js';
import { coreById } from './progression-data.js';
import { difficultyById, normalizeMission, regionById } from './regions-data.js';
import { overdriveByCore } from './advanced-builds-data.js';
import { COMBAT_TECHNIQUES, expandedTargetWaves, mobileTechniqueLayout } from './v12-expansion-data.js';

export const MOBILE_UI_RELEASE = '1.3.1';

const FONT = 'Changa, "Segoe UI", Tahoma, sans-serif';
const NUMBER_FONT = 'Inter, "Segoe UI", Arial, sans-serif';
const COLORS = Object.freeze({
  background: '#02040a',
  panel: 'rgba(5, 10, 23, 0.96)',
  panelSoft: 'rgba(10, 17, 36, 0.94)',
  border: '#35416e',
  cyan: '#62f3ff',
  yellow: '#ffe66d',
  red: '#ff526a',
  purple: '#b983ff',
  orange: '#ff9f43',
  green: '#53f2a1',
  text: '#f8f9ff',
  muted: '#aeb7da',
  dim: '#69739b',
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundedRect(ctx, x, y, width, height, radius = 14) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
  ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
  ctx.arcTo(x, y + height, x, y, safeRadius);
  ctx.arcTo(x, y, x + width, y, safeRadius);
  ctx.closePath();
}

function panel(ctx, x, y, width, height, accent = COLORS.border, fill = COLORS.panel, glow = 4, radius = 14) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.shadowColor = accent;
  ctx.shadowBlur = glow;
  roundedRect(ctx, x, y, width, height, radius);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();
  ctx.restore();
}

function solidCover(ctx, x, y, width, height, radius = 16) {
  ctx.save();
  ctx.fillStyle = 'rgba(2, 4, 10, 0.985)';
  roundedRect(ctx, x, y, width, height, radius);
  ctx.fill();
  ctx.restore();
}

function label(ctx, text, x, y, size, color = COLORS.text, weight = 700, align = 'center') {
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillText(String(text), x, y);
  ctx.restore();
}

function number(ctx, value, x, y, size, color = COLORS.text, align = 'center') {
  ctx.save();
  ctx.direction = 'ltr';
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.font = `800 ${size}px ${NUMBER_FONT}`;
  ctx.fillText(String(value), x, y);
  ctx.restore();
}

function formatNumber(value) {
  const safe = Math.max(0, Math.trunc(Number(value) || 0));
  return safe.toLocaleString('en-US');
}

function formatDuration(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safe / 60);
  const remainder = Math.floor(safe % 60);
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export function formatMobileWaveProgress(wave, total) {
  const safeWave = Math.max(1, Math.trunc(Number(wave) || 1));
  const safeTotal = Math.max(safeWave, Math.trunc(Number(total) || safeWave));
  return `${safeWave} / ${safeTotal}`;
}

export function mobileUiLayout({ leftHanded = false, scale = 1 } = {}) {
  const safeScale = clamp(Number(scale) || 1, 0.82, 1.16);
  const actionX = leftHanded ? 90 : WIDTH - 90;
  const secondaryX = leftHanded ? 188 : WIDTH - 188;
  const tertiaryX = leftHanded ? 284 : WIDTH - 284;
  const utilityX = leftHanded ? 42 : WIDTH - 42;
  return {
    movement: {
      x: leftHanded ? WIDTH - 92 : 92,
      y: HEIGHT - 92,
      radius: 50 * safeScale,
    },
    dash: { x: actionX, y: HEIGHT - 88, radius: 38 * safeScale },
    recall: { x: secondaryX, y: HEIGHT - 70, radius: 30 * safeScale },
    overdrive: { x: tertiaryX, y: HEIGHT - 58, radius: 28 * safeScale },
    pulse: { x: actionX, y: HEIGHT - 180, radius: 29 * safeScale },
    phase: { x: secondaryX, y: HEIGHT - 151, radius: 27 * safeScale },
    pause: { x: utilityX, y: 110, radius: 22 * safeScale },
    build: { x: utilityX, y: 160, radius: 22 * safeScale },
  };
}

export function resultScreenLayout({ compact = false } = {}) {
  return {
    titleY: compact ? 38 : 44,
    subtitleY: compact ? 61 : 68,
    panel: { x: 42, y: compact ? 73 : 80, width: 1196, height: compact ? 582 : 574 },
    statsX: 78,
    statsY: compact ? 112 : 122,
    statWidth: 165,
    statHeight: compact ? 55 : 58,
    statGapX: 177,
    statGapY: compact ? 65 : 69,
    summary: { x: 810, y: compact ? 108 : 116, width: 382, height: 142 },
    rewards: { x: 810, y: compact ? 262 : 271, width: 382, height: 112 },
    challenge: { x: 810, y: compact ? 386 : 395, width: 382, height: 104 },
    buttonsY: compact ? 585 : 592,
  };
}

export function isCompactBrowserViewport({ width = 0, height = 0, touch = false } = {}) {
  const safeWidth = Math.max(1, Number(width) || 1);
  const safeHeight = Math.max(1, Number(height) || 1);
  return Boolean(touch) || safeHeight < 760 || safeWidth / safeHeight > 1.9;
}

function pointInCircle(point, circle) {
  return Math.hypot(point.x - circle.x, point.y - circle.y) <= circle.radius;
}

function canvasPoint(game, event) {
  const rect = game.canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / Math.max(1, rect.width)) * WIDTH,
    y: ((event.clientY - rect.top) / Math.max(1, rect.height)) * HEIGHT,
  };
}

function eventTargetsCanvas(game, event) {
  return event.composedPath?.().includes(game.canvas) || event.target === game.canvas;
}

function vibrate(game, pattern) {
  if (!game.mobileSettings?.haptics || typeof navigator.vibrate !== 'function') return;
  navigator.vibrate(pattern);
}

function installFinalTouchInput(game) {
  if (game.__mobileUiFinalTouchInstalled) return;
  game.__mobileUiFinalTouchInstalled = true;
  game.mobileUiPointers = new Map();

  const stop = (event) => {
    if (event.pointerType !== 'touch' || !eventTargetsCanvas(game, event)) return false;
    event.preventDefault();
    event.stopImmediatePropagation();
    game.touchMode = true;
    return true;
  };

  const clearRole = (pointerId) => {
    const role = game.mobileUiPointers.get(pointerId);
    game.mobileUiPointers.delete(pointerId);
    if (role?.role === 'move' && game.touchMove?.id === pointerId) game.touchMove = null;
    if (role?.role === 'aim' && game.mobileAim?.id === pointerId) game.mobileAim = null;
    return role;
  };

  window.addEventListener('pointerdown', (event) => {
    if (!stop(event)) return;
    const point = canvasPoint(game, event);
    game.pointer.x = point.x;
    game.pointer.y = point.y;
    game.pointer.down = true;
    game.audio?.ensure?.();

    if (game.state !== 'playing') {
      game.handleUiClick?.(point.x, point.y);
      return;
    }

    const settings = game.mobileSettings || {};
    const layout = mobileUiLayout(settings);
    if (pointInCircle(point, layout.pause)) {
      game.pauseGame?.();
      vibrate(game, 16);
      return;
    }
    if (pointInCircle(point, layout.build)) {
      game.audio?.play?.('click');
      game.buildReturnState = 'playing';
      game.state = 'buildInspect';
      vibrate(game, 16);
      return;
    }
    if (pointInCircle(point, layout.dash)) {
      game.dashRequested = true;
      vibrate(game, 20);
      return;
    }
    if (pointInCircle(point, layout.recall)) {
      game.recallBullet?.();
      vibrate(game, [10, 16, 10]);
      return;
    }
    if (pointInCircle(point, layout.overdrive)) {
      game.activateOverdrive?.();
      vibrate(game, [12, 20, 12]);
      return;
    }
    if (pointInCircle(point, layout.pulse)) {
      game.useCombatTechnique?.('kinetic-pulse');
      vibrate(game, [12, 18, 12]);
      return;
    }
    if (pointInCircle(point, layout.phase)) {
      game.useCombatTechnique?.('phase-shift');
      vibrate(game, [12, 18, 12]);
      return;
    }

    const leftHanded = Boolean(settings.leftHanded);
    const movementSide = leftHanded ? point.x > WIDTH * 0.58 : point.x < WIDTH * 0.42;
    if (movementSide && point.y > HEIGHT * 0.3) {
      const minX = leftHanded ? WIDTH * 0.61 : 58;
      const maxX = leftHanded ? WIDTH - 58 : WIDTH * 0.39;
      const role = {
        role: 'move',
        id: event.pointerId,
        originX: clamp(point.x, minX, maxX),
        originY: clamp(point.y, HEIGHT * 0.5, HEIGHT - 66),
        x: point.x,
        y: point.y,
      };
      game.mobileUiPointers.set(event.pointerId, role);
      game.touchMove = role;
      return;
    }

    const aim = { role: 'aim', id: event.pointerId, x: point.x, y: point.y };
    game.mobileUiPointers.set(event.pointerId, aim);
    game.mobileAim = aim;
    if (settings.aimRelease === false) {
      game.fireBullet?.();
      vibrate(game, 8);
    }
  }, { capture: true, passive: false });

  window.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'touch' || !game.mobileUiPointers.has(event.pointerId)) return;
    if (!stop(event)) return;
    const role = game.mobileUiPointers.get(event.pointerId);
    const point = canvasPoint(game, event);
    role.x = point.x;
    role.y = point.y;
    if (role.role === 'move') game.touchMove = role;
    else {
      game.pointer.x = point.x;
      game.pointer.y = point.y;
      game.mobileAim = role;
    }
  }, { capture: true, passive: false });

  const release = (event) => {
    if (event.pointerType !== 'touch' || !game.mobileUiPointers.has(event.pointerId)) return;
    if (!stop(event)) return;
    const point = canvasPoint(game, event);
    const role = clearRole(event.pointerId);
    if (role?.role === 'aim' && game.state === 'playing' && game.mobileSettings?.aimRelease !== false) {
      game.pointer.x = point.x;
      game.pointer.y = point.y;
      game.fireBullet?.();
      vibrate(game, 8);
    }
    game.pointer.down = game.mobileUiPointers.size > 0;
  };

  window.addEventListener('pointerup', release, { capture: true, passive: false });
  window.addEventListener('pointercancel', release, { capture: true, passive: false });
}

function drawControl(ctx, control, text, accent, opacity, ready = true, cooldown = '') {
  const radius = control.radius;
  ctx.save();
  ctx.globalAlpha = ready ? opacity : opacity * 0.5;
  ctx.fillStyle = 'rgba(3, 8, 18, 0.82)';
  ctx.strokeStyle = ready ? accent : COLORS.dim;
  ctx.lineWidth = Math.max(2.2, radius * 0.08);
  ctx.shadowColor = ready ? accent : 'transparent';
  ctx.shadowBlur = ready ? 8 : 0;
  ctx.beginPath();
  ctx.arc(control.x, control.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  label(ctx, cooldown || text, control.x, control.y + 4, Math.max(9, radius * 0.29), ready ? accent : COLORS.muted, 900);
  ctx.restore();
}

function clearLegacyTechniqueControls(game) {
  const settings = game.mobileSettings || {};
  const legacy = mobileTechniqueLayout({ leftHanded: Boolean(settings.leftHanded), scale: Number(settings.controlScale) || 1 });
  const ctx = game.ctx;
  ctx.save();
  ctx.fillStyle = 'rgba(2, 4, 10, 0.985)';
  for (const control of [legacy.pulse, legacy.phase]) {
    ctx.beginPath();
    ctx.arc(control.x, control.y, control.radius + 9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCompactTouchControls(game) {
  const ctx = game.ctx;
  const settings = game.mobileSettings || { controlScale: 1, opacity: 0.64, leftHanded: false };
  const layout = mobileUiLayout(settings);
  const opacity = clamp(Number(settings.opacity) || 0.64, 0.4, 0.86);
  clearLegacyTechniqueControls(game);

  const origin = game.touchMove || {
    originX: layout.movement.x,
    originY: layout.movement.y,
    x: layout.movement.x,
    y: layout.movement.y,
  };
  const maxKnob = layout.movement.radius * 0.68;
  const dx = origin.x - origin.originX;
  const dy = origin.y - origin.originY;
  const distance = Math.hypot(dx, dy) || 1;
  const knobX = origin.originX + dx / distance * Math.min(distance, maxKnob);
  const knobY = origin.originY + dy / distance * Math.min(distance, maxKnob);

  ctx.save();
  ctx.globalAlpha = opacity * 0.62;
  ctx.fillStyle = 'rgba(3, 8, 18, 0.38)';
  ctx.strokeStyle = COLORS.cyan;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(origin.originX, origin.originY, layout.movement.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(98, 243, 255, 0.5)';
  ctx.beginPath();
  ctx.arc(knobX, knobY, layout.movement.radius * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const pulseState = game.v12Techniques?.['kinetic-pulse'] || { cooldown: 0 };
  const phaseState = game.v12Techniques?.['phase-shift'] || { cooldown: 0 };
  const overdriveReady = (game.overdriveCharge || 0) >= 100 || game.overdriveActive > 0;
  const overdriveConfig = overdriveByCore(game.activeCoreId || game.progressionSave?.selectedCore || 'standard');

  drawControl(ctx, layout.dash, 'اندفاع', COLORS.yellow, opacity, game.player.dashCooldown <= 0,
    game.player.dashCooldown > 0 ? Math.ceil(game.player.dashCooldown) : '');
  drawControl(ctx, layout.recall, 'سحب', COLORS.cyan, opacity, !game.bullet.held && game.bullet.recallCooldown <= 0,
    game.bullet.recallCooldown > 0 ? Math.ceil(game.bullet.recallCooldown) : '');
  drawControl(ctx, layout.pulse, 'نبض', COMBAT_TECHNIQUES[0].color, opacity, pulseState.cooldown <= 0,
    pulseState.cooldown > 0 ? Math.ceil(pulseState.cooldown) : '');
  drawControl(ctx, layout.phase, 'طور', COMBAT_TECHNIQUES[1].color, opacity, phaseState.cooldown <= 0,
    phaseState.cooldown > 0 ? Math.ceil(phaseState.cooldown) : '');
  drawControl(ctx, layout.overdrive, 'فورة', overdriveConfig.color, opacity, overdriveReady,
    overdriveReady ? '' : `${Math.floor(game.overdriveCharge || 0)}%`);
  drawControl(ctx, layout.pause, 'Ⅱ', COLORS.text, opacity * 0.78, true);
  drawControl(ctx, layout.build, 'B', COLORS.purple, opacity * 0.78, true);

  if (settings.aimGuide !== false && game.mobileAim && game.bullet.held) {
    ctx.save();
    ctx.globalAlpha = 0.48;
    ctx.strokeStyle = COLORS.yellow;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(game.player.x, game.player.y);
    ctx.lineTo(game.mobileAim.x, game.mobileAim.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(game.mobileAim.x, game.mobileAim.y, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function activeCore(game) {
  return coreById(game.activeCoreId || game.progressionSave?.selectedCore || 'standard') || coreById('standard');
}

function drawCompactMobileHud(game) {
  const ctx = game.ctx;
  const mission = normalizeMission(game.activeMission || game.selectedMission || {});
  const region = regionById(game.arena?.regionId || mission.regionId || 'neon');
  const difficulty = difficultyById(mission.difficultyId || 'hunter');
  const core = activeCore(game);
  const total = game.runTargetWaves || expandedTargetWaves(mission, Boolean(game.isDailyRun));
  const overdriveConfig = overdriveByCore(core.id);

  solidCover(ctx, 4, 4, 258, 68, 15);
  solidCover(ctx, WIDTH - 276, 4, 272, 74, 15);
  solidCover(ctx, WIDTH / 2 - 126, 4, 252, 64, 15);

  panel(ctx, 10, 9, 212, 50, game.bullet.held ? COLORS.yellow : COLORS.cyan, COLORS.panel, 3, 12);
  label(ctx, game.bullet.held ? 'الطلقة جاهزة' : game.bullet.recalling ? 'الطلقة عائدة' : 'استعد الطلقة', 205, 31, 13, game.bullet.held ? COLORS.yellow : COLORS.text, 900, 'right');
  const dashText = game.player.dashCooldown <= 0 ? 'اندفاع جاهز' : `اندفاع ${game.player.dashCooldown.toFixed(1)}ث`;
  label(ctx, dashText, 205, 51, 10, COLORS.muted, 600, 'right');
  if (!game.bullet.held) number(ctx, Math.max(0, game.bullet.bouncesRemaining), 31, 51, 11, COLORS.cyan, 'left');

  panel(ctx, WIDTH - 236, 9, 226, 56, region.color, COLORS.panel, 3, 12);
  label(ctx, `${region.icon} ${region.shortName} • ${difficulty.name}`, WIDTH - 25, 29, 10, region.color, 800, 'right');
  number(ctx, formatMobileWaveProgress(game.wave, total), WIDTH - 210, 55, 16, COLORS.cyan, 'left');
  label(ctx, `النقاط ${formatNumber(game.score)}`, WIDTH - 25, 55, 10, COLORS.muted, 700, 'right');
  for (let index = 0; index < game.player.maxHealth; index += 1) {
    ctx.fillStyle = index < game.player.health ? COLORS.red : '#252b43';
    ctx.beginPath();
    ctx.arc(WIDTH - 210 + index * 19, 29, 5.2, 0, Math.PI * 2);
    ctx.fill();
  }

  panel(ctx, WIDTH / 2 - 90, 9, 180, 28, core.color, COLORS.panel, 3, 10);
  label(ctx, `${core.icon} ${core.shortName}`, WIDTH / 2, 29, 11, core.color, 900);

  const active = game.overdriveActive > 0;
  const ratio = active ? 1 : clamp((game.overdriveCharge || 0) / 100, 0, 1);
  ctx.save();
  ctx.fillStyle = 'rgba(8, 13, 29, 0.96)';
  roundedRect(ctx, WIDTH / 2 - 94, 41, 188, 16, 8);
  ctx.fill();
  ctx.fillStyle = `${overdriveConfig.color}55`;
  roundedRect(ctx, WIDTH / 2 - 91, 44, 182 * ratio, 10, 5);
  ctx.fill();
  ctx.restore();
  label(ctx, active ? `${game.overdriveActive.toFixed(1)}ث` : `${Math.floor(game.overdriveCharge || 0)}%`, WIDTH / 2, 54, 8, active ? COLORS.text : overdriveConfig.color, 900);

  const challengeFailed = game.challengeFeedbackState === 'failed';
  const challengeCompleted = game.challengeFeedbackState === 'completed';
  const challengeColor = challengeFailed ? COLORS.red : challengeCompleted ? COLORS.green : COLORS.purple;
  const challengeText = challengeFailed
    ? 'فشل التحدي'
    : challengeCompleted
      ? 'اكتمل التحدي'
      : game.runChallenge?.name || 'تحدي الجولة';
  panel(ctx, WIDTH / 2 - 135, HEIGHT - 27, 270, 20, challengeColor, 'rgba(3, 7, 17, 0.88)', 2, 9);
  label(ctx, challengeText, WIDTH / 2, HEIGHT - 13, 8.5, challengeColor, 800);

  if (game.combo > 1 && game.comboTimer > 0) {
    panel(ctx, WIDTH / 2 - 64, 65, 128, 24, COLORS.yellow, 'rgba(20, 16, 6, 0.92)', 3, 10);
    label(ctx, `×${game.combo} كومبو`, WIDTH / 2, 82, 10, COLORS.yellow, 900);
  }
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2, color = COLORS.muted, size = 11) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = color;
  ctx.font = `600 ${size}px ${FONT}`;
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
  lines.forEach((value, index) => ctx.fillText(value, x, y + index * lineHeight));
  ctx.restore();
}

function drawResultTile(game, title, value, x, y, width, height, accent) {
  const ctx = game.ctx;
  panel(ctx, x, y, width, height, COLORS.border, COLORS.panelSoft, 2, 12);
  label(ctx, title, x + width - 12, y + 20, 9.5, COLORS.muted, 600, 'right');
  number(ctx, value, x + width - 12, y + height - 12, 14, accent, 'right');
}

function drawCompactResult(game, victory) {
  const ctx = game.ctx;
  const viewport = window.visualViewport;
  const compact = isCompactBrowserViewport({
    width: viewport?.width || window.innerWidth,
    height: viewport?.height || window.innerHeight,
    touch: game.touchMode,
  });
  const layout = resultScreenLayout({ compact });
  const run = game.lastProgressionReward?.run || {};
  const core = coreById(run.coreId || game.activeCoreId || game.progressionSave?.selectedCore || 'standard') || coreById('standard');
  const rank = run.rank || 'C';
  const shots = Math.max(0, Number(game.stats?.shots) || 0);
  const accurateShots = Math.min(shots, Math.max(0, Number(game.stats?.accurateShots) || 0));
  const directImpacts = Math.max(accurateShots, Number(game.stats?.directImpacts ?? game.stats?.hits) || 0);
  const accuracy = shots > 0 ? Math.round((accurateShots / shots) * 100) : 0;
  const summary = game.lastReplayabilitySummary || {};
  const challenge = summary.challenge || game.runChallenge || { name: 'تحدي الجولة', description: 'أكمل هدف الجولة للحصول على مكافأة إضافية.' };
  const challengeComplete = Boolean(summary.completed);
  const accent = victory ? COLORS.yellow : COLORS.red;
  const panelBox = layout.panel;

  ctx.save();
  ctx.fillStyle = 'rgba(1, 3, 9, 0.96)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  label(ctx, victory ? 'تم إسقاط حارس النواة' : 'انتهت الجولة', WIDTH / 2, layout.titleY, compact ? 28 : 32, accent, 900);
  label(ctx, victory ? 'غنائمك محفوظة، والبناء جاهز للمواجهة التالية.' : 'التقدم محفوظ — عدّل بناءك وارجع أقوى.', WIDTH / 2, layout.subtitleY, compact ? 11 : 12, COLORS.muted, 600);
  panel(ctx, panelBox.x, panelBox.y, panelBox.width, panelBox.height, accent, 'rgba(8, 11, 25, 0.985)', 10, 18);

  const stats = [
    ['النقاط', formatNumber(game.score), COLORS.yellow],
    ['الوقت', formatDuration(game.runTime), COLORS.cyan],
    ['الإطلاقات', shots, COLORS.text],
    ['أصابت هدفًا', accurateShots, COLORS.green],
    ['الاصطدامات', directImpacts, COLORS.purple],
    ['الدقة', `${accuracy}%`, COLORS.green],
    ['الأعداء', Math.max(0, game.stats?.kills || 0), COLORS.orange],
    ['الارتدادات', Math.max(0, game.stats?.ricochets || 0), COLORS.purple],
  ];
  stats.forEach(([title, value, color], index) => {
    const column = index % 4;
    const row = Math.floor(index / 4);
    drawResultTile(
      game,
      title,
      value,
      layout.statsX + column * layout.statGapX,
      layout.statsY + row * layout.statGapY,
      layout.statWidth,
      layout.statHeight,
      color,
    );
  });

  const summaryBox = layout.summary;
  panel(ctx, summaryBox.x, summaryBox.y, summaryBox.width, summaryBox.height, core.color, COLORS.panelSoft, 5, 14);
  label(ctx, rank, summaryBox.x + summaryBox.width - 42, summaryBox.y + 70, compact ? 54 : 62, rank === 'S' ? COLORS.yellow : accent, 900, 'right');
  label(ctx, 'تقييم الجولة', summaryBox.x + 24, summaryBox.y + 34, 11, COLORS.muted, 600, 'left');
  label(ctx, `${core.icon} ${core.name}`, summaryBox.x + 24, summaryBox.y + 68, 14, core.color, 900, 'left');
  label(ctx, victory ? 'انتصار' : 'محاولة مكتملة', summaryBox.x + 24, summaryBox.y + 104, 11, victory ? COLORS.green : COLORS.red, 800, 'left');

  const rewardBox = layout.rewards;
  panel(ctx, rewardBox.x, rewardBox.y, rewardBox.width, rewardBox.height, COLORS.yellow, 'rgba(54, 45, 17, 0.76)', 5, 14);
  label(ctx, 'مكافآت الجولة', rewardBox.x + rewardBox.width - 18, rewardBox.y + 30, 14, COLORS.text, 900, 'right');
  label(ctx, 'شظايا الأداء', rewardBox.x + rewardBox.width - 18, rewardBox.y + 62, 10, COLORS.muted, 600, 'right');
  number(ctx, `+${game.lastProgressionReward?.reward || 0}`, rewardBox.x + 22, rewardBox.y + 65, 18, COLORS.yellow, 'left');
  label(ctx, 'الرصيد الحالي', rewardBox.x + rewardBox.width - 18, rewardBox.y + 91, 10, COLORS.muted, 600, 'right');
  number(ctx, formatNumber(game.progressionSave?.shards || 0), rewardBox.x + 22, rewardBox.y + 94, 18, COLORS.yellow, 'left');

  const challengeBox = layout.challenge;
  const challengeAccent = challengeComplete ? COLORS.green : COLORS.red;
  panel(ctx, challengeBox.x, challengeBox.y, challengeBox.width, challengeBox.height, challengeAccent, 'rgba(20, 11, 27, 0.94)', 5, 14);
  label(ctx, challengeComplete ? `✓ اكتمل: ${challenge.name}` : `لم يكتمل: ${challenge.name}`, challengeBox.x + challengeBox.width - 18, challengeBox.y + 31, 13, challengeAccent, 900, 'right');
  wrapText(
    ctx,
    challengeComplete ? `مكافأة إضافية +${summary.bonus || 0}` : challenge.description,
    challengeBox.x + challengeBox.width - 18,
    challengeBox.y + 58,
    challengeBox.width - 36,
    18,
    2,
    COLORS.muted,
    10,
  );

  const buttonWidth = 286;
  game.drawButton('العب من جديد', 87, layout.buttonsY, buttonWidth, 44, () => game.startRun(), true);
  game.drawButton('مركز النواة', 497, layout.buttonsY, buttonWidth, 44, () => {
    game.audio?.play?.('click');
    game.state = 'coreHub';
  });
  game.drawButton('القائمة الرئيسية', 907, layout.buttonsY, buttonWidth, 44, () => {
    game.audio?.play?.('click');
    game.goToMenu?.();
  });
  ctx.restore();
}

function drawCompactTechniqueNotice(game) {
  if (!game.v12TechniqueNotice?.technique || game.v12TechniqueNotice.time <= 0) return;
  const technique = game.v12TechniqueNotice.technique;
  solidCover(game.ctx, WIDTH / 2 - 205, 106, 410, 68, 14);
  panel(game.ctx, WIDTH / 2 - 132, 112, 264, 34, technique.color, COLORS.panel, 4, 12);
  label(game.ctx, `${technique.icon} ${technique.name}`, WIDTH / 2, 135, 11, technique.color, 900);
}

export function installMobileUiStabilization(GameClass) {
  const prototype = GameClass.prototype;
  if (prototype.__mobileUiStabilizationInstalled) return;
  prototype.__mobileUiStabilizationInstalled = true;

  const previousHud = prototype.drawHud;
  prototype.drawHud = function drawFinalResponsiveHud(...args) {
    if (this.touchMode) return undefined;
    return previousHud.apply(this, args);
  };

  const previousTouchControls = prototype.drawTouchControls;
  prototype.drawTouchControls = function drawFinalTouchControls(...args) {
    if (this.touchMode) return undefined;
    return previousTouchControls?.apply(this, args);
  };

  prototype.drawResult = function drawFinalResult(victory) {
    drawCompactResult(this, victory);
  };

  const previousDraw = prototype.draw;
  prototype.draw = function drawFinalMobileOverlay(...args) {
    const result = previousDraw.apply(this, args);
    if (this.touchMode && ['playing', 'bossIntro'].includes(this.state)) {
      this.ctx.save();
      drawCompactMobileHud(this);
      drawCompactTouchControls(this);
      drawCompactTechniqueNotice(this);
      this.ctx.restore();
    }
    return result;
  };
}

export function attachMobileUiStabilization(game) {
  installFinalTouchInput(game);

  const syncViewport = () => {
    const viewport = window.visualViewport;
    const width = Math.max(1, Math.round(viewport?.width || window.innerWidth));
    const height = Math.max(1, Math.round(viewport?.height || window.innerHeight));
    document.documentElement.style.setProperty('--visual-width', `${width}px`);
    document.documentElement.style.setProperty('--visual-height', `${height}px`);
    document.body.style.setProperty('--app-width', `${width}px`);
    document.body.style.setProperty('--app-height', `${height}px`);
    document.body.classList.toggle('compact-browser-ui', isCompactBrowserViewport({ width, height, touch: game.touchMode }));
  };

  syncViewport();
  window.visualViewport?.addEventListener('resize', syncViewport, { passive: true });
  window.visualViewport?.addEventListener('scroll', syncViewport, { passive: true });
  window.addEventListener('resize', syncViewport, { passive: true });
  window.addEventListener('orientationchange', () => window.setTimeout(syncViewport, 80), { passive: true });

  if (location.hostname === '127.0.0.1' || location.hostname === 'localhost' || new URLSearchParams(location.search).has('qa')) {
    window.__ONE_BULLET_ARENA__ = game;
  }
}
