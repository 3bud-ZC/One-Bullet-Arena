import { SimpleOneBulletArena } from './simple-game.js';
import { installSimpleUiCleanup } from './simple-ui-cleanup.js';

const canvas = document.querySelector('#game-canvas');
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('تعذر العثور على لوحة اللعبة.');

canvas.tabIndex = 0;
canvas.addEventListener('pointerdown', () => canvas.focus());

const game = new SimpleOneBulletArena(canvas);
installSimpleUiCleanup(game);
window.__ONE_BULLET_ARENA__ = game;

document.addEventListener('keydown', async (event) => {
  if (event.key.toLowerCase() !== 'f') return;
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    // Fullscreen support is optional and does not affect gameplay.
  }
});

if ('serviceWorker' in navigator && !location.search.includes('qa=1')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
