import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { UNIFIED_UI_RUNTIME_VERSION } from '../src/core/unified-ui-runtime.js';

test('unified UI runtime exposes the v3.4 interface layer', () => {
  assert.equal(UNIFIED_UI_RUNTIME_VERSION, '3.4.0-unified-ui');
});

test('unified UI owns all major non-combat overlays', async () => {
  const source = await readFile(new URL('../src/core/unified-ui-runtime.js', import.meta.url), 'utf8');
  assert.match(source, /extends OneBulletWorldExpansionRuntime/);
  assert.match(source, /drawUpgradeSelection\(\)/);
  assert.match(source, /drawPause\(\)/);
  assert.match(source, /drawGameOver\(\)/);
  assert.match(source, /drawBanner\(\)/);
  assert.match(source, /drawTouchControls\(\)/);
  assert.match(source, /continueFromCheckpoint\(\)/);
  assert.match(source, /unifiedInterfaceLanguage: true/);
  assert.match(source, /unifiedUpgradeCards: true/);
  assert.match(source, /unifiedPauseOverlay: true/);
  assert.match(source, /unifiedGameOverOverlay: true/);
});

test('main boots the unified UI runtime and preserves fullscreen entry', async () => {
  const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /OneBulletUnifiedUiRuntime/);
  assert.match(main, /requestFullscreen/);
  assert.match(main, /navigationUI: 'hide'/);
  assert.match(main, /event\.key\.toLowerCase\(\) !== 'f'/);
});
