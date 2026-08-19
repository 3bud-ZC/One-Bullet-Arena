import test from 'node:test';
import assert from 'node:assert/strict';
import {
  abilitySynergyDamageMultiplier,
  activeAbilitySynergies,
  catchImpulseSynergyScale,
  createWaveDirectiveState,
  dashRefundForCatch,
  resolveWaveDirectiveKill,
  selectPriorityTarget,
  shockImpactSynergyScale,
  waveDirectiveForWave,
} from '../src/game-feel.js';

test('wave directives rotate into readable optional objectives', () => {
  assert.equal(waveDirectiveForWave(1).id, 'standard');
  assert.equal(waveDirectiveForWave(3).id, 'recall');
  assert.equal(waveDirectiveForWave(4).id, 'bank');
  assert.equal(waveDirectiveForWave(5).id, 'priority');
  assert.equal(waveDirectiveForWave(20).id, 'priority');
});

test('priority directive targets the highest-pressure enemy deterministically', () => {
  const enemies = [
    { id: 1, type: 'scout', maxHealth: 1, spawnTime: 0 },
    { id: 2, type: 'sniper', maxHealth: 2, spawnTime: 0 },
    { id: 3, type: 'brute', maxHealth: 3, spawnTime: 0 },
    { id: 4, type: 'warden', maxHealth: 4, spawnTime: 0 },
  ];
  assert.equal(selectPriorityTarget(enemies).id, 4);
});

test('directive kill rewards only matching player actions', () => {
  const priority = createWaveDirectiveState(5);
  const bank = createWaveDirectiveState(8);
  const recall = createWaveDirectiveState(9);

  assert.equal(resolveWaveDirectiveKill(priority, { priorityTarget: true }, {}).matched, true);
  assert.equal(resolveWaveDirectiveKill(bank, { type: 'scout' }, { banked: true }).scoreMultiplier, 1.35);
  assert.equal(resolveWaveDirectiveKill(bank, { type: 'scout' }, { banked: false }).matched, false);
  assert.equal(resolveWaveDirectiveKill(recall, { type: 'scout' }, { recalling: true }).matched, true);
});

test('ability synergies activate from real upgrade pairs and stay bounded', () => {
  const stacks = {
    'extended-ricochet': 2,
    'hot-ricochet': 2,
    'magnetic-recall': 2,
    'quick-dash': 1,
    'kinetic-catch': 1,
    'shock-impact': 1,
  };
  const active = activeAbilitySynergies(stacks).map((synergy) => synergy.id);
  assert.deepEqual(active, ['bank-forge', 'return-relay', 'kinetic-field', 'shock-carom']);
  assert.ok(abilitySynergyDamageMultiplier(stacks, { bankLevel: 3 }) > 1.1);
  assert.ok(abilitySynergyDamageMultiplier(stacks, { bankLevel: 10 }) <= 1.22);
  assert.ok(dashRefundForCatch(stacks, { recallDistance: 360, perfect: true }) > 0.3);
  assert.ok(catchImpulseSynergyScale(stacks).radius > 1);
  assert.ok(shockImpactSynergyScale(stacks, { banked: true }).damage > 1);
  assert.deepEqual(shockImpactSynergyScale(stacks, { banked: false }), { radius: 1, damage: 1 });
});
