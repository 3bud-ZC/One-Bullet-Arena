import test from 'node:test';
import assert from 'node:assert/strict';
import {
  arenaStageForWave,
  circleRectOverlap,
  combatSafeZones,
  distance,
  normalize,
  resolveCombatCircle,
} from '../src/arena.js';
import {
  findNavigationPath,
  findRangedAttackPoint,
  hasClearPath,
  navigationTargetForEnemy,
  resetEnemyNavigation,
} from '../src/enemy-navigation.js';
import { selectSpawnPoint } from '../src/spawn-system.js';
import { wardenHitZone } from '../src/core/warden-runtime.js';

function blockedMove(circle, direction, speed, obstacles) {
  const next = {
    x: circle.x + direction.x * speed,
    y: circle.y + direction.y * speed,
    radius: circle.radius,
  };
  if (obstacles.some((rect) => circleRectOverlap(next, rect))) return false;
  circle.x = next.x;
  circle.y = next.y;
  return true;
}

function simulatePursuit({ enemy, player, stage, seconds = 7, speed = 95 }) {
  const startDistance = distance(enemy, player);
  let overlapped = false;
  for (let tick = 0; tick < seconds * 120; tick += 1) {
    const nav = navigationTargetForEnemy(enemy, player, {
      bounds: stage.bounds,
      obstacles: stage.obstacles,
    }, 1 / 120);
    const direction = normalize(nav.target.x - enemy.x, nav.target.y - enemy.y);
    blockedMove(enemy, direction, speed / 120, stage.obstacles);
    resolveCombatCircle(enemy, stage.bounds, stage.obstacles, []);
    overlapped = overlapped || stage.obstacles.some((rect) => circleRectOverlap(enemy, rect));
  }
  return { startDistance, endDistance: distance(enemy, player), overlapped };
}

test('direct pursuit stays direct in an unobstructed area', () => {
  const stage = { bounds: { x: 0, y: 0, w: 1280, h: 720 }, obstacles: [] };
  const enemy = { id: 1, x: 260, y: 360, radius: 18 };
  const player = { x: 640, y: 360, radius: 18 };
  const result = simulatePursuit({ enemy, player, stage, seconds: 2, speed: 120 });
  assert.ok(result.endDistance < result.startDistance - 220);
  assert.equal(result.overlapped, false);
});

test('navigation routes around a vertical obstacle instead of pressing into it', () => {
  const stage = arenaStageForWave(1);
  const enemy = { id: 2, x: 430, y: 360, radius: 17 };
  const player = { x: 640, y: 360, radius: 18 };
  assert.equal(hasClearPath(enemy, player, stage.obstacles, enemy.radius), false);
  const path = findNavigationPath({ start: enemy, target: player, obstacles: stage.obstacles, bounds: stage.bounds, radius: enemy.radius });
  assert.ok(path && path.points.length >= 2);
  const result = simulatePursuit({ enemy, player, stage });
  assert.ok(result.endDistance < 70);
  assert.equal(result.overlapped, false);
});

test('navigation routes around a horizontal obstacle', () => {
  const stage = arenaStageForWave(10);
  const enemy = { id: 3, x: 640, y: 120, radius: 17 };
  const player = { x: 640, y: 360, radius: 18 };
  assert.equal(hasClearPath(enemy, player, stage.obstacles, enemy.radius), false);
  const result = simulatePursuit({ enemy, player, stage, seconds: 5 });
  assert.ok(result.endDistance < 95);
  assert.equal(result.overlapped, false);
});

test('corner stuck recovery replans with route persistence', () => {
  const stage = arenaStageForWave(5);
  const enemy = { id: 4, x: 348, y: 250, radius: 19 };
  const player = { x: 640, y: 360, radius: 18 };
  const firstTarget = navigationTargetForEnemy(enemy, player, {
    bounds: stage.bounds,
    obstacles: stage.obstacles,
  }, 0.01);
  for (let index = 0; index < 80; index += 1) {
    navigationTargetForEnemy(enemy, player, { bounds: stage.bounds, obstacles: stage.obstacles }, 1 / 120);
  }
  const beforeReset = enemy.nav.side;
  resetEnemyNavigation(enemy);
  const afterReset = navigationTargetForEnemy(enemy, player, {
    bounds: stage.bounds,
    obstacles: stage.obstacles,
  }, 0.01);
  assert.ok(firstTarget.waypoints > 0);
  assert.ok(beforeReset === 1 || beforeReset === -1);
  assert.ok(afterReset.waypoints > 0);
});

test('planner never treats a solid obstacle as passable geometry', () => {
  const stage = arenaStageForWave(1);
  const start = { x: 430, y: 360, radius: 18 };
  const target = { x: 640, y: 360, radius: 18 };
  assert.equal(hasClearPath(start, target, stage.obstacles, start.radius), false);
  const next = { x: 480, y: 360, radius: 18 };
  assert.equal(stage.obstacles.some((rect) => circleRectOverlap(next, rect)), true);
});

test('crowd separation remains deterministic for dense overlaps', async () => {
  const { separateOverlappingEnemies } = await import('../src/movement-hotfix-runtime.js');
  const makeGroup = () => Array.from({ length: 8 }, (_, index) => ({
    id: index + 1,
    x: 500 + (index % 2) * 2,
    y: 360 + Math.floor(index / 2) * 2,
    radius: 18,
  }));
  const first = makeGroup();
  const second = makeGroup();
  for (let pass = 0; pass < 8; pass += 1) {
    separateOverlappingEnemies(first, () => {});
    separateOverlappingEnemies(second, () => {});
  }
  assert.deepEqual(first, second);
  for (let i = 0; i < first.length; i += 1) {
    for (let j = i + 1; j < first.length; j += 1) {
      assert.ok(Number.isFinite(distance(first[i], first[j])));
    }
  }
});

test('spawn point respects player safety and obstacles', () => {
  const stage = arenaStageForWave(15);
  const player = { x: 640, y: 360, radius: 18 };
  const point = selectSpawnPoint({
    bounds: stage.bounds,
    obstacles: stage.obstacles,
    safeZones: combatSafeZones(false),
    player,
    existingEnemies: [],
    radius: 34,
    wave: 15,
    seed: 2,
    sanitize: (candidate, radius) => {
      const circle = { ...candidate, radius };
      resolveCombatCircle(circle, stage.bounds, stage.obstacles, combatSafeZones(false));
      return { x: circle.x, y: circle.y };
    },
  });
  assert.ok(distance(point, player) >= 245);
  assert.ok(stage.obstacles.every((rect) => !circleRectOverlap({ ...point, radius: 34 }, rect)));
});

test('late-arena spawn remains meaningfully engageable', () => {
  const stage = arenaStageForWave(35);
  const player = { x: 640, y: 360, radius: 18 };
  const point = selectSpawnPoint({
    bounds: stage.bounds,
    obstacles: stage.obstacles,
    safeZones: combatSafeZones(true),
    player,
    existingEnemies: [],
    radius: 34,
    wave: 35,
    seed: 9,
    sanitize: (candidate, radius) => {
      const circle = { ...candidate, radius };
      resolveCombatCircle(circle, stage.bounds, stage.obstacles, combatSafeZones(true));
      return { x: circle.x, y: circle.y };
    },
  });
  const path = findNavigationPath({ start: point, target: player, obstacles: stage.obstacles, bounds: stage.bounds, radius: 34 });
  assert.ok(path);
  assert.ok(path.distance < 900);
});

test('knockback can reset and resume successful pursuit', () => {
  const stage = arenaStageForWave(10);
  const enemy = { id: 12, x: 330, y: 360, radius: 17 };
  const player = { x: 640, y: 360, radius: 18 };
  enemy.x -= 90;
  resetEnemyNavigation(enemy);
  const result = simulatePursuit({ enemy, player, stage, seconds: 8, speed: 110 });
  assert.ok(result.endDistance < 85);
  assert.equal(result.overlapped, false);
});

test('sniper can find a useful line-of-fire position without rushing melee', () => {
  const stage = arenaStageForWave(30);
  const player = { x: 640, y: 360, radius: 18 };
  const sniper = { id: 13, x: 230, y: 360, radius: 20 };
  const point = findRangedAttackPoint({
    start: sniper,
    player,
    obstacles: stage.obstacles,
    bounds: stage.bounds,
    radius: sniper.radius,
  });
  assert.ok(point);
  assert.ok(distance(point, player) >= 285);
  assert.ok(distance(point, player) <= 530);
  assert.equal(hasClearPath(point, player, stage.obstacles, sniper.radius * 0.45, 4), true);
});

test('charger lanes reject obstacle-blocked attacks', () => {
  const stage = arenaStageForWave(1);
  const charger = { x: 430, y: 360, radius: 21 };
  const player = { x: 640, y: 360, radius: 18 };
  const direction = normalize(player.x - charger.x, player.y - charger.y);
  const chargeEnd = { x: charger.x + direction.x * 210, y: charger.y + direction.y * 210 };
  assert.equal(hasClearPath(charger, chargeEnd, stage.obstacles, charger.radius + 2, 2), false);
});

test('warden guard math is preserved while navigation chooses a route', () => {
  const stage = arenaStageForWave(35);
  const warden = { id: 14, type: 'warden', x: 230, y: 360, radius: 25, guardAngle: Math.PI };
  const player = { x: 640, y: 360, radius: 18 };
  const before = wardenHitZone(warden.guardAngle, -1, 0);
  const nav = navigationTargetForEnemy(warden, player, {
    bounds: stage.bounds,
    obstacles: stage.obstacles,
  }, 0.01);
  const after = wardenHitZone(warden.guardAngle, -1, 0);
  assert.ok(nav.target);
  assert.equal(before, after);
});
