import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GAME_VERSION,
  MAX_ACTIVE_ENEMIES,
  UPGRADES,
  buildWaveComposition,
  enemyCountForWave,
  enemyPoolForWave,
  enemyScaleForWave,
  normalizedStacks,
  pickUpgradeChoices,
} from '../src/game-data.js';
import {
  ARENA_STAGE_COUNT,
  arenaStageForWave,
  circleRectOverlap,
  mobileSafeZones,
  pushCircleOutOfSafeZones,
  resolveCircleAgainstRect,
} from '../src/arena.js';

test('release exposes the clean core version', () => {
  assert.equal(GAME_VERSION, '2.2.0-clean');
});

test('the first two waves contain scouts only', () => {
  assert.deepEqual(buildWaveComposition(1), ['scout', 'scout', 'scout']);
  assert.ok(buildWaveComposition(2).every((type) => type === 'scout'));
});

test('enemy roster unlocks gradually without alternate modes', () => {
  assert.deepEqual(enemyPoolForWave(1), ['scout']);
  assert.deepEqual(enemyPoolForWave(3), ['scout', 'brute']);
  assert.deepEqual(enemyPoolForWave(6), ['scout', 'brute', 'sniper', 'charger']);
  assert.deepEqual(enemyPoolForWave(8), ['scout', 'brute', 'sniper', 'charger', 'splitter']);
});

test('wave population grows gradually and stays capped', () => {
  const counts = Array.from({ length: 30 }, (_, index) => enemyCountForWave(index + 1));
  assert.equal(counts[0], 3);
  assert.ok(counts.every((count, index) => index === 0 || count >= counts[index - 1]));
  assert.ok(counts.every((count) => count <= MAX_ACTIVE_ENEMIES));
  assert.equal(counts.at(-1), MAX_ACTIVE_ENEMIES);
});

test('enemy scaling remains monotonic and bounded', () => {
  const first = enemyScaleForWave(1);
  const tenth = enemyScaleForWave(10);
  const hundredth = enemyScaleForWave(100);
  assert.deepEqual(first, { health: 1, speed: 1, shotSpeed: 1 });
  assert.ok(tenth.health > first.health);
  assert.ok(tenth.speed > first.speed);
  assert.ok(hundredth.health <= 2.1);
  assert.ok(hundredth.speed <= 1.28);
  assert.ok(hundredth.shotSpeed <= 1.32);
});

test('upgrade catalog contains only in-run abilities', () => {
  assert.equal(UPGRADES.length, 12);
  assert.equal(new Set(UPGRADES.map((upgrade) => upgrade.id)).size, UPGRADES.length);
  assert.ok(UPGRADES.every((upgrade) => upgrade.maxStacks >= 1));
});

test('invalid upgrade stacks are normalized', () => {
  const stacks = normalizedStacks({ 'heavy-shot': 999, vitality: -4, 'quick-dash': '2' });
  assert.equal(stacks['heavy-shot'], 10);
  assert.equal(stacks.vitality, 0);
  assert.equal(stacks['quick-dash'], 2);
});

test('upgrade choices are unique and avoid previous cards when possible', () => {
  const previous = ['heavy-shot', 'bullet-velocity', 'extended-ricochet'];
  const choices = pickUpgradeChoices({}, 3, () => 0, previous);
  assert.equal(choices.length, 3);
  assert.equal(new Set(choices.map((choice) => choice.id)).size, 3);
  assert.ok(choices.every((choice) => !previous.includes(choice.id)));
});

test('arena expands automatically at waves 3, 6, and 9', () => {
  assert.equal(ARENA_STAGE_COUNT, 4);
  assert.equal(arenaStageForWave(1).id, 0);
  assert.equal(arenaStageForWave(2).id, 0);
  assert.equal(arenaStageForWave(3).id, 1);
  assert.equal(arenaStageForWave(6).id, 2);
  assert.equal(arenaStageForWave(9).id, 3);
  assert.equal(arenaStageForWave(99).id, 3);
});

test('each arena unlock increases playable area', () => {
  const stages = [1, 3, 6, 9].map(arenaStageForWave);
  const areas = stages.map(({ bounds }) => bounds.w * bounds.h);
  assert.ok(areas.every((area, index) => index === 0 || area > areas[index - 1]));
});

test('arena data contains combat geometry only', () => {
  for (const wave of [1, 3, 6, 9]) {
    const stage = arenaStageForWave(wave);
    assert.equal('objective' in stage, false);
    assert.equal('targets' in stage, false);
    assert.equal('requiredHits' in stage, false);
    assert.ok(stage.obstacles.every((rect) => ['x', 'y', 'w', 'h'].every((key) => Number.isFinite(rect[key]))));
  }
});

test('arena stage results are isolated from mutation', () => {
  const first = arenaStageForWave(3);
  first.bounds.w = 1;
  first.obstacles[0].x = -999;
  const second = arenaStageForWave(3);
  assert.equal(second.bounds.w, 1040);
  assert.notEqual(second.obstacles[0].x, -999);
});

test('circle resolution escapes even when its center is inside an obstacle', () => {
  const circle = { x: 50, y: 50, radius: 10 };
  const rect = { x: 20, y: 20, w: 60, h: 60 };
  assert.equal(circleRectOverlap(circle, rect), true);
  assert.equal(resolveCircleAgainstRect(circle, rect), true);
  assert.equal(circleRectOverlap(circle, rect), false);
});

test('mobile controls reserve four isolated combat-safe zones', () => {
  const zones = mobileSafeZones();
  assert.deepEqual(zones.map((zone) => zone.id), ['move', 'recall', 'dash', 'pause']);
  for (let first = 0; first < zones.length; first += 1) {
    for (let second = first + 1; second < zones.length; second += 1) {
      const a = zones[first];
      const b = zones[second];
      const overlap = a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
      assert.equal(overlap, false, `${a.id} overlaps ${b.id}`);
    }
  }
});

test('mobile safe zones always push combat circles into visible space', () => {
  for (const zone of mobileSafeZones()) {
    const circle = { x: zone.x + zone.w / 2, y: zone.y + zone.h / 2, radius: 18 };
    assert.equal(pushCircleOutOfSafeZones(circle, [zone]), true);
    assert.equal(circleRectOverlap(circle, zone), false, zone.id);
  }
});
