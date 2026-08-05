import { OneBulletGame } from './game.js';

const canvas = document.querySelector('#game-canvas');
const liveRegion = document.querySelector('#game-status');
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('تعذر العثور على لوحة اللعبة.');

canvas.tabIndex = 0;
canvas.addEventListener('pointerdown', () => canvas.focus());

const game = new OneBulletGame(canvas, liveRegion);
window.__ONE_BULLET_ARENA__ = game;

document.addEventListener('keydown', async (event) => {
  if (event.key.toLowerCase() !== 'f') return;
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    // Fullscreen is optional and never blocks gameplay.
  }
});

if ('serviceWorker' in navigator && !location.search.includes('qa=1')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
