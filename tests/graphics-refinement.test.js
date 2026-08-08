import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { GRAPHICS_REFINEMENT_RUNTIME_VERSION } from '../src/core/graphics-refinement-runtime.js';

test('graphics refinement remains presentation-only beneath environment art', async () => {
  assert.equal(GRAPHICS_REFINEMENT_RUNTIME_VERSION, '3.5.0-graphics-refinement');
  const source = await readFile(new URL('../src/core/graphics-refinement-runtime.js', import.meta.url), 'utf8');
  assert.match(source, /extends OneBulletInterfaceRedesignRuntime/);
  assert.match(source, /tactical-interceptor-v2/);
  assert.match(source, /distinct-silhouette-v2/);
  assert.match(source, /reactor-core-v2/);
  assert.match(source, /directional-bolt-v2/);
  assert.match(source, /gameplayGeometryChanged: false/);
  assert.match(source, /collisionGeometryChanged: false/);
  assert.doesNotMatch(source, /player\.speed\s*=/);
  assert.doesNotMatch(source, /enemy\.speed\s*=/);
  assert.doesNotMatch(source, /enemy\.health\s*=/);
  assert.doesNotMatch(source, /arenaStage\.bounds\s*=/);
  assert.doesNotMatch(source, /arenaStage\.obstacles\s*=/);
});

test('boot, service worker, and Pages gate include graphics and environment refinement', async () => {
  const mainSource = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  const environmentSource = await readFile(new URL('../src/core/environment-art-runtime.js', import.meta.url), 'utf8');
  const workerSource = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  const deploySource = await readFile(new URL('../.github/workflows/deploy-pages.yml', import.meta.url), 'utf8');
  assert.match(mainSource, /OneBulletEnvironmentArtRuntime/);
  assert.match(environmentSource, /extends OneBulletGraphicsRefinementRuntime/);
  assert.match(workerSource, /core\/graphics-refinement-runtime\.js/);
  assert.match(workerSource, /core\/environment-art-runtime\.js/);
  assert.match(deploySource, /graphics-refinement-runtime\.js/);
  assert.match(deploySource, /environment-art-runtime\.js/);
  assert.match(deploySource, /OneBulletEnvironmentArtRuntime/);
});
