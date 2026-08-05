import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaStageForWave, touchControlSafeZones } from '../src/expanding-arena.js';

function area(bounds) {
  return bounds.w * bounds.h;
}

test('the arena expands automatically at waves 3, 6, and 9', () => {
  assert.equal(arenaStageForWave(1).id, 0);
  assert.equal(arenaStageForWave(2).id, 0);
  assert.equal(arenaStageForWave(3).id, 1);
  assert.equal(arenaStageForWave(5).id, 1);
  assert.equal(arenaStageForWave(6).id, 2);
  assert.equal(arenaStageForWave(8).id, 2);
  assert.equal(arenaStageForWave(9).id, 3);
  assert.equal(arenaStageForWave(100).id, 3);
});

test('every unlock increases the playable area', () => {
  const stages = [1, 3, 6, 9].map((wave) => arenaStageForWave(wave));
  const areas = stages.map((stage) => area(stage.bounds));
  assert.ok(areas.every((value, index) => index === 0 || value > areas[index - 1]));
});

test('all arena stages remain inside the fixed canvas', () => {
  for (const wave of [1, 3, 6, 9, 50]) {
    const { bounds } = arenaStageForWave(wave);
    assert.ok(bounds.x >= 0);
    assert.ok(bounds.y >= 0);
    assert.ok(bounds.x + bounds.w <= 1280);
    assert.ok(bounds.y + bounds.h <= 720);
  }
});

test('arena progression contains only combat geometry', () => {
  for (const wave of [1, 3, 6, 9]) {
    const stage = arenaStageForWave(wave);
    assert.ok(stage.obstacles.length >= 2);
    assert.ok(stage.obstacles.every((obstacle) => ['x', 'y', 'w', 'h'].every((key) => Number.isFinite(obstacle[key]))));
    assert.equal('objective' in stage, false);
    assert.equal('sequence' in stage, false);
    assert.equal('requiredHits' in stage, false);
    assert.equal('targets' in stage, false);
  }
});

test('touch controls expose four isolated combat-safe zones', () => {
  const zones = touchControlSafeZones();
  assert.deepEqual(zones.map((zone) => zone.id), ['move', 'dash', 'recall', 'pause']);
  assert.ok(zones.every((zone) => zone.radius >= 55));
  assert.ok(zones.every((zone) => zone.x >= 0 && zone.x <= 1280));
  assert.ok(zones.every((zone) => zone.y >= 0 && zone.y <= 720));
});

test('returned stage and touch-zone data is isolated from later mutation', () => {
  const first = arenaStageForWave(3);
  first.bounds.w = 1;
  first.obstacles[0].x = -999;
  const second = arenaStageForWave(3);
  assert.equal(second.bounds.w, 1040);
  assert.notEqual(second.obstacles[0].x, -999);

  const zones = touchControlSafeZones();
  zones[0].radius = 1;
  assert.notEqual(touchControlSafeZones()[0].radius, 1);
});
