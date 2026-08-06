import { expect, test } from '@playwright/test';

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

test('captures the v2.6 menu, combat HUD, enemy silhouettes, and upgrade cards', async ({ page }, testInfo) => {
  await loadGame(page);

  const menuSnapshot = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(menuSnapshot.version).toBe('2.6.0-visual');
  expect(menuSnapshot.visualTheme).toBe('neon-tactical-arena');
  expect(menuSnapshot.redesignedMenu).toBe(true);
  await attachCanvas(page, testInfo, 'menu');

  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.banner = null;
    game.tutorialStep = 1;
    game.pointer.x = 930;
    game.pointer.y = 360;
    game.draw();
  });

  const combatSnapshot = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(combatSnapshot.redesignedHud).toBe(true);
  expect(combatSnapshot.visualEnemyReadability).toBe(true);
  await attachCanvas(page, testInfo, 'combat-hud');

  const upgradeSnapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.enemies = [];
    game.resetBulletToPlayer();
    game.waveClearTimer = 0.95;
    game.update(1);
    game.draw();
    return game.getSnapshot();
  });
  expect(upgradeSnapshot.state).toBe('upgrade');
  expect(upgradeSnapshot.upgradeChoices).toHaveLength(3);
  expect(upgradeSnapshot.redesignedUpgradeCards).toBe(true);
  await attachCanvas(page, testInfo, 'upgrade-cards');

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
    game.maxCombo = 11;
    game.draw();
  });
  await attachCanvas(page, testInfo, 'game-over');
});
