import { expect, test } from '@playwright/test';

async function loadGame(page) {
  await page.goto('/?qa=1');
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__));
  await page.locator('#game-canvas').waitFor({ state: 'visible' });
}

async function createWaveFiveCheckpoint(page) {
  return page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.clearCheckpoint();
    game.startRun();
    game.upgradeStacks = { vitality: 2, 'heavy-shot': 2, 'magnetic-recall': 1, 'quick-dash': 1 };
    game.stats = { shots: 22, hits: 18, kills: 31, upgrades: 6, damageTaken: 2 };
    game.score = 7650;
    game.runTime = 146.5;
    game.combo = 4;
    game.comboTimer = 1.4;
    game.maxCombo = 11;
    game.secondChanceUsed = true;
    game.player.maxHealth = 5;
    game.player.health = 3;
    game.player.shield = 1;
    game.momentum = 78;
    game.precisionCharge = 1;
    game.overdriveTimer = 2.25;
    Object.assign(game.combatDepthStats, { perfectCatches: 4, precisionKills: 3, bankKills: 5, overdrives: 2 });
    game.wave = 4;
    game.startNextWave();
    return game.getSnapshot();
  });
}

test('checkpoint runtime boots without changing the normal new-run path', async ({ page }) => {
  await loadGame(page);
  const menu = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(menu.releaseVersion).toBe('3.16.0-mobile-combat');
  expect(menu.globalUiActive).toBe(true);
  expect(menu.checkpointRuntimeVersion).toBe('3.0.0-checkpoint');
  expect(menu.checkpointSchemaVersion).toBe(1);
  expect(menu.checkpointProgressionActive).toBe(true);
  expect(menu.checkpointAvailable).toBe(false);
  expect(menu.checkpointWave).toBe(0);
  expect(menu.wardenEnemyActive).toBe(true);
  expect(menu.true2DArenaActive).toBe(true);
  expect(menu.visualOverhaulActive).toBe(true);
  expect(menu.expandingWorldActive).toBe(true);

  await page.keyboard.press('Enter');
  const run = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(run.state).toBe('playing');
  expect(run.wave).toBe(1);
  expect(run.checkpointAvailable).toBe(false);
  expect(run.restoredFromCheckpoint).toBe(false);
});

test('wave-start checkpoints preserve the highest reached wave', async ({ page }) => {
  await loadGame(page);
  const saved = await createWaveFiveCheckpoint(page);
  expect(saved.wave).toBe(5);
  expect(saved.checkpointAvailable).toBe(true);
  expect(saved.checkpointWave).toBe(5);
  expect(saved.checkpointScore).toBe(7650);
  expect(saved.checkpointUpgrades).toBe(6);
  expect(saved.recentGameEvents.some((event) => event.type === 'checkpoint.saved')).toBe(true);

  const afterNewRun = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    return game.getSnapshot();
  });
  expect(afterNewRun.wave).toBe(1);
  expect(afterNewRun.score).toBe(0);
  expect(afterNewRun.checkpointWave).toBe(5);
  expect(afterNewRun.checkpointScore).toBe(7650);
});

test('checkpoint survives reload and restores the saved build at wave start', async ({ page }) => {
  await loadGame(page);
  await createWaveFiveCheckpoint(page);
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__ONE_BULLET_ARENA__));
  const menu = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(menu.state).toBe('menu');
  expect(menu.checkpointAvailable).toBe(true);
  expect(menu.checkpointWave).toBe(5);

  await page.keyboard.press('KeyC');
  const restored = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    return { snapshot: game.getSnapshot(), stacks: { ...game.upgradeStacks }, stats: { ...game.stats }, momentum: game.momentum, precisionCharge: game.precisionCharge, overdriveTimer: game.overdriveTimer, history: game.getGameEventHistory(64) };
  });
  expect(restored.snapshot.state).toBe('playing');
  expect(restored.snapshot.wave).toBe(5);
  expect(restored.snapshot.score).toBe(7650);
  expect(restored.snapshot.health).toBe(3);
  expect(restored.snapshot.maxHealth).toBe(5);
  expect(restored.snapshot.restoredFromCheckpoint).toBe(true);
  expect(restored.stacks.vitality).toBe(2);
  expect(restored.stacks['heavy-shot']).toBe(2);
  expect(restored.stats.upgrades).toBe(6);
  expect(restored.momentum).toBe(78);
  expect(restored.precisionCharge).toBe(1);
  expect(restored.overdriveTimer).toBeGreaterThan(2);
  expect(restored.overdriveTimer).toBeLessThanOrEqual(2.25);
  expect(restored.history.some((event) => event.type === 'checkpoint.loaded')).toBe(true);
  expect(restored.snapshot.enemies).toBeGreaterThan(0);
});

test('game over offers continue and saved progress can be cleared', async ({ page }) => {
  await loadGame(page);
  await createWaveFiveCheckpoint(page);
  const gameOver = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.state = 'gameover';
    game.draw();
    return game.getSnapshot();
  });
  expect(gameOver.checkpointAvailable).toBe(true);
  expect(gameOver.checkpointWave).toBe(5);
  expect(gameOver.globalUiActive).toBe(true);

  await page.keyboard.press('Enter');
  const continued = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(continued.state).toBe('playing');
  expect(continued.wave).toBe(5);
  expect(continued.restoredFromCheckpoint).toBe(true);

  const cleared = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.goToMenu();
    game.clearCheckpoint();
    return { snapshot: game.getSnapshot(), history: game.getGameEventHistory(32), stored: localStorage.getItem('one-bullet-arena-checkpoint-v1') };
  });
  expect(cleared.snapshot.checkpointAvailable).toBe(false);
  expect(cleared.snapshot.checkpointWave).toBe(0);
  expect(cleared.stored).toBeNull();
  expect(cleared.history.some((event) => event.type === 'checkpoint.cleared')).toBe(true);
});
