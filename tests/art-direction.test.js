import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ART_DIRECTION_RUNTIME_VERSION } from '../src/core/art-direction-runtime.js';

test('art direction runtime is a render-only refinement layer', async () => {
  assert.equal(ART_DIRECTION_RUNTIME_VERSION, '3.5.0-art-direction-refinement');
  const source = await readFile(new URL('../src/core/art-direction-runtime.js', import.meta.url), 'utf8');
  assert.match(source, /extends OneBulletVisualOverhaulRuntime/);
  assert.match(source, /gameplayGeometryChanged: false/);
  assert.match(source, /collisionGeometryChanged: false/);
  assert.match(source, /three-module-dashboard-v2/);
  assert.match(source, /sector-grid-locked-deck-v2/);
  assert.match(source, /chamfered-tactical-blocks/);
  assert.match(source, /lockedSectorVisuals: true/);
  assert.match(source, /overlayFrameNoiseReduced: true/);
  assert.match(source, /OneBulletVisualDesignRuntime\.prototype\.drawUpgradeSelection/);
  assert.match(source, /OneBulletCheckpointRuntime\.prototype\.drawGameOver/);
  assert.doesNotMatch(source, /arenaStage\.bounds\s*=/);
  assert.doesNotMatch(source, /arenaStage\.obstacles\s*=/);
  assert.doesNotMatch(source, /player\.speed\s*=/);
  assert.doesNotMatch(source, /enemy\.speed\s*=/);
});

test('desktop shell uses the full browser viewport without requiring fullscreen API', async () => {
  const css = await readFile(new URL('../art-direction.css', import.meta.url), 'utf8');
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(css, /\.game-frame\s*\{[\s\S]*width: 100vw;[\s\S]*height: 100dvh;/);
  assert.match(css, /#game-canvas\s*\{[\s\S]*width: 100vw;[\s\S]*height: 100dvh;/);
  assert.match(css, /aspect-ratio: auto/);
  assert.match(html, /art-direction\.css/);
});

test('boot and PWA shell include the art direction layer', async () => {
  const mainSource = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  const workerSource = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(mainSource, /OneBulletArtDirectionRuntime/);
  assert.match(workerSource, /art-direction\.css/);
  assert.match(workerSource, /core\/art-direction-runtime\.js/);
});
