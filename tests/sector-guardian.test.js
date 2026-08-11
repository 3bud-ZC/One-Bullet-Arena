import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GUARDIAN_PHASE_ORDER,
  GUARDIAN_PHASE_SECONDS,
  GUARDIAN_TYPES,
  GUARDIAN_WAVES,
  guardianForWave,
  guardianScaleForWave,
  isGuardianWave,
} from '../src/game-data.js';

test('guardians appear only on sector milestone waves', () => {
  assert.deepEqual([...GUARDIAN_WAVES], [10, 20, 30]);
  for (const wave of [1, 3, 6, 9, 11, 15, 19, 21, 29, 31, 35]) {
    assert.equal(isGuardianWave(wave), false, `wave ${wave} must not be a guardian wave`);
    assert.equal(guardianForWave(wave), null);
  }
  for (const wave of GUARDIAN_WAVES) {
    assert.equal(isGuardianWave(wave), true);
    assert.ok(guardianForWave(wave), `wave ${wave} must have a guardian`);
  }
});

test('each milestone brings a different guardian so encounters are not identical', () => {
  const ids = GUARDIAN_WAVES.map((wave) => guardianForWave(wave).id);
  assert.equal(new Set(ids).size, ids.length, `guardians repeat: ${ids.join(', ')}`);
  assert.deepEqual(ids, ['sentinel', 'bastion', 'harrier']);
});

test('every guardian declares the traits its encounter is built on', () => {
  for (const guardian of Object.values(GUARDIAN_TYPES)) {
    assert.equal(guardian.guardian, true);
    assert.ok(guardian.radius >= 38, `${guardian.id} should read as heavier than a regular enemy`);
    assert.ok(guardian.health >= 20, `${guardian.id} needs a real health pool`);
    assert.ok(guardian.guardSpin > 0, `${guardian.id} needs a rotating guard to read`);
  }
  // Each is a different answer to the one-bullet loop.
  assert.equal(GUARDIAN_TYPES.bastion.requiresBank, true);
  assert.equal(GUARDIAN_TYPES.harrier.evasive, true);
  assert.ok(GUARDIAN_TYPES.harrier.speed > GUARDIAN_TYPES.bastion.speed);
});

test('the phase loop always returns to a vulnerability window', () => {
  assert.deepEqual([...GUARDIAN_PHASE_ORDER], ['stalk', 'wind', 'strike']);
  for (const phase of GUARDIAN_PHASE_ORDER) {
    assert.ok(GUARDIAN_PHASE_SECONDS[phase] > 0, `${phase} needs a duration`);
  }
  // The window the player attacks in must dominate the cycle, otherwise the
  // encounter becomes waiting rather than playing.
  const total = GUARDIAN_PHASE_ORDER.reduce((sum, phase) => sum + GUARDIAN_PHASE_SECONDS[phase], 0);
  assert.ok(
    GUARDIAN_PHASE_SECONDS.stalk / total > 0.5,
    `stalk is only ${Math.round((GUARDIAN_PHASE_SECONDS.stalk / total) * 100)}% of the cycle`,
  );
  // The telegraph must be long enough to read and react to.
  assert.ok(GUARDIAN_PHASE_SECONDS.wind >= 0.6, 'the wind-up telegraph is too short to be fair');
});

test('guardians scale through pressure rather than becoming health sponges', () => {
  const early = guardianScaleForWave(10);
  const late = guardianScaleForWave(30);
  assert.ok(late.health > early.health);
  assert.ok(late.speed > early.speed);
  // Health scaling stays bounded so a late guardian is not simply a longer
  // version of the same fight.
  assert.ok(late.health <= 1.6, `guardian health scale reached ${late.health}`);
  assert.ok(guardianScaleForWave(999).health <= 1.6);
});
