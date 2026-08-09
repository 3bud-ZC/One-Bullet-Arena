import { expect, test } from '@playwright/test';

async function load(page, locale = 'en') {
  await page.addInitScript((value) => localStorage.setItem('one-bullet-language', value), locale);
  await page.goto('/?qa=1');
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__));
}

async function capture(page, testInfo, name) {
  const image = await page.locator('#game-canvas').screenshot({ animations: 'disabled' });
  await testInfo.attach(`${testInfo.project.name}-${name}`, { body: image, contentType: 'image/png' });
}

async function assertViewportFill(page) {
  const geometry = await page.evaluate(() => {
    const frame = document.querySelector('.game-frame').getBoundingClientRect();
    const canvas = document.querySelector('#game-canvas').getBoundingClientRect();
    return {
      viewport: [innerWidth, innerHeight],
      frame: [frame.width, frame.height],
      canvas: [canvas.width, canvas.height],
      scroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
    };
  });
  expect(Math.abs(geometry.frame[0] - geometry.viewport[0])).toBeLessThan(1);
  expect(Math.abs(geometry.frame[1] - geometry.viewport[1])).toBeLessThan(1);
  expect(Math.abs(geometry.canvas[0] - geometry.viewport[0])).toBeLessThan(1);
  expect(Math.abs(geometry.canvas[1] - geometry.viewport[1])).toBeLessThan(1);
  expect(geometry.scroll[0]).toBeLessThanOrEqual(geometry.viewport[0] + 1);
  expect(geometry.scroll[1]).toBeLessThanOrEqual(geometry.viewport[1] + 1);
}

test('desktop Chromium visually validates 1280x720, 1920x1080, and laptop viewports', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Dedicated responsive visual QA runs once in Chromium');
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  const viewports = [
    { width: 1280, height: 720, name: '1280x720' },
    { width: 1920, height: 1080, name: '1920x1080' },
    { width: 1366, height: 768, name: '1366x768-laptop' },
  ];
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await load(page, 'en');
    await page.evaluate(() => {
      const game = window.__ONE_BULLET_ARENA__;
      game.clearCheckpoint();
      game.goToMenu();
      game.draw();
    });
    await assertViewportFill(page);
    await capture(page, testInfo, `global-ui-${viewport.name}`);
  }
  expect(pageErrors).toEqual([]);
});

test('mobile landscape around 844x390 keeps global UI and touch controls on-screen', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-landscape', 'Dedicated mobile visual QA');
  await page.setViewportSize({ width: 844, height: 390 });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await load(page, 'ar');
  const snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.touchMode = true;
    game.wave = 17;
    game.startNextWave();
    game.banner = null;
    game.tutorialStep = 3;
    game.draw();
    return game.getSnapshot();
  });
  expect(snapshot.locale).toBe('ar');
  expect(snapshot.state).toBe('playing');
  await assertViewportFill(page);
  await capture(page, testInfo, 'global-ui-844x390-mobile-ar');
  expect(pageErrors).toEqual([]);
});

test('portrait mobile presents the localized orientation screen instead of cropped controls', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-landscape', 'Orientation QA runs in the mobile browser project');
  await page.setViewportSize({ width: 390, height: 844 });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await load(page, 'ar');
  const hint = page.locator('.orientation-hint');
  await expect(hint).toBeVisible();
  await expect(hint.locator('strong')).toHaveText('لف الهاتف للوضع الأفقي');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  const image = await page.screenshot({ fullPage: true, animations: 'disabled' });
  await testInfo.attach(`${testInfo.project.name}-portrait-orientation-ar`, { body: image, contentType: 'image/png' });
  expect(pageErrors).toEqual([]);
});
