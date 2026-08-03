import test from 'node:test';
import assert from 'node:assert/strict';
import { safeRelayPosition } from '../src/map-overhaul-safety.js';

const RESERVED_ZONES = Object.freeze([
  { x: 0, y: 0, w: 400, h: 145 },
  { x: 880, y: 0, w: 400, h: 145 },
  { x: 0, y: 500, w: 350, h: 220 },
  { x: 930, y: 500, w: 350, h: 220 },
]);

function insideZone(point, zone, padding = 34) {
  return point.x >= zone.x - padding
    && point.x <= zone.x + zone.w + padding
    && point.y >= zone.y - padding
    && point.y <= zone.y + zone.h + padding;
}

test('interactive relay positions avoid HUD and mobile touch-control zones', () => {
  const positions = [0, 1, 2].map((index) => safeRelayPosition(index));
  assert.equal(new Set(positions.map((point) => `${point.x}:${point.y}`)).size, positions.length);
  for (const point of positions) {
    assert.ok(point.x >= 80 && point.x <= 1200);
    assert.ok(point.y >= 165 && point.y <= 555);
    assert.ok(RESERVED_ZONES.every((zone) => !insideZone(point, zone)));
  }
});

test('relay placement is deterministic and safely wraps extra indices', () => {
  assert.deepEqual(safeRelayPosition(0), safeRelayPosition(4));
  assert.deepEqual(safeRelayPosition(1), safeRelayPosition(5));
  assert.deepEqual(safeRelayPosition(-10), safeRelayPosition(0));
});
