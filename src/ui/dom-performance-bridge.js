import { i18n } from '../i18n.js';
import { iconSvg } from './icons.js';

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function formatNumber(value) {
  return i18n.number(Math.max(0, Math.trunc(Number(value) || 0)));
}

function setText(element, value) {
  if (!element) return false;
  const text = String(value ?? '');
  if (element.textContent === text) return false;
  element.textContent = text;
  return true;
}

function setHidden(element, hidden) {
  if (!element) return false;
  const next = Boolean(hidden);
  if (element.hidden === next) return false;
  element.hidden = next;
  return true;
}

function setPressed(element, pressed) {
  if (!element) return false;
  const next = Boolean(pressed);
  const value = next ? 'true' : 'false';
  let changed = false;
  if (element.getAttribute('aria-pressed') !== value) {
    element.setAttribute('aria-pressed', value);
    changed = true;
  }
  if (element.classList.contains('is-active') !== next) {
    element.classList.toggle('is-active', next);
    changed = true;
  }
  return changed;
}

function setAttributeIfChanged(element, name, value) {
  if (!element) return false;
  const text = String(value);
  if (element.getAttribute(name) === text) return false;
  element.setAttribute(name, text);
  return true;
}

export function installDomPerformanceBridge(controller) {
  if (!controller?.root) return null;
  const root = controller.root;
  const gauges = new Map(
    [...root.querySelectorAll('[data-gauge]')].map((element) => [element.dataset.gauge, element]),
  );
  const minimap = root.querySelector('[data-minimap]');
  const trailElement = root.querySelector('[data-minimap-trail]');
  const viewportElement = root.querySelector('[data-minimap-viewport]');
  const playerElement = root.querySelector('[data-minimap-player]');
  const shieldIndicator = root.querySelector('[data-shield-indicator]');
  const toolbar = root.querySelector('[data-toolbar]');
  const settingsPopover = root.querySelector('[data-settings-popover]');
  const audioButton = root.querySelector('[data-action="audio"]');
  const audioIconHost = audioButton?.querySelector('[data-icon-host="audio"]') || null;
  const progressionLine = root.querySelector('[data-progress-line]');

  const stats = {
    gaugeWrites: 0,
    minimapTrailRebuilds: 0,
    minimapMarkerWrites: 0,
    minimapSyncs: 0,
    minimapSkips: 0,
    hudSyncs: 0,
    settingsSyncs: 0,
    stateSyncs: 0,
    stateTransitions: 0,
    touchModeWrites: 0,
  };
  let trailSignature = '';
  let cachedBoundsSignature = '';
  let projectedTrail = '';
  let lastAudioIcon = '';
  let lastMinimapSyncMs = -Infinity;
  let lastTouchMode = null;

  controller.performanceElements = Object.freeze({
    gauges,
    minimap,
    trailElement,
    viewportElement,
    playerElement,
    shieldIndicator,
    toolbar,
    settingsPopover,
    audioButton,
    audioIconHost,
    progressionLine,
  });

  controller.setGauge = (name, value) => {
    const element = gauges.get(name);
    if (!element) return;
    const next = clamp01(value).toFixed(4);
    if (element.style.getPropertyValue('--value') === next) return;
    element.style.setProperty('--value', next);
    stats.gaugeWrites += 1;
  };

  controller.syncMinimap = (force = false, timeMs = globalThis.performance?.now?.() || 0) => {
    const game = controller.game;
    const bounds = game.arenaStage?.bounds;
    const shouldShow = Boolean(bounds && (game.arenaStage?.id || 0) >= 4 && !game.touchMode);
    setHidden(minimap, !shouldShow);
    if (!shouldShow) return;

    const minimapHz = Math.max(5, Number(game.activeQualityProfile?.minimapHz) || 24);
    const interval = 1000 / minimapHz;
    if (!force && timeMs - lastMinimapSyncMs < interval) {
      stats.minimapSkips += 1;
      return;
    }
    lastMinimapSyncMs = timeMs;
    stats.minimapSyncs += 1;

    const width = Math.max(1, Number(bounds.w) || 1);
    const height = Math.max(1, Number(bounds.h) || 1);
    const projectX = (x) => clamp01(((Number(x) || 0) - bounds.x) / width) * 158 + 1;
    const projectY = (y) => clamp01(((Number(y) || 0) - bounds.y) / height) * 94 + 1;
    const trail = game.explorationTrail || [];
    const last = trail.at?.(-1) || trail[trail.length - 1];
    const boundsSignature = `${bounds.x}:${bounds.y}:${width}:${height}`;
    const nextTrailSignature = `${trail.length}:${Number(last?.x || 0).toFixed(1)}:${Number(last?.y || 0).toFixed(1)}:${boundsSignature}`;

    if (nextTrailSignature !== trailSignature || boundsSignature !== cachedBoundsSignature) {
      projectedTrail = trail.map((point, index) => {
        const x = projectX(point?.x).toFixed(2);
        const y = projectY(point?.y).toFixed(2);
        return `${index ? 'L' : 'M'}${x} ${y}`;
      }).join(' ');
      setAttributeIfChanged(trailElement, 'd', projectedTrail);
      trailSignature = nextTrailSignature;
      cachedBoundsSignature = boundsSignature;
      stats.minimapTrailRebuilds += 1;
    }

    const viewport = game.viewportWorldBounds?.();
    if (viewport && viewportElement) {
      const viewW = Math.max(1, Math.min(158, (viewport.w / width) * 158));
      const viewH = Math.max(1, Math.min(94, (viewport.h / height) * 94));
      const x = Math.max(1, Math.min(159 - viewW, projectX(viewport.x))).toFixed(2);
      const y = Math.max(1, Math.min(95 - viewH, projectY(viewport.y))).toFixed(2);
      stats.minimapMarkerWrites += Number(setAttributeIfChanged(viewportElement, 'x', x));
      stats.minimapMarkerWrites += Number(setAttributeIfChanged(viewportElement, 'y', y));
      stats.minimapMarkerWrites += Number(setAttributeIfChanged(viewportElement, 'width', viewW.toFixed(2)));
      stats.minimapMarkerWrites += Number(setAttributeIfChanged(viewportElement, 'height', viewH.toFixed(2)));
    }

    if (playerElement) {
      stats.minimapMarkerWrites += Number(setAttributeIfChanged(playerElement, 'cx', projectX(game.player?.x).toFixed(2)));
      stats.minimapMarkerWrites += Number(setAttributeIfChanged(playerElement, 'cy', projectY(game.player?.y).toFixed(2)));
    }
    const sector = controller.bindings?.get?.('minimap-sector');
    setText(sector, String((game.arenaStage?.id || 0) + 1).padStart(2, '0'));
  };

  controller.syncHud = (force = false, timeMs = globalThis.performance?.now?.() || 0) => {
    stats.hudSyncs += 1;
    const game = controller.game;
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

    setText(controller.bindings.get('hud-bullet'), i18n.t(bulletKey));
    setText(controller.bindings.get('hud-wave'), formatNumber(game.wave));
    setText(controller.bindings.get('hud-encounter'), i18n.t(`encounter.${game.currentEncounter?.id || 'foundation'}`));
    setText(controller.bindings.get('hud-enemies'), formatNumber(game.enemies?.length || 0));
    setText(controller.bindings.get('hud-score'), formatNumber(game.score));
    setText(controller.bindings.get('hud-sector'), formatNumber((game.arenaStage?.id || 0) + 1));
    setText(controller.bindings.get('hud-health'), `${formatNumber(health)}/${formatNumber(maxHealth)}`);
    setText(controller.bindings.get('hud-shield'), formatNumber(game.player?.shield || 0));
    controller.setGauge('health', healthRatio);
    controller.setGauge('dash', dashRatio);
    controller.setGauge('recall', recallRatio);
    setHidden(shieldIndicator, !(Number(game.player?.shield) > 0));
    controller.syncMinimap(force, timeMs);
  };

  controller.syncSettings = () => {
    stats.settingsSyncs += 1;
    setHidden(settingsPopover, !controller.settingsOpen);
    const muted = Boolean(controller.game.audio?.settings?.muted);
    const icon = muted ? 'audioOff' : 'audio';
    if (audioIconHost && icon !== lastAudioIcon) {
      audioIconHost.innerHTML = iconSvg(icon);
      lastAudioIcon = icon;
    }
    setPressed(audioButton, !muted);
    setText(controller.bindings.get('settings-audio'), i18n.t(muted ? 'menu.muted' : 'menu.soundOn'));
    setText(controller.bindings.get('settings-language'), i18n.locale.toUpperCase());
    const viewport = controller.viewport?.getSnapshot?.();
    if (viewport) {
      setText(
        controller.bindings.get('settings-render'),
        `${viewport.backingWidth}×${viewport.backingHeight} · DPR ${viewport.effectiveDpr.toFixed(2)}`,
      );
    }
  };

  controller.sync = (force = false, timeMs = globalThis.performance?.now?.() || 0) => {
    stats.stateSyncs += 1;
    if (controller.locale !== i18n.locale) controller.localize();
    const state = controller.game.state;
    const stateChanged = controller.lastState !== state;
    const touchMode = Boolean(controller.game.touchMode);

    if (lastTouchMode !== touchMode) {
      lastTouchMode = touchMode;
      root.classList.toggle('is-touch', touchMode);
      stats.touchModeWrites += 1;
    }

    if (stateChanged) {
      controller.lastState = state;
      controller.settingsOpen = false;
      root.dataset.state = state;
      document.body.dataset.gameState = state;
      for (const [name, screen] of controller.screens) setHidden(screen, name !== state);
      setHidden(toolbar, !['menu', 'paused'].includes(state));
      stats.stateTransitions += 1;
    }

    if (state === 'menu') controller.syncMenu();
    else if (state === 'playing') controller.syncHud(force || stateChanged, timeMs);
    else if (state === 'paused') controller.syncPause();
    else if (state === 'upgrade') controller.syncUpgrade(force);
    else if (state === 'gameover') controller.syncGameOver();

    // Settings are only visible/interactive in menu or pause. Avoid the old
    // unconditional settings DOM work in the high-frequency gameplay path.
    if (['menu', 'paused'].includes(state)) controller.syncSettings();
  };

  return Object.freeze({
    getSnapshot() {
      return {
        cachedGaugeCount: gauges.size,
        minimapTrailRebuilds: stats.minimapTrailRebuilds,
        minimapMarkerWrites: stats.minimapMarkerWrites,
        minimapSyncs: stats.minimapSyncs,
        minimapSkips: stats.minimapSkips,
        gaugeWrites: stats.gaugeWrites,
        hudSyncs: stats.hudSyncs,
        settingsSyncs: stats.settingsSyncs,
        stateSyncs: stats.stateSyncs,
        stateTransitions: stats.stateTransitions,
        touchModeWrites: stats.touchModeWrites,
        gameplayQueryFreeSync: true,
      };
    },
  });
}
