import { expect, test } from '@playwright/test';

test.setTimeout(60_000);

async function loadGame(page) {
  await page.goto('/?qa=1');
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__));
  await page.locator('#game-canvas').waitFor({ state: 'visible' });
}

async function attachCanvas(page, testInfo, name) {
  const image = await page.locator('#game-canvas').screenshot({ animations: 'disabled' });
  await testInfo.attach(`${testInfo.project.name}-${name}`, { body: image, contentType: 'image/png' });
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
    game.wave = 5;
    game.startNextWave();
    game.goToMenu();
    game.draw();
  });
}

test('renders the global UI menu fullscreen without runtime errors', async ({ page }, testInfo) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await loadGame(page);
  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.clearCheckpoint();
    game.goToMenu();
    game.draw();
    const frame = document.querySelector('.game-frame').getBoundingClientRect();
    return { snapshot: game.getSnapshot(), frame: { width: frame.width, height: frame.height }, viewport: { width: innerWidth, height: innerHeight } };
  });
  expect(result.snapshot.checkpointAvailable).toBe(false);
  expect(result.snapshot.releaseVersion).toBe('3.6.2-dashboard-command');
  expect(result.snapshot.globalUiRuntimeVersion).toBe('3.6.2-dashboard-command');
  expect(result.snapshot.globalUiRevision).toBe('dashboard-reference-v2');
  expect(result.snapshot.globalUiActive).toBe(true);
  expect(result.snapshot.localizationActive).toBe(true);
  expect(result.snapshot.uiDensity).toBe('production-refined');
  expect(Math.abs(result.frame.width - result.viewport.width)).toBeLessThan(1);
  expect(Math.abs(result.frame.height - result.viewport.height)).toBeLessThan(1);
  expect(pageErrors).toEqual([]);
  await attachCanvas(page, testInfo, 'fresh-global-menu');
});

test('captures checkpoint menu, game-over choices, and restored wave under global UI', async ({ page }, testInfo) => {
  await loadGame(page);
  await seedCheckpoint(page);
  let snapshot = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(snapshot.checkpointWave).toBe(6);
  expect(snapshot.checkpointAvailable).toBe(true);
  expect(snapshot.globalUiActive).toBe(true);
  expect(snapshot.worldExpansionRuntimeVersion).toBe('3.4.0-expanding-world');
  expect(snapshot.expandingWorldActive).toBe(true);
  expect(snapshot.gameplayGeometryChanged).toBe(true);
  expect(snapshot.collisionGeometryChanged).toBe(true);
  await attachCanvas(page, testInfo, 'checkpoint-global-menu');

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
    game.draw();
  });
  await attachCanvas(page, testInfo, 'global-game-over');

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
  expect(snapshot.globalUiActive).toBe(true);
  await attachCanvas(page, testInfo, 'global-restored-wave');
});

test('late game opens the large world under global UI and moves the camera', async ({ page }, testInfo) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
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
  expect(snapshot.state).toBe('playing');
  expect(snapshot.wave).toBe(35);
  expect(snapshot.arenaStage).toBe(7);
  expect(snapshot.arenaStageCount).toBe(8);
  expect(snapshot.cameraFollowActive).toBe(true);
  expect(snapshot.cameraZoom).toBeLessThan(0.9);
  expect(snapshot.encounterMode).not.toBe('foundation');
  expect(snapshot.globalUiActive).toBe(true);
  expect(pageErrors).toEqual([]);
  await attachCanvas(page, testInfo, 'wave-35-global-world');
});
