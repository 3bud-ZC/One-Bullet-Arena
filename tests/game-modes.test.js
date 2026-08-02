import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CORE_CONTRACTS,
  contractById,
  createDefaultModeRecords,
  normalizeModeRecords,
  recordBossRushAttempt,
  recordContractAttempt,
  recordEndlessAttempt,
} from '../src/game-modes-data.js';

test('Core Contract catalogue contains unique playable modifiers', () => {
  assert.equal(CORE_CONTRACTS.length, 5);
  assert.equal(new Set(CORE_CONTRACTS.map((item) => item.id)).size, 5);
  assert.equal(new Set(CORE_CONTRACTS.map((item) => item.modifier)).size, 5);
  for (const contract of CORE_CONTRACTS) assert.ok(contract.reward >= 100);
});

test('Endless records preserve best values across attempts', () => {
  let records = createDefaultModeRecords();
  records = recordEndlessAttempt(records, { wave: 12, score: 5000, bossesDefeated: 2 });
  records = recordEndlessAttempt(records, { wave: 8, score: 7000, bossesDefeated: 1 });
  assert.equal(records.endless.attempts, 2);
  assert.equal(records.endless.bestWave, 12);
  assert.equal(records.endless.bestScore, 7000);
  assert.equal(records.endless.bossesDefeated, 2);
});

test('Boss Rush records only completed best time and least damage', () => {
  let records = createDefaultModeRecords();
  records = recordBossRushAttempt(records, { completed: false, time: 20, damageTaken: 0 });
  records = recordBossRushAttempt(records, { completed: true, time: 180, damageTaken: 4 });
  records = recordBossRushAttempt(records, { completed: true, time: 210, damageTaken: 2 });
  assert.equal(records.bossRush.attempts, 3);
  assert.equal(records.bossRush.completions, 2);
  assert.equal(records.bossRush.bestTime, 180);
  assert.equal(records.bossRush.leastDamage, 2);
});

test('Contract records track attempts, completions, first completion, and best score', () => {
  let records = createDefaultModeRecords();
  records = recordContractAttempt(records, 'one-heart', { completed: false, score: 900 });
  records = recordContractAttempt(records, 'one-heart', { completed: true, score: 1200 });
  const entry = records.contracts['one-heart'];
  assert.equal(entry.attempts, 2);
  assert.equal(entry.completions, 1);
  assert.equal(entry.bestScore, 1200);
  assert.ok(entry.firstCompletedAt);
  assert.equal(contractById('one-heart').modifier, 'one-heart');
});

test('malformed mode records are repaired safely', () => {
  const records = normalizeModeRecords({
    endless: { attempts: -4, bestWave: '12.9' },
    bossRush: { completions: '2.8', bestTime: 'bad' },
    contracts: { 'one-heart': { attempts: 3, completions: -1 }, unsupported: { attempts: 99 } },
  });
  assert.equal(records.endless.attempts, 0);
  assert.equal(records.endless.bestWave, 12);
  assert.equal(records.bossRush.completions, 2);
  assert.equal(records.bossRush.bestTime, 0);
  assert.equal(records.contracts['one-heart'].attempts, 3);
  assert.equal(records.contracts['one-heart'].completions, 0);
  assert.equal(Object.hasOwn(records.contracts, 'unsupported'), false);
});
