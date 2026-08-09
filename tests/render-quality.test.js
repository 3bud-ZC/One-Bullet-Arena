import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_MAX_BACKING_PIXELS,
  LOGICAL_GAME_HEIGHT,
  LOGICAL_GAME_WIDTH,
  computeContainedViewport,
  computeEffectiveDpr,
  mapClientPointToLogical,
} from '../src/render/canvas-viewport.js';

test('logical gameplay dimensions remain deterministic 1280x720', () => {
  assert.equal(LOGICAL_GAME_WIDTH, 1280);
  assert.equal(LOGICAL_GAME_HEIGHT, 720);
});

test('contained viewport preserves 16:9 without geometric distortion', () => {
  for (const [width, height] of [[1920, 1080], [1792, 832], [1680, 1050], [1440, 900], [844, 390]]) {
    const viewport = computeContainedViewport(width, height);
    assert.ok(viewport.width <= width + 0.001);
    assert.ok(viewport.height <= height + 0.001);
    assert.ok(Math.abs(viewport.width / viewport.height - 16 / 9) < 1e-9);
    assert.ok(Math.abs(viewport.width / 1280 - viewport.height / 720) < 1e-9);
  }
});

test('effective DPR increases backing resolution while respecting the pixel budget', () => {
  const dpr1080 = computeEffectiveDpr(2, 1920, 1080);
  assert.equal(dpr1080, 2);
  const pixels1080 = 1920 * 1080 * dpr1080 * dpr1080;
  assert.ok(pixels1080 <= DEFAULT_MAX_BACKING_PIXELS + 1);

  const dpr1440 = computeEffectiveDpr(2.5, 2560, 1440);
  assert.ok(dpr1440 >= 1);
  assert.ok(dpr1440 < 2);
  const pixels1440 = 2560 * 1440 * dpr1440 * dpr1440;
  assert.ok(pixels1440 <= DEFAULT_MAX_BACKING_PIXELS + 1);
});

test('client coordinates map to logical game coordinates independent of backing-store DPR', () => {
  const rect = { left: 200, top: 100, width: 1600, height: 900 };
  assert.deepEqual(mapClientPointToLogical(rect, 200, 100), { x: 0, y: 0 });
  assert.deepEqual(mapClientPointToLogical(rect, 1000, 550), { x: 640, y: 360 });
  assert.deepEqual(mapClientPointToLogical(rect, 1800, 1000), { x: 1280, y: 720 });
});
