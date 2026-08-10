import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GAME_VERSION, MAX_ACTIVE_ENEMIES, UPGRADES, buildWaveComposition,
  enemyCountForWave, enemyPoolForWave, enemyScaleForWave, normalizedStacks, pickUpgradeChoices,
  waveEncounterForWave,
} from '../src/game-data.js';
import {
  ARENA_STAGE_COUNT, arenaStageForWave, circleRectOverlap, combatSafeZones,
  hudSafeZones, mobileSafeZones, pushCircleOutOfSafeZones, resolveCircleAgainstRect,
  resolveCombatCircle,
} from '../src/arena.js';
import { i18n } from '../src/i18n.js';
import { selectSpawnPoint } from '../src/spawn-system.js';
import { upgradeEffectText } from '../src/ui-renderer.js';
import { POLISH_VERSION, bulletPresentationState, upgradeVisualKind } from '../src/polish-runtime.js';

test('release exposes the v2.5 polish version', () => {
  assert.equal(GAME_VERSION, '2.5.0-polish');
  assert.equal(POLISH_VERSION, GAME_VERSION);
});

test('bullet HUD states remain explicit', () => {
  assert.equal(bulletPresentationState({ held: true }).code, 'READY');
  assert.equal(bulletPresentationState({ held: false, recalling: false }).code, 'FIRED');
  assert.equal(bulletPresentationState({ held: false, recalling: true }).code, 'RETURNING');
});

test('upgrade icons cover every gameplay category', () => {
  const kinds = new Set(UPGRADES.map((upgrade) => upgradeVisualKind(upgrade)));
  for (const expected of ['bullet', 'movement', 'recall', 'defense', 'health', 'ricochet', 'shock']) {
    assert.ok(kinds.has(expected));
  }
});

test('the product keeps a readable early enemy progression', () => {
  assert.deepEqual(buildWaveComposition(1), ['scout', 'scout', 'scout']);
  assert.ok(buildWaveComposition(2).every((type) => type === 'scout'));
  assert.deepEqual(enemyPoolForWave(3), ['scout', 'brute']);
  assert.ok(enemyPoolForWave(8).includes('splitter'));
});

test('wave pressure grows beyond the old late-game plateau and remains capped', () => {
  const counts = Array.from({ length: 50 }, (_, index) => enemyCountForWave(index + 1));
  assert.equal(counts[0], 3);
  assert.ok(counts.every((count, index) => index === 0 || count >= counts[index - 1]));
  assert.ok(counts.every((count) => count <= MAX_ACTIVE_ENEMIES));
  assert.equal(MAX_ACTIVE_ENEMIES, 18);
  assert.equal(counts.at(-1), MAX_ACTIVE_ENEMIES);
  assert.ok(enemyCountForWave(25) > enemyCountForWave(15));
});

test('late-game encounter director rotates five distinct combat patterns', () => {
  const encounters = Array.from({ length: 5 }, (_, index) => waveEncounterForWave(10 + index));
  assert.equal(new Set(encounters.map((encounter) => encounter.id)).size, 5);
  assert.deepEqual(encounters.map((encounter) => encounter.id), ['rush', 'crossfire', 'swarm', 'siege', 'hunters']);
  assert.ok(encounters.every((encounter) => encounter.name.length > 0));
});

test('dangerous enemy types vary by encounter without overwhelming every wave', () => {
  for (let wave = 1; wave <= 80; wave += 1) {
    const composition = buildWaveComposition(wave);
    assert.equal(composition.length, enemyCountForWave(wave));
    assert.ok(composition.filter((type) => type === 'sniper').length <= 3);
    assert.ok(composition.filter((type) => type === 'charger').length <= 3);
    assert.ok(composition.filter((type) => type === 'splitter').length <= 3);
    assert.ok(composition.filter((type) => type === 'warden').length <= 3);
    assert.ok(composition.includes('scout'));
  }
});

test('enemy scaling keeps growing while staying inside hard safety caps', () => {
  const first = enemyScaleForWave(1);
  const tenth = enemyScaleForWave(10);
  const hundredth = enemyScaleForWave(100);
  assert.ok(tenth.health > first.health && tenth.speed > first.speed);
  assert.ok(hundredth.health <= 2.8 && hundredth.speed <= 1.58 && hundredth.shotSpeed <= 1.72);
  assert.ok(enemyScaleForWave(40).health > enemyScaleForWave(10).health);
});

test('all upgrade stacks have a real effect boundary', () => {
  assert.equal(UPGRADES.length, 16);
  assert.equal(UPGRADES.find((upgrade) => upgrade.id === 'wave-shield').maxStacks, 3);
  const stacks = normalizedStacks({ 'heavy-shot': 999, vitality: -4, 'quick-dash': '2' });
  assert.equal(stacks['heavy-shot'], 8);
  assert.equal(stacks.vitality, 0);
  assert.equal(stacks['quick-dash'], 2);
});

test('upgrade cards explain current and next values in English and Arabic', () => {
  const heavy = UPGRADES.find((upgrade) => upgrade.id === 'heavy-shot');
  const shield = UPGRADES.find((upgrade) => upgrade.id === 'wave-shield');

  i18n.setLocale('en', { persist: false });
  assert.match(upgradeEffectText(heavy, 0), /Current/);
  assert.match(upgradeEffectText(heavy, 0), /After/);
  assert.match(upgradeEffectText(shield, 0), /shield/i);

  i18n.setLocale('ar', { persist: false });
  assert.match(upgradeEffectText(heavy, 0), /الحالي/);
  assert.match(upgradeEffectText(heavy, 0), /بعد الاختيار/);
  assert.match(upgradeEffectText(shield, 0), /درع/);

  i18n.setLocale('en', { persist: false });
});

test('upgrade choices are unique and avoid the previous cards', () => {
  const previous = ['heavy-shot', 'bullet-velocity', 'extended-ricochet'];
  const choices = pickUpgradeChoices({}, 3, () => 0, previous);
  assert.equal(new Set(choices.map((choice) => choice.id)).size, 3);
  assert.ok(choices.every((choice) => !previous.includes(choice.id)));
});

test('arena now keeps opening into explorable late-game sectors', () => {
  assert.equal(ARENA_STAGE_COUNT, 8);
  assert.deepEqual(
    [1, 5, 10, 15, 20, 25, 30, 35, 99].map((wave) => arenaStageForWave(wave).id),
    [0, 1, 2, 3, 4, 5, 6, 7, 7],
  );
  const stage5 = arenaStageForWave(5);
  const stage35 = arenaStageForWave(35);
  assert.ok(stage35.bounds.w > stage5.bounds.w * 2);
  assert.ok(stage35.bounds.h > stage5.bounds.h * 2);
  for (const wave of [1, 5, 10, 15, 20, 25, 30, 35]) {
    const stage = arenaStageForWave(wave);
    assert.equal('objective' in stage, false);
    assert.equal('targets' in stage, false);
  }
});

test('collision recovery escapes obstacle interiors', () => {
  const circle = { x: 50, y: 50, radius: 10 };
  const rect = { x: 20, y: 20, w: 60, h: 60 };
  assert.equal(resolveCircleAgainstRect(circle, rect), true);
  assert.equal(circleRectOverlap(circle, rect), false);
});

test('HUD and mobile controls remain protected in the legacy fixed arena', () => {
  assert.deepEqual(hudSafeZones().map((zone) => zone.id), ['hud-left', 'hud-center', 'hud-right']);
  assert.deepEqual(mobileSafeZones().map((zone) => zone.id), ['move', 'recall', 'dash', 'pause']);
  assert.equal(combatSafeZones(false).length, 3);
  assert.equal(combatSafeZones(true).length, 7);

  const stage = arenaStageForWave(9);
  const circle = { x: 100, y: 60, radius: 18 };
  resolveCombatCircle(circle, stage.bounds, stage.obstacles, combatSafeZones(false));
  assert.ok(hudSafeZones().every((zone) => !circleRectOverlap(circle, zone)));
});

test('mobile safe zones still push entities clear', () => {
  const zones = mobileSafeZones();
  for (const zone of zones) {
    const circle = { x: zone.x + zone.w / 2, y: zone.y + zone.h / 2, radius: 18 };
    assert.equal(pushCircleOutOfSafeZones(circle, [zone]), true);
    assert.equal(circleRectOverlap(circle, zone), false);
  }
});

test('spawn selection avoids the player, enemies, obstacles, and UI', () => {
  const stage = arenaStageForWave(9);
  const player = { x: 640, y: 360, radius: 18 };
  const existing = [{ x: 90, y: 150, radius: 24 }, { x: 1190, y: 620, radius: 24 }];
  const zones = combatSafeZones(true);
  const point = selectSpawnPoint({
    bounds: stage.bounds,
    obstacles: stage.obstacles,
    safeZones: zones,
    player,
    existingEnemies: existing,
    radius: 34,
    wave: 12,
    seed: 4,
    sanitize: (candidate, radius) => {
      const circle = { ...candidate, radius };
      resolveCombatCircle(circle, stage.bounds, stage.obstacles, zones);
      return { x: circle.x, y: circle.y };
    },
  });
  const probe = { ...point, radius: 34 };
  assert.ok(Math.hypot(point.x - player.x, point.y - player.y) >= 230);
  assert.ok(stage.obstacles.every((rect) => !circleRectOverlap(probe, rect)));
  assert.ok(zones.every((rect) => !circleRectOverlap(probe, rect)));
  assert.ok(existing.every((enemy) => Math.hypot(point.x - enemy.x, point.y - enemy.y) >= enemy.radius + 34 + 20));
});
