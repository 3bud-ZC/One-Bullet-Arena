import { expect, test } from '@playwright/test';

async function loadGame(page) {
  await page.addInitScript(() => localStorage.setItem('one-bullet-language', 'en'));
  await page.goto('/?qa=1');
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__));
  await page.locator('#game-canvas').waitFor({ state: 'visible' });
}

async function attachCanvas(page, testInfo, name) {
  const image = await page.locator('#game-canvas').screenshot({ animations: 'disabled' });
  await testInfo.attach(`${testInfo.project.name}-${name}`, { body: image, contentType: 'image/png' });
}

test('captures the v3.6 global UI release while preserving combat-depth systems', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await loadGame(page);

  const menuSnapshot = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(menuSnapshot.releaseVersion).toBe('3.6.2-dashboard-command');
  expect(menuSnapshot.releaseChannel).toBe('global-ui');
  expect(menuSnapshot.releaseCacheName).toBe('one-bullet-arena-v3.6.2-dashboard-command');
  expect(menuSnapshot.globalUiRuntimeVersion).toBe('3.6.2-dashboard-command');
  expect(menuSnapshot.globalUiRevision).toBe('dashboard-reference-v2');
  expect(menuSnapshot.presentationOwner).toBe('OneBulletGlobalUiRuntime');
  expect(menuSnapshot.localizationActive).toBe(true);
  expect(menuSnapshot.bilingualUi).toBe(true);
  expect(menuSnapshot.expandingWorldActive).toBe(true);
  expect(menuSnapshot.worldExpansionRuntimeVersion).toBe('3.4.0-expanding-world');
  expect(menuSnapshot.gameplayGeometryChanged).toBe(true);
  expect(menuSnapshot.collisionGeometryChanged).toBe(true);
  expect(menuSnapshot.gameEventBusActive).toBe(true);
  expect(menuSnapshot.combatDepthActive).toBe(true);
  expect(menuSnapshot.checkpointProgressionActive).toBe(true);
  expect(menuSnapshot.wardenEnemyActive).toBe(true);
  await attachCanvas(page, testInfo, 'global-release-menu');

  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.banner = null;
    game.tutorialStep = 3;
    game.pointer.x = 930;
    game.pointer.y = 360;
    game.momentum = 46;
    game.combo = 4;
    game.comboTimer = 2.4;
    game.draw();
  });
  await attachCanvas(page, testInfo, 'global-combat-hud');

  const catchSnapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.recallStartedAt = game.runTime - 0.7;
    game.recallStartDistance = 350;
    game.catchAlignmentPeak = 0.9;
    Object.assign(game.bullet, { held: false, recalling: true, x: game.player.x + 6, y: game.player.y, vx: -720, vy: 0, recoverDelay: 0 });
    game.catchBullet();
    game.draw();
    return game.getSnapshot();
  });
  expect(catchSnapshot.precisionCharge).toBe(1);
  expect(catchSnapshot.perfectCatches).toBe(1);
  await attachCanvas(page, testInfo, 'perfect-catch');

  const upgradeSnapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.feedbackEvents = [];
    game.feedbackCallout = null;
    game.enemies = [];
    game.resetBulletToPlayer();
    game.waveClearTimer = 0.95;
    game.update(1);
    game.draw();
    return game.getSnapshot();
  });
  expect(upgradeSnapshot.state).toBe('upgrade');
  expect(upgradeSnapshot.upgradeChoices).toHaveLength(3);
  expect(upgradeSnapshot.globalUiActive).toBe(true);
  await attachCanvas(page, testInfo, 'global-upgrade-cards');

  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.state = 'gameover';
    game.wave = 9;
    game.score = 15420;
    game.runTime = 136;
    game.stats.kills = 47;
    game.stats.shots = 31;
    game.stats.hits = 25;
    game.stats.upgrades = 8;
    game.stats.damageTaken = 3;
    game.draw();
  });
  await attachCanvas(page, testInfo, 'global-game-over');
});
