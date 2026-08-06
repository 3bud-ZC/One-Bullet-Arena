import { expect, test } from '@playwright/test';

async function loadGame(page) {
  await page.goto('/?qa=1');
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__));
  await page.locator('#game-canvas').waitFor({ state: 'visible' });
}

async function attachCanvas(page, testInfo, name) {
  const image = await page.locator('#game-canvas').screenshot({ animations: 'disabled' });
  await testInfo.attach(`${testInfo.project.name}-${name}`, {
    body: image,
    contentType: 'image/png',
  });
}

test('captures the v2.8.0-b event foundation, combat, upgrades, and game over', async ({ page }, testInfo) => {
  await loadGame(page);

  const menuSnapshot = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(menuSnapshot.version).toBe('2.7.0-feedback');
  expect(menuSnapshot.releaseVersion).toBe('2.8.0-b');
  expect(menuSnapshot.releaseChannel).toBe('runtime-event-foundation');
  expect(menuSnapshot.releaseCacheName).toBe('one-bullet-arena-v2.8.0-b');
  expect(menuSnapshot.releaseSchemaVersion).toBe(1);
  expect(menuSnapshot.eventFoundationVersion).toBe('2.8.0-b');
  expect(menuSnapshot.eventSchemaVersion).toBe(1);
  expect(menuSnapshot.gameEventBusActive).toBe(true);
  expect(menuSnapshot.recentGameEvents.at(-1)?.type).toBe('runtime.ready');
  expect(menuSnapshot.combatFeedback).toBe('2.7.0-feedback');
  expect(menuSnapshot.uiLayoutVersion).toBe('2.8.0-b');
  expect(menuSnapshot.hudLayoutRevision).toBe('compact-safe-zone-hud');
  expect(menuSnapshot.hudPanelHeight).toBe(62);
  expect(menuSnapshot.hudSafeBottom).toBe(80);
  expect(menuSnapshot.reducedHudGlow).toBe(true);
  expect(menuSnapshot.bidiSafeHudStats).toBe(true);
  expect(menuSnapshot.releaseLabelCorrected).toBe(true);
  expect(menuSnapshot.interfaceLanguageMode).toBe('arabic-menu-english-technical-hud');
  expect(menuSnapshot.visualTheme).toBe('neon-tactical-arena');
  expect(menuSnapshot.redesignedMenu).toBe(true);
  await attachCanvas(page, testInfo, 'event-foundation-menu');

  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.banner = null;
    game.tutorialStep = 1;
    game.pointer.x = 930;
    game.pointer.y = 360;
    game.draw();
  });

  const combatSnapshot = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(combatSnapshot.redesignedHud).toBe(true);
  expect(combatSnapshot.visualEnemyReadability).toBe(true);
  expect(combatSnapshot.comboMomentumHud).toBe(true);
  expect(combatSnapshot.tutorialLayoutRevision).toBe('single-step-context-strip');
  expect(combatSnapshot.recentGameEvents.some((event) => event.type === 'run.started')).toBe(true);
  expect(combatSnapshot.recentGameEvents.some((event) => event.type === 'wave.started')).toBe(true);
  await attachCanvas(page, testInfo, 'event-foundation-combat-hud');

  const feedbackSnapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.enemies = [];
    const enemy = game.spawnEnemy('brute', 0, { point: { x: 790, y: 380 } });
    enemy.spawnTime = 0;
    game.bullet.vx = 900;
    game.bullet.vy = -80;
    game.combo = 4;
    game.comboTimer = 2.15;
    game.damageEnemy(enemy, 99, true);
    game.draw();
    return game.getSnapshot();
  });
  expect(feedbackSnapshot.feedbackEventCount).toBeGreaterThan(0);
  expect(feedbackSnapshot.feedbackCalloutActive).toBe(true);
  expect(feedbackSnapshot.recentGameEvents.some((event) => event.type === 'enemy.killed')).toBe(true);
  await attachCanvas(page, testInfo, 'impact-feedback');

  const upgradeSnapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.feedbackEvents = [];
    game.feedbackCallout = null;
    game.enemies = [];
    game.resetBulletToPlayer();
    game.waveClearTimer = 0.95;
    game.update(1);
    game.draw();
    return game.getSnapshot();
  });
  expect(upgradeSnapshot.state).toBe('upgrade');
  expect(upgradeSnapshot.upgradeChoices).toHaveLength(3);
  expect(upgradeSnapshot.redesignedUpgradeCards).toBe(true);
  expect(upgradeSnapshot.recentGameEvents.some((event) => event.type === 'wave.cleared')).toBe(true);
  expect(upgradeSnapshot.recentGameEvents.some((event) => event.type === 'upgrade.offered')).toBe(true);
  await attachCanvas(page, testInfo, 'upgrade-cards');

  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.state = 'gameover';
    game.wave = 9;
    game.score = 15420;
    game.runTime = 136;
    game.stats.kills = 47;
    game.stats.shots = 31;
    game.stats.hits = 25;
    game.stats.upgrades = 8;
    game.stats.damageTaken = 3;
    game.maxCombo = 11;
    game.draw();
  });
  await attachCanvas(page, testInfo, 'game-over');
});
