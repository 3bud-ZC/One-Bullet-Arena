import { expect, test } from '@playwright/test';

const directions = [
  { key: 'w', axis: 'y', sign: -1 },
  { key: 'a', axis: 'x', sign: -1 },
  { key: 's', axis: 'y', sign: 1 },
  { key: 'd', axis: 'x', sign: 1 },
];

test('physical WASD is layout-independent and moves the player in every browser', async ({ page }) => {
  await page.goto('/?qa=1');
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__));

  const normalized = await page.evaluate(async () => {
    const { normalizeKeyboardInput } = await import('/src/input-controller.js');
    return [
      normalizeKeyboardInput({ code: 'KeyW', key: 'ص' }),
      normalizeKeyboardInput({ code: 'KeyA', key: 'ش' }),
      normalizeKeyboardInput({ code: 'KeyS', key: 'س' }),
      normalizeKeyboardInput({ code: 'KeyD', key: 'ي' }),
    ];
  });
  expect(normalized).toEqual(['w', 'a', 's', 'd']);

  await page.evaluate(() => window.__ONE_BULLET_ARENA__.startRun());

  for (const direction of directions) {
    const before = await page.evaluate(() => {
      const game = window.__ONE_BULLET_ARENA__;
      game.keys.clear();
      game.player.x = 640;
      game.player.y = 360;
      game.constrainCombatCircle(game.player);
      return { x: game.player.x, y: game.player.y };
    });

    await page.keyboard.down(direction.key);
    await page.waitForTimeout(180);
    await page.keyboard.up(direction.key);

    const after = await page.evaluate(() => {
      const { x, y } = window.__ONE_BULLET_ARENA__.player;
      return { x, y };
    });

    const delta = after[direction.axis] - before[direction.axis];
    expect(delta * direction.sign).toBeGreaterThan(8);
  }
});
