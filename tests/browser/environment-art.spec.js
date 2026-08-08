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

async function setWaveStage(page, wave) {
  return page.evaluate((targetWave) => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.enemies = [];
    game.enemyShots = [];
    game.wave = targetWave - 1;
    game.startNextWave();
    game.enemies = [];
    game.enemyShots = [];
    game.banner = null;
    game.tutorialStep = 3;
    game.update = () => {};
    game.draw();
    return game.getSnapshot();
  }, wave);
}

test('environment art runtime is active above graphics refinement', async ({ page }, testInfo) => {
  await loadGame(page);
  const snapshot = await page.evaluate(() => window.__ONE_BULLET_ARENA__.getSnapshot());
  expect(snapshot.environmentArtActive).toBe(true);
  expect(snapshot.environmentArtRuntimeVersion).toBe('3.5.0-environment-art');
  expect(snapshot.environmentArtStyle).toBe('modular-industrial-deck-v1');
  expect(snapshot.graphicsRefinementActive).toBe(true);
  expect(snapshot.stageLandmarksActive).toBe(true);
  expect(snapshot.floorModuleDetailActive).toBe(true);
  expect(snapshot.lockedMachineryActive).toBe(true);
  expect(snapshot.perimeterRailDetailActive).toBe(true);
  expect(snapshot.gameplayGeometryChanged).toBe(false);
  expect(snapshot.collisionGeometryChanged).toBe(false);
  await attachCanvas(page, testInfo, 'environment-menu');
});

test('all four arena stages receive distinct environmental landmarks', async ({ page }, testInfo) => {
  await loadGame(page);
  const expected = [
    { wave: 1, stage: 0, name: 'core-reactor-deck' },
    { wave: 3, stage: 1, name: 'wing-relay-network' },
    { wave: 6, stage: 2, name: 'corridor-grid' },
    { wave: 9, stage: 3, name: 'full-arena-open' },
  ];

  for (const item of expected) {
    const snapshot = await setWaveStage(page, item.wave);
    expect(snapshot.wave).toBe(item.wave);
    expect(snapshot.arenaStage).toBe(item.stage);
    expect(snapshot.environmentArtActive).toBe(true);
    await attachCanvas(page, testInfo, `environment-${item.name}`);
  }
});

test('environment detail remains readable under active combat', async ({ page }, testInfo) => {
  await loadGame(page);
  const snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.wave = 8;
    game.startNextWave();
    game.enemies = [];
    game.enemyShots = [];
    game.banner = null;
    game.tutorialStep = 3;
    game.player.x = 430;
    game.player.y = 390;
    game.pointer.x = 1030;
    game.pointer.y = 350;
    const types = ['scout', 'brute', 'sniper', 'charger', 'splitter', 'warden'];
    const points = [
      { x: 700, y: 215 }, { x: 850, y: 230 }, { x: 1010, y: 255 },
      { x: 730, y: 500 }, { x: 900, y: 500 }, { x: 1060, y: 450 },
    ];
    types.forEach((type, index) => {
      const enemy = game.spawnEnemy(type, index, { point: points[index] });
      enemy.spawnTime = 0;
    });
    Object.assign(game.bullet, {
      held: false,
      recalling: true,
      x: 620,
      y: 385,
      vx: 0,
      vy: 0,
      trail: [
        { x: 620, y: 385 }, { x: 660, y: 360 }, { x: 705, y: 345 }, { x: 750, y: 338 },
      ],
    });
    game.enemyShots.push({ x: 980, y: 375, vx: -480, vy: 40, radius: 6 });
    game.update = () => {};
    game.draw();
    return game.getSnapshot();
  });
  expect(snapshot.arenaStage).toBe(3);
  expect(snapshot.environmentArtActive).toBe(true);
  expect(snapshot.wardenCount).toBe(1);
  await attachCanvas(page, testInfo, 'environment-combat-density');
});
