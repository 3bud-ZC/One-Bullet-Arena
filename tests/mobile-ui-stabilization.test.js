import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatMobileWaveProgress,
  isCompactBrowserViewport,
  mobileUiLayout,
  resultScreenLayout,
} from '../src/mobile-ui-stabilization.js';

test('mobile wave progress stays current-first inside Arabic UI', () => {
  assert.equal(formatMobileWaveProgress(1, 8), '1 / 8');
  assert.equal(formatMobileWaveProgress(8, 8), '8 / 8');
  assert.equal(formatMobileWaveProgress(-3, 0), '1 / 1');
});

test('right-handed mobile controls remain inside the 1280 by 720 arena', () => {
  const layout = mobileUiLayout({ leftHanded: false, scale: 1.14 });
  for (const control of Object.values(layout)) {
    assert.ok(control.x - control.radius >= 0, `${control.x} starts outside the arena`);
    assert.ok(control.x + control.radius <= 1280, `${control.x} ends outside the arena`);
    assert.ok(control.y - control.radius >= 0, `${control.y} starts outside the arena`);
    assert.ok(control.y + control.radius <= 720, `${control.y} ends outside the arena`);
  }
});

test('left-handed controls mirror action and movement zones safely', () => {
  const right = mobileUiLayout({ leftHanded: false, scale: 1 });
  const left = mobileUiLayout({ leftHanded: true, scale: 1 });
  assert.equal(left.movement.x, 1280 - right.movement.x);
  assert.equal(left.dash.x, 1280 - right.dash.x);
  assert.equal(left.recall.x, 1280 - right.recall.x);
  assert.equal(left.pulse.x, 1280 - right.pulse.x);
  assert.equal(left.phase.x, 1280 - right.phase.x);
  assert.equal(left.overdrive.x, 1280 - right.overdrive.x);
});

test('compact result screen keeps buttons and panels inside the canvas', () => {
  const layout = resultScreenLayout({ compact: true });
  assert.ok(layout.panel.y + layout.panel.height <= 720);
  assert.ok(layout.buttonsY + 44 <= 720);
  assert.ok(layout.challenge.y + layout.challenge.height < layout.buttonsY);
});

test('short and touch browser viewports use compact UI', () => {
  assert.equal(isCompactBrowserViewport({ width: 915, height: 412, touch: true }), true);
  assert.equal(isCompactBrowserViewport({ width: 1440, height: 700, touch: false }), true);
  assert.equal(isCompactBrowserViewport({ width: 1440, height: 900, touch: false }), false);
});
