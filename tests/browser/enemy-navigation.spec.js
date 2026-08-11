import { expect, test } from '@playwright/test';

async function loadGame(page) {
  await page.goto('/?qa=1');
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__));
  await page.locator('#game-canvas').waitFor({ state: 'visible' });
}

test('melee enemies route around obstacle walls and reach engagement distance', async ({ page }) => {
  await loadGame(page);
  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.player.x = 640;
    game.player.y = 360;
    game.enemies = [];
    const enemy = game.spawnEnemy('brute', 0, { point: { x: 330, y: 360 } });
    enemy.spawnTime = 0;
    enemy.attackCooldown = 99;
    const startDistance = Math.hypot(enemy.x - game.player.x, enemy.y - game.player.y);
    let navMax = 0;
    let obstacleOverlap = false;
    for (let tick = 0; tick < 7 * 120; tick += 1) {
      game.updateEnemies(1 / 120);
      navMax = Math.max(navMax, enemy.nav?.waypoints?.length || 0);
      obstacleOverlap = obstacleOverlap || game.arenaStage.obstacles.some((rect) => {
        const nearestX = Math.max(rect.x, Math.min(enemy.x, rect.x + rect.w));
        const nearestY = Math.max(rect.y, Math.min(enemy.y, rect.y + rect.h));
        return (enemy.x - nearestX) ** 2 + (enemy.y - nearestY) ** 2 <= enemy.radius ** 2;
      });
    }
    return {
      startDistance,
      endDistance: Math.hypot(enemy.x - game.player.x, enemy.y - game.player.y),
      navMax,
      obstacleOverlap,
      finite: Number.isFinite(enemy.x) && Number.isFinite(enemy.y),
    };
  });

  expect(result.navMax).toBeGreaterThan(0);
  expect(result.endDistance).toBeLessThan(result.startDistance * 0.35);
  expect(result.obstacleOverlap).toBe(false);
  expect(result.finite).toBe(true);
});

test('sniper repositions for a useful firing lane instead of shooting from behind cover', async ({ page }) => {
  await loadGame(page);
  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.enemies = [];
    game.enemyShots = [];
    game.player.x = 640;
    game.player.y = 360;
    const sniper = game.spawnEnemy('sniper', 0, { point: { x: 430, y: 360 } });
    sniper.spawnTime = 0;
    sniper.attackCooldown = 0.1;
    let fired = 0;
    const originalFire = game.fireEnemyShot.bind(game);
    game.fireEnemyShot = (...args) => {
      fired += 1;
      return originalFire(...args);
    };
    let navMax = 0;
    for (let tick = 0; tick < 10 * 120; tick += 1) {
      game.updateEnemies(1 / 120);
      game.updateEnemyShots(1 / 120);
      navMax = Math.max(navMax, sniper.nav?.waypoints?.length || 0);
    }
    return {
      fired,
      navMax,
      distance: Math.hypot(sniper.x - game.player.x, sniper.y - game.player.y),
      obstacleOverlap: game.arenaStage.obstacles.some((rect) => {
        const nearestX = Math.max(rect.x, Math.min(sniper.x, rect.x + rect.w));
        const nearestY = Math.max(rect.y, Math.min(sniper.y, rect.y + rect.h));
        return (sniper.x - nearestX) ** 2 + (sniper.y - nearestY) ** 2 <= sniper.radius ** 2;
      }),
    };
  });

  expect(result.navMax).toBeGreaterThan(0);
  expect(result.fired).toBeGreaterThan(0);
  expect(result.distance).toBeGreaterThan(235);
  expect(result.distance).toBeLessThan(590);
  expect(result.obstacleOverlap).toBe(false);
});

test('charger rejects blocked charge lanes and routes before committing', async ({ page }) => {
  await loadGame(page);
  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.enemies = [];
    game.player.x = 640;
    game.player.y = 360;
    const charger = game.spawnEnemy('charger', 0, { point: { x: 430, y: 360 } });
    charger.spawnTime = 0;
    charger.attackCooldown = 0;
    let maxTelegraph = 0;
    let maxCharge = 0;
    let navMax = 0;
    for (let tick = 0; tick < 2 * 120; tick += 1) {
      game.updateEnemies(1 / 120);
      maxTelegraph = Math.max(maxTelegraph, charger.chargeTelegraph || 0);
      maxCharge = Math.max(maxCharge, charger.chargeRemaining || 0);
      navMax = Math.max(navMax, charger.nav?.waypoints?.length || 0);
    }
    return {
      maxTelegraph,
      maxCharge,
      navMax,
      distance: Math.hypot(charger.x - game.player.x, charger.y - game.player.y),
    };
  });

  expect(result.navMax).toBeGreaterThan(0);
  expect(result.maxTelegraph).toBe(0);
  expect(result.maxCharge).toBe(0);
  expect(result.distance).toBeLessThan(270);
});

test('dense late-wave enemies stay finite, separated, and pressure the player', async ({ page }) => {
  await loadGame(page);
  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.wave = 30;
    game.startNextWave();
    game.player.x = 640;
    game.player.y = 360;
    const startAverage = game.enemies.reduce((sum, enemy) => sum + Math.hypot(enemy.x - game.player.x, enemy.y - game.player.y), 0) / game.enemies.length;
    let finite = true;
    let obstacleOverlap = false;
    for (let tick = 0; tick < 5 * 120; tick += 1) {
      game.updateEnemies(1 / 120);
      for (const enemy of game.enemies) {
        finite = finite && Number.isFinite(enemy.x) && Number.isFinite(enemy.y);
        obstacleOverlap = obstacleOverlap || game.arenaStage.obstacles.some((rect) => {
          const nearestX = Math.max(rect.x, Math.min(enemy.x, rect.x + rect.w));
          const nearestY = Math.max(rect.y, Math.min(enemy.y, rect.y + rect.h));
          return (enemy.x - nearestX) ** 2 + (enemy.y - nearestY) ** 2 <= enemy.radius ** 2;
        });
      }
    }
    const endAverage = game.enemies.reduce((sum, enemy) => sum + Math.hypot(enemy.x - game.player.x, enemy.y - game.player.y), 0) / game.enemies.length;
    let minGap = Infinity;
    for (let i = 0; i < game.enemies.length; i += 1) {
      for (let j = i + 1; j < game.enemies.length; j += 1) {
        const a = game.enemies[i];
        const b = game.enemies[j];
        minGap = Math.min(minGap, Math.hypot(a.x - b.x, a.y - b.y) - a.radius - b.radius);
      }
    }
    return { count: game.enemies.length, startAverage, endAverage, finite, obstacleOverlap, minGap };
  });

  expect(result.count).toBeGreaterThan(10);
  expect(result.endAverage).toBeLessThan(result.startAverage);
  expect(result.finite).toBe(true);
  expect(result.obstacleOverlap).toBe(false);
  expect(result.minGap).toBeGreaterThan(-8);
});
