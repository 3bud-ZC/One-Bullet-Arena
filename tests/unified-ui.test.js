import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { UNIFIED_UI_RUNTIME_VERSION } from '../src/core/unified-ui-runtime.js';

test('unified UI runtime exposes the v3.4 interface layer', () => {
  assert.equal(UNIFIED_UI_RUNTIME_VERSION, '3.4.0-unified-ui');
});

test('unified UI owns all major non-combat overlays and clean run transitions', async () => {
  const source = await readFile(new URL('../src/core/unified-ui-runtime.js', import.meta.url), 'utf8');
  assert.match(source, /extends OneBulletWorldExpansionRuntime/);
  assert.match(source, /startNextWave\(\)/);
  assert.match(source, /restoringCheckpoint/);
  assert.match(source, /this\.worldCamera\.x = this\.player\.x/);
  assert.match(source, /this\.explorationTrail = \[\{ x: this\.player\.x, y: this\.player\.y \}\]/);
  assert.match(source, /تم استعادة التطويرات والتقدم عند بداية الموجة/);
  assert.match(source, /drawUpgradeSelection\(\)/);
  assert.match(source, /drawPause\(\)/);
  assert.match(source, /drawGameOver\(\)/);
  assert.match(source, /drawBanner\(\)/);
  assert.match(source, /drawTouchControls\(\)/);
  assert.match(source, /continueFromCheckpoint\(\)/);
  assert.match(source, /unifiedInterfaceLanguage: true/);
  assert.match(source, /unifiedUpgradeCards: true/);
  assert.match(source, /unifiedPauseOverlay: true/);
  assert.match(source, /unifiedGameOverOverlay: true/);
  assert.match(source, /cleanCameraRunTransitions: true/);
  assert.match(source, /sectorVisualIdentity: true/);
});

test('late-game sectors own distinct restrained palettes', async () => {
  const source = await readFile(new URL('../src/core/unified-ui-runtime.js', import.meta.url), 'utf8');
  assert.match(source, /const EXPANDED_PALETTES = Object\.freeze/);
  assert.match(source, /if \(stage < 4\) return super\.palette\(\)/);
  assert.match(source, /EXPANDED_PALETTES\[Math\.min\(EXPANDED_PALETTES\.length - 1, stage - 4\)\]/);
});

test('camera runtime keeps HUD and touch controls protected in world space', async () => {
  const source = await readFile(new URL('../src/core/unified-ui-runtime.js', import.meta.url), 'utf8');
  assert.match(source, /combatSafeZones/);
  assert.match(source, /worldCombatSafeZones\(\)/);
  assert.match(source, /this\.screenToWorld\(zone\.x, zone\.y\)/);
  assert.match(source, /w: zone\.w \/ zoom/);
  assert.match(source, /h: zone\.h \/ zoom/);
  assert.match(source, /this\.worldCombatSafeZones\(\)/);
  assert.match(source, /cameraSafeZonesActive: true/);
});

test('command console visual hierarchy stays unified across HUD and overlays', async () => {
  const unified = await readFile(new URL('../src/core/unified-ui-runtime.js', import.meta.url), 'utf8');
  const dashboard = await readFile(new URL('../src/core/dashboard-polish-runtime.js', import.meta.url), 'utf8');
  assert.match(unified, /drawCombatHudPanel\(/);
  assert.match(unified, /TACTICAL MAP/);
  assert.match(unified, /TACTICAL PAUSE/);
  assert.match(unified, /drawModalMetric\(/);
  assert.match(unified, /متابعة من الموجة/);
  assert.match(dashboard, /drawRecordRow\(/);
  assert.match(dashboard, /drawKeyHint\(/);
  assert.match(dashboard, /badge: waveLabel/);
  assert.match(dashboard, /متابعة من الموجة/);
});

test('main boots the unified UI runtime and preserves fullscreen entry', async () => {
  const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(main, /OneBulletUnifiedUiRuntime/);
  assert.match(main, /requestFullscreen/);
  assert.match(main, /navigationUI: 'hide'/);
  assert.match(main, /const key = event\.key\.toLowerCase\(\)/);
  assert.match(main, /\['enter', ' '\]\.includes\(key\)/);
  assert.match(main, /if \(key !== 'f'\) return/);
});
