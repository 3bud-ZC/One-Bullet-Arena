import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REGION_BOSSES,
  bossByRegion,
  bossPhaseForHealth,
  createBossCombatState,
  createDefaultBossMastery,
  normalizeBossMastery,
  recordBossEncounter,
  recordBossVictory,
} from '../src/region-bosses-data.js';

test('each region has one unique three-phase boss', () => {
  assert.equal(REGION_BOSSES.length, 3);
  assert.deepEqual(new Set(REGION_BOSSES.map((boss) => boss.regionId)), new Set(['neon', 'forge', 'void']));
  assert.equal(new Set(REGION_BOSSES.map((boss) => boss.id)).size, 3);
  for (const boss of REGION_BOSSES) {
    assert.equal(boss.phases.length, 3);
    assert.ok(boss.maxHp > 20);
    assert.ok(boss.reward >= 100);
    assert.ok(boss.name.length > 3);
  }
});

test('boss combat state applies difficulty and story health scaling', () => {
  const base = createBossCombatState('forge');
  const scaled = createBossCombatState('forge', { healthMultiplier: 1.5, story: true });
  assert.equal(base.bossId, 'bullet-hunter');
  assert.ok(scaled.maxHp > base.maxHp * 1.6);
  assert.equal(scaled.phase, 1);
  assert.equal(scaled.rewardSettled, false);
});

test('phase resolver moves through all three health thresholds', () => {
  const boss = bossByRegion('void');
  assert.equal(bossPhaseForHealth(boss, 34, 34), 1);
  assert.equal(bossPhaseForHealth(boss, 17, 34), 2);
  assert.equal(bossPhaseForHealth(boss, 5, 34), 3);
});

test('boss mastery records encounters, first victories, best times, and no-damage wins', () => {
  let mastery = createDefaultBossMastery();
  mastery = recordBossEncounter(mastery, 'mirror-guardian');
  assert.equal(mastery.bosses['mirror-guardian'].encounters, 1);

  const first = recordBossVictory(mastery, 'mirror-guardian', {
    time: 125,
    difficultyId: 'corebreaker',
    damageTaken: 0,
  });
  assert.equal(first.firstVictory, true);
  assert.ok(first.reward > bossByRegion('neon').reward);
  assert.equal(first.mastery.bosses['mirror-guardian'].victories, 1);
  assert.equal(first.mastery.bosses['mirror-guardian'].bestTime, 125);
  assert.equal(first.mastery.bosses['mirror-guardian'].highestDifficulty, 'corebreaker');
  assert.equal(first.mastery.bosses['mirror-guardian'].noDamageWins, 1);

  const second = recordBossVictory(first.mastery, 'mirror-guardian', {
    time: 150,
    difficultyId: 'hunter',
    damageTaken: 2,
  });
  assert.equal(second.firstVictory, false);
  assert.equal(second.reward, bossByRegion('neon').reward);
  assert.equal(second.mastery.bosses['mirror-guardian'].bestTime, 125);
  assert.equal(second.mastery.bosses['mirror-guardian'].highestDifficulty, 'corebreaker');
  assert.equal(second.mastery.totalVictories, 2);
});

test('malformed boss mastery data is normalized safely', () => {
  const normalized = normalizeBossMastery({
    bosses: {
      'rift-king': {
        encounters: -4,
        victories: '3.9',
        bestTime: 'bad',
        highestDifficulty: 'impossible',
        noDamageWins: 2,
      },
      unsupported: { victories: 999 },
    },
  });
  assert.equal(normalized.bosses['rift-king'].encounters, 0);
  assert.equal(normalized.bosses['rift-king'].victories, 3);
  assert.equal(normalized.bosses['rift-king'].bestTime, 0);
  assert.equal(normalized.bosses['rift-king'].highestDifficulty, '');
  assert.equal(normalized.bosses['rift-king'].noDamageWins, 2);
  assert.equal(normalized.totalVictories, 3);
  assert.equal(Object.hasOwn(normalized.bosses, 'unsupported'), false);
});
