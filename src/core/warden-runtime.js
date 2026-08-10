import { clamp, normalize } from '../arena.js';
import { RELEASE_VERSION } from '../release.js';
import { UI_COLORS, label, polygon, progressBar } from '../ui-renderer.js';
import { OneBulletCheckpointRuntime } from './checkpoint-runtime.js';
import { GAME_EVENTS } from './game-events.js';

export const WARDEN_RUNTIME_VERSION = '3.1.0-a-warden';
export const WARDEN_GUARD_MAX = 2;
export const WARDEN_GUARD_BREAK_SECONDS = 3.2;
export const WARDEN_FRONT_DOT = 0.32;

export function wardenHitZone(guardAngle, sourceX, sourceY, threshold = WARDEN_FRONT_DOT) {
  const source = normalize(Number(sourceX) || 0, Number(sourceY) || 0);
  if (!source.x && !source.y) return 'flank';
  const guardX = Math.cos(Number(guardAngle) || 0);
  const guardY = Math.sin(Number(guardAngle) || 0);
  return guardX * source.x + guardY * source.y >= threshold ? 'front' : 'flank';
}

export function reflectAgainstGuard(vx, vy, guardAngle) {
  const normal = { x: Math.cos(guardAngle), y: Math.sin(guardAngle) };
  const speed = Math.max(1, Math.hypot(vx, vy));
  const dot = vx * normal.x + vy * normal.y;
  let reflectedX = vx - 2 * dot * normal.x;
  let reflectedY = vy - 2 * dot * normal.y;
  if (dot >= 0 || Math.hypot(reflectedX, reflectedY) < 1) {
    reflectedX = normal.x * speed;
    reflectedY = normal.y * speed;
  }
  const direction = normalize(reflectedX, reflectedY);
  return { x: direction.x * speed, y: direction.y * speed };
}

export class OneBulletWardenRuntime extends OneBulletCheckpointRuntime {
  constructor(canvas, liveRegion = null) {
    super(canvas, liveRegion);
    this.wardenRuntimeVersion = WARDEN_RUNTIME_VERSION;
  }

  spawnEnemy(type, index = 0, options = {}) {
    const enemy = super.spawnEnemy(type, index, options);
    if (!enemy || enemy.type !== 'warden') return enemy;

    enemy.guardAngle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
    enemy.guardStrength = WARDEN_GUARD_MAX;
    enemy.guardMax = WARDEN_GUARD_MAX;
    enemy.guardBrokenTimer = 0;
    enemy.guardFlash = 0;
    enemy.guardBlocks = 0;
    return enemy;
  }

  update(dt) {
    const safeDt = Math.max(0, Number(dt) || 0);
    super.update(safeDt);

    for (const enemy of this.enemies) {
      if (enemy.type !== 'warden') continue;

      enemy.guardFlash = Math.max(0, (enemy.guardFlash || 0) - safeDt * 3.6);
      if (enemy.guardBrokenTimer > 0) {
        const previous = enemy.guardBrokenTimer;
        enemy.guardBrokenTimer = Math.max(0, enemy.guardBrokenTimer - safeDt);
        if (previous > 0 && enemy.guardBrokenTimer <= 0) {
          enemy.guardStrength = enemy.guardMax || WARDEN_GUARD_MAX;
          enemy.guardFlash = 0.75;
          this.createRing(enemy.x, enemy.y, UI_COLORS.electric, 72);
          this.emitGameEvent(GAME_EVENTS.WARDEN_GUARD_RESTORED, {
            enemyId: enemy.id,
            guardStrength: enemy.guardStrength,
          });
        }
      }

      const target = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
      const current = Number(enemy.guardAngle) || 0;
      const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
      const turn = clamp(delta, -safeDt * 2.15, safeDt * 2.15);
      enemy.guardAngle = current + turn;
    }
  }

  damageEnemy(enemy, damage, fromBullet = false) {
    if (!this.enemies.includes(enemy)) return undefined;
    if (enemy.type !== 'warden' || !fromBullet || enemy.guardBrokenTimer > 0) {
      return super.damageEnemy(enemy, damage, fromBullet);
    }

    const sourceX = this.bullet.x - enemy.x;
    const sourceY = this.bullet.y - enemy.y;
    const zone = wardenHitZone(enemy.guardAngle, sourceX, sourceY);
    if (zone !== 'front') {
      const flankDamage = damage * 1.2;
      this.addFloatingText(enemy.x, enemy.y - enemy.radius - 28, 'FLANK ×1.2', UI_COLORS.success);
      this.setFeedbackCallout('WARDEN FLANKED', 'GUARD BYPASSED', UI_COLORS.success, 0.68);
      return super.damageEnemy(enemy, flankDamage, fromBullet);
    }

    const chargedImpact = this.precisionShotActive || this.bankLevel >= 2 || this.overdriveTimer > 0;
    const guardDamage = chargedImpact ? 2 : 1;
    enemy.guardStrength = Math.max(0, (enemy.guardStrength ?? WARDEN_GUARD_MAX) - guardDamage);
    enemy.guardFlash = 1;
    enemy.guardBlocks = (enemy.guardBlocks || 0) + 1;

    this.reflectWardenBlock(enemy);
    this.onRicochet();
    this.bullet.hitEnemyIds.add(enemy.id);
    this.createRing(enemy.x, enemy.y, UI_COLORS.electric, 62);
    this.addFloatingText(enemy.x, enemy.y - enemy.radius - 25, chargedImpact ? 'GUARD -2' : 'BLOCKED', UI_COLORS.electric);
    this.hitStopTimer = Math.max(this.hitStopTimer, this.reducedMotion ? 0 : 0.035);
    this.shake = Math.max(this.shake, this.reducedMotion ? 0 : 4.2);
    this.feedbackEvents.push({
      type: 'warden-block',
      x: enemy.x,
      y: enemy.y,
      angle: enemy.guardAngle,
      color: UI_COLORS.electric,
      life: 0.34,
      maxLife: 0.34,
    });
    this.emitGameEvent(GAME_EVENTS.WARDEN_GUARD_BLOCKED, {
      enemyId: enemy.id,
      guardDamage,
      guardStrength: enemy.guardStrength,
      chargedImpact,
      bankLevel: this.bankLevel,
    });

    if (enemy.guardStrength <= 0) {
      enemy.guardBrokenTimer = WARDEN_GUARD_BREAK_SECONDS;
      this.createRing(enemy.x, enemy.y, UI_COLORS.danger, 94);
      this.setFeedbackCallout('WARDEN GUARD BROKEN', 'ATTACK FROM ANY ANGLE', UI_COLORS.danger, 1.05);
      this.emitGameEvent(GAME_EVENTS.WARDEN_GUARD_BROKEN, {
        enemyId: enemy.id,
        brokenSeconds: WARDEN_GUARD_BREAK_SECONDS,
      });
    } else {
      this.setFeedbackCallout('WARDEN BLOCK', 'FLANK OR BREAK THE GUARD', UI_COLORS.electric, 0.72);
    }
    return false;
  }

  reflectWardenBlock(enemy) {
    const reflected = reflectAgainstGuard(this.bullet.vx, this.bullet.vy, enemy.guardAngle);
    const minimumSpeed = Math.max(620, Math.hypot(reflected.x, reflected.y));
    const direction = normalize(reflected.x, reflected.y);
    this.bullet.vx = direction.x * minimumSpeed;
    this.bullet.vy = direction.y * minimumSpeed;
    const guard = { x: Math.cos(enemy.guardAngle), y: Math.sin(enemy.guardAngle) };
    const distance = enemy.radius + this.bullet.radius + 14;
    this.bullet.x = enemy.x + guard.x * distance;
    this.bullet.y = enemy.y + guard.y * distance;
  }

  drawEnemyBody(enemy) {
    if (enemy.type !== 'warden') {
      super.drawEnemyBody(enemy);
      return;
    }

    const ctx = this.ctx;
    const radius = enemy.radius;
    const active = enemy.guardBrokenTimer <= 0;
    const bodyColor = enemy.hitFlash > 0 ? UI_COLORS.text : '#67ddff';
    const shieldColor = active ? UI_COLORS.electric : UI_COLORS.danger;
    const spawnScale = Math.max(0.2, 1 - enemy.spawnTime * 0.65);

    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.scale(spawnScale, spawnScale);
    ctx.rotate(enemy.guardAngle || 0);

    ctx.fillStyle = '#0b1830';
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = bodyColor;
    ctx.shadowBlur = 0;
    polygon(ctx, 6, radius + 2, Math.PI / 6);
    ctx.fill();
    ctx.stroke();

    ctx.globalAlpha = 0.46;
    ctx.lineWidth = 2;
    polygon(ctx, 6, radius * 0.63, Math.PI / 6);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = active ? '#d8fbff' : '#ffb2bf';
    ctx.shadowColor = shieldColor;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(5, radius * 0.27), 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = shieldColor;
    ctx.lineWidth = active ? 6 : 3;
    ctx.shadowColor = shieldColor;
    ctx.shadowBlur = 0;
    if (!active) ctx.setLineDash([7, 7]);
    ctx.beginPath();
    ctx.arc(0, 0, radius + 11, -0.78, 0.78);
    ctx.stroke();
    ctx.setLineDash([]);

    for (let index = -1; index <= 1; index += 1) {
      const angle = index * 0.56;
      const inner = radius + 5;
      const outer = radius + 15;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawEnemyHealth(enemy) {
    if (enemy.type !== 'warden') {
      super.drawEnemyHealth(enemy);
      return;
    }

    const width = enemy.radius * 2.35;
    const x = enemy.x - width / 2;
    const y = enemy.y + enemy.radius + 12;
    progressBar(this.ctx, x, y, width, 5, Math.max(0, enemy.health / enemy.maxHealth), '#dffaff', 'rgba(0,0,0,0.58)');
    const guardRatio = enemy.guardBrokenTimer > 0
      ? 0
      : Math.max(0, (enemy.guardStrength || 0) / (enemy.guardMax || WARDEN_GUARD_MAX));
    progressBar(this.ctx, x, y + 8, width, 3, guardRatio, UI_COLORS.electric, 'rgba(0,0,0,0.5)');
  }

  drawEnemyTelegraph(enemy) {
    if (enemy.type !== 'warden') {
      super.drawEnemyTelegraph(enemy);
      return;
    }

    const ctx = this.ctx;
    const active = enemy.guardBrokenTimer <= 0;
    const pulse = 0.35 + (Math.sin(this.elapsed * 8 + enemy.id) + 1) * 0.16;

    ctx.save();
    if (active && enemy.guardFlash > 0) {
      ctx.globalAlpha = clamp(enemy.guardFlash, 0, 1);
      ctx.strokeStyle = UI_COLORS.electric;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      const reach = enemy.radius + 20 + (1 - enemy.guardFlash) * 12;
      ctx.beginPath();
      ctx.moveTo(enemy.x - reach, enemy.y - 18);
      ctx.lineTo(enemy.x - reach, enemy.y + 18);
      ctx.moveTo(enemy.x + reach, enemy.y - 18);
      ctx.lineTo(enemy.x + reach, enemy.y + 18);
      ctx.stroke();
    }

    if (!active) {
      ctx.globalAlpha = 0.65 + pulse;
      ctx.strokeStyle = UI_COLORS.danger;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(enemy.x - enemy.radius - 12, enemy.y - 10);
      ctx.lineTo(enemy.x - enemy.radius - 12, enemy.y + 10);
      ctx.moveTo(enemy.x + enemy.radius + 12, enemy.y - 10);
      ctx.lineTo(enemy.x + enemy.radius + 12, enemy.y + 10);
      ctx.stroke();
      label(ctx, `${enemy.guardBrokenTimer.toFixed(1)}s`, enemy.x, enemy.y - enemy.radius - 17, 9, UI_COLORS.danger, 900);
    }
    ctx.restore();
  }

  getSnapshot() {
    const wardens = this.enemies.filter((enemy) => enemy.type === 'warden');
    return {
      ...super.getSnapshot(),
      releaseVersion: RELEASE_VERSION,
      wardenRuntimeVersion: WARDEN_RUNTIME_VERSION,
      wardenEnemyActive: true,
      wardenUnlockWave: 7,
      wardenCount: wardens.length,
      wardenGuardStates: wardens.map((enemy) => ({
        id: enemy.id,
        guardStrength: enemy.guardStrength,
        guardBrokenTimer: Number((enemy.guardBrokenTimer || 0).toFixed(3)),
        guardBlocks: enemy.guardBlocks || 0,
      })),
    };
  }
}
