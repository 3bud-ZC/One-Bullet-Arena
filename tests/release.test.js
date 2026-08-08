import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  RELEASE_CACHE_NAME,
  RELEASE_INFO,
  RELEASE_LABEL,
  RELEASE_VERSION,
} from '../src/release.js';

test('release metadata exposes one canonical identity', () => {
  assert.equal(RELEASE_VERSION, '3.4.0-expanding-world');
  assert.equal(RELEASE_LABEL, 'v3.4.0-expanding-world');
  assert.equal(RELEASE_CACHE_NAME, 'one-bullet-arena-v3.4.0-expanding-world');
  assert.equal(RELEASE_INFO.schemaVersion, 1);
  assert.equal(RELEASE_INFO.channel, 'expanding-world');
  assert.ok(Object.isFrozen(RELEASE_INFO));
});

test('package, runtime, and service worker consume canonical release metadata', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const runtimeSource = await readFile(new URL('../src/ui-layout-runtime.js', import.meta.url), 'utf8');
  const eventRuntimeSource = await readFile(new URL('../src/core/event-runtime.js', import.meta.url), 'utf8');
  const combatRuntimeSource = await readFile(new URL('../src/core/combat-depth-runtime.js', import.meta.url), 'utf8');
  const checkpointRuntimeSource = await readFile(new URL('../src/core/checkpoint-runtime.js', import.meta.url), 'utf8');
  const wardenRuntimeSource = await readFile(new URL('../src/core/warden-runtime.js', import.meta.url), 'utf8');
  const world2DRuntimeSource = await readFile(new URL('../src/core/world-2d-runtime.js', import.meta.url), 'utf8');
  const visualOverhaulRuntimeSource = await readFile(new URL('../src/core/visual-overhaul-runtime.js', import.meta.url), 'utf8');
  const dashboardPolishSource = await readFile(new URL('../src/core/dashboard-polish-runtime.js', import.meta.url), 'utf8');
  const worldExpansionSource = await readFile(new URL('../src/core/world-expansion-runtime.js', import.meta.url), 'utf8');
  const unifiedUiSource = await readFile(new URL('../src/core/unified-ui-runtime.js', import.meta.url), 'utf8');
  const workerSource = await readFile(new URL('../sw.js', import.meta.url), 'utf8');

  assert.equal(packageJson.version, RELEASE_VERSION);
  assert.match(runtimeSource, /from '\.\/release\.js'/);
  assert.match(eventRuntimeSource, /from '\.\.\/release\.js'/);
  assert.match(combatRuntimeSource, /OneBulletEventRuntime/);
  assert.match(checkpointRuntimeSource, /OneBulletCombatDepthRuntime/);
  assert.match(wardenRuntimeSource, /OneBulletCheckpointRuntime/);
  assert.match(world2DRuntimeSource, /OneBulletWardenRuntime/);
  assert.match(visualOverhaulRuntimeSource, /OneBulletWorld2DRuntime/);
  assert.match(dashboardPolishSource, /OneBulletVisualOverhaulRuntime/);
  assert.match(worldExpansionSource, /OneBulletDashboardPolishRuntime/);
  assert.match(unifiedUiSource, /OneBulletWorldExpansionRuntime/);
  assert.match(workerSource, /importScripts\('\.\/src\/release-config\.js'\)/);
  assert.match(workerSource, /const CACHE_NAME = RELEASE\.cacheName/);
  assert.match(workerSource, /\.\/src\/core\/event-runtime\.js/);
  assert.match(workerSource, /\.\/src\/core\/combat-depth-runtime\.js/);
  assert.match(workerSource, /\.\/src\/core\/checkpoint-store\.js/);
  assert.match(workerSource, /\.\/src\/core\/checkpoint-runtime\.js/);
  assert.match(workerSource, /\.\/src\/core\/warden-runtime\.js/);
  assert.match(workerSource, /\.\/src\/core\/world-2d-runtime\.js/);
  assert.match(workerSource, /\.\/src\/core\/visual-overhaul-runtime\.js/);
  assert.match(workerSource, /\.\/src\/core\/dashboard-polish-runtime\.js/);
  assert.match(workerSource, /\.\/src\/core\/world-expansion-runtime\.js/);
  assert.match(workerSource, /\.\/src\/core\/unified-ui-runtime\.js/);
});

test('service worker keeps an explicit release handshake and network-first fallback', async () => {
  const workerSource = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  const mainSource = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');

  assert.match(workerSource, /GET_RELEASE_INFO/);
  assert.match(workerSource, /fetch\(request, \{ cache: 'reload' \}\)/);
  assert.match(mainSource, /updateViaCache: 'none'/);
  assert.match(mainSource, /registration\.update\(\)/);
  assert.match(mainSource, /controllerchange/);
  assert.match(mainSource, /OneBulletUnifiedUiRuntime/);
  assert.match(mainSource, /requestGameFullscreen/);
  assert.match(mainSource, /__ONE_BULLET_CHECKPOINT__/);
});
