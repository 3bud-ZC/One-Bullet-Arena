import test from 'node:test';
import assert from 'node:assert/strict';

import {
  deriveAccuracyStats,
  deriveChallengeState,
  formatProgressPair,
} from '../src/ui-feedback-balance.js';

test('progress pairs stay current-first for Arabic RTL screens', () => {
  assert.equal(formatProgressPair(0, 6), '0 / 6');
  assert.equal(formatProgressPair(4, 10), '4 / 10');
  assert.equal(formatProgressPair(-5, 3), '0 / 3');
});

test('accuracy separates shots that connected from total direct impacts', () => {
  assert.deepEqual(deriveAccuracyStats({ shots: 20, accurateShots: 15, directImpacts: 25 }), {
    shots: 20,
    accurateShots: 15,
    directImpacts: 25,
    accuracy: 0.75,
  });
});

test('accuracy values are sanitized and never exceed one hundred percent', () => {
  const result = deriveAccuracyStats({ shots: 3, accurateShots: 8, directImpacts: 2 });
  assert.equal(result.accurateShots, 3);
  assert.equal(result.directImpacts, 3);
  assert.equal(result.accuracy, 1);
});

test('irreversible challenge failures are reported immediately', () => {
  assert.deepEqual(deriveChallengeState('dashless', { dashes: 1 }), {
    status: 'failed', progress: '1 اندفاع', reason: 'تم استخدام الاندفاع',
  });
  assert.equal(deriveChallengeState('untouched', { damageTaken: 1 }).status, 'failed');
  assert.equal(deriveChallengeState('limited-shots', { shots: 31 }).status, 'failed');
});

test('skill challenges become complete as soon as their target is reached', () => {
  assert.equal(deriveChallengeState('triple-kill', { maxKillsPerShot: 3 }).status, 'completed');
  assert.equal(deriveChallengeState('eight-bounces', { maxBounces: 8 }).status, 'completed');
  assert.equal(deriveChallengeState('elite-hunter', { eliteKills: 3 }).status, 'completed');
});

test('victory-only challenges remain active until the run is won', () => {
  assert.equal(deriveChallengeState('dashless', { dashes: 0 }, false).status, 'active');
  assert.equal(deriveChallengeState('dashless', { dashes: 0 }, true).status, 'completed');
  assert.equal(deriveChallengeState('untouched', { damageTaken: 0 }, true).status, 'completed');
  assert.equal(deriveChallengeState('limited-shots', { shots: 22 }, true).status, 'completed');
});
