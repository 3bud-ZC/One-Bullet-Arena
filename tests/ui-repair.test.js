import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  GLOBAL_UI_RUNTIME_VERSION,
  GLOBAL_UI_REVISION,
  UI_REPAIR_RUNTIME_VERSION,
} from '../src/core/ui-repair-runtime.js';

test('canonical UI runtime exposes the v3.6.1 refinement contract', () => {
  assert.equal(GLOBAL_UI_RUNTIME_VERSION, '3.6.2-dashboard-command');
  assert.equal(UI_REPAIR_RUNTIME_VERSION, GLOBAL_UI_RUNTIME_VERSION);
  assert.equal(GLOBAL_UI_REVISION, 'dashboard-reference-v2');
});

test('global UI runtime canonically owns player-facing refinement without gameplay mutation', async () => {
  const source = await readFile(new URL('../src/core/ui-repair-runtime.js', import.meta.url), 'utf8');
  assert.match(source, /class OneBulletGlobalUiRuntime extends OneBulletProductionArtRuntime/);
  assert.match(source, /drawMenu\(\)/);
  assert.match(source, /drawHud\(\)/);
  assert.match(source, /drawMiniMap\(\)/);
  assert.match(source, /drawTouchControls\(\)/);
  assert.match(source, /drawPause\(\)/);
  assert.match(source, /drawGameOver\(\)/);
  assert.match(source, /drawUpgradeSelection\(\)/);
  assert.match(source, /drawBanner\(\)/);
  assert.match(source, /drawPlayer\(\)/);
  assert.match(source, /drawBullet\(\)/);
  assert.match(source, /const result = super\.setState\(state\)/);
  assert.match(source, /const result = super\.startNextWave\(\)/);
  assert.doesNotMatch(source, /update\(dt\)/);
  assert.doesNotMatch(source, /drawArena\(\)/);
});

test('refinement uses centralized localization, spacing, icons, and semantic upgrade comparison', async () => {
  const source = await readFile(new URL('../src/core/ui-repair-runtime.js', import.meta.url), 'utf8');
  const i18nSource = await readFile(new URL('../src/i18n.js', import.meta.url), 'utf8');
  const systemSource = await readFile(new URL('../src/ui-system.js', import.meta.url), 'utf8');
  assert.match(source, /from '\.\.\/i18n\.js'/);
  assert.match(source, /from '\.\.\/ui-system\.js'/);
  assert.match(source, /presentationOwner: 'OneBulletGlobalUiRuntime'/);
  assert.match(source, /uiDensity: 'production-refined'/);
  assert.match(source, /visualRefinementActive: true/);
  assert.match(source, /responsiveHudRefinement: true/);
  assert.match(source, /semanticUpgradeDirection: 'current-to-new'/);
  assert.match(source, /languageSelector\(/);
  assert.match(source, /upgradeVisual\(/);
  assert.match(source, /return `\$\{values\.current\} → \$\{values\.next\}`/);
  assert.match(i18nSource, /LANGUAGE_STORAGE_KEY = 'one-bullet-language'/);
  assert.match(systemSource, /drawTrajectoryBackground/);
  assert.match(systemSource, /drawUiIcon/);
  assert.match(systemSource, /case 'language'/);
  assert.match(systemSource, /case 'health'/);
  assert.match(systemSource, /case 'shield'/);
  assert.match(systemSource, /case 'ricochet'/);
  assert.match(systemSource, /spacing: Object\.freeze/);
});
