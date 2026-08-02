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

test('stabilized release menu fits the viewport without browser errors', async ({ page }, testInfo) => {
  const errors = await collectErrors(page);
  await page.goto('/');
  const canvas = page.locator('#game-canvas');
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(1200);
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  expect(box.width).toBeGreaterThan(500);
  expect(box.height).toBeGreaterThan(280);
  await expectViewportFit(page);
  await page.screenshot({ path: testInfo.outputPath('menu.png'), fullPage: true });
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

test('keyboard start enters gameplay with a compact edge HUD', async ({ page }, testInfo) => {
  const errors = await collectErrors(page);
  await page.goto('/');
  await page.waitForTimeout(500);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);
  const box = await page.locator('#game-canvas').boundingBox();
  const viewport = page.viewportSize();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
  await expectViewportFit(page);
  await page.screenshot({ path: testInfo.outputPath('gameplay.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('PWA manifest service worker and stabilization stylesheet are reachable', async ({ request }) => {
  const manifest = await request.get('/manifest.webmanifest');
  const worker = await request.get('/sw.js');
  const stylesheet = await request.get('/ui-ux-stabilization.css');
  expect(manifest.ok()).toBeTruthy();
  expect(worker.ok()).toBeTruthy();
  expect(stylesheet.ok()).toBeTruthy();
  const data = await manifest.json();
  expect(data.display).toBe('standalone');
  expect(data.orientation).toBe('landscape');
  expect(await worker.text()).toContain('one-bullet-arena-v1.0.1');
});
