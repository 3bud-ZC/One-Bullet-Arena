import { expect, test } from '@playwright/test';

async function loadGame(page) {
  await page.goto('/?qa=1');
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__));
  await page.locator('#game-canvas').waitFor({ state: 'visible' });
}

async function spawnWarden(page) {
  return page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.enemies = [];
    game.enemyShots = [];
    game.player.x = 430;
    game.player.y = 360;
    const warden = game.spawnEnemy('warden', 0, { point: { x: 760, y: 360 } });
    warden.spawnTime = 0;
    warden.guardAngle = Math.PI;
    return game.getSnapshot();
  });
}

test('warden runtime boots and wave seven introduces the new enemy', async ({ page }) => {
  await loadGame(page);
  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    const menu = game.getSnapshot();
    game.startRun();
    game.wave = 6;
    game.startNextWave();
    return { menu, wave: game.getSnapshot() };
  });

  expect(result.menu.releaseVersion).toBe('3.2.0-true-2d');
  expect(result.menu.wardenRuntimeVersion).toBe('3.1.0-a-warden');
  expect(result.menu.wardenEnemyActive).toBe(true);
  expect(result.menu.true2DArenaActive).toBe(true);
  expect(result.menu.wardenUnlockWave).toBe(7);
  expect(result.wave.wave).toBe(7);
  expect(result.wave.wardenCount).toBe(1);
});

test('a frontal bullet is blocked, reflected, and converted into a bank', async ({ page }) => {
  await loadGame(page);
  await spawnWarden(page);

  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    const warden = game.enemies.find((enemy) => enemy.type === 'warden');
    const healthBefore = warden.health;
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
    game.overdriveTimer = 0;
    const blocked = game.damageEnemy(warden, 1, true);
    return {
      blocked,
      healthBefore,
      healthAfter: warden.health,
      bulletVx: game.bullet.vx,
      snapshot: game.getSnapshot(),
      history: game.getGameEventHistory(64),
    };
  });

  expect(result.blocked).toBe(false);
  expect(result.healthAfter).toBe(result.healthBefore);
  expect(result.bulletVx).toBeLessThan(0);
  expect(result.snapshot.wardenGuardStates[0].guardStrength).toBe(1);
  expect(result.snapshot.wardenGuardStates[0].guardBlocks).toBe(1);
  expect(result.snapshot.bankLevel).toBe(1);
  expect(result.history.some((event) => event.type === 'warden.guard-blocked')).toBe(true);
});

test('precision breaks the guard and the next frontal hit damages the warden', async ({ page }) => {
  await loadGame(page);
  await spawnWarden(page);

  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    const warden = game.enemies.find((enemy) => enemy.type === 'warden');
    const healthBefore = warden.health;
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
    const brokenTimer = warden.guardBrokenTimer;

    Object.assign(game.bullet, {
      x: warden.x - warden.radius - 4,
      y: warden.y,
      vx: 900,
      vy: 0,
    });
    game.precisionShotActive = false;
    game.damageEnemy(warden, 1, true);
    return {
      healthBefore,
      healthAfter: warden.health,
      brokenTimer,
      snapshot: game.getSnapshot(),
      history: game.getGameEventHistory(64),
    };
  });

  expect(result.brokenTimer).toBeGreaterThan(3);
  expect(result.healthAfter).toBeLessThan(result.healthBefore);
  expect(result.snapshot.wardenGuardStates[0].guardStrength).toBe(0);
  expect(result.history.some((event) => event.type === 'warden.guard-broken')).toBe(true);
});

test('a flank bypasses the active guard and receives bonus damage', async ({ page }) => {
  await loadGame(page);
  await spawnWarden(page);

  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    const warden = game.enemies.find((enemy) => enemy.type === 'warden');
    const healthBefore = warden.health;
    Object.assign(game.bullet, {
      held: false,
      recalling: false,
      x: warden.x + warden.radius + 4,
      y: warden.y,
      vx: -900,
      vy: 0,
      recoverDelay: 0,
    });
    game.damageEnemy(warden, 1, true);
    return {
      healthBefore,
      healthAfter: warden.health,
      snapshot: game.getSnapshot(),
      history: game.getGameEventHistory(64),
    };
  });

  expect(result.healthBefore - result.healthAfter).toBeCloseTo(1.2, 4);
  expect(result.snapshot.wardenGuardStates[0].guardStrength).toBe(2);
  expect(result.history.some((event) => event.type === 'warden.guard-blocked')).toBe(false);
});

test('a broken guard restores after its bounded recovery window', async ({ page }) => {
  await loadGame(page);
  await spawnWarden(page);

  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    const warden = game.enemies.find((enemy) => enemy.type === 'warden');
    warden.guardStrength = 0;
    warden.guardBrokenTimer = 0.01;
    game.update(0.02);
    return {
      snapshot: game.getSnapshot(),
      history: game.getGameEventHistory(64),
    };
  });

  expect(result.snapshot.wardenGuardStates[0].guardStrength).toBe(2);
  expect(result.snapshot.wardenGuardStates[0].guardBrokenTimer).toBe(0);
  expect(result.history.some((event) => event.type === 'warden.guard-restored')).toBe(true);
});
