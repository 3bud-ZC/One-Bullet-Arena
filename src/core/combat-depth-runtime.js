import { clamp, normalize } from '../arena.js';
import { comboFeedbackRank } from '../combat-feedback-runtime.js';
import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from '../game-data.js';
import { RELEASE_VERSION } from '../release.js';
import { UI_COLORS, label, progressBar, roundedRect } from '../ui-renderer.js';
import { OneBulletEventRuntime } from './event-runtime.js';
import { GAME_EVENTS } from './game-events.js';

export const COMBAT_DEPTH_VERSION = '2.9.0-combat';
export const MAX_MOMENTUM = 100;
export const OVERDRIVE_DURATION = 6.5;

export function perfectCatchEligible({ alignment = 0, dashing = false, recallDistance = 0 } = {}) {
  return Number(recallDistance) >= 160 && (Boolean(dashing) || Number(alignment) >= 0.42);
}

export function skillDamageMultiplier({
  precision = false,
  bankLevel = 0,
  overdrive = false,
  recallSeconds = 0,
} = {}) {
  const bankBonus = Math.min(0.3, Math.max(0, Number(bankLevel) || 0) * 0.06);
  const recallBonus = Math.min(0.35, Math.max(0, Number(recallSeconds) || 0) * 0.12);
  let multiplier = 1 + bankBonus + recallBonus;
  if (precision) multiplier *= 1.35;
  if (overdrive) multiplier *= 1.25;
  return multiplier;
}

export function momentumGainForAction(action, bankLevel = 0) {
  const gains = {
    ricochet: 6,
    hit: 4,
    kill: 10,
    'perfect-catch': 34,
    'long-recall': 10,
  };
  const base = gains[action] || 0;
  return base + (action === 'kill' ? Math.min(6, Math.max(0, Number(bankLevel) || 0) * 2) : 0);
}

export class OneBulletCombatDepthRuntime extends OneBulletEventRuntime {
  constructor(canvas, liveRegion = null) {
    super(canvas, liveRegion);
    this.combatDepthVersion = COMBAT_DEPTH_VERSION;
  }

  resetRun() {
    super.resetRun();
    this.momentum = 0;
    this.momentumIdleTimer = 0;
    this.overdriveTimer = 0;
    this.precisionCharge = 0;
    this.precisionShotActive = false;
    this.bankLevel = 0;
    this.bankTimer = 0;
    this.recallStartedAt = null;
    this.recallStartDistance = 0;
    this.catchAlignmentPeak = 0;
    this.catchWindowRatio = 0;
    this.skillPulse = 0;
    this.skillDamageContext = new Map();
    this.combatDepthStats = {
      perfectCatches: 0,
      precisionKills: 0,
      bankKills: 0,
      overdrives: 0,
    };
  }

  stack(id) {
    const base = super.stack(id);
    if (this.overdriveTimer <= 0) return base;
    if (id === 'magnetic-recall') return base + 2;
    if (id === 'quick-dash') return base + 1;
    if (id === 'bullet-velocity') return base + 2;
    return base;
  }

  update(dt) {
    const safeDt = Math.max(0, Number(dt) || 0);

    if (this.bullet.recalling && this.recallStartedAt !== null) {
      const dx = this.bullet.x - this.player.x;
      const dy = this.bullet.y - this.player.y;
      const bulletDistance = Math.hypot(dx, dy);
      const movement = this.movementDirection();
      const toBullet = normalize(dx, dy);
      const alignment = movement.x * toBullet.x + movement.y * toBullet.y;
      if (bulletDistance <= 230 && bulletDistance >= 18) {
        this.catchAlignmentPeak = Math.max(this.catchAlignmentPeak, alignment);
        this.catchWindowRatio = clamp(1 - Math.abs(bulletDistance - 105) / 125, 0, 1);
      }
    } else {
      this.catchWindowRatio = Math.max(0, this.catchWindowRatio - safeDt * 4);
    }

    super.update(safeDt);

    this.skillPulse = Math.max(0, this.skillPulse - safeDt * 2.8);
    this.bankTimer = Math.max(0, this.bankTimer - safeDt);
    if (this.bankTimer <= 0 && !this.bullet.held) this.bankLevel = 0;

    if (this.overdriveTimer > 0) {
      const previous = this.overdriveTimer;
      this.overdriveTimer = Math.max(0, this.overdriveTimer - safeDt);
      if (previous > 0 && this.overdriveTimer <= 0) this.endOverdrive();
    } else if (this.state === 'playing' && this.momentum > 0) {
      this.momentumIdleTimer += safeDt;
      if (this.momentumIdleTimer > 2.5) this.momentum = Math.max(0, this.momentum - safeDt * 3.5);
    }
  }

  fireBullet() {
    const usePrecision = this.precisionCharge > 0;
    const fired = super.fireBullet();
    if (!fired) return false;

    this.precisionShotActive = usePrecision;
    this.precisionCharge = 0;
    this.bankLevel = 0;
    this.bankTimer = 0;

    if (usePrecision) {
      this.bullet.vx *= 1.12;
      this.bullet.vy *= 1.12;
      this.skillPulse = 1;
      this.feedbackEvents.push({
        type: 'precision-shot',
        x: this.bullet.x,
        y: this.bullet.y,
        life: 0.42,
        maxLife: 0.42,
        color: UI_COLORS.bullet,
      });
      this.setFeedbackCallout('PRECISION SHOT', '35% DAMAGE CORE', UI_COLORS.bullet, 0.82);
      this.emitGameEvent(GAME_EVENTS.PRECISION_SHOT_FIRED, {
        speed: Number(Math.hypot(this.bullet.vx, this.bullet.vy).toFixed(2)),
      });
    }

    if (this.overdriveTimer > 0) {
      this.bullet.vx *= 1.1;
      this.bullet.vy *= 1.1;
    }
    return true;
  }

  recallBullet() {
    const recalled = super.recallBullet();
    if (!recalled) return false;
    this.recallStartedAt = this.runTime;
    this.recallStartDistance = Math.hypot(this.bullet.x - this.player.x, this.bullet.y - this.player.y);
    this.catchAlignmentPeak = 0;
    return true;
  }

  catchBullet() {
    const wasReturning = this.bullet.recalling;
    const recallSeconds = this.recallStartedAt === null ? 0 : Math.max(0, this.runTime - this.recallStartedAt);
    const recallDistance = this.recallStartDistance;
    const alignment = this.catchAlignmentPeak;
    const dashing = this.player.dashRemaining > 0;
    const perfect = wasReturning && perfectCatchEligible({ alignment, dashing, recallDistance });

    const result = super.catchBullet();

    this.precisionShotActive = false;
    this.bankLevel = 0;
    this.bankTimer = 0;
    this.recallStartedAt = null;
    this.recallStartDistance = 0;
    this.catchAlignmentPeak = 0;
    this.catchWindowRatio = 0;

    if (!wasReturning) return result;

    if (perfect) {
      this.precisionCharge = 1;
      this.combatDepthStats.perfectCatches += 1;
      this.addMomentum(momentumGainForAction('perfect-catch'));
      this.skillPulse = 1;
      this.feedbackEvents.push({
        type: 'perfect-catch',
        x: this.player.x,
        y: this.player.y,
        life: 0.58,
        maxLife: 0.58,
        color: UI_COLORS.success,
      });
      this.setFeedbackCallout('PERFECT CATCH', 'PRECISION SHOT READY', UI_COLORS.success, 1.05);
      this.emitGameEvent(GAME_EVENTS.PERFECT_CATCH, {
        alignment: Number(alignment.toFixed(3)),
        recallDistance: Number(recallDistance.toFixed(2)),
        recallSeconds: Number(recallSeconds.toFixed(3)),
        dashing,
      });
    } else if (recallDistance >= 320) {
      this.addMomentum(momentumGainForAction('long-recall'));
    }
    return result;
  }

  onRicochet() {
    const result = super.onRicochet();
    this.bankLevel = Math.min(5, this.bankLevel + 1);
    this.bankTimer = 1.8;
    this.addMomentum(momentumGainForAction('ricochet'));
    this.skillPulse = Math.max(this.skillPulse, 0.48);
    this.emitGameEvent(GAME_EVENTS.BANK_CHAINED, {
      bankLevel: this.bankLevel,
      bounceCount: this.bullet.bounceCount,
    });
    if (this.bankLevel === 3 || this.bankLevel === 5) {
      this.setFeedbackCallout(`BANK ×${this.bankLevel}`, 'DAMAGE VECTOR CHARGED', UI_COLORS.warning, 0.65);
    }
    return result;
  }

  currentBulletDamage() {
    const base = super.currentBulletDamage();
    const recallSeconds = this.bullet.recalling && this.recallStartedAt !== null
      ? Math.max(0, this.runTime - this.recallStartedAt)
      : 0;
    return base * skillDamageMultiplier({
      precision: this.precisionShotActive,
      bankLevel: this.bankLevel,
      overdrive: this.overdriveTimer > 0,
      recallSeconds,
    });
  }

  damageEnemy(enemy, damage, fromBullet = false) {
    if (!this.enemies.includes(enemy)) return;
    const context = fromBullet ? {
      precision: this.precisionShotActive,
      bankLevel: this.bankLevel,
      overdrive: this.overdriveTimer > 0,
      recalling: this.bullet.recalling,
    } : null;
    if (context) this.skillDamageContext.set(enemy.id, context);
    const healthBefore = enemy.health;
    const result = super.damageEnemy(enemy, damage, fromBullet);
    if (context) this.skillDamageContext.delete(enemy.id);

    if (fromBullet && healthBefore - damage > 0) {
      this.addMomentum(momentumGainForAction('hit'));
      if (context.precision || context.bankLevel >= 2) this.skillPulse = Math.max(this.skillPulse, 0.55);
    }
    return result;
  }

  killEnemy(enemy) {
    const existed = this.enemies.includes(enemy);
    const context = this.skillDamageContext.get(enemy.id) || null;
    const previousKills = this.stats.kills;
    const result = super.killEnemy(enemy);
    if (!existed || this.stats.kills <= previousKills) return result;

    const bankLevel = context?.bankLevel || 0;
    this.addMomentum(momentumGainForAction('kill', bankLevel));
    this.comboTimer = Math.max(this.comboTimer, 2.55 + bankLevel * 0.12);

    if (context?.precision) this.combatDepthStats.precisionKills += 1;
    if (bankLevel >= 2) {
      this.combatDepthStats.bankKills += 1;
      this.setFeedbackCallout(`BANK SHOT ×${bankLevel}`, `COMBO ×${this.combo}`, UI_COLORS.warning, 0.76);
    }
    return result;
  }

  damagePlayer(sourceX, sourceY) {
    const healthBefore = this.player.health;
    const shieldBefore = this.player.shield;
    const result = super.damagePlayer(sourceX, sourceY);
    const damaged = this.player.health < healthBefore;
    const blocked = shieldBefore > this.player.shield && !damaged;
    if (damaged || blocked) {
      this.precisionCharge = 0;
      if (this.overdriveTimer > 0) this.overdriveTimer = Math.max(0.5, this.overdriveTimer - (damaged ? 1.4 : 0.55));
      else this.momentum = Math.max(0, this.momentum - (damaged ? 24 : 8));
    }
    return result;
  }

  addMomentum(amount) {
    if (this.overdriveTimer > 0) return this.momentum;
    const comboMultiplier = 1 + Math.min(0.35, Math.max(0, this.combo) * 0.025);
    const gain = Math.max(0, Number(amount) || 0) * comboMultiplier;
    if (gain <= 0) return this.momentum;
    const previous = this.momentum;
    this.momentum = clamp(this.momentum + gain, 0, MAX_MOMENTUM);
    this.momentumIdleTimer = 0;
    this.emitGameEvent(GAME_EVENTS.MOMENTUM_CHANGED, {
      previous: Number(previous.toFixed(2)),
      current: Number(this.momentum.toFixed(2)),
      gain: Number((this.momentum - previous).toFixed(2)),
    });
    if (this.momentum >= MAX_MOMENTUM) this.activateOverdrive();
    return this.momentum;
  }

  activateOverdrive() {
    if (this.overdriveTimer > 0) return;
    this.overdriveTimer = OVERDRIVE_DURATION;
    this.momentum = MAX_MOMENTUM;
    this.precisionCharge = 1;
    this.combatDepthStats.overdrives += 1;
    this.skillPulse = 1;
    this.audio.play('upgrade');
    this.feedbackEvents.push({
      type: 'overdrive',
      x: WIDTH / 2,
      y: HEIGHT / 2,
      life: 0.9,
      maxLife: 0.9,
      color: UI_COLORS.violet,
    });
    this.setFeedbackCallout('OVERDRIVE', 'PRECISION CORE UNLEASHED', UI_COLORS.violet, 1.2);
    this.emitGameEvent(GAME_EVENTS.OVERDRIVE_STARTED, {
      duration: OVERDRIVE_DURATION,
    });
  }

  endOverdrive() {
    this.overdriveTimer = 0;
    this.momentum = 0;
    this.skillPulse = Math.max(this.skillPulse, 0.6);
    this.setFeedbackCallout('OVERDRIVE ENDED', 'REBUILD MOMENTUM', UI_COLORS.muted, 0.72);
    this.emitGameEvent(GAME_EVENTS.OVERDRIVE_ENDED, {});
  }

  drawComboMomentum() {
    if (this.state !== 'playing' || (this.wave === 1 && this.tutorialStep < 3)) return;
    const active = this.overdriveTimer > 0;
    const rank = comboFeedbackRank(this.combo);
    const ratio = active ? this.overdriveTimer / OVERDRIVE_DURATION : this.momentum / MAX_MOMENTUM;
    if (!active && ratio <= 0 && this.combo < 2 && !this.precisionCharge) return;

    const width = 330;
    const x = WIDTH / 2 - width / 2;
    const y = 78;
    const accent = active ? UI_COLORS.violet : this.precisionCharge ? UI_COLORS.success : rank.color;
    const title = active
      ? `OVERDRIVE ${this.overdriveTimer.toFixed(1)}s`
      : this.precisionCharge
        ? 'PRECISION READY'
        : `MOMENTUM ${Math.round(this.momentum)}%`;
    const comboText = this.combo >= 2 ? `${rank.code}  ×${this.combo}` : 'BUILD THE CHAIN';

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(3, 8, 20, 0.9)';
    this.ctx.strokeStyle = accent;
    this.ctx.lineWidth = 1.3;
    this.ctx.shadowColor = accent;
    this.ctx.shadowBlur = active ? 16 : 7;
    roundedRect(this.ctx, x, y, width, 28, 8);
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;
    label(this.ctx, title, x + 12, y + 17, 9, accent, 900, 'left');
    label(this.ctx, comboText, x + width - 12, y + 17, 9, rank.color, 900, 'right');
    progressBar(this.ctx, x + 8, y + 22, width - 16, 3, ratio, accent, 'rgba(255,255,255,0.06)');
    this.ctx.restore();
  }

  drawPlayer() {
    super.drawPlayer();
    if (this.state !== 'playing') return;
    const ctx = this.ctx;

    if (this.bullet.recalling && this.recallStartedAt !== null) {
      const color = this.catchAlignmentPeak >= 0.42 || this.player.dashRemaining > 0
        ? UI_COLORS.success
        : UI_COLORS.electric;
      ctx.save();
      ctx.globalAlpha = 0.28 + this.catchWindowRatio * 0.6;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2 + this.catchWindowRatio * 3;
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, 31 + this.catchWindowRatio * 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (this.precisionCharge > 0 || this.overdriveTimer > 0) {
      const color = this.overdriveTimer > 0 ? UI_COLORS.violet : UI_COLORS.success;
      ctx.save();
      ctx.globalAlpha = 0.55 + Math.sin(this.elapsed * 8) * 0.2;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, 35 + Math.sin(this.elapsed * 5) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawBullet() {
    super.drawBullet();
    if (this.bullet.held || (!this.precisionShotActive && this.overdriveTimer <= 0 && this.bankLevel <= 0)) return;
    const color = this.overdriveTimer > 0 ? UI_COLORS.violet : this.precisionShotActive ? UI_COLORS.success : UI_COLORS.warning;
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.lineWidth = 2.2;
    ctx.globalAlpha = 0.52 + Math.sin(this.elapsed * 13) * 0.18;
    ctx.beginPath();
    ctx.arc(this.bullet.x, this.bullet.y, 14 + this.bankLevel * 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawFeedbackEvents() {
    super.drawFeedbackEvents();
    const ctx = this.ctx;
    for (const event of this.feedbackEvents) {
      if (!['perfect-catch', 'precision-shot', 'overdrive'].includes(event.type)) continue;
      const ratio = clamp(event.life / event.maxLife, 0, 1);
      const age = 1 - ratio;
      ctx.save();
      ctx.globalAlpha = ratio;
      ctx.strokeStyle = event.color;
      ctx.shadowColor = event.color;
      ctx.shadowBlur = event.type === 'overdrive' ? 28 : 18;
      ctx.lineWidth = event.type === 'overdrive' ? 6 : 3;
      const rings = event.type === 'overdrive' ? 3 : 2;
      for (let index = 0; index < rings; index += 1) {
        ctx.beginPath();
        ctx.arc(event.x, event.y, 24 + index * 20 + age * (event.type === 'overdrive' ? 180 : 70), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  getSnapshot() {
    return {
      ...super.getSnapshot(),
      combatDepthVersion: COMBAT_DEPTH_VERSION,
      combatDepthActive: true,
      momentum: Number(this.momentum.toFixed(2)),
      momentumRatio: Number((this.momentum / MAX_MOMENTUM).toFixed(4)),
      overdriveActive: this.overdriveTimer > 0,
      overdriveTimer: Number(this.overdriveTimer.toFixed(3)),
      precisionCharge: this.precisionCharge,
      precisionShotActive: this.precisionShotActive,
      bankLevel: this.bankLevel,
      catchWindowRatio: Number(this.catchWindowRatio.toFixed(4)),
      perfectCatches: this.combatDepthStats.perfectCatches,
      precisionKills: this.combatDepthStats.precisionKills,
      bankKills: this.combatDepthStats.bankKills,
      overdrives: this.combatDepthStats.overdrives,
      perfectCatchEnabled: true,
      bankShotDamageEnabled: true,
      momentumOverdriveEnabled: true,
    };
  }
}
