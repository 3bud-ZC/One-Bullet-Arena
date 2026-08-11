import { expect, test } from '@playwright/test';

async function loadGame(page, locale = 'en') {
  await page.addInitScript((value) => localStorage.setItem('one-bullet-language', value), locale);
  await page.goto('/?qa=1');
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__?.domUi && window.__ONE_BULLET_I18N__));
}

async function seedCheckpoint(page, wave = 18) {
  await page.evaluate((targetWave) => {
    const game = window.__ONE_BULLET_ARENA__;
    game.clearCheckpoint();
    game.startRun();
    game.stats.upgrades = Math.max(3, targetWave - 4);
    game.score = targetWave * 11340;
    game.wave = targetWave - 1;
    game.startNextWave();
    game.goToMenu();
    game.draw();
  }, wave);
}

test('v3.8 canonical presentation preserves DOM + HiDPI architecture and adds smooth runtime ownership', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Canonical UI contract runs once in Chromium.');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await loadGame(page, 'en');
  await seedCheckpoint(page, 64);
  let snapshot = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(snapshot.releaseVersion).toBe('3.12.0-guardian-arena');
  expect(snapshot.globalUiRuntimeVersion).toBe('3.12.0-guardian-arena');
  expect(snapshot.globalUiRevision).toBe('smooth-fixedstep-presentation-v1');
  expect(snapshot.presentationOwner).toBe('OneBulletGlobalUiRuntime');
  expect(snapshot.renderingArchitecture).toBe('canvas-world+dom-ui');
  expect(snapshot.domUiActive).toBe(true);
  expect(snapshot.hiDpiCanvasActive).toBe(true);
  expect(snapshot.fixedSimulationHz).toBe(120);
  expect(snapshot.interpolatedRendering).toBe(true);
  expect(snapshot.logicalCanvasWidth).toBe(1280);
  expect(snapshot.logicalCanvasHeight).toBe(720);
  await expect(page.locator('.dashboard-screen')).toBeVisible();
  await expect(page.locator('.progression-svg')).toBeVisible();
  await page.locator('[data-action="settings"]').click();
  await expect(page.locator('[data-quality-control]')).toBeVisible();

  await page.locator('[data-action="locale-ar"]').click();
  snapshot = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(snapshot.locale).toBe('ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
});

test('Pause, Upgrade Selection, and Game Over remain DOM surfaces rather than Canvas text screens', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'State UI contract runs once in Chromium.');
  await loadGame(page, 'en');
  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.banner = null;
    game.tutorialStep = 3;
    game.pause();
  });
  await expect(page.locator('[data-screen="paused"]')).toBeVisible();
  await expect(page.locator('[data-action="resume"]')).toBeVisible();

  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.resume();
    game.wave = 6;
    game.enemies = [];
    game.resetBulletToPlayer();
    game.waveClearTimer = 0.95;
    game.update(1);
    game.draw();
  });
  await expect(page.locator('[data-screen="upgrade"]')).toBeVisible();
  await expect(page.locator('.upgrade-card')).toHaveCount(3);

  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.setState('gameover');
    game.draw();
  });
  await expect(page.locator('[data-screen="gameover"]')).toBeVisible();
});
