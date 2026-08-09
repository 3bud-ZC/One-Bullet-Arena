import { GAME_HEIGHT, GAME_WIDTH } from '../game-data.js';

export const LOGICAL_GAME_WIDTH = GAME_WIDTH;
export const LOGICAL_GAME_HEIGHT = GAME_HEIGHT;
export const DEFAULT_MAX_DPR = 2.5;
export const DEFAULT_MAX_BACKING_PIXELS = 8_500_000;

function finitePositive(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function almostEqual(a, b, epsilon = 0.01) {
  return Math.abs(a - b) <= epsilon;
}

export function computeContainedViewport(
  availableWidth,
  availableHeight,
  logicalWidth = LOGICAL_GAME_WIDTH,
  logicalHeight = LOGICAL_GAME_HEIGHT,
) {
  const width = finitePositive(availableWidth, logicalWidth);
  const height = finitePositive(availableHeight, logicalHeight);
  const scale = Math.max(0.01, Math.min(width / logicalWidth, height / logicalHeight));
  return {
    scale,
    width: logicalWidth * scale,
    height: logicalHeight * scale,
  };
}

export function computeEffectiveDpr(
  requestedDpr,
  displayWidth,
  displayHeight,
  maxDpr = DEFAULT_MAX_DPR,
  maxBackingPixels = DEFAULT_MAX_BACKING_PIXELS,
) {
  const requested = Math.max(1, finitePositive(requestedDpr, 1));
  const capped = Math.min(requested, finitePositive(maxDpr, DEFAULT_MAX_DPR));
  const displayPixels = Math.max(1, displayWidth * displayHeight);
  const pixelBudgetDpr = Math.sqrt(finitePositive(maxBackingPixels, DEFAULT_MAX_BACKING_PIXELS) / displayPixels);
  return Math.max(1, Math.min(capped, pixelBudgetDpr));
}

export function mapClientPointToLogical(rect, clientX, clientY) {
  const width = finitePositive(rect?.width, LOGICAL_GAME_WIDTH);
  const height = finitePositive(rect?.height, LOGICAL_GAME_HEIGHT);
  return {
    x: ((Number(clientX) - Number(rect?.left || 0)) / width) * LOGICAL_GAME_WIDTH,
    y: ((Number(clientY) - Number(rect?.top || 0)) / height) * LOGICAL_GAME_HEIGHT,
  };
}

export class CanvasViewport {
  constructor(canvas, options = {}) {
    if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError('CanvasViewport requires a canvas.');
    this.canvas = canvas;
    this.container = options.container || canvas.parentElement;
    this.logicalWidth = options.logicalWidth || LOGICAL_GAME_WIDTH;
    this.logicalHeight = options.logicalHeight || LOGICAL_GAME_HEIGHT;
    this.maxDpr = options.maxDpr || DEFAULT_MAX_DPR;
    this.maxBackingPixels = options.maxBackingPixels || DEFAULT_MAX_BACKING_PIXELS;
    this.displayWidth = this.logicalWidth;
    this.displayHeight = this.logicalHeight;
    this.displayScale = 1;
    this.dpr = 1;
    this.backingWidth = this.logicalWidth;
    this.backingHeight = this.logicalHeight;
    this.lastDevicePixelRatio = finitePositive(globalThis.devicePixelRatio, 1);
    this.resizeScheduled = false;

    this.onResize = () => this.scheduleResize();
    this.resizeObserver = typeof ResizeObserver === 'function' && this.container
      ? new ResizeObserver(this.onResize)
      : null;
    this.resizeObserver?.observe(this.container);
    globalThis.addEventListener?.('resize', this.onResize, { passive: true });
    globalThis.addEventListener?.('orientationchange', this.onResize, { passive: true });
    globalThis.visualViewport?.addEventListener?.('resize', this.onResize, { passive: true });
    document.addEventListener?.('fullscreenchange', this.onResize);

    this.resize(true);
  }

  setQualityProfile(profile = {}, { resize = true } = {}) {
    const nextMaxDpr = finitePositive(profile.maxDpr, this.maxDpr);
    const nextPixelBudget = finitePositive(profile.maxBackingPixels, this.maxBackingPixels);
    const changed = !almostEqual(nextMaxDpr, this.maxDpr, 0.001)
      || Math.round(nextPixelBudget) !== Math.round(this.maxBackingPixels);
    this.maxDpr = nextMaxDpr;
    this.maxBackingPixels = nextPixelBudget;
    // A profile can be recorded during combat with resize:false, then applied
    // later in a safe state. Force the backing-store reconciliation whenever
    // resize:true is requested, even if the numeric profile was already staged.
    if (resize) this.resize(true);
    return changed;
  }

  scheduleResize() {
    if (this.resizeScheduled) return;
    this.resizeScheduled = true;
    requestAnimationFrame(() => {
      this.resizeScheduled = false;
      this.resize();
    });
  }

  resize(force = false) {
    const bounds = this.container?.getBoundingClientRect?.();
    const availableWidth = finitePositive(bounds?.width, globalThis.innerWidth || this.logicalWidth);
    const availableHeight = finitePositive(bounds?.height, globalThis.innerHeight || this.logicalHeight);
    const contained = computeContainedViewport(
      availableWidth,
      availableHeight,
      this.logicalWidth,
      this.logicalHeight,
    );
    const deviceDpr = finitePositive(globalThis.devicePixelRatio, 1);
    const dpr = computeEffectiveDpr(
      deviceDpr,
      contained.width,
      contained.height,
      this.maxDpr,
      this.maxBackingPixels,
    );
    const backingWidth = Math.max(1, Math.round(contained.width * dpr));
    const backingHeight = Math.max(1, Math.round(contained.height * dpr));

    const sizeChanged = force
      || !almostEqual(contained.width, this.displayWidth)
      || !almostEqual(contained.height, this.displayHeight)
      || backingWidth !== this.backingWidth
      || backingHeight !== this.backingHeight
      || !almostEqual(dpr, this.dpr, 0.001);

    this.displayWidth = contained.width;
    this.displayHeight = contained.height;
    this.displayScale = contained.scale;
    this.dpr = dpr;
    this.backingWidth = backingWidth;
    this.backingHeight = backingHeight;
    this.lastDevicePixelRatio = deviceDpr;

    if (!sizeChanged) return false;

    this.canvas.style.width = `${contained.width}px`;
    this.canvas.style.height = `${contained.height}px`;
    if (this.canvas.width !== backingWidth) this.canvas.width = backingWidth;
    if (this.canvas.height !== backingHeight) this.canvas.height = backingHeight;
    this.canvas.dataset.logicalWidth = String(this.logicalWidth);
    this.canvas.dataset.logicalHeight = String(this.logicalHeight);
    this.canvas.dataset.displayScale = contained.scale.toFixed(5);
    this.canvas.dataset.renderDpr = dpr.toFixed(3);
    this.canvas.dataset.backingWidth = String(backingWidth);
    this.canvas.dataset.backingHeight = String(backingHeight);

    const shell = this.container?.closest?.('.game-frame') || document.documentElement;
    shell?.style?.setProperty('--game-display-width', `${contained.width}px`);
    shell?.style?.setProperty('--game-display-height', `${contained.height}px`);
    shell?.style?.setProperty('--game-display-scale', contained.scale.toFixed(5));
    shell?.style?.setProperty('--game-render-dpr', dpr.toFixed(3));
    return true;
  }

  beginFrame(ctx) {
    const deviceDpr = finitePositive(globalThis.devicePixelRatio, 1);
    if (!almostEqual(deviceDpr, this.lastDevicePixelRatio, 0.001)) this.resize(true);

    const scale = this.displayScale * this.dpr;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
  }

  clientToLogical(clientX, clientY) {
    return mapClientPointToLogical(this.canvas.getBoundingClientRect(), clientX, clientY);
  }

  getSnapshot() {
    return {
      logicalWidth: this.logicalWidth,
      logicalHeight: this.logicalHeight,
      displayWidth: Number(this.displayWidth.toFixed(2)),
      displayHeight: Number(this.displayHeight.toFixed(2)),
      displayScale: Number(this.displayScale.toFixed(5)),
      devicePixelRatio: Number(finitePositive(globalThis.devicePixelRatio, 1).toFixed(3)),
      effectiveDpr: Number(this.dpr.toFixed(3)),
      backingWidth: this.backingWidth,
      backingHeight: this.backingHeight,
      aspectRatio: Number((this.displayWidth / this.displayHeight).toFixed(6)),
      maxDpr: this.maxDpr,
      maxBackingPixels: this.maxBackingPixels,
    };
  }

  destroy() {
    this.resizeObserver?.disconnect();
    globalThis.removeEventListener?.('resize', this.onResize);
    globalThis.removeEventListener?.('orientationchange', this.onResize);
    globalThis.visualViewport?.removeEventListener?.('resize', this.onResize);
    document.removeEventListener?.('fullscreenchange', this.onResize);
  }
}
