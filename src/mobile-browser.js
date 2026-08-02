import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from './content.js';
import { coreById } from './progression-data.js';
import {
  difficultyById,
  normalizeMission,
  regionById,
  totalWavesForMission,
} from './regions-data.js';

export const MOBILE_SETTINGS_KEY = 'one-bullet-arena-mobile-v1';

const FONT = 'Changa, "Segoe UI", Tahoma, sans-serif';
const NUMBER_FONT = 'Inter, "Segoe UI", Arial, sans-serif';
const CONTROL_SCALES = Object.freeze([0.86, 1, 1.14]);
const CONTROL_OPACITIES = Object.freeze([0.46, 0.64, 0.82]);
const QUALITY_MODES = Object.freeze(['auto', 'high', 'balanced', 'performance']);
const COLORS = Object.freeze({
  panel: 'rgba(7, 12, 27, 0.9)',
  panelStrong: 'rgba(9, 15, 33, 0.96)',
  border: '#35416e',
  cyan: '#62f3ff',
  yellow: '#ffe66d',
  red: '#ff526a',
  purple: '#b983ff',
  green: '#53f2a1',
  text: '#f8f9ff',
  muted: '#aeb7da',
});

export function normalizeMobileSettings(value = {}) {
  const source = value && typeof value === 'object' ? value : {};
  const controlScale = CONTROL_SCALES.includes(Number(source.controlScale)) ? Number(source.controlScale) : 1;
  const opacity = CONTROL_OPACITIES.includes(Number(source.opacity)) ? Number(source.opacity) : 0.64;
  const quality = QUALITY_MODES.includes(source.quality) ? source.quality : 'auto';
  return {
    controlScale,
    opacity,
    leftHanded: Boolean(source.leftHanded),
    aimRelease: source.aimRelease !== false,
    aimGuide: source.aimGuide !== false,
    haptics: source.haptics !== false,
    quality,
  };
}

export function detectMobileQuality({ deviceMemory = 4, hardwareConcurrency = 4, devicePixelRatio = 1 } = {}) {
  const memory = Number(deviceMemory) || 4;
  const cores = Number(hardwareConcurrency) || 4;
  const dpr = Number(devicePixelRatio) || 1;
  if (memory <= 2 || cores <= 4 || dpr >= 3.5) return 'performance';
  if (memory <= 4 || cores <= 6 || dpr >= 2.5) return 'balanced';
  return 'high';
}

export function computeViewportFit({ viewportWidth, viewportHeight, toolbarHeight = 0, safeTop = 0, safeRight = 0, safeBottom = 0, safeLeft = 0 } = {}) {
  const width = Math.max(1, Number(viewportWidth) || 1) - Math.max(0, safeLeft) - Math.max(0, safeRight);
  const height = Math.max(1, Number(viewportHeight) || 1) - Math.max(0, toolbarHeight) - Math.max(0, safeTop) - Math.max(0, safeBottom);
  const scale = Math.max(0.01, Math.min(width / WIDTH, height / HEIGHT));
  return {
    scale,
    width: Math.round(WIDTH * scale),
    height: Math.round(HEIGHT * scale),
  };
}

export function isMobileLandscape({ width = 0, height = 0, coarse = false } = {}) {
  return Boolean(coarse) && Number(width) > Number(height);
}

function loadSettings() {
  if (typeof localStorage === 'undefined') return normalizeMobileSettings();
  try {
    return normalizeMobileSettings(JSON.parse(localStorage.getItem(MOBILE_SETTINGS_KEY) || 'null'));
  } catch {
    return normalizeMobileSettings();
  }
}

function saveSettings(settings) {
  const normalized = normalizeMobileSettings(settings);
  if (typeof localStorage !== 'undefined') localStorage.setItem(MOBILE_SETTINGS_KEY, JSON.stringify(normalized));
  return normalized;
}

function qualityFor(settings) {
  if (settings.quality !== 'auto') return settings.quality;
  return detectMobileQuality({
    deviceMemory: navigator.deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency,
    devicePixelRatio: window.devicePixelRatio,
  });
}

function roundedRect(ctx, x, y, width, height, radius = 14) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function panel(ctx, x, y, width, height, accent = COLORS.border, fill = COLORS.panel, glow = 5) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.shadowColor = accent;
  ctx.shadowBlur = glow;
  roundedRect(ctx, x, y, width, height, 14);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();
  ctx.restore();
}

function label(ctx, text, x, y, size, color = COLORS.text, weight = 700, align = 'center') {
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillText(String(text), x, y);
  ctx.restore();
}

function number(ctx, value, x, y, size, color = COLORS.text, align = 'center') {
  ctx.save();
  ctx.direction = 'ltr';
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.font = `800 ${size}px ${NUMBER_FONT}`;
  ctx.fillText(String(value), x, y);
  ctx.restore();
}

function pointInCircle(point, circle) {
  return Math.hypot(point.x - circle.x, point.y - circle.y) <= circle.radius;
}

function mobileLayout(game) {
  const settings = game.mobileSettings || normalizeMobileSettings();
  const scale = settings.controlScale;
  const movementX = settings.leftHanded ? WIDTH - 118 : 118;
  const actionX = settings.leftHanded ? 112 : WIDTH - 112;
  return {
    movement: { x: movementX, y: HEIGHT - 112, radius: 64 * scale },
    dash: { x: actionX, y: HEIGHT - 108, radius: 50 * scale },
    recall: { x: settings.leftHanded ? 228 : WIDTH - 228, y: HEIGHT - 84, radius: 42 * scale },
    pause: { x: settings.leftHanded ? 54 : WIDTH - 54, y: 142, radius: 31 * scale },
    build: { x: settings.leftHanded ? 54 : WIDTH - 54, y: 210, radius: 31 * scale },
  };
}

function vibrate(game, pattern) {
  if (!game.mobileSettings?.haptics || typeof navigator.vibrate !== 'function') return;
  navigator.vibrate(pattern);
}

function canvasPoint(game, event) {
  const rect = game.canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / Math.max(1, rect.width)) * WIDTH,
    y: ((event.clientY - rect.top) / Math.max(1, rect.height)) * HEIGHT,
  };
}

function clearPointerRole(game, pointerId) {
  const role = game.mobilePointers?.get(pointerId);
  if (!role) return null;
  game.mobilePointers.delete(pointerId);
  if (role.role === 'move' && game.touchMove?.id === pointerId) game.touchMove = null;
  if (role.role === 'aim' && game.mobileAim?.id === pointerId) game.mobileAim = null;
  return role;
}

function installTouchCapture(game) {
  if (game.__mobileTouchCaptureInstalled) return;
  game.__mobileTouchCaptureInstalled = true;
  game.mobilePointers = new Map();

  const stopTouch = (event) => {
    if (event.pointerType !== 'touch') return false;
    event.preventDefault();
    event.stopImmediatePropagation();
    game.touchMode = true;
    return true;
  };

  game.canvas.addEventListener('pointerdown', (event) => {
    if (!stopTouch(event)) return;
    const point = canvasPoint(game, event);
    game.pointer.x = point.x;
    game.pointer.y = point.y;
    game.pointer.down = true;
    game.audio.ensure();
    game.canvas.setPointerCapture?.(event.pointerId);

    if (game.state !== 'playing') {
      game.handleUiClick(point.x, point.y);
      return;
    }

    const layout = mobileLayout(game);
    if (pointInCircle(point, layout.pause)) {
      game.pauseGame();
      vibrate(game, 18);
      return;
    }
    if (pointInCircle(point, layout.build)) {
      game.audio.play('click');
      game.buildReturnState = 'playing';
      game.state = 'buildInspect';
      vibrate(game, 18);
      return;
    }
    if (pointInCircle(point, layout.dash)) {
      game.dashRequested = true;
      vibrate(game, 22);
      return;
    }
    if (pointInCircle(point, layout.recall)) {
      game.recallBullet();
      vibrate(game, [12, 18, 12]);
      return;
    }

    const movementSide = game.mobileSettings.leftHanded ? point.x > WIDTH * 0.54 : point.x < WIDTH * 0.46;
    if (movementSide && point.y > HEIGHT * 0.28) {
      const role = { role: 'move', id: event.pointerId, originX: point.x, originY: point.y, x: point.x, y: point.y };
      game.mobilePointers.set(event.pointerId, role);
      game.touchMove = role;
      return;
    }

    const aim = { role: 'aim', id: event.pointerId, x: point.x, y: point.y };
    game.mobilePointers.set(event.pointerId, aim);
    game.mobileAim = aim;
    if (!game.mobileSettings.aimRelease) {
      game.fireBullet();
      vibrate(game, 10);
    }
  }, { capture: true, passive: false });

  game.canvas.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'touch') return;
    const role = game.mobilePointers.get(event.pointerId);
    if (!role) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const point = canvasPoint(game, event);
    role.x = point.x;
    role.y = point.y;
    if (role.role === 'move') {
      game.touchMove = role;
    } else {
      game.pointer.x = point.x;
      game.pointer.y = point.y;
      game.mobileAim = role;
    }
  }, { capture: true, passive: false });

  const release = (event) => {
    if (event.pointerType !== 'touch') return;
    const role = game.mobilePointers.get(event.pointerId);
    if (!role) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const point = canvasPoint(game, event);
    const released = clearPointerRole(game, event.pointerId);
    if (released?.role === 'aim' && game.state === 'playing' && game.mobileSettings.aimRelease) {
      game.pointer.x = point.x;
      game.pointer.y = point.y;
      game.fireBullet();
      vibrate(game, 10);
    }
    game.pointer.down = game.mobilePointers.size > 0;
  };
  game.canvas.addEventListener('pointerup', release, { capture: true, passive: false });
  game.canvas.addEventListener('pointercancel', release, { capture: true, passive: false });
}

function activeCore(game) {
  return coreById(game.activeCoreId || game.progressionSave?.selectedCore || 'standard') || coreById('standard');
}

function drawMobileHud(game) {
  const ctx = game.ctx;
  const core = activeCore(game);
  const mission = normalizeMission(game.activeMission || game.selectedMission);
  const totalWaves = totalWavesForMission(mission);
  const region = regionById(game.arena?.regionId || mission.regionId);
  const difficulty = difficultyById(mission.difficultyId);

  panel(ctx, 16, 14, 236, 62, game.bullet.held ? COLORS.yellow : COLORS.cyan, COLORS.panel, 4);
  label(ctx, game.bullet.held ? 'الطلقة جاهزة' : game.bullet.recalling ? 'الطلقة عائدة' : 'استعد الطلقة', 232, 40, 15, game.bullet.held ? COLORS.yellow : COLORS.text, 800, 'right');
  label(ctx, game.player.dashCooldown <= 0 ? 'الاندفاع جاهز' : `${game.player.dashCooldown.toFixed(1)} ث`, 232, 63, 11, COLORS.muted, 600, 'right');
  if (!game.bullet.held) number(ctx, Math.max(0, game.bullet.bouncesRemaining), 42, 62, 13, COLORS.cyan, 'left');

  panel(ctx, WIDTH - 266, 14, 250, 62, region.color, COLORS.panel, 4);
  label(ctx, `${region.icon} ${region.shortName} • ${difficulty.name}`, WIDTH - 34, 38, 12, region.color, 800, 'right');
  number(ctx, `${game.wave} / ${totalWaves}`, WIDTH - 226, 62, 18, COLORS.cyan, 'left');
  number(ctx, game.score || 0, WIDTH - 34, 63, 13, COLORS.muted, 'right');
  for (let index = 0; index < game.player.maxHealth; index += 1) {
    ctx.fillStyle = index < game.player.health ? COLORS.red : '#252b43';
    ctx.beginPath();
    ctx.arc(WIDTH - 232 + index * 23, 37, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  panel(ctx, WIDTH / 2 - 102, 14, 204, 38, core.color, COLORS.panel, 4);
  label(ctx, `${core.icon} ${core.shortName}`, WIDTH / 2, 39, 13, core.color, 800);
  if (game.combo > 1 && game.comboTimer > 0) label(ctx, `×${game.combo} كومبو`, WIDTH / 2, 72, 14, COLORS.yellow, 900);

  const challengeFailed = game.challengeFeedbackState === 'failed';
  const challengeCompleted = game.challengeFeedbackState === 'completed';
  const challengeColor = challengeFailed ? COLORS.red : challengeCompleted ? COLORS.green : COLORS.purple;
  const challengeText = challengeFailed
    ? 'فشل تحدي الجولة'
    : challengeCompleted
      ? 'اكتمل تحدي الجولة'
      : game.runChallenge?.name || 'تحدي الجولة';
  panel(ctx, WIDTH / 2 - 190, HEIGHT - 42, 380, 30, challengeColor, 'rgba(6, 10, 23, 0.82)', 3);
  label(ctx, challengeText, WIDTH / 2, HEIGHT - 22, 10, challengeColor, 700);

  if (game.boss) game.drawBossHealthBar();
}

function drawControlCircle(ctx, control, text, accent, opacity, ready = true) {
  ctx.save();
  ctx.globalAlpha = ready ? opacity : opacity * 0.48;
  ctx.fillStyle = 'rgba(7, 12, 27, 0.52)';
  ctx.strokeStyle = ready ? accent : COLORS.muted;
  ctx.lineWidth = 4;
  ctx.shadowColor = ready ? accent : 'transparent';
  ctx.shadowBlur = ready ? 12 : 0;
  ctx.beginPath();
  ctx.arc(control.x, control.y, control.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  label(ctx, text, control.x, control.y + 5, Math.max(11, control.radius * 0.31), ready ? COLORS.text : COLORS.muted, 800);
  ctx.restore();
}

function drawMobileControls(game) {
  const ctx = game.ctx;
  const layout = mobileLayout(game);
  const opacity = game.mobileSettings.opacity;
  const origin = game.touchMove || { originX: layout.movement.x, originY: layout.movement.y, x: layout.movement.x, y: layout.movement.y };
  const maxKnob = layout.movement.radius * 0.72;
  const dx = origin.x - origin.originX;
  const dy = origin.y - origin.originY;
  const distance = Math.hypot(dx, dy) || 1;
  const knobX = origin.originX + dx / distance * Math.min(distance, maxKnob);
  const knobY = origin.originY + dy / distance * Math.min(distance, maxKnob);

  ctx.save();
  ctx.globalAlpha = opacity * 0.76;
  ctx.strokeStyle = COLORS.cyan;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(origin.originX, origin.originY, layout.movement.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(98, 243, 255, 0.38)';
  ctx.beginPath();
  ctx.arc(knobX, knobY, layout.movement.radius * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawControlCircle(ctx, layout.dash, 'اندفاع', COLORS.yellow, opacity, game.player.dashCooldown <= 0);
  drawControlCircle(ctx, layout.recall, game.bullet.recallCooldown > 0 ? game.bullet.recallCooldown.toFixed(1) : 'استدعاء', COLORS.cyan, opacity, !game.bullet.held && game.bullet.recallCooldown <= 0);
  drawControlCircle(ctx, layout.pause, 'II', COLORS.text, opacity * 0.85, true);
  drawControlCircle(ctx, layout.build, 'B', COLORS.purple, opacity * 0.85, true);

  if (game.mobileSettings.aimGuide && game.mobileAim && game.bullet.held) {
    ctx.save();
    ctx.globalAlpha = 0.62;
    ctx.strokeStyle = COLORS.yellow;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(game.player.x, game.player.y);
    ctx.lineTo(game.mobileAim.x, game.mobileAim.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(game.mobileAim.x, game.mobileAim.y, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function cycleValue(list, value) {
  const index = Math.max(0, list.indexOf(value));
  return list[(index + 1) % list.length];
}

function qualityName(value) {
  return ({ auto: 'تلقائي', high: 'عالية', balanced: 'متوازنة', performance: 'أداء' })[value] || 'تلقائي';
}

function drawMobileSettings(game) {
  const ctx = game.ctx;
  ctx.fillStyle = 'rgba(2, 4, 12, 0.92)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  panel(ctx, 270, 65, 740, 590, COLORS.cyan, COLORS.panelStrong, 12);
  label(ctx, 'تحكم الهاتف', WIDTH / 2, 116, 38, COLORS.text, 900);
  label(ctx, 'اضبط التخطيط والأداء بدون التأثير على الحفظ أو تقدمك.', WIDTH / 2, 148, 13, COLORS.muted, 600);

  const settings = game.mobileSettings;
  const rows = [
    [`حجم التحكم: ${settings.controlScale < 1 ? 'صغير' : settings.controlScale > 1 ? 'كبير' : 'متوسط'}`, () => { settings.controlScale = cycleValue(CONTROL_SCALES, settings.controlScale); }],
    [`شفافية الأزرار: ${Math.round(settings.opacity * 100)}%`, () => { settings.opacity = cycleValue(CONTROL_OPACITIES, settings.opacity); }],
    [`تخطيط اليد: ${settings.leftHanded ? 'أعسر' : 'أيمن'}`, () => { settings.leftHanded = !settings.leftHanded; }],
    [`الإطلاق: ${settings.aimRelease ? 'عند رفع الإصبع' : 'عند اللمس'}`, () => { settings.aimRelease = !settings.aimRelease; }],
    [`خط التصويب: ${settings.aimGuide ? 'ظاهر' : 'مخفي'}`, () => { settings.aimGuide = !settings.aimGuide; }],
    [`جودة المؤثرات: ${qualityName(settings.quality)}`, () => { settings.quality = cycleValue(QUALITY_MODES, settings.quality); }],
    [`اهتزاز الهاتف: ${settings.haptics ? 'مفعل' : 'متوقف'}`, () => { settings.haptics = !settings.haptics; }],
  ];

  rows.forEach(([text, action], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 320 + column * 330;
    const y = 190 + row * 86;
    game.drawButton(text, x, y, 310, 54, () => {
      game.audio.play('click');
      action();
      game.mobileSettings = saveSettings(settings);
      game.mobileQuality = qualityFor(game.mobileSettings);
      document.body.dataset.quality = game.mobileQuality;
    }, index === 0);
  });
  game.drawButton('العودة', 475, 565, 330, 54, () => {
    game.audio.play('click');
    game.state = game.mobileSettingsReturnState || 'paused';
  }, true);
}

function drawMobilePause(game) {
  const ctx = game.ctx;
  ctx.fillStyle = 'rgba(2, 4, 12, 0.84)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  panel(ctx, WIDTH / 2 - 245, 95, 490, 530, COLORS.cyan, COLORS.panelStrong, 12);
  label(ctx, 'اللعبة متوقفة', WIDTH / 2, 155, 36, COLORS.text, 900);
  game.drawButton('متابعة اللعب', WIDTH / 2 - 185, 205, 370, 52, () => game.resumeGame(), true);
  game.drawButton('فحص البناء', WIDTH / 2 - 185, 276, 370, 52, () => {
    game.audio.play('click');
    game.buildReturnState = 'paused';
    game.state = 'buildInspect';
  });
  game.drawButton('تحكم الهاتف', WIDTH / 2 - 185, 347, 370, 52, () => {
    game.audio.play('click');
    game.mobileSettingsReturnState = 'paused';
    game.state = 'mobileSettings';
  });
  game.drawButton('الإعدادات العامة', WIDTH / 2 - 185, 418, 370, 52, () => game.openSettings('paused'));
  game.drawButton('القائمة الرئيسية', WIDTH / 2 - 185, 489, 370, 52, () => {
    game.audio.play('click');
    game.goToMenu();
  });
  label(ctx, `وضع الأداء الحالي: ${qualityName(game.mobileQuality)}`, WIDTH / 2, 585, 12, COLORS.muted, 600);
}

export function installMobileBrowser(GameClass) {
  const prototype = GameClass.prototype;
  if (prototype.__mobileBrowserInstalled) return;
  prototype.__mobileBrowserInstalled = true;

  const originalBindInput = prototype.bindInput;
  prototype.bindInput = function bindMobileBrowserInput(...args) {
    this.mobileSettings = loadSettings();
    this.mobileQuality = qualityFor(this.mobileSettings);
    installTouchCapture(this);
    return originalBindInput.apply(this, args);
  };

  const originalResetRun = prototype.resetRun;
  prototype.resetRun = function resetMobilePointers(...args) {
    const result = originalResetRun.apply(this, args);
    this.mobilePointers?.clear();
    this.mobileAim = null;
    this.touchMove = null;
    return result;
  };

  const originalCreateBurst = prototype.createBurst;
  prototype.createBurst = function createBurstForMobile(x, y, color, count, speed) {
    const factor = this.mobileQuality === 'performance' ? 0.42 : this.mobileQuality === 'balanced' ? 0.7 : 1;
    return originalCreateBurst.call(this, x, y, color, Math.max(2, Math.round(count * factor)), speed);
  };

  const originalHud = prototype.drawHud;
  prototype.drawHud = function drawResponsiveHud(...args) {
    if (this.touchMode) return drawMobileHud(this);
    return originalHud.apply(this, args);
  };

  prototype.drawTouchControls = function drawProfessionalTouchControls() {
    drawMobileControls(this);
  };

  const originalPause = prototype.drawPauseMenu;
  prototype.drawPauseMenu = function drawResponsivePause(...args) {
    if (this.touchMode) return drawMobilePause(this);
    return originalPause.apply(this, args);
  };

  const originalDraw = prototype.draw;
  prototype.draw = function drawMobileCustomStates(...args) {
    document.body.dataset.gameState = this.state;
    if (this.state === 'mobileSettings') {
      this.uiRegions = [];
      this.ctx.save();
      this.drawArena();
      drawMobileSettings(this);
      this.ctx.restore();
      return undefined;
    }
    return originalDraw.apply(this, args);
  };
}

export function attachMobileBrowser(game) {
  const body = document.body;
  const stage = document.querySelector('#game-stage');
  const coarseQuery = window.matchMedia?.('(pointer: coarse)');
  const updateViewport = () => {
    const viewport = window.visualViewport;
    const width = viewport?.width || window.innerWidth;
    const height = viewport?.height || window.innerHeight;
    const coarse = coarseQuery?.matches || game.touchMode;
    body.classList.toggle('mobile-runtime', Boolean(coarse));
    body.classList.toggle('mobile-portrait', Boolean(coarse) && height >= width);
    body.style.setProperty('--app-height', `${Math.round(height)}px`);
    body.style.setProperty('--app-width', `${Math.round(width)}px`);
    body.dataset.quality = game.mobileQuality;
  };

  updateViewport();
  window.visualViewport?.addEventListener('resize', updateViewport, { passive: true });
  window.visualViewport?.addEventListener('scroll', updateViewport, { passive: true });
  window.addEventListener('resize', updateViewport, { passive: true });
  window.addEventListener('orientationchange', () => window.setTimeout(updateViewport, 120), { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.state === 'playing') game.pauseGame();
  });
  window.addEventListener('pagehide', () => {
    if (game.state === 'playing') game.pauseGame();
  });
  document.addEventListener('touchmove', (event) => {
    if (stage?.contains(event.target)) event.preventDefault();
  }, { passive: false });

  document.addEventListener('fullscreenchange', () => {
    updateViewport();
    if (document.fullscreenElement && screen.orientation?.lock) {
      screen.orientation.lock('landscape').catch(() => undefined);
    }
  });

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  }
}
