import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { RELEASE_CACHE_NAME, RELEASE_INFO, RELEASE_LABEL, RELEASE_VERSION } from '../src/release.js';

test('release metadata exposes the canonical smooth runtime identity', () => {
  assert.equal(RELEASE_VERSION, '3.9.0-command-deck');
  assert.equal(RELEASE_LABEL, 'v3.9.0-command-deck');
  assert.equal(RELEASE_CACHE_NAME, 'one-bullet-arena-v3.9.0-command-deck');
  assert.equal(RELEASE_INFO.schemaVersion, 1);
  assert.equal(RELEASE_INFO.channel, 'smooth-runtime');
  assert.ok(Object.isFrozen(RELEASE_INFO));
});

test('package, fixed-step/HiDPI presentation, localization, and service worker consume canonical release metadata', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const uiSource = await readFile(new URL('../src/core/ui-repair-runtime.js', import.meta.url), 'utf8');
  const domSource = await readFile(new URL('../src/ui/dom-ui.js', import.meta.url), 'utf8');
  const bridgeSource = await readFile(new URL('../src/ui/dom-performance-bridge.js', import.meta.url), 'utf8');
  const viewportSource = await readFile(new URL('../src/render/canvas-viewport.js', import.meta.url), 'utf8');
  const pacerSource = await readFile(new URL('../src/performance/frame-pacer.js', import.meta.url), 'utf8');
  const qualitySource = await readFile(new URL('../src/performance/quality-manager.js', import.meta.url), 'utf8');
  const i18nSource = await readFile(new URL('../src/i18n.js', import.meta.url), 'utf8');
  const workerSource = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  const mainSource = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  const indexSource = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.equal(packageJson.version, RELEASE_VERSION);
  assert.match(uiSource, /extends OneBulletProductionArtRuntime/);
  assert.ok(uiSource.includes(`GLOBAL_UI_RUNTIME_VERSION = '${RELEASE_VERSION}'`));
  assert.match(uiSource, /FIXED_SIMULATION_HZ = 120/);
  assert.match(uiSource, /FixedStepClock/);
  assert.match(uiSource, /AdaptiveQualityManager/);
  assert.match(uiSource, /CanvasViewport/);
  assert.match(uiSource, /DomUiController/);
  assert.match(domSource, /game-ui-toolbar/);
  assert.match(bridgeSource, /minimapTrailRebuilds/);
  assert.match(viewportSource, /devicePixelRatio/);
  assert.match(viewportSource, /setQualityProfile/);
  assert.match(pacerSource, /requestAnimationFrame|FixedStepClock/);
  assert.match(qualitySource, /AUTO/);
  assert.match(i18nSource, /one-bullet-language/);
  assert.match(i18nSource, /English/);
  assert.match(i18nSource, /العربية/);
  assert.match(workerSource, /importScripts\('\.\/src\/release-config\.js'\)/);
  assert.match(workerSource, /\.\/styles\/smooth-runtime\.css/);
  assert.match(workerSource, /\.\/src\/performance\/frame-pacer\.js/);
  assert.match(workerSource, /\.\/src\/ui\/dom-performance-bridge\.js/);
  assert.match(mainSource, /OneBulletGlobalUiRuntime/);
  assert.match(mainSource, /__ONE_BULLET_PERF__/);
  assert.match(indexSource, /id="game-ui-layer"/);
  assert.match(indexSource, /smooth-runtime\.css/);
});

test('service worker keeps an explicit release handshake and a cache-first asset path', async () => {
  const workerSource = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  const mainSource = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(workerSource, /GET_RELEASE_INFO/);
  // Nothing on the startup path may block on the network when it is already
  // cached: assets are cache-first and the navigation is stale-while-revalidate.
  assert.match(workerSource, /cache\.match\(request, \{ ignoreSearch: true \}\)/);
  assert.match(workerSource, /cache\.match\(SHELL_DOCUMENT, \{ ignoreSearch: true \}\)/);
  assert.doesNotMatch(workerSource, /cache: 'reload'/);
  assert.doesNotMatch(workerSource, /await withTimeout/);
  assert.match(mainSource, /updateViaCache: 'none'/);
  assert.match(mainSource, /registration\.update\(\)/);
  assert.match(mainSource, /controllerchange/);
  assert.match(mainSource, /requestGameFullscreen/);
  assert.match(mainSource, /__ONE_BULLET_CHECKPOINT__/);
});
