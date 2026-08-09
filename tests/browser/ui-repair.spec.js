import { expect, test } from '@playwright/test';

test.setTimeout(90_000);

async function loadGame(page, locale = 'en') {
  await page.addInitScript((value) => localStorage.setItem('one-bullet-language', value), locale);
  await page.goto('/?qa=1');
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__ && window.__ONE_BULLET_I18N__));
  await page.locator('#game-canvas').waitFor({ state: 'visible' });
}

async function capture(page, testInfo, name) {
  const image = await page.locator('#game-canvas').screenshot({ animations: 'disabled' });
  await testInfo.attach(`${testInfo.project.name}-${name}`, { body: image, contentType: 'image/png' });
}

async function setLocaleAndDraw(page, locale) {
  return page.evaluate((value) => {
    window.__ONE_BULLET_I18N__.setLocale(value);
    const game = window.__ONE_BULLET_ARENA__;
    game.draw();
    return game.getSnapshot();
  }, locale);
}

async function makeCheckpoint(page, wave = 18) {
  return page.evaluate((targetWave) => {
    const game = window.__ONE_BULLET_ARENA__;
    game.clearCheckpoint();
    game.startRun();
    game.stats.upgrades = Math.max(3, targetWave - 4);
    game.score = targetWave * 11340;
    game.wave = targetWave - 1;
    game.startNextWave();
    game.goToMenu();
    game.draw();
    return game.getSnapshot();
  }, wave);
}

function desktopVisualOnly(testInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Canonical visual QA is captured in desktop Chromium.');
}

test('refined bilingual dashboard is balanced at 1920x1080 and keeps locale state explicit', async ({ page }, testInfo) => {
  desktopVisualOnly(testInfo);
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.setViewportSize({ width: 1920, height: 1080 });
  await loadGame(page, 'en');

  let snapshot = await makeCheckpoint(page, 64);
  expect(snapshot.releaseVersion).toBe('3.6.1-ui-refinement');
  expect(snapshot.globalUiRuntimeVersion).toBe('3.6.1-ui-refinement');
  expect(snapshot.globalUiRevision).toBe('production-refinement-v1');
  expect(snapshot.presentationOwner).toBe('OneBulletGlobalUiRuntime');
  expect(snapshot.visualRefinementActive).toBe(true);
  expect(snapshot.locale).toBe('en');
  expect(await page.locator('html').getAttribute('dir')).toBe('ltr');
  await capture(page, testInfo, '01-dashboard-en-1920');

  snapshot = await setLocaleAndDraw(page, 'ar');
  expect(snapshot.locale).toBe('ar');
  expect(await page.locator('html').getAttribute('dir')).toBe('rtl');
  expect(await page.evaluate(() => localStorage.getItem('one-bullet-language'))).toBe('ar');
  await capture(page, testInfo, '02-dashboard-ar-1920');

  await page.setViewportSize({ width: 1366, height: 768 });
  await setLocaleAndDraw(page, 'en');
  await capture(page, testInfo, 'dashboard-en-laptop-1366');
  await page.setViewportSize({ width: 1280, height: 720 });
  await setLocaleAndDraw(page, 'ar');
  await capture(page, testInfo, 'dashboard-ar-1280');
  expect(pageErrors).toEqual([]);
});

test('compact pause keeps the arena visible and uses the same language utility in both locales', async ({ page }, testInfo) => {
  desktopVisualOnly(testInfo);
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.setViewportSize({ width: 1920, height: 1080 });
  await loadGame(page, 'en');
  await makeCheckpoint(page, 18);
  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.continueFromCheckpoint();
    game.banner = null;
    game.tutorialStep = 3;
    game.state = 'paused';
    game.draw();
  });
  await capture(page, testInfo, '03-pause-en');
  const ar = await setLocaleAndDraw(page, 'ar');
  expect(ar.locale).toBe('ar');
  await capture(page, testInfo, '04-pause-ar');
  expect(pageErrors).toEqual([]);
});

test('combat visual QA covers normal, fired bullet, low health, and sector unlock states', async ({ page }, testInfo) => {
  desktopVisualOnly(testInfo);
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.setViewportSize({ width: 1920, height: 1080 });
  await loadGame(page, 'en');
  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.banner = null;
    game.tutorialStep = 3;
    game.pointer.x = game.player.x + 260;
    game.pointer.y = game.player.y - 80;
    game.draw();
  });
  await capture(page, testInfo, '05-combat-normal');

  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.fireBullet();
    game.update(0.08);
    game.draw();
  });
  await capture(page, testInfo, '06-combat-bullet-fired');

  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.player.health = 1;
    game.player.maxHealth = 4;
    game.draw();
  });
  await capture(page, testInfo, '07-combat-low-health');

  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.resetBulletToPlayer();
    game.wave = 34;
    game.startNextWave();
    game.banner.time = 2.3;
    game.tutorialStep = 3;
    game.draw();
  });
  await capture(page, testInfo, '08-sector-unlock');
  expect(pageErrors).toEqual([]);
});

test('upgrade comparison stays current-to-new in both RTL/LTR and game over remains coherent', async ({ page }, testInfo) => {
  desktopVisualOnly(testInfo);
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.setViewportSize({ width: 1920, height: 1080 });
  await loadGame(page, 'en');
  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.state = 'playing';
    game.enemies = [];
    game.resetBulletToPlayer();
    game.waveClearTimer = 0.95;
    game.update(1);
    game.draw();
  });
  let snapshot = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(snapshot.state).toBe('upgrade');
  expect(snapshot.upgradeChoices).toHaveLength(3);
  expect(snapshot.semanticUpgradeDirection).toBe('current-to-new');
  await capture(page, testInfo, '09-upgrade-en');

  snapshot = await setLocaleAndDraw(page, 'ar');
  expect(snapshot.locale).toBe('ar');
  await capture(page, testInfo, '10-upgrade-ar');

  await setLocaleAndDraw(page, 'en');
  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.state = 'gameover';
    game.score = 325900;
    game.highScore = Math.max(game.highScore, 325900);
    game.draw();
  });
  await capture(page, testInfo, '11-game-over');
  expect(pageErrors).toEqual([]);
});

test('mobile landscape 844x390 keeps menu, HUD, and touch controls inside the gameplay surface', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-landscape', 'Mobile landscape visual QA only');
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.setViewportSize({ width: 844, height: 390 });
  await loadGame(page, 'ar');

  let snapshot = await makeCheckpoint(page, 18);
  expect(snapshot.state).toBe('menu');
  expect(snapshot.locale).toBe('ar');
  await capture(page, testInfo, '13-mobile-menu-ar-844x390');

  snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.continueFromCheckpoint();
    game.touchMode = true;
    game.banner = null;
    game.tutorialStep = 3;
    game.draw();
    return game.getSnapshot();
  });
  expect(snapshot.state).toBe('playing');
  await capture(page, testInfo, '12-mobile-gameplay-ar-844x390');
  expect(pageErrors).toEqual([]);
});
