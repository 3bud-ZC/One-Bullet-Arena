import { i18n } from '../i18n.js';
import { RELEASE_VERSION } from '../release.js';
import { iconSvg } from './icons.js';

const STAGE_WAVES = Object.freeze([1, 5, 10, 15, 20, 25, 30, 35]);

// Bounce vertices for the sector ricochet track.
//
// The x positions are the centres of eight equal columns so the label grid
// below lines up with them exactly. The SVG stretches with
// preserveAspectRatio="none" — fine for a polyline, but it would squash a
// circle into an ellipse, so the node markers are positioned HTML rather than
// SVG shapes and carry these coordinates as percentages.
const SPINE_VIEWBOX = Object.freeze({ width: 720, height: 104 });
const SPINE_COLUMN = SPINE_VIEWBOX.width / STAGE_WAVES.length;
const SPINE_POINTS = Object.freeze(STAGE_WAVES.map((_, index) => Object.freeze({
  x: SPINE_COLUMN * (index + 0.5),
  y: index % 2 === 0 ? 76 : 28,
})));

function spinePercent(point) {
  return {
    left: `${((point.x / SPINE_VIEWBOX.width) * 100).toFixed(3)}%`,
    top: `${((point.y / SPINE_VIEWBOX.height) * 100).toFixed(3)}%`,
  };
}

function spinePathTo(index) {
  return SPINE_POINTS.slice(0, Math.max(1, index + 1))
    .map((point, position) => `${position ? 'L' : 'M'}${point.x} ${point.y}`)
    .join(' ');
}

const UPGRADE_ICONS = Object.freeze({
  'heavy-shot': 'target',
  'bullet-velocity': 'bullet',
  'extended-ricochet': 'wave',
  'hot-ricochet': 'wave',
  'shock-impact': 'wave',
  'magnetic-recall': 'checkpoint',
  'recall-strike': 'newRun',
  'quick-dash': 'dash',
  'swift-steps': 'dash',
  vitality: 'health',
  'wave-shield': 'shield',
  'second-chance': 'shield',
  'phase-round': 'target',
  'kinetic-catch': 'checkpoint',
  'field-medic': 'health',
  'dash-impact': 'dash',
});

function stageIndexForWave(wave) {
  const safe = Math.max(1, Math.trunc(Number(wave) || 1));
  let result = 0;
  for (let index = 0; index < STAGE_WAVES.length; index += 1) {
    if (safe >= STAGE_WAVES[index]) result = index;
  }
  return result;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function formatNumber(value) {
  return i18n.number(Math.max(0, Math.trunc(Number(value) || 0)));
}

function setText(element, value) {
  if (!element) return;
  const text = String(value ?? '');
  if (element.textContent !== text) element.textContent = text;
}

function setHidden(element, hidden) {
  if (!element) return;
  if (element.hidden !== Boolean(hidden)) element.hidden = Boolean(hidden);
}

function setPressed(element, pressed) {
  if (!element) return;
  element.setAttribute('aria-pressed', pressed ? 'true' : 'false');
  element.classList.toggle('is-active', Boolean(pressed));
}

function upgradeIconName(id) {
  return UPGRADE_ICONS[id] || 'upgrade';
}

function metricTemplate(icon, labelKey, bind) {
  return `
    <div class="metric">
      <span class="metric__icon">${iconSvg(icon)}</span>
      <span class="metric__label" data-i18n="${labelKey}"></span>
      <strong class="metric__value" data-bind="${bind}" dir="ltr">0</strong>
    </div>`;
}

function utilityButton(action, icon, labelKey) {
  return `
    <button class="utility-button" type="button" data-action="${action}" data-interactive aria-label="">
      <span class="utility-button__icon" data-icon-host="${action}">${iconSvg(icon)}</span>
      <span class="utility-button__label" data-i18n="${labelKey}"></span>
    </button>`;
}

export class DomUiController {
  constructor(game, root, viewport) {
    if (!(root instanceof HTMLElement)) throw new Error('DOM UI root is unavailable.');
    this.game = game;
    this.root = root;
    this.viewport = viewport;
    this.locale = null;
    this.lastUpgradeSignature = '';
    this.lastState = null;
    this.settingsOpen = false;
    this.deleteConfirmUntil = 0;
    this.renderShell();
    this.bindEvents();
    this.sync(true);
  }

  renderShell() {
    // The sector track is drawn as a real ricochet: eight bounce vertices
    // alternating between the top and bottom of the band, joined by straight
    // segments. Sector progress and the bullet's flight path are the same line.
    const spine = SPINE_POINTS.map((point, index) => `${index ? 'L' : 'M'}${point.x} ${point.y}`).join(' ');

    const progressionNodes = SPINE_POINTS.map((point, index) => {
      const { left, top } = spinePercent(point);
      return `<span class="progression-node" data-stage-node="${index}" style="left:${left};top:${top}"></span>`;
    }).join('');

    // Labels sit on the same side as their bounce vertex, so a sector that
    // peaks at the top of the track is captioned above it and one that dips is
    // captioned below. A single flat row would leave half of them stranded.
    const progressionLabel = (index) => `
      <span class="progression-label" data-stage-label="${index}">
        <strong dir="ltr">${String(index + 1).padStart(2, '0')}</strong>
        <span data-stage-name="${index}"></span>
      </span>`;
    const labelsAbove = STAGE_WAVES.map((_, index) => index).filter((index) => index % 2 === 1).map(progressionLabel).join('');
    const labelsBelow = STAGE_WAVES.map((_, index) => index).filter((index) => index % 2 === 0).map(progressionLabel).join('');

    this.root.innerHTML = `
      <div class="ambient-ui" aria-hidden="true">
        <div class="ambient-ui__glow ambient-ui__glow--a"></div>
        <div class="ambient-ui__glow ambient-ui__glow--b"></div>
        <div class="ambient-ui__trajectory"></div>
        <div class="ambient-ui__grain"></div>
      </div>

      <div class="game-ui-toolbar" data-toolbar hidden>
        <div class="utility-group" role="group" aria-label="Game utilities">
          <div class="language-control" data-interactive>
            <span class="language-control__icon">${iconSvg('language')}</span>
            <span class="language-control__label" data-i18n="menu.language"></span>
            <button type="button" class="language-segment" data-action="locale-en" data-locale="en">EN</button>
            <button type="button" class="language-segment" data-action="locale-ar" data-locale="ar">AR</button>
          </div>
          ${utilityButton('audio', 'audio', 'menu.audio')}
          ${utilityButton('fullscreen', 'fullscreen', 'menu.fullscreen')}
          ${utilityButton('settings', 'settings', 'menu.settings')}
        </div>
        <div class="settings-popover surface surface--elevated" data-settings-popover hidden data-interactive>
          <div class="settings-popover__row">
            <span data-i18n="menu.audio"></span>
            <strong data-bind="settings-audio"></strong>
          </div>
          <div class="settings-popover__row">
            <span data-i18n="menu.language"></span>
            <strong data-bind="settings-language"></strong>
          </div>
          <div class="settings-popover__render" data-bind="settings-render" dir="ltr"></div>
        </div>
      </div>

      <section class="ui-screen dashboard-screen" data-screen="menu" aria-labelledby="dashboard-title">
        <div class="arena-backdrop" aria-hidden="true">
          <div class="arena-backdrop__floor"></div>
          <div class="arena-backdrop__grid"></div>
          <div class="arena-backdrop__vignette"></div>
        </div>

        <div class="dashboard">
          <header class="brand-bar">
            <div class="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 56 56" fill="none">
                <circle cx="28" cy="28" r="22" stroke="currentColor" stroke-width="1.2" opacity=".38"/>
                <circle cx="28" cy="28" r="9" stroke="currentColor" stroke-width="1.4"/>
                <path d="M28 5v7M28 44v7M5 28h7M44 28h7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                <path class="brand-mark__shot" d="M19 36 37 18" stroke-width="2.6" stroke-linecap="round"/>
              </svg>
            </div>
            <h1 id="dashboard-title" class="brand-title">
              <span class="brand-title__line" data-i18n="brand.line1"></span>
              <span class="brand-title__line brand-title__line--accent" data-i18n="brand.line2"></span>
            </h1>
            <p class="brand-mantra" data-i18n="brand.shortMantra"></p>
          </header>

          <div class="deck">
            <section class="run-readout" aria-labelledby="run-readout-title">
              <div class="run-readout__head">
                <p class="eyebrow eyebrow--accent" id="run-readout-title" data-bind="run-kicker"></p>
                <div class="checkpoint-pill" data-bind-class="checkpoint-pill">
                  <span>${iconSvg('checkpoint')}</span>
                  <span data-bind="checkpoint-status"></span>
                </div>
              </div>

              <div class="figures">
                <div class="figure">
                  <span class="figure__label" data-i18n="stat.wave"></span>
                  <strong class="figure__value" data-bind="hero-wave" dir="ltr">1</strong>
                </div>
                <div class="figure figure--score">
                  <span class="figure__label" data-i18n="stat.score"></span>
                  <strong class="figure__value" data-bind="hero-score" dir="ltr">0</strong>
                </div>
              </div>

              <dl class="ledger">
                <div class="ledger__item">
                  <dt data-i18n="stat.upgrades"></dt>
                  <dd data-bind="hero-upgrades" dir="ltr">0</dd>
                </div>
                <div class="ledger__item">
                  <dt data-i18n="stat.bestWave"></dt>
                  <dd data-bind="record-best-wave" dir="ltr">0</dd>
                </div>
                <div class="ledger__item">
                  <dt data-i18n="stat.highScore"></dt>
                  <dd data-bind="record-high-score" dir="ltr">0</dd>
                </div>
              </dl>
            </section>

            <section class="launch" aria-label="Run controls">
              <button class="launch__primary" type="button" data-action="primary-run" data-interactive>
                <span class="launch__icon" data-primary-icon>${iconSvg('bullet')}</span>
                <span class="launch__copy">
                  <strong data-bind="primary-label"></strong>
                  <small data-bind="primary-hint"></small>
                </span>
                <span class="launch__chevron">${iconSvg('chevron')}</span>
              </button>

              <div class="launch__secondary">
                <button class="button button--ghost" type="button" data-action="new-run" data-interactive>
                  <span class="button__icon">${iconSvg('newRun')}</span>
                  <span data-i18n="menu.newRun"></span>
                </button>
                <button class="button button--ghost button--danger" type="button" data-action="delete-checkpoint" data-delete-button data-interactive>
                  <span class="button__icon">${iconSvg('delete')}</span>
                  <span data-bind="delete-label"></span>
                </button>
              </div>

              <p class="launch__sector">
                <span class="launch__sector-index" data-bind="sector-index" dir="ltr">01 / 08</span>
                <span data-bind="run-sector"></span>
              </p>
            </section>
          </div>

          <section class="sector-track" aria-labelledby="world-progress-title">
            <div class="sector-track__head">
              <p class="eyebrow" id="world-progress-title" data-i18n="menu.worldProgress"></p>
              <strong data-bind="progress-status"></strong>
              <span class="sector-track__counter"><span data-bind="progress-counter" dir="ltr"></span></span>
            </div>

            <div class="progression-visual">
              <div class="progression-labels progression-labels--above">${labelsAbove}</div>
              <svg class="progression-svg" viewBox="0 0 ${SPINE_VIEWBOX.width} ${SPINE_VIEWBOX.height}" preserveAspectRatio="none" aria-hidden="true">
                <path class="progression-line progression-line--base" d="${spine}"></path>
                <path class="progression-line progression-line--active" data-progress-line d="${spinePathTo(0)}"></path>
              </svg>
              <div class="progression-markers" aria-hidden="true">
                ${progressionNodes}
                <span class="progression-bullet" data-progress-bullet style="left:${spinePercent(SPINE_POINTS[0]).left};top:${spinePercent(SPINE_POINTS[0]).top}"></span>
              </div>
              <div class="progression-labels progression-labels--below">${labelsBelow}</div>
            </div>
          </section>
        </div>
      </section>

      <section class="hud-layer" data-screen="playing" hidden aria-label="Combat HUD">
        <div class="hud-safe">
          <div class="hud-cluster hud-cluster--left">
            <div class="hud-status hud-status--bullet">
              <span class="hud-status__icon">${iconSvg('bullet')}</span>
              <span>
                <small data-i18n="stat.bullet"></small>
                <strong data-bind="hud-bullet"></strong>
              </span>
            </div>
            <div class="hud-gauge hud-gauge--recall" aria-label="Recall readiness">
              <span class="hud-gauge__fill" data-gauge="recall"></span>
            </div>
          </div>

          <div class="hud-center">
            <div class="hud-wave">
              <span data-i18n="hud.wave"></span>
              <strong data-bind="hud-wave" dir="ltr">1</strong>
            </div>
            <div class="hud-encounter" data-bind="hud-encounter"></div>
            <div class="hud-meta">
              <span><b data-bind="hud-enemies" dir="ltr">0</b> <span data-i18n="stat.enemies"></span></span>
              <span><b data-bind="hud-score" dir="ltr">0</b> <span data-i18n="stat.score"></span></span>
              <span><b data-bind="hud-sector" dir="ltr">1</b> <span data-i18n="stat.sector"></span></span>
            </div>
          </div>

          <div class="hud-cluster hud-cluster--right">
            <div class="hud-resource-row">
              <span class="hud-resource__icon hud-resource__icon--health">${iconSvg('health')}</span>
              <span class="hud-resource__numbers"><b data-bind="hud-health" dir="ltr">3/3</b></span>
              <span class="hud-resource__shield" data-shield-indicator hidden>${iconSvg('shield')}<b data-bind="hud-shield" dir="ltr">0</b></span>
            </div>
            <div class="hud-gauge hud-gauge--health"><span class="hud-gauge__fill" data-gauge="health"></span></div>
            <div class="hud-gauge hud-gauge--dash"><span class="hud-gauge__fill" data-gauge="dash"></span></div>
          </div>

          <aside class="hud-minimap" data-minimap hidden aria-label="Tactical map">
            <div class="hud-minimap__label">
              <span data-i18n="minimap.title"></span>
              <b data-bind="minimap-sector" dir="ltr">01</b>
            </div>
            <svg class="hud-minimap__svg" viewBox="0 0 160 96" preserveAspectRatio="none" aria-hidden="true">
              <rect class="hud-minimap__arena" x="1" y="1" width="158" height="94" rx="8"></rect>
              <path class="hud-minimap__trail" data-minimap-trail d=""></path>
              <rect class="hud-minimap__viewport" data-minimap-viewport x="1" y="1" width="1" height="1" rx="2"></rect>
              <circle class="hud-minimap__player" data-minimap-player cx="80" cy="48" r="3"></circle>
            </svg>
          </aside>
        </div>
      </section>

      <section class="ui-screen overlay-screen" data-screen="paused" hidden aria-labelledby="pause-title">
        <div class="overlay-scrim"></div>
        <article class="overlay-card surface surface--elevated" data-interactive>
          <div class="overlay-card__icon">${iconSvg('pause')}</div>
          <p class="eyebrow eyebrow--accent" data-i18n="pause.kicker"></p>
          <h2 id="pause-title" data-i18n="pause.title"></h2>
          <div class="overlay-metrics">
            ${metricTemplate('wave', 'stat.wave', 'pause-wave')}
            ${metricTemplate('score', 'stat.score', 'pause-score')}
            ${metricTemplate('sector', 'stat.sector', 'pause-sector')}
            ${metricTemplate('upgrade', 'stat.upgrades', 'pause-upgrades')}
          </div>
          <div class="overlay-actions">
            <button class="button button--primary button--compact" type="button" data-action="resume" data-interactive>
              <span class="button__icon">${iconSvg('play')}</span><span data-i18n="pause.resume"></span>
            </button>
            <button class="button button--secondary" type="button" data-action="pause-new-run" data-interactive>
              <span class="button__icon">${iconSvg('newRun')}</span><span data-i18n="pause.newRun"></span>
            </button>
            <button class="button button--quiet" type="button" data-action="main-menu" data-interactive>
              <span data-i18n="pause.mainMenu"></span>
            </button>
          </div>
        </article>
      </section>

      <section class="ui-screen overlay-screen upgrade-screen" data-screen="upgrade" hidden aria-labelledby="upgrade-title">
        <div class="overlay-scrim overlay-scrim--strong"></div>
        <div class="upgrade-shell" data-interactive>
          <header class="upgrade-header">
            <p class="eyebrow eyebrow--accent" data-i18n="upgrade.kicker"></p>
            <h2 id="upgrade-title" data-i18n="upgrade.title"></h2>
            <p data-i18n="upgrade.subtitle"></p>
          </header>
          <div class="upgrade-grid" data-upgrade-grid></div>
        </div>
      </section>

      <section class="ui-screen overlay-screen" data-screen="gameover" hidden aria-labelledby="gameover-title">
        <div class="overlay-scrim overlay-scrim--strong"></div>
        <article class="overlay-card overlay-card--gameover surface surface--elevated" data-interactive>
          <p class="eyebrow eyebrow--danger" data-i18n="gameOver.kicker"></p>
          <h2 id="gameover-title" data-i18n="gameOver.title"></h2>
          <div class="gameover-score">
            <span data-i18n="gameOver.finalScore"></span>
            <strong data-bind="gameover-score" dir="ltr">0</strong>
          </div>
          <div class="overlay-metrics overlay-metrics--gameover">
            ${metricTemplate('wave', 'gameOver.waveReached', 'gameover-wave')}
            ${metricTemplate('score', 'gameOver.bestScore', 'gameover-high-score')}
            ${metricTemplate('sector', 'stat.sector', 'gameover-sector')}
          </div>
          <div class="overlay-actions">
            <button class="button button--primary button--compact" type="button" data-action="gameover-continue" data-gameover-continue data-interactive>
              <span class="button__icon">${iconSvg('checkpoint')}</span><span data-i18n="gameOver.continue"></span>
            </button>
            <button class="button button--secondary" type="button" data-action="gameover-new-run" data-interactive>
              <span class="button__icon">${iconSvg('newRun')}</span><span data-i18n="gameOver.retry"></span>
            </button>
            <button class="button button--quiet" type="button" data-action="main-menu" data-interactive>
              <span data-i18n="gameOver.mainMenu"></span>
            </button>
          </div>
        </article>
      </section>
    `;

    this.bindings = new Map(
      [...this.root.querySelectorAll('[data-bind]')].map((element) => [element.dataset.bind, element]),
    );
    this.screens = new Map(
      [...this.root.querySelectorAll('[data-screen]')].map((element) => [element.dataset.screen, element]),
    );
  }

  bindEvents() {
    this.root.addEventListener('click', (event) => {
      const target = event.target.closest?.('[data-action]');
      if (!(target instanceof HTMLElement)) return;
      event.preventDefault();
      event.stopPropagation();
      this.game.audio?.ensure?.();
      this.handleAction(target.dataset.action);
    });

    this.onUpgradeKeyDown = (event) => {
      if (this.game.state !== 'upgrade') return;
      const buttons = [...this.root.querySelectorAll('.upgrade-card:not([disabled])')];
      if (buttons.length === 0) return;

      if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
        const activeIndex = buttons.indexOf(document.activeElement);
        const index = activeIndex >= 0 ? activeIndex : 0;
        const visualDirection = event.key === 'ArrowRight' ? 1 : -1;
        const direction = i18n.isRtl ? -visualDirection : visualDirection;
        const next = (index + direction + buttons.length) % buttons.length;
        buttons[next].focus();
        event.preventDefault();
        return;
      }

      if (event.key === 'Enter' && !buttons.includes(document.activeElement)) {
        buttons[0].click();
        event.preventDefault();
      }
    };
    window.addEventListener('keydown', this.onUpgradeKeyDown);
  }

  handleAction(action) {
    switch (action) {
      case 'primary-run':
        if (this.game.hasContinueCheckpoint?.()) this.game.continueFromCheckpoint();
        else this.game.startRun();
        break;
      case 'new-run':
      case 'pause-new-run':
      case 'gameover-new-run':
        this.game.startRun();
        break;
      case 'delete-checkpoint':
        this.requestCheckpointDelete();
        break;
      case 'locale-en':
        i18n.setLocale('en');
        break;
      case 'locale-ar':
        i18n.setLocale('ar');
        break;
      case 'audio':
        this.game.toggleAudio?.();
        break;
      case 'fullscreen':
        this.game.toggleFullscreen?.();
        break;
      case 'settings':
        this.settingsOpen = !this.settingsOpen;
        this.syncSettings();
        break;
      case 'resume':
        this.game.resume();
        break;
      case 'main-menu':
        this.game.goToMenu();
        break;
      case 'gameover-continue':
        this.game.continueFromCheckpoint();
        break;
      default:
        if (action?.startsWith('upgrade-')) {
          const index = Number(action.slice('upgrade-'.length));
          if (Number.isInteger(index)) this.game.chooseUpgrade(index);
        }
    }
    this.sync(true);
  }

  requestCheckpointDelete() {
    const now = performance.now();
    if (this.deleteConfirmUntil > now) {
      this.deleteConfirmUntil = 0;
      this.game.clearCheckpoint();
    } else {
      this.deleteConfirmUntil = now + 3500;
      this.game.audio?.play?.('click');
      this.game.announce?.(i18n.t('status.confirmDelete'));
    }
    this.syncMenu();
  }

  localize() {
    this.locale = i18n.locale;
    this.root.dir = i18n.dir;
    this.root.dataset.locale = i18n.locale;

    for (const element of this.root.querySelectorAll('[data-i18n]')) {
      const key = element.dataset.i18n;
      setText(element, i18n.t(key));
    }
    for (let index = 0; index < STAGE_WAVES.length; index += 1) {
      setText(this.root.querySelector(`[data-stage-name="${index}"]`), i18n.t(`stage.${index}`));
    }

    for (const button of this.root.querySelectorAll('.language-segment')) {
      setPressed(button, button.dataset.locale === i18n.locale);
    }
    const utilityAudio = this.root.querySelector('[data-action="audio"]');
    const utilityFullscreen = this.root.querySelector('[data-action="fullscreen"]');
    const utilitySettings = this.root.querySelector('[data-action="settings"]');
    if (utilityAudio) utilityAudio.setAttribute('aria-label', i18n.t('menu.audio'));
    if (utilityFullscreen) utilityFullscreen.setAttribute('aria-label', i18n.t('menu.fullscreen'));
    if (utilitySettings) utilitySettings.setAttribute('aria-label', i18n.t('menu.settings'));
    this.syncProgression(true);
  }

  sync(force = false) {
    if (this.locale !== i18n.locale) this.localize();
    const state = this.game.state;
    this.root.dataset.state = state;
    document.body.dataset.gameState = state;
    this.root.classList.toggle('is-touch', Boolean(this.game.touchMode));
    for (const [name, screen] of this.screens) setHidden(screen, name !== state);

    const toolbar = this.root.querySelector('[data-toolbar]');
    setHidden(toolbar, !['menu', 'paused'].includes(state));
    if (this.lastState !== state) {
      this.lastState = state;
      this.settingsOpen = false;
      this.syncSettings();
    }

    if (state === 'menu') this.syncMenu();
    if (state === 'playing') this.syncHud();
    if (state === 'paused') this.syncPause();
    if (state === 'upgrade') this.syncUpgrade(force);
    if (state === 'gameover') this.syncGameOver();
    this.syncSettings();
  }

  menuSource() {
    const checkpoint = this.game.savedCheckpoint;
    if (checkpoint && checkpoint.wave >= 2) {
      return {
        wave: checkpoint.wave,
        score: checkpoint.score,
        upgrades: checkpoint.stats?.upgrades || 0,
        checkpointWave: checkpoint.wave,
        hasCheckpoint: true,
      };
    }
    return {
      wave: Math.max(1, Number(this.game.wave) || 1),
      score: Math.max(0, Number(this.game.score) || 0),
      upgrades: Math.max(0, Number(this.game.stats?.upgrades) || 0),
      checkpointWave: 0,
      hasCheckpoint: false,
    };
  }

  syncMenu() {
    const source = this.menuSource();
    const stageIndex = stageIndexForWave(source.wave);
    const hasCheckpoint = source.hasCheckpoint;
    const sectorName = i18n.t(`stage.${stageIndex}`);

    setText(this.bindings.get('run-kicker'), i18n.t(hasCheckpoint ? 'menu.currentRun' : 'menu.freshRun'));
    setText(this.bindings.get('run-sector'), sectorName);
    setText(this.bindings.get('checkpoint-status'), i18n.t(hasCheckpoint ? 'menu.checkpointReady' : 'menu.noCheckpoint'));
    setText(this.bindings.get('hero-wave'), formatNumber(source.wave));
    setText(this.bindings.get('hero-score'), formatNumber(source.score));
    // The wave figure already reports the checkpoint wave whenever a checkpoint
    // exists, so the ledger deliberately does not repeat it.
    setText(this.bindings.get('hero-upgrades'), formatNumber(source.upgrades));

    setText(this.bindings.get('primary-label'), i18n.t(hasCheckpoint ? 'menu.continue' : 'menu.start'));
    setText(this.bindings.get('primary-hint'), i18n.t(hasCheckpoint ? 'menu.continueHint' : 'menu.actionHint'));
    const primaryIcon = this.root.querySelector('[data-primary-icon]');
    if (primaryIcon) primaryIcon.innerHTML = iconSvg(hasCheckpoint ? 'checkpoint' : 'bullet');

    const deleting = this.deleteConfirmUntil > performance.now();
    setText(this.bindings.get('delete-label'), i18n.t(deleting ? 'menu.confirmDelete' : 'menu.deleteSave'));
    const deleteButton = this.root.querySelector('[data-delete-button]');
    setHidden(deleteButton, !hasCheckpoint);
    deleteButton?.classList.toggle('is-confirming', deleting);

    setText(this.bindings.get('record-best-wave'), formatNumber(this.game.highWave));
    setText(this.bindings.get('record-high-score'), formatNumber(this.game.highScore));
    setText(this.bindings.get('sector-index'), `${String(stageIndex + 1).padStart(2, '0')} / 08`);

    this.root.querySelector('[data-bind-class="checkpoint-pill"]')?.classList.toggle('is-active', hasCheckpoint);
    this.syncProgression();
  }

  syncProgression(force = false) {
    const source = this.menuSource();
    const current = stageIndexForWave(source.wave);

    // The travelled part of the ricochet ends on the current sector's vertex.
    const line = this.root.querySelector('[data-progress-line]');
    if (line) line.setAttribute('d', spinePathTo(current));

    const bullet = this.root.querySelector('[data-progress-bullet]');
    if (bullet) {
      const { left, top } = spinePercent(SPINE_POINTS[current]);
      bullet.style.left = left;
      bullet.style.top = top;
    }

    for (let index = 0; index < STAGE_WAVES.length; index += 1) {
      const node = this.root.querySelector(`[data-stage-node="${index}"]`);
      const label = this.root.querySelector(`[data-stage-label="${index}"]`);
      node?.classList.toggle('is-complete', index < current);
      node?.classList.toggle('is-current', index === current);
      label?.classList.toggle('is-complete', index < current);
      label?.classList.toggle('is-current', index === current);
      if (label) label.style.gridColumn = String(index + 1);
    }

    const next = current >= STAGE_WAVES.length - 1
      ? i18n.t('menu.finalSector')
      : `${i18n.t('menu.nextExpansion')}: ${i18n.t(`stage.${current + 1}`)} · ${i18n.t('stat.wave')} ${STAGE_WAVES[current + 1]}`;
    setText(this.bindings.get('progress-status'), next);
    setText(this.bindings.get('progress-counter'), `${String(current + 1).padStart(2, '0')} / 08`);
  }

  syncHud() {
    const game = this.game;
    const maxHealth = Math.max(1, Number(game.player?.maxHealth) || 1);
    const health = Math.max(0, Number(game.player?.health) || 0);
    const healthRatio = health / maxHealth;
    const dashMax = Math.max(0.36, 1.12 * Math.pow(0.86, game.stack?.('quick-dash') || 0));
    const dashRatio = 1 - (Number(game.player?.dashCooldown) || 0) / dashMax;
    const recallMax = Math.max(0.75, 3.8 - (game.stack?.('magnetic-recall') || 0) * 0.52);
    const recallRatio = game.bullet?.held ? 1 : 1 - (Number(game.bullet?.recallCooldown) || 0) / recallMax;
    const bulletKey = game.bullet?.held
      ? 'hud.bulletHeld'
      : game.bullet?.recalling
        ? 'hud.bulletReturning'
        : 'hud.bulletField';

    setText(this.bindings.get('hud-bullet'), i18n.t(bulletKey));
    setText(this.bindings.get('hud-wave'), formatNumber(game.wave));
    const encounterKey = `encounter.${game.currentEncounter?.id || 'foundation'}`;
    setText(this.bindings.get('hud-encounter'), i18n.t(encounterKey));
    setText(this.bindings.get('hud-enemies'), formatNumber(game.enemies?.length || 0));
    setText(this.bindings.get('hud-score'), formatNumber(game.score));
    setText(this.bindings.get('hud-sector'), formatNumber((game.arenaStage?.id || 0) + 1));
    setText(this.bindings.get('hud-health'), `${formatNumber(health)}/${formatNumber(maxHealth)}`);
    setText(this.bindings.get('hud-shield'), formatNumber(game.player?.shield || 0));

    this.setGauge('health', healthRatio);
    this.setGauge('dash', dashRatio);
    this.setGauge('recall', recallRatio);

    const shield = this.root.querySelector('[data-shield-indicator]');
    setHidden(shield, !(Number(game.player?.shield) > 0));
    this.syncMinimap();
  }

  syncMinimap() {
    const game = this.game;
    const minimap = this.root.querySelector('[data-minimap]');
    const bounds = game.arenaStage?.bounds;
    const shouldShow = Boolean(bounds && (game.arenaStage?.id || 0) >= 4 && !game.touchMode);
    setHidden(minimap, !shouldShow);
    if (!shouldShow) return;

    const width = Math.max(1, Number(bounds.w) || 1);
    const height = Math.max(1, Number(bounds.h) || 1);
    const project = (point) => ({
      x: clamp01(((Number(point?.x) || 0) - bounds.x) / width) * 158 + 1,
      y: clamp01(((Number(point?.y) || 0) - bounds.y) / height) * 94 + 1,
    });

    const trail = (game.explorationTrail || [])
      .map(project)
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
    const trailElement = this.root.querySelector('[data-minimap-trail]');
    if (trailElement) {
      const d = trail.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
      if (trailElement.getAttribute('d') !== d) trailElement.setAttribute('d', d);
    }

    const viewport = game.viewportWorldBounds?.();
    const viewportElement = this.root.querySelector('[data-minimap-viewport]');
    if (viewport && viewportElement) {
      const topLeft = project(viewport);
      const viewW = Math.max(1, Math.min(158, (viewport.w / width) * 158));
      const viewH = Math.max(1, Math.min(94, (viewport.h / height) * 94));
      viewportElement.setAttribute('x', Math.max(1, Math.min(159 - viewW, topLeft.x)).toFixed(2));
      viewportElement.setAttribute('y', Math.max(1, Math.min(95 - viewH, topLeft.y)).toFixed(2));
      viewportElement.setAttribute('width', viewW.toFixed(2));
      viewportElement.setAttribute('height', viewH.toFixed(2));
    }

    const player = project(game.player);
    const playerElement = this.root.querySelector('[data-minimap-player]');
    playerElement?.setAttribute('cx', player.x.toFixed(2));
    playerElement?.setAttribute('cy', player.y.toFixed(2));
    setText(this.bindings.get('minimap-sector'), String((game.arenaStage?.id || 0) + 1).padStart(2, '0'));
  }

  setGauge(name, value) {
    const element = this.root.querySelector(`[data-gauge="${name}"]`);
    element?.style.setProperty('--value', clamp01(value).toFixed(4));
  }

  syncPause() {
    const game = this.game;
    setText(this.bindings.get('pause-wave'), formatNumber(game.wave));
    setText(this.bindings.get('pause-score'), formatNumber(game.score));
    setText(this.bindings.get('pause-sector'), formatNumber((game.arenaStage?.id || 0) + 1));
    setText(this.bindings.get('pause-upgrades'), formatNumber(game.stats?.upgrades || 0));
  }

  syncUpgrade(force = false) {
    const choices = this.game.upgradeChoices || [];
    const signature = `${i18n.locale}:${choices.map((choice) => `${choice.id}:${this.game.stack?.(choice.id) || 0}`).join('|')}`;
    if (!force && signature === this.lastUpgradeSignature) return;
    this.lastUpgradeSignature = signature;

    const grid = this.root.querySelector('[data-upgrade-grid]');
    if (!grid) return;
    grid.innerHTML = choices.map((upgrade, index) => {
      const current = this.game.stack?.(upgrade.id) || 0;
      const next = Math.min(upgrade.maxStacks, current + 1);
      const atMax = current >= upgrade.maxStacks;
      return `
        <button class="upgrade-card surface upgrade-card--${upgrade.id}" type="button" data-action="upgrade-${index}" data-interactive ${atMax ? 'disabled' : ''}>
          <div class="upgrade-card__top">
            <span class="upgrade-card__index" dir="ltr">${String(index + 1).padStart(2, '0')}</span>
            <span class="upgrade-card__tag">${i18n.t(`upgrade.${upgrade.id}.tag`)}</span>
          </div>
          <span class="upgrade-card__icon">${iconSvg(upgradeIconName(upgrade.id))}</span>
          <h3>${i18n.t(`upgrade.${upgrade.id}.name`)}</h3>
          <p>${i18n.t(`upgrade.${upgrade.id}.description`)}</p>
          <div class="upgrade-card__footer">
            <span>${atMax ? i18n.t('upgrade.max') : i18n.t('upgrade.select')}</span>
            <strong dir="ltr">${current} → ${next}</strong>
          </div>
        </button>`;
    }).join('');
  }

  syncGameOver() {
    const game = this.game;
    const stageIndex = stageIndexForWave(game.wave);
    setText(this.bindings.get('gameover-score'), formatNumber(game.score));
    setText(this.bindings.get('gameover-wave'), formatNumber(game.wave));
    setText(this.bindings.get('gameover-high-score'), formatNumber(game.highScore));
    setText(this.bindings.get('gameover-sector'), i18n.t(`stage.${stageIndex}`));
    setHidden(this.root.querySelector('[data-gameover-continue]'), !game.hasContinueCheckpoint?.());
  }

  syncSettings() {
    const popover = this.root.querySelector('[data-settings-popover]');
    setHidden(popover, !this.settingsOpen);
    const audioButton = this.root.querySelector('[data-action="audio"]');
    const muted = Boolean(this.game.audio?.settings?.muted);
    if (audioButton) {
      const host = audioButton.querySelector('[data-icon-host="audio"]');
      if (host) host.innerHTML = iconSvg(muted ? 'audioOff' : 'audio');
      setPressed(audioButton, !muted);
    }

    setText(this.bindings.get('settings-audio'), i18n.t(muted ? 'menu.muted' : 'menu.soundOn'));
    setText(this.bindings.get('settings-language'), i18n.locale.toUpperCase());
    const viewport = this.viewport?.getSnapshot?.();
    if (viewport) {
      setText(
        this.bindings.get('settings-render'),
        `${viewport.backingWidth}×${viewport.backingHeight} · DPR ${viewport.effectiveDpr.toFixed(2)}`,
      );
    }
  }

  destroy() {
    window.removeEventListener('keydown', this.onUpgradeKeyDown);
    this.root.replaceChildren();
  }
}
