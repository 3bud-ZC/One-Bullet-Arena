import { expect, test } from '@playwright/test';

async function loadGame(page) {
  await page.goto('/?qa=1');
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__));
  await page.locator('#game-canvas').waitFor({ state: 'visible' });
}

test('boots with the movement hotfix enabled', async ({ page }) => {
  await loadGame(page);
  const snapshot = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(snapshot.movementHotfix).toBe('2.5.1-controls');
  expect(snapshot.analogTouchMovement).toBe(true);
  expect(snapshot.responsiveMovementDuringHitStop).toBe(true);
  expect(snapshot.mobileCombatControlsVersion).toBe('3.16.0-mobile-combat-controls');
});

test('player movement remains responsive during hit-stop', async ({ page }) => {
  await loadGame(page);
  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.keys.clear();
    game.keys.add('d');
    game.hitStopTimer = 0.05;
    const before = { x: game.player.x, enemies: game.enemies.map((enemy) => ({ x: enemy.x, y: enemy.y })) };
    game.update(0.025);
    const after = { x: game.player.x, enemies: game.enemies.map((enemy) => ({ x: enemy.x, y: enemy.y })) };
    game.keys.clear();
    return {
      playerDistance: after.x - before.x,
      enemiesStayedFrozen: after.enemies.every((enemy, index) => (
        enemy.x === before.enemies[index].x && enemy.y === before.enemies[index].y
      )),
      remainingHitStop: game.hitStopTimer,
    };
  });

  expect(result.playerDistance).toBeGreaterThan(6);
  expect(result.enemiesStayedFrozen).toBe(true);
  expect(result.remainingHitStop).toBeGreaterThan(0);
});

test('touch movement starts neutral and scales with drag distance', async ({ page }) => {
  await loadGame(page);
  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.keys.clear();
    game.canvas.setPointerCapture = () => {};

    const rect = game.canvas.getBoundingClientRect();
    const logicalWidth = game.canvasViewport?.logicalWidth || 1280;
    const logicalHeight = game.canvasViewport?.logicalHeight || 720;
    const toClient = (x, y) => ({
      clientX: rect.left + (x / logicalWidth) * rect.width,
      clientY: rect.top + (y / logicalHeight) * rect.height,
    });
    const dispatch = (type, x, y) => {
      const point = toClient(x, y);
      game.canvas.dispatchEvent(new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: 41,
        pointerType: 'touch',
        clientX: point.clientX,
        clientY: point.clientY,
      }));
    };

    dispatch('pointerdown', 118, 608);
    const origin = game.touchMove ? { ...game.touchMove } : null;
    const neutral = game.movementDirection();

    dispatch('pointermove', 149, 608);
    const partial = game.movementDirection();

    dispatch('pointermove', 190, 608);
    const full = game.movementDirection();

    dispatch('pointerup', 190, 608);
    return {
      origin,
      neutral,
      partial,
      full,
      released: game.touchMove === null,
    };
  });

  expect(result.origin).not.toBeNull();
  expect(result.origin.originX).toBeCloseTo(118, 1);
  expect(result.origin.originY).toBeCloseTo(608, 1);
  expect(Math.hypot(result.neutral.x, result.neutral.y)).toBeLessThan(0.001);
  expect(result.partial.x).toBeGreaterThan(0.25);
  expect(result.partial.x).toBeLessThan(0.5);
  expect(result.full.x).toBeGreaterThan(0.99);
  expect(result.released).toBe(true);
});

test('dual-touch mobile controls keep movement and aim independent', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-landscape', 'Dual-touch QA runs in the mobile browser project.');
  await loadGame(page);
  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.keys.clear();
    game.canvas.setPointerCapture = () => {};
    game.draw();

    const rect = game.canvas.getBoundingClientRect();
    const logicalWidth = game.canvasViewport?.logicalWidth || 1280;
    const logicalHeight = game.canvasViewport?.logicalHeight || 720;
    const toClient = (x, y) => ({
      clientX: rect.left + (x / logicalWidth) * rect.width,
      clientY: rect.top + (y / logicalHeight) * rect.height,
    });
    const dispatch = (type, pointerId, x, y) => {
      const point = toClient(x, y);
      game.canvas.dispatchEvent(new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId,
        pointerType: 'touch',
        clientX: point.clientX,
        clientY: point.clientY,
      }));
    };

    dispatch('pointerdown', 41, 118, 608);
    dispatch('pointermove', 41, 190, 608);
    const moveWhileHeld = game.movementDirection();

    dispatch('pointerdown', 42, 1010, 360);
    const shotsAfterAimDown = game.stats.shots;
    dispatch('pointermove', 42, 1040, 270);
    const aimWhileMoving = { x: game.pointer.x, y: game.pointer.y };
    const snapshotWhileActive = game.getSnapshot();

    dispatch('pointerup', 42, 1040, 270);
    const movementAfterAimRelease = game.movementDirection();
    const stillMoving = Boolean(game.touchMove);
    const aimReleased = game.touchAim === null;
    const pointerDownAfterAimRelease = game.pointer.down;

    dispatch('pointerup', 41, 190, 608);
    return {
      moveWhileHeld,
      shotsAfterAimDown,
      aimWhileMoving,
      snapshotWhileActive,
      movementAfterAimRelease,
      stillMoving,
      aimReleased,
      pointerDownAfterAimRelease,
      allReleased: game.touchMove === null && game.touchAim === null && game.pointer.down === false,
    };
  });

  expect(result.moveWhileHeld.x).toBeGreaterThan(0.99);
  expect(result.shotsAfterAimDown).toBe(1);
  expect(result.aimWhileMoving.x).toBeCloseTo(1040, 0);
  expect(result.aimWhileMoving.y).toBeCloseTo(270, 0);
  expect(result.snapshotWhileActive.dualTouchAimActive).toBe(true);
  expect(result.snapshotWhileActive.touchMoveActive).toBe(true);
  expect(result.snapshotWhileActive.mobileCombatTouchHud).toBe(true);
  expect(result.movementAfterAimRelease.x).toBeGreaterThan(0.99);
  expect(result.stillMoving).toBe(true);
  expect(result.aimReleased).toBe(true);
  expect(result.pointerDownAfterAimRelease).toBe(true);
  expect(result.allReleased).toBe(true);
});
