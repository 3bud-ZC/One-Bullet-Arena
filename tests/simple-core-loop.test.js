import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SIMPLE_GAME_VERSION,
  UPGRADES,
  availableUpgrades,
  buildWaveComposition,
  enemyPoolForWave,
  enemyScaleForWave,
  normalizedStacks,
  pickUpgradeChoices,
} from '../src/simple-data.js';

test('simple release exposes the expanding-arena version', () => {
  assert.equal(SIMPLE_GAME_VERSION, '2.1.0-simple');
});

test('wave one is a readable three-scout encounter', () => {
  assert.deepEqual(buildWaveComposition(1), ['scout', 'scout', 'scout']);
});

test('enemy roster unlocks gradually inside one mode', () => {
  assert.deepEqual(enemyPoolForWave(1), ['scout']);
  assert.deepEqual(enemyPoolForWave(3), ['scout', 'brute', 'sniper']);
  assert.deepEqual(enemyPoolForWave(6), ['scout', 'brute', 'sniper', 'charger', 'splitter']);
});

test('wave population grows gradually and remains capped', () => {
  const counts = Array.from({ length: 20 }, (_, index) => buildWaveComposition(index + 1).length);
  assert.equal(counts[0], 3);
  assert.ok(counts.every((count, index) => index === 0 || count >= counts[index - 1]));
  assert.ok(counts.every((count) => count <= 14));
  assert.equal(counts.at(-1), 14);
});

test('enemy scaling is monotonic and bounded', () => {
  const first = enemyScaleForWave(1);
  const tenth = enemyScaleForWave(10);
  const hundredth = enemyScaleForWave(100);
  assert.deepEqual(first, { health: 1, speed: 1, shotSpeed: 1 });
  assert.ok(tenth.health > first.health);
  assert.ok(tenth.speed > first.speed);
  assert.ok(hundredth.health <= 2.35);
  assert.ok(hundredth.speed <= 1.34);
  assert.ok(hundredth.shotSpeed <= 1.4);
});

test('upgrade catalog contains only run abilities', () => {
  assert.equal(UPGRADES.length, 13);
  assert.equal(new Set(UPGRADES.map((upgrade) => upgrade.id)).size, UPGRADES.length);
  assert.ok(UPGRADES.every((upgrade) => upgrade.maxStacks >= 1));
});

test('normalized stacks clamp invalid and excessive values', () => {
  const result = normalizedStacks({ 'heavy-shot': 99, vitality: -4, 'quick-dash': '2' });
  assert.equal(result['heavy-shot'], 8);
  assert.equal(result.vitality, 0);
  assert.equal(result['quick-dash'], 2);
});

test('maxed upgrades are removed from future choices', () => {
  const stacks = Object.fromEntries(UPGRADES.map((upgrade) => [upgrade.id, 0]));
  stacks['second-chance'] = 1;
  const available = availableUpgrades(stacks);
  assert.ok(!available.some((upgrade) => upgrade.id === 'second-chance'));
});

test('three upgrade choices are unique and deterministic with injected random', () => {
  const sequence = [0, 0, 0];
  let cursor = 0;
  const choices = pickUpgradeChoices({}, 3, () => sequence[cursor++] ?? 0);
  assert.equal(choices.length, 3);
  assert.equal(new Set(choices.map((choice) => choice.id)).size, 3);
  assert.deepEqual(choices.map((choice) => choice.id), ['heavy-shot', 'extended-ricochet', 'hot-ricochet']);
});

test('no choices remain after every ability reaches its cap', () => {
  const stacks = Object.fromEntries(UPGRADES.map((upgrade) => [upgrade.id, upgrade.maxStacks]));
  assert.deepEqual(pickUpgradeChoices(stacks, 3, () => 0), []);
});
