import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from './simple-data.js';

const STAGES = Object.freeze([
  {
    id: 0,
    name: 'الساحة الأساسية',
    startsAtWave: 1,
    bounds: { x: 310, y: 155, w: 660, h: 410 },
    obstacles: [
      { x: 462, y: 255, w: 54, h: 210 },
      { x: 764, y: 255, w: 54, h: 210 },
    ],
  },
  {
    id: 1,
    name: 'فتح الجناحين',
    startsAtWave: 3,
    bounds: { x: 120, y: 155, w: 1040, h: 410 },
    obstacles: [
      { x: 365, y: 255, w: 54, h: 210 },
      { x: 861, y: 255, w: 54, h: 210 },
      { x: 590, y: 205, w: 100, h: 52 },
      { x: 590, y: 463, w: 100, h: 52 },
    ],
  },
  {
    id: 2,
    name: 'فتح الممرات الخارجية',
    startsAtWave: 6,
    bounds: { x: 120, y: 65, w: 1040, h: 590 },
    obstacles: [
      { x: 365, y: 255, w: 54, h: 210 },
      { x: 861, y: 255, w: 54, h: 210 },
      { x: 555, y: 155, w: 170, h: 48 },
      { x: 555, y: 517, w: 170, h: 48 },
      { x: 185, y: 318, w: 110, h: 46 },
      { x: 985, y: 318, w: 110, h: 46 },
    ],
  },
  {
    id: 3,
    name: 'الساحة الكاملة',
    startsAtWave: 9,
    bounds: { x: 24, y: 24, w: 1232, h: 672 },
    obstacles: [
      { x: 300, y: 188, w: 58, h: 180 },
      { x: 922, y: 352, w: 58, h: 180 },
      { x: 498, y: 118, w: 150, h: 48 },
      { x: 632, y: 554, w: 150, h: 48 },
      { x: 120, y: 482, w: 132, h: 46 },
      { x: 1028, y: 192, w: 132, h: 46 },
    ],
  },
]);

const TOUCH_SAFE_ZONES = Object.freeze([
  { id: 'move', x: 92, y: 628, radius: 88 },
  { id: 'dash', x: WIDTH - 92, y: HEIGHT - 92, radius: 72 },
  { id: 'recall', x: WIDTH - 92, y: HEIGHT - 222, radius: 64 },
  { id: 'pause', x: WIDTH - 220, y: HEIGHT - 92, radius: 57 },
]);

export function arenaStageForWave(wave) {
  const safeWave = Math.max(1, Math.trunc(Number(wave) || 1));
  let stage = STAGES[0];
  for (const candidate of STAGES) {
    if (safeWave >= candidate.startsAtWave) stage = candidate;
  }
  return cloneStage(stage);
}

export function touchControlSafeZones() {
  return TOUCH_SAFE_ZONES.map((zone) => ({ ...zone }));
}

export function installExpandingArena(game) {
  const originalResetRun = game.resetRun.bind(game);
  const originalSpawnNextWave = game.spawnNextWave.bind(game);
  const originalUpdatePlayer = game.updatePlayer.bind(game);
  const originalUpdateEnemies = game.updateEnemies.bind(game);
  const originalUpdateEnemyShots = game.updateEnemyShots.bind(game);
  const originalDrawArena = game.drawArena.bind(game);
  const originalGetSnapshot = game.getSnapshot.bind(game);

  game.resetRun = function resetRunWithArenaProgression() {
    originalResetRun();
    applyStage(this, arenaStageForWave(1));
  };

  game.spawnNextWave = function spawnNextWaveWithArenaProgression() {
    const nextWave = this.wave + 1;
    const previousStageId = this.arenaStage?.id ?? arenaStageForWave(Math.max(1, this.wave)).id;
    const nextStage = arenaStageForWave(nextWave);
    applyStage(this, nextStage);
    originalSpawnNextWave();
    if (nextStage.id > previousStageId) {
      this.banner = {
        title: `الموجة ${this.wave}`,
        subtitle: `${nextStage.name} — المساحة اتفتحت تلقائيًا`,
        time: 2.1,
      };
      this.createRing(WIDTH / 2, HEIGHT / 2, '#62f3ff', 210);
    }
  };

  game.findSpawnPoint = function findSpawnPointInsideUnlockedArena(seed = 0) {
    const bounds = this.arenaStage.bounds;
    const padding = 64;
    const left = bounds.x + padding;
    const right = bounds.x + bounds.w - padding;
    const top = bounds.y + padding;
    const bottom = bounds.y + bounds.h - padding;
    const centerX = bounds.x + bounds.w / 2;
    const centerY = bounds.y + bounds.h / 2;
    const positions = [
      { x: left, y: top },
      { x: right, y: top },
      { x: left, y: bottom },
      { x: right, y: bottom },
      { x: centerX, y: top },
      { x: centerX, y: bottom },
      { x: left, y: centerY },
      { x: right, y: centerY },
      { x: left + bounds.w * 0.24, y: top },
      { x: right - bounds.w * 0.24, y: bottom },
      { x: right - bounds.w * 0.24, y: top },
      { x: left + bounds.w * 0.24, y: bottom },
    ];
    for (let attempt = 0; attempt < positions.length; attempt += 1) {
      const point = positions[(seed + attempt + this.wave) % positions.length];
      if (distance(point, this.player) <= 220) continue;
      if (this.arena.obstacles.some((obstacle) => circleRectOverlap({ ...point, radius: 34 }, obstacle))) continue;
      if (this.touchMode && overlapsTouchZone({ ...point, radius: 34 })) continue;
      return { ...point };
    }
    const fallback = { x: centerX, y: top };
    if (this.touchMode) resolveTouchSafeZones(fallback);
    return fallback;
  };

  game.updatePlayer = function updatePlayerInsideUnlockedArena(dt) {
    originalUpdatePlayer(dt);
    clampEntityToBounds(this.player, this.arenaStage.bounds);
    this.resolveObstacle(this.player);
    if (this.touchMode) resolveTouchSafeZones(this.player);
    clampEntityToBounds(this.player, this.arenaStage.bounds);
  };

  game.updateEnemies = function updateEnemiesInsideUnlockedArena(dt) {
    originalUpdateEnemies(dt);
    for (const enemy of this.enemies) {
      clampEntityToBounds(enemy, this.arenaStage.bounds);
      this.resolveObstacle(enemy);
      if (this.touchMode) resolveTouchSafeZones(enemy);
      clampEntityToBounds(enemy, this.arenaStage.bounds);
    }
  };

  game.updateEnemyShots = function updateEnemyShotsInsideUnlockedArena(dt) {
    originalUpdateEnemyShots(dt);
    const bounds = this.arenaStage.bounds;
    this.enemyShots = this.enemyShots.filter((shot) => pointInsideBounds(shot, bounds, 28));
  };

  game.handleOuterRicochet = function handleUnlockedArenaRicochet() {
    const bounds = this.arenaStage.bounds;
    const minX = bounds.x + this.bullet.radius;
    const maxX = bounds.x + bounds.w - this.bullet.radius;
    const minY = bounds.y + this.bullet.radius;
    const maxY = bounds.y + bounds.h - this.bullet.radius;
    let bounced = false;
    if (this.bullet.x <= minX || this.bullet.x >= maxX) {
      this.bullet.x = clamp(this.bullet.x, minX, maxX);
      this.bullet.vx *= -1;
      bounced = true;
    }
    if (this.bullet.y <= minY || this.bullet.y >= maxY) {
      this.bullet.y = clamp(this.bullet.y, minY, maxY);
      this.bullet.vy *= -1;
      bounced = true;
    }
    if (bounced) this.onRicochet();
  };

  game.drawArena = function drawExpandingArena() {
    originalDrawArena();
    if (['menu', 'howto'].includes(this.state)) return;
    drawLockedSpace(this.ctx, this.arenaStage.bounds);
    drawUnlockedBorder(this.ctx, this.arenaStage.bounds, this.elapsed);
  };

  game.getSnapshot = function getSnapshotWithArenaProgression() {
    return {
      ...originalGetSnapshot(),
      arenaStage: this.arenaStage.id,
      arenaName: this.arenaStage.name,
      arenaBounds: { ...this.arenaStage.bounds },
      arenaFullyUnlocked: this.arenaStage.id === STAGES.length - 1,
      arenaProgressionAutomatic: true,
      puzzleObjectivesPresent: false,
      touchSafeZones: this.touchMode ? touchControlSafeZones() : [],
    };
  };

  applyStage(game, arenaStageForWave(Math.max(1, game.wave || 1)));
}

function applyStage(game, stage) {
  game.arenaStage = cloneStage(stage);
  game.arena = {
    obstacles: stage.obstacles.map((obstacle) => ({ ...obstacle })),
  };
  clampEntityToBounds(game.player, game.arenaStage.bounds);
  if (game.touchMode) resolveTouchSafeZones(game.player);
  if (game.bullet?.held) {
    game.bullet.x = game.player.x;
    game.bullet.y = game.player.y;
  }
}

function cloneStage(stage) {
  return {
    ...stage,
    bounds: { ...stage.bounds },
    obstacles: stage.obstacles.map((obstacle) => ({ ...obstacle })),
  };
}

function clampEntityToBounds(entity, bounds) {
  if (!entity) return;
  const radius = Math.max(0, Number(entity.radius) || 0);
  entity.x = clamp(entity.x, bounds.x + radius, bounds.x + bounds.w - radius);
  entity.y = clamp(entity.y, bounds.y + radius, bounds.y + bounds.h - radius);
}

function resolveTouchSafeZones(entity) {
  if (!entity) return;
  for (const zone of TOUCH_SAFE_ZONES) {
    const radius = Math.max(0, Number(entity.radius) || 0);
    const minimumDistance = zone.radius + radius;
    let dx = entity.x - zone.x;
    let dy = entity.y - zone.y;
    let currentDistance = Math.hypot(dx, dy);
    if (currentDistance >= minimumDistance) continue;
    if (currentDistance < 0.001) {
      dx = WIDTH / 2 - zone.x;
      dy = HEIGHT / 2 - zone.y;
      currentDistance = Math.hypot(dx, dy) || 1;
    }
    entity.x = zone.x + dx / currentDistance * minimumDistance;
    entity.y = zone.y + dy / currentDistance * minimumDistance;
  }
}

function overlapsTouchZone(entity) {
  return TOUCH_SAFE_ZONES.some((zone) => distance(entity, zone) < zone.radius + (entity.radius || 0));
}

function pointInsideBounds(point, bounds, margin = 0) {
  return point.x >= bounds.x - margin
    && point.x <= bounds.x + bounds.w + margin
    && point.y >= bounds.y - margin
    && point.y <= bounds.y + bounds.h + margin;
}

function drawLockedSpace(ctx, bounds) {
  ctx.save();
  ctx.fillStyle = 'rgba(1, 3, 10, 0.92)';
  ctx.fillRect(0, 0, WIDTH, bounds.y);
  ctx.fillRect(0, bounds.y + bounds.h, WIDTH, HEIGHT - bounds.y - bounds.h);
  ctx.fillRect(0, bounds.y, bounds.x, bounds.h);
  ctx.fillRect(bounds.x + bounds.w, bounds.y, WIDTH - bounds.x - bounds.w, bounds.h);
  ctx.restore();
}

function drawUnlockedBorder(ctx, bounds, elapsed) {
  ctx.save();
  const pulse = 0.58 + Math.sin(elapsed * 3.2) * 0.14;
  ctx.strokeStyle = `rgba(98, 243, 255, ${pulse})`;
  ctx.shadowColor = '#62f3ff';
  ctx.shadowBlur = 14;
  ctx.lineWidth = 4;
  ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
  ctx.restore();
}

function circleRectOverlap(circle, rect) {
  const nearestX = clamp(circle.x, rect.x, rect.x + rect.w);
  const nearestY = clamp(circle.y, rect.y, rect.y + rect.h);
  return (circle.x - nearestX) ** 2 + (circle.y - nearestY) ** 2 <= (circle.radius || 0) ** 2;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
