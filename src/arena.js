import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from './game-data.js';

/*
 * Sector layouts.
 *
 * Each sector has its own composition language rather than being the previous
 * room with a larger boundary — that was the old shape of this table, where
 * sectors 3 to 7 repeated one identical central cluster and only bolted extra
 * blocks onto the perimeter.
 *
 * Obstacle COUNT is deliberately held to the previous budget (2/4/6/8/10/12/
 * 14/16). Navigation builds up to eight waypoints per obstacle and then runs
 * Dijkstra over the resulting node set, so cost grows quadratically with
 * obstacle count. Identity therefore comes from arrangement, proportion, and
 * silhouette, never from adding clutter.
 *
 * `theme` drives floor treatment and structure rendering. `name` is a stable
 * internal key only — player-facing sector names come from `stage.<id>` in
 * i18n.js.
 *
 * Every layout is validated by tests/arena-stages.test.js: obstacles stay
 * inside bounds, never overlap each other, leave the spawn pocket clear, and
 * every obstacle-adjacent waypoint stays mutually reachable.
 */
const ARENA_STAGES = Object.freeze([
  // Duel room. Two pillars, one lane each side: the ricochet tutorial.
  Object.freeze({
    id: 0,
    name: 'central-room',
    theme: 'chamber',
    startsAtWave: 1,
    bounds: Object.freeze({ x: 310, y: 155, w: 660, h: 410 }),
    obstacles: Object.freeze([
      Object.freeze({ x: 470, y: 252, w: 48, h: 216 }),
      Object.freeze({ x: 762, y: 252, w: 48, h: 216 }),
    ]),
  }),
  // Two open brackets, deliberately not mirrored, so each wing plays
  // differently and the centre stays a fast crossing lane.
  Object.freeze({
    id: 1,
    name: 'side-wings',
    theme: 'wings',
    startsAtWave: 5,
    bounds: Object.freeze({ x: 70, y: 130, w: 1140, h: 460 }),
    obstacles: Object.freeze([
      Object.freeze({ x: 330, y: 250, w: 44, h: 190 }),
      Object.freeze({ x: 330, y: 206, w: 170, h: 44 }),
      Object.freeze({ x: 906, y: 250, w: 44, h: 190 }),
      Object.freeze({ x: 780, y: 440, w: 170, h: 44 }),
    ]),
  }),
  // Long parallel walls. The bank-shot sector: opposed flat faces give clean
  // two-wall ricochet chains down each corridor.
  Object.freeze({
    id: 2,
    name: 'outer-corridors',
    theme: 'corridors',
    startsAtWave: 10,
    bounds: Object.freeze({ x: 20, y: 40, w: 1240, h: 640 }),
    obstacles: Object.freeze([
      Object.freeze({ x: 140, y: 220, w: 420, h: 38 }),
      Object.freeze({ x: 720, y: 220, w: 420, h: 38 }),
      Object.freeze({ x: 430, y: 452, w: 420, h: 38 }),
      Object.freeze({ x: 140, y: 452, w: 150, h: 38 }),
      Object.freeze({ x: 990, y: 452, w: 150, h: 38 }),
      // Kept out of the middle corridor: at mid-height it left 42px and 32px
      // gaps, which seals the lane for anything wider than a scout.
      Object.freeze({ x: 612, y: 560, w: 56, h: 100 }),
    ]),
  }),
  // Open bowl: a ring of cover around an empty centre, so the killing floor is
  // the middle and every retreat is outward.
  Object.freeze({
    id: 3,
    name: 'full-arena',
    theme: 'bowl',
    startsAtWave: 15,
    bounds: Object.freeze({ x: -80, y: -40, w: 1440, h: 800 }),
    obstacles: Object.freeze([
      Object.freeze({ x: 565, y: 118, w: 150, h: 40 }),
      Object.freeze({ x: 565, y: 562, w: 150, h: 40 }),
      Object.freeze({ x: 296, y: 315, w: 40, h: 150 }),
      Object.freeze({ x: 944, y: 315, w: 40, h: 150 }),
      Object.freeze({ x: 360, y: 170, w: 120, h: 38 }),
      Object.freeze({ x: 800, y: 170, w: 120, h: 38 }),
      Object.freeze({ x: 360, y: 512, w: 120, h: 38 }),
      Object.freeze({ x: 800, y: 512, w: 120, h: 38 }),
    ]),
  }),
  // Diagonal cascade. The first asymmetric, directional sector: angled lanes
  // instead of orthogonal ones, so approach direction starts to matter.
  Object.freeze({
    id: 4,
    name: 'outer-sector',
    theme: 'cascade',
    startsAtWave: 20,
    bounds: Object.freeze({ x: -240, y: -130, w: 1760, h: 980 }),
    obstacles: Object.freeze([
      Object.freeze({ x: -60, y: 60, w: 150, h: 40 }),
      Object.freeze({ x: 140, y: 150, w: 150, h: 40 }),
      Object.freeze({ x: 340, y: 240, w: 150, h: 40 }),
      Object.freeze({ x: 760, y: 470, w: 150, h: 40 }),
      Object.freeze({ x: 960, y: 560, w: 150, h: 40 }),
      Object.freeze({ x: 1160, y: 650, w: 150, h: 40 }),
      Object.freeze({ x: 1000, y: 80, w: 42, h: 150 }),
      Object.freeze({ x: 820, y: -40, w: 42, h: 150 }),
      Object.freeze({ x: 260, y: 480, w: 42, h: 150 }),
      Object.freeze({ x: 440, y: 620, w: 42, h: 150 }),
    ]),
  }),
  // Industrial: far fewer, far heavier masses. Gaps between them are the
  // sector's real geometry — genuine choke points rather than scattered cover.
  Object.freeze({
    id: 5,
    name: 'industrial-ring',
    theme: 'industrial',
    startsAtWave: 25,
    bounds: Object.freeze({ x: -420, y: -230, w: 2120, h: 1180 }),
    obstacles: Object.freeze([
      Object.freeze({ x: 180, y: 80, w: 260, h: 110 }),
      Object.freeze({ x: 840, y: 80, w: 260, h: 110 }),
      Object.freeze({ x: 180, y: 530, w: 260, h: 110 }),
      Object.freeze({ x: 840, y: 530, w: 260, h: 110 }),
      Object.freeze({ x: -140, y: 280, w: 110, h: 240 }),
      Object.freeze({ x: 1310, y: 280, w: 110, h: 240 }),
      Object.freeze({ x: 520, y: -170, w: 240, h: 110 }),
      Object.freeze({ x: 520, y: 800, w: 240, h: 110 }),
      Object.freeze({ x: -320, y: -60, w: 200, h: 100 }),
      Object.freeze({ x: 1400, y: -60, w: 200, h: 100 }),
      Object.freeze({ x: -320, y: 700, w: 200, h: 100 }),
      Object.freeze({ x: 1400, y: 700, w: 200, h: 100 }),
    ]),
  }),
  // Lattice of identical pillars. Reads instantly as a matrix and gives the
  // densest field of parallel faces in the game for multi-bank shots.
  Object.freeze({
    id: 6,
    name: 'open-matrix',
    theme: 'matrix',
    startsAtWave: 30,
    bounds: Object.freeze({ x: -620, y: -340, w: 2520, h: 1420 }),
    obstacles: Object.freeze([
      Object.freeze({ x: -120, y: 20, w: 64, h: 64 }),
      Object.freeze({ x: 160, y: 20, w: 64, h: 64 }),
      Object.freeze({ x: 440, y: 20, w: 64, h: 64 }),
      Object.freeze({ x: 860, y: 20, w: 64, h: 64 }),
      Object.freeze({ x: 1140, y: 20, w: 64, h: 64 }),
      Object.freeze({ x: -120, y: 300, w: 64, h: 64 }),
      Object.freeze({ x: 160, y: 300, w: 64, h: 64 }),
      Object.freeze({ x: 1140, y: 300, w: 64, h: 64 }),
      Object.freeze({ x: 1420, y: 300, w: 64, h: 64 }),
      Object.freeze({ x: -120, y: 580, w: 64, h: 64 }),
      Object.freeze({ x: 160, y: 580, w: 64, h: 64 }),
      Object.freeze({ x: 440, y: 580, w: 64, h: 64 }),
      Object.freeze({ x: 860, y: 580, w: 64, h: 64 }),
      Object.freeze({ x: 1140, y: 580, w: 64, h: 64 }),
    ]),
  }),
  // Concentric belts. An inner ring you fight inside and an outer rail you
  // orbit, both broken by wide gaps so routing always has an opening.
  Object.freeze({
    id: 7,
    name: 'final-belt',
    theme: 'belt',
    startsAtWave: 35,
    bounds: Object.freeze({ x: -820, y: -455, w: 2920, h: 1640 }),
    obstacles: Object.freeze([
      Object.freeze({ x: 364, y: 150, w: 230, h: 34 }),
      Object.freeze({ x: 706, y: 150, w: 230, h: 34 }),
      Object.freeze({ x: 364, y: 536, w: 230, h: 34 }),
      Object.freeze({ x: 706, y: 536, w: 230, h: 34 }),
      Object.freeze({ x: 330, y: 220, w: 34, h: 110 }),
      Object.freeze({ x: 330, y: 410, w: 34, h: 100 }),
      Object.freeze({ x: 936, y: 220, w: 34, h: 110 }),
      Object.freeze({ x: 936, y: 410, w: 34, h: 100 }),
      Object.freeze({ x: -160, y: -150, w: 620, h: 36 }),
      Object.freeze({ x: 700, y: -150, w: 620, h: 36 }),
      Object.freeze({ x: -160, y: 866, w: 620, h: 36 }),
      Object.freeze({ x: 700, y: 866, w: 620, h: 36 }),
      Object.freeze({ x: -220, y: -90, w: 36, h: 400 }),
      Object.freeze({ x: -220, y: 530, w: 36, h: 400 }),
      Object.freeze({ x: 1464, y: -90, w: 36, h: 400 }),
      Object.freeze({ x: 1464, y: 530, w: 36, h: 400 }),
    ]),
  }),
]);

const HUD_SAFE_ZONES = Object.freeze([
  Object.freeze({ id: 'hud-left', x: 8, y: 8, w: 356, h: 104 }),
  Object.freeze({ id: 'hud-center', x: WIDTH / 2 - 192, y: 8, w: 384, h: 104 }),
  Object.freeze({ id: 'hud-right', x: WIDTH - 364, y: 8, w: 356, h: 104 }),
]);

const MOBILE_SAFE_ZONES = Object.freeze([
  Object.freeze({ id: 'move', x: 28, y: HEIGHT - 238, w: 228, h: 220 }),
  Object.freeze({ id: 'recall', x: WIDTH - 158, y: HEIGHT - 288, w: 140, h: 126 }),
  Object.freeze({ id: 'dash', x: WIDTH - 162, y: HEIGHT - 154, w: 144, h: 136 }),
  Object.freeze({ id: 'pause', x: WIDTH - 286, y: HEIGHT - 150, w: 112, h: 132 }),
]);

export function arenaStageForWave(wave) {
  const safeWave = Math.max(1, Math.trunc(Number(wave) || 1));
  let selected = ARENA_STAGES[0];
  for (const stage of ARENA_STAGES) {
    if (safeWave >= stage.startsAtWave) selected = stage;
  }
  return cloneStage(selected);
}

export function isArenaUnlockWave(wave) {
  return [5, 10, 15, 20, 25, 30, 35].includes(Math.max(1, Math.trunc(Number(wave) || 1)));
}

export function hudSafeZones() {
  return HUD_SAFE_ZONES.map((zone) => ({ ...zone }));
}

export function mobileSafeZones() {
  return MOBILE_SAFE_ZONES.map((zone) => ({ ...zone }));
}

export function combatSafeZones(touchMode = false) {
  return [
    ...hudSafeZones(),
    ...(touchMode ? mobileSafeZones() : []),
  ];
}

export function cloneStage(stage) {
  return {
    ...stage,
    bounds: { ...stage.bounds },
    obstacles: stage.obstacles.map((obstacle) => ({ ...obstacle })),
  };
}

export function clampCircleToBounds(circle, bounds) {
  if (!circle) return circle;
  const radius = Math.max(0, Number(circle.radius) || 0);
  circle.x = clamp(circle.x, bounds.x + radius, bounds.x + bounds.w - radius);
  circle.y = clamp(circle.y, bounds.y + radius, bounds.y + bounds.h - radius);
  return circle;
}

export function resolveCircleAgainstRect(circle, rect) {
  if (!circleRectOverlap(circle, rect)) return false;
  const radius = Math.max(0, Number(circle.radius) || 0);
  const leftPenetration = circle.x + radius - rect.x;
  const rightPenetration = rect.x + rect.w - (circle.x - radius);
  const topPenetration = circle.y + radius - rect.y;
  const bottomPenetration = rect.y + rect.h - (circle.y - radius);
  const minimum = Math.min(leftPenetration, rightPenetration, topPenetration, bottomPenetration);

  if (minimum === leftPenetration) circle.x = rect.x - radius - 0.5;
  else if (minimum === rightPenetration) circle.x = rect.x + rect.w + radius + 0.5;
  else if (minimum === topPenetration) circle.y = rect.y - radius - 0.5;
  else circle.y = rect.y + rect.h + radius + 0.5;
  return true;
}

export function resolveCircleAgainstRects(circle, rects = []) {
  let collided = false;
  for (const rect of rects) collided = resolveCircleAgainstRect(circle, rect) || collided;
  return collided;
}

export function resolveCombatCircle(circle, bounds, obstacles = [], safeZones = [], passes = 5) {
  if (!circle) return circle;
  const maxPasses = Math.max(1, Math.min(10, Math.trunc(Number(passes) || 1)));

  for (let pass = 0; pass < maxPasses; pass += 1) {
    const beforeX = circle.x;
    const beforeY = circle.y;
    clampCircleToBounds(circle, bounds);
    resolveCircleAgainstRects(circle, obstacles);
    for (const zone of safeZones) resolveCircleAgainstSafeZone(circle, zone);
    clampCircleToBounds(circle, bounds);
    if (Math.abs(circle.x - beforeX) < 0.001 && Math.abs(circle.y - beforeY) < 0.001) break;
  }
  return circle;
}

function resolveCircleAgainstSafeZone(circle, zone) {
  if (!circleRectOverlap(circle, zone)) return false;
  const radius = Math.max(0, Number(circle.radius) || 0);
  if (String(zone.id).startsWith('hud-')) circle.y = zone.y + zone.h + radius + 1;
  else if (zone.id === 'move') circle.x = zone.x + zone.w + radius + 1;
  else if (['recall', 'dash', 'pause'].includes(zone.id)) circle.x = zone.x - radius - 1;
  else resolveCircleAgainstRect(circle, zone);
  return true;
}

export function pushCircleOutOfSafeZones(circle, zones = MOBILE_SAFE_ZONES) {
  let changed = false;
  const radius = Math.max(0, Number(circle?.radius) || 0);
  for (const zone of zones) {
    if (!circleRectOverlap(circle, zone)) continue;
    if (zone.id === 'move') circle.x = zone.x + zone.w + radius + 1;
    else circle.x = zone.x - radius - 1;
    changed = true;
  }
  return changed;
}

export function circleRectOverlap(circle, rect) {
  const nearestX = clamp(circle.x, rect.x, rect.x + rect.w);
  const nearestY = clamp(circle.y, rect.y, rect.y + rect.h);
  const radius = Math.max(0, Number(circle.radius) || 0);
  return (circle.x - nearestX) ** 2 + (circle.y - nearestY) ** 2 <= radius ** 2;
}

export function circleOverlap(a, b, padding = 0) {
  return distance(a, b) <= (a.radius || 0) + (b.radius || 0) + padding;
}

export function pointInsideBounds(point, bounds, margin = 0) {
  return point.x >= bounds.x - margin
    && point.x <= bounds.x + bounds.w + margin
    && point.y >= bounds.y - margin
    && point.y <= bounds.y + bounds.h + margin;
}

export function pointInsideRect(point, rect) {
  return point.x >= rect.x && point.x <= rect.x + rect.w
    && point.y >= rect.y && point.y <= rect.y + rect.h;
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function normalize(x, y) {
  const length = Math.hypot(x, y);
  if (length < 0.0001) return { x: 0, y: 0 };
  return { x: x / length, y: y / length };
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export const ARENA_STAGE_COUNT = ARENA_STAGES.length;
export const CANVAS_BOUNDS = Object.freeze({ x: 0, y: 0, w: WIDTH, h: HEIGHT });
