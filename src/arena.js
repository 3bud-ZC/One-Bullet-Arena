import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from './game-data.js';

const ARENA_STAGES = Object.freeze([
  Object.freeze({
    id: 0,
    name: 'الغرفة المركزية',
    startsAtWave: 1,
    bounds: Object.freeze({ x: 310, y: 155, w: 660, h: 410 }),
    obstacles: Object.freeze([
      Object.freeze({ x: 470, y: 252, w: 48, h: 216 }),
      Object.freeze({ x: 762, y: 252, w: 48, h: 216 }),
    ]),
  }),
  Object.freeze({
    id: 1,
    name: 'فتح الجناحين',
    startsAtWave: 3,
    bounds: Object.freeze({ x: 120, y: 155, w: 1040, h: 410 }),
    obstacles: Object.freeze([
      Object.freeze({ x: 372, y: 252, w: 48, h: 216 }),
      Object.freeze({ x: 860, y: 252, w: 48, h: 216 }),
      Object.freeze({ x: 590, y: 205, w: 100, h: 46 }),
      Object.freeze({ x: 590, y: 469, w: 100, h: 46 }),
    ]),
  }),
  Object.freeze({
    id: 2,
    name: 'فتح الممرات',
    startsAtWave: 6,
    bounds: Object.freeze({ x: 120, y: 65, w: 1040, h: 590 }),
    obstacles: Object.freeze([
      Object.freeze({ x: 372, y: 252, w: 48, h: 216 }),
      Object.freeze({ x: 860, y: 252, w: 48, h: 216 }),
      Object.freeze({ x: 555, y: 154, w: 170, h: 46 }),
      Object.freeze({ x: 555, y: 520, w: 170, h: 46 }),
      Object.freeze({ x: 186, y: 337, w: 105, h: 46 }),
      Object.freeze({ x: 989, y: 337, w: 105, h: 46 }),
    ]),
  }),
  Object.freeze({
    id: 3,
    name: 'الساحة الكاملة',
    startsAtWave: 9,
    bounds: Object.freeze({ x: 24, y: 24, w: 1232, h: 672 }),
    obstacles: Object.freeze([
      Object.freeze({ x: 292, y: 184, w: 54, h: 186 }),
      Object.freeze({ x: 934, y: 350, w: 54, h: 186 }),
      Object.freeze({ x: 500, y: 116, w: 150, h: 46 }),
      Object.freeze({ x: 630, y: 558, w: 150, h: 46 }),
      Object.freeze({ x: 122, y: 486, w: 128, h: 44 }),
      Object.freeze({ x: 1030, y: 190, w: 128, h: 44 }),
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
  return [3, 6, 9].includes(Math.max(1, Math.trunc(Number(wave) || 1)));
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
