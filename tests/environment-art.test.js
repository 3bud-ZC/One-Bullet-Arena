import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ENVIRONMENT_ART_RUNTIME_VERSION } from '../src/core/environment-art-runtime.js';

test('environment art is a presentation-only top runtime', async () => {
  assert.equal(ENVIRONMENT_ART_RUNTIME_VERSION, '3.5.0-environment-art');
  const source = await readFile(new URL('../src/core/environment-art-runtime.js', import.meta.url), 'utf8');
  assert.match(source, /extends OneBulletGraphicsRefinementRuntime/);
  assert.match(source, /modular-industrial-deck-v1/);
  assert.match(source, /stageLandmarksActive: true/);
  assert.match(source, /floorModuleDetailActive: true/);
  assert.match(source, /lockedMachineryActive: true/);
  assert.match(source, /perimeterRailDetailActive: true/);
  assert.match(source, /gameplayGeometryChanged: false/);
  assert.match(source, /collisionGeometryChanged: false/);
  assert.doesNotMatch(source, /arenaStage\.bounds\s*=/);
  assert.doesNotMatch(source, /arenaStage\.obstacles\s*=/);
  assert.doesNotMatch(source, /player\.speed\s*=/);
  assert.doesNotMatch(source, /enemy\.speed\s*=/);
  assert.doesNotMatch(source, /enemy\.health\s*=/);
});

test('environment art provides stage-specific deck structure', async () => {
  const source = await readFile(new URL('../src/core/environment-art-runtime.js', import.meta.url), 'utf8');
  assert.match(source, /CORE \/\/ REACTOR DECK/);
  assert.match(source, /WING RELAY NETWORK/);
  assert.match(source, /CORRIDOR GRID ONLINE/);
  assert.match(source, /FULL ARENA \/\/ OPEN/);
  assert.match(source, /drawLockedMachinery/);
  assert.match(source, /drawDeckPlating/);
  assert.match(source, /drawFloorConduits/);
  assert.match(source, /drawPerimeterRails/);
});

test('boot, PWA shell, and Pages deployment include environment art', async () => {
  const mainSource = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  const workerSource = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  const deploySource = await readFile(new URL('../.github/workflows/deploy-pages.yml', import.meta.url), 'utf8');
  assert.match(mainSource, /OneBulletEnvironmentArtRuntime/);
  assert.match(workerSource, /core\/environment-art-runtime\.js/);
  assert.match(deploySource, /environment-art-runtime\.js/);
  assert.match(deploySource, /OneBulletEnvironmentArtRuntime/);
});
