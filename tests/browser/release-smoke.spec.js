import { test, expect } from '@playwright/test';

async function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  return errors;
}

async function clickCanvasPoint(page, internalX, internalY) {
  const canvas = page.locator('#game-canvas');
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + box.width * internalX / 1280, box.y + box.height * internalY / 720);
}

async function expectViewportFit(page) {
  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 2);
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.innerHeight + 2);
}

async function expectCanvasContained(page) {
  const canvas = page.locator('#game-canvas');
  const box = await canvas.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.y).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
  return { box, viewport };
}

async function expectNoExternalChrome(page) {
  await expect(page.locator('.orientation-gate')).toHaveCount(0);
  await expect(page.locator('#fullscreen-toggle')).toBeHidden();
  await expect(page.locator('#presentation-status')).toBeHidden();
}

test('direct public URL contains only the full-viewport game surface', async ({ page }, testInfo) => {
  const errors = await collectErrors(page);
  await page.goto('/');
  await expect(page.locator('body')).toHaveClass(/direct-game-shell/);
  await expect(page.locator('header')).toHaveCount(0);
  await expect(page.locator('footer')).toHaveCount(0);
  await expect(page.locator('.top-actions')).toHaveCount(0);
  await expectNoExternalChrome(page);
  await expect(page.locator('.game-stage')).toBeVisible();
  await page.waitForTimeout(900);
  const { box, viewport } = await expectCanvasContained(page);
  expect(box.width * box.height).toBeGreaterThan(viewport.width * viewport.height * 0.72);
  await expectViewportFit(page);
  await page.screenshot({ path: testInfo.outputPath('direct-menu.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('command center opens from the simplified quick-access panel', async ({ page }, testInfo) => {
  const errors = await collectErrors(page);
  await page.goto('/');
  await page.waitForTimeout(700);
  await clickCanvasPoint(page, 1030, 490);
  await page.waitForTimeout(450);
  await page.screenshot({ path: testInfo.outputPath('command-center.png'), fullPage: true });
  await expectViewportFit(page);
  expect(errors).toEqual([]);
});

test('core hub uses selector plus readable detail panel', async ({ page }, testInfo) => {
  const errors = await collectErrors(page);
  await page.goto('/');
  await page.waitForTimeout(700);
  await clickCanvasPoint(page, 950, 552);
  await page.waitForTimeout(400);
  await clickCanvasPoint(page, 210, 266);
  await page.waitForTimeout(350);
  await page.screenshot({ path: testInfo.outputPath('core-hub.png'), fullPage: true });
  await expectViewportFit(page);
  expect(errors).toEqual([]);
});

test('keyboard start enters the overhauled arena and techniques run without errors', async ({ page }, testInfo) => {
  const errors = await collectErrors(page);
  await page.goto('/');
  await page.waitForTimeout(500);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2200);
  await page.keyboard.press('KeyR');
  await page.waitForTimeout(250);
  await page.keyboard.press('KeyC');
  await page.waitForTimeout(650);
  const { box, viewport } = await expectCanvasContained(page);
  if (testInfo.project.name === 'mobile-landscape') {
    expect(viewport.height - (box.y + box.height)).toBeLessThanOrEqual(2);
  }
  await expectNoExternalChrome(page);
  await expectViewportFit(page);
  await page.screenshot({ path: testInfo.outputPath('map-overhaul-gameplay.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('phone landscape viewport matrix remains scroll-free, chrome-free, and fully contained', async ({ page }, testInfo) => {
  const errors = await collectErrors(page);
  const sizes = [
    { width: 740, height: 360 },
    { width: 844, height: 390 },
    { width: 873, height: 393 },
    { width: 915, height: 412 },
    { width: 932, height: 430 },
  ];
  for (const size of sizes) {
    await page.setViewportSize(size);
    await page.goto('/');
    await page.waitForTimeout(280);
    await expectNoExternalChrome(page);
    await expectViewportFit(page);
    const { box } = await expectCanvasContained(page);
    expect(box.width).toBeGreaterThan(size.width * 0.76);
    expect(box.height).toBeGreaterThan(size.height * 0.76);
  }
  await page.screenshot({ path: testInfo.outputPath('mobile-matrix-last-size.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('portrait phone keeps a clean contained game surface without orientation chrome', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expectNoExternalChrome(page);
  await expect(page.locator('.game-stage')).toBeVisible();
  await expectCanvasContained(page);
  await expectViewportFit(page);
  await page.screenshot({ path: testInfo.outputPath('portrait-clean-shell.png'), fullPage: true });
});

test('PWA shell and v1.3.0 map overhaul assets are reachable', async ({ request }) => {
  const manifest = await request.get('/manifest.webmanifest');
  const worker = await request.get('/sw.js');
  const directStyles = await request.get('/direct-game.css');
  const expansionData = await request.get('/src/v12-expansion-data.js');
  const expansionRuntime = await request.get('/src/v12-expansion.js');
  const progressiveHazards = await request.get('/src/progressive-map-hazards.js');
  const mapData = await request.get('/src/map-overhaul-data.js');
  const mapRuntime = await request.get('/src/map-overhaul.js');
  expect(manifest.ok()).toBeTruthy();
  expect(worker.ok()).toBeTruthy();
  expect(directStyles.ok()).toBeTruthy();
  expect(expansionData.ok()).toBeTruthy();
  expect(expansionRuntime.ok()).toBeTruthy();
  expect(progressiveHazards.ok()).toBeTruthy();
  expect(mapData.ok()).toBeTruthy();
  expect(mapRuntime.ok()).toBeTruthy();
  const data = await manifest.json();
  expect(data.display).toBe('standalone');
  expect(data.orientation).toBe('landscape');
  const workerText = await worker.text();
  expect(workerText).toContain('one-bullet-arena-v1.3.0');
  expect(workerText).toContain('direct-game.css');
  expect(workerText).toContain('progressive-map-hazards.js');
  expect(workerText).toContain('map-overhaul-data.js');
  expect(workerText).toContain('map-overhaul.js');
});
