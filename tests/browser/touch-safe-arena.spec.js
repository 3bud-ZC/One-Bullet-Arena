import { expect, test } from '@playwright/test';

async function loadGame(page) {
  await page.goto('/?qa=1');
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__));
}

test('touch controls reserve clear combat space in the fully opened arena', async ({ page }) => {
  await loadGame(page);
  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.touchMode = true;
    game.wave = 8;
    game.spawnNextWave();
    const zones = game.getSnapshot().touchSafeZones;

    game.player.x = zones[0].x;
    game.player.y = zones[0].y;
    game.updatePlayer(0);

    game.enemies = zones.map((zone, index) => ({
      id: 9000 + index,
      type: 'scout',
      x: zone.x,
      y: zone.y,
      radius: 17,
      speed: 0,
      health: 1,
      maxHealth: 1,
      score: 0,
      color: '#ff5f78',
      attackCooldown: 99,
      chargeTelegraph: 0,
      chargeRemaining: 0,
      chargeDirection: { x: 0, y: 0 },
      phase: 0,
      spawnTime: 0,
      hitFlash: 0,
      slowTimer: 0,
      mini: false,
    }));
    game.updateEnemies(0);

    const clear = (entity, zone) => Math.hypot(entity.x - zone.x, entity.y - zone.y) >= zone.radius + entity.radius - 0.01;
    return {
      playerClear: zones.every((zone) => clear(game.player, zone)),
      enemiesClear: game.enemies.every((enemy) => zones.every((zone) => clear(enemy, zone))),
      zones: zones.length,
    };
  });

  expect(result.zones).toBe(4);
  expect(result.playerClear).toBe(true);
  expect(result.enemiesClear).toBe(true);
});
