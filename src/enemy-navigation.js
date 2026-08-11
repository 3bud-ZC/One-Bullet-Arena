import {
  circleRectOverlap,
  clamp,
  distance,
  normalize,
  pointInsideBounds,
} from './arena.js';

const NAV_PADDING = 10;
const WAYPOINT_CLEARANCE = 28;
const WAYPOINT_REACH = 22;
const REPLAN_INTERVAL = 0.26;
const TARGET_REPLAN_DISTANCE = 92;
const STUCK_SAMPLE_SECONDS = 0.5;
const STUCK_PROGRESS_EPSILON = 8;

function inflateRect(rect, amount) {
  return {
    x: rect.x - amount,
    y: rect.y - amount,
    w: rect.w + amount * 2,
    h: rect.h + amount * 2,
  };
}

function pointInsideInflatedRect(point, rect, amount) {
  const inflated = inflateRect(rect, amount);
  return point.x >= inflated.x
    && point.x <= inflated.x + inflated.w
    && point.y >= inflated.y
    && point.y <= inflated.y + inflated.h;
}

function segmentIntersectsRect(start, end, rect) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  let tMin = 0;
  let tMax = 1;

  const clip = (origin, delta, min, max) => {
    if (Math.abs(delta) < 0.000001) return origin >= min && origin <= max;
    const inverse = 1 / delta;
    let near = (min - origin) * inverse;
    let far = (max - origin) * inverse;
    if (near > far) [near, far] = [far, near];
    tMin = Math.max(tMin, near);
    tMax = Math.min(tMax, far);
    return tMin <= tMax;
  };

  return clip(start.x, dx, rect.x, rect.x + rect.w)
    && clip(start.y, dy, rect.y, rect.y + rect.h)
    && tMax >= 0
    && tMin <= 1;
}

export function hasClearPath(start, end, obstacles = [], radius = 0, padding = NAV_PADDING) {
  const clearance = Math.max(0, radius + padding);
  for (const rect of obstacles) {
    const solid = inflateRect(rect, Math.max(0, radius));
    if (segmentIntersectsRect(start, end, solid)) return false;
    const inflated = inflateRect(rect, clearance);
    if (pointInsideInflatedRect(start, rect, clearance)) continue;
    if (pointInsideInflatedRect(end, rect, clearance)) continue;
    if (segmentIntersectsRect(start, end, inflated)) return false;
  }
  return true;
}

export function isNavigationPointClear(point, obstacles = [], bounds, radius = 0) {
  if (bounds && !pointInsideBounds(point, bounds, -Math.max(0, radius))) return false;
  const probe = { x: point.x, y: point.y, radius: Math.max(0, radius + 2) };
  return obstacles.every((rect) => !circleRectOverlap(probe, rect));
}

export function buildNavigationWaypoints(obstacles = [], bounds, radius = 0) {
  const clearance = Math.max(WAYPOINT_CLEARANCE, radius + WAYPOINT_CLEARANCE);
  const points = [];
  for (const rect of obstacles) {
    const raw = [
      { x: rect.x - clearance, y: rect.y - clearance },
      { x: rect.x + rect.w + clearance, y: rect.y - clearance },
      { x: rect.x - clearance, y: rect.y + rect.h + clearance },
      { x: rect.x + rect.w + clearance, y: rect.y + rect.h + clearance },
      { x: rect.x + rect.w / 2, y: rect.y - clearance },
      { x: rect.x + rect.w / 2, y: rect.y + rect.h + clearance },
      { x: rect.x - clearance, y: rect.y + rect.h / 2 },
      { x: rect.x + rect.w + clearance, y: rect.y + rect.h / 2 },
    ];
    for (const point of raw) {
      const candidate = bounds
        ? {
          x: clamp(point.x, bounds.x + radius, bounds.x + bounds.w - radius),
          y: clamp(point.y, bounds.y + radius, bounds.y + bounds.h - radius),
        }
        : point;
      if (!isNavigationPointClear(candidate, obstacles, bounds, radius)) continue;
      if (points.some((existing) => distance(existing, candidate) < 18)) continue;
      points.push(candidate);
    }
  }
  return points;
}

function routeSideSign(start, target, firstWaypoint) {
  const direct = normalize(target.x - start.x, target.y - start.y);
  const route = normalize(firstWaypoint.x - start.x, firstWaypoint.y - start.y);
  const cross = direct.x * route.y - direct.y * route.x;
  return cross >= 0 ? 1 : -1;
}

export function findNavigationPath({
  start,
  target,
  obstacles = [],
  bounds,
  radius = 0,
  preferredSide = 0,
  waypoints = null,
}) {
  if (hasClearPath(start, target, obstacles, radius)) {
    return { direct: true, points: [], distance: distance(start, target), side: 0 };
  }

  const navPoints = waypoints || buildNavigationWaypoints(obstacles, bounds, radius);
  const nodes = [start, ...navPoints, target];
  const targetIndex = nodes.length - 1;
  const costs = Array(nodes.length).fill(Infinity);
  const previous = Array(nodes.length).fill(-1);
  const visited = Array(nodes.length).fill(false);
  costs[0] = 0;

  for (let step = 0; step < nodes.length; step += 1) {
    let current = -1;
    let bestCost = Infinity;
    for (let index = 0; index < nodes.length; index += 1) {
      if (visited[index] || costs[index] >= bestCost) continue;
      current = index;
      bestCost = costs[index];
    }
    if (current === -1 || current === targetIndex) break;
    visited[current] = true;

    for (let next = 1; next < nodes.length; next += 1) {
      if (visited[next] || next === current) continue;
      if (!hasClearPath(nodes[current], nodes[next], obstacles, radius)) continue;
      const firstHop = current === 0 ? nodes[next] : nodes[traceFirstHop(previous, current)];
      const side = firstHop ? routeSideSign(start, target, firstHop) : 0;
      const sidePenalty = preferredSide && side && side !== preferredSide ? 24 : 0;
      const candidate = costs[current] + distance(nodes[current], nodes[next]) + sidePenalty;
      if (candidate >= costs[next]) continue;
      costs[next] = candidate;
      previous[next] = current;
    }
  }

  if (!Number.isFinite(costs[targetIndex])) return null;

  const points = [];
  for (let at = targetIndex; at > 0; at = previous[at]) {
    if (at === -1) return null;
    points.unshift({ x: nodes[at].x, y: nodes[at].y });
  }
  const first = points[0] || target;
  return {
    direct: false,
    points,
    distance: costs[targetIndex],
    side: routeSideSign(start, target, first),
  };
}

function traceFirstHop(previous, current) {
  let at = current;
  while (previous[at] > 0) at = previous[at];
  return at;
}

export function ensureEnemyNavigationState(enemy) {
  if (!enemy.nav) {
    enemy.nav = {
      waypoints: [],
      routeTarget: null,
      replanIn: 0,
      side: 0,
      blockedTime: 0,
      progressTimer: 0,
      previousDistance: null,
      lastX: enemy.x,
      lastY: enemy.y,
      stuckRecoveries: 0,
    };
  }
  return enemy.nav;
}

export function markEnemyNavigationBlocked(enemy, blocked, dt) {
  const nav = ensureEnemyNavigationState(enemy);
  nav.blockedTime = blocked ? nav.blockedTime + Math.max(0, dt) : Math.max(0, nav.blockedTime - dt * 1.5);
  if (blocked) nav.replanIn = Math.min(nav.replanIn, 0.02);
  return nav.blockedTime;
}

export function resetEnemyNavigation(enemy) {
  const nav = ensureEnemyNavigationState(enemy);
  nav.waypoints.length = 0;
  nav.routeTarget = null;
  nav.replanIn = 0;
  nav.blockedTime = 0;
  nav.progressTimer = 0;
  nav.previousDistance = null;
}

export function navigationTargetForEnemy(enemy, target, context, dt = 0) {
  const nav = ensureEnemyNavigationState(enemy);
  const obstacles = context.obstacles || [];
  const bounds = context.bounds;
  const radius = enemy.radius || context.radius || 0;
  const waypoints = context.waypoints || null;
  const current = { x: enemy.x, y: enemy.y };
  const targetMoved = !nav.routeTarget || distance(nav.routeTarget, target) > TARGET_REPLAN_DISTANCE;
  const clearDirect = hasClearPath(current, target, obstacles, radius);

  nav.replanIn = Math.max(0, nav.replanIn - Math.max(0, dt));
  nav.progressTimer += Math.max(0, dt);
  if (nav.previousDistance === null) nav.previousDistance = distance(current, target);
  let stuck = false;
  if (nav.progressTimer >= STUCK_SAMPLE_SECONDS) {
    const currentDistance = distance(current, target);
    const moved = distance(current, { x: nav.lastX, y: nav.lastY });
    stuck = moved < STUCK_PROGRESS_EPSILON && currentDistance >= nav.previousDistance - STUCK_PROGRESS_EPSILON;
    nav.progressTimer = 0;
    nav.previousDistance = currentDistance;
    nav.lastX = enemy.x;
    nav.lastY = enemy.y;
    if (stuck) {
      nav.stuckRecoveries += 1;
      nav.replanIn = 0;
    }
  }

  if (clearDirect && !stuck) {
    resetEnemyNavigation(enemy);
    return { target, direct: true, stuck: false, waypoints: 0 };
  }

  while (nav.waypoints.length > 0 && distance(current, nav.waypoints[0]) <= Math.max(WAYPOINT_REACH, radius + 8)) {
    nav.waypoints.shift();
  }

  const wantsReplan = nav.waypoints.length === 0
    || nav.replanIn <= 0
    || targetMoved
    || stuck
    || nav.blockedTime > 0.42;

  // `targetMoved` compares against the same player position for every enemy, so
  // the whole wave crossed the threshold on one tick and ran Dijkstra together —
  // measured at 10.2ms in a single 8.33ms step, felt as a hitch while moving.
  // A shared per-tick budget spreads those replans over consecutive ticks.
  // Only a stuck enemy skips the budget. An enemy that has merely consumed its
  // route still steers straight at the target in the meantime (see the return
  // below), so deferring it by a tick or two costs nothing but removes the
  // bunching — several enemies exhaust their waypoints on the same tick.
  const mustReplan = stuck;
  const budget = context.replanBudget;
  const allowed = mustReplan || !budget || budget.remaining > 0;

  if (wantsReplan && allowed) {
    if (budget && !mustReplan) budget.remaining -= 1;
    const path = findNavigationPath({
      start: current,
      target,
      obstacles,
      bounds,
      radius,
      preferredSide: nav.side,
      waypoints,
    });
    if (path) {
      nav.waypoints = path.points.slice(0, -1);
      nav.routeTarget = { x: target.x, y: target.y };
      nav.replanIn = REPLAN_INTERVAL;
      nav.side = path.side || nav.side;
      nav.blockedTime = 0;
    } else {
      nav.replanIn = 0.16;
    }
  } else if (wantsReplan) {
    // Deferred: retry next tick rather than waiting out the full interval.
    nav.replanIn = 0;
  }

  const waypoint = nav.waypoints[0];
  return {
    target: waypoint || target,
    direct: false,
    stuck,
    waypoints: nav.waypoints.length,
  };
}

// How many surviving candidates get a full route solve. Each solve is an
// O(n^2) Dijkstra, so this is the term that decides the whole function's cost.
const RANGED_ROUTE_SOLVES = 6;

export function findRangedAttackPoint({
  start,
  player,
  obstacles = [],
  bounds,
  radius = 0,
  minRange = 285,
  maxRange = 530,
  idealRange = 390,
  waypoints = null,
}) {
  // Reuse the caller's cached graph. Building it here, and then again inside
  // every per-candidate findNavigationPath call, made this function cost ~137ms
  // — about 73x a single path solve — and it ran whenever a sniper's lane was
  // blocked, which is a visible freeze rather than a slow frame.
  const navPoints = waypoints || buildNavigationWaypoints(obstacles, bounds, radius);
  const candidates = [...navPoints];
  const angles = [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4, Math.PI, 5 * Math.PI / 4, 3 * Math.PI / 2, 7 * Math.PI / 4];
  for (const range of [idealRange, minRange, maxRange]) {
    for (const angle of angles) {
      const point = {
        x: player.x + Math.cos(angle) * range,
        y: player.y + Math.sin(angle) * range,
      };
      if (bounds) {
        point.x = clamp(point.x, bounds.x + radius, bounds.x + bounds.w - radius);
        point.y = clamp(point.y, bounds.y + radius, bounds.y + bounds.h - radius);
      }
      candidates.push(point);
    }
  }

  // Cheap filters and a straight-line heuristic first, so the expensive route
  // solve only runs on the few candidates that could plausibly win.
  const viable = [];
  for (const candidate of candidates) {
    if (!isNavigationPointClear(candidate, obstacles, bounds, radius)) continue;
    const range = distance(candidate, player);
    if (range < minRange || range > maxRange) continue;
    if (!hasClearPath(candidate, player, obstacles, radius * 0.45, 4)) continue;
    viable.push({ candidate, heuristic: distance(start, candidate) + Math.abs(range - idealRange) * 0.85, range });
  }
  viable.sort((a, b) => a.heuristic - b.heuristic);

  let best = null;
  let bestScore = Infinity;
  for (const entry of viable.slice(0, RANGED_ROUTE_SOLVES)) {
    const route = findNavigationPath({
      start,
      target: entry.candidate,
      obstacles,
      bounds,
      radius,
      waypoints: navPoints,
    });
    if (!route) continue;
    const score = route.distance + Math.abs(entry.range - idealRange) * 0.85;
    if (score >= bestScore) continue;
    best = entry.candidate;
    bestScore = score;
  }
  return best;
}
