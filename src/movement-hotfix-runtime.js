import {
  circleOverlap,
  circleRectOverlap,
  clamp,
  normalize,
  pointInsideBounds,
} from './arena.js';
import { enemyScaleForWave } from './game-data.js';
import { OneBulletPolishRuntime } from './polish-runtime.js';
import { TOUCH_LAYOUT } from './ui-renderer.js';

export const MOVEMENT_HOTFIX_VERSION = '2.5.1-controls';

const TOUCH_DEAD_ZONE = 10;
const TOUCH_MAX_RADIUS = 72;
const OVERLAP_EPSILON = 0.0001;

export function analogMovementVector(keys = new Set(), touchMove = null) {
  const keyboardX = Number(keys.has('d') || keys.has('arrowright'))
    - Number(keys.has('a') || keys.has('arrowleft'));
  const keyboardY = Number(keys.has('s') || keys.has('arrowdown'))
    - Number(keys.has('w') || keys.has('arrowup'));
  const keyboard = normalize(keyboardX, keyboardY);

  if (!touchMove) return keyboard;

  const dx = clamp(Number(touchMove.x) - Number(touchMove.originX), -TOUCH_MAX_RADIUS, TOUCH_MAX_RADIUS);
  const dy = clamp(Number(touchMove.y) - Number(touchMove.originY), -TOUCH_MAX_RADIUS, TOUCH_MAX_RADIUS);
  const distance = Math.hypot(dx, dy);
  const magnitude = clamp(
    (distance - TOUCH_DEAD_ZONE) / (TOUCH_MAX_RADIUS - TOUCH_DEAD_ZONE),
    0,
    1,
  );
  const touchDirection = normalize(dx, dy);
  const combinedX = keyboard.x + touchDirection.x * magnitude;
  const combinedY = keyboard.y + touchDirection.y * magnitude;
  const combinedLength = Math.hypot(combinedX, combinedY);

  if (combinedLength > 1) {
    return { x: combinedX / combinedLength, y: combinedY / combinedLength };
  }
  return { x: combinedX, y: combinedY };
}

function deterministicPairDirection(first, second, firstIndex, secondIndex) {
  const firstId = Math.trunc(Number(first?.id) || firstIndex + 1);
  const secondId = Math.trunc(Number(second?.id) || secondIndex + 1);
  const hash = ((firstId * 73856093) ^ (secondId * 19349663)) >>> 0;
  const angle = (hash % 360) * Math.PI / 180;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

export function separateOverlappingEnemies(enemies = [], constrain = () => {}) {
  let resolvedPairs = 0;
  for (let i = 0; i < enemies.length; i += 1) {
    for (let j = i + 1; j < enemies.length; j += 1) {
      const first = enemies[i];
      const second = enemies[j];
      let dx = second.x - first.x;
      let dy = second.y - first.y;
      let length = Math.hypot(dx, dy);
      const minimum = first.radius + second.radius + 4;
      if (length >= minimum) continue;

      let directionX;
      let directionY;
      if (length <= OVERLAP_EPSILON) {
        const fallback = deterministicPairDirection(first, second, i, j);
        directionX = fallback.x;
        directionY = fallback.y;
        length = 0;
      } else {
        directionX = dx / length;
        directionY = dy / length;
      }

      const push = (minimum - length) * 0.5;
      first.x -= directionX * push;
      first.y -= directionY * push;
      second.x += directionX * push;
      second.y += directionY * push;
      constrain(first);
      constrain(second);
      resolvedPairs += 1;
    }
  }
  return resolvedPairs;
}

export class OneBulletMovementHotfixRuntime extends OneBulletPolishRuntime {
  constructor(canvas, liveRegion = null) {
    super(canvas, liveRegion);
    this.movementHotfixVersion = MOVEMENT_HOTFIX_VERSION;
  }

  movementDirection() {
    return analogMovementVector(this.keys, this.touchMove);
  }

  updateEnemies(dt) {
    const scale = enemyScaleForWave(this.wave);
    const enemies = this.enemies;
    for (let index = 0; index < enemies.length; index += 1) {
      const enemy = enemies[index];
      enemy.spawnTime = Math.max(0, enemy.spawnTime - dt);
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      enemy.attackCooldown -= dt;
      enemy.phase += dt * 2;
      const toPlayer = normalize(this.player.x - enemy.x, this.player.y - enemy.y);

      if (enemy.type === 'sniper') this.updateSniper(enemy, toPlayer, scale, dt);
      else if (enemy.type === 'charger') this.updateCharger(enemy, toPlayer, dt);
      else {
        const orbit = enemy.type === 'scout' ? Math.sin(enemy.phase) * 0.18 : 0;
        enemy.x += (toPlayer.x - toPlayer.y * orbit) * enemy.speed * dt;
        enemy.y += (toPlayer.y + toPlayer.x * orbit) * enemy.speed * dt;
      }
      this.constrainCombatCircle(enemy);
      if (enemy.spawnTime <= 0 && circleOverlap(enemy, this.player, -2)) this.damagePlayer(enemy.x, enemy.y);
    }
    this.separateEnemies();
  }

  separateEnemies() {
    return separateOverlappingEnemies(this.enemies, (enemy) => this.constrainCombatCircle(enemy));
  }

  updateEnemyShots(dt) {
    const shots = this.enemyShots;
    let write = 0;
    for (let read = 0; read < shots.length; read += 1) {
      const shot = shots[read];
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      shot.life -= dt;
      if (this.arenaStage.obstacles.some((rect) => circleRectOverlap(shot, rect))) shot.life = 0;
      if (shot.life > 0 && circleOverlap(shot, this.player)) {
        shot.life = 0;
        this.damagePlayer(shot.x, shot.y);
      }
      if (shot.life > 0 && pointInsideBounds(shot, this.arenaStage.bounds, 20)) shots[write++] = shot;
    }
    shots.length = write;
  }

  update(dt) {
    if (this.hitStopTimer <= 0) {
      super.update(dt);
      return;
    }

    // Freeze the combat world for impact weight, but never freeze player input.
    this.impactFlash = Math.max(0, this.impactFlash - dt * 4.8);
    this.clearBannerTimer = Math.max(0, this.clearBannerTimer - dt);
    this.recallPulse = Math.max(0, this.recallPulse - dt * 2.2);
    this.muzzleFlash = Math.max(0, this.muzzleFlash - dt * 3.8);
    this.arenaExpansionPulse = Math.max(0, this.arenaExpansionPulse - dt * 0.75);
    this.hitStopTimer = Math.max(0, this.hitStopTimer - dt);
    this.elapsed += dt * 0.18;
    this.shake = Math.max(0, this.shake - dt * 34);

    this.tryDash();
    this.updatePlayer(dt);
    if (this.bullet.held) this.updateBullet(0);
    this.updateParticles(dt * 0.18);
    this.updateFloatingTexts(dt * 0.18);
  }

  drawTouchControls() {
    if (!this.touchMove) {
      super.drawTouchControls();
      return;
    }

    const originalTouchMove = this.touchMove;
    this.touchMove = {
      ...originalTouchMove,
      x: TOUCH_LAYOUT.move.x + (originalTouchMove.x - originalTouchMove.originX),
      y: TOUCH_LAYOUT.move.y + (originalTouchMove.y - originalTouchMove.originY),
    };
    super.drawTouchControls();
    this.touchMove = originalTouchMove;
  }

  getSnapshot() {
    return {
      ...super.getSnapshot(),
      movementHotfix: this.movementHotfixVersion,
      analogTouchMovement: true,
      responsiveMovementDuringHitStop: true,
      deterministicEnemySeparation: true,
      allocationReducedCombatLoops: true,
    };
  }
}
