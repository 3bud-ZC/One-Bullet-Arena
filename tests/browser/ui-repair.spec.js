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

test('global UI renders fresh English and Arabic menus with immediate locale switching', async ({ page }, testInfo) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await loadGame(page, 'en');

  let snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.clearCheckpoint();
    game.goToMenu();
    game.draw();
    return game.getSnapshot();
  });
  expect(snapshot.releaseVersion).toBe('3.6.0-global-ui');
  expect(snapshot.globalUiRuntimeVersion).toBe('3.6.0-global-ui');
  expect(snapshot.globalUiRevision).toBe('global-command-interface-v1');
  expect(snapshot.presentationOwner).toBe('OneBulletGlobalUiRuntime');
  expect(snapshot.locale).toBe('en');
  expect(await page.locator('html').getAttribute('dir')).toBe('ltr');
  await capture(page, testInfo, 'fresh-menu-en');

  snapshot = await page.evaluate(() => {
    window.__ONE_BULLET_I18N__.setLocale('ar');
    const game = window.__ONE_BULLET_ARENA__;
    game.draw();
    return game.getSnapshot();
  });
  expect(snapshot.locale).toBe('ar');
  expect(await page.locator('html').getAttribute('dir')).toBe('rtl');
  expect(await page.evaluate(() => localStorage.getItem('one-bullet-language'))).toBe('ar');
  await capture(page, testInfo, 'fresh-menu-ar');
  expect(pageErrors).toEqual([]);
});

test('global UI captures bilingual checkpoint dashboard and all major game states', async ({ page }, testInfo) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await loadGame(page, 'en');

  let snapshot = await makeCheckpoint(page, 18);
  expect(snapshot.state).toBe('menu');
  expect(snapshot.checkpointAvailable).toBe(true);
  await capture(page, testInfo, 'checkpoint-dashboard-en');

  snapshot = await page.evaluate(() => {
    window.__ONE_BULLET_I18N__.setLocale('ar');
    const game = window.__ONE_BULLET_ARENA__;
    game.draw();
    return game.getSnapshot();
  });
  expect(snapshot.locale).toBe('ar');
  await capture(page, testInfo, 'checkpoint-dashboard-ar');

  snapshot = await page.evaluate(() => {
    window.__ONE_BULLET_I18N__.setLocale('en');
    const game = window.__ONE_BULLET_ARENA__;
    game.continueFromCheckpoint();
    game.banner = null;
    game.tutorialStep = 3;
    game.draw();
    return game.getSnapshot();
  });
  expect(snapshot.state).toBe('playing');
  await capture(page, testInfo, 'combat-hud');

  snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.wave = 35;
    game.startNextWave();
    game.banner = null;
    game.tutorialStep = 3;
    game.draw();
    return game.getSnapshot();
  });
  expect(snapshot.state).toBe('playing');
  await capture(page, testInfo, 'expanded-world-minimap');

  snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.state = 'paused';
    game.draw();
    return game.getSnapshot();
  });
  expect(snapshot.state).toBe('paused');
  await capture(page, testInfo, 'pause');

  snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.state = 'playing';
    game.enemies = [];
    game.resetBulletToPlayer();
    game.waveClearTimer = 0.95;
    game.update(1);
    game.draw();
    return game.getSnapshot();
  });
  expect(snapshot.state).toBe('upgrade');
  expect(snapshot.upgradeChoices).toHaveLength(3);
  await capture(page, testInfo, 'upgrade');

  snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.state = 'gameover';
    game.score = 325900;
    game.highScore = Math.max(game.highScore, 325900);
    game.draw();
    return game.getSnapshot();
  });
  expect(snapshot.state).toBe('gameover');
  await capture(page, testInfo, 'game-over');

  expect(pageErrors).toEqual([]);
});

test('mobile landscape keeps touch controls and HUD readable', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-landscape', 'Mobile visual QA only');
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await loadGame(page, 'en');
  const snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.touchMode = true;
    game.wave = 18;
    game.startNextWave();
    game.banner = null;
    game.tutorialStep = 3;
    game.draw();
    return game.getSnapshot();
  });
  expect(snapshot.state).toBe('playing');
  await capture(page, testInfo, 'mobile-landscape');
  expect(pageErrors).toEqual([]);
});
