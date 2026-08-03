import { expect, test } from '@playwright/test';

async function waitForGame(page) {
  await page.goto('/?qa=1');
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__));
  await page.locator('#game-canvas').waitFor({ state: 'visible' });
}

test('v1.3.1 viewport and gameplay UI remain contained', async ({ page }, testInfo) => {
  await waitForGame(page);

  await expect.poll(async () => page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
    stylesheet: Boolean(document.getElementById('mobile-ui-stabilization-styles')),
  }))).toEqual(expect.objectContaining({ stylesheet: true }));

  const documentSize = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
  }));
  expect(documentSize.scrollWidth).toBeLessThanOrEqual(documentSize.clientWidth + 1);
  expect(documentSize.scrollHeight).toBeLessThanOrEqual(documentSize.clientHeight + 1);

  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__ONE_BULLET_ARENA__?.state === 'playing');
  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.touchMode = navigator.maxTouchPoints > 0;
    game.wave = 1;
    game.runTargetWaves = 8;
    game.draw();
  });

  const canvas = await page.locator('#game-canvas').boundingBox();
  const viewport = page.viewportSize();
  expect(canvas).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(canvas.x).toBeGreaterThanOrEqual(-1);
  expect(canvas.y).toBeGreaterThanOrEqual(-1);
  expect(canvas.x + canvas.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(canvas.y + canvas.height).toBeLessThanOrEqual(viewport.height + 1);

  await page.screenshot({ path: testInfo.outputPath('mobile-ui-gameplay.png'), fullPage: true });
});

test('compact result screen keeps every action inside the canvas', async ({ page }, testInfo) => {
  await waitForGame(page);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__ONE_BULLET_ARENA__?.state === 'playing');

  const regions = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.touchMode = navigator.maxTouchPoints > 0;
    game.state = 'gameover';
    game.score = 12340;
    game.runTime = 129;
    game.stats = {
      ...game.stats,
      shots: 21,
      accurateShots: 19,
      directImpacts: 37,
      hits: 19,
      kills: 37,
      ricochets: 89,
    };
    game.lastProgressionReward = {
      reward: 142,
      run: { rank: 'A', coreId: 'standard' },
    };
    game.lastReplayabilitySummary = {
      challenge: { name: 'خطوة محسوبة', description: 'أنه الجولة دون استخدام الاندفاع.' },
      completed: false,
      bonus: 0,
      newCosmetics: [],
    };
    game.draw();
    return game.uiRegions.map(({ x, y, w, h }) => ({ x, y, w, h }));
  });

  expect(regions.length).toBeGreaterThanOrEqual(3);
  for (const region of regions.slice(-3)) {
    expect(region.x).toBeGreaterThanOrEqual(0);
    expect(region.y).toBeGreaterThanOrEqual(0);
    expect(region.x + region.w).toBeLessThanOrEqual(1280);
    expect(region.y + region.h).toBeLessThanOrEqual(720);
  }

  await page.screenshot({ path: testInfo.outputPath('mobile-ui-result.png'), fullPage: true });

  await page.evaluate(() => window.__ONE_BULLET_ARENA__.handleUiClick(1050, 610));
  await expect.poll(() => page.evaluate(() => window.__ONE_BULLET_ARENA__?.state)).toBe('menu');
});
