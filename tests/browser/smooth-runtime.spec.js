import { expect, test } from '@playwright/test';

async function loadGame(page) {
  await page.addInitScript(() => {
    localStorage.setItem('one-bullet-language', 'en');
    localStorage.removeItem('one-bullet-render-quality');
  });
  await page.goto('/?qa=1');
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__?.getPerformanceSnapshot));
}

async function createDenseScene(page) {
  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.wave = 66;
    game.startNextWave();
    game.banner = null;
    game.tutorialStep = 3;
    for (const enemy of game.enemies) enemy.spawnTime = 0;
    for (let index = 0; index < Math.min(10, game.enemies.length); index += 1) {
      const enemy = game.enemies[index];
      const dx = game.player.x - enemy.x;
      const dy = game.player.y - enemy.y;
      const length = Math.hypot(dx, dy) || 1;
      game.fireEnemyShot?.(enemy, { x: dx / length, y: dy / length }, 280 + index * 5);
    }
    for (let index = 0; index < 8; index += 1) {
      game.createBurst(game.player.x + index * 8, game.player.y, '#62f3ff', 18, 160);
    }
    game.keys.add('d');
  });
}

async function sampleRaf(page, durationMs = 1400) {
  return page.evaluate((duration) => new Promise((resolve) => {
    const samples = [];
    let started = null;
    let previous = null;
    let observedCallbacks = 0;
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(safetyTimer);
      const sorted = samples
        .filter((value) => Number.isFinite(value) && value > 0)
        .sort((a, b) => a - b);
      const average = sorted.length ? sorted.reduce((sum, value) => sum + value, 0) / sorted.length : 0;
      const percentile = (ratio) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))] || 0;
      resolve({
        frames: sorted.length,
        observedCallbacks,
        elapsedMs: started !== null && previous !== null ? Math.max(0, previous - started) : 0,
        longFrameCount: sorted.filter((value) => value >= 250).length,
        averageFrameMs: average,
        medianFrameMs: percentile(.5),
        p95FrameMs: percentile(.95),
        p99FrameMs: percentile(.99),
        renderFps: average > 0 ? 1000 / average : 0,
      });
    };

    const safetyTimer = setTimeout(finish, Math.max(5000, duration * 4));
    const frame = (timestamp) => {
      if (settled) return;
      observedCallbacks += 1;
      if (started === null) started = timestamp;
      if (previous !== null && timestamp > previous) samples.push(timestamp - previous);
      previous = timestamp;
      if (timestamp - started < duration) requestAnimationFrame(frame);
      else finish();
    };

    requestAnimationFrame(frame);
  }), durationMs);
}

test('cinematic runtime owns native rAF rendering, 120 Hz fixed simulation, interpolation, and adaptive quality', async ({ page }) => {
  await loadGame(page);
  const snapshot = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(snapshot.releaseVersion).toBe('3.16.0-mobile-combat');
  expect(snapshot.globalUiRevision).toBe('smooth-fixedstep-presentation-v1');
  expect(snapshot.nativeRafRendering).toBe(true);
  expect(snapshot.artificialRenderFpsCap).toBe(false);
  expect(snapshot.fixedSimulationActive).toBe(true);
  expect(snapshot.fixedSimulationHz).toBe(120);
  expect(snapshot.maxCatchUpSteps).toBe(8);
  expect(snapshot.interpolatedRendering).toBe(true);
  expect(snapshot.adaptiveQualityActive).toBe(true);
  expect(snapshot.renderingArchitecture).toBe('canvas-world+dom-ui');
  await expect(page.locator('[data-quality-control]')).toHaveCount(1);
  await expect(page.locator('[data-combat-announcer]')).toHaveCount(1);
});

test('actual gameplay state is invariant across synthetic 60/120/144/165/240 Hz render schedules', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Deterministic gameplay schedule comparison runs once in Chromium.');
  await loadGame(page);
  const runs = await page.evaluate(async () => {
    const { FixedStepClock } = await import('/src/performance/frame-pacer.js');
    const game = window.__ONE_BULLET_ARENA__;
    const originalRandom = Math.random;

    const resetRandom = () => {
      let state = 0x5f3759df;
      Math.random = () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 0x100000000;
      };
    };

    const runSchedule = (hz) => {
      resetRandom();
      game.startRun();
      game.banner = null;
      game.tutorialStep = 3;
      for (const enemy of game.enemies) enemy.spawnTime = 0;
      game.keys.clear();
      game.keys.add('d');
      game.pointer.x = 1040;
      game.pointer.y = 360;

      const clock = new FixedStepClock({ simulationHz: 120, maxCatchUpSteps: 8, maxFrameDelta: 0.1 });
      const durationSeconds = 1.5;
      const frameMs = 1000 / hz;
      const frameCount = Math.ceil(durationSeconds * hz);
      let steps = 0;
      clock.tick(0, () => {});
      for (let frame = 1; frame <= frameCount; frame += 1) {
        const timestamp = Math.min(durationSeconds * 1000, frame * frameMs);
        clock.tick(timestamp, (dt) => {
          game.update(dt);
          steps += 1;
        });
      }
      game.keys.clear();
      const result = {
        hz,
        steps,
        wave: game.wave,
        score: game.score,
        playerX: game.player.x,
        playerY: game.player.y,
        playerHealth: game.player.health,
        dashCooldown: game.player.dashCooldown,
        bulletHeld: game.bullet.held,
        enemyCount: game.enemies.length,
        firstEnemies: game.enemies.slice(0, 3).map((enemy) => ({
          type: enemy.type,
          x: enemy.x,
          y: enemy.y,
          health: enemy.health,
        })),
      };
      game.goToMenu();
      return result;
    };

    const result = [60, 120, 144, 165, 240].map(runSchedule);
    Math.random = originalRandom;
    return result;
  });

  const reference = runs.find((run) => run.hz === 120);
  for (const run of runs) {
    expect(Math.abs(run.steps - reference.steps)).toBeLessThanOrEqual(1);
    expect(run.wave).toBe(reference.wave);
    expect(run.score).toBe(reference.score);
    expect(run.playerHealth).toBe(reference.playerHealth);
    expect(run.bulletHeld).toBe(reference.bulletHeld);
    expect(run.enemyCount).toBe(reference.enemyCount);
    expect(Math.abs(run.playerX - reference.playerX)).toBeLessThan(3.5);
    expect(Math.abs(run.playerY - reference.playerY)).toBeLessThan(3.5);
    expect(run.firstEnemies.map((enemy) => enemy.type)).toEqual(reference.firstEnemies.map((enemy) => enemy.type));
    for (let index = 0; index < run.firstEnemies.length; index += 1) {
      expect(Math.abs(run.firstEnemies[index].x - reference.firstEnemies[index].x)).toBeLessThan(12);
      expect(Math.abs(run.firstEnemies[index].y - reference.firstEnemies[index].y)).toBeLessThan(12);
      expect(run.firstEnemies[index].health).toBe(reference.firstEnemies[index].health);
    }
  }
});

test('bullet trail and dash-effect sampling are independent from render cadence', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Effect cadence comparison runs once in Chromium.');
  await loadGame(page);
  const samples = await page.evaluate(async () => {
    const { FixedStepClock } = await import('/src/performance/frame-pacer.js');
    const game = window.__ONE_BULLET_ARENA__;
    game.setRenderingQuality('HIGH');
    const originalRandom = Math.random;
    Math.random = () => 0.5;

    const sampleAt = (hz) => {
      game.startRun();
      game.banner = null;
      game.tutorialStep = 3;
      game.enemies = [];
      game.enemyShots = [];
      game.particles = [];
      game.pointer.x = 1080;
      game.pointer.y = 360;
      game.resetBulletToPlayer();
      game.fireBullet();

      const clock = new FixedStepClock({ simulationHz: 120, maxCatchUpSteps: 8, maxFrameDelta: 0.1 });
      const duration = 0.3;
      const frameMs = 1000 / hz;
      const frameCount = Math.ceil(duration * hz);
      clock.tick(0, () => {});
      for (let frame = 1; frame <= frameCount; frame += 1) {
        const timestamp = Math.min(duration * 1000, frame * frameMs);
        clock.tick(timestamp, (dt) => {
          game.updateBullet(dt);
          game.elapsed += dt;
          game.createParticle(100, 100, '#62f3ff', 75);
        });
      }
      const result = {
        hz,
        trailPoints: game.bullet.trail.length,
        dashParticles: game.particles.length,
      };
      game.goToMenu();
      return result;
    };

    const result = [60, 120, 240].map(sampleAt);
    Math.random = originalRandom;
    return result;
  });

  const trailCounts = samples.map((entry) => entry.trailPoints);
  const dashCounts = samples.map((entry) => entry.dashParticles);
  expect(Math.max(...trailCounts) - Math.min(...trailCounts)).toBeLessThanOrEqual(1);
  expect(Math.max(...dashCounts) - Math.min(...dashCounts)).toBeLessThanOrEqual(1);
});

test('render quality preference persists and never changes gameplay population', async ({ page }) => {
  await loadGame(page);
  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    const before = game.enemies.length;
    game.setRenderingQuality('PERFORMANCE');
    return {
      before,
      after: game.enemies.length,
      mode: game.getPerformanceSnapshot().qualityMode,
      tier: game.getPerformanceSnapshot().qualityTier,
      stored: localStorage.getItem('one-bullet-render-quality'),
    };
  });
  expect(result.mode).toBe('PERFORMANCE');
  expect(result.tier).toBe('PERFORMANCE');
  expect(result.stored).toBe('PERFORMANCE');
  expect(result.after).toBe(result.before);
});

test('minimap trail geometry is cached while markers remain live', async ({ page }) => {
  await loadGame(page);
  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.wave = 34;
    game.startNextWave();
    game.banner = null;
    game.tutorialStep = 3;
    game.explorationTrail = [{ x: game.player.x, y: game.player.y }, { x: game.player.x + 100, y: game.player.y }];
    game.lastExplorationPoint = { ...game.explorationTrail.at(-1) };
  });
  await page.waitForTimeout(500);
  const first = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getPerformanceSnapshot().dom);
  await page.waitForTimeout(500);
  const second = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getPerformanceSnapshot().dom);
  expect(second.cachedGaugeCount).toBeGreaterThan(0);
  expect(second.minimapTrailRebuilds - first.minimapTrailRebuilds).toBeLessThanOrEqual(1);
  expect(second.minimapMarkerWrites).toBeGreaterThanOrEqual(first.minimapMarkerWrites);
});

test('dense wave performance diagnostics remain finite and gameplay stays capped at 18 enemies', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await loadGame(page);
  await createDenseScene(page);
  await page.waitForTimeout(700);
  const raf = await sampleRaf(page, 1500);
  const perf = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.keys.delete('d');
    return game.getPerformanceSnapshot();
  });
  console.log('SMOOTH_RUNTIME_STRESS', JSON.stringify({ project: testInfo.project.name, raf, perf }));
  expect(perf.enemyCount).toBeLessThanOrEqual(18);
  expect(perf.simulationHz).toBe(120);
  expect(perf.sampleCount).toBeGreaterThan(0);
  expect(Number.isFinite(perf.p95FrameMs)).toBe(true);
  expect(perf.p95FrameMs).toBeGreaterThan(0);
  expect(raf.observedCallbacks).toBeGreaterThan(1);
  expect(raf.frames).toBeGreaterThan(0);
  expect(Number.isFinite(raf.p95FrameMs)).toBe(true);
  expect(raf.p95FrameMs).toBeGreaterThan(0);
});

test('Chromium records same-runner baseline versus cinematic candidate frame pacing', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Same-runner baseline comparison is recorded once in Chromium.');
  test.setTimeout(90_000);

  let baseline = null;
  try {
    await page.goto('https://3bud-zc.github.io/One-Bullet-Arena/?qa=1&perf-baseline=3.7', { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__), null, { timeout: 15_000 });
    await createDenseScene(page);
    await page.waitForTimeout(700);
    baseline = await sampleRaf(page, 1500);
  } catch (error) {
    console.log('PERF_BASELINE_UNAVAILABLE', String(error));
  }

  await page.goto('http://127.0.0.1:4173/?qa=1&perf-candidate=3.8');
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__?.getPerformanceSnapshot));
  await createDenseScene(page);
  await page.waitForTimeout(700);
  const candidate = await sampleRaf(page, 1500);
  const internal = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getPerformanceSnapshot());
  console.log('PERF_COMPARE_BASELINE_CINEMATIC', JSON.stringify({ baseline, candidate, internal }));
  expect(internal.sampleCount).toBeGreaterThan(0);
  expect(Number.isFinite(internal.p95FrameMs)).toBe(true);
  expect(internal.p95FrameMs).toBeGreaterThan(0);
  expect(candidate.observedCallbacks).toBeGreaterThan(1);
  expect(candidate.frames).toBeGreaterThan(0);
  expect(Number.isFinite(candidate.p95FrameMs)).toBe(true);
  expect(candidate.p95FrameMs).toBeGreaterThan(0);
  if (baseline?.frames > 0) expect(baseline.p95FrameMs).toBeGreaterThan(0);
});
