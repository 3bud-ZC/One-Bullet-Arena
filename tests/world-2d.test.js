import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  WORLD_2D_RUNTIME_VERSION,
  floorTileVariant,
  smoothVisualValue,
  world2DThemeTokens,
} from '../src/core/world-2d-runtime.js';

test('world 2D runtime exposes a stable release contract', () => {
  const tokens = world2DThemeTokens();
  assert.equal(WORLD_2D_RUNTIME_VERSION, '3.2.0-true-2d');
  assert.equal(tokens.version, WORLD_2D_RUNTIME_VERSION);
  assert.equal(tokens.style, 'layered-top-down-2d');
  assert.equal(tokens.stableHud, true);
  assert.equal(tokens.deterministicShake, true);
  assert.equal(tokens.gameplayGeometryChanged, false);
  assert.ok(Object.isFrozen(tokens));
});

test('visual smoothing approaches the target without overshooting', () => {
  const first = smoothVisualValue(0, 1, 1 / 60, 14);
  const second = smoothVisualValue(first, 1, 1 / 60, 14);
  assert.ok(first > 0 && first < 1);
  assert.ok(second > first && second < 1);
  assert.equal(smoothVisualValue(4, 9, 0, 14), 4);
  assert.equal(smoothVisualValue(3, 3, 1, 14), 3);
});

test('floor tile variants are deterministic and bounded', () => {
  const sample = [];
  for (let row = -3; row <= 3; row += 1) {
    for (let column = -3; column <= 3; column += 1) {
      const variant = floorTileVariant(column, row, 2);
      assert.ok(variant >= 0 && variant <= 3);
      sample.push(variant);
    }
  }
  assert.deepEqual(sample, sample.map((_, index) => {
    const row = Math.floor(index / 7) - 3;
    const column = (index % 7) - 3;
    return floorTileVariant(column, row, 2);
  }));
  assert.ok(new Set(sample).size >= 3);
});

test('true 2D runtime is render-only and preserves gameplay geometry', async () => {
  const source = await readFile(new URL('../src/core/world-2d-runtime.js', import.meta.url), 'utf8');
  assert.match(source, /extends OneBulletWardenRuntime/);
  assert.match(source, /super\.update\(safeDt\)/);
  assert.match(source, /gameplayGeometryChanged: false/);
  assert.match(source, /stableHudDuringShake: true/);
  assert.doesNotMatch(source, /arenaStage\.obstacles\s*=/);
  assert.doesNotMatch(source, /player\.speed\s*=/);
  assert.doesNotMatch(source, /enemy\.speed\s*=/);
});
