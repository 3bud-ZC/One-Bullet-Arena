import { OneBulletArena } from './game.js';
import { installPhysicalKeyboardBridge } from './input.js';
import { attachPresentationControls, installUiPolish } from './ui-polish.js';
import { installUiPolishFixes } from './ui-polish-fixes.js';
import { attachStabilizationControls, installStabilization } from './stabilization.js';
import { installDefeatUiRefine } from './defeat-ui-refine.js';
import { installVisualIdentity } from './visual-identity.js';
import { attachProgressionControls, installProgression } from './progression.js';
import { attachReplayabilityControls, installReplayability } from './replayability.js';
import { installReplayabilityPersistence } from './replayability-persistence.js';
import { installUiFeedbackBalance } from './ui-feedback-balance.js';
import { installAccuracySemanticsFix } from './accuracy-semantics-fix.js';
import { installLiveQaRegions } from './live-qa-regions.js';
import { installRegionRuntimeFixes } from './regions-runtime-fixes.js';
import { attachMobileBrowser, installMobileBrowser } from './mobile-browser.js';
import { installRegionEnemies } from './region-enemies.js';

installPhysicalKeyboardBridge();
installUiPolish(OneBulletArena);
installUiPolishFixes(OneBulletArena);
installStabilization(OneBulletArena);
installDefeatUiRefine(OneBulletArena);
installVisualIdentity(OneBulletArena);
installProgression(OneBulletArena);
installReplayability(OneBulletArena);
installReplayabilityPersistence(OneBulletArena);
installUiFeedbackBalance(OneBulletArena);
installAccuracySemanticsFix(OneBulletArena);
installLiveQaRegions(OneBulletArena);
installRegionRuntimeFixes(OneBulletArena);
installMobileBrowser(OneBulletArena);
installRegionEnemies(OneBulletArena);

const canvas = document.querySelector('#game-canvas');
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('تعذر العثور على لوحة اللعبة.');
}

canvas.tabIndex = 0;
canvas.addEventListener('pointerdown', () => canvas.focus());

const game = new OneBulletArena(canvas);
attachPresentationControls(game);
attachStabilizationControls(game);
attachProgressionControls(game);
attachReplayabilityControls(game);
attachMobileBrowser(game);
game.requestProgressionReset = game.resetProgressionSave;
