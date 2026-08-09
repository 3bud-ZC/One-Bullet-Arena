import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  UI_REPAIR_RUNTIME_VERSION,
  UI_REPAIR_REVISION,
} from '../src/core/ui-repair-runtime.js';

test('UI repair runtime exposes the v3.5.1 presentation contract', () => {
  assert.equal(UI_REPAIR_RUNTIME_VERSION, '3.5.1-ui-repair');
  assert.equal(UI_REPAIR_REVISION, 'production-ui-repair-v1');
});

test('UI repair owns the high-value interface surfaces only', async () => {
  const source = await readFile(new URL('../src/core/ui-repair-runtime.js', import.meta.url), 'utf8');
  assert.match(source, /extends OneBulletProductionArtRuntime/);
  assert.match(source, /drawMenu\(\)/);
  assert.match(source, /drawHud\(\)/);
  assert.match(source, /drawMiniMap\(\)/);
  assert.match(source, /drawPause\(\)/);
  assert.match(source, /drawGameOver\(\)/);
  assert.match(source, /drawUpgradeSelection\(\)/);
  assert.doesNotMatch(source, /drawArena\(\)/);
  assert.doesNotMatch(source, /update\(dt\)/);
});

test('UI repair locks balanced density and world progression affordances', async () => {
  const source = await readFile(new URL('../src/core/ui-repair-runtime.js', import.meta.url), 'utf8');
  assert.match(source, /uiDensity: 'balanced-production'/);
  assert.match(source, /WORLD PROGRESSION/);
  assert.match(source, /RUN INTELLIGENCE/);
  assert.match(source, /CHECKPOINT READY/);
  assert.match(source, /NEXT EXPANSION/);
  assert.match(source, /F  FULLSCREEN/);
});
