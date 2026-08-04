import { expect, test } from '@playwright/test';

async function waitForGame(page) {
  await page.goto('/?qa=1');
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__?.runtime));
  await page.locator('#game-canvas').waitFor({ state: 'visible' });
}

test('runtime kernel registers objective and final visual systems', async ({ page }) => {
  await waitForGame(page);
  const snapshot = await page.evaluate(() => window.__ONE_BULLET_ARENA__.runtime.snapshot());
  expect(snapshot.release).toBe('1.4.0');
  expect(snapshot.systems).toContain('objective-rooms');
  expect(snapshot.systems).toContain('mobile-ui-visual-fixes');
  expect(snapshot.errors).toEqual([]);
});

test('wave two starts a real circuit-sequence objective room', async ({ page }, testInfo) => {
  await waitForGame(page);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__ONE_BULLET_ARENA__?.state === 'playing');

  const state = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.wave = 1;
    game.spawnNextWave();
    game.draw();
    return {
      state: game.state,
      wave: game.wave,
      objectiveId: game.objectiveRoom?.id,
      status: game.objectiveRoom?.status,
      target: game.objectiveRoom?.target,
      relays: game.objectiveRoom?.relays?.length,
      runtimeErrors: game.runtime.snapshot().errors,
    };
  });

  expect(state.state).toBe('playing');
  expect(state.wave).toBe(2);
  expect(state.objectiveId).toBe('circuit-sequence');
  expect(state.status).toBe('active');
  expect(state.target).toBe(3);
  expect(state.relays).toBe(3);
  expect(state.runtimeErrors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('objective-room-wave-two.png'), fullPage: true });
});

test('objective gate blocks upgrades until the room is complete', async ({ page }) => {
  await waitForGame(page);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__ONE_BULLET_ARENA__?.state === 'playing');

  const blockedState = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.wave = 1;
    game.spawnNextWave();
    game.state = 'playing';
    game.openUpgradeSelection('wave');
    return game.state;
  });
  expect(blockedState).toBe('playing');

  const advancedState = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.objectiveRoom.status = 'complete';
    game.openUpgradeSelection('wave');
    return game.state;
  });
  expect(advancedState).toBe('upgrade');
});

test('mobile objective HUD remains inside the full viewport', async ({ page }, testInfo) => {
  await waitForGame(page);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__ONE_BULLET_ARENA__?.state === 'playing');
  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.touchMode = true;
    game.wave = 1;
    game.spawnNextWave();
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
  await page.screenshot({ path: testInfo.outputPath('objective-room-mobile.png'), fullPage: true });

  const runtimeErrors = await page.evaluate(() => window.__ONE_BULLET_ARENA__.runtime.snapshot().errors);
  expect(runtimeErrors).toEqual([]);
});
