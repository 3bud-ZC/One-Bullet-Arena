import { expect, test } from '@playwright/test';

async function loadGame(page) {
  await page.goto('/?qa=1');
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__));
}

test('touch controls reserve clear rectangular combat zones', async ({ page }) => {
  await loadGame(page);
  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.touchMode = true;
    game.wave = 8;
    game.startNextWave();
    const zones = game.getSnapshot().touchSafeZones;
    const overlaps = (entity, zone) => entity.x + entity.radius >= zone.x
      && entity.x - entity.radius <= zone.x + zone.w
      && entity.y + entity.radius >= zone.y
      && entity.y - entity.radius <= zone.y + zone.h;

    for (const zone of zones) {
      game.player.x = zone.x + zone.w / 2;
      game.player.y = zone.y + zone.h / 2;
      game.constrainCombatCircle(game.player);
    }

    game.enemies = zones.map((zone, index) => ({
      id: 9000 + index, type: 'scout', x: zone.x + zone.w / 2, y: zone.y + zone.h / 2,
      radius: 17, speed: 0, health: 1, maxHealth: 1, score: 0, color: '#ff5f78',
      attackCooldown: 99, shotTelegraph: 0, chargeTelegraph: 0, chargeRemaining: 0,
      chargeDirection: { x: 0, y: 0 }, phase: 0, spawnTime: 0, hitFlash: 0, mini: false,
    }));
    game.updateEnemies(0);

    return {
      zones: zones.length,
      playerClear: zones.every((zone) => !overlaps(game.player, zone)),
      enemiesClear: game.enemies.every((enemy) => zones.every((zone) => !overlaps(enemy, zone))),
    };
  });
  expect(result).toEqual({ zones: 4, playerClear: true, enemiesClear: true });
});
