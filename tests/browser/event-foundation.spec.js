import { expect, test } from '@playwright/test';

async function loadGame(page) {
  await page.goto('/?qa=1');
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__));
  await page.locator('#game-canvas').waitFor({ state: 'visible' });
}

test('run, state, spawn, and wave events are ordered and observable', async ({ page }) => {
  await loadGame(page);

  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    const observed = [];
    const unsubscribe = game.onGameEvent('wave.started', (event) => observed.push(event));
    game.startRun();
    unsubscribe();
    return {
      snapshot: game.getSnapshot(),
      history: game.getGameEventHistory(32),
      observed,
    };
  });

  expect(result.snapshot.state).toBe('playing');
  expect(result.snapshot.wave).toBe(1);
  expect(result.snapshot.gameEventBusActive).toBe(true);
  expect(result.snapshot.gameEventListenerCount).toBe(0);
  expect(result.observed).toHaveLength(1);
  expect(result.observed[0].type).toBe('wave.started');

  const types = result.history.map((event) => event.type);
  expect(types[0]).toBe('run.started');
  expect(types).toContain('state.changed');
  expect(types).toContain('enemy.spawned');
  expect(types.at(-1)).toBe('wave.started');
  expect(result.history.map((event) => event.sequence)).toEqual(
    [...result.history].map((event) => event.sequence).sort((a, b) => a - b),
  );
});

test('bullet, ricochet, recall, catch, and dash emit diagnostics without changing gameplay', async ({ page }) => {
  await loadGame(page);

  const history = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.pointer.x = game.player.x + 300;
    game.pointer.y = game.player.y;
    game.fireBullet();
    game.onRicochet();
    game.bullet.recallCooldown = 0;
    game.recallBullet();
    game.catchBullet();
    game.keys.add('d');
    game.dashRequested = true;
    game.tryDash();
    game.keys.delete('d');
    return game.getGameEventHistory(32);
  });

  const types = history.map((event) => event.type);
  expect(types).toContain('bullet.fired');
  expect(types).toContain('bullet.ricocheted');
  expect(types).toContain('bullet.recall-started');
  expect(types).toContain('bullet.caught');
  expect(types).toContain('player.dashed');
});

test('wave clear and upgrade choice emit once before the next wave continues', async ({ page }) => {
  await loadGame(page);

  const result = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.wave = 6;
    game.enemies = [];
    game.resetBulletToPlayer();
    game.waveClearTimer = 0.95;
    game.update(1);
    const offered = game.getGameEventHistory(32);
    const selectedId = game.upgradeChoices[0].id;
    game.chooseUpgrade(0);
    return {
      offered,
      selectedId,
      finalHistory: game.getGameEventHistory(48),
      snapshot: game.getSnapshot(),
    };
  });

  expect(result.offered.filter((event) => event.type === 'wave.cleared')).toHaveLength(1);
  expect(result.offered.filter((event) => event.type === 'upgrade.offered')).toHaveLength(1);
  const selected = result.finalHistory.find((event) => event.type === 'upgrade.selected');
  expect(selected?.payload.upgradeId).toBe(result.selectedId);
  expect(result.snapshot.wave).toBe(7);
  expect(result.snapshot.upgrades).toBe(1);
  expect(result.finalHistory.filter((event) => event.type === 'wave.started')).toHaveLength(2);
});

test('listener exceptions remain isolated from combat execution', async ({ page }) => {
  await loadGame(page);

  const snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.onGameEvent('bullet.fired', () => { throw new Error('intentional listener failure'); });
    game.startRun();
    game.pointer.x = game.player.x + 200;
    game.pointer.y = game.player.y;
    const fired = game.fireBullet();
    return { fired, snapshot: game.getSnapshot() };
  });

  expect(snapshot.fired).toBe(true);
  expect(snapshot.snapshot.bulletHeld).toBe(false);
  expect(snapshot.snapshot.recentGameEvents.some((event) => event.type === 'bullet.fired')).toBe(true);
});
