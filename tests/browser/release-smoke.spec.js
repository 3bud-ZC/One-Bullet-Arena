import { test, expect } from '@playwright/test';

async function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  return errors;
}

test('release menu renders without browser errors and captures a baseline', async ({ page }, testInfo) => {
  const errors = await collectErrors(page);
  await page.goto('/');
  const canvas = page.locator('#game-canvas');
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(1200);
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  expect(box.width).toBeGreaterThan(500);
  expect(box.height).toBeGreaterThan(280);
  await page.screenshot({ path: testInfo.outputPath('menu.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('keyboard start enters gameplay and keeps the canvas inside the viewport', async ({ page }, testInfo) => {
  const errors = await collectErrors(page);
  await page.goto('/');
  await page.locator('#game-canvas').click({ position: { x: 640, y: 360 } });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);
  const box = await page.locator('#game-canvas').boundingBox();
  const viewport = page.viewportSize();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
  await page.screenshot({ path: testInfo.outputPath('gameplay.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('PWA manifest and service worker assets are reachable', async ({ request }) => {
  const manifest = await request.get('/manifest.webmanifest');
  const worker = await request.get('/sw.js');
  expect(manifest.ok()).toBeTruthy();
  expect(worker.ok()).toBeTruthy();
  const data = await manifest.json();
  expect(data.display).toBe('standalone');
  expect(data.orientation).toBe('landscape');
});
