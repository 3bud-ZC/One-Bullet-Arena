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

test('captures layered menu, combat map, and Warden arena states inside the expanded world', async ({ page }, testInfo) => {
  test.setTimeout(75000);
  await loadGame(page);

  let snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.draw();
    return game.getSnapshot();
  });
  expect(snapshot.true2DArenaActive).toBe(true);
  expect(snapshot.world2DRuntimeVersion).toBe('3.2.0-true-2d');
  expect(snapshot.layeredFloorTiles).toBe(true);
  expect(snapshot.environmentalDepth).toBe(true);
  expect(snapshot.expandingWorldActive).toBe(true);
  await attachCanvas(page, testInfo, 'true-2d-menu-map');

  snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.banner = null;
    game.tutorialStep = 3;
    game.player.x = 560;
    game.player.y = 410;
    game.pointer.x = 905;
    game.pointer.y = 330;
    game.enemies = [];
    game.enemyShots = [];
    const scout = game.spawnEnemy('scout', 0, { point: { x: 880, y: 300 } });
    const brute = game.spawnEnemy('brute', 1, { point: { x: 930, y: 495 } });
    const sniper = game.spawnEnemy('sniper', 2, { point: { x: 360, y: 250 } });
    scout.spawnTime = 0;
    brute.spawnTime = 0;
    sniper.spawnTime = 0;
    game.visualMotion = 0.82;
    game.visualDirection = { x: 0.93, y: -0.22 };
    game.playerEchoes = [
      { x: 520, y: 420, angle: -0.2, life: 0.18, maxLife: 0.24 },
      { x: 490, y: 428, angle: -0.2, life: 0.1, maxLife: 0.24 },
    ];
    game.update = () => {};
    game.draw();
    return game.getSnapshot();
  });
  expect(snapshot.state).toBe('playing');
  expect(snapshot.gameplayGeometryChanged).toBe(true);
  expect(snapshot.collisionGeometryChanged).toBe(true);
  await attachCanvas(page, testInfo, 'true-2d-combat-map');

  snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.update = () => {};
    game.wave = 7;
    game.banner = null;
    game.enemies = [];
    game.enemyShots = [];
    game.player.x = 445;
    game.player.y = 370;
    game.pointer.x = 920;
    game.pointer.y = 370;
    const warden = game.spawnEnemy('warden', 0, { point: { x: 780, y: 370 } });
    const charger = game.spawnEnemy('charger', 1, { point: { x: 965, y: 520 } });
    warden.spawnTime = 0;
    charger.spawnTime = 0;
    warden.guardAngle = Math.PI;
    Object.assign(game.bullet, {
      held: false,
      recalling: false,
      x: 640,
      y: 370,
      vx: 900,
      vy: 0,
      recoverDelay: 0,
    });
    game.draw();
    return game.getSnapshot();
  });
  expect(snapshot.wardenCount).toBe(1);
  expect(snapshot.wardenGuardStates[0].guardStrength).toBe(2);
  await attachCanvas(page, testInfo, 'true-2d-warden-map');
});
