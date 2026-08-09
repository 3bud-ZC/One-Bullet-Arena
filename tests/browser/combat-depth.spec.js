import { expect, test } from '@playwright/test';

async function loadGame(page) {
  await page.goto('/?qa=1');
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__));
  await page.locator('#game-canvas').waitFor({ state: 'visible' });
}

test('boots the combat depth runtime and exposes skill diagnostics', async ({ page }) => {
  await loadGame(page);
  const snapshot = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(snapshot.releaseVersion).toBe('3.5.0-production-art');
  expect(snapshot.productionArtActive).toBe(true);
  expect(snapshot.combatDepthVersion).toBe('2.9.0-combat');
  expect(snapshot.combatDepthActive).toBe(true);
  expect(snapshot.perfectCatchEnabled).toBe(true);
  expect(snapshot.bankShotDamageEnabled).toBe(true);
  expect(snapshot.momentumOverdriveEnabled).toBe(true);
  expect(snapshot.eventSchemaVersion).toBe(4);
  expect(snapshot.checkpointProgressionActive).toBe(true);
  expect(snapshot.wardenEnemyActive).toBe(true);
  expect(snapshot.true2DArenaActive).toBe(true);
  expect(snapshot.visualOverhaulActive).toBe(true);
  expect(snapshot.expandingWorldActive).toBe(true);
});

test('a skilled returning catch grants a precision shot and momentum', async ({ page }) => {
  await loadGame(page);
  const snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.recallStartedAt = game.runTime - 0.65;
    game.recallStartDistance = 340;
    game.catchAlignmentPeak = 0.88;
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
    return game.getSnapshot();
  });

  expect(snapshot.precisionCharge).toBe(1);
  expect(snapshot.perfectCatches).toBe(1);
  expect(snapshot.momentum).toBeGreaterThanOrEqual(34);
  expect(snapshot.recentGameEvents.some((event) => event.type === 'skill.perfect-catch')).toBe(true);
});

test('precision and bank-shot states amplify one bullet without changing the core loop', async ({ page }) => {
  await loadGame(page);
  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.precisionCharge = 1;
    game.pointer.x = game.player.x + 400;
    game.pointer.y = game.player.y;
    const fired = game.fireBullet();
    game.onRicochet();
    game.onRicochet();
    game.enemies = [];
    const enemy = game.spawnEnemy('brute', 0, { point: { x: 780, y: 360 } });
    enemy.spawnTime = 0;
    game.damageEnemy(enemy, 999, true);
    return { fired, snapshot: game.getSnapshot() };
  });

  expect(result.fired).toBe(true);
  expect(result.snapshot.precisionShotActive).toBe(true);
  expect(result.snapshot.bankLevel).toBe(2);
  expect(result.snapshot.precisionKills).toBe(1);
  expect(result.snapshot.bankKills).toBe(1);
  expect(result.snapshot.recentGameEvents.some((event) => event.type === 'skill.precision-shot-fired')).toBe(true);
  expect(result.snapshot.recentGameEvents.some((event) => event.type === 'skill.bank-chained')).toBe(true);
});

test('full momentum activates bounded overdrive with temporary runtime bonuses', async ({ page }) => {
  await loadGame(page);
  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    const baseRecall = game.stack('magnetic-recall');
    const baseDash = game.stack('quick-dash');
    game.momentum = 96;
    game.addMomentum(10);
    return {
      snapshot: game.getSnapshot(),
      baseRecall,
      activeRecall: game.stack('magnetic-recall'),
      baseDash,
      activeDash: game.stack('quick-dash'),
    };
  });

  expect(result.snapshot.overdriveActive).toBe(true);
  expect(result.snapshot.overdriveTimer).toBeGreaterThan(6);
  expect(result.snapshot.precisionCharge).toBe(1);
  expect(result.snapshot.overdrives).toBe(1);
  expect(result.activeRecall).toBe(result.baseRecall + 2);
  expect(result.activeDash).toBe(result.baseDash + 1);
  expect(result.snapshot.recentGameEvents.some((event) => event.type === 'skill.overdrive-started')).toBe(true);
});
