import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_RUN_HISTORY,
  SAVE_VERSION,
  calculateRunReward,
  canUnlockCore,
  createDefaultSave,
  normalizeSave,
  parseImportedSave,
  recordRun,
  serializeSave,
  unlockCore,
} from '../src/progression-data.js';

test('default save starts on the standard core with no currency', () => {
  const save = createDefaultSave();
  assert.equal(save.version, SAVE_VERSION);
  assert.equal(save.shards, 0);
  assert.equal(save.selectedCore, 'standard');
  assert.deepEqual(save.unlockedCores, ['standard']);
  assert.equal(save.history.length, 0);
});

test('normalization repairs malformed progression data', () => {
  const save = normalizeSave({
    version: -10,
    shards: -500,
    selectedCore: 'missing',
    unlockedCores: ['missing', 'heavy', 'heavy'],
    history: 'bad',
    stats: { totalRuns: '4', totalKills: -8 },
  });
  assert.equal(save.version, SAVE_VERSION);
  assert.equal(save.shards, 0);
  assert.equal(save.selectedCore, 'standard');
  assert.deepEqual(save.unlockedCores, ['standard', 'heavy']);
  assert.equal(save.history.length, 0);
  assert.equal(save.stats.totalRuns, 4);
  assert.equal(save.stats.totalKills, 0);
});

test('run reward combines performance without exceeding deterministic rules', () => {
  assert.equal(calculateRunReward({
    victory: true,
    wave: 5,
    rank: 'S',
    accuracy: 0.9,
    kills: 20,
    runTime: 140,
  }), 188);
  assert.equal(calculateRunReward({ victory: false, wave: 2, rank: 'C', kills: 3 }), 28);
});

test('cores require enough shards and deduct their unlock cost', () => {
  const save = createDefaultSave();
  assert.equal(canUnlockCore(save, 'ricochet').reason, 'insufficient-shards');
  save.shards = 120;
  const result = unlockCore(save, 'ricochet');
  assert.equal(result.unlocked, true);
  assert.equal(result.save.shards, 0);
  assert.ok(result.save.unlockedCores.includes('ricochet'));
  assert.equal(result.save.coreMastery.ricochet.runs, 0);
});

test('recording a run grants shards, history, mastery, and achievements', () => {
  const result = recordRun(createDefaultSave(), {
    id: 'run-1',
    playedAt: '2026-08-02T00:00:00.000Z',
    victory: true,
    score: 15000,
    wave: 5,
    rank: 'S',
    runTime: 130,
    shots: 20,
    hits: 18,
    ricochets: 25,
    kills: 20,
    coreId: 'standard',
  });

  assert.equal(result.run.accuracy, 0.9);
  assert.equal(result.save.stats.totalRuns, 1);
  assert.equal(result.save.stats.victories, 1);
  assert.equal(result.save.stats.sRanks, 1);
  assert.equal(result.save.stats.precisionRuns, 1);
  assert.equal(result.save.coreMastery.standard.victories, 1);
  assert.equal(result.save.history[0].id, 'run-1');
  assert.ok(result.unlockedAchievements.some((item) => item.id === 'first-run'));
  assert.ok(result.unlockedAchievements.some((item) => item.id === 'first-victory'));
  assert.ok(result.unlockedAchievements.some((item) => item.id === 'rank-s'));
  assert.ok(result.save.shards > result.reward);
});

test('run history keeps only the most recent configured entries', () => {
  let save = createDefaultSave();
  for (let index = 0; index < MAX_RUN_HISTORY + 5; index += 1) {
    save = recordRun(save, {
      id: `run-${index}`,
      victory: false,
      score: index,
      wave: 1,
      rank: 'C',
      runTime: 20,
      shots: 2,
      hits: 1,
      kills: 1,
      ricochets: 1,
      coreId: 'standard',
    }).save;
  }
  assert.equal(save.history.length, MAX_RUN_HISTORY);
  assert.equal(save.history[0].id, `run-${MAX_RUN_HISTORY + 4}`);
  assert.equal(save.history.at(-1).id, 'run-5');
});

test('save export and import round-trip through normalized JSON', () => {
  const source = createDefaultSave();
  source.shards = 345;
  source.unlockedCores.push('heavy');
  source.selectedCore = 'heavy';
  const imported = parseImportedSave(serializeSave(source));
  assert.equal(imported.shards, 345);
  assert.equal(imported.selectedCore, 'heavy');
  assert.ok(imported.unlockedCores.includes('heavy'));
});

test('invalid imported saves are rejected', () => {
  assert.throws(() => parseImportedSave('{bad json'));
  assert.throws(() => parseImportedSave('null'));
});
