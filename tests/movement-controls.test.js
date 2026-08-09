import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MOVEMENT_HOTFIX_VERSION,
  analogMovementVector,
  separateOverlappingEnemies,
} from '../src/movement-hotfix-runtime.js';

test('movement hotfix exposes its release identifier', () => {
  assert.equal(MOVEMENT_HOTFIX_VERSION, '2.5.1-controls');
});

test('keyboard movement is normalized and opposite keys cancel', () => {
  const diagonal = analogMovementVector(new Set(['w', 'd']));
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 0.0001);
  assert.ok(diagonal.x > 0 && diagonal.y < 0);

  const cancelled = analogMovementVector(new Set(['a', 'd', 'w', 's']));
  assert.deepEqual(cancelled, { x: 0, y: 0 });
});

test('touch movement starts neutral and scales progressively', () => {
  const neutral = analogMovementVector(new Set(), {
    originX: 100,
    originY: 100,
    x: 100,
    y: 100,
  });
  assert.deepEqual(neutral, { x: 0, y: 0 });

  const deadZone = analogMovementVector(new Set(), {
    originX: 100,
    originY: 100,
    x: 108,
    y: 100,
  });
  assert.deepEqual(deadZone, { x: 0, y: 0 });

  const partial = analogMovementVector(new Set(), {
    originX: 100,
    originY: 100,
    x: 131,
    y: 100,
  });
  const full = analogMovementVector(new Set(), {
    originX: 100,
    originY: 100,
    x: 172,
    y: 100,
  });

  assert.ok(partial.x > 0.25 && partial.x < 0.5);
  assert.equal(partial.y, 0);
  assert.ok(full.x > 0.999);
  assert.equal(full.y, 0);
});

test('combined keyboard and touch input never exceeds full speed', () => {
  const combined = analogMovementVector(new Set(['d']), {
    originX: 100,
    originY: 100,
    x: 100,
    y: 28,
  });
  assert.ok(Math.hypot(combined.x, combined.y) <= 1.0001);
  assert.ok(combined.x > 0 && combined.y < 0);
});

test('enemy separation resolves exact coordinate overlap deterministically', () => {
  const firstRun = [
    { id: 17, x: 300, y: 240, radius: 24 },
    { id: 18, x: 300, y: 240, radius: 24 },
  ];
  const secondRun = firstRun.map((enemy) => ({ ...enemy }));
  const constrain = () => {};

  assert.equal(separateOverlappingEnemies(firstRun, constrain), 1);
  assert.equal(separateOverlappingEnemies(secondRun, constrain), 1);
  const spacing = Math.hypot(firstRun[1].x - firstRun[0].x, firstRun[1].y - firstRun[0].y);
  assert.ok(spacing >= 51.999);
  assert.deepEqual(firstRun, secondRun);
});
