import { OneBulletArena } from './game.js';
import { installPhysicalKeyboardBridge } from './input.js';
import { attachPresentationControls, installUiPolish } from './ui-polish.js';

installPhysicalKeyboardBridge();
installUiPolish(OneBulletArena);

const canvas = document.querySelector('#game-canvas');
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('تعذر العثور على لوحة اللعبة.');
}

canvas.tabIndex = 0;
canvas.addEventListener('pointerdown', () => canvas.focus());

const game = new OneBulletArena(canvas);
attachPresentationControls(game);
