import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_MOMENTUM,
  OVERDRIVE_DURATION,
  momentumGainForAction,
  perfectCatchEligible,
  skillDamageMultiplier,
} from '../src/core/combat-depth-runtime.js';

test('perfect catch requires a meaningful recall and skill input', () => {
  assert.equal(perfectCatchEligible({ alignment: 0.8, recallDistance: 300 }), true);
  assert.equal(perfectCatchEligible({ alignment: 0.1, recallDistance: 300 }), false);
  assert.equal(perfectCatchEligible({ dashing: true, recallDistance: 300 }), true);
  assert.equal(perfectCatchEligible({ alignment: 1, recallDistance: 120 }), false);
});

test('skill damage combines bank, recall, precision, and overdrive predictably', () => {
  assert.equal(skillDamageMultiplier(), 1);
  assert.equal(skillDamageMultiplier({ bankLevel: 5 }), 1.3);
  assert.equal(skillDamageMultiplier({ recallSeconds: 10 }), 1.35);
  const full = skillDamageMultiplier({ precision: true, bankLevel: 5, overdrive: true, recallSeconds: 10 });
  assert.equal(Number(full.toFixed(4)), Number((1.65 * 1.35 * 1.25).toFixed(4)));
});

test('momentum rewards skill actions and bank kills', () => {
  assert.equal(momentumGainForAction('ricochet'), 6);
  assert.equal(momentumGainForAction('perfect-catch'), 34);
  assert.equal(momentumGainForAction('kill', 0), 10);
  assert.equal(momentumGainForAction('kill', 3), 16);
  assert.equal(momentumGainForAction('unknown'), 0);
});

test('combat depth constants remain bounded and player-readable', () => {
  assert.equal(MAX_MOMENTUM, 100);
  assert.ok(OVERDRIVE_DURATION >= 5);
  assert.ok(OVERDRIVE_DURATION <= 8);
});
