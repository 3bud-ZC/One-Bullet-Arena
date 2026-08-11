import { circleRectOverlap, clamp, distance } from './arena.js';
import { findNavigationPath } from './enemy-navigation.js';

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
  const safeWave = Math.max(1, Math.trunc(Number(wave) || 1));
  const idealDistance = safeWave >= 20 ? 560 : safeWave >= 10 ? 500 : 410;
  const maxEngagementDistance = safeWave >= 25 ? 820 : safeWave >= 15 ? 720 : 620;

  if (player) {
    const angles = [0, Math.PI, Math.PI / 2, 3 * Math.PI / 2, Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4];
    const rotation = ((seed + safeWave * 3) % angles.length + angles.length) % angles.length;
    for (const radius of [idealDistance, idealDistance + 130, Math.max(310, idealDistance - 120)]) {
      for (let index = 0; index < angles.length; index += 1) {
        const angle = angles[(index + rotation) % angles.length];
        candidates.push({
          x: clamp(player.x + Math.cos(angle) * radius, bounds.x + 66, bounds.x + bounds.w - 66),
          y: clamp(player.y + Math.sin(angle) * radius, bounds.y + 66, bounds.y + bounds.h - 66),
        });
      }
    }
  }

  let best = null;
  let bestScore = -Infinity;

  for (let offset = 0; offset < candidates.length; offset += 1) {
    const raw = candidates[(Math.max(0, seed) + offset) % candidates.length];
    const point = sanitize(raw, radius);
    const probe = { ...point, radius };
    const playerDistance = distance(point, player);
    if (playerDistance < 245) continue;
    if (obstacles.some((rect) => circleRectOverlap(probe, rect))) continue;
    if (safeZones.some((rect) => circleRectOverlap(probe, rect))) continue;

    const nearestEnemy = existingEnemies.length
      ? Math.min(...existingEnemies.map((enemy) => distance(point, enemy) - enemy.radius - radius))
      : 999;
    if (nearestEnemy < 20) continue;

    const route = findNavigationPath({
      start: point,
      target: player,
      obstacles,
      bounds,
      radius,
    });
    if (!route) continue;
    const routeDistance = route.distance;
    const routePenalty = Math.max(0, routeDistance - maxEngagementDistance) * 1.6;
    const bandPenalty = Math.abs(playerDistance - idealDistance) * 1.15;
    const spacingReward = Math.min(320, nearestEnemy) * 1.25;
    const score = spacingReward - bandPenalty - routePenalty;
    if (score > bestScore) {
      best = point;
      bestScore = score;
    }
  }

  if (best) return best;
  return sanitize(candidates[Math.max(0, seed) % candidates.length], radius);
}
