import { circleRectOverlap, distance } from './arena.js';

export function buildSpawnCandidates(bounds, wave = 1) {
  const padding = 66;
  const left = bounds.x + padding;
  const right = bounds.x + bounds.w - padding;
  const top = bounds.y + padding;
  const bottom = bounds.y + bounds.h - padding;
  const centerX = bounds.x + bounds.w / 2;
  const centerY = bounds.y + bounds.h / 2;
  const quarterX = bounds.w * 0.25;
  const quarterY = bounds.h * 0.25;

  const candidates = [
    { x: left, y: top }, { x: right, y: top },
    { x: left, y: bottom }, { x: right, y: bottom },
    { x: centerX, y: top }, { x: centerX, y: bottom },
    { x: left, y: centerY }, { x: right, y: centerY },
    { x: left + quarterX, y: top }, { x: right - quarterX, y: top },
    { x: left + quarterX, y: bottom }, { x: right - quarterX, y: bottom },
    { x: left, y: top + quarterY }, { x: left, y: bottom - quarterY },
    { x: right, y: top + quarterY }, { x: right, y: bottom - quarterY },
  ];

  const rotation = Math.max(0, Math.trunc(Number(wave) || 1)) % candidates.length;
  return [...candidates.slice(rotation), ...candidates.slice(0, rotation)];
}

export function selectSpawnPoint({
  bounds,
  obstacles = [],
  safeZones = [],
  player,
  existingEnemies = [],
  radius = 34,
  seed = 0,
  wave = 1,
  sanitize = (point) => point,
}) {
  const candidates = buildSpawnCandidates(bounds, wave);
  let best = null;
  let bestScore = -Infinity;

  for (let offset = 0; offset < candidates.length; offset += 1) {
    const raw = candidates[(Math.max(0, seed) + offset) % candidates.length];
    const point = sanitize(raw, radius);
    const probe = { ...point, radius };
    if (distance(point, player) < 230) continue;
    if (obstacles.some((rect) => circleRectOverlap(probe, rect))) continue;
    if (safeZones.some((rect) => circleRectOverlap(probe, rect))) continue;

    const nearestEnemy = existingEnemies.length
      ? Math.min(...existingEnemies.map((enemy) => distance(point, enemy) - enemy.radius - radius))
      : 999;
    if (nearestEnemy < 20) continue;

    const score = distance(point, player) + Math.min(300, nearestEnemy) * 1.4;
    if (score > bestScore) {
      best = point;
      bestScore = score;
    }
  }

  if (best) return best;
  return sanitize(candidates[Math.max(0, seed) % candidates.length], radius);
}
