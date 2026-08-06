import { expect, test } from '@playwright/test';

async function loadGame(page) {
  await page.goto('/?qa=1');
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__));
  await page.locator('#game-canvas').waitFor({ state: 'visible' });
}

test('boots only the polished modular single-path runtime', async ({ page }) => {
  await loadGame(page);
  const snapshot = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(snapshot.version).toBe('2.7.0-feedback');
  expect(snapshot.combatFeedback).toBe('2.7.0-feedback');
  expect(snapshot.visualDesign).toBe('2.6.0-visual');
  expect(snapshot.visualTheme).toBe('neon-tactical-arena');
  expect(snapshot.directionalImpacts).toBe(true);
  expect(snapshot.recallEnergyPackets).toBe(true);
  expect(snapshot.dashAfterimages).toBe(true);
  expect(snapshot.comboMomentumHud).toBe(true);
  expect(snapshot.screenDamageFeedback).toBe(true);
  expect(snapshot.state).toBe('menu');
  expect(snapshot.allowedStates).toEqual(['menu', 'playing', 'upgrade', 'paused', 'gameover']);
  expect(snapshot.runtimeArchitecture).toBe('modular-runtime');
  expect(snapshot.combatPolish).toBe(true);
  expect(snapshot.hudRevision).toBe('compact-status-hud');
  expect(snapshot.upgradeCardRevision).toBe('icon-value-cards');
  expect(snapshot.redesignedHud).toBe(true);
  expect(snapshot.redesignedMenu).toBe(true);
  expect(snapshot.redesignedUpgradeCards).toBe(true);
  expect(snapshot.bulletStatus).toBe('READY');
  expect(snapshot.autoRecallAfterWave).toBe(true);
  expect(snapshot.telegraphsLockDirection).toBe(true);
  expect(snapshot.removedSystemsPresent).toBe(false);
  expect(snapshot.puzzleObjectivesPresent).toBe(false);
});

test('one action starts wave one and clearing it requires one upgrade', async ({ page }) => {
  await loadGame(page);
  await page.keyboard.press('Enter');
  let snapshot = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(snapshot.state).toBe('playing');
  expect(snapshot.wave).toBe(1);
  expect(snapshot.enemies).toBe(3);

  snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.enemies = [];
    game.resetBulletToPlayer();
    game.update(1);
    return game.getSnapshot();
  });
  expect(snapshot.state).toBe('upgrade');
  expect(snapshot.upgradeChoices).toHaveLength(3);

  snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.chooseUpgrade(0);
    return game.getSnapshot();
  });
  expect(snapshot.state).toBe('playing');
  expect(snapshot.wave).toBe(2);
  expect(snapshot.upgrades).toBe(1);
});

test('the bullet recalls automatically after the final enemy dies', async ({ page }) => {
  await loadGame(page);
  const snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.enemies = [];
    Object.assign(game.bullet, {
      held: false,
      recalling: false,
      x: game.player.x + 260,
      y: game.player.y,
      vx: 0,
      vy: 0,
      recoverDelay: 0,
    });
    game.waveClearTimer = 0;
    game.update(0.25);
    return game.getSnapshot();
  });
  expect(snapshot.bulletHeld).toBe(false);
  expect(snapshot.bulletRecalling).toBe(true);
  expect(snapshot.bulletStatus).toBe('RETURNING');
});

test('bullet hits activate layered impact feedback and final kills show wave clear', async ({ page }) => {
  await loadGame(page);
  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.enemies = [];
    const enemy = game.spawnEnemy('brute', 0, { point: { x: 760, y: 360 } });
    enemy.spawnTime = 0;
    game.damageEnemy(enemy, 1, true);
    const afterHit = game.getSnapshot();
    game.damageEnemy(enemy, 99, true);
    const afterKill = game.getSnapshot();
    return { afterHit, afterKill };
  });

  expect(result.afterHit.impactFeedbackActive).toBe(true);
  expect(result.afterHit.feedbackEventCount).toBeGreaterThan(0);
  expect(result.afterKill.clearBannerActive).toBe(true);
  expect(result.afterKill.feedbackEventCount).toBeGreaterThan(1);
  expect(result.afterKill.enemies).toBe(0);
});

test('manual recall creates energy feedback without changing bullet mechanics', async ({ page }) => {
  await loadGame(page);
  const snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    Object.assign(game.bullet, {
      held: false,
      recalling: false,
      x: game.player.x + 420,
      y: game.player.y + 40,
      vx: 120,
      vy: 0,
      recoverDelay: 0,
      recallCooldown: 0,
    });
    game.recallBullet();
    return game.getSnapshot();
  });

  expect(snapshot.bulletHeld).toBe(false);
  expect(snapshot.bulletRecalling).toBe(true);
  expect(snapshot.feedbackEventCount).toBeGreaterThan(0);
  expect(snapshot.recallEnergyPackets).toBe(true);
});

test('sniper and charger telegraphs lock their direction before execution', async ({ page }) => {
  await loadGame(page);
  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.enemies = [];
    game.enemyShots = [];

    game.player.x = 800;
    game.player.y = 300;
    const sniper = game.spawnEnemy('sniper', 0, { point: { x: 400, y: 300 } });
    sniper.spawnTime = 0;
    sniper.attackCooldown = 0;
    game.updateSniper(sniper, { x: 1, y: 0 }, { shotSpeed: 1 }, 0.01);
    const sniperLocked = { ...sniper.shotDirection };
    game.player.x = 400;
    game.player.y = 620;
    game.updateSniper(sniper, { x: 0, y: 1 }, { shotSpeed: 1 }, 0.6);
    const shot = game.enemyShots[0];

    const charger = game.spawnEnemy('charger', 1, { point: { x: 700, y: 300 } });
    charger.spawnTime = 0;
    charger.attackCooldown = 0;
    game.updateCharger(charger, { x: -1, y: 0 }, 0.01);
    const chargerLocked = { ...charger.chargeDirection };
    game.updateCharger(charger, { x: 0, y: 1 }, 0.7);

    return {
      sniperLocked,
      shotVelocity: shot ? { x: shot.vx, y: shot.vy } : null,
      chargerLocked,
      chargerActiveDirection: { ...charger.chargeDirection },
      chargerRemaining: charger.chargeRemaining,
    };
  });

  expect(result.sniperLocked.x).toBeCloseTo(1, 5);
  expect(result.sniperLocked.y).toBeCloseTo(0, 5);
  expect(result.shotVelocity.x).toBeGreaterThan(300);
  expect(Math.abs(result.shotVelocity.y)).toBeLessThan(1);
  expect(result.chargerLocked.x).toBeCloseTo(-1, 5);
  expect(result.chargerActiveDirection).toEqual(result.chargerLocked);
  expect(result.chargerRemaining).toBeGreaterThan(0);
});

test('the same arena expands at waves 3, 6, and 9', async ({ page }) => {
  await loadGame(page);
  const stages = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    const result = [game.getSnapshot().arenaStage];
    for (const target of [3, 6, 9]) {
      game.wave = target - 1;
      game.startNextWave();
      result.push(game.getSnapshot().arenaStage);
    }
    return result;
  });
  expect(stages).toEqual([0, 1, 2, 3]);
});

test('high-speed bullets cannot tunnel through enemies', async ({ page }) => {
  await loadGame(page);
  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.enemies = [];
    game.player.x = 400;
    game.player.y = 200;
    game.pointer.x = 900;
    game.pointer.y = 200;
    const enemy = game.spawnEnemy('scout', 0, { point: { x: 700, y: 200 } });
    enemy.spawnTime = 0;
    game.fireBullet();
    game.updateBullet(0.45);
    return { remaining: game.enemies.length, hits: game.stats.hits };
  });
  expect(result.hits).toBeGreaterThan(0);
  expect(result.remaining).toBe(0);
});

test('canvas remains contained without document scrolling', async ({ page }) => {
  await loadGame(page);
  const layout = await page.evaluate(() => {
    const rect = document.querySelector('#game-canvas').getBoundingClientRect();
    return {
      right: rect.right, bottom: rect.bottom, width: innerWidth, height: innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
    };
  });
  expect(layout.right).toBeLessThanOrEqual(layout.width + 1);
  expect(layout.bottom).toBeLessThanOrEqual(layout.height + 1);
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width + 1);
  expect(layout.scrollHeight).toBeLessThanOrEqual(layout.height + 1);
});

test('production mode does not expose the mutable QA runtime', async ({ page }) => {
  await page.goto('/');
  await page.locator('#game-canvas').waitFor({ state: 'visible' });
  expect(await page.evaluate(() => '__ONE_BULLET_ARENA__' in window)).toBe(false);
});
