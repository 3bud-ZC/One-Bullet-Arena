import { expect, test } from '@playwright/test';

async function loadGame(page) {
  await page.goto('/?qa=1');
  await page.waitForFunction(() => document.documentElement.dataset.gameReady === 'true');
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__));
  await page.locator('#game-canvas').waitFor({ state: 'visible' });
}

test('boots only the stable single-path runtime', async ({ page }) => {
  await loadGame(page);
  const snapshot = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(snapshot.version).toBe('2.3.0-stable');
  expect(snapshot.state).toBe('menu');
  expect(snapshot.allowedStates).toEqual(['menu', 'playing', 'upgrade', 'paused', 'gameover']);
  expect(snapshot.removedSystemsPresent).toBe(false);
  expect(snapshot.puzzleObjectivesPresent).toBe(false);
});

test('one action starts wave one and the wave path requires one upgrade', async ({ page }) => {
  await loadGame(page);
  await page.keyboard.press('Enter');
  let snapshot = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(snapshot.state).toBe('playing');
  expect(snapshot.wave).toBe(1);
  expect(snapshot.enemies).toBe(3);
  expect(snapshot.arenaStage).toBe(0);

  snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.enemies = [];
    game.resetBulletToPlayer();
    for (let index = 0; index < 25; index += 1) game.update(0.033);
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

test('clearing the last enemy automatically recalls the bullet before upgrades', async ({ page }) => {
  await loadGame(page);
  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.enemies = [];
    Object.assign(game.bullet, {
      held: false,
      recalling: false,
      x: game.player.x + 350,
      y: game.player.y + 100,
      vx: 0,
      vy: 0,
      recoverDelay: 0,
    });
    let sawAutomaticRecall = false;
    for (let index = 0; index < 180; index += 1) {
      game.update(0.016);
      sawAutomaticRecall ||= game.waveEnding && game.bullet.recalling;
      if (game.state === 'upgrade') break;
    }
    return { sawAutomaticRecall, snapshot: game.getSnapshot() };
  });
  expect(result.sawAutomaticRecall).toBe(true);
  expect(result.snapshot.bulletHeld).toBe(true);
  expect(result.snapshot.state).toBe('upgrade');
});

test('sniper telegraph locks its direction before the player moves', async ({ page }) => {
  await loadGame(page);
  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.wave = 6;
    game.enemies = [];
    game.enemyShots = [];
    game.player.x = 700;
    game.player.y = 360;
    const sniper = game.spawnEnemy('sniper', 0, { point: { x: 300, y: 360 } });
    sniper.spawnTime = 0;
    sniper.attackCooldown = 0;
    game.updateEnemies(0.01);
    const locked = { ...sniper.telegraphDirection };
    game.player.x = 300;
    game.player.y = 600;
    game.updateEnemies(0.6);
    const shot = game.enemyShots[0];
    const length = Math.hypot(shot.vx, shot.vy);
    return { locked, fired: { x: shot.vx / length, y: shot.vy / length } };
  });
  expect(result.fired.x).toBeCloseTo(result.locked.x, 5);
  expect(result.fired.y).toBeCloseTo(result.locked.y, 5);
});

test('the same arena expands automatically at waves 3, 6, and 9', async ({ page }) => {
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

test('sub-stepped bullet movement cannot tunnel through an enemy', async ({ page }) => {
  await loadGame(page);
  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.enemies = [];
    game.player.x = 400;
    game.player.y = 200;
    game.input.pointer.x = 900;
    game.input.pointer.y = 200;
    const enemy = game.spawnEnemy('scout', 0, { point: { x: 700, y: 200 } });
    enemy.spawnTime = 0;
    game.fireBullet();
    game.updateBullet(0.45);
    return { remaining: game.enemies.length, hits: game.stats.hits };
  });
  expect(result.hits).toBeGreaterThan(0);
  expect(result.remaining).toBe(0);
});

test('production runtime does not expose the mutable QA game object', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.dataset.gameReady === 'true');
  const exposed = await page.evaluate(() => '__ONE_BULLET_ARENA__' in window);
  expect(exposed).toBe(false);
});

test('canvas remains contained without document scrolling', async ({ page }) => {
  await loadGame(page);
  const layout = await page.evaluate(() => {
    const rect = document.querySelector('#game-canvas').getBoundingClientRect();
    return {
      rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
      viewport: { width: innerWidth, height: innerHeight },
      scroll: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      externalFonts: [...document.querySelectorAll('link')].some((link) => link.href.includes('fonts.googleapis.com')),
    };
  });
  expect(layout.rect.left).toBeGreaterThanOrEqual(0);
  expect(layout.rect.top).toBeGreaterThanOrEqual(0);
  expect(layout.rect.right).toBeLessThanOrEqual(layout.viewport.width + 1);
  expect(layout.rect.bottom).toBeLessThanOrEqual(layout.viewport.height + 1);
  expect(layout.scroll.width).toBeLessThanOrEqual(layout.viewport.width + 1);
  expect(layout.scroll.height).toBeLessThanOrEqual(layout.viewport.height + 1);
  expect(layout.externalFonts).toBe(false);
});

test('menu, combat, upgrade, full arena, and game over remain visually reviewable', async ({ page }, testInfo) => {
  await loadGame(page);
  await page.screenshot({ path: testInfo.outputPath('menu.png'), fullPage: true });

  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.banner = null;
    game.draw();
  });
  await page.screenshot({ path: testInfo.outputPath('wave-1.png'), fullPage: true });

  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.enemies = [];
    game.resetBulletToPlayer();
    for (let index = 0; index < 25; index += 1) game.update(0.033);
    game.draw();
  });
  await page.screenshot({ path: testInfo.outputPath('upgrade.png'), fullPage: true });

  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.setState('playing');
    game.wave = 8;
    game.startNextWave();
    game.banner = null;
    game.draw();
  });
  await page.screenshot({ path: testInfo.outputPath('wave-9.png'), fullPage: true });

  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.finishRun();
    game.draw();
  });
  await page.screenshot({ path: testInfo.outputPath('game-over.png'), fullPage: true });
});
