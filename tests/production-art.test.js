import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  PRODUCTION_ART_RUNTIME_VERSION,
  PRODUCTION_ART_REVISION,
} from '../src/core/production-art-runtime.js';

test('production art runtime exposes the v3.5 presentation layer', () => {
  assert.equal(PRODUCTION_ART_RUNTIME_VERSION, '3.5.0-production-art');
  assert.equal(PRODUCTION_ART_REVISION, 'production-command-suite-v1');
});

test('production art owns the complete presentation surface without replacing gameplay systems', async () => {
  const source = await readFile(new URL('../src/core/production-art-runtime.js', import.meta.url), 'utf8');
  assert.match(source, /extends OneBulletUnifiedUiRuntime/);
  assert.match(source, /drawMenu\(\)/);
  assert.match(source, /drawHud\(\)/);
  assert.match(source, /drawMiniMap\(\)/);
  assert.match(source, /drawArena\(\)/);
  assert.match(source, /super\.drawArena\(\)/);
  assert.match(source, /drawPause\(\)/);
  assert.match(source, /drawGameOver\(\)/);
  assert.match(source, /drawUpgradeSelection\(\)/);
  assert.match(source, /productionDashboard: true/);
  assert.match(source, /productionCombatHud: true/);
  assert.match(source, /productionArenaPass: true/);
  assert.match(source, /productionOverlaySuite: true/);
});

test('production dashboard carries progression, checkpoint, and fullscreen affordances', async () => {
  const source = await readFile(new URL('../src/core/production-art-runtime.js', import.meta.url), 'utf8');
  assert.match(source, /WORLD PROGRESSION/);
  assert.match(source, /NEXT EXPANSION/);
  assert.match(source, /CHECKPOINT READY/);
  assert.match(source, /متابعة من الموجة/);
  assert.match(source, /F  FULLSCREEN/);
  assert.match(source, /SINGLE ROUND  \/  ZERO WASTE/);
});
