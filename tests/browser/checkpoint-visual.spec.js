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

async function seedCheckpoint(page) {
  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.clearCheckpoint();
    game.startRun();
    game.upgradeStacks = { vitality: 1, 'heavy-shot': 2, 'magnetic-recall': 2, 'quick-dash': 1 };
    game.stats = { shots: 28, hits: 22, kills: 36, upgrades: 5, damageTaken: 2 };
    game.score = 9840;
    game.runTime = 172;
    game.maxCombo = 13;
    game.player.maxHealth = 4;
    game.player.health = 3;
    game.player.shield = 1;
    game.momentum = 64;
    game.precisionCharge = 1;
    game.wave = 5;
    game.startNextWave();
    game.goToMenu();
    game.draw();
  });
}

test('captures checkpoint menu, game-over choices, and restored wave', async ({ page }, testInfo) => {
  await loadGame(page);
  await seedCheckpoint(page);

  let snapshot = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(snapshot.checkpointWave).toBe(6);
  expect(snapshot.checkpointAvailable).toBe(true);
  await attachCanvas(page, testInfo, 'checkpoint-menu');

  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.continueFromCheckpoint();
    game.state = 'gameover';
    game.wave = 8;
    game.score = 14860;
    game.stats.kills = 49;
    game.stats.shots = 37;
    game.stats.hits = 30;
    game.stats.upgrades = 7;
    game.stats.damageTaken = 4;
    game.maxCombo = 16;
    game.runTime = 221;
    game.draw();
  });
  await attachCanvas(page, testInfo, 'checkpoint-game-over');

  snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.continueFromCheckpoint();
    game.banner.time = 1.5;
    game.draw();
    return game.getSnapshot();
  });
  expect(snapshot.state).toBe('playing');
  expect(snapshot.wave).toBe(6);
  expect(snapshot.restoredFromCheckpoint).toBe(true);
  await attachCanvas(page, testInfo, 'checkpoint-restored-wave');
});
