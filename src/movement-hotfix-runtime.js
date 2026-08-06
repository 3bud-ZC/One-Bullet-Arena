import { clamp, normalize } from './arena.js';
import { OneBulletPolishRuntime } from './polish-runtime.js';
import { TOUCH_LAYOUT } from './ui-renderer.js';

export const MOVEMENT_HOTFIX_VERSION = '2.5.1-controls';

const TOUCH_DEAD_ZONE = 10;
const TOUCH_MAX_RADIUS = 72;

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

export class OneBulletMovementHotfixRuntime extends OneBulletPolishRuntime {
  constructor(canvas, liveRegion = null) {
    super(canvas, liveRegion);
    this.movementHotfixVersion = MOVEMENT_HOTFIX_VERSION;
  }

  movementDirection() {
    return analogMovementVector(this.keys, this.touchMove);
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
    };
  }
}
