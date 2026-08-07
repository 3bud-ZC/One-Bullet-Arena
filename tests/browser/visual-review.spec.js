import { expect, test } from '@playwright/test';
import { RELEASE_INFO, RELEASE_VERSION } from '../../src/release.js';

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

test('captures the canonical release and existing combat states', async ({ page }, testInfo) => {
  test.setTimeout(60000);
  await loadGame(page);

  const menuSnapshot = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(menuSnapshot.version).toBe('2.7.0-feedback');
  expect(menuSnapshot.releaseVersion).toBe(RELEASE_VERSION);
  expect(menuSnapshot.releaseChannel).toBe(RELEASE_INFO.channel);
  expect(menuSnapshot.releaseCacheName).toBe(RELEASE_INFO.cacheName);
  expect(menuSnapshot.releaseSchemaVersion).toBe(RELEASE_INFO.schemaVersion);
  expect(menuSnapshot.eventFoundationVersion).toBe(RELEASE_VERSION);
  expect(menuSnapshot.eventSchemaVersion).toBe(4);
  expect(menuSnapshot.gameEventBusActive).toBe(true);
  expect(menuSnapshot.combatDepthActive).toBe(true);
  expect(menuSnapshot.combatDepthVersion).toBe('2.9.0-combat');
  expect(menuSnapshot.checkpointProgressionActive).toBe(true);
  expect(menuSnapshot.checkpointRuntimeVersion).toBe('3.0.0-checkpoint');
  expect(menuSnapshot.wardenEnemyActive).toBe(true);
  expect(menuSnapshot.wardenRuntimeVersion).toBe('3.1.0-a-warden');
  expect(menuSnapshot.true2DArenaActive).toBe(true);
  expect(menuSnapshot.world2DRuntimeVersion).toBe('3.2.0-true-2d');
  expect(menuSnapshot.world2DStyle).toBe('layered-top-down-2d');
  expect(menuSnapshot.visualOverhaulActive).toBe(true);
  expect(menuSnapshot.visualOverhaulRuntimeVersion).toBe('3.3.0-visual-overhaul');
  expect(menuSnapshot.visualOverhaulStyle).toBe('cinematic-industrial-2d');
  expect(menuSnapshot.combatJuiceActive).toBe(true);
  expect(menuSnapshot.combatJuiceRuntimeVersion).toBe('3.4.0-combat-juice');
  expect(menuSnapshot.combatJuiceStyle).toBe('impact-directed-cinematic-feedback');
  expect(menuSnapshot.stableHudDuringShake).toBe(true);
  expect(menuSnapshot.gameplayGeometryChanged).toBe(false);
  expect(menuSnapshot.collisionGeometryChanged).toBe(false);
  expect(menuSnapshot.gameplayBalanceChangedByCombatJuice).toBe(false);
  expect(menuSnapshot.collisionGeometryChangedByCombatJuice).toBe(false);
  expect(menuSnapshot.recentGameEvents.at(-1)?.type).toBe('runtime.ready');
  expect(menuSnapshot.combatFeedback).toBe('2.7.0-feedback');
  expect(menuSnapshot.uiLayoutVersion).toBe(RELEASE_VERSION);
  expect(menuSnapshot.visualTheme).toBe('neon-tactical-arena');
  expect(menuSnapshot.redesignedMenu).toBe(true);
  await attachCanvas(page, testInfo, 'canonical-release-menu');

  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.banner = null;
    game.tutorialStep = 3;
    game.pointer.x = 930;
    game.pointer.y = 360;
    game.momentum = 46;
    game.combo = 4;
    game.comboTimer = 2.4;
    game.draw();
  });
  await attachCanvas(page, testInfo, 'visual-overhaul-combat-hud');

  const catchSnapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.recallStartedAt = game.runTime - 0.7;
    game.recallStartDistance = 350;
    game.catchAlignmentPeak = 0.9;
    Object.assign(game.bullet, {
      held: false,
      recalling: true,
      x: game.player.x + 6,
      y: game.player.y,
      vx: -720,
      vy: 0,
      recoverDelay: 0,
    });
    game.catchBullet();
    game.draw();
    return game.getSnapshot();
  });
  expect(catchSnapshot.precisionCharge).toBe(1);
  expect(catchSnapshot.perfectCatches).toBe(1);
  await attachCanvas(page, testInfo, 'perfect-catch-precision-ready');

  const overdriveSnapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.momentum = 98;
    game.addMomentum(10);
    game.draw();
    return game.getSnapshot();
  });
  expect(overdriveSnapshot.overdriveActive).toBe(true);
  expect(overdriveSnapshot.overdrives).toBe(1);
  await attachCanvas(page, testInfo, 'overdrive-active');

  const feedbackSnapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.overdriveTimer = 0;
    game.momentum = 0;
    game.precisionCharge = 1;
    game.pointer.x = 960;
    game.pointer.y = 360;
    game.fireBullet();
    game.onRicochet();
    game.onRicochet();
    game.enemies = [];
    const enemy = game.spawnEnemy('brute', 0, { point: { x: 790, y: 380 } });
    const survivor = game.spawnEnemy('scout', 1, { point: { x: 1020, y: 540 } });
    enemy.spawnTime = 0;
    survivor.spawnTime = 0;
    survivor.health = 999;
    survivor.maxHealth = 999;
    game.damageEnemy(enemy, 99, true);
    game.draw();
    return game.getSnapshot();
  });
  expect(feedbackSnapshot.feedbackEventCount).toBeGreaterThan(0);
  expect(feedbackSnapshot.feedbackCalloutActive).toBe(true);
  expect(feedbackSnapshot.precisionKills).toBe(1);
  expect(feedbackSnapshot.bankKills).toBe(1);
  expect(feedbackSnapshot.enemies).toBe(1);
  await attachCanvas(page, testInfo, 'precision-bank-impact');

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
