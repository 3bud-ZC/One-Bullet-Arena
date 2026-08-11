import { expect, test } from '@playwright/test';

async function loadGame(page) {
  await page.goto('/?qa=1');
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__?.domUi));
}

async function seedCheckpoint(page) {
  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.clearCheckpoint();
    game.startRun();
    game.upgradeStacks = { vitality: 1, 'heavy-shot': 2, 'magnetic-recall': 2, 'quick-dash': 1 };
    game.stats = { shots: 28, hits: 22, kills: 36, upgrades: 5, damageTaken: 2 };
    game.score = 9840;
    game.runTime = 172;
    game.player.maxHealth = 4;
    game.player.health = 3;
    game.player.shield = 1;
    game.wave = 5;
    game.startNextWave();
    game.goToMenu();
    game.draw();
  });
}

test('checkpoint dashboard uses v3.8 DOM presentation without changing saved-run semantics', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Visual checkpoint QA runs once in Chromium.');
  await loadGame(page);
  await seedCheckpoint(page);
  const snapshot = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(snapshot.releaseVersion).toBe('3.9.0-command-deck');
  expect(snapshot.globalUiRevision).toBe('smooth-fixedstep-presentation-v1');
  expect(snapshot.checkpointWave).toBe(6);
  expect(snapshot.checkpointAvailable).toBe(true);
  expect(snapshot.domUiActive).toBe(true);
  await expect(page.locator('[data-screen="menu"]')).toBeVisible();
  await expect(page.locator('[data-action="primary-run"]')).toContainText(/Continue|استكمال/);
});

test('late game keeps expanding-world camera and exposes the SVG minimap on desktop', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop minimap QA runs once in Chromium.');
  await loadGame(page);
  const snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.clearCheckpoint();
    game.startRun();
    game.wave = 34;
    game.startNextWave();
    game.player.x = 1460;
    game.player.y = 760;
    game.updateWorldCamera(1);
    game.draw();
    return game.getSnapshot();
  });
  expect(snapshot.wave).toBe(35);
  expect(snapshot.arenaStage).toBe(7);
  expect(snapshot.cameraFollowActive).toBe(true);
  expect(snapshot.cameraZoom).toBeLessThan(0.9);
  await expect(page.locator('[data-minimap]')).toBeVisible();
  await expect(page.locator('.hud-minimap__svg')).toBeVisible();
});
