import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  GLOBAL_UI_RUNTIME_VERSION,
  GLOBAL_UI_REVISION,
  UI_REPAIR_RUNTIME_VERSION,
} from '../src/core/ui-repair-runtime.js';

test('canonical UI runtime exposes the v3.7 HiDPI DOM presentation contract', () => {
  assert.equal(GLOBAL_UI_RUNTIME_VERSION, '3.7.0-hires-ui');
  assert.equal(UI_REPAIR_RUNTIME_VERSION, GLOBAL_UI_RUNTIME_VERSION);
  assert.equal(GLOBAL_UI_REVISION, 'dom-hidpi-presentation-v1');
});

test('global UI runtime remains canonical and removes Canvas ownership for text-heavy screens', async () => {
  const source = await readFile(new URL('../src/core/ui-repair-runtime.js', import.meta.url), 'utf8');
  assert.match(source, /class OneBulletGlobalUiRuntime extends OneBulletProductionArtRuntime/);
  assert.match(source, /new CanvasViewport/);
  assert.match(source, /new DomUiController/);
  assert.match(source, /renderingArchitecture: 'canvas-world\+dom-ui'/);
  assert.match(source, /domUiActive: true/);
  assert.match(source, /hiDpiCanvasActive: true/);
  assert.match(source, /drawMenu\(\) \{\}/);
  assert.match(source, /drawHud\(\) \{\}/);
  assert.match(source, /drawPause\(\) \{\}/);
  assert.match(source, /drawGameOver\(\) \{\}/);
  assert.match(source, /drawUpgradeSelection\(\) \{\}/);
  assert.match(source, /const result = super\.setState\(state\)/);
  assert.match(source, /const result = super\.startNextWave\(\)/);
  assert.doesNotMatch(source, /class .*UiRuntime extends OneBulletGlobalUiRuntime/);
  assert.doesNotMatch(source, /update\(dt\)/);
});

test('DOM presentation uses semantic controls, centralized localization, SVG icons, and CSS tokens', async () => {
  const domSource = await readFile(new URL('../src/ui/dom-ui.js', import.meta.url), 'utf8');
  const iconSource = await readFile(new URL('../src/ui/icons.js', import.meta.url), 'utf8');
  const tokenSource = await readFile(new URL('../styles/tokens.css', import.meta.url), 'utf8');
  const uiCss = await readFile(new URL('../styles/ui.css', import.meta.url), 'utf8');
  const responsiveCss = await readFile(new URL('../styles/responsive.css', import.meta.url), 'utf8');
  const i18nSource = await readFile(new URL('../src/i18n.js', import.meta.url), 'utf8');

  assert.match(domSource, /import \{ i18n \} from '\.\.\/i18n\.js'/);
  assert.match(domSource, /<button/);
  assert.match(domSource, /data-screen="menu"/);
  assert.match(domSource, /data-screen="playing"/);
  assert.match(domSource, /data-screen="paused"/);
  assert.match(domSource, /data-screen="upgrade"/);
  assert.match(domSource, /data-screen="gameover"/);
  assert.match(domSource, /progression-svg/);
  assert.match(iconSource, /viewBox="0 0 24 24"/);
  for (const icon of ['language', 'audio', 'fullscreen', 'settings', 'checkpoint', 'newRun', 'delete', 'bullet', 'wave', 'score', 'upgrade', 'sector', 'health', 'shield', 'dash', 'pause']) {
    assert.match(iconSource, new RegExp(`${icon}:`));
  }
  assert.match(tokenSource, /--surface-0:/);
  assert.match(tokenSource, /--radius-lg:/);
  assert.match(tokenSource, /--text-display:/);
  assert.match(uiCss, /focus-visible/);
  assert.match(uiCss, /font-variant-numeric: tabular-nums/);
  assert.match(responsiveCss, /max-width: 900px/);
  assert.match(responsiveCss, /orientation: landscape/);
  assert.match(i18nSource, /LANGUAGE_STORAGE_KEY = 'one-bullet-language'/);
});
