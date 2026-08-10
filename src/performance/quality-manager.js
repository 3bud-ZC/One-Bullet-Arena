export const QUALITY_STORAGE_KEY = 'one-bullet-render-quality';
export const QUALITY_MODES = Object.freeze(['AUTO', 'ULTRA', 'HIGH', 'BALANCED', 'PERFORMANCE']);
export const QUALITY_TIERS = Object.freeze(['ULTRA', 'HIGH', 'BALANCED', 'PERFORMANCE']);

export const QUALITY_PROFILES = Object.freeze({
  ULTRA: Object.freeze({
    id: 'ULTRA', maxDpr: 2.5, maxBackingPixels: 8_500_000, particleScale: 1, particleCap: 240,
    trailSamples: 18, ambientDetail: 1, shadowScale: 1, hudHz: 60, minimapHz: 30,
  }),
  HIGH: Object.freeze({
    id: 'HIGH', maxDpr: 2.15, maxBackingPixels: 7_200_000, particleScale: 0.86, particleCap: 200,
    trailSamples: 15, ambientDetail: 0.82, shadowScale: 0.82, hudHz: 60, minimapHz: 24,
  }),
  BALANCED: Object.freeze({
    id: 'BALANCED', maxDpr: 1.7, maxBackingPixels: 5_200_000, particleScale: 0.66, particleCap: 160,
    trailSamples: 12, ambientDetail: 0.58, shadowScale: 0.62, hudHz: 45, minimapHz: 20,
  }),
  PERFORMANCE: Object.freeze({
    id: 'PERFORMANCE', maxDpr: 1.3, maxBackingPixels: 3_300_000, particleScale: 0.44, particleCap: 110,
    trailSamples: 9, ambientDetail: 0.22, shadowScale: 0.35, hudHz: 30, minimapHz: 15,
  }),
});

function safeStorage(storage) {
  return storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function' ? storage : null;
}

export function normalizeQualityMode(value) {
  const mode = String(value || '').toUpperCase();
  return QUALITY_MODES.includes(mode) ? mode : 'AUTO';
}

export function loadQualityMode(storage = globalThis.localStorage) {
  try {
    return normalizeQualityMode(safeStorage(storage)?.getItem(QUALITY_STORAGE_KEY));
  } catch {
    return 'AUTO';
  }
}

export function saveQualityMode(mode, storage = globalThis.localStorage) {
  const normalized = normalizeQualityMode(mode);
  try {
    safeStorage(storage)?.setItem(QUALITY_STORAGE_KEY, normalized);
  } catch {
    // Rendering quality remains usable when storage is restricted.
  }
  return normalized;
}

export function initialAutoTier({ coarsePointer = false, viewportWidth = 1280 } = {}) {
  return coarsePointer || Number(viewportWidth) < 900 ? 'BALANCED' : 'HIGH';
}

export function autoQualityCeiling({ coarsePointer = false, viewportWidth = 1280 } = {}) {
  // Small/coarse-pointer devices default to a battery/thermal-aware ceiling in AUTO.
  // Manual modes can still explicitly request HIGH or ULTRA.
  return coarsePointer || Number(viewportWidth) < 900 ? 'BALANCED' : 'ULTRA';
}

export class AdaptiveQualityManager {
  constructor(options = {}) {
    this.storage = options.storage ?? globalThis.localStorage;
    this.mode = normalizeQualityMode(options.mode ?? loadQualityMode(this.storage));
    this.autoTier = initialAutoTier(options);
    this.autoCeiling = autoQualityCeiling(options);
    this.pressureSeconds = 0;
    this.headroomSeconds = 0;
    this.cooldownSeconds = 0;
    this.lastDecision = 'initial';
  }

  get tier() {
    return this.mode === 'AUTO' ? this.autoTier : this.mode;
  }

  get profile() {
    return QUALITY_PROFILES[this.tier] || QUALITY_PROFILES.HIGH;
  }

  setMode(mode, { persist = true } = {}) {
    this.mode = normalizeQualityMode(mode);
    if (persist) saveQualityMode(this.mode, this.storage);
    this.pressureSeconds = 0;
    this.headroomSeconds = 0;
    this.cooldownSeconds = 0;
    this.lastDecision = `manual:${this.mode}`;
    return this.profile;
  }

  setAutoTier(tier) {
    const normalized = QUALITY_TIERS.includes(tier) ? tier : this.autoTier;
    const ceilingIndex = QUALITY_TIERS.indexOf(this.autoCeiling);
    const requestedIndex = QUALITY_TIERS.indexOf(normalized);
    this.autoTier = QUALITY_TIERS[Math.max(ceilingIndex, requestedIndex)] || this.autoTier;
    return this.profile;
  }

  observe(metrics, elapsedSeconds = 0.5) {
    const dt = Math.max(0, Math.min(2, Number(elapsedSeconds) || 0));
    this.cooldownSeconds = Math.max(0, this.cooldownSeconds - dt);
    if (this.mode !== 'AUTO') return { changed: false, tier: this.tier, reason: 'manual' };

    const refreshHz = Math.max(30, Math.min(240, Number(metrics?.estimatedRefreshHz) || 60));
    // Rendering remains uncapped at native rAF cadence. AUTO uses a 120 Hz
    // performance target so high-refresh displays retain quality rather than
    // sacrificing clarity merely to chase the shortest possible v-sync interval.
    const performanceTargetHz = Math.min(120, refreshHz);
    const budgetMs = 1000 / performanceTargetHz;
    const p95 = Math.max(0, Number(metrics?.p95FrameMs) || 0);
    const average = Math.max(0, Number(metrics?.averageFrameMs) || 0);
    if (!p95 || !average) return { changed: false, tier: this.tier, reason: 'warming' };

    const pressured = p95 > budgetMs * 1.35 || average > budgetMs * 1.12;
    // rAF frame intervals include time spent waiting for v-sync. A stable 60 Hz
    // stream therefore sits near 16.67 ms even when rendering is inexpensive.
    // Treat stable near-budget pacing as safe headroom to try one richer tier;
    // any missed cadence then drives the normal pressure downgrade path.
    const comfortable = p95 <= budgetMs * 1.08 && average <= budgetMs * 1.03;

    this.pressureSeconds = pressured ? this.pressureSeconds + dt : Math.max(0, this.pressureSeconds - dt * 1.5);
    this.headroomSeconds = comfortable ? this.headroomSeconds + dt : Math.max(0, this.headroomSeconds - dt);

    if (this.cooldownSeconds > 0) return { changed: false, tier: this.tier, reason: 'cooldown' };

    const index = QUALITY_TIERS.indexOf(this.autoTier);
    if (this.pressureSeconds >= 2.5 && index < QUALITY_TIERS.length - 1) {
      this.autoTier = QUALITY_TIERS[index + 1];
      this.pressureSeconds = 0;
      this.headroomSeconds = 0;
      this.cooldownSeconds = 8;
      this.lastDecision = 'pressure';
      return { changed: true, tier: this.tier, reason: 'pressure' };
    }

    const ceilingIndex = QUALITY_TIERS.indexOf(this.autoCeiling);
    if (this.headroomSeconds >= 8 && index > ceilingIndex) {
      this.autoTier = QUALITY_TIERS[index - 1];
      this.pressureSeconds = 0;
      this.headroomSeconds = 0;
      this.cooldownSeconds = 10;
      this.lastDecision = 'headroom';
      return { changed: true, tier: this.tier, reason: 'headroom' };
    }

    return { changed: false, tier: this.tier, reason: pressured ? 'pressure-building' : comfortable ? 'headroom-building' : 'stable' };
  }

  snapshot() {
    return {
      mode: this.mode,
      tier: this.tier,
      autoCeiling: this.autoCeiling,
      profile: { ...this.profile },
      pressureSeconds: this.pressureSeconds,
      headroomSeconds: this.headroomSeconds,
      cooldownSeconds: this.cooldownSeconds,
      lastDecision: this.lastDecision,
    };
  }
}
