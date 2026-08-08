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

test('graphics refinement runtime is active above the interface layer', async ({ page }, testInfo) => {
  await loadGame(page);
  const snapshot = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(snapshot.graphicsRefinementActive).toBe(true);
  expect(snapshot.graphicsRefinementRuntimeVersion).toBe('3.5.0-graphics-refinement');
  expect(snapshot.interfaceRedesignActive).toBe(true);
  expect(snapshot.playerVisualRevision).toBe('tactical-interceptor-v2');
  expect(snapshot.enemyVisualRevision).toBe('distinct-silhouette-v2');
  expect(snapshot.bulletVisualRevision).toBe('reactor-core-v2');
  expect(snapshot.hostileProjectileVisualRevision).toBe('directional-bolt-v2');
  expect(snapshot.gameplayGeometryChanged).toBe(false);
  expect(snapshot.collisionGeometryChanged).toBe(false);
  await attachCanvas(page, testInfo, 'graphics-menu');
});

test('player, bullet, and enemy silhouettes remain readable together', async ({ page }, testInfo) => {
  await loadGame(page);
  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.banner = null;
    game.tutorialStep = 3;
    game.player.x = 430;
    game.player.y = 375;
    game.pointer.x = 1080;
    game.pointer.y = 375;
    game.enemies = [];
    game.enemyShots = [];
    const types = ['scout', 'brute', 'sniper', 'charger', 'splitter'];
    const points = [
      { x: 690, y: 245 }, { x: 820, y: 245 }, { x: 950, y: 245 },
      { x: 760, y: 475 }, { x: 910, y: 475 },
    ];
    types.forEach((type, index) => {
      const enemy = game.spawnEnemy(type, index, { point: points[index] });
      enemy.spawnTime = 0;
    });
    Object.assign(game.bullet, {
      held: false,
      recalling: true,
      x: 620,
      y: 375,
      vx: 0,
      vy: 0,
      trail: [
        { x: 620, y: 375 }, { x: 650, y: 350 }, { x: 680, y: 330 }, { x: 710, y: 315 },
      ],
    });
    game.enemyShots.push({ x: 1000, y: 390, vx: -520, vy: -40, radius: 6 });
    game.update = () => {};
    game.draw();
  });
  await attachCanvas(page, testInfo, 'graphics-combat-lineup');
});

test('warden receives a distinct boss silhouette', async ({ page }, testInfo) => {
  await loadGame(page);
  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.banner = null;
    game.tutorialStep = 3;
    game.enemies = [];
    game.enemyShots = [];
    game.player.x = 390;
    game.player.y = 360;
    game.pointer.x = 900;
    game.pointer.y = 360;
    const warden = game.spawnEnemy('warden', 0, { point: { x: 790, y: 360 } });
    warden.spawnTime = 0;
    warden.guardAngle = Math.PI;
    game.update = () => {};
    game.draw();
    return game.getSnapshot();
  });
  expect(result.wardenCount).toBe(1);
  expect(result.enemyVisualRevision).toBe('distinct-silhouette-v2');
  await attachCanvas(page, testInfo, 'graphics-warden');
});
