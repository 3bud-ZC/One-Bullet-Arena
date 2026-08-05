import { OneBulletGame } from './game.js';
import { migrateLegacyStorage } from './storage.js';

migrateLegacyStorage();

const canvas = document.querySelector('#game-canvas');
const liveRegion = document.querySelector('#game-status');
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('تعذر العثور على لوحة اللعبة.');

canvas.tabIndex = 0;
canvas.addEventListener('pointerdown', () => canvas.focus());

const game = new OneBulletGame(canvas, liveRegion);
document.documentElement.dataset.gameReady = 'true';

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
