import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { RELEASE_CACHE_NAME, RELEASE_INFO, RELEASE_LABEL, RELEASE_VERSION } from '../src/release.js';

test('release metadata exposes the canonical HiDPI UI identity', () => {
  assert.equal(RELEASE_VERSION, '3.7.0-hires-ui');
  assert.equal(RELEASE_LABEL, 'v3.7.0-hires-ui');
  assert.equal(RELEASE_CACHE_NAME, 'one-bullet-arena-v3.7.0-hires-ui');
  assert.equal(RELEASE_INFO.schemaVersion, 1);
  assert.equal(RELEASE_INFO.channel, 'hires-ui');
  assert.ok(Object.isFrozen(RELEASE_INFO));
});

test('package, DOM/HiDPI presentation, localization, and service worker consume canonical release metadata', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const uiSource = await readFile(new URL('../src/core/ui-repair-runtime.js', import.meta.url), 'utf8');
  const domSource = await readFile(new URL('../src/ui/dom-ui.js', import.meta.url), 'utf8');
  const viewportSource = await readFile(new URL('../src/render/canvas-viewport.js', import.meta.url), 'utf8');
  const i18nSource = await readFile(new URL('../src/i18n.js', import.meta.url), 'utf8');
  const workerSource = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  const mainSource = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  const indexSource = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.equal(packageJson.version, RELEASE_VERSION);
  assert.match(uiSource, /extends OneBulletProductionArtRuntime/);
  assert.ok(uiSource.includes(`GLOBAL_UI_RUNTIME_VERSION = '${RELEASE_VERSION}'`));
  assert.match(uiSource, /CanvasViewport/);
  assert.match(uiSource, /DomUiController/);
  assert.match(domSource, /game-ui-toolbar/);
  assert.match(viewportSource, /devicePixelRatio/);
  assert.match(viewportSource, /computeContainedViewport/);
  assert.match(i18nSource, /one-bullet-language/);
  assert.match(i18nSource, /English/);
  assert.match(i18nSource, /العربية/);
  assert.match(workerSource, /importScripts\('\.\/src\/release-config\.js'\)/);
  assert.match(workerSource, /\.\/styles\/ui\.css/);
  assert.match(workerSource, /\.\/src\/render\/canvas-viewport\.js/);
  assert.match(workerSource, /\.\/src\/ui\/dom-ui\.js/);
  assert.match(mainSource, /OneBulletGlobalUiRuntime/);
  assert.match(mainSource, /__ONE_BULLET_I18N__/);
  assert.match(indexSource, /id="game-ui-layer"/);
  assert.match(indexSource, /class="game-render-layer"/);
});

test('service worker keeps an explicit release handshake and network-first fallback', async () => {
  const workerSource = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  const mainSource = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(workerSource, /GET_RELEASE_INFO/);
  assert.match(workerSource, /fetch\(request, \{ cache: 'reload' \}\)/);
  assert.match(mainSource, /updateViaCache: 'none'/);
  assert.match(mainSource, /registration\.update\(\)/);
  assert.match(mainSource, /controllerchange/);
  assert.match(mainSource, /requestGameFullscreen/);
  assert.match(mainSource, /__ONE_BULLET_CHECKPOINT__/);
});
