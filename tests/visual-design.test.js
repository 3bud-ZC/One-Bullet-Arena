import test from 'node:test';
import assert from 'node:assert/strict';
import { UI_COLORS } from '../src/ui-renderer.js';
import { VISUAL_DESIGN_VERSION, visualThemeTokens } from '../src/visual-design-runtime.js';

test('visual design release exposes its identifier and complete theme', () => {
  assert.equal(VISUAL_DESIGN_VERSION, '2.6.0-visual');
  const theme = visualThemeTokens();
  assert.equal(theme.version, VISUAL_DESIGN_VERSION);
  assert.equal(theme.player, UI_COLORS.player);
  assert.equal(theme.bullet, UI_COLORS.bullet);
  assert.equal(theme.enemyTypes.length, 5);
  assert.ok(theme.upgradeKinds.includes('movement'));
  assert.ok(theme.upgradeKinds.includes('recall'));
  assert.ok(theme.upgradeKinds.includes('defense'));
});

test('visual theme keeps combat-critical colors distinct', () => {
  const theme = visualThemeTokens();
  assert.notEqual(theme.background, theme.player);
  assert.notEqual(theme.player, theme.bullet);
  assert.notEqual(theme.bullet, theme.danger);
  assert.match(UI_COLORS.borderBright, /^#[0-9a-f]{6}$/i);
});
