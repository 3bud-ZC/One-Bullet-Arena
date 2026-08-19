import { expect, test } from '@playwright/test';

async function loadGame(page) {
  await page.goto('/?qa=1');
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__));
  await page.locator('#game-canvas').waitFor({ state: 'visible' });
}

test('wave directives mark priority targets and reward killing them', async ({ page }) => {
  await loadGame(page);
  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    while (game.wave < 5) game.startNextWave();
    const target = game.enemies.find((enemy) => enemy.priorityTarget);
    const beforeScore = game.score;
    game.damageEnemy(target, 999, true);
    return {
      targetType: target?.type,
      scoreDelta: game.score - beforeScore,
      snapshot: game.getSnapshot(),
    };
  });

  expect(result.targetType).toBeTruthy();
  expect(result.scoreDelta).toBeGreaterThan(300);
  expect(result.snapshot.waveDirective.id).toBe('priority');
  expect(result.snapshot.waveDirective.completed).toBe(true);
  expect(result.snapshot.waveDirective.bonuses).toBe(1);
});

test('ability synergies affect real combat snapshot and dash recovery', async ({ page }) => {
  await loadGame(page);
  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.upgradeStacks = {
      'extended-ricochet': 1,
      'hot-ricochet': 1,
      'magnetic-recall': 1,
      'quick-dash': 1,
      'kinetic-catch': 1,
      'shock-impact': 1,
    };
    game.bankLevel = 2;
    game.bullet.bounceCount = 2;
    const damage = game.currentBulletDamage();
    game.player.dashCooldown = 0.8;
    game.recallStartedAt = game.runTime - 0.5;
    game.recallStartDistance = 420;
    game.catchAlignmentPeak = 0.9;
    Object.assign(game.bullet, { held: false, recalling: true, x: game.player.x + 4, y: game.player.y, vx: -720, vy: 0, recoverDelay: 0 });
    game.catchBullet();
    return {
      damage,
      dashCooldown: game.player.dashCooldown,
      snapshot: game.getSnapshot(),
    };
  });

  expect(result.damage).toBeGreaterThan(1.1);
  expect(result.dashCooldown).toBeLessThan(0.8);
  expect(result.snapshot.activeSynergies.map((synergy) => synergy.id)).toEqual([
    'bank-forge',
    'return-relay',
    'kinetic-field',
    'shock-carom',
  ]);
});
