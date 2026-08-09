import { expect, test } from '@playwright/test';

async function loadGame(page) {
  await page.addInitScript(() => localStorage.setItem('one-bullet-language', 'en'));
  await page.goto('/?qa=1');
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__?.domUi));
}

async function attachFrame(page, testInfo, name) {
  const image = await page.locator('.game-frame').screenshot({ animations: 'disabled' });
  await testInfo.attach(`${testInfo.project.name}-${name}`, { body: image, contentType: 'image/png' });
}

test('captures v3.7 presentation while preserving combat-depth systems', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Visual review is captured in desktop Chromium.');
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await loadGame(page);

  const menu = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(menu.releaseVersion).toBe('3.7.0-hires-ui');
  expect(menu.releaseChannel).toBe('hires-ui');
  expect(menu.releaseCacheName).toBe('one-bullet-arena-v3.7.0-hires-ui');
  expect(menu.globalUiRevision).toBe('dom-hidpi-presentation-v1');
  expect(menu.combatDepthActive).toBe(true);
  expect(menu.checkpointProgressionActive).toBe(true);
  expect(menu.wardenEnemyActive).toBe(true);
  expect(menu.expandingWorldActive).toBe(true);
  await attachFrame(page, testInfo, 'hires-release-menu');

  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.banner = null;
    game.tutorialStep = 3;
    game.momentum = 46;
    game.combo = 4;
    game.draw();
  });
  await attachFrame(page, testInfo, 'hires-combat-hud');
});
