import { test, expect } from '@playwright/test';

const physicalDirections = [
  { code: 'KeyW', key: 'ص', axis: 'y', sign: -1 },
  { code: 'KeyA', key: 'ش', axis: 'x', sign: -1 },
  { code: 'KeyS', key: 'س', axis: 'y', sign: 1 },
  { code: 'KeyD', key: 'ي', axis: 'x', sign: 1 },
];

test('physical WASD moves the player even when keyboard characters are Arabic', async ({ page }) => {
  await page.goto('/?qa=1');
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__));
  await page.evaluate(() => window.__ONE_BULLET_ARENA__.startRun());

  for (const direction of physicalDirections) {
    const before = await page.evaluate(() => {
      const game = window.__ONE_BULLET_ARENA__;
      game.player.x = 640;
      game.player.y = 360;
      game.constrainCombatCircle(game.player);
      return { x: game.player.x, y: game.player.y };
    });

    await page.evaluate(({ code, key }) => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code, key, bubbles: true }));
    }, direction);
    await page.waitForTimeout(180);
    await page.evaluate(({ code, key }) => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code, key, bubbles: true }));
    }, direction);

    const after = await page.evaluate(() => {
      const { x, y } = window.__ONE_BULLET_ARENA__.player;
      return { x, y };
    });

    const delta = after[direction.axis] - before[direction.axis];
    expect(delta * direction.sign).toBeGreaterThan(8);
  }
});
