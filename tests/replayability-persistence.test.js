import test from 'node:test';
import assert from 'node:assert/strict';

import { createDefaultSave } from '../src/progression-data.js';
import { challengeById } from '../src/replayability-data.js';
import { settleReplayabilityProgress } from '../src/replayability-persistence.js';

function saveWithRun() {
  const save = createDefaultSave();
  save.history.push({
    id: 'run-1',
    playedAt: '2026-08-02T00:00:00.000Z',
    victory: true,
    score: 9000,
    wave: 5,
    rank: 'A',
    runTime: 145,
    shots: 25,
    hits: 18,
    accuracy: 0.72,
    ricochets: 30,
    kills: 18,
    coreId: 'standard',
    shards: 120,
    challengeId: '',
    challengeCompleted: false,
    daily: false,
    eliteKills: 0,
    legendaryPicks: 0,
  });
  return save;
}

test('settlement persists challenge bonus, metrics, and forced daily core', () => {
  const source = saveWithRun();
  const result = settleReplayabilityProgress(source, {
    summary: {
      challenge: challengeById('triple-kill'),
      completed: true,
      bonus: 70,
      daily: true,
    },
    metrics: { eliteKills: 3, legendaryPicks: 2 },
    runId: 'run-1',
    activeCoreId: 'shock',
  });

  assert.equal(result.settled, true);
  assert.equal(result.save.shards, 70);
  assert.equal(result.save.stats.totalShardsEarned, 70);
  assert.equal(result.save.replayability.totals.challengesCompleted, 1);
  assert.equal(result.save.replayability.totals.eliteKills, 3);
  assert.equal(result.save.replayability.totals.legendaryPicks, 2);
  assert.equal(result.save.history[0].challengeId, 'triple-kill');
  assert.equal(result.save.history[0].challengeCompleted, true);
  assert.equal(result.save.history[0].daily, true);
  assert.equal(result.save.history[0].coreId, 'shock');
  assert.equal(result.save.history[0].shards, 190);
});

test('settlement does not duplicate rewards when the same run is processed again', () => {
  const first = settleReplayabilityProgress(saveWithRun(), {
    summary: {
      challenge: challengeById('eight-bounces'),
      completed: true,
      bonus: 42,
      daily: false,
    },
    metrics: { eliteKills: 1, legendaryPicks: 1 },
    runId: 'run-1',
    activeCoreId: 'ricochet',
  });
  const second = settleReplayabilityProgress(first.save, {
    summary: {
      challenge: challengeById('eight-bounces'),
      completed: true,
      bonus: 42,
      daily: false,
    },
    metrics: { eliteKills: 1, legendaryPicks: 1 },
    runId: 'run-1',
    activeCoreId: 'ricochet',
  });

  assert.equal(second.settled, false);
  assert.equal(second.save.shards, 42);
  assert.equal(second.save.replayability.totals.challengesCompleted, 1);
  assert.equal(second.save.replayability.totals.eliteKills, 1);
});

test('settlement unlocks cosmetics from updated totals', () => {
  const source = saveWithRun();
  source.replayability.totals.challengesCompleted = 2;
  source.replayability.totals.eliteKills = 9;
  const result = settleReplayabilityProgress(source, {
    summary: {
      challenge: challengeById('elite-hunter'),
      completed: true,
      bonus: 50,
      daily: false,
    },
    metrics: { eliteKills: 1, legendaryPicks: 0 },
    runId: 'run-1',
    activeCoreId: 'heavy',
  });

  assert.ok(result.save.replayability.unlockedCosmetics.includes('player-crimson'));
  assert.ok(result.save.replayability.unlockedCosmetics.includes('hud-void'));
  assert.ok(result.newCosmetics.some((item) => item.id === 'player-crimson'));
  assert.ok(result.newCosmetics.some((item) => item.id === 'hud-void'));
});
