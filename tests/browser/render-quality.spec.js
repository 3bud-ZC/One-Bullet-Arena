import { expect, test } from '@playwright/test';

const RELEASE = '3.8.0-smooth-runtime';

async function loadGame(page, locale = 'en') {
  await page.addInitScript((value) => localStorage.setItem('one-bullet-language', value), locale);
  await page.goto('/?qa=1');
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__?.domUi && window.__ONE_BULLET_ARENA__?.canvasViewport));
  await page.locator('#game-canvas').waitFor({ state: 'visible' });
}

async function frameGeometry(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('#game-canvas');
    const rect = canvas.getBoundingClientRect();
    const frame = document.querySelector('.game-frame').getBoundingClientRect();
    const game = window.__ONE_BULLET_ARENA__;
    return {
      viewport: { width: innerWidth, height: innerHeight },
      frame: { left: frame.left, top: frame.top, width: frame.width, height: frame.height },
      canvas: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        backingWidth: canvas.width,
        backingHeight: canvas.height,
      },
      snapshot: game.getSnapshot(),
    };
  });
}

async function expectContainedCanvas(page) {
  const geometry = await frameGeometry(page);
  expect(geometry.snapshot.releaseVersion).toBe(RELEASE);
  expect(geometry.snapshot.logicalCanvasWidth).toBe(1280);
  expect(geometry.snapshot.logicalCanvasHeight).toBe(720);
  expect(geometry.snapshot.hiDpiCanvasActive).toBe(true);
  expect(geometry.snapshot.aspectRatioContainActive).toBe(true);
  expect(geometry.snapshot.domUiActive).toBe(true);
  expect(geometry.snapshot.renderingArchitecture).toBe('canvas-world+dom-ui');
  expect(Math.abs(geometry.canvas.width / geometry.canvas.height - 16 / 9)).toBeLessThan(0.002);
  expect(geometry.canvas.width).toBeLessThanOrEqual(geometry.viewport.width + 1);
  expect(geometry.canvas.height).toBeLessThanOrEqual(geometry.viewport.height + 1);
  expect(Math.abs((geometry.canvas.left + geometry.canvas.width / 2) - geometry.viewport.width / 2)).toBeLessThan(1.5);
  expect(Math.abs((geometry.canvas.top + geometry.canvas.height / 2) - geometry.viewport.height / 2)).toBeLessThan(1.5);
  expect(geometry.canvas.backingWidth).toBeGreaterThanOrEqual(Math.floor(geometry.canvas.width));
  expect(geometry.canvas.backingHeight).toBeGreaterThanOrEqual(Math.floor(geometry.canvas.height));
  expect(geometry.canvas.backingWidth * geometry.canvas.backingHeight).toBeLessThanOrEqual(8_650_000);
  return geometry;
}

async function captureFrame(page, testInfo, name) {
  await page.evaluate(() => window.__ONE_BULLET_ARENA__.domUi.sync(true));
  const box = await page.evaluate(() => {
    const rect = document.querySelector('.game-frame').getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
  const image = await page.screenshot({ animations: 'disabled', clip: box });
  await testInfo.attach(`${testInfo.project.name}-${name}`, { body: image, contentType: 'image/png' });
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

test('canvas contain geometry stays circular and undistorted across 16:9 and non-16:9 desktop viewports', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Deterministic render matrix runs once in Chromium.');
  test.setTimeout(120_000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  const viewports = [
    [1280, 720],
    [1366, 768],
    [1440, 900],
    [1600, 900],
    [1920, 1080],
    [2560, 1440],
    [1792, 832],
    [1680, 1050],
  ];

  await loadGame(page, 'en');
  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => {
      const game = window.__ONE_BULLET_ARENA__;
      game.canvasViewport.resize(true);
      game.goToMenu();
      game.draw();
    });
    const geometry = await expectContainedCanvas(page);
    expect(geometry.snapshot.canvasViewport.aspectRatio).toBeCloseTo(16 / 9, 5);
  }
  expect(errors).toEqual([]);
});

test('DOM presentation is semantic, vector based, localized, and does not intercept gameplay center input', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'DOM presentation contract runs once in Chromium.');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await loadGame(page, 'en');

  await expect(page.locator('#game-ui-layer')).toHaveAttribute('data-state', 'menu');
  await expect(page.locator('.dashboard-screen')).toBeVisible();
  await expect(page.locator('.dashboard-screen button[data-action="primary-run"]')).toBeVisible();
  await expect(page.locator('.game-ui-layer svg.ui-icon').first()).toBeVisible();
  await expect(page.locator('.progression-svg')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  expect(await page.locator('canvas').count()).toBe(1);

  await page.locator('[data-action="locale-ar"]').click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('#game-ui-layer')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('[data-bind="run-kicker"]')).toContainText('جولة');

  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.enemies = [];
    game.enemyShots = [];
    game.player.invulnerability = 5;
    game.setState('playing');
    game.banner = null;
    game.tutorialStep = 3;
    game.draw();
    game.domUi.sync(true);
  });
  await expect(page.locator('#game-ui-layer')).toHaveAttribute('data-state', 'playing');
  const centerTarget = await page.evaluate(() => document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.id || '');
  expect(centerTarget).toBe('game-canvas');

  const rect = await page.locator('#game-canvas').boundingBox();
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  const pointer = await page.evaluate(() => ({ ...window.__ONE_BULLET_ARENA__.pointer }));
  expect(pointer.x).toBeCloseTo(640, 0);
  expect(pointer.y).toBeCloseTo(360, 0);
});

test('resize and synthetic fullscreen changes update backing store without page reload', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Resize contract runs once in Chromium.');
  await page.setViewportSize({ width: 1440, height: 900 });
  await loadGame(page, 'en');
  const before = await expectContainedCanvas(page);

  await page.setViewportSize({ width: 1792, height: 832 });
  await page.evaluate(() => {
    document.dispatchEvent(new Event('fullscreenchange'));
    window.__ONE_BULLET_ARENA__.canvasViewport.resize(true);
  });
  const after = await expectContainedCanvas(page);
  expect(after.canvas.width).not.toBeCloseTo(before.canvas.width, 0);
  expect(after.snapshot.canvasViewport.displayScale).not.toBe(before.snapshot.canvasViewport.displayScale);
});

test('HiDPI context uses a larger physical backing store while retaining 1280x720 logical input', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Explicit device scale test runs once in Chromium.');
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await loadGame(page, 'en');
  const geometry = await expectContainedCanvas(page);
  expect(geometry.snapshot.canvasViewport.devicePixelRatio).toBe(2);
  expect(geometry.snapshot.canvasViewport.effectiveDpr).toBeGreaterThan(1);
  expect(geometry.canvas.backingWidth).toBeGreaterThan(geometry.canvas.width * 1.4);
  const mapped = await page.evaluate(() => {
    const rect = document.querySelector('#game-canvas').getBoundingClientRect();
    return window.__ONE_BULLET_ARENA__.canvasViewport.clientToLogical(rect.left + rect.width / 2, rect.top + rect.height / 2);
  });
  expect(mapped.x).toBeCloseTo(640, 5);
  expect(mapped.y).toBeCloseTo(360, 5);
  await captureFrame(page, testInfo, 'hidpi-1440x900-dsf2-dashboard');
  await context.close();
});

test('required visual QA captures crisp DOM dashboard and active states at production sizes', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Visual matrix runs once in Chromium.');
  test.setTimeout(240_000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await loadGame(page, 'en');
  await seedCheckpoint(page, 64);

  for (const [width, height, name] of [
    [1280, 720, 'dashboard-en-1280x720'],
    [1366, 768, 'dashboard-en-1366x768'],
    [1440, 900, 'dashboard-en-1440x900'],
    [1600, 900, 'dashboard-en-1600x900'],
    [1920, 1080, 'dashboard-en-1920x1080'],
    [2560, 1440, 'dashboard-en-2560x1440'],
    [1792, 832, 'dashboard-en-1792x832-non169'],
    [1680, 1050, 'dashboard-en-1680x1050-non169'],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => {
      const game = window.__ONE_BULLET_ARENA__;
      window.__ONE_BULLET_I18N__.setLocale('en');
      game.canvasViewport.resize(true);
      game.goToMenu();
      game.draw();
    });
    await expectContainedCanvas(page);
    await captureFrame(page, testInfo, name);
  }

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.evaluate(() => {
    window.__ONE_BULLET_I18N__.setLocale('ar');
    const game = window.__ONE_BULLET_ARENA__;
    game.goToMenu();
    game.draw();
  });
  await captureFrame(page, testInfo, 'dashboard-ar-1920x1080');

  await page.evaluate(() => {
    window.__ONE_BULLET_I18N__.setLocale('en');
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.wave = 18;
    game.startNextWave();
    game.player.invulnerability = 5;
    game.banner = null;
    game.tutorialStep = 3;
    game.draw();
  });
  await captureFrame(page, testInfo, 'combat-hud-1920x1080');

  await page.evaluate(() => window.__ONE_BULLET_ARENA__.pause());
  await captureFrame(page, testInfo, 'pause-dom-1920x1080');

  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.player.health = game.player.maxHealth;
    game.setState('playing');
    game.wave = 5;
    game.enemies = [];
    game.resetBulletToPlayer();
    game.waveClearTimer = 0.95;
    game.update(1);
    game.draw();
  });
  await expect(page.locator('#game-ui-layer')).toHaveAttribute('data-state', 'upgrade');
  await captureFrame(page, testInfo, 'upgrade-dom-1920x1080');

  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.setState('gameover');
    game.score = 325900;
    game.highScore = Math.max(game.highScore, 325900);
    game.draw();
  });
  await captureFrame(page, testInfo, 'gameover-dom-1920x1080');
  expect(errors).toEqual([]);
});

test('mobile landscape keeps contain geometry, DOM dashboard, and touch-coordinate mapping coherent', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-landscape', 'Mobile landscape QA.');
  await page.setViewportSize({ width: 844, height: 390 });
  await loadGame(page, 'ar');
  await seedCheckpoint(page, 18);
  const menu = await expectContainedCanvas(page);
  expect(menu.snapshot.locale).toBe('ar');
  await expect(page.locator('.dashboard-screen')).toBeVisible();
  await captureFrame(page, testInfo, 'dashboard-ar-844x390-mobile');

  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.continueFromCheckpoint();
    game.touchMode = true;
    game.banner = null;
    game.tutorialStep = 3;
    game.draw();
  });
  await expect(page.locator('#game-ui-layer')).toHaveAttribute('data-state', 'playing');
  const mapping = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    const rect = game.canvas.getBoundingClientRect();
    const mapped = game.canvasViewport.clientToLogical(rect.left + rect.width * 0.75, rect.top + rect.height * 0.5);
    return { mapped, rect: { width: rect.width, height: rect.height }, dpr: game.getSnapshot().canvasEffectiveDpr };
  });
  expect(mapping.mapped.x).toBeCloseTo(960, 3);
  expect(mapping.mapped.y).toBeCloseTo(360, 3);
  expect(mapping.dpr).toBeGreaterThan(1);
  await captureFrame(page, testInfo, 'combat-ar-844x390-mobile');
});
