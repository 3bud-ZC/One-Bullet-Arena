import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SIMULATION_HZ,
  FixedStepClock,
  FramePacer,
  lerp,
  simulateRenderSchedule,
} from '../src/performance/frame-pacer.js';
import {
  AdaptiveQualityManager,
  QUALITY_PROFILES,
  QUALITY_STORAGE_KEY,
  loadQualityMode,
  saveQualityMode,
} from '../src/performance/quality-manager.js';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
  };
}

test('fixed simulation is 120 Hz and independent from render cadence', () => {
  assert.equal(DEFAULT_SIMULATION_HZ, 120);
  const schedules = [60, 120, 144, 165, 240].map((hz) => ({ hz, ...simulateRenderSchedule({ hz, seconds: 2 }) }));
  for (const schedule of schedules) {
    assert.ok(Math.abs(schedule.simulatedSeconds - 2) <= 1 / 120 + 1e-9, `${schedule.hz} Hz drifted`);
    assert.ok(Math.abs(schedule.steps - 240) <= 1, `${schedule.hz} Hz changed simulation step count`);
    assert.equal(schedule.droppedSeconds, 0);
  }
  assert.ok(Math.max(...schedules.map((entry) => entry.steps)) - Math.min(...schedules.map((entry) => entry.steps)) <= 1);
});

test('fixed clock bounds catch-up work after a long frame', () => {
  const clock = new FixedStepClock({ simulationHz: 120, maxCatchUpSteps: 8, maxFrameDelta: 0.1 });
  clock.tick(0, () => {});
  let calls = 0;
  const result = clock.tick(800, () => { calls += 1; });
  assert.equal(calls, 8);
  assert.equal(result.steps, 8);
  assert.ok(result.dropped > 0);
  assert.ok(result.alpha >= 0 && result.alpha < 1);
});

test('interpolation is clamped to the previous/current simulation boundary', () => {
  assert.equal(lerp(10, 20, -3), 10);
  assert.equal(lerp(10, 20, 0), 10);
  assert.equal(lerp(10, 20, 0.5), 15);
  assert.equal(lerp(10, 20, 1), 20);
  assert.equal(lerp(10, 20, 4), 20);
});

test('frame pacer estimates native requestAnimationFrame cadence without a 60 FPS cap', () => {
  const pacer = new FramePacer({ windowSize: 300 });
  for (let frame = 0; frame <= 240; frame += 1) pacer.sample(frame * (1000 / 240), frame % 2);
  const snapshot = pacer.snapshot();
  assert.ok(snapshot.estimatedRefreshHz > 235 && snapshot.estimatedRefreshHz <= 240.1);
  assert.ok(snapshot.renderFps > 235);
  assert.ok(snapshot.medianFrameMs < 4.3);
});

test('render quality preference persists independently from gameplay state', () => {
  const storage = memoryStorage();
  assert.equal(loadQualityMode(storage), 'AUTO');
  assert.equal(saveQualityMode('balanced', storage), 'BALANCED');
  assert.equal(storage.getItem(QUALITY_STORAGE_KEY), 'BALANCED');
  assert.equal(loadQualityMode(storage), 'BALANCED');
});

test('AUTO quality uses sustained measured pressure with hysteresis', () => {
  const manager = new AdaptiveQualityManager({ storage: memoryStorage(), mode: 'AUTO', coarsePointer: false, viewportWidth: 1920 });
  assert.equal(manager.tier, 'HIGH');
  const pressured = { estimatedRefreshHz: 144, averageFrameMs: 13, p95FrameMs: 17 };
  let decision;
  for (let index = 0; index < 5; index += 1) decision = manager.observe(pressured, 0.5);
  assert.equal(decision.changed, true);
  assert.equal(manager.tier, 'BALANCED');

  const immediatelyComfortable = { estimatedRefreshHz: 144, averageFrameMs: 3.5, p95FrameMs: 4.5 };
  decision = manager.observe(immediatelyComfortable, 0.5);
  assert.equal(decision.changed, false);
  assert.equal(manager.tier, 'BALANCED');
});

test('manual quality tiers only alter visual cost profiles', () => {
  const manager = new AdaptiveQualityManager({ storage: memoryStorage(), mode: 'AUTO' });
  for (const tier of ['ULTRA', 'HIGH', 'BALANCED', 'PERFORMANCE']) {
    manager.setMode(tier, { persist: false });
    assert.equal(manager.tier, tier);
    const profile = manager.profile;
    assert.equal(profile.id, tier);
    assert.ok(profile.maxDpr >= 1);
    assert.ok(profile.particleCap >= 48);
    assert.equal('enemyCount' in profile, false);
    assert.equal('bulletSpeed' in profile, false);
    assert.equal('damage' in profile, false);
  }
  assert.ok(QUALITY_PROFILES.ULTRA.maxDpr > QUALITY_PROFILES.PERFORMANCE.maxDpr);
  assert.ok(QUALITY_PROFILES.ULTRA.particleCap > QUALITY_PROFILES.PERFORMANCE.particleCap);
});
