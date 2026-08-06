import { OneBulletPolishRuntime } from './polish-runtime.js';

migrateLegacyStorage();

const canvas = document.querySelector('#game-canvas');
const liveRegion = document.querySelector('#game-status');
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('تعذر العثور على لوحة اللعبة.');

canvas.tabIndex = 0;
canvas.addEventListener('pointerdown', () => canvas.focus());

const game = new OneBulletPolishRuntime(canvas, liveRegion);
const qaMode = new URLSearchParams(location.search).get('qa') === '1';
if (qaMode) window.__ONE_BULLET_ARENA__ = game;

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
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
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
