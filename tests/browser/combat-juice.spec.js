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

test('v3.4 combat juice directs fire, ricochet, kill, recall, dash, and damage feedback', async ({ page }, testInfo) => {
  test.setTimeout(75000);
  await loadGame(page);

  let snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.draw();
    return game.getSnapshot();
  });

  expect(snapshot.combatJuiceActive).toBe(true);
  expect(snapshot.combatJuiceRuntimeVersion).toBe('3.4.0-combat-juice');
  expect(snapshot.combatJuiceStyle).toBe('impact-directed-cinematic-feedback');
  expect(snapshot.combatJuiceReducedMotionSafe).toBe(true);
  expect(snapshot.gameplayBalanceChangedByCombatJuice).toBe(false);
  expect(snapshot.collisionGeometryChangedByCombatJuice).toBe(false);

  snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.banner = null;
    game.enemies = [];
    game.enemyShots = [];
    game.player.x = 470;
    game.player.y = 405;
    game.pointer.x = 930;
    game.pointer.y = 310;
    const scout = game.spawnEnemy('scout', 0, { point: { x: 820, y: 310 } });
    const brute = game.spawnEnemy('brute', 1, { point: { x: 980, y: 455 } });
    scout.spawnTime = 0;
    brute.spawnTime = 0;

    game.fireBullet();
    game.bullet.x = 760;
    game.bullet.y = 318;
    game.onRicochet();
    scout.health = Math.min(scout.health, 0.1);
    game.damageEnemy(scout, 12, true);
    game.update = () => {};
    game.draw();
    return game.getSnapshot();
  });

  expect(snapshot.state).toBe('playing');
  expect(snapshot.combatJuicePulses.fire).toBeGreaterThan(0);
  expect(snapshot.combatJuicePulses.ricochet).toBeGreaterThan(0);
  expect(snapshot.combatJuicePulses.kill).toBeGreaterThan(0);
  expect(snapshot.combatJuiceEventCount).toBeGreaterThan(3);
  await attachCanvas(page, testInfo, 'combat-juice-impact');

  snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.update = () => {};
    Object.assign(game.bullet, {
      held: false,
      recalling: false,
      x: 960,
      y: 290,
      vx: -620,
      vy: 170,
      recoverDelay: 0,
      recallCooldown: 0,
    });
    game.recallBullet();
    game.recallStartDistance = 520;
    game.bullet.x = game.player.x + 18;
    game.bullet.y = game.player.y + 8;
    game.bullet.recalling = true;
    game.catchBullet();
    game.draw();
    return game.getSnapshot();
  });

  expect(snapshot.combatJuicePulses.catch).toBeGreaterThan(0);
  await attachCanvas(page, testInfo, 'combat-juice-catch');

  snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.update = OneBulletUpdateShim;

    function OneBulletUpdateShim() {
      game.player.dashDirection = { x: 1, y: -0.15 };
      game.player.dashRemaining = 0.12;
      game.lastDashActive = false;
      game.beginDashJuice();
      game.damageJuicePulse = 1;
      game.juiceEvents.push({
        type: 'player-damage',
        x: game.player.x,
        y: game.player.y,
        direction: { x: -1, y: 0 },
        life: 0.55,
        maxLife: 0.55,
      });
    }

    game.update();
    game.update = () => {};
    game.draw();
    return game.getSnapshot();
  });

  expect(snapshot.combatJuicePulses.dash).toBeGreaterThan(0);
  expect(snapshot.combatJuicePulses.damage).toBeGreaterThan(0);
  await attachCanvas(page, testInfo, 'combat-juice-dash-damage');
});
