import test from 'node:test';
import assert from 'node:assert/strict';

import {
  progressiveHazardProfile,
  progressiveMutatorForWave,
} from '../src/progressive-map-hazards.js';

test('first regional wave is safe and the second wave only previews the hazard', () => {
  const first = progressiveHazardProfile(1);
  const second = progressiveHazardProfile(2);

  assert.equal(first.active, false);
  assert.equal(first.preview, false);
  assert.equal(first.intensity, 0);
  assert.equal(progressiveMutatorForWave('neon', 1), null);

  assert.equal(second.active, false);
  assert.equal(second.preview, true);
  assert.equal(second.stage, 0);
  assert.equal(progressiveMutatorForWave('neon', 2)?.id, 'laser-sweep');
});

test('environmental danger activates on wave three and increases every round', () => {
  const profiles = [3, 4, 5, 6, 7, 8].map(progressiveHazardProfile);

  profiles.forEach((profile, index) => {
    assert.equal(profile.active, true);
    assert.equal(profile.preview, false);
    assert.equal(profile.stage, index + 1);
  });

  for (let index = 1; index < profiles.length; index += 1) {
    assert.ok(profiles[index].intensity > profiles[index - 1].intensity);
  }
  assert.equal(profiles.at(-1).intensity, 1);
});

test('neon hazards begin with the laser and alternate only after activation', () => {
  assert.equal(progressiveMutatorForWave('neon', 3)?.id, 'laser-sweep');
  assert.equal(progressiveMutatorForWave('neon', 4)?.id, 'pulse-gates');
  assert.equal(progressiveMutatorForWave('neon', 5)?.id, 'laser-sweep');
});

test('unsafe wave values normalize to the supported progression range', () => {
  assert.deepEqual(progressiveHazardProfile(-10), progressiveHazardProfile(1));
  assert.deepEqual(progressiveHazardProfile(999), progressiveHazardProfile(8));
});
