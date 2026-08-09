import { OneBulletProductionArtRuntime } from './core/production-art-runtime.js';
import { RELEASE_INFO } from './release.js';

migrateLegacyStorage();

const canvas = document.querySelector('#game-canvas');
const liveRegion = document.querySelector('#game-status');
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('تعذر العثور على لوحة اللعبة.');

const qaMode = new URLSearchParams(location.search).get('qa') === '1';
canvas.tabIndex = 0;
canvas.addEventListener('pointerdown', () => {
  canvas.focus();
  if (!qaMode && !document.fullscreenElement) requestGameFullscreen();
});

const game = new OneBulletProductionArtRuntime(canvas, liveRegion);
if (qaMode) {
  window.__ONE_BULLET_ARENA__ = game;
  window.__ONE_BULLET_RELEASE__ = RELEASE_INFO;
  window.__ONE_BULLET_EVENTS__ = game.eventBus;
  window.__ONE_BULLET_CHECKPOINT__ = game.checkpointStore;
}

document.addEventListener('keydown', async (event) => {
  const key = event.key.toLowerCase();
  if (!qaMode && !document.fullscreenElement && ['enter', ' '].includes(key)) {
    await requestGameFullscreen();
    return;
  }
  if (key !== 'f') return;
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await requestGameFullscreen();
  } catch {
    // Fullscreen is optional and never blocks gameplay.
  }
});

async function requestGameFullscreen() {
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    }
  } catch {
    // Browsers can deny fullscreen outside a direct user gesture.
  }
}

if ('serviceWorker' in navigator && !qaMode) {
  registerServiceWorker().catch(() => {
    // Offline support must never block the game from starting.
  });
}

async function registerServiceWorker() {
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloadHandled = false;

  if (hadController) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloadHandled) return;
      const reloadKey = `one-bullet-release-reloaded:${RELEASE_INFO.version}`;
      try {
        if (sessionStorage.getItem(reloadKey) === '1') return;
        sessionStorage.setItem(reloadKey, '1');
      } catch {
        // Restricted session storage should not prevent a safe reload.
      }
      reloadHandled = true;
      location.reload();
    });
  }

  const registration = await navigator.serviceWorker.register('./sw.js', {
    updateViaCache: 'none',
  });

  await registration.update();
}

function migrateLegacyStorage() {
  const migrations = [
    ['one-bullet-simple-high-score', 'one-bullet-clean-high-score'],
    ['one-bullet-simple-high-wave', 'one-bullet-clean-high-wave'],
    ['one-bullet-arena-audio-settings', 'one-bullet-clean-audio'],
  ];
  try {
    for (const [legacyKey, currentKey] of migrations) {
      if (localStorage.getItem(currentKey) !== null) continue;
      const legacyValue = localStorage.getItem(legacyKey);
      if (legacyValue !== null) localStorage.setItem(currentKey, legacyValue);
    }
  } catch {
    // Restricted storage must never prevent the game from starting.
  }
}
