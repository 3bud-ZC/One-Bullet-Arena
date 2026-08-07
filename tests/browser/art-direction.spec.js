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

test('art-direction runtime owns the visual layer without gameplay geometry changes', async ({ page }, testInfo) => {
  await loadGame(page);
  const snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.draw();
    return game.getSnapshot();
  });

  expect(snapshot.artDirectionRefinementActive).toBe(true);
  expect(snapshot.artDirectionRuntimeVersion).toBe('3.5.0-art-direction-refinement');
  expect(snapshot.desktopViewportMode).toBe('edge-to-edge-browser-viewport');
  expect(snapshot.tacticalHudRevision).toBe('three-module-dashboard-v2');
  expect(snapshot.mapVisualRevision).toBe('sector-grid-reduced-frame-noise');
  expect(snapshot.obstacleVisualRevision).toBe('chamfered-tactical-blocks');
  expect(snapshot.gameplayGeometryChanged).toBe(false);
  expect(snapshot.collisionGeometryChanged).toBe(false);
  await attachCanvas(page, testInfo, 'art-direction-menu');
});

test('desktop browser shell fills the available viewport without Fullscreen API', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-landscape');
  await loadGame(page);

  const metrics = await page.evaluate(() => {
    const frame = document.querySelector('.game-frame').getBoundingClientRect();
    const canvas = document.querySelector('#game-canvas').getBoundingClientRect();
    return {
      viewport: { width: innerWidth, height: innerHeight },
      frame: { x: frame.x, y: frame.y, width: frame.width, height: frame.height },
      canvas: { x: canvas.x, y: canvas.y, width: canvas.width, height: canvas.height },
      fullscreen: Boolean(document.fullscreenElement),
    };
  });

  expect(metrics.fullscreen).toBe(false);
  expect(metrics.frame.x).toBeCloseTo(0, 0);
  expect(metrics.frame.y).toBeCloseTo(0, 0);
  expect(metrics.frame.width).toBeCloseTo(metrics.viewport.width, 0);
  expect(metrics.frame.height).toBeCloseTo(metrics.viewport.height, 0);
  expect(metrics.canvas.width).toBeCloseTo(metrics.viewport.width, 0);
  expect(metrics.canvas.height).toBeCloseTo(metrics.viewport.height, 0);
});

test('combat dashboard and tactical map remain readable in the expanded browser canvas', async ({ page }, testInfo) => {
  await loadGame(page);
  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.banner = null;
    game.tutorialStep = 3;
    game.player.x = 560;
    game.player.y = 410;
    game.pointer.x = 980;
    game.pointer.y = 320;
    game.enemies = [];
    game.enemyShots = [];
    for (const [index, type] of ['scout', 'sniper', 'charger', 'splitter'].entries()) {
      const enemy = game.spawnEnemy(type, index, { point: { x: 780 + index * 75, y: 250 + (index % 2) * 190 } });
      enemy.spawnTime = 0;
    }
    game.update = () => {};
    game.draw();
  });
  await attachCanvas(page, testInfo, 'art-direction-combat');
});
