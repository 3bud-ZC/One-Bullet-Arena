import { expect, test } from '@playwright/test';

test.setTimeout(60_000);

async function loadGame(page) {
  await page.goto('/?qa=1');
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__));
  await page.locator('#game-canvas').waitFor({ state: 'visible' });
}

async function capture(page, testInfo, name) {
  const image = await page.locator('#game-canvas').screenshot({ animations: 'disabled' });
  await testInfo.attach(`${testInfo.project.name}-${name}`, {
    body: image,
    contentType: 'image/png',
  });
}

test('UI repair renders menu, HUD, pause, and upgrade surfaces without runtime errors', async ({ page }, testInfo) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await loadGame(page);

  let snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.clearCheckpoint();
    game.startRun();
    game.stats.upgrades = 7;
    game.score = 24850;
    game.wave = 12;
    game.startNextWave();
    game.goToMenu();
    game.draw();
    return game.getSnapshot();
  });

  expect(snapshot.releaseVersion).toBe('3.5.1-ui-repair');
  expect(snapshot.uiRepairRuntimeVersion).toBe('3.5.1-ui-repair');
  expect(snapshot.uiRepairRevision).toBe('production-ui-repair-v1');
  expect(snapshot.uiRepairActive).toBe(true);
  expect(snapshot.uiDensity).toBe('balanced-production');
  await capture(page, testInfo, 'menu');

  snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.continueFromCheckpoint();
    game.banner = null;
    game.tutorialStep = 3;
    game.draw();
    return game.getSnapshot();
  });
  expect(snapshot.state).toBe('playing');
  await capture(page, testInfo, 'combat-hud');

  snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.state = 'paused';
    game.draw();
    return game.getSnapshot();
  });
  expect(snapshot.state).toBe('paused');
  await capture(page, testInfo, 'pause');

  snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.state = 'playing';
    game.enemies = [];
    game.resetBulletToPlayer();
    game.waveClearTimer = 0.95;
    game.update(1);
    game.draw();
    return game.getSnapshot();
  });
  expect(snapshot.state).toBe('upgrade');
  expect(snapshot.upgradeChoices).toHaveLength(3);
  await capture(page, testInfo, 'upgrade');

  expect(pageErrors).toEqual([]);
});
