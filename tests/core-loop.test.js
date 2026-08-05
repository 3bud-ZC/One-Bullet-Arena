import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  ENEMY_TYPES,
  GAME_VERSION,
  MAX_ACTIVE_ENEMIES,
  UPGRADES,
  buildWaveComposition,
  enemyCapsForWave,
  enemyCountForWave,
  enemyPoolForWave,
  enemyScaleForWave,
  normalizedStacks,
  pickUpgradeChoices,
  upgradePreview,
} from '../src/game-data.js';
import {
  ARENA_STAGE_COUNT,
  arenaStageForWave,
  circleRectOverlap,
  combatSafeZones,
  constrainCombatCircle,
  mobileSafeZones,
  resolveCircleAgainstRect,
} from '../src/arena.js';

test('release exposes the stable single-path version', () => {
  assert.equal(GAME_VERSION, '2.3.0-stable');
});

test('opening waves are readable and enemy roster unlocks gradually', () => {
  assert.deepEqual(buildWaveComposition(1), ['scout', 'scout', 'scout']);
  assert.ok(buildWaveComposition(2).every((type) => type === 'scout'));
  assert.deepEqual(enemyPoolForWave(1), ['scout']);
  assert.deepEqual(enemyPoolForWave(3), ['scout', 'brute']);
  assert.deepEqual(enemyPoolForWave(8), ['scout', 'brute', 'sniper', 'charger', 'splitter']);
});

test('every wave respects population and dangerous-enemy caps', () => {
  for (let wave = 1; wave <= 80; wave += 1) {
    const composition = buildWaveComposition(wave);
    const caps = enemyCapsForWave(wave);
    assert.equal(composition.length, enemyCountForWave(wave));
    assert.ok(composition.length <= MAX_ACTIVE_ENEMIES);
    assert.ok(composition.every((type) => type in ENEMY_TYPES));
    for (const [type, cap] of Object.entries(caps)) {
      assert.ok(composition.filter((entry) => entry === type).length <= cap, `${type} cap failed at wave ${wave}`);
    }
    if (wave >= 3) assert.ok(composition.filter((type) => type === 'scout').length >= 2);
  }
});

test('wave composition is deterministic', () => {
  for (const wave of [1, 4, 8, 15, 40]) {
    assert.deepEqual(buildWaveComposition(wave), buildWaveComposition(wave));
  }
});

test('enemy scaling is monotonic and bounded', () => {
  const first = enemyScaleForWave(1);
  const tenth = enemyScaleForWave(10);
  const hundredth = enemyScaleForWave(100);
  assert.deepEqual(first, { health: 1, speed: 1, shotSpeed: 1 });
  assert.ok(tenth.health > first.health);
  assert.ok(tenth.speed > first.speed);
  assert.ok(hundredth.health <= 2.05);
  assert.ok(hundredth.speed <= 1.26);
  assert.ok(hundredth.shotSpeed <= 1.3);
});

test('upgrade catalog contains only meaningful in-run abilities', () => {
  assert.equal(UPGRADES.length, 12);
  assert.equal(new Set(UPGRADES.map((upgrade) => upgrade.id)).size, UPGRADES.length);
  assert.equal(UPGRADES.find((upgrade) => upgrade.id === 'wave-shield').maxStacks, 1);
  assert.deepEqual(upgradePreview('wave-shield', 0), ['بدون درع', 'ضربة محمية كل موجة']);
});

test('invalid upgrade stacks are normalized and choices avoid repeats', () => {
  const stacks = normalizedStacks({ 'heavy-shot': 999, vitality: -4, 'quick-dash': '2', 'wave-shield': 8 });
  assert.equal(stacks['heavy-shot'], 10);
  assert.equal(stacks.vitality, 0);
  assert.equal(stacks['quick-dash'], 2);
  assert.equal(stacks['wave-shield'], 1);
  const previous = ['heavy-shot', 'bullet-velocity', 'extended-ricochet'];
  const choices = pickUpgradeChoices({}, 3, () => 0, previous);
  assert.equal(choices.length, 3);
  assert.equal(new Set(choices.map((choice) => choice.id)).size, 3);
  assert.ok(choices.every((choice) => !previous.includes(choice.id)));
});

test('arena expands automatically at waves 3, 6, and 9', () => {
  assert.equal(ARENA_STAGE_COUNT, 4);
  assert.equal(arenaStageForWave(1).id, 0);
  assert.equal(arenaStageForWave(3).id, 1);
  assert.equal(arenaStageForWave(6).id, 2);
  assert.equal(arenaStageForWave(9).id, 3);
  assert.equal(arenaStageForWave(99).id, 3);
});

test('collision resolution escapes obstacles and reserved interface zones', () => {
  const stage = arenaStageForWave(9);
  const obstacle = stage.obstacles[0];
  const circle = { x: obstacle.x + obstacle.w / 2, y: obstacle.y + obstacle.h / 2, radius: 18 };
  assert.equal(resolveCircleAgainstRect(circle, obstacle), true);
  assert.equal(circleRectOverlap(circle, obstacle), false);

  for (const zone of combatSafeZones(true)) {
    const entity = { x: zone.x + zone.w / 2, y: zone.y + zone.h / 2, radius: 18 };
    constrainCombatCircle(entity, stage, true, 6);
    assert.equal(circleRectOverlap(entity, zone), false, zone.id);
  }
});

test('mobile control zones remain isolated from each other', () => {
  const zones = mobileSafeZones();
  assert.deepEqual(zones.map((zone) => zone.id), ['move', 'recall', 'dash', 'pause']);
  for (let first = 0; first < zones.length; first += 1) {
    for (let second = first + 1; second < zones.length; second += 1) {
      const a = zones[first];
      const b = zones[second];
      const overlap = a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
      assert.equal(overlap, false, `${a.id} overlaps ${b.id}`);
    }
  }
});

test('service worker and deployment workflow use the verified application shell', async () => {
  const worker = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  const deployment = await readFile(new URL('../.github/workflows/deploy-pages.yml', import.meta.url), 'utf8');
  assert.ok(worker.includes("request.mode === 'navigate'"));
  assert.equal(worker.includes("cached || caches.match('./index.html')"), false);
  assert.ok(deployment.includes('npm run build'));
  assert.ok(deployment.includes('path: dist'));
  assert.equal(deployment.includes('styles.css'), false);
});
