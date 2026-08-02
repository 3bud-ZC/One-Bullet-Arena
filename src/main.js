import { OneBulletArena } from './game.js';
import { installPhysicalKeyboardBridge } from './input.js';

installPhysicalKeyboardBridge();

const canvas = document.querySelector('#game-canvas');
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('تعذر العثور على لوحة اللعبة.');
}

canvas.tabIndex = 0;
canvas.addEventListener('pointerdown', () => canvas.focus());

new OneBulletArena(canvas);
