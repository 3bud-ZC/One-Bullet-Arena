import { expect, test } from '@playwright/test';

async function loadGame(page) {
  await page.goto('/?qa=1');
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
