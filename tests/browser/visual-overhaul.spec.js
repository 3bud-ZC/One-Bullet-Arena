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

test('visual overhaul remains active inside the expanding world across major states', async ({ page }, testInfo) => {
  test.setTimeout(75000);
  await loadGame(page);

  let snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.draw();
    return game.getSnapshot();
  });
  expect(snapshot.visualOverhaulActive).toBe(true);
  expect(snapshot.visualOverhaulRuntimeVersion).toBe('3.3.0-visual-overhaul');
  expect(snapshot.arenaArtPolishVersion).toBe('3.15.0-arena-polish');
  expect(snapshot.visualOverhaulStyle).toBe('cinematic-industrial-2d');
  expect(snapshot.cinematicCombatArtActive).toBe(true);
  expect(snapshot.cinematicCombatArtVersion).toBe('3.15.0-cinematic-combat-art');
  expect(snapshot.replacesGeometricCombatShapes).toBe(true);
  expect(snapshot.animatedCombatEffects).toBe(true);
  expect(snapshot.combatArtRenderOnly).toBe(true);
  expect(snapshot.combatArtGameplayGeometryChanged).toBe(false);
  expect(snapshot.combatArtCollisionGeometryChanged).toBe(false);
  expect(snapshot.cinematicArenaArtActive).toBe(true);
  expect(snapshot.sectorAtmosphereActive).toBe(true);
  expect(snapshot.obstacleDressingActive).toBe(true);
  expect(snapshot.animatedMapMaterials).toBe(true);
  expect(snapshot.mapGeometryChanged).toBe(false);
  expect(snapshot.mapCollisionGeometryChanged).toBe(false);
  expect(snapshot.cinematicCombatArt.groundedEntityShadows).toBe(true);
  expect(snapshot.cinematicCombatArt.creatureDetailPass).toBe(true);
  expect(snapshot.expandingWorldActive).toBe(true);
  expect(snapshot.gameplayGeometryChanged).toBe(true);
  expect(snapshot.collisionGeometryChanged).toBe(true);
  await attachCanvas(page, testInfo, 'visual-overhaul-menu');

  snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.startRun();
    game.banner = null;
    game.player.x = 520;
    game.player.y = 400;
    game.pointer.x = 940;
    game.pointer.y = 312;
    game.enemies = [];
    game.enemyShots = [];
    const scout = game.spawnEnemy('scout', 0, { point: { x: 850, y: 272 } });
    const sniper = game.spawnEnemy('sniper', 1, { point: { x: 928, y: 470 } });
    const charger = game.spawnEnemy('charger', 2, { point: { x: 360, y: 280 } });
    scout.spawnTime = 0;
    sniper.spawnTime = 0;
    charger.spawnTime = 0;
    game.visualMotion = 0.84;
    game.visualDirection = { x: 0.92, y: -0.18 };
    game.update = () => {};
    game.draw();
    return game.getSnapshot();
  });
  expect(snapshot.state).toBe('playing');
  expect(snapshot.enemyReadabilityPass).toBe(true);
  expect(snapshot.enhancedArenaDepth).toBe(true);
  expect(snapshot.enhancedHudChrome).toBe(true);
  expect(snapshot.unifiedCombatHud).toBe(true);
  expect(snapshot.silhouetteDrivenEnemies).toBe(true);
  await attachCanvas(page, testInfo, 'visual-overhaul-combat');

  snapshot = await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.update = () => {};
    Object.assign(game.bullet, {
      held: false,
      recalling: true,
      x: 940,
      y: 300,
      vx: -520,
      vy: 180,
      recoverDelay: 0,
    });
    game.player.x = 490;
    game.player.y = 430;
    game.draw();
    return game.getSnapshot();
  });
  expect(snapshot.bulletHeld).toBe(false);
  expect(snapshot.bulletRecallTether).toBe(true);
  await attachCanvas(page, testInfo, 'visual-overhaul-recall');

  await page.evaluate(() => {
    const game = window.__ONE_BULLET_ARENA__;
    game.update = () => {};
    game.enemies = [];
    game.openUpgradeSelection();
    game.draw();
  });
  await page.waitForFunction(() => window.__ONE_BULLET_ARENA__.state === 'upgrade');
  await attachCanvas(page, testInfo, 'visual-overhaul-upgrade');
});
