import {
  circleOverlap,
  circleRectOverlap,
  clamp,
  distance,
  normalize,
  pointInsideBounds,
} from './arena.js';
import { markEnemyNavigationBlocked } from './enemy-navigation.js';
import {
  GUARDIAN_PHASE_ORDER,
  GUARDIAN_PHASE_SECONDS,
  enemyScaleForWave,
} from './game-data.js';
import { OneBulletPolishRuntime } from './polish-runtime.js';
import { TOUCH_LAYOUT } from './ui-renderer.js';

export const MOVEMENT_HOTFIX_VERSION = '2.5.1-controls';

// Discretionary route replans allowed per simulation tick. A stuck enemy
// bypasses this, so the cap smooths cost without stalling anyone.
const NAV_REPLANS_PER_TICK = 4;
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
    // Shared per-tick pathfinding budget, reset once here so it is spent across
    // the whole wave rather than by whichever enemies update first.
    this.navReplanBudget = { remaining: NAV_REPLANS_PER_TICK };
    const enemies = this.enemies;
    for (let index = 0; index < enemies.length; index += 1) {
      const enemy = enemies[index];
      enemy.spawnTime = Math.max(0, enemy.spawnTime - dt);
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      // Presentation-only reveal timer for the health bar. Decayed here so it
      // follows the fixed simulation step rather than render cadence; it is
      // never read by gameplay.
      enemy.healthReveal = Math.max(0, (enemy.healthReveal || 0) - dt);
      enemy.staggerTime = Math.max(0, (enemy.staggerTime || 0) - dt);

      const physicsSpeed = Math.hypot(enemy.physicsVx || 0, enemy.physicsVy || 0);
      if (physicsSpeed > 0.1) {
        const moved = this.moveEnemyWithCollision(
          enemy,
          normalize(enemy.physicsVx || 0, enemy.physicsVy || 0),
          physicsSpeed * dt,
          dt,
        );
        if (!moved) {
          enemy.physicsVx *= -0.18;
          enemy.physicsVy *= -0.18;
          markEnemyNavigationBlocked(enemy, true, dt);
        }
        const damping = Math.pow(0.035, dt);
        enemy.physicsVx *= damping;
        enemy.physicsVy *= damping;
      }

      enemy.attackCooldown = Math.max(-1, (enemy.attackCooldown || 0) - dt);
      enemy.phase += dt * 2;
      const toPlayer = normalize(this.player.x - enemy.x, this.player.y - enemy.y);

      if (enemy.guardian) this.updateGuardian(enemy, toPlayer, scale, dt);
      else if (enemy.type === 'sniper') this.updateSniper(enemy, toPlayer, scale, dt);
      else if (enemy.type === 'charger') this.updateCharger(enemy, toPlayer, dt);
      else {
        const currentDistance = distance(enemy, this.player);
        const contactDistance = this.player.radius + enemy.radius;
        const baseOrbit = enemy.type === 'scout'
          ? 0.28 + Math.sin(enemy.phase) * 0.14
          : enemy.type === 'brute'
            ? 0.1
            : 0.18;
        const orbit = currentDistance <= contactDistance + 28 ? baseOrbit * 0.22 : baseOrbit;
        const pressure = currentDistance <= contactDistance ? 0.38 : 1;
        const control = enemy.staggerTime > 0 ? 0.35 : 1;
        this.steerEnemy(enemy, {
          x: toPlayer.x * pressure - toPlayer.y * orbit,
          y: toPlayer.y * pressure + toPlayer.x * orbit,
        }, dt, control, { behavior: 'pursuit', target: this.player });
      }

      this.constrainCombatCircle(enemy);
      const touchingPlayer = enemy.spawnTime <= 0 && circleOverlap(enemy, this.player, -2);
      if (touchingPlayer && enemy.attackCooldown <= 0) {
        this.damagePlayer(enemy.x, enemy.y);
        enemy.attackCooldown = enemy.type === 'brute' || enemy.type === 'warden' ? 1.05 : 0.72;
      }
    }
    this.separateEnemies();
  }

  /*
   * Sector Guardian behaviour.
   *
   * A three-state loop the player can learn: stalk (approach, guard open, the
   * window to punish) -> wind (stop, telegraph, guard sealed) -> strike (commit
   * along the telegraphed lane). Movement goes through steerEnemy and
   * moveEnemyWithCollision like every other enemy, so navigation and collision
   * are the proven ones, not a parallel implementation.
   */
  updateGuardian(enemy, toPlayer, scale, dt) {
    enemy.guardAngle = (enemy.guardAngle || 0) + (enemy.guardSpin || 0) * dt;
    enemy.phaseTimer = Math.max(0, (enemy.phaseTimer || 0) - dt);

    if (enemy.phaseTimer <= 0) {
      const next = GUARDIAN_PHASE_ORDER[
        (GUARDIAN_PHASE_ORDER.indexOf(enemy.phaseName) + 1) % GUARDIAN_PHASE_ORDER.length
      ];
      enemy.phaseName = next;
      enemy.phaseTimer = GUARDIAN_PHASE_SECONDS[next];
      if (next === 'wind') {
        // Lock the lane at the start of the telegraph so the attack is
        // dodgeable by reading it, not by reacting at the last instant.
        enemy.chargeDirection = { x: toPlayer.x, y: toPlayer.y };
        enemy.chargeTelegraph = GUARDIAN_PHASE_SECONDS.wind;
        this.audio?.play?.('guardian-phase');
      }
      if (next === 'strike') enemy.chargeTelegraph = 0;
      if (next === 'stalk') enemy.staggerTime = Math.max(enemy.staggerTime || 0, 0.35);
    }

    if (enemy.phaseName === 'wind') {
      enemy.chargeTelegraph = enemy.phaseTimer;
      return; // Planted: the telegraph is the whole point of this phase.
    }

    if (enemy.phaseName === 'strike') {
      const lane = enemy.chargeDirection?.x || enemy.chargeDirection?.y
        ? enemy.chargeDirection
        : toPlayer;
      this.steerEnemy(enemy, lane, dt, 2.4, { behavior: 'direct', target: this.player });
      return;
    }

    // Stalk. Evasive guardians strafe hard so they cannot simply be led.
    const strafe = enemy.evasive ? Math.sin(enemy.phase * 1.6) * 0.85 : 0.25;
    this.steerEnemy(enemy, {
      x: toPlayer.x - toPlayer.y * strafe,
      y: toPlayer.y + toPlayer.x * strafe,
    }, dt, 1, { behavior: 'pursuit', target: this.player });
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
