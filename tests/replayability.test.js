import test from 'node:test';
import assert from 'node:assert/strict';

import {
  COSMETICS,
  LEGENDARY_UPGRADES,
  RARITY_TIERS,
  createSeededRandom,
  dailyChallengeForDate,
  dateKey,
  decorateUpgradeChoices,
  deriveCosmeticUnlocks,
  evaluateChallenge,
  pickEliteModifier,
  rarityForRoll,
  resolveSynergies,
} from '../src/replayability-data.js';
import { createDefaultSave, normalizeSave, parseImportedSave, serializeSave } from '../src/progression-data.js';

test('seeded random produces a stable sequence', () => {
  const first = createSeededRandom('one-bullet');
  const second = createSeededRandom('one-bullet');
  assert.deepEqual([first(), first(), first()], [second(), second(), second()]);
});

test('rarity rolls progress from legendary through common thresholds', () => {
  assert.equal(rarityForRoll(0, 5, true), 'legendary');
  assert.equal(rarityForRoll(0.14, 5, true), 'epic');
  assert.equal(rarityForRoll(0.4, 3, false), 'rare');
  assert.equal(rarityForRoll(0.99, 1, false), 'common');
  assert.equal(RARITY_TIERS.legendary.power, 2);
});

test('upgrade decoration is deterministic for a seed and keeps valid rarity metadata', () => {
  const base = [
    { id: 'heavy-core', name: 'A', maxStacks: 2 },
    { id: 'hot-ricochet', name: 'B', maxStacks: 3 },
    { id: 'quick-recovery', name: 'C', maxStacks: 3 },
  ];
  const first = decorateUpgradeChoices(base, { wave: 4, seed: 'fixed', stacks: {} });
  const second = decorateUpgradeChoices(base, { wave: 4, seed: 'fixed', stacks: {} });
  assert.deepEqual(first, second);
  assert.equal(first.length, 3);
  assert.ok(first.every((choice) => Boolean(RARITY_TIERS[choice.rarity])));
});

test('legendary upgrades remain unique one-stack build changers', () => {
  assert.equal(new Set(LEGENDARY_UPGRADES.map((item) => item.id)).size, LEGENDARY_UPGRADES.length);
  assert.ok(LEGENDARY_UPGRADES.every((item) => item.maxStacks === 1 && item.rarity === 'legendary'));
});

test('synergy resolver activates only completed combinations', () => {
  assert.deepEqual(resolveSynergies('standard', {}).map((item) => item.id), []);
  assert.deepEqual(
    resolveSynergies('ricochet', { 'hot-ricochet': 1, 'ghost-round': 1 }).map((item) => item.id),
    ['angle-master'],
  );
  assert.ok(resolveSynergies('shock', { 'shock-impact': 1, 'chain-lightning': 1 }).some((item) => item.id === 'storm-loop'));
});

test('elite modifiers are deterministic for wave, index, and seed', () => {
  const first = pickEliteModifier(4, 2, 'daily-seed');
  const second = pickEliteModifier(4, 2, 'daily-seed');
  assert.deepEqual(first, second);
  assert.ok(first.id);
  assert.ok(first.reward > 0);
});

test('challenge evaluation enforces each documented objective', () => {
  assert.equal(evaluateChallenge('untouched', { victory: true, damageTaken: 0 }), true);
  assert.equal(evaluateChallenge('untouched', { victory: true, damageTaken: 1 }), false);
  assert.equal(evaluateChallenge('triple-kill', { maxKillsPerShot: 3 }), true);
  assert.equal(evaluateChallenge('eight-bounces', { maxBounces: 8 }), true);
  assert.equal(evaluateChallenge('dashless', { victory: true, dashes: 0 }), true);
  assert.equal(evaluateChallenge('limited-shots', { victory: true, shots: 31 }), false);
  assert.equal(evaluateChallenge('elite-hunter', { eliteKills: 3 }), true);
});

test('daily challenge is stable for a calendar date and changes its seed across dates', () => {
  const first = dailyChallengeForDate('2026-08-02T12:00:00');
  const repeat = dailyChallengeForDate('2026-08-02T20:00:00');
  const next = dailyChallengeForDate('2026-08-03T12:00:00');
  assert.equal(first.date, '2026-08-02');
  assert.equal(first.seed, repeat.seed);
  assert.deepEqual(first.challenge, repeat.challenge);
  assert.notEqual(first.seed, next.seed);
  assert.equal(dateKey('2026-08-02T12:00:00'), '2026-08-02');
});

test('cosmetic rewards unlock from replayability totals without duplicates', () => {
  const unlocked = deriveCosmeticUnlocks({
    totals: { challengesCompleted: 3, dailyWins: 1, legendaryPicks: 3, eliteKills: 10 },
    daily: { streak: 3 },
  });
  assert.ok(unlocked.includes('player-crimson'));
  assert.ok(unlocked.includes('player-void'));
  assert.ok(unlocked.includes('bullet-prism'));
  assert.ok(unlocked.includes('trail-gold'));
  assert.ok(unlocked.includes('dash-violet'));
  assert.ok(unlocked.includes('hud-void'));
  assert.equal(new Set(unlocked).size, unlocked.length);
  assert.ok(COSMETICS.length >= 10);
});

test('version two progression save preserves replayability through export and import', () => {
  const save = createDefaultSave();
  save.replayability.totals.challengesCompleted = 4;
  save.replayability.totals.eliteKills = 12;
  save.replayability.unlockedCosmetics.push('player-crimson', 'hud-void');
  save.replayability.selectedCosmetics.player = 'player-crimson';
  save.replayability.daily.streak = 3;
  save.replayability.daily.records['2026-08-02'] = { attempts: 2, bestScore: 9000, bestTime: 140, completed: true };
  const imported = parseImportedSave(serializeSave(save));
  assert.equal(imported.version, 2);
  assert.equal(imported.replayability.totals.challengesCompleted, 4);
  assert.equal(imported.replayability.selectedCosmetics.player, 'player-crimson');
  assert.equal(imported.replayability.daily.records['2026-08-02'].completed, true);
});

test('malformed replayability fields are normalized safely', () => {
  const save = normalizeSave({
    replayability: {
      unlockedCosmetics: ['player-crimson', 4, null],
      selectedCosmetics: { player: 'locked-missing' },
      totals: { eliteKills: -8, legendaryPicks: '3' },
      daily: { streak: -1, records: { bad: { attempts: 3 } } },
    },
  });
  assert.equal(save.replayability.totals.eliteKills, 0);
  assert.equal(save.replayability.totals.legendaryPicks, 3);
  assert.equal(save.replayability.daily.streak, 0);
  assert.equal(save.replayability.selectedCosmetics.player, 'player-cyan');
  assert.deepEqual(save.replayability.daily.records, {});
});
