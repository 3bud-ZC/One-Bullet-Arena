import { expect, test } from '@playwright/test';

async function load(page, locale = 'en') {
  await page.addInitScript((value) => localStorage.setItem('one-bullet-language', value), locale);
  await page.goto('/?qa=1');
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__?.domUi));
}

async function geometry(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('#game-canvas').getBoundingClientRect();
    const frame = document.querySelector('.game-frame').getBoundingClientRect();
    return {
      viewport: [innerWidth, innerHeight],
      frame: [frame.width, frame.height],
      canvas: [canvas.left, canvas.top, canvas.width, canvas.height],
      scroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
    };
  });
}

async function expectContained(page) {
  const g = await geometry(page);
  expect(Math.abs(g.frame[0] - g.viewport[0])).toBeLessThan(1);
  expect(Math.abs(g.frame[1] - g.viewport[1])).toBeLessThan(1);
  expect(g.canvas[2]).toBeLessThanOrEqual(g.viewport[0] + 1);
  expect(g.canvas[3]).toBeLessThanOrEqual(g.viewport[1] + 1);
  expect(Math.abs(g.canvas[2] / g.canvas[3] - 16 / 9)).toBeLessThan(0.002);
  expect(Math.abs(g.canvas[0] + g.canvas[2] / 2 - g.viewport[0] / 2)).toBeLessThan(1.5);
  expect(Math.abs(g.canvas[1] + g.canvas[3] / 2 - g.viewport[1] / 2)).toBeLessThan(1.5);
  expect(g.scroll[0]).toBeLessThanOrEqual(g.viewport[0] + 1);
  expect(g.scroll[1]).toBeLessThanOrEqual(g.viewport[1] + 1);
}

test('desktop keeps a centered 16:9 render surface across laptop and non-16:9 viewports', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Responsive geometry runs once in Chromium.');
  await load(page, 'en');
  for (const [width, height] of [[1280,720],[1366,768],[1440,900],[1920,1080],[1792,832],[1680,1050]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => window.__ONE_BULLET_ARENA__.canvasViewport.resize(true));
    await expectContained(page);
  }
});

test('mobile landscape keeps DOM UI and touch canvas mapping on-screen', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-landscape', 'Dedicated mobile visual QA.');
  await page.setViewportSize({ width: 844, height: 390 });
  await load(page, 'ar');
  await expectContained(page);
  await expect(page.locator('.dashboard-screen')).toBeVisible();
  const snapshot = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(snapshot.locale).toBe('ar');
  expect(snapshot.domUiActive).toBe(true);
  expect(snapshot.canvasEffectiveDpr).toBeGreaterThan(1);
});

test('portrait mobile presents the localized orientation screen', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-landscape', 'Orientation QA runs in the mobile browser project.');
  await page.setViewportSize({ width: 390, height: 844 });
  await load(page, 'ar');
  const hint = page.locator('.orientation-hint');
  await expect(hint).toBeVisible();
  await expect(hint.locator('strong')).toHaveText('لف الهاتف للوضع الأفقي');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
});
