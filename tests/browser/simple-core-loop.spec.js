import { expect, test } from '@playwright/test';

async function loadGame(page) {
  await page.goto('/?qa=1');
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__));
  await page.locator('#game-canvas').waitFor({ state: 'visible' });
}

test('boots only the simple game runtime', async ({ page }) => {
  await loadGame(page);
  const snapshot = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(snapshot.version).toBe('2.0.0-simple');
  expect(snapshot.state).toBe('menu');
  expect(snapshot.allowedStates).toEqual(['menu', 'howto', 'playing', 'upgrade', 'paused', 'gameover']);
  expect(snapshot.removedSystemsPresent).toBe(false);
});

test('one action starts the only mode at wave one', async ({ page }) => {
  await loadGame(page);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__ONE_BULLET_ARENA__.state === 'playing');
  const snapshot = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(snapshot.wave).toBe(1);
  expect(snapshot.enemies).toBe(3);
  expect(snapshot.upgrades).toBe(0);
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

test('stable gameplay screenshot shows the simplified HUD', async ({ page }, testInfo) => {
  await loadGame(page);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1900);
  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.banner = null;
    game.touchMode = matchMedia('(pointer: coarse)').matches;
    game.draw();
  });
  await page.screenshot({ path: testInfo.outputPath('simple-gameplay.png'), fullPage: true });
  const snapshot = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(snapshot.state).toBe('playing');
  expect(snapshot.removedSystemsPresent).toBe(false);
});
