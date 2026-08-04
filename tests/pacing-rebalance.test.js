import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PACING_RELEASE,
  difficultyPacingById,
  enemyThreat,
  localPacingWave,
  objectivePacingTuning,
  pacingCurveSnapshot,
  recoveryForWave,
  wavePacingPlan,
} from '../src/pacing-rebalance-data.js';

test('pacing release matches v1.4.1', () => {
  assert.equal(PACING_RELEASE, '1.4.1');
});

test('regional pacing resets every eight waves', () => {
  assert.equal(localPacingWave(1), 1);
  assert.equal(localPacingWave(8), 8);
  assert.equal(localPacingWave(9), 1);
  assert.equal(localPacingWave(17), 1);
});

test('hunter curve increases budget without a late spike', () => {
  const curve = pacingCurveSnapshot('hunter');
  assert.equal(curve.length, 8);
  for (let index = 1; index < curve.length; index += 1) {
    assert.ok(curve[index].budget > curve[index - 1].budget);
    assert.ok(curve[index].budget - curve[index - 1].budget < 1.5);
  }
});

test('first two hunter waves contain no elite or evolution pressure', () => {
  for (const wave of [1, 2]) {
    const plan = wavePacingPlan({ wave, difficultyId: 'hunter' });
    assert.equal(plan.eliteCap, 0);
    assert.equal(plan.evolutionCap, 0);
    assert.equal(plan.hazardScale, 0);
  }
});

test('hunter pressure reaches full hazard scale only on wave eight', () => {
  assert.ok(wavePacingPlan({ wave: 7, difficultyId: 'hunter' }).hazardScale < 1);
  assert.equal(wavePacingPlan({ wave: 8, difficultyId: 'hunter' }).hazardScale, 1);
});

test('recruit is always lighter than hunter while corebreaker is heavier', () => {
  for (let wave = 1; wave <= 8; wave += 1) {
    const recruit = wavePacingPlan({ wave, difficultyId: 'recruit' });
    const hunter = wavePacingPlan({ wave, difficultyId: 'hunter' });
    const corebreaker = wavePacingPlan({ wave, difficultyId: 'corebreaker' });
    assert.ok(recruit.budget < hunter.budget);
    assert.ok(corebreaker.budget > hunter.budget);
    assert.ok(recruit.reinforcementDelay > hunter.reinforcementDelay);
  }
});

test('unknown difficulty falls back to hunter', () => {
  assert.equal(difficultyPacingById('missing').id, 'hunter');
  assert.equal(wavePacingPlan({ wave: 4, difficultyId: 'missing' }).difficultyId, 'hunter');
});

test('enemy threat accounts for elite, evolution and mini modifiers', () => {
  const base = enemyThreat({ type: 'brute' });
  assert.ok(enemyThreat({ type: 'brute', elite: true }) > base);
  assert.ok(enemyThreat({ type: 'brute', v12Evolution: 'rage-engine' }) > base);
  assert.ok(enemyThreat({ type: 'brute', mini: true }) < base);
});

test('hunter core defense is shorter and safer than the old pressure curve', () => {
  const tuning = objectivePacingTuning({ objectiveId: 'core-defense', wave: 4, difficultyId: 'hunter' });
  assert.equal(tuning.duration, 14);
  assert.equal(tuning.coreHealth, 4);
  assert.equal(tuning.assaultLimit, 2);
  assert.ok(tuning.reinforcementDelay >= 4.5);
});

test('hunter marked hunt requires two ordered targets', () => {
  const tuning = objectivePacingTuning({ objectiveId: 'marked-hunt', wave: 5, difficultyId: 'hunter' });
  assert.equal(tuning.targetKills, 2);
});

test('hunter bullet separation has reduced duration and slower decay', () => {
  const tuning = objectivePacingTuning({ objectiveId: 'bullet-separation', wave: 6, difficultyId: 'hunter' });
  assert.equal(tuning.duration, 8);
  assert.equal(tuning.minimumDistance, 190);
  assert.ok(tuning.decayCompensation > 0.2);
});

test('hunter recovery occurs at checkpoints and low-health emergencies', () => {
  assert.deepEqual(
    recoveryForWave({ wave: 2, difficultyId: 'hunter', health: 2, maxHealth: 3 }),
    { heal: 1, shield: 0, reason: 'checkpoint' },
  );
  assert.deepEqual(
    recoveryForWave({ wave: 3, difficultyId: 'hunter', health: 1, maxHealth: 3 }),
    { heal: 1, shield: 1, reason: 'emergency' },
  );
  assert.deepEqual(
    recoveryForWave({ wave: 3, difficultyId: 'hunter', health: 3, maxHealth: 3 }),
    { heal: 0, shield: 0, reason: 'none' },
  );
});

test('one-hit protocol never receives pacing recovery', () => {
  assert.deepEqual(
    recoveryForWave({ wave: 6, difficultyId: 'one-hit', health: 1, maxHealth: 1 }),
    { heal: 0, shield: 0, reason: 'one-hit' },
  );
});
