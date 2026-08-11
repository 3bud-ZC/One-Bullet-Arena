import { i18n } from '../i18n.js';
import { AdaptiveQualityManager, QUALITY_MODES } from '../performance/quality-manager.js';
import { FixedStepClock, FramePacer, lerp } from '../performance/frame-pacer.js';
import { RELEASE_VERSION } from '../release.js';
import { CanvasViewport } from '../render/canvas-viewport.js';
import { DomUiController } from '../ui/dom-ui.js';
import { installDomPerformanceBridge } from '../ui/dom-performance-bridge.js';
import { OneBulletProductionArtRuntime } from './production-art-runtime.js';

export const GLOBAL_UI_RUNTIME_VERSION = '3.12.0-guardian-arena';
export const GLOBAL_UI_REVISION = 'smooth-fixedstep-presentation-v1';
export const UI_REPAIR_RUNTIME_VERSION = GLOBAL_UI_RUNTIME_VERSION;
export const UI_REPAIR_REVISION = GLOBAL_UI_REVISION;
export const FIXED_SIMULATION_HZ = 120;
export const MAX_CATCH_UP_STEPS = 8;

const MAX_IDLE_DT = 0.1;
const QUALITY_OBSERVE_INTERVAL_MS = 500;

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function normalize(x, y) {
  const length = Math.hypot(Number(x) || 0, Number(y) || 0);
  return length > 0.0001 ? { x: x / length, y: y / length } : { x: 0, y: 0 };
}

function setText(element, value) {
  if (!element) return;
  const text = String(value ?? '');
  if (element.textContent !== text) element.textContent = text;
}

export class OneBulletGlobalUiRuntime extends OneBulletProductionArtRuntime {
  constructor(canvas, liveRegion = null) {
    super(canvas, liveRegion);
    this.globalUiRuntimeVersion = GLOBAL_UI_RUNTIME_VERSION;
    this.globalUiRevision = GLOBAL_UI_REVISION;
    this.uiRepairRuntimeVersion = GLOBAL_UI_RUNTIME_VERSION;
    this.uiRepairRevision = GLOBAL_UI_REVISION;
    this.locale = i18n.locale;
    this.deleteConfirmUntil = 0;

    const renderLayer = document.querySelector('.game-render-layer') || canvas.parentElement;
    this.canvasViewport = new CanvasViewport(canvas, { container: renderLayer });

    const uiRoot = document.querySelector('#game-ui-layer');
    this.domUi = new DomUiController(this, uiRoot, this.canvasViewport);
    this.domPerformance = installDomPerformanceBridge(this.domUi);

    this.fixedClock = new FixedStepClock({
      simulationHz: FIXED_SIMULATION_HZ,
      maxCatchUpSteps: MAX_CATCH_UP_STEPS,
      maxFrameDelta: MAX_IDLE_DT,
    });
    this.framePacer = new FramePacer({ windowSize: 360, longFrameMs: 25 });
    this.qualityManager = new AdaptiveQualityManager({
      coarsePointer: this.touchMode,
      viewportWidth: globalThis.innerWidth || 1280,
    });
    this.activeQualityProfile = this.qualityManager.profile;
    this.pendingCanvasQuality = false;
    this.lastQualityObservationMs = 0;
    this.lastRenderTimestamp = null;
    this.lastDomSyncMs = 0;
    this.lastDomSignature = '';
    this.renderAlpha = 0;
    this.interpolationPrevious = null;
    this.interpolationCurrent = null;
    this.timingResetPending = true;
    this.inFixedUpdate = false;
    this.currentSimulationDt = 0;
    this.bulletTrailAccumulator = 0;
    this.nextDashParticleAt = 0;
    this.dashVisual = 0;
    this.recallVisual = 0;
    this.catchVisual = 0;
    this.ricochetVisual = 0;
    this.damageVisual = 0;
    this.lastRicochetPoint = null;
    this.lastBannerSignature = '';
    this.boundSmoothLoop = (time) => this.loop(time);

    this.installQualityControls();
    this.installCombatAnnouncer();
    this.applyQualityProfile(true);
    this.resetInterpolation();

    this.unsubscribeLocale = i18n.subscribe(() => {
      this.locale = i18n.locale;
      this.syncDocumentCopy();
      this.syncQualityControls();
      this.domUi?.sync(true);
      this.lastDomSignature = '';
      this.announce(i18n.t('status.languageChanged'));
    });

    this.syncDocumentCopy();

    this.onGlobalUiKeyDown = (event) => {
      const key = event.key.toLowerCase();
      if (key === 'l' && ['menu', 'paused'].includes(this.state)) {
        i18n.toggle();
        event.preventDefault();
      }
    };
    window.addEventListener('keydown', this.onGlobalUiKeyDown);

    this.onVisibilityChange = () => {
      this.timingResetPending = true;
      this.fixedClock?.reset();
      this.framePacer?.reset();
      this.lastRenderTimestamp = null;
    };
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  getSnapshot() {
    const viewport = this.canvasViewport?.getSnapshot?.() || null;
    const quality = this.qualityManager?.snapshot?.() || null;
    return {
      ...super.getSnapshot(),
      releaseVersion: RELEASE_VERSION,
      globalUiRuntimeVersion: GLOBAL_UI_RUNTIME_VERSION,
      globalUiRevision: GLOBAL_UI_REVISION,
      globalUiActive: true,
      localizationActive: true,
      locale: i18n.locale,
      direction: i18n.dir,
      presentationOwner: 'OneBulletGlobalUiRuntime',
      renderingArchitecture: 'canvas-world+dom-ui',
      domUiActive: true,
      hiDpiCanvasActive: true,
      aspectRatioContainActive: true,
      logicalCanvasWidth: 1280,
      logicalCanvasHeight: 720,
      canvasBackingWidth: viewport?.backingWidth || this.canvas.width,
      canvasBackingHeight: viewport?.backingHeight || this.canvas.height,
      canvasEffectiveDpr: viewport?.effectiveDpr || 1,
      canvasDisplayScale: viewport?.displayScale || 1,
      canvasViewport: viewport,
      uiDensity: 'hires-dom',
      visualRefinementActive: true,
      responsiveHudRefinement: true,
      semanticUpgradeDirection: 'current-to-new',
      bilingualUi: true,
      vectorIconSystem: true,
      browserTypography: true,
      hiDpiFeedbackTransformGuard: true,
      legacyUiOverridesBypassed: true,
      nativeRafRendering: true,
      artificialRenderFpsCap: false,
      fixedSimulationActive: true,
      fixedSimulationHz: FIXED_SIMULATION_HZ,
      fixedSimulationDt: 1 / FIXED_SIMULATION_HZ,
      maxCatchUpSteps: MAX_CATCH_UP_STEPS,
      interpolatedRendering: true,
      renderInterpolationAlpha: this.renderAlpha,
      adaptiveQualityActive: true,
      qualityMode: quality?.mode || 'AUTO',
      qualityTier: quality?.tier || 'HIGH',
      pendingCanvasQuality: this.pendingCanvasQuality,
      domUiDirtySync: true,
      minimapGeometryCaching: true,
      refreshIndependentTrails: true,
      refreshIndependentParticles: true,
      timeBasedCameraShake: true,
      domWaveBanner: true,
    };
  }

  getPerformanceSnapshot() {
    const timing = this.framePacer?.snapshot?.() || {};
    const viewport = this.canvasViewport?.getSnapshot?.() || {};
    const quality = this.qualityManager?.snapshot?.() || {};
    return {
      ...timing,
      simulationHz: FIXED_SIMULATION_HZ,
      fixedDtMs: 1000 / FIXED_SIMULATION_HZ,
      maxCatchUpSteps: MAX_CATCH_UP_STEPS,
      interpolationAlpha: this.renderAlpha,
      qualityMode: quality.mode,
      qualityTier: quality.tier,
      effectiveDpr: viewport.effectiveDpr,
      backingWidth: viewport.backingWidth,
      backingHeight: viewport.backingHeight,
      particleCount: this.particles?.length || 0,
      enemyCount: this.enemies?.length || 0,
      enemyShotCount: this.enemyShots?.length || 0,
      dom: this.domPerformance?.getSnapshot?.() || null,
      droppedSimulationSeconds: this.fixedClock?.droppedSeconds || 0,
    };
  }

  syncDocumentCopy() {
    const orientation = document.querySelector('.orientation-hint');
    const strong = orientation?.querySelector('strong');
    const span = orientation?.querySelector('span');
    const frame = document.querySelector('.game-frame');
    if (strong) strong.textContent = i18n.t('orientation.title');
    if (span) span.textContent = i18n.t('orientation.body');
    if (frame) frame.setAttribute('aria-label', i18n.t('brand.title'));
    this.canvas?.setAttribute('aria-label', i18n.t('brand.title'));
    document.title = i18n.t('brand.title');
  }

  installQualityControls() {
    const popover = this.domUi?.root?.querySelector?.('[data-settings-popover]');
    if (!popover || popover.querySelector('[data-quality-control]')) return;
    const block = document.createElement('div');
    block.className = 'settings-quality';
    block.dataset.qualityControl = '';
    block.innerHTML = `
      <div class="settings-quality__head">
        <span data-quality-label></span>
        <strong data-quality-current dir="ltr"></strong>
      </div>
      <div class="quality-segments" role="group"></div>
    `;
    const group = block.querySelector('.quality-segments');
    for (const mode of QUALITY_MODES) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'quality-segment';
      button.dataset.qualityMode = mode;
      button.dataset.interactive = '';
      button.textContent = mode;
      group?.append(button);
    }
    popover.append(block);
    this.qualityControl = block;
    this.onQualityClick = (event) => {
      const button = event.target.closest?.('[data-quality-mode]');
      if (!(button instanceof HTMLElement)) return;
      event.preventDefault();
      event.stopPropagation();
      this.setRenderingQuality(button.dataset.qualityMode);
    };
    block.addEventListener('click', this.onQualityClick);
    this.syncQualityControls();
  }

  syncQualityControls() {
    if (!this.qualityControl || !this.qualityManager) return;
    const quality = this.qualityManager.snapshot();
    const label = this.qualityControl.querySelector('[data-quality-label]');
    const current = this.qualityControl.querySelector('[data-quality-current]');
    setText(label, i18n.locale === 'ar' ? 'جودة العرض' : 'Render quality');
    setText(current, quality.mode === 'AUTO' ? `AUTO · ${quality.tier}` : quality.tier);
    for (const button of this.qualityControl.querySelectorAll('[data-quality-mode]')) {
      const active = button.dataset.qualityMode === quality.mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
  }

  setRenderingQuality(mode) {
    this.qualityManager?.setMode(mode);
    this.applyQualityProfile(true);
    this.syncQualityControls();
    this.domUi?.syncSettings?.();
    this.announce(i18n.locale === 'ar' ? `جودة العرض ${this.qualityManager.tier}` : `Render quality ${this.qualityManager.tier}`);
    return this.qualityManager?.tier;
  }

  applyQualityProfile(forceCanvas = false) {
    if (!this.qualityManager) return;
    const profile = this.qualityManager.profile;
    this.activeQualityProfile = profile;
    const safeToResize = forceCanvas || this.state !== 'playing' || (this.enemies?.length || 0) === 0;
    if (safeToResize) {
      this.canvasViewport?.setQualityProfile?.(profile, { resize: true });
      this.pendingCanvasQuality = false;
    } else {
      this.canvasViewport?.setQualityProfile?.(profile, { resize: false });
      this.pendingCanvasQuality = true;
    }
    const root = this.domUi?.root;
    if (root) {
      root.dataset.qualityTier = profile.id.toLowerCase();
      root.dataset.qualityMode = this.qualityManager.mode.toLowerCase();
    }
    this.syncQualityControls();
  }

  maybeApplyPendingCanvasQuality() {
    if (!this.pendingCanvasQuality) return;
    if (this.state === 'playing' && (this.enemies?.length || 0) > 0) return;
    this.canvasViewport?.setQualityProfile?.(this.activeQualityProfile, { resize: true });
    this.pendingCanvasQuality = false;
  }

  installCombatAnnouncer() {
    const root = this.domUi?.root;
    if (!root || root.querySelector('[data-combat-announcer]')) return;
    const element = document.createElement('div');
    element.className = 'combat-announcer';
    element.dataset.combatAnnouncer = '';
    element.hidden = true;
    element.setAttribute('aria-hidden', 'true');
    element.innerHTML = `
      <span class="combat-announcer__kicker" data-combat-kicker></span>
      <strong class="combat-announcer__title" data-combat-title></strong>
      <span class="combat-announcer__meta" data-combat-meta></span>
    `;
    root.append(element);
    this.combatAnnouncer = element;
  }

  syncCombatAnnouncer() {
    const element = this.combatAnnouncer;
    if (!element) return;
    if (this.state !== 'playing' || !this.banner) {
      if (!element.hidden) element.hidden = true;
      this.lastBannerSignature = '';
      return;
    }

    const signature = `${this.wave}:${this.arenaStage?.id}:${this.currentEncounter?.id}:${Math.ceil((this.banner.time || 0) * 10)}`;
    if (this.lastBannerSignature.startsWith(`${this.wave}:${this.arenaStage?.id}:${this.currentEncounter?.id}:`)) return;
    this.lastBannerSignature = signature;
    setText(element.querySelector('[data-combat-kicker]'), i18n.t('wave.incoming', { wave: this.wave }));
    setText(element.querySelector('[data-combat-title]'), i18n.t(`stage.${this.arenaStage?.id || 0}`));
    setText(element.querySelector('[data-combat-meta]'), i18n.t(`encounter.${this.currentEncounter?.id || 'foundation'}`));
    element.hidden = false;
    element.classList.remove('is-entering');
    void element.offsetWidth;
    element.classList.add('is-entering');
  }

  prepareHiDpiFeedbackOrder() {
    if (!Array.isArray(this.feedbackEvents) || this.feedbackEvents.length < 2) return;
    const muzzleIndex = this.feedbackEvents.findIndex((event) => event?.type === 'muzzle');
    if (muzzleIndex < 0 || muzzleIndex === this.feedbackEvents.length - 1) return;
    const [muzzle] = this.feedbackEvents.splice(muzzleIndex, 1);
    this.feedbackEvents.push(muzzle);
  }

  captureInterpolationState() {
    return {
      state: this.state,
      player: { x: this.player?.x || 0, y: this.player?.y || 0 },
      bullet: { x: this.bullet?.x || 0, y: this.bullet?.y || 0 },
      enemies: new Map((this.enemies || []).map((enemy) => [enemy, { x: enemy.x, y: enemy.y, phase: enemy.phase }])),
      shots: new Map((this.enemyShots || []).map((shot) => [shot, { x: shot.x, y: shot.y }])),
      camera: this.worldCamera ? { x: this.worldCamera.x, y: this.worldCamera.y, zoom: this.worldCamera.zoom } : null,
    };
  }

  resetInterpolation() {
    const snapshot = this.captureInterpolationState();
    this.interpolationPrevious = snapshot;
    this.interpolationCurrent = snapshot;
    this.renderAlpha = 0;
  }

  withInterpolatedState(alpha, callback) {
    const previous = this.interpolationPrevious;
    const current = this.interpolationCurrent;
    if (!previous || !current || previous.state !== this.state || current.state !== this.state) return callback();

    const restore = [];
    const apply = (target, before, after, keys) => {
      if (!target || !before || !after) return;
      const saved = {};
      for (const key of keys) {
        saved[key] = target[key];
        target[key] = lerp(before[key], after[key], alpha);
      }
      restore.push(() => Object.assign(target, saved));
    };

    apply(this.player, previous.player, current.player, ['x', 'y']);
    apply(this.bullet, previous.bullet, current.bullet, ['x', 'y']);
    for (const enemy of this.enemies || []) apply(enemy, previous.enemies.get(enemy), current.enemies.get(enemy), ['x', 'y', 'phase']);
    for (const shot of this.enemyShots || []) apply(shot, previous.shots.get(shot), current.shots.get(shot), ['x', 'y']);
    if (this.worldCamera && previous.camera && current.camera) apply(this.worldCamera, previous.camera, current.camera, ['x', 'y', 'zoom']);

    try {
      return callback();
    } finally {
      for (let index = restore.length - 1; index >= 0; index -= 1) restore[index]();
    }
  }

  simulationStep(dt) {
    if (this.state !== 'playing') return;
    this.inFixedUpdate = true;
    this.currentSimulationDt = dt;
    this.interpolationPrevious = this.captureInterpolationState();
    try {
      this.update(dt);
    } finally {
      this.currentSimulationDt = 0;
      this.inFixedUpdate = false;
      this.interpolationCurrent = this.captureInterpolationState();
    }
  }

  advanceNonPlaying(dt) {
    if (dt <= 0) return;
    this.elapsed += dt;
    this.updateParticles(dt);
    this.updateFloatingTexts(dt);
    this.decayVisualFeedback(dt);
  }

  loop(time) {
    if (!this.fixedClock || !this.framePacer) {
      requestAnimationFrame(this.boundSmoothLoop || ((nextTime) => this.loop(nextTime)));
      return;
    }

    if (document.visibilityState === 'hidden') {
      this.fixedClock.reset(time);
      this.lastRenderTimestamp = time;
      requestAnimationFrame(this.boundSmoothLoop);
      return;
    }

    if (this.timingResetPending) {
      this.fixedClock.reset(time);
      this.framePacer.reset(time);
      this.lastRenderTimestamp = time;
      this.timingResetPending = false;
      this.resetInterpolation();
    }

    let steps = 0;
    if (this.state === 'playing') {
      const result = this.fixedClock.tick(time, (dt) => this.simulationStep(dt));
      steps = result.steps;
      this.renderAlpha = result.alpha;
    } else {
      const previous = this.lastRenderTimestamp ?? time;
      const dt = Math.min(MAX_IDLE_DT, Math.max(0, (time - previous) / 1000));
      this.fixedClock.reset(time);
      this.renderAlpha = 0;
      this.advanceNonPlaying(dt);
    }
    this.lastRenderTimestamp = time;

    this.draw(this.renderAlpha);
    this.framePacer.sample(time, steps);
    this.observePerformance(time);
    requestAnimationFrame(this.boundSmoothLoop);
  }

  observePerformance(time) {
    if (this.state !== 'playing' || time - this.lastQualityObservationMs < QUALITY_OBSERVE_INTERVAL_MS) return;
    const elapsed = this.lastQualityObservationMs > 0 ? (time - this.lastQualityObservationMs) / 1000 : 0.5;
    this.lastQualityObservationMs = time;
    const decision = this.qualityManager?.observe?.(this.framePacer.snapshot(), elapsed);
    if (decision?.changed) this.applyQualityProfile(false);
  }

  computeScreenShake(timeSeconds) {
    if (this.reducedMotion) return { x: 0, y: 0 };
    const strength = Math.max(0, Number(this.shake) || 0);
    if (strength <= 0.01) return { x: 0, y: 0 };
    const trauma = clamp01(strength / 15);
    const amplitude = strength * trauma;
    const xNoise = Math.sin(timeSeconds * 43.7 + 0.8) * 0.64 + Math.sin(timeSeconds * 71.3 + 2.1) * 0.36;
    const yNoise = Math.sin(timeSeconds * 47.9 + 1.9) * 0.58 + Math.cos(timeSeconds * 79.1 + 0.4) * 0.42;
    return { x: xNoise * amplitude * 0.34, y: yNoise * amplitude * 0.29 };
  }

  draw(alpha = this.renderAlpha) {
    this.canvasViewport?.beginFrame(this.ctx);
    this.prepareHiDpiFeedbackOrder();
    const shakeValue = this.shake;
    const timeSeconds = (globalThis.performance?.now?.() || 0) / 1000;

    this.withInterpolatedState(alpha, () => {
      const camera = this.worldCamera;
      const cameraRestore = camera ? { x: camera.x, y: camera.y } : null;
      const shake = this.computeScreenShake(timeSeconds);
      if (camera && this.state !== 'menu') {
        const zoom = Math.max(0.01, Number(camera.zoom) || 1);
        camera.x -= shake.x / zoom;
        camera.y -= shake.y / zoom;
      }
      this.shake = 0;
      try {
        super.draw();
      } finally {
        this.shake = shakeValue;
        if (camera && cameraRestore) {
          camera.x = cameraRestore.x;
          camera.y = cameraRestore.y;
        }
      }
    });

    this.syncCombatAnnouncer();
    this.syncDomUi(timeSeconds * 1000);
    this.maybeApplyPendingCanvasQuality();
  }

  domSignature() {
    const bulletState = this.bullet?.held
      ? 'held'
      : this.bullet?.recalling
        ? 'returning'
        : (this.bullet?.recallCooldown || 0) <= 0
          ? 'recall-ready'
          : 'in-flight';
    return [
      this.state,
      this.wave,
      this.score,
      this.enemies?.length || 0,
      this.player?.health || 0,
      this.player?.maxHealth || 0,
      this.player?.shield || 0,
      this.arenaStage?.id || 0,
      bulletState,
      this.stats?.upgrades || 0,
    ].join(':');
  }

  syncDomUi(timeMs, force = false) {
    if (!this.domUi) return;
    const profile = this.activeQualityProfile || { hudHz: 60 };
    const interval = this.state === 'playing' ? 1000 / Math.max(15, profile.hudHz || 60) : 180;
    const signature = this.domSignature();
    const dirty = signature !== this.lastDomSignature;
    if (!force && !dirty && timeMs - this.lastDomSyncMs < interval) return;
    this.lastDomSignature = signature;
    this.lastDomSyncMs = timeMs;
    this.domUi.sync(force || dirty);

    const root = this.domUi.root;
    if (root) {
      const bulletState = this.bullet?.held
        ? 'held'
        : this.bullet?.recalling
          ? 'returning'
          : (this.bullet?.recallCooldown || 0) <= 0
            ? 'recall-ready'
            : 'in-flight';
      root.dataset.bulletState = bulletState;
      const ratio = (this.player?.health || 0) / Math.max(1, this.player?.maxHealth || 1);
      root.classList.toggle('is-low-health', this.state === 'playing' && ratio <= 0.34);
      root.style.setProperty('--damage-feedback', clamp01(this.damageVisual).toFixed(3));
      root.style.setProperty('--dash-feedback', clamp01(this.dashVisual).toFixed(3));
    }
  }

  setState(state) {
    const previousState = this.state;
    const result = super.setState(state);
    const copy = {
      menu: i18n.t('brand.title'),
      playing: i18n.t('wave.incoming', { wave: this.wave || 1 }),
      upgrade: i18n.t('upgrade.title'),
      paused: i18n.t('pause.title'),
      gameover: i18n.t('gameOver.title'),
    };
    this.resetInterpolation();
    this.lastDomSignature = '';
    if (previousState !== state) {
      this.timingResetPending = true;
      if (state === 'playing') this.lastQualityObservationMs = 0;
    }
    this.domUi?.sync(true);
    this.announce(copy[state]);
    return result;
  }

  startNextWave() {
    const result = super.startNextWave();
    this.resetInterpolation();
    this.lastDomSignature = '';
    this.domUi?.sync(true);

    // Milestone presentation. Concise on purpose: a banner and a cue, no modal,
    // so arcade flow is never interrupted.
    const guardian = this.enemies?.find((enemy) => enemy.guardian) || null;
    if (guardian) {
      this.audio?.play?.('guardian-spawn');
      this.shake = Math.max(this.shake || 0, this.reducedMotion ? 0 : 9);
      this.banner = {
        title: i18n.t('guardian.incoming'),
        subtitle: i18n.t(`guardian.${guardian.guardianId}`),
        time: 2.6,
      };
      this.announce(`${i18n.t('guardian.incoming')}. ${i18n.t(`guardian.${guardian.guardianId}`)}.`);
    } else {
      this.announce(`${i18n.t('wave.incoming', { wave: this.wave })}. ${i18n.t('hud.enemiesLeft', { count: this.enemies.length })}.`);
    }
    return result;
  }

  update(dt) {
    super.update(dt);
    this.decayVisualFeedback(dt);
  }

  decayVisualFeedback(dt) {
    this.dashVisual = Math.max(0, this.dashVisual - dt * 5.5);
    this.recallVisual = Math.max(0, this.recallVisual - dt * 3.8);
    this.catchVisual = Math.max(0, this.catchVisual - dt * 7.5);
    this.ricochetVisual = Math.max(0, this.ricochetVisual - dt * 9);
    this.damageVisual = Math.max(0, this.damageVisual - dt * 2.4);
  }

  tryDash() {
    const before = Number(this.player?.dashRemaining) || 0;
    super.tryDash();
    if (before <= 0 && (Number(this.player?.dashRemaining) || 0) > 0) {
      this.dashVisual = 1;
      this.shake = Math.max(this.shake || 0, this.reducedMotion ? 0 : 5.5);
    }
  }

  fireBullet() {
    const fired = super.fireBullet();
    if (fired) {
      this.bulletTrailAccumulator = 0;
      this.shake = Math.max(this.shake || 0, this.reducedMotion ? 0 : 4.5);
    }
    return fired;
  }

  recallBullet() {
    const recalled = super.recallBullet();
    if (recalled) {
      this.recallVisual = 1;
      this.audio?.play?.('recall');
    }
    return recalled;
  }

  onRicochet() {
    const banks = Number(this.bullet?.bounces) || 0;
    super.onRicochet();
    this.ricochetVisual = 1;
    this.lastRicochetPoint = { x: this.bullet.x, y: this.bullet.y, life: 0.16 };
    // Bank chains escalate: each ricochet in a chain lands slightly harder, so
    // a long bank reads as building pressure rather than a flat repeat.
    const chain = Math.min(4, banks);
    this.shake = Math.max(this.shake || 0, this.reducedMotion ? 0 : 0.8 + chain * 0.45);
    this.audio?.play?.('ricochet');
  }

  catchBullet() {
    // Read the authoritative counter rather than re-deriving eligibility, which
    // lives in combat-depth-runtime and would drift if duplicated here.
    const before = this.combatDepthStats?.perfectCatches ?? 0;
    const wasReturning = Boolean(this.bullet?.recalling);
    super.catchBullet();
    const perfect = (this.combatDepthStats?.perfectCatches ?? 0) > before;
    this.catchVisual = perfect ? 0.8 : 0.45;
    this.shake = Math.max(this.shake || 0, this.reducedMotion ? 0 : (perfect ? 3.2 : 0.7));
    if (wasReturning) this.audio?.play?.(perfect ? 'perfect-catch' : 'catch');
  }

  /*
   * Combat audio hooks live here, at the terminal runtime, because every
   * intermediate class overrides these methods and an edit further down the
   * chain would be shadowed. `hit` and `kill` were defined in the AudioEngine
   * but never triggered by anything, so landing and killing — the two events
   * the player most needs confirmation of — were silent.
   */
  damageEnemy(enemy, damage, fromBullet = false) {
    // Guardian vulnerability rules. These are the encounter: a Guardian is not
    // a health sponge, it is a shape you have to solve with the one bullet.
    if (enemy?.guardian && fromBullet) {
      // Sealed while telegraphing or committed, open while stalking.
      if (enemy.phaseName !== 'stalk') {
        this.audio?.play?.('ricochet');
        this.addFloatingText?.(enemy.x, enemy.y - enemy.radius - 12, 'SEALED', '#8fa6b8');
        return undefined;
      }
      // Bastion answers only to a ricochet, which forces the arena geometry to
      // be used rather than a straight-line duel.
      if (enemy.requiresBank && (Number(this.bullet?.bounces) || 0) < 1) {
        this.audio?.play?.('ricochet');
        this.addFloatingText?.(enemy.x, enemy.y - enemy.radius - 12, 'BANK REQUIRED', '#ffb45f');
        return undefined;
      }
    }

    const before = Number(enemy?.health) || 0;
    const result = super.damageEnemy(enemy, damage, fromBullet);
    const after = Number(enemy?.health) || 0;
    if (fromBullet && after < before && after > 0) this.audio?.play?.('hit');
    return result;
  }

  killEnemy(enemy) {
    const existed = this.enemies?.includes(enemy);
    const guardian = Boolean(enemy?.guardian);
    const result = super.killEnemy(enemy);
    if (existed && !this.enemies?.includes(enemy)) {
      this.audio?.play?.(guardian ? 'guardian-down' : 'kill');
      if (guardian) this.shake = Math.max(this.shake || 0, this.reducedMotion ? 0 : 16);
    }
    return result;
  }

  damagePlayer(sourceX, sourceY) {
    const health = this.player?.health;
    const shield = this.player?.shield;
    super.damagePlayer(sourceX, sourceY);
    if (health !== this.player?.health || shield !== this.player?.shield) this.damageVisual = 1;
  }

  updateBullet(dt) {
    const wasHeld = Boolean(this.bullet?.held);
    const previousTrailLength = this.bullet?.trail?.length || 0;
    super.updateBullet(dt);
    if (this.bullet?.held) {
      this.bulletTrailAccumulator = 0;
      return;
    }

    const trail = this.bullet.trail;
    if (!Array.isArray(trail) || wasHeld) return;
    const profile = this.activeQualityProfile || { trailSamples: 15 };
    const targetSamplesPerSecond = profile.id === 'ULTRA' ? 96 : profile.id === 'HIGH' ? 84 : profile.id === 'BALANCED' ? 66 : 52;
    const interval = 1 / targetSamplesPerSecond;
    this.bulletTrailAccumulator += Math.max(0, Number(dt) || 0);
    const newPointAdded = trail.length > previousTrailLength || (trail.length > 0 && dt > 0);
    if (newPointAdded && this.bulletTrailAccumulator + 1e-9 < interval) trail.shift();
    else if (newPointAdded) this.bulletTrailAccumulator %= interval;
    if (trail.length > profile.trailSamples) trail.length = profile.trailSamples;
  }

  createParticle(x, y, color, speed = 150) {
    const profile = this.activeQualityProfile || { particleCap: 200 };
    if (speed === 75 && color === '#62f3ff') {
      if (this.elapsed < this.nextDashParticleAt) return;
      this.nextDashParticleAt = this.elapsed + 1 / 36;
    }
    const before = this.particles?.length || 0;
    super.createParticle(x, y, color, speed);
    const cap = Math.max(48, profile.particleCap || 200);
    if (this.particles?.length > cap) this.particles.splice(0, this.particles.length - cap);
    return (this.particles?.length || 0) > before;
  }

  createBurst(x, y, color, count = 12, speed = 180) {
    const scale = this.activeQualityProfile?.particleScale ?? 1;
    const adjusted = Math.max(2, Math.round(count * scale));
    for (let index = 0; index < adjusted; index += 1) this.createParticle(x, y, color, speed);
  }

  updateParticles(dt) {
    const particles = this.particles || [];
    let write = 0;
    for (let read = 0; read < particles.length; read += 1) {
      const particle = particles[read];
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      if (particle.type === 'ring') particle.radius += particle.speed * dt;
      if (particle.life > 0) particles[write++] = particle;
    }
    particles.length = write;
    if (this.lastRicochetPoint) {
      this.lastRicochetPoint.life -= dt;
      if (this.lastRicochetPoint.life <= 0) this.lastRicochetPoint = null;
    }
  }

  updateFloatingTexts(dt) {
    const items = this.floatingTexts || [];
    let write = 0;
    for (let read = 0; read < items.length; read += 1) {
      const item = items[read];
      item.life -= dt;
      item.y -= 34 * dt;
      if (item.life > 0) items[write++] = item;
    }
    items.length = write;
  }

  drawPlayer() {
    const ctx = this.ctx;
    const dash = clamp01(this.dashVisual);

    if (dash > 0.01) {
      const direction = this.player.dashDirection || { x: 1, y: 0 };
      const angle = Math.atan2(direction.y || 0, direction.x || 0);
      ctx.save();
      ctx.translate(this.player.x, this.player.y);
      ctx.rotate(angle);
      ctx.scale(1 + dash * 0.09, 1 - dash * 0.055);
      ctx.rotate(-angle);
      ctx.translate(-this.player.x, -this.player.y);
      super.drawPlayer();
      ctx.restore();
    } else {
      super.drawPlayer();
    }
  }

  drawBullet() {
    super.drawBullet();
    if (!this.bullet?.held && !this.bullet?.recalling) {
      const ctx = this.ctx;
      const dx = this.bullet.x - this.player.x;
      const dy = this.bullet.y - this.player.y;
      const length = Math.hypot(dx, dy);
      if (length > 250) {
        const direction = normalize(dx, dy);
        const x = this.player.x + direction.x * 58;
        const y = this.player.y + direction.y * 58;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.atan2(direction.y, direction.x));
        ctx.globalAlpha = 0.72;
        ctx.fillStyle = '#f4cf78';
        ctx.strokeStyle = 'rgba(255,255,255,0.72)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(-8, -7);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-8, 7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
    if (this.bullet?.recalling && !this.bullet?.held) {
      const ctx = this.ctx;
      const dx = this.player.x - this.bullet.x;
      const dy = this.player.y - this.bullet.y;
      const length = Math.hypot(dx, dy);
      if (length > 38) {
        const direction = normalize(dx, dy);
        const normal = { x: -direction.y, y: direction.x };
        const bend = Math.min(26, length * 0.06) * Math.sin(this.elapsed * 7.5);
        const cx = (this.player.x + this.bullet.x) * 0.5 + normal.x * bend;
        const cy = (this.player.y + this.bullet.y) * 0.5 + normal.y * bend;
        ctx.save();
        ctx.globalAlpha = 0.28 + clamp01(this.recallVisual) * 0.18;
        ctx.strokeStyle = '#6dd7f2';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([5, 10]);
        ctx.lineDashOffset = -(this.elapsed * 85) % 15;
        ctx.beginPath();
        ctx.moveTo(this.bullet.x, this.bullet.y);
        ctx.quadraticCurveTo(cx, cy, this.player.x, this.player.y);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  drawEnemies() {
    super.drawEnemies();
  }

  drawEnemyShots() {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 128, 153, 0.68)';
    ctx.lineWidth = 2.2;
    for (const shot of this.enemyShots || []) {
      const direction = normalize(shot.vx, shot.vy);
      ctx.beginPath();
      ctx.moveTo(shot.x, shot.y);
      ctx.lineTo(shot.x - direction.x * 18, shot.y - direction.y * 18);
      ctx.stroke();
    }
    ctx.restore();
    super.drawEnemyShots();
  }

  drawWorldLighting() {
    if ((this.activeQualityProfile?.ambientDetail ?? 1) < 0.3) return;
    super.drawWorldLighting();
  }

  drawFloorDetails(...args) {
    if ((this.activeQualityProfile?.ambientDetail ?? 1) < 0.42) return;
    return super.drawFloorDetails(...args);
  }

  clearCheckpoint() {
    const result = super.clearCheckpoint();
    this.domUi?.sync(true);
    return result;
  }

  toggleFullscreen() {
    try {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else document.documentElement.requestFullscreen?.({ navigationUI: 'hide' });
    } catch {
      // Fullscreen remains optional.
    }
  }

  toggleAudio() {
    const muted = this.audio.toggleMute();
    this.domUi?.sync(true);
    this.announce(i18n.t(muted ? 'status.audioMuted' : 'status.audioEnabled'));
    return muted;
  }

  requestCheckpointDelete() {
    if (this.deleteConfirmUntil > this.elapsed) {
      this.deleteConfirmUntil = 0;
      this.clearCheckpoint();
      return true;
    }
    this.deleteConfirmUntil = this.elapsed + 3;
    this.audio.play('click');
    this.announce(i18n.t('status.confirmDelete'));
    return false;
  }

  drawMenu() {}
  drawHud() {}
  drawPause() {}
  drawGameOver() {}
  drawUpgradeSelection() {}
  drawBanner() {}

  destroy() {
    this.unsubscribeLocale?.();
    this.canvasViewport?.destroy?.();
    this.domUi?.destroy?.();
    this.qualityControl?.removeEventListener?.('click', this.onQualityClick);
    window.removeEventListener('keydown', this.onGlobalUiKeyDown);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }
}
