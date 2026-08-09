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

test('timing reset prevents pause/background gaps from becoming catch-up simulation', () => {
  const clock = new FixedStepClock({ simulationHz: 120, maxCatchUpSteps: 8, maxFrameDelta: 0.1 });
  clock.tick(1000, () => {});
  let calls = 0;
  clock.tick(1017, () => { calls += 1; });
  assert.ok(calls >= 1);
  clock.reset(20_000);
  calls = 0;
  const resumed = clock.tick(20_008, () => { calls += 1; });
  assert.equal(calls, 0);
  assert.equal(resumed.dropped, 0);
  assert.ok(resumed.alpha > 0 && resumed.alpha < 1);
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

test('frame pacing diagnostics keep a bounded ring buffer under long high-refresh runs', () => {
  const pacer = new FramePacer({ windowSize: 120 });
  for (let frame = 0; frame <= 2000; frame += 1) pacer.sample(frame * (1000 / 240), 0);
  assert.equal(pacer.samples.length, 120);
  assert.ok(pacer.sampleCursor >= 0 && pacer.sampleCursor < 120);
  assert.equal(pacer.snapshot().sampleCount, 120);
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

test('stable desktop v-sync can promote AUTO quality without pretending v-sync wait is render cost', () => {
  const manager = new AdaptiveQualityManager({ storage: memoryStorage(), mode: 'AUTO', coarsePointer: false, viewportWidth: 1920 });
  const stable60 = { estimatedRefreshHz: 60, averageFrameMs: 16.67, p95FrameMs: 16.75 };
  let decision;
  for (let index = 0; index < 16; index += 1) decision = manager.observe(stable60, 0.5);
  assert.equal(decision.changed, true);
  assert.equal(manager.tier, 'ULTRA');
  assert.equal(manager.snapshot().autoCeiling, 'ULTRA');
});

test('AUTO quality keeps a thermal-aware ceiling on coarse-pointer mobile while manual tiers stay available', () => {
  const manager = new AdaptiveQualityManager({ storage: memoryStorage(), mode: 'AUTO', coarsePointer: true, viewportWidth: 844 });
  assert.equal(manager.tier, 'BALANCED');
  assert.equal(manager.snapshot().autoCeiling, 'BALANCED');
  const stable = { estimatedRefreshHz: 120, averageFrameMs: 8.33, p95FrameMs: 8.4 };
  for (let index = 0; index < 30; index += 1) manager.observe(stable, 0.5);
  assert.equal(manager.tier, 'BALANCED');
  manager.setMode('ULTRA', { persist: false });
  assert.equal(manager.tier, 'ULTRA');
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
