import { expect, test } from '@playwright/test';

test.setTimeout(60_000);

async function loadGame(page) {
  await page.goto('/?qa=1');
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__));
  await page.locator('#game-canvas').waitFor({ state: 'visible' });
}

async function attachCanvas(page, testInfo, name) {
  const image = await page.locator('#game-canvas').screenshot({ animations: 'disabled' });
  await testInfo.attach(`${testInfo.project.name}-${name}`, {
    body: image,
    contentType: 'image/png',
  });
}

test('final runtime exposes one interface language across the game', async ({ page }) => {
  await loadGame(page);
  const snapshot = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(snapshot.unifiedUiRuntimeVersion).toBe('3.4.0-unified-ui');
  expect(snapshot.unifiedInterfaceLanguage).toBe(true);
  expect(snapshot.unifiedUpgradeCards).toBe(true);
  expect(snapshot.unifiedPauseOverlay).toBe(true);
  expect(snapshot.unifiedGameOverOverlay).toBe(true);
  expect(snapshot.unifiedTouchControls).toBe(true);
  expect(snapshot.expandingWorldActive).toBe(true);
});

test('upgrade selection renders the unified cards without page errors', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await loadGame(page);

  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.wave = 5;
    game.enemies = [];
    game.resetBulletToPlayer();
    game.update(1);
    game.draw();
  });

  expect(await page.evaluate(() => window.__ONE_BULLET_ARENA__.state)).toBe('upgrade');
  expect(errors).toEqual([]);
  await attachCanvas(page, testInfo, 'unified-upgrade-selection');
});

test('pause and game-over overlays share the unified presentation', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await loadGame(page);

  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.pause();
    game.draw();
  });
  expect(await page.evaluate(() => window.__ONE_BULLET_ARENA__.state)).toBe('paused');
  await attachCanvas(page, testInfo, 'unified-pause');

  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.state = 'gameover';
    game.score = 48120;
    game.stats.kills = 63;
    game.stats.upgrades = 8;
    game.runTime = 312;
    game.draw();
  });
  expect(await page.evaluate(() => window.__ONE_BULLET_ARENA__.state)).toBe('gameover');
  expect(errors).toEqual([]);
  await attachCanvas(page, testInfo, 'unified-game-over');
});
