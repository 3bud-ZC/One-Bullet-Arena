import test from 'node:test';
import assert from 'node:assert/strict';

import { defeatPulseStrength, settleTerminalEffects } from '../src/defeat-ui-refine.js';

test('terminal combat effects are fully cleared before rendering result screens', () => {
  assert.deepEqual(settleTerminalEffects(), {
    shake: 0,
    flash: 0,
    hitStop: 0,
    slowMotion: 0,
  });
});

test('defeat pulse decays to zero instead of persisting forever', () => {
  assert.equal(defeatPulseStrength(1000, 1000, 600), 1);
  assert.equal(defeatPulseStrength(1000, 1300, 600), 0.5);
  assert.equal(defeatPulseStrength(1000, 1600, 600), 0);
  assert.equal(defeatPulseStrength(1000, 2500, 600), 0);
});
