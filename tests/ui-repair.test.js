import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  GLOBAL_UI_RUNTIME_VERSION,
  GLOBAL_UI_REVISION,
  UI_REPAIR_RUNTIME_VERSION,
} from '../src/core/ui-repair-runtime.js';

test('canonical UI runtime exposes the v3.6 global presentation contract', () => {
  assert.equal(GLOBAL_UI_RUNTIME_VERSION, '3.6.0-global-ui');
  assert.equal(UI_REPAIR_RUNTIME_VERSION, GLOBAL_UI_RUNTIME_VERSION);
  assert.equal(GLOBAL_UI_REVISION, 'global-command-interface-v1');
});

test('global UI runtime canonically owns all player-facing surfaces without gameplay mutation', async () => {
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
  assert.doesNotMatch(source, /update\(dt\)/);
  assert.doesNotMatch(source, /drawArena\(\)/);
});

test('global UI is localized and uses a reusable visual system', async () => {
  const source = await readFile(new URL('../src/core/ui-repair-runtime.js', import.meta.url), 'utf8');
  const i18nSource = await readFile(new URL('../src/i18n.js', import.meta.url), 'utf8');
  const systemSource = await readFile(new URL('../src/ui-system.js', import.meta.url), 'utf8');
  assert.match(source, /from '\.\.\/i18n\.js'/);
  assert.match(source, /from '\.\.\/ui-system\.js'/);
  assert.match(source, /presentationOwner: 'OneBulletGlobalUiRuntime'/);
  assert.match(source, /uiDensity: 'game-command-surface'/);
  assert.match(source, /bilingualUi: true/);
  assert.match(i18nSource, /LANGUAGE_STORAGE_KEY = 'one-bullet-language'/);
  assert.match(i18nSource, /browser language|navigator\?\.language/);
  assert.match(systemSource, /drawTrajectoryBackground/);
  assert.match(systemSource, /drawBulletGlyph/);
  assert.match(systemSource, /drawLocalizedText/);
});
