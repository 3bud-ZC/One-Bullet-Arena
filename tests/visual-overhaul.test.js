import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  VISUAL_OVERHAUL_RUNTIME_VERSION,
  ambientNodeVariant,
  visualOverhaulTokens,
} from '../src/core/visual-overhaul-runtime.js';

test('visual overhaul runtime exposes a render-only contract', () => {
  const tokens = visualOverhaulTokens();
  assert.equal(VISUAL_OVERHAUL_RUNTIME_VERSION, '3.3.0-visual-overhaul');
  assert.equal(tokens.version, VISUAL_OVERHAUL_RUNTIME_VERSION);
  assert.equal(tokens.style, 'cinematic-industrial-2d');
  assert.equal(tokens.hudStyle, 'combat-glass');
  assert.equal(tokens.environmentPasses, 4);
  assert.equal(tokens.renderOnly, true);
  assert.equal(tokens.gameplayGeometryChanged, false);
  assert.equal(tokens.collisionGeometryChanged, false);
  assert.ok(Object.isFrozen(tokens));
});

test('ambient node variants are deterministic and bounded', () => {
  const first = Array.from({ length: 30 }, (_, index) => ambientNodeVariant(index, 2));
  const second = Array.from({ length: 30 }, (_, index) => ambientNodeVariant(index, 2));
  assert.deepEqual(first, second);
  assert.ok(first.every((value) => value >= 0 && value <= 4));
  assert.ok(new Set(first).size >= 4);
});

test('visual overhaul extends the accepted world runtime without gameplay mutation', async () => {
  const source = await readFile(new URL('../src/core/visual-overhaul-runtime.js', import.meta.url), 'utf8');
  assert.match(source, /extends OneBulletWorld2DRuntime/);
  assert.match(source, /super\.update\(dt\)/);
  assert.match(source, /gameplayGeometryChanged: false/);
  assert.match(source, /collisionGeometryChanged: false/);
  assert.match(source, /visualOverhaulActive: true/);
  assert.doesNotMatch(source, /arenaStage\.bounds\s*=/);
  assert.doesNotMatch(source, /arenaStage\.obstacles\s*=/);
  assert.doesNotMatch(source, /player\.speed\s*=/);
  assert.doesNotMatch(source, /enemy\.speed\s*=/);
});

test('visual overhaul remains active under the art-direction top runtime', async () => {
  const mainSource = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  const artSource = await readFile(new URL('../src/core/art-direction-runtime.js', import.meta.url), 'utf8');
  const workerSource = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(mainSource, /OneBulletArtDirectionRuntime/);
  assert.match(artSource, /extends OneBulletVisualOverhaulRuntime/);
  assert.match(workerSource, /\.\/src\/core\/visual-overhaul-runtime\.js/);
  assert.match(workerSource, /\.\/src\/core\/art-direction-runtime\.js/);
});
