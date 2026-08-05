import { expect, test } from '@playwright/test';

async function loadGame(page) {
  await page.goto('/?qa=1');
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__));
  await page.locator('#game-canvas').waitFor({ state: 'visible' });
}

test('boots only the clean core runtime', async ({ page }) => {
  await loadGame(page);
  const snapshot = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(snapshot.version).toBe('2.2.0-clean');
  expect(snapshot.state).toBe('menu');
  expect(snapshot.allowedStates).toEqual(['menu', 'playing', 'upgrade', 'paused', 'gameover']);
  expect(snapshot.removedSystemsPresent).toBe(false);
  expect(snapshot.puzzleObjectivesPresent).toBe(false);
});

test('one action starts wave one in the central room', async ({ page }) => {
  await loadGame(page);
  await page.keyboard.press('Enter');
  const snapshot = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(snapshot.state).toBe('playing');
  expect(snapshot.wave).toBe(1);
  expect(snapshot.enemies).toBe(3);
  expect(snapshot.arenaStage).toBe(0);
});

test('clearing a wave requires exactly one upgrade before continuing', async ({ page }) => {
  await loadGame(page);
  await page.keyboard.press('Enter');
  const upgrade = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.enemies = [];
    game.resetBulletToPlayer();
    game.update(1);
    return game.getSnapshot();
  });
  expect(upgrade.state).toBe('upgrade');
  expect(upgrade.upgradeChoices).toHaveLength(3);

  const next = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.chooseUpgrade(0);
    return game.getSnapshot();
  });
  expect(next.state).toBe('playing');
  expect(next.wave).toBe(2);
  expect(next.upgrades).toBe(1);
});

test('the same map expands automatically at waves 3, 6, and 9', async ({ page }) => {
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
    game.player.y = 360;
    game.pointer.x = 900;
    game.pointer.y = 360;
    const enemy = game.spawnEnemy('scout', 0, { point: { x: 700, y: 360 } });
    enemy.spawnTime = 0;
    game.fireBullet();
    game.updateBullet(0.45);
    return { remaining: game.enemies.length, hits: game.stats.hits };
  });
  expect(result.hits).toBeGreaterThan(0);
  expect(result.remaining).toBe(0);
});

test('mobile control zones keep combat entities visible', async ({ page }) => {
  await loadGame(page);
  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.touchMode = true;
    game.wave = 8;
    game.startNextWave();
    const zones = game.getSnapshot().touchSafeZones;
    const checks = [];
    for (const zone of zones) {
      game.player.x = zone.x + zone.w / 2;
      game.player.y = zone.y + zone.h / 2;
      game.constrainCombatCircle(game.player);
      const inside = game.player.x + game.player.radius >= zone.x
        && game.player.x - game.player.radius <= zone.x + zone.w
        && game.player.y + game.player.radius >= zone.y
        && game.player.y - game.player.radius <= zone.y + zone.h;
      checks.push({ id: zone.id, inside });
    }
    return checks;
  });
  expect(result.every((item) => item.inside === false)).toBe(true);
});

test('canvas remains contained and the document never scrolls', async ({ page }) => {
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

test('portrait view has no rotation banner or external page chrome', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await loadGame(page);
  const result = await page.evaluate(() => ({
    before: getComputedStyle(document.body, '::before').content,
    bodyChildren: [...document.body.children].map((element) => element.tagName),
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
  }));
  expect(['none', 'normal', '""']).toContain(result.before);
  expect(result.bodyChildren).toEqual(['MAIN', 'SCRIPT']);
  expect(result.scrollWidth).toBeLessThanOrEqual(413);
  expect(result.scrollHeight).toBeLessThanOrEqual(916);
});

test('menu, upgrade, wave one, wave nine, and game over remain visually reviewable', async ({ page }, testInfo) => {
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
    game.update(1);
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
