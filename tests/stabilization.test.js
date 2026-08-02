import test from 'node:test';
import assert from 'node:assert/strict';

import { canRegisterRicochet, formatWaveProgress } from '../src/stabilization.js';

test('wave progress remains left-to-right inside the Arabic HUD', () => {
  assert.equal(formatWaveProgress(2, 5), '2 / 5');
  assert.equal(formatWaveProgress('4', '5'), '4 / 5');
});

test('wave progress sanitizes invalid values', () => {
  assert.equal(formatWaveProgress(-2, 0), '0 / 1');
  assert.equal(formatWaveProgress(undefined, undefined), '0 / 5');
});

test('ricochet registration ignores stationary bullets and duplicate collision frames', () => {
  assert.equal(canRegisterRicochet({ now: 1, lastAt: 0, speed: 0 }), false);
  assert.equal(canRegisterRicochet({ now: 1.02, lastAt: 1, speed: 900 }), false);
  assert.equal(canRegisterRicochet({ now: 1.05, lastAt: 1, speed: 900 }), true);
});
