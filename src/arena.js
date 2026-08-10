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
    startsAtWave: 5,
    bounds: Object.freeze({ x: 70, y: 130, w: 1140, h: 460 }),
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
    startsAtWave: 10,
    bounds: Object.freeze({ x: 20, y: 40, w: 1240, h: 640 }),
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
    startsAtWave: 15,
    bounds: Object.freeze({ x: -80, y: -40, w: 1440, h: 800 }),
    obstacles: Object.freeze([
      Object.freeze({ x: 292, y: 184, w: 54, h: 186 }),
      Object.freeze({ x: 934, y: 350, w: 54, h: 186 }),
      Object.freeze({ x: 500, y: 116, w: 150, h: 46 }),
      Object.freeze({ x: 630, y: 558, w: 150, h: 46 }),
      Object.freeze({ x: 122, y: 486, w: 128, h: 44 }),
      Object.freeze({ x: 1030, y: 190, w: 128, h: 44 }),
    ]),
  }),
  Object.freeze({
    id: 4,
    name: 'القطاع الخارجي',
    startsAtWave: 20,
    bounds: Object.freeze({ x: -240, y: -130, w: 1760, h: 980 }),
    obstacles: Object.freeze([
      Object.freeze({ x: 292, y: 184, w: 54, h: 186 }),
      Object.freeze({ x: 934, y: 350, w: 54, h: 186 }),
      Object.freeze({ x: 500, y: 116, w: 150, h: 46 }),
      Object.freeze({ x: 630, y: 558, w: 150, h: 46 }),
      Object.freeze({ x: 122, y: 486, w: 128, h: 44 }),
      Object.freeze({ x: 1030, y: 190, w: 128, h: 44 }),
      Object.freeze({ x: -42, y: 248, w: 118, h: 46 }),
      Object.freeze({ x: 1204, y: 454, w: 132, h: 46 }),
      Object.freeze({ x: 522, y: -18, w: 156, h: 44 }),
      Object.freeze({ x: 704, y: 694, w: 156, h: 44 }),
    ]),
  }),
  Object.freeze({
    id: 5,
    name: 'الحلقة الصناعية',
    startsAtWave: 25,
    bounds: Object.freeze({ x: -420, y: -230, w: 2120, h: 1180 }),
    obstacles: Object.freeze([
      Object.freeze({ x: 292, y: 184, w: 54, h: 186 }),
      Object.freeze({ x: 934, y: 350, w: 54, h: 186 }),
      Object.freeze({ x: 500, y: 116, w: 150, h: 46 }),
      Object.freeze({ x: 630, y: 558, w: 150, h: 46 }),
      Object.freeze({ x: 122, y: 486, w: 128, h: 44 }),
      Object.freeze({ x: 1030, y: 190, w: 128, h: 44 }),
      Object.freeze({ x: -106, y: 116, w: 148, h: 48 }),
      Object.freeze({ x: -158, y: 536, w: 176, h: 48 }),
      Object.freeze({ x: 1260, y: 84, w: 170, h: 48 }),
      Object.freeze({ x: 1350, y: 552, w: 154, h: 48 }),
      Object.freeze({ x: 392, y: -100, w: 54, h: 166 }),
      Object.freeze({ x: 834, y: 664, w: 54, h: 166 }),
    ]),
  }),
  Object.freeze({
    id: 6,
    name: 'المصفوفة المفتوحة',
    startsAtWave: 30,
    bounds: Object.freeze({ x: -620, y: -340, w: 2520, h: 1420 }),
    obstacles: Object.freeze([
      Object.freeze({ x: 292, y: 184, w: 54, h: 186 }),
      Object.freeze({ x: 934, y: 350, w: 54, h: 186 }),
      Object.freeze({ x: 500, y: 116, w: 150, h: 46 }),
      Object.freeze({ x: 630, y: 558, w: 150, h: 46 }),
      Object.freeze({ x: -260, y: 38, w: 180, h: 48 }),
      Object.freeze({ x: -330, y: 642, w: 186, h: 48 }),
      Object.freeze({ x: 1432, y: 40, w: 178, h: 48 }),
      Object.freeze({ x: 1510, y: 676, w: 170, h: 48 }),
      Object.freeze({ x: 40, y: -164, w: 54, h: 180 }),
      Object.freeze({ x: 1180, y: -112, w: 54, h: 180 }),
      Object.freeze({ x: 146, y: 792, w: 54, h: 178 }),
      Object.freeze({ x: 1086, y: 816, w: 54, h: 154 }),
      Object.freeze({ x: -86, y: 338, w: 128, h: 44 }),
      Object.freeze({ x: 1290, y: 338, w: 128, h: 44 }),
    ]),
  }),
  Object.freeze({
    id: 7,
    name: 'الحزام النهائي',
    startsAtWave: 35,
    bounds: Object.freeze({ x: -820, y: -455, w: 2920, h: 1640 }),
    obstacles: Object.freeze([
      Object.freeze({ x: 292, y: 184, w: 54, h: 186 }),
      Object.freeze({ x: 934, y: 350, w: 54, h: 186 }),
      Object.freeze({ x: 500, y: 116, w: 150, h: 46 }),
      Object.freeze({ x: 630, y: 558, w: 150, h: 46 }),
      Object.freeze({ x: -430, y: -70, w: 190, h: 50 }),
      Object.freeze({ x: -486, y: 704, w: 196, h: 50 }),
      Object.freeze({ x: 1580, y: -88, w: 190, h: 50 }),
      Object.freeze({ x: 1654, y: 760, w: 186, h: 50 }),
      Object.freeze({ x: -142, y: -244, w: 56, h: 196 }),
      Object.freeze({ x: 1362, y: -218, w: 56, h: 196 }),
      Object.freeze({ x: -82, y: 876, w: 56, h: 184 }),
      Object.freeze({ x: 1308, y: 882, w: 56, h: 178 }),
      Object.freeze({ x: -286, y: 338, w: 148, h: 46 }),
      Object.freeze({ x: 1422, y: 338, w: 148, h: 46 }),
      Object.freeze({ x: 220, y: -122, w: 164, h: 46 }),
      Object.freeze({ x: 898, y: 896, w: 164, h: 46 }),
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
