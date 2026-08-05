import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GAME_VERSION, MAX_ACTIVE_ENEMIES, UPGRADES, buildWaveComposition,
  enemyCountForWave, enemyPoolForWave, enemyScaleForWave, normalizedStacks, pickUpgradeChoices,
} from '../src/game-data.js';
import {
  ARENA_STAGE_COUNT, arenaStageForWave, circleRectOverlap, mobileSafeZones,
  pushCircleOutOfSafeZones, resolveCircleAgainstRect,
} from '../src/arena.js';

test('release exposes the stable version', () => assert.equal(GAME_VERSION, '2.3.0-stable'));

test('the product has one gradual enemy progression', () => {
  assert.deepEqual(buildWaveComposition(1), ['scout', 'scout', 'scout']);
  assert.ok(buildWaveComposition(2).every((type) => type === 'scout'));
  assert.deepEqual(enemyPoolForWave(3), ['scout', 'brute']);
  assert.ok(enemyPoolForWave(8).includes('splitter'));
});

test('wave pressure grows gradually and remains capped', () => {
  const counts = Array.from({ length: 40 }, (_, index) => enemyCountForWave(index + 1));
  assert.equal(counts[0], 3);
  assert.ok(counts.every((count, index) => index === 0 || count >= counts[index - 1]));
  assert.ok(counts.every((count) => count <= MAX_ACTIVE_ENEMIES));
  assert.equal(counts.at(-1), MAX_ACTIVE_ENEMIES);
});

test('dangerous enemy types remain bounded in generated waves', () => {
  for (let wave = 1; wave <= 60; wave += 1) {
    const composition = buildWaveComposition(wave);
    assert.equal(composition.length, enemyCountForWave(wave));
    assert.ok(composition.filter((type) => type === 'sniper').length <= 1);
    assert.ok(composition.filter((type) => type === 'charger').length <= 1);
    assert.ok(composition.filter((type) => type === 'splitter').length <= 1);
    assert.ok(composition.includes('scout'));
  }
});

test('enemy scaling remains monotonic and bounded', () => {
  const first = enemyScaleForWave(1);
  const tenth = enemyScaleForWave(10);
  const hundredth = enemyScaleForWave(100);
  assert.ok(tenth.health > first.health && tenth.speed > first.speed);
  assert.ok(hundredth.health <= 2.1 && hundredth.speed <= 1.28 && hundredth.shotSpeed <= 1.32);
});

test('all upgrade stacks have a real effect boundary', () => {
  assert.equal(UPGRADES.length, 12);
  assert.equal(UPGRADES.find((upgrade) => upgrade.id === 'wave-shield').maxStacks, 1);
  const stacks = normalizedStacks({ 'heavy-shot': 999, vitality: -4, 'quick-dash': '2' });
  assert.equal(stacks['heavy-shot'], 10);
  assert.equal(stacks.vitality, 0);
  assert.equal(stacks['quick-dash'], 2);
});

test('upgrade choices are unique and avoid the previous cards', () => {
  const previous = ['heavy-shot', 'bullet-velocity', 'extended-ricochet'];
  const choices = pickUpgradeChoices({}, 3, () => 0, previous);
  assert.equal(new Set(choices.map((choice) => choice.id)).size, 3);
  assert.ok(choices.every((choice) => !previous.includes(choice.id)));
});

test('the same arena expands automatically without alternate objectives', () => {
  assert.equal(ARENA_STAGE_COUNT, 4);
  assert.deepEqual([1, 3, 6, 9, 99].map((wave) => arenaStageForWave(wave).id), [0, 1, 2, 3, 3]);
  for (const wave of [1, 3, 6, 9]) {
    const stage = arenaStageForWave(wave);
    assert.equal('objective' in stage, false);
    assert.equal('targets' in stage, false);
  }
});

test('collision recovery escapes obstacle interiors', () => {
  const circle = { x: 50, y: 50, radius: 10 };
  const rect = { x: 20, y: 20, w: 60, h: 60 };
  assert.equal(resolveCircleAgainstRect(circle, rect), true);
  assert.equal(circleRectOverlap(circle, rect), false);
});

test('mobile safe zones are isolated and push entities clear', () => {
  const zones = mobileSafeZones();
  assert.deepEqual(zones.map((zone) => zone.id), ['move', 'recall', 'dash', 'pause']);
  for (const zone of zones) {
    const circle = { x: zone.x + zone.w / 2, y: zone.y + zone.h / 2, radius: 18 };
    assert.equal(pushCircleOutOfSafeZones(circle, [zone]), true);
    assert.equal(circleRectOverlap(circle, zone), false);
  }
});
