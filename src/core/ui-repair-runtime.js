import { i18n } from '../i18n.js';
import { RELEASE_VERSION } from '../release.js';
import { CanvasViewport } from '../render/canvas-viewport.js';
import { DomUiController } from '../ui/dom-ui.js';
import { OneBulletProductionArtRuntime } from './production-art-runtime.js';

export const GLOBAL_UI_RUNTIME_VERSION = '3.7.0-hires-ui';
export const GLOBAL_UI_REVISION = 'dom-hidpi-presentation-v1';
export const UI_REPAIR_RUNTIME_VERSION = GLOBAL_UI_RUNTIME_VERSION;
export const UI_REPAIR_REVISION = GLOBAL_UI_REVISION;

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

    this.unsubscribeLocale = i18n.subscribe(() => {
      this.locale = i18n.locale;
      this.syncDocumentCopy();
      this.domUi?.sync(true);
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
  }

  getSnapshot() {
    const viewport = this.canvasViewport?.getSnapshot?.() || null;
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

  prepareHiDpiFeedbackOrder() {
    if (!Array.isArray(this.feedbackEvents) || this.feedbackEvents.length < 2) return;
    const muzzleIndex = this.feedbackEvents.findIndex((event) => event?.type === 'muzzle');
    if (muzzleIndex < 0 || muzzleIndex === this.feedbackEvents.length - 1) return;

    // The inherited muzzle renderer intentionally resets its local transform at
    // the end of the flash. One Bullet Arena can only have one active muzzle
    // flash, so render it last and let the enclosing save/restore restore the
    // logical HiDPI transform before any later world layer is drawn.
    const [muzzle] = this.feedbackEvents.splice(muzzleIndex, 1);
    this.feedbackEvents.push(muzzle);
  }

  draw() {
    this.canvasViewport?.beginFrame(this.ctx);
    this.prepareHiDpiFeedbackOrder();
    super.draw();
    this.domUi?.sync();
  }

  setState(state) {
    const result = super.setState(state);
    const copy = {
      menu: i18n.t('brand.title'),
      playing: i18n.t('wave.incoming', { wave: this.wave || 1 }),
      upgrade: i18n.t('upgrade.title'),
      paused: i18n.t('pause.title'),
      gameover: i18n.t('gameOver.title'),
    };
    this.domUi?.sync(true);
    this.announce(copy[state]);
    return result;
  }

  startNextWave() {
    const result = super.startNextWave();
    this.domUi?.sync(true);
    this.announce(`${i18n.t('wave.incoming', { wave: this.wave })}. ${i18n.t('hud.enemiesLeft', { count: this.enemies.length })}.`);
    return result;
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

  // Player-facing text and interaction surfaces are now semantic DOM.
  // These overrides intentionally remove obsolete low-resolution Canvas ownership.
  drawMenu() {}
  drawHud() {}
  drawPause() {}
  drawGameOver() {}
  drawUpgradeSelection() {}

  destroy() {
    this.unsubscribeLocale?.();
    this.canvasViewport?.destroy?.();
    this.domUi?.destroy?.();
    window.removeEventListener('keydown', this.onGlobalUiKeyDown);
  }
}
