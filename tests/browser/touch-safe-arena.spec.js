import { expect, test } from '@playwright/test';

async function loadGame(page) {
  await page.goto('/?qa=1');
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__));
}

test('touch controls and HUD reserve clear combat space in the fully opened arena', async ({ page }) => {
  await loadGame(page);
  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.input.touchMode = true;
    game.wave = 8;
    game.startNextWave();
    game.draw();
    const zones = game.getSnapshot().touchSafeZones;
    const checks = [];
    for (const zone of zones) {
      const entity = { x: zone.x + zone.w / 2, y: zone.y + zone.h / 2, radius: 18 };
      game.constrainCombatCircle(entity);
      const overlaps = entity.x + entity.radius >= zone.x
        && entity.x - entity.radius <= zone.x + zone.w
        && entity.y + entity.radius >= zone.y
        && entity.y - entity.radius <= zone.y + zone.h;
      checks.push({ id: zone.id, overlaps });
    }
    return {
      checks,
      touchMode: game.getSnapshot().touchMode,
      uiRegions: game.getSnapshot().uiRegions,
    };
  });
  expect(result.touchMode).toBe(true);
  expect(result.checks.every((item) => item.overlaps === false)).toBe(true);
  expect(result.uiRegions).toBeGreaterThanOrEqual(3);
});

test('touch movement starts only from the visible joystick hit area', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), 'Touchscreen interaction is validated on the mobile project.');
  await loadGame(page);
  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.input.touchMode = true;
    game.draw();
  });

  const canvas = page.locator('#game-canvas');
  const box = await canvas.boundingBox();
  const toClient = (x, y) => ({ x: box.x + x / 1280 * box.width, y: box.y + y / 720 * box.height });

  const outside = toClient(400, 500);
  await page.touchscreen.tap(outside.x, outside.y);
  let snapshot = await page.evaluate(() => ({
    moveActive: Boolean(window.__ONE_BULLET_ARENA__.input.moveTouch),
    shots: window.__ONE_BULLET_ARENA__.stats.shots,
  }));
  expect(snapshot.moveActive).toBe(false);
  expect(snapshot.shots).toBe(1);

  const inside = toClient(118, 608);
  await page.dispatchEvent('#game-canvas', 'pointerdown', {
    pointerId: 7,
    pointerType: 'touch',
    clientX: inside.x,
    clientY: inside.y,
    isPrimary: true,
    buttons: 1,
  });
  snapshot = await page.evaluate(() => ({
    moveActive: Boolean(window.__ONE_BULLET_ARENA__.input.moveTouch),
    shots: window.__ONE_BULLET_ARENA__.stats.shots,
  }));
  expect(snapshot.moveActive).toBe(true);
  expect(snapshot.shots).toBe(1);
});
