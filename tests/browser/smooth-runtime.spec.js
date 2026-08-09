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
    const started = performance.now();
    let previous = 0;
    const frame = (timestamp) => {
      if (previous) samples.push(timestamp - previous);
      previous = timestamp;
      if (timestamp - started < duration) requestAnimationFrame(frame);
      else {
        const sorted = samples.filter((value) => value > 0 && value < 250).sort((a, b) => a - b);
        const average = sorted.length ? sorted.reduce((sum, value) => sum + value, 0) / sorted.length : 0;
        const percentile = (ratio) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))] || 0;
        resolve({
          frames: sorted.length,
          averageFrameMs: average,
          medianFrameMs: percentile(.5),
          p95FrameMs: percentile(.95),
          p99FrameMs: percentile(.99),
          renderFps: average > 0 ? 1000 / average : 0,
        });
      }
    };
    requestAnimationFrame(frame);
  }), durationMs);
}

test('v3.8 owns native rAF rendering, 120 Hz fixed simulation, interpolation, and adaptive quality', async ({ page }) => {
  await loadGame(page);
  const snapshot = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(snapshot.releaseVersion).toBe('3.8.0-smooth-runtime');
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
  expect(perf.sampleCount).toBeGreaterThan(20);
  expect(Number.isFinite(perf.p95FrameMs)).toBe(true);
  expect(raf.frames).toBeGreaterThan(20);
  expect(raf.p95FrameMs).toBeGreaterThan(0);
});

test('Chromium records same-runner v3.7 baseline versus v3.8 candidate frame pacing', async ({ page }, testInfo) => {
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
  console.log('PERF_COMPARE_V37_V38', JSON.stringify({ baseline, candidate, internal }));
  expect(candidate.frames).toBeGreaterThan(20);
  expect(candidate.p95FrameMs).toBeGreaterThan(0);
  if (baseline) expect(baseline.p95FrameMs).toBeGreaterThan(0);
});
