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

test('captures active, blocking, and broken warden guard states', async ({ page }, testInfo) => {
  test.setTimeout(60000);
  await loadGame(page);

  let snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.enemies = [];
    game.enemyShots = [];
    game.banner = null;
    game.tutorialStep = 3;
    game.feedbackEvents = [];
    game.feedbackCallout = null;
    game.floatingTexts = [];
    game.player.x = 420;
    game.player.y = 360;
    const warden = game.spawnEnemy('warden', 0, { point: { x: 760, y: 360 } });
    const scout = game.spawnEnemy('scout', 1, { point: { x: 990, y: 500 } });
    warden.spawnTime = 0;
    scout.spawnTime = 0;
    warden.guardAngle = Math.PI;
    game.update = () => {};
    game.draw();
    return game.getSnapshot();
  });
  expect(snapshot.wardenCount).toBe(1);
  expect(snapshot.wardenGuardStates[0].guardStrength).toBe(2);
  await attachCanvas(page, testInfo, 'warden-guard-active');

  snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    const warden = game.enemies.find((enemy) => enemy.type === 'warden');
    game.feedbackEvents = [];
    game.feedbackCallout = null;
    game.floatingTexts = [];
    Object.assign(game.bullet, {
      held: false,
      recalling: false,
      x: warden.x - warden.radius - 4,
      y: warden.y,
      vx: 900,
      vy: 0,
      recoverDelay: 0,
    });
    game.precisionShotActive = false;
    game.bankLevel = 0;
    game.damageEnemy(warden, 1, true);
    game.draw();
    return game.getSnapshot();
  });
  expect(snapshot.wardenGuardStates[0].guardStrength).toBe(1);
  expect(snapshot.feedbackCalloutActive).toBe(true);
  await attachCanvas(page, testInfo, 'warden-guard-block');

  snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    const warden = game.enemies.find((enemy) => enemy.type === 'warden');
    game.feedbackEvents = [];
    game.feedbackCallout = null;
    game.floatingTexts = [];
    Object.assign(game.bullet, {
      held: false,
      recalling: false,
      x: warden.x - warden.radius - 4,
      y: warden.y,
      vx: 900,
      vy: 0,
      recoverDelay: 0,
    });
    game.precisionShotActive = true;
    game.damageEnemy(warden, 1, true);
    game.draw();
    return game.getSnapshot();
  });
  expect(snapshot.wardenGuardStates[0].guardStrength).toBe(0);
  expect(snapshot.wardenGuardStates[0].guardBrokenTimer).toBeGreaterThan(3);
  await attachCanvas(page, testInfo, 'warden-guard-broken');
});
