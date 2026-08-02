import { OneBulletArena } from './game.js';
import { installPhysicalKeyboardBridge } from './input.js';
import { attachPresentationControls, installUiPolish } from './ui-polish.js';
import { installUiPolishFixes } from './ui-polish-fixes.js';
import { attachStabilizationControls, installStabilization } from './stabilization.js';
import { installDefeatUiRefine } from './defeat-ui-refine.js';
import { installVisualIdentity } from './visual-identity.js';

installPhysicalKeyboardBridge();
installUiPolish(OneBulletArena);
installUiPolishFixes(OneBulletArena);
installStabilization(OneBulletArena);
installDefeatUiRefine(OneBulletArena);
installVisualIdentity(OneBulletArena);

const canvas = document.querySelector('#game-canvas');
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('تعذر العثور على لوحة اللعبة.');
}

canvas.tabIndex = 0;
canvas.addEventListener('pointerdown', () => canvas.focus());

const game = new OneBulletArena(canvas);
attachPresentationControls(game);
attachStabilizationControls(game);
