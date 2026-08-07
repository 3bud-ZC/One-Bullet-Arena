import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWaveComposition, enemyPoolForWave } from '../src/game-data.js';
import {
  WARDEN_FRONT_DOT,
  WARDEN_GUARD_BREAK_SECONDS,
  WARDEN_GUARD_MAX,
  reflectAgainstGuard,
  wardenHitZone,
} from '../src/core/warden-runtime.js';

test('warden unlocks at wave seven and enters deterministic compositions', () => {
  assert.equal(enemyPoolForWave(6).includes('warden'), false);
  assert.equal(enemyPoolForWave(7).includes('warden'), true);
  assert.equal(buildWaveComposition(7).filter((type) => type === 'warden').length, 1);
  assert.ok(buildWaveComposition(11).includes('warden'));
});

test('warden front arc distinguishes direct shots from flanks', () => {
  assert.equal(WARDEN_FRONT_DOT, 0.32);
  assert.equal(wardenHitZone(0, 1, 0), 'front');
  assert.equal(wardenHitZone(0, 0.5, 0.5), 'front');
  assert.equal(wardenHitZone(0, 0, 1), 'flank');
  assert.equal(wardenHitZone(0, -1, 0), 'flank');
});

test('guard reflection returns a direct projectile away from the shield', () => {
  const reflected = reflectAgainstGuard(-900, 0, 0);
  assert.ok(reflected.x > 899);
  assert.ok(Math.abs(reflected.y) < 0.001);

  const angled = reflectAgainstGuard(-600, 300, 0);
  assert.ok(angled.x > 0);
  assert.ok(angled.y > 0);
  assert.ok(Math.abs(Math.hypot(angled.x, angled.y) - Math.hypot(-600, 300)) < 0.001);
});

test('warden guard limits remain bounded and readable', () => {
  assert.equal(WARDEN_GUARD_MAX, 2);
  assert.equal(WARDEN_GUARD_BREAK_SECONDS, 3.2);
});
