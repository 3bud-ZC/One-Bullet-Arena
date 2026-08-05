import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH, TOUCH_CONTROLS } from './config.js';

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
  Object.freeze({ id: 'hud-left', x: 12, y: 10, w: 320, h: 102 }),
  Object.freeze({ id: 'hud-center', x: 488, y: 10, w: 304, h: 68 }),
  Object.freeze({ id: 'hud-right', x: 948, y: 10, w: 320, h: 102 }),
]);

const TOUCH_SAFE_ZONES = Object.freeze([
  circleToRect('move', TOUCH_CONTROLS.move.x, TOUCH_CONTROLS.move.y, TOUCH_CONTROLS.move.hitRadius + 8),
  circleToRect('recall', TOUCH_CONTROLS.recall.x, TOUCH_CONTROLS.recall.y, TOUCH_CONTROLS.recall.radius + 8),
  circleToRect('dash', TOUCH_CONTROLS.dash.x, TOUCH_CONTROLS.dash.y, TOUCH_CONTROLS.dash.radius + 8),
  circleToRect('pause', TOUCH_CONTROLS.pause.x, TOUCH_CONTROLS.pause.y, TOUCH_CONTROLS.pause.radius + 8),
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

export function mobileSafeZones() {
  return TOUCH_SAFE_ZONES.map((zone) => ({ ...zone }));
}

export function hudSafeZones() {
  return HUD_SAFE_ZONES.map((zone) => ({ ...zone }));
}

export function combatSafeZones(touchMode = false) {
  return [...hudSafeZones(), ...(touchMode ? mobileSafeZones() : [])];
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
  const left = Math.abs(circle.x - (rect.x - radius));
  const right = Math.abs(circle.x - (rect.x + rect.w + radius));
  const top = Math.abs(circle.y - (rect.y - radius));
  const bottom = Math.abs(circle.y - (rect.y + rect.h + radius));
  const minimum = Math.min(left, right, top, bottom);

  if (minimum === left) circle.x = rect.x - radius - 0.5;
  else if (minimum === right) circle.x = rect.x + rect.w + radius + 0.5;
  else if (minimum === top) circle.y = rect.y - radius - 0.5;
  else circle.y = rect.y + rect.h + radius + 0.5;
  return true;
}

export function resolveCircleAgainstRects(circle, rects = []) {
  let collided = false;
  for (const rect of rects) collided = resolveCircleAgainstRect(circle, rect) || collided;
  return collided;
}

export function pushCircleOutOfSafeZones(circle, zones = TOUCH_SAFE_ZONES) {
  let changed = false;
  const radius = Math.max(0, Number(circle?.radius) || 0);
  for (const zone of zones) {
    if (!circleRectOverlap(circle, zone)) continue;
    if (String(zone.id).startsWith('hud-')) circle.y = zone.y + zone.h + radius + 0.5;
    else if (zone.id === 'move') circle.x = zone.x + zone.w + radius + 0.5;
    else circle.x = zone.x - radius - 0.5;
    changed = true;
  }
  return changed;
}

export function constrainCombatCircle(circle, stage, touchMode = false, passes = 4) {
  const zones = combatSafeZones(touchMode);
  for (let pass = 0; pass < passes; pass += 1) {
    clampCircleToBounds(circle, stage.bounds);
    resolveCircleAgainstRects(circle, stage.obstacles);
    pushCircleOutOfSafeZones(circle, zones);
  }
  clampCircleToBounds(circle, stage.bounds);
  resolveCircleAgainstRects(circle, stage.obstacles);
  return circle;
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

export function pointInsideCircle(point, circle, padding = 0) {
  return Math.hypot(point.x - circle.x, point.y - circle.y) <= circle.radius + padding;
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

function circleToRect(id, x, y, radius) {
  return Object.freeze({ id, x: x - radius, y: y - radius, w: radius * 2, h: radius * 2 });
}

export const ARENA_STAGE_COUNT = ARENA_STAGES.length;
export const CANVAS_BOUNDS = Object.freeze({ x: 0, y: 0, w: WIDTH, h: HEIGHT });
