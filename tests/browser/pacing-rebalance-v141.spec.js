import { expect, test } from '@playwright/test';

async function waitForGame(page) {
  await page.goto('/?qa=1');
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__?.runtime));
  await page.locator('#game-canvas').waitFor({ state: 'visible' });
}

async function startGame(page) {
  await waitForGame(page);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__ONE_BULLET_ARENA__?.state === 'playing');
}

test('runtime registers the v1.4.1 pacing system', async ({ page }) => {
  await waitForGame(page);
  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    return {
      systems: game.runtime.snapshot().systems,
      pacing: game.getPacingSnapshot?.(),
      errors: game.runtime.snapshot().errors,
    };
  });
  expect(result.systems).toContain('difficulty-pacing-rebalance');
  expect(result.pacing.release).toBe('1.4.1');
  expect(result.errors).toEqual([]);
});

test('wave one is capped as a safe onboarding encounter', async ({ page }) => {
  await startGame(page);
  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    return {
      snapshot: game.getPacingSnapshot(),
      enemies: game.enemies.length,
      elites: game.enemies.filter((enemy) => enemy.elite).length,
      evolutions: game.enemies.filter((enemy) => enemy.v12Evolution).length,
    };
  });
  expect(result.snapshot.plan.localWave).toBe(1);
  expect(result.enemies).toBeLessThanOrEqual(3);
  expect(result.elites).toBe(0);
  expect(result.evolutions).toBe(0);
});

test('wave four applies the balanced Core Defense profile', async ({ page }, testInfo) => {
  await startGame(page);
  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.wave = 3;
    game.spawnNextWave();

    // The QA jump skips the real elapsed time between wave one and wave four.
    // Clear inherited transient notices so the screenshot represents stable wave-four gameplay.
    for (const key of Object.keys(game)) {
      if (!/(intro|toast|notice|announcement)/i.test(key)) continue;
      if (typeof game[key] === 'number') game[key] = 0;
      else if (game[key] && typeof game[key] === 'object') game[key] = null;
    }
    if (game.banner) game.banner.time = 0;
    game.challengeToast = null;
    game.challengeFeedbackState = 'active';
    game.draw();

    return {
      snapshot: game.getPacingSnapshot(),
      objective: {
        id: game.objectiveRoom?.id,
        duration: game.objectiveRoom?.target,
        health: game.objectiveRoom?.core?.health,
        assaultLimit: game.objectiveRoom?.parameters?.assaultLimit,
      },
      transientUi: {
        challengeToast: game.challengeToast,
        bannerTime: game.banner?.time || 0,
      },
      runtimeErrors: game.runtime.snapshot().errors,
    };
  });
  expect(result.snapshot.plan.localWave).toBe(4);
  expect(result.snapshot.enemies).toBeLessThanOrEqual(6);
  expect(result.snapshot.elites).toBeLessThanOrEqual(1);
  expect(result.snapshot.evolutions).toBeLessThanOrEqual(1);
  expect(result.objective.id).toBe('core-defense');
  expect(result.objective.duration).toBe(14);
  expect(result.objective.health).toBe(4);
  expect(result.objective.assaultLimit).toBe(2);
  expect(result.transientUi.challengeToast).toBeNull();
  expect(result.transientUi.bannerTime).toBe(0);
  expect(result.runtimeErrors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('balanced-core-defense.png'), fullPage: true });
});

test('hunter checkpoint recovery is granted only after objective completion', async ({ page }) => {
  await startGame(page);
  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.wave = 1;
    game.spawnNextWave();
    game.player.health = 2;
    const beforeBlocked = game.player.health;
    game.openUpgradeSelection('wave');
    const afterBlocked = game.player.health;
    game.objectiveRoom.status = 'complete';
    game.openUpgradeSelection('wave');
    return {
      beforeBlocked,
      afterBlocked,
      afterCompleted: game.player.health,
      state: game.state,
      snapshot: game.getPacingSnapshot(),
      runtimeErrors: game.runtime.snapshot().errors,
    };
  });
  expect(result.beforeBlocked).toBe(2);
  expect(result.afterBlocked).toBe(2);
  expect(result.afterCompleted).toBe(3);
  expect(result.state).toBe('upgrade');
  expect(result.snapshot.recoveries).toBe(1);
  expect(result.runtimeErrors).toEqual([]);
});
