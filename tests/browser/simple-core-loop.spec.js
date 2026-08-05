import { expect, test } from '@playwright/test';

async function loadGame(page) {
  await page.goto('/?qa=1');
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__));
  await page.locator('#game-canvas').waitFor({ state: 'visible' });
}

test('boots only the simple expanding-arena runtime', async ({ page }) => {
  await loadGame(page);
  const snapshot = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(snapshot.version).toBe('2.1.0-simple');
  expect(snapshot.state).toBe('menu');
  expect(snapshot.allowedStates).toEqual(['menu', 'howto', 'playing', 'upgrade', 'paused', 'gameover']);
  expect(snapshot.removedSystemsPresent).toBe(false);
  expect(snapshot.arenaProgressionAutomatic).toBe(true);
  expect(snapshot.puzzleObjectivesPresent).toBe(false);
});

test('one action starts the only game at wave one', async ({ page }) => {
  await loadGame(page);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__ONE_BULLET_ARENA__.state === 'playing');
  const snapshot = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(snapshot.wave).toBe(1);
  expect(snapshot.enemies).toBe(3);
  expect(snapshot.upgrades).toBe(0);
  expect(snapshot.arenaStage).toBe(0);
  expect(snapshot.removedSystemsPresent).toBe(false);
});

test('clearing a wave forces one upgrade before the next wave', async ({ page }) => {
  await loadGame(page);
  await page.keyboard.press('Enter');
  const upgradeState = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.enemies = [];
    game.resetBulletToPlayer();
    game.update(1);
    return game.getSnapshot();
  });
  expect(upgradeState.state).toBe('upgrade');
  expect(upgradeState.wave).toBe(1);
  expect(upgradeState.upgradeChoices).toHaveLength(3);

  const nextWave = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.chooseUpgrade(0);
    return game.getSnapshot();
  });
  expect(nextWave.state).toBe('playing');
  expect(nextWave.wave).toBe(2);
  expect(nextWave.upgrades).toBe(1);
  expect(nextWave.enemies).toBeGreaterThanOrEqual(4);
});

test('the same map opens automatically at waves 3, 6, and 9', async ({ page }) => {
  await loadGame(page);
  const stages = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    const result = [game.getSnapshot()];
    for (const waveBeforeSpawn of [2, 5, 8]) {
      game.wave = waveBeforeSpawn;
      game.spawnNextWave();
      result.push(game.getSnapshot());
    }
    return result;
  });
  expect(stages.map((item) => item.wave)).toEqual([1, 3, 6, 9]);
  expect(stages.map((item) => item.arenaStage)).toEqual([0, 1, 2, 3]);
  expect(stages.at(-1).arenaFullyUnlocked).toBe(true);
  expect(stages.every((item) => item.puzzleObjectivesPresent === false)).toBe(true);
  const areas = stages.map((item) => item.arenaBounds.w * item.arenaBounds.h);
  expect(areas.every((value, index) => index === 0 || value > areas[index - 1])).toBe(true);
});

test('player and bullet stay inside the currently unlocked space', async ({ page }) => {
  await loadGame(page);
  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    const bounds = game.getSnapshot().arenaBounds;
    game.player.x = -500;
    game.player.y = 2000;
    game.updatePlayer(0);
    game.bullet.held = false;
    game.bullet.x = bounds.x - 12;
    game.bullet.y = bounds.y + bounds.h / 2;
    game.bullet.vx = -300;
    game.bullet.vy = 0;
    game.handleOuterRicochet();
    return {
      bounds,
      player: { x: game.player.x, y: game.player.y, radius: game.player.radius },
      bullet: { x: game.bullet.x, vx: game.bullet.vx },
    };
  });
  expect(result.player.x).toBeGreaterThanOrEqual(result.bounds.x + result.player.radius);
  expect(result.player.y).toBeLessThanOrEqual(result.bounds.y + result.bounds.h - result.player.radius);
  expect(result.bullet.x).toBeGreaterThanOrEqual(result.bounds.x);
  expect(result.bullet.vx).toBeGreaterThan(0);
});

test('the canvas remains fully contained without page scrolling', async ({ page }) => {
  await loadGame(page);
  const layout = await page.evaluate(() => {
    const canvas = document.querySelector('#game-canvas');
    const rect = canvas.getBoundingClientRect();
    return {
      rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      scroll: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      stylesheets: [...document.styleSheets].map((sheet) => sheet.href || ''),
    };
  });
  expect(layout.rect.left).toBeGreaterThanOrEqual(0);
  expect(layout.rect.top).toBeGreaterThanOrEqual(0);
  expect(layout.rect.right).toBeLessThanOrEqual(layout.viewport.width + 1);
  expect(layout.rect.bottom).toBeLessThanOrEqual(layout.viewport.height + 1);
  expect(layout.scroll.width).toBeLessThanOrEqual(layout.viewport.width + 1);
  expect(layout.scroll.height).toBeLessThanOrEqual(layout.viewport.height + 1);
  expect(layout.stylesheets.some((href) => href.endsWith('/simple-game.css'))).toBe(true);
  expect(layout.stylesheets.some((href) => href.includes('ui-ux-stabilization'))).toBe(false);
});

test('menu and upgrade selection remain focused', async ({ page }, testInfo) => {
  await loadGame(page);
  await page.screenshot({ path: testInfo.outputPath('simple-menu.png'), fullPage: true });

  const upgradeState = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.enemies = [];
    game.resetBulletToPlayer();
    game.update(1);
    game.draw();
    return game.getSnapshot();
  });
  expect(upgradeState.state).toBe('upgrade');
  expect(upgradeState.upgradeChoices).toHaveLength(3);
  await page.screenshot({ path: testInfo.outputPath('simple-upgrade.png'), fullPage: true });
});

test('gameplay screenshots show the first room and the fully opened arena', async ({ page }, testInfo) => {
  await loadGame(page);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.banner = null;
    game.touchMode = matchMedia('(pointer: coarse)').matches;
    game.draw();
  });
  await page.screenshot({ path: testInfo.outputPath('arena-wave-1.png'), fullPage: true });

  const finalSnapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.wave = 8;
    game.spawnNextWave();
    game.banner = null;
    game.draw();
    return game.getSnapshot();
  });
  await page.screenshot({ path: testInfo.outputPath('arena-wave-9.png'), fullPage: true });
  expect(finalSnapshot.arenaStage).toBe(3);
  expect(finalSnapshot.arenaFullyUnlocked).toBe(true);
  expect(finalSnapshot.removedSystemsPresent).toBe(false);
});
