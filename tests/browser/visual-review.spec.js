import { expect, test } from '@playwright/test';

async function loadGame(page, locale = 'en') {
  await page.addInitScript((value) => localStorage.setItem('one-bullet-language', value), locale);
  await page.goto('/?qa=1');
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__?.domUi));
}

async function attachFrame(page, testInfo, name, animations = 'disabled') {
  const box = await page.evaluate(() => {
    const rect = document.querySelector('.game-frame').getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
  const image = await page.screenshot({ animations, clip: box });
  await testInfo.attach(`${testInfo.project.name}-${name}`, { body: image, contentType: 'image/png' });
}

async function seedWave(page, wave) {
  await page.evaluate((targetWave) => {
    const game = window.__ONE_BULLET_ARENA__;
    if (game.state === 'menu') game.startRun();
    game.wave = targetWave - 1;
    game.startNextWave();
    game.banner = null;
    game.tutorialStep = 3;
    for (const enemy of game.enemies) enemy.spawnTime = 0;
    game.draw();
  }, wave);
}

test('captures v3.8 dashboard and representative game-feel states', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Visual review is captured in desktop Chromium.');
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await loadGame(page, 'en');

  const menu = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(menu.releaseVersion).toBe('3.9.0-command-deck');
  expect(menu.releaseChannel).toBe('smooth-runtime');
  expect(menu.releaseCacheName).toBe('one-bullet-arena-v3.9.0-command-deck');
  expect(menu.globalUiRevision).toBe('smooth-fixedstep-presentation-v1');
  expect(menu.combatDepthActive).toBe(true);
  expect(menu.checkpointProgressionActive).toBe(true);
  expect(menu.wardenEnemyActive).toBe(true);
  expect(menu.expandingWorldActive).toBe(true);
  await attachFrame(page, testInfo, 'smooth-dashboard-en-1920x1080');

  await page.evaluate(() => window.__ONE_BULLET_I18N__.setLocale('ar'));
  await attachFrame(page, testInfo, 'smooth-dashboard-ar-1920x1080');
  await page.evaluate(() => window.__ONE_BULLET_I18N__.setLocale('en'));

  await page.setViewportSize({ width: 2560, height: 1440 });
  await attachFrame(page, testInfo, 'smooth-dashboard-en-2560x1440');
  await page.setViewportSize({ width: 1920, height: 1080 });

  await seedWave(page, 1);
  await attachFrame(page, testInfo, 'smooth-wave-1');

  await seedWave(page, 10);
  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    const sniper = game.enemies.find((enemy) => enemy.type === 'sniper') || game.spawnEnemy('sniper', 0, { point: { x: game.player.x + 360, y: game.player.y } });
    sniper.spawnTime = 0;
    sniper.shotDirection = { x: -1, y: 0 };
    sniper.shotTelegraph = 0.28;
    game.draw();
  });
  await attachFrame(page, testInfo, 'smooth-wave-10-sniper-telegraph');

  await seedWave(page, 35);
  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    const charger = game.enemies.find((enemy) => enemy.type === 'charger') || game.spawnEnemy('charger', 1, { point: { x: game.player.x - 300, y: game.player.y } });
    charger.spawnTime = 0;
    charger.chargeDirection = { x: 1, y: 0 };
    charger.chargeTelegraph = 0.34;
    game.draw();
  });
  await attachFrame(page, testInfo, 'smooth-wave-35-charger-telegraph');

  await seedWave(page, 67);
  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.player.health = Math.max(1, Math.floor(game.player.maxHealth / 3));
    for (let index = 0; index < Math.min(8, game.enemies.length); index += 1) {
      const enemy = game.enemies[index];
      const dx = game.player.x - enemy.x;
      const dy = game.player.y - enemy.y;
      const length = Math.hypot(dx, dy) || 1;
      game.fireEnemyShot(enemy, { x: dx / length, y: dy / length }, 300);
    }
    game.domUi.sync(true);
    game.draw();
  });
  await attachFrame(page, testInfo, 'smooth-wave-67-dense-low-health');

  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.enemyShots = [];
    game.pointer.x = 1020;
    game.pointer.y = 350;
    game.resetBulletToPlayer();
    game.fireBullet();
    game.updateBullet(0.06);
    game.draw();
  });
  await attachFrame(page, testInfo, 'smooth-bullet-flight');

  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.bullet.recallCooldown = 0;
    game.recallBullet();
    game.updateBullet(0.08);
    game.draw();
  });
  await attachFrame(page, testInfo, 'smooth-bullet-recall');

  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.keys.add('d');
    game.dashRequested = true;
    game.tryDash();
    game.keys.delete('d');
    game.draw();
  });
  await attachFrame(page, testInfo, 'smooth-dash');

  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.banner = { title: 'wave', subtitle: '', time: 1.2 };
    game.lastBannerSignature = '';
    game.draw();
  });
  await page.waitForTimeout(120);
  await attachFrame(page, testInfo, 'smooth-wave-banner', 'allow');

  await page.evaluate(() => window.__ONE_BULLET_ARENA__.pause());
  await attachFrame(page, testInfo, 'smooth-pause');

  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.resume();
    game.wave = 5;
    game.enemies = [];
    game.resetBulletToPlayer();
    game.waveClearTimer = 1;
    game.update(1);
    game.draw();
  });
  await attachFrame(page, testInfo, 'smooth-upgrade-selection');

  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.setState('gameover');
    game.draw();
  });
  await attachFrame(page, testInfo, 'smooth-game-over');
});
