import test from 'node:test';
import assert from 'node:assert/strict';
import { clamp, circlesOverlap, normalize, randomPointOutsideRadius } from '../src/math.js';

test('normalize returns a unit vector', () => {
  assert.deepEqual(normalize(3, 4), { x: 0.6, y: 0.8 });
  assert.deepEqual(normalize(0, 0), { x: 0, y: 0 });
});

test('clamp keeps values inside the requested range', () => {
  assert.equal(clamp(-4, 0, 10), 0);
  assert.equal(clamp(12, 0, 10), 10);
  assert.equal(clamp(5, 0, 10), 5);
});

test('circle collision respects combined radii', () => {
  assert.equal(circlesOverlap({ x: 0, y: 0, radius: 5 }, { x: 9, y: 0, radius: 5 }), true);
  assert.equal(circlesOverlap({ x: 0, y: 0, radius: 5 }, { x: 11, y: 0, radius: 5 }), false);
});

test('spawn helper returns a point outside the exclusion radius', () => {
  const sequence = [0.5, 0.5, 0, 0];
  let index = 0;
  const point = randomPointOutsideRadius(100, 100, { x: 50, y: 50 }, 25, 10, () => sequence[index++]);
  assert.deepEqual(point, { x: 10, y: 10 });
});
