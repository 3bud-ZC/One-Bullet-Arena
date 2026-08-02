import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GAMEPAD_ACTIONS,
  PERFORMANCE_BUDGETS,
  TUTORIAL_STEPS,
  UNIFIED_SAVE_KEYS,
  applyUnifiedSave,
  createDefaultReleaseSettings,
  evaluateFrameSamples,
  normalizeReleaseSettings,
  parseUnifiedSave,
  serializeUnifiedSave,
} from '../src/release-production-data.js';

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => map.has(key) ? map.get(key) : null,
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    snapshot: () => Object.fromEntries(map),
  };
}

test('tutorial covers the complete core interaction loop', () => {
  assert.deepEqual(TUTORIAL_STEPS.map((step) => step.id), ['move', 'shoot', 'recover', 'ricochet', 'dash', 'target', 'upgrade']);
});

test('release settings expose remappable actions and repair unsafe values', () => {
  assert.equal(GAMEPAD_ACTIONS.length, 6);
  const settings = normalizeReleaseSettings({
    gamepadBindings: { fire: 99, dash: 7 },
    deadzone: -1,
    aimSensitivity: 9,
  });
  assert.equal(settings.gamepadBindings.fire, createDefaultReleaseSettings().gamepadBindings.fire);
  assert.equal(settings.gamepadBindings.dash, 7);
  assert.equal(settings.deadzone, 0.05);
  assert.equal(settings.aimSensitivity, 2.5);
});

test('unified save exports only approved keys and restores them', () => {
  const source = memoryStorage({
    'one-bullet-arena-progression': '{"shards":120}',
    'one-bullet-arena-build-codex-v1': '{"version":1}',
    unsupported: 'secret',
  });
  const serialized = serializeUnifiedSave(source, { gameVersion: '1.0.0' });
  const parsed = parseUnifiedSave(serialized);
  assert.equal(parsed.gameVersion, '1.0.0');
  assert.deepEqual(Object.keys(parsed.data).sort(), ['one-bullet-arena-build-codex-v1', 'one-bullet-arena-progression']);
  const target = memoryStorage({ unsupported: 'keep' });
  applyUnifiedSave(target, parsed);
  assert.equal(target.snapshot()['one-bullet-arena-progression'], '{"shards":120}');
  assert.equal(target.snapshot().unsupported, 'keep');
});

test('invalid unified saves are rejected and oversized unknown keys are ignored', () => {
  assert.throws(() => parseUnifiedSave('{"version":1}'), /invalid-unified-save/);
  const parsed = parseUnifiedSave(JSON.stringify({
    format: 'one-bullet-arena-unified-save',
    version: 1,
    data: { unsupported: 'x', [UNIFIED_SAVE_KEYS[0]]: 'valid' },
  }));
  assert.deepEqual(parsed.data, { [UNIFIED_SAVE_KEYS[0]]: 'valid' });
});

test('performance evaluator passes healthy samples and flags slow frames', () => {
  const healthy = evaluateFrameSamples(Array(120).fill(16.5), 'high');
  const slow = evaluateFrameSamples([...Array(100).fill(20), ...Array(20).fill(48)], 'balanced');
  assert.equal(healthy.passed, true);
  assert.ok(healthy.estimatedFps > 59);
  assert.equal(slow.passed, false);
  assert.ok(slow.p95FrameMs > PERFORMANCE_BUDGETS.balanced.maxFrameMs);
});
