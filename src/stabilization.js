import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH, TOTAL_WAVES } from './content.js';

const FONT = 'Changa, "Segoe UI", Tahoma, sans-serif';
const NUMERIC_FONT = 'Inter, "Segoe UI", Arial, sans-serif';
const RICOCHET_DEBOUNCE_SECONDS = 0.045;

export function formatWaveProgress(current, total = TOTAL_WAVES) {
  const safeCurrent = Math.max(0, Math.trunc(Number(current) || 0));
  const safeTotal = Math.max(1, Math.trunc(Number(total) || 1));
  return `${safeCurrent} / ${safeTotal}`;
}

export function canRegisterRicochet({ now = 0, lastAt = Number.NEGATIVE_INFINITY, speed = 0, cooldown = RICOCHET_DEBOUNCE_SECONDS } = {}) {
  return Number(speed) > 1 && Number(now) - Number(lastAt) >= Number(cooldown);
}

function clampValue(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
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

function drawMobileRecall(game) {
  if (!game.touchMode || game.state !== 'playing' || game.stack('magnetic-recall') <= 0 || game.bullet.held) return;

  const ctx = game.ctx;
  const x = WIDTH - 245;
  const y = HEIGHT - 105;
  const radius = 49;
  const ready = game.bullet.recallCooldown <= 0;

  ctx.save();
  ctx.globalAlpha = ready ? 0.8 : 0.42;
  ctx.fillStyle = ready ? 'rgba(88, 166, 255, 0.20)' : 'rgba(87, 96, 128, 0.18)';
  ctx.strokeStyle = ready ? '#58a6ff' : '#576080';
  ctx.lineWidth = 4;
  ctx.shadowColor = ready ? '#58a6ff' : 'transparent';
  ctx.shadowBlur = ready ? 16 : 0;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillStyle = ready ? '#f8f9ff' : '#929bbf';
  ctx.font = `800 15px ${FONT}`;
  ctx.fillText(ready ? 'استدعاء' : `${game.bullet.recallCooldown.toFixed(1)} ث`, x, y + 5);
  ctx.restore();

  game.addUiRegion(x - radius, y - radius, radius * 2, radius * 2, () => game.recallBullet());
}

function redrawWaveProgress(game) {
  if (game.boss) return;

  const ctx = game.ctx;
  ctx.save();
  ctx.fillStyle = 'rgba(10, 14, 29, 0.97)';
  roundedRect(ctx, WIDTH - 326, 28, 284, 31, 9);
  ctx.fill();

  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#f8f9ff';
  ctx.font = `800 18px ${FONT}`;
  ctx.fillText('الموجة', WIDTH - 48, 50);

  ctx.direction = 'ltr';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#62f3ff';
  ctx.font = `800 18px ${NUMERIC_FONT}`;
  ctx.fillText(formatWaveProgress(game.wave, TOTAL_WAVES), WIDTH - 138, 50);
  ctx.restore();
}

export function installStabilization(GameClass) {
  const prototype = GameClass.prototype;
  if (prototype.__stabilizationInstalled) return;
  prototype.__stabilizationInstalled = true;

  const originalResetRun = prototype.resetRun;
  prototype.resetRun = function resetRunWithStableRicochets(...args) {
    const result = originalResetRun.apply(this, args);
    this.bullet.lastRicochetAt = Number.NEGATIVE_INFINITY;
    return result;
  };

  const originalFireBullet = prototype.fireBullet;
  prototype.fireBullet = function fireBulletWithRicochetReset(...args) {
    const wasHeld = this.bullet.held;
    const result = originalFireBullet.apply(this, args);
    if (wasHeld && !this.bullet.held) this.bullet.lastRicochetAt = Number.NEGATIVE_INFINITY;
    return result;
  };

  const originalOnRicochet = prototype.onRicochet;
  prototype.onRicochet = function registerDebouncedRicochet(...args) {
    const speed = Math.hypot(this.bullet.vx, this.bullet.vy);
    if (!canRegisterRicochet({ now: this.elapsed, lastAt: this.bullet.lastRicochetAt, speed })) return false;

    this.bullet.lastRicochetAt = this.elapsed;
    originalOnRicochet.apply(this, args);

    if (this.bullet.bouncesRemaining <= 0) {
      this.bullet.vx = 0;
      this.bullet.vy = 0;
    }
    return true;
  };

  prototype.handleOuterWallRicochet = function handleDirectedOuterWallRicochet() {
    let bounced = false;
    const radius = this.bullet.radius;

    if ((this.bullet.x <= radius && this.bullet.vx < 0) || (this.bullet.x >= WIDTH - radius && this.bullet.vx > 0)) {
      this.bullet.x = clampValue(this.bullet.x, radius, WIDTH - radius);
      this.bullet.vx *= -1;
      bounced = true;
    }
    if ((this.bullet.y <= radius && this.bullet.vy < 0) || (this.bullet.y >= HEIGHT - radius && this.bullet.vy > 0)) {
      this.bullet.y = clampValue(this.bullet.y, radius, HEIGHT - radius);
      this.bullet.vy *= -1;
      bounced = true;
    }
    if (bounced) this.onRicochet();
  };

  const polishedDrawHud = prototype.drawHud;
  prototype.drawHud = function drawHudWithStableProgress(...args) {
    polishedDrawHud.apply(this, args);
    redrawWaveProgress(this);
  };

  const polishedTouchControls = prototype.drawTouchControls;
  prototype.drawTouchControls = function drawTouchControlsWithRecall(...args) {
    polishedTouchControls.apply(this, args);
    drawMobileRecall(this);
  };
}

export function attachStabilizationControls(game) {
  const stage = document.querySelector('#game-stage');
  if (!stage) return;

  let hideTimer = null;
  const clearTimer = () => {
    if (hideTimer !== null) window.clearTimeout(hideTimer);
    hideTimer = null;
  };
  const scheduleHide = () => {
    clearTimer();
    stage.classList.remove('toolbar-hidden');
    if (!document.fullscreenElement) return;
    hideTimer = window.setTimeout(() => stage.classList.add('toolbar-hidden'), 2200);
  };

  const revealToolbar = (event) => {
    if (!document.fullscreenElement) return;
    if (event?.type === 'pointermove' && event.clientY > 110 && stage.classList.contains('toolbar-hidden')) return;
    scheduleHide();
  };

  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) scheduleHide();
    else {
      clearTimer();
      stage.classList.remove('toolbar-hidden');
    }
    game.canvas.focus();
  });
  stage.addEventListener('pointermove', revealToolbar, { passive: true });
  stage.addEventListener('pointerdown', scheduleHide, { passive: true });
  window.addEventListener('keydown', () => {
    if (document.fullscreenElement) scheduleHide();
  });
}
