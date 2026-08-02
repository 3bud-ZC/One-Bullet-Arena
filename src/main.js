import { OneBulletArena } from './game.js';

const canvas = document.querySelector('#game-canvas');
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Game canvas was not found.');
}

new OneBulletArena(canvas);
