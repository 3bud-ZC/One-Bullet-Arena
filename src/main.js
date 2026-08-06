import { OneBulletUiLayoutRuntime } from './ui-layout-runtime.js';
import { RELEASE_INFO } from './release.js';

migrateLegacyStorage();

const canvas = document.querySelector('#game-canvas');
const liveRegion = document.querySelector('#game-status');
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('تعذر العثور على لوحة اللعبة.');

canvas.tabIndex = 0;
canvas.addEventListener('pointerdown', () => canvas.focus());

const game = new OneBulletUiLayoutRuntime(canvas, liveRegion);
const qaMode = new URLSearchParams(location.search).get('qa') === '1';
if (qaMode) {
  window.__ONE_BULLET_ARENA__ = game;
  window.__ONE_BULLET_RELEASE__ = RELEASE_INFO;
}

document.addEventListener('keydown', async (event) => {
  if (event.key.toLowerCase() !== 'f') return;
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    // Fullscreen is optional and never blocks gameplay.
  }
});

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
