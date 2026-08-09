import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { VISUAL_OVERHAUL_RUNTIME_VERSION, ambientNodeVariant, visualOverhaulTokens } from '../src/core/visual-overhaul-runtime.js';

test('visual overhaul runtime exposes a render-only contract', () => {
  const tokens = visualOverhaulTokens();
  assert.equal(VISUAL_OVERHAUL_RUNTIME_VERSION, '3.3.0-visual-overhaul');
  assert.equal(tokens.version, VISUAL_OVERHAUL_RUNTIME_VERSION);
  assert.equal(tokens.style, 'cinematic-industrial-2d');
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
});

test('legacy presentation layers remain below one canonical global UI owner', async () => {
  const mainSource = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  const workerSource = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  const dashboardSource = await readFile(new URL('../src/core/dashboard-polish-runtime.js', import.meta.url), 'utf8');
  const expansionSource = await readFile(new URL('../src/core/world-expansion-runtime.js', import.meta.url), 'utf8');
  const unifiedSource = await readFile(new URL('../src/core/unified-ui-runtime.js', import.meta.url), 'utf8');
  const productionSource = await readFile(new URL('../src/core/production-art-runtime.js', import.meta.url), 'utf8');
  const globalSource = await readFile(new URL('../src/core/ui-repair-runtime.js', import.meta.url), 'utf8');
  assert.match(dashboardSource, /extends OneBulletVisualOverhaulRuntime/);
  assert.match(expansionSource, /extends OneBulletDashboardPolishRuntime/);
  assert.match(unifiedSource, /extends OneBulletWorldExpansionRuntime/);
  assert.match(productionSource, /extends OneBulletUnifiedUiRuntime/);
  assert.match(globalSource, /class OneBulletGlobalUiRuntime extends OneBulletProductionArtRuntime/);
  assert.match(globalSource, /smooth-fixedstep-presentation-v1/);
  assert.match(globalSource, /CanvasViewport/);
  assert.match(globalSource, /DomUiController/);
  assert.match(globalSource, /FixedStepClock/);
  assert.match(globalSource, /AdaptiveQualityManager/);
  assert.match(mainSource, /OneBulletGlobalUiRuntime/);
  assert.match(workerSource, /\.\/src\/ui\/dom-ui\.js/);
  assert.match(workerSource, /\.\/src\/render\/canvas-viewport\.js/);
  assert.match(workerSource, /\.\/src\/performance\/frame-pacer\.js/);
  assert.match(workerSource, /\.\/src\/core\/ui-repair-runtime\.js/);
});
