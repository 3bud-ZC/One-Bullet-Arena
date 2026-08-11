import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_STAGE_COUNT,
  arenaStageForWave,
  circleRectOverlap,
} from '../src/arena.js';
import {
  buildNavigationWaypoints,
  findNavigationPath,
  hasClearPath,
} from '../src/enemy-navigation.js';
import { GAME_HEIGHT, GAME_WIDTH } from '../src/game-data.js';

const SPAWN = Object.freeze({ x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 });
// Widest enemy in ENEMY_TYPES is the brute at 27.
const LARGEST_ENEMY_RADIUS = 27;

function allStages() {
  return Array.from({ length: ARENA_STAGE_COUNT }, (_, id) => arenaStageForWave(stageStartWave(id)));
}

function stageStartWave(id) {
  return [1, 5, 10, 15, 20, 25, 30, 35][id];
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

test('every sector keeps its obstacles inside its own bounds', () => {
  for (const stage of allStages()) {
    for (const rect of stage.obstacles) {
      const inside = rect.x >= stage.bounds.x
        && rect.y >= stage.bounds.y
        && rect.x + rect.w <= stage.bounds.x + stage.bounds.w
        && rect.y + rect.h <= stage.bounds.y + stage.bounds.h;
      assert.ok(inside, `sector ${stage.id} (${stage.name}) has an obstacle outside bounds: ${JSON.stringify(rect)}`);
    }
  }
});

test('no sector has overlapping obstacles', () => {
  // Overlapping rects produce ambiguous push-out directions in
  // resolveCircleAgainstRect and can eject a circle into solid geometry.
  for (const stage of allStages()) {
    for (let a = 0; a < stage.obstacles.length; a += 1) {
      for (let b = a + 1; b < stage.obstacles.length; b += 1) {
        assert.ok(
          !rectsOverlap(stage.obstacles[a], stage.obstacles[b]),
          `sector ${stage.id} (${stage.name}) obstacles ${a} and ${b} overlap`,
        );
      }
    }
  }
});

test('every sector leaves the spawn pocket clear', () => {
  for (const stage of allStages()) {
    const pocket = { ...SPAWN, radius: 70 };
    const blocked = stage.obstacles.filter((rect) => circleRectOverlap(pocket, rect));
    assert.deepEqual(
      blocked,
      [],
      `sector ${stage.id} (${stage.name}) blocks the spawn pocket: ${JSON.stringify(blocked)}`,
    );
  }
});

test('every sector is navigable for the widest enemy from spawn to each corner region', () => {
  for (const stage of allStages()) {
    const waypoints = buildNavigationWaypoints(stage.obstacles, stage.bounds, LARGEST_ENEMY_RADIUS);
    const inset = LARGEST_ENEMY_RADIUS + 12;
    const corners = [
      { x: stage.bounds.x + inset, y: stage.bounds.y + inset },
      { x: stage.bounds.x + stage.bounds.w - inset, y: stage.bounds.y + inset },
      { x: stage.bounds.x + inset, y: stage.bounds.y + stage.bounds.h - inset },
      { x: stage.bounds.x + stage.bounds.w - inset, y: stage.bounds.y + stage.bounds.h - inset },
    ];

    for (const corner of corners) {
      const route = findNavigationPath({
        start: corner,
        target: SPAWN,
        obstacles: stage.obstacles,
        bounds: stage.bounds,
        radius: LARGEST_ENEMY_RADIUS,
        waypoints,
      });
      // findNavigationPath returns null when the visibility graph has no route.
      const reachable = Boolean(route) && (route.direct || route.points.length > 0);
      assert.ok(
        reachable,
        `sector ${stage.id} (${stage.name}) cannot route a brute from ${JSON.stringify(corner)} to spawn`,
      );
    }
  }
});

test('sector obstacle budget stays within the navigation cost envelope', () => {
  // Waypoint count drives an O(n^2) Dijkstra, so this is a performance guard,
  // not a style rule. Eight waypoints per obstacle is the generation ceiling.
  for (const stage of allStages()) {
    assert.ok(
      stage.obstacles.length <= 16,
      `sector ${stage.id} (${stage.name}) exceeds the 16-obstacle budget with ${stage.obstacles.length}`,
    );
  }
});

test('each sector declares a distinct composition theme', () => {
  const stages = allStages();
  const themes = stages.map((stage) => stage.theme);
  assert.equal(new Set(themes).size, themes.length, `sector themes must be unique, got ${themes.join(', ')}`);
  for (const theme of themes) assert.ok(theme && typeof theme === 'string');
});

test('later sectors are not a repeat of the sector before them', () => {
  // The previous table shared one identical central cluster across sectors 3-7,
  // which is exactly what made late-game sectors feel like the same room.
  const stages = allStages();
  for (let index = 1; index < stages.length; index += 1) {
    const previous = new Set(stages[index - 1].obstacles.map((r) => `${r.x},${r.y},${r.w},${r.h}`));
    const current = stages[index].obstacles.map((r) => `${r.x},${r.y},${r.w},${r.h}`);
    const shared = current.filter((key) => previous.has(key));
    assert.ok(
      shared.length <= current.length / 2,
      `sector ${stages[index].id} repeats ${shared.length}/${current.length} obstacles from sector ${stages[index - 1].id}`,
    );
  }
});

test('sector names are stable internal keys, not display strings', () => {
  // Player-facing names come from stage.<id> in i18n.js.
  for (const stage of allStages()) {
    assert.match(stage.name, /^[a-z0-9-]+$/, `sector ${stage.id} name "${stage.name}" is not a slug`);
  }
});
