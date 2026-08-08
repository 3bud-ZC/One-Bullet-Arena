import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMBAT_FEEDBACK_VERSION,
  combatFeedbackProfile,
  comboFeedbackRank,
} from '../src/combat-feedback-runtime.js';

test('combat feedback release exposes its identifier', () => {
  assert.equal(COMBAT_FEEDBACK_VERSION, '2.7.0-feedback');
});

test('lethal impact profiles increase weight without changing enemy identity', () => {
  const normal = combatFeedbackProfile('brute', false);
  const lethal = combatFeedbackProfile('brute', true);

  assert.equal(normal.color, '#ffab4f');
  assert.equal(lethal.color, normal.color);
  assert.equal(normal.lethal, false);
  assert.equal(lethal.lethal, true);
  assert.ok(lethal.sparks > normal.sparks);
  assert.ok(lethal.radius > normal.radius);
  assert.ok(lethal.shake > normal.shake);
  assert.ok(lethal.freeze > normal.freeze);
});

test('Warden has dedicated heavy impact feedback instead of Scout fallback', () => {
  const warden = combatFeedbackProfile('warden', false);
  const scout = combatFeedbackProfile('scout', false);

  assert.equal(warden.color, '#67ddff');
  assert.ok(warden.sparks > scout.sparks);
  assert.ok(warden.radius > scout.radius);
  assert.ok(warden.shake > scout.shake);
});

test('unknown enemies fall back to a deterministic scout profile', () => {
  assert.deepEqual(
    combatFeedbackProfile('unknown-enemy', false),
    combatFeedbackProfile('scout', false),
  );
});

test('combo ranks advance at stable thresholds', () => {
  assert.equal(comboFeedbackRank(0).code, 'STABLE');
  assert.equal(comboFeedbackRank(3).code, 'LOCKED IN');
  assert.equal(comboFeedbackRank(5).code, 'CHAINED');
  assert.equal(comboFeedbackRank(8).code, 'RELENTLESS');
  assert.equal(comboFeedbackRank(12).code, 'OVERDRIVE');
  assert.equal(comboFeedbackRank(Number.NaN).threshold, 0);
});