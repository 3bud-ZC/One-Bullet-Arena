import { clamp, normalize } from '../arena.js';
import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from '../game-data.js';
import { UI_COLORS } from '../ui-renderer.js';
import { OneBulletVisualOverhaulRuntime } from './visual-overhaul-runtime.js';

export const COMBAT_JUICE_RUNTIME_VERSION = '3.4.0-combat-juice';

const TAU = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export function combatJuiceIntensity({
  lethal = false,
  boss = false,
  combo = 0,
  bankLevel = 0,
  bounceCount = 0,
} = {}) {
  const comboBonus = Math.min(0.34, Math.max(0, Number(combo) || 0) * 0.024);
  const bankBonus = Math.min(0.22, Math.max(0, Number(bankLevel) || 0) * 0.045);
  const bounceBonus = Math.min(0.16, Math.max(0, Number(bounceCount) || 0) * 0.035);
  const lethalBonus = lethal ? 0.34 : 0;
  const bossBonus = boss ? 0.2 : 0;
  return clamp(0.72 + comboBonus + bankBonus + bounceBonus + lethalBonus + bossBonus, 0.72, 1.75);
}

export function deterministicShard(index, seed = 0, count = 12) {
  const safeIndex = Math.max(0, Math.trunc(Number(index) || 0));
  const safeSeed = Math.abs(Math.trunc(Number(seed) || 0));
  const safeCount = Math.max(1, Math.trunc(Number(count) || 1));
  const angle = (safeIndex * GOLDEN_ANGLE + safeSeed * 0.731) % TAU;
  const lane = safeIndex % 5;
  const speed = 118 + lane * 27 + ((safeSeed + safeIndex * 17) % 31);
  const size = 1.4 + ((safeSeed + safeIndex * 13) % 4) * 0.72;
  const delay = (safeIndex % safeCount) / safeCount * 0.035;
  return Object.freeze({ angle, speed, size, delay });
}

export function juicePulseAlpha(value = 0, scale = 1) {
  return clamp((Number(value) || 0) * (Number(scale) || 0), 0, 1);
}

function makeShardCloud({ x, y, color, count = 12, seed = 0, intensity = 1, life = 0.42 }) {
  const shards = [];
  for (let index = 0; index < count; index += 1) {
    const shard = deterministicShard(index, seed, count);
    shards.push({
      ...shard,
      speed: shard.speed * intensity,
      size: shard.size * Math.min(1.4, 0.82 + intensity * 0.25),
    });
  }
  return {
    type: 'shard-cloud',
    x,
    y,
    color,
    shards,
    intensity,
    life,
    maxLife: life,
  };
}

export class OneBulletCombatJuiceRuntime extends OneBulletVisualOverhaulRuntime {
  constructor(canvas, liveRegion = null) {
    super(canvas, liveRegion);
    this.combatJuiceRuntimeVersion = COMBAT_JUICE_RUNTIME_VERSION;
  }

  resetRun() {
    super.resetRun();
    this.juiceEvents = [];
    this.juiceSequence = 0;
    this.fireJuicePulse = 0;
    this.ricochetJuicePulse = 0;
    this.catchJuicePulse = 0;
    this.killJuicePulse = 0;
    this.damageJuicePulse = 0;
    this.waveJuicePulse = 0;
    this.dashJuicePulse = 0;
    this.lastDashActive = false;
    this.lastBulletJuicePosition = { x: this.bullet.x, y: this.bullet.y };
    this.lastJuiceWave = this.wave || 0;
  }

  update(dt) {
    const safeDt = Math.max(0, Number(dt) || 0);
    super.update(safeDt);

    this.fireJuicePulse = Math.max(0, this.fireJuicePulse - safeDt * 4.8);
    this.ricochetJuicePulse = Math.max(0, this.ricochetJuicePulse - safeDt * 3.9);
    this.catchJuicePulse = Math.max(0, this.catchJuicePulse - safeDt * 3.4);
    this.killJuicePulse = Math.max(0, this.killJuicePulse - safeDt * 2.8);
    this.damageJuicePulse = Math.max(0, this.damageJuicePulse - safeDt * 2.45);
    this.waveJuicePulse = Math.max(0, this.waveJuicePulse - safeDt * 1.35);
    this.dashJuicePulse = Math.max(0, this.dashJuicePulse - safeDt * 4.4);

    for (const event of this.juiceEvents) event.life -= safeDt;
    this.juiceEvents = this.juiceEvents.filter((event) => event.life > 0);
    if (this.juiceEvents.length > 64) this.juiceEvents.splice(0, this.juiceEvents.length - 64);

    const dashActive = this.player.dashRemaining > 0;
    if (dashActive && !this.lastDashActive) this.beginDashJuice();
    this.lastDashActive = dashActive;

    if (this.bullet.held) {
      this.lastBulletJuicePosition = { x: this.bullet.x, y: this.bullet.y };
      return;
    }

    const dx = this.bullet.x - this.lastBulletJuicePosition.x;
    const dy = this.bullet.y - this.lastBulletJuicePosition.y;
    const travelled = Math.hypot(dx, dy);
    if (travelled >= 38 && !this.reducedMotion) {
      const direction = normalize(this.bullet.vx, this.bullet.vy);
      this.juiceEvents.push({
        type: 'bullet-ghost',
        x: this.bullet.x,
        y: this.bullet.y,
        direction,
        recalling: Boolean(this.bullet.recalling),
        life: 0.16,
        maxLife: 0.16,
      });
      this.lastBulletJuicePosition = { x: this.bullet.x, y: this.bullet.y };
    }
  }

  startNextWave() {
    const previousStage = this.arenaStage?.id ?? 0;
    const result = super.startNextWave();
    const stageExpanded = (this.arenaStage?.id ?? 0) > previousStage;
    this.waveJuicePulse = 1;
    this.lastJuiceWave = this.wave;
    this.juiceEvents.push({
      type: 'wave-entry',
      x: WIDTH / 2,
      y: HEIGHT / 2,
      expanded: stageExpanded,
      wave: this.wave,
      life: stageExpanded ? 1.05 : 0.74,
      maxLife: stageExpanded ? 1.05 : 0.74,
    });
    if (!this.reducedMotion) this.shake = Math.max(this.shake, stageExpanded ? 5.5 : 2.4);
    return result;
  }

  fireBullet() {
    const fired = super.fireBullet();
    if (!fired) return false;

    const direction = normalize(this.bullet.vx, this.bullet.vy);
    this.fireJuicePulse = 1;
    this.juiceEvents.push({
      type: 'fire-wave',
      x: this.player.x,
      y: this.player.y,
      direction,
      precision: Boolean(this.precisionShotActive),
      overdrive: this.overdriveTimer > 0,
      life: this.precisionShotActive ? 0.32 : 0.22,
      maxLife: this.precisionShotActive ? 0.32 : 0.22,
    });
    this.lastBulletJuicePosition = { x: this.bullet.x, y: this.bullet.y };
    if (!this.reducedMotion) this.shake = Math.max(this.shake, this.precisionShotActive ? 2.9 : 1.35);
    return true;
  }

  recallBullet() {
    const recalled = super.recallBullet();
    if (!recalled) return false;

    const direction = normalize(this.player.x - this.bullet.x, this.player.y - this.bullet.y);
    this.juiceEvents.push({
      type: 'recall-surge',
      x: this.bullet.x,
      y: this.bullet.y,
      direction,
      life: 0.44,
      maxLife: 0.44,
    });
    return true;
  }

  catchBullet() {
    const wasReturning = Boolean(this.bullet.recalling);
    const bulletX = this.bullet.x;
    const bulletY = this.bullet.y;
    const recallDistance = Math.max(
      Number(this.recallStartDistance) || 0,
      Math.hypot(bulletX - this.player.x, bulletY - this.player.y),
    );
    const result = super.catchBullet();
    if (!wasReturning) return result;

    this.catchJuicePulse = 1;
    const intensity = clamp(0.85 + recallDistance / 900, 0.85, 1.45);
    this.juiceEvents.push({
      type: 'catch-collapse',
      x: this.player.x,
      y: this.player.y,
      intensity,
      perfect: Boolean(this.precisionCharge),
      life: 0.46,
      maxLife: 0.46,
    });
    if (!this.reducedMotion) this.shake = Math.max(this.shake, this.precisionCharge ? 3.6 : 1.8);
    return result;
  }

  onRicochet() {
    const result = super.onRicochet();
    const intensity = combatJuiceIntensity({
      combo: this.combo,
      bankLevel: this.bankLevel,
      bounceCount: this.bullet.bounceCount,
    });
    this.ricochetJuicePulse = 1;
    this.juiceEvents.push(makeShardCloud({
      x: this.bullet.x,
      y: this.bullet.y,
      color: UI_COLORS.bullet,
      count: 8 + Math.min(8, this.bullet.bounceCount * 2),
      seed: ++this.juiceSequence + this.bullet.bounceCount * 17,
      intensity,
      life: 0.3,
    }));
    this.juiceEvents.push({
      type: 'ricochet-ring',
      x: this.bullet.x,
      y: this.bullet.y,
      intensity,
      life: 0.26,
      maxLife: 0.26,
    });
    if (!this.reducedMotion) this.shake = Math.max(this.shake, 1.4 + intensity * 1.35);
    return result;
  }

  damageEnemy(enemy, damage, fromBullet = false) {
    if (!this.enemies.includes(enemy)) return undefined;

    const snapshot = {
      x: enemy.x,
      y: enemy.y,
      type: enemy.type,
      color: enemy.color || UI_COLORS.danger,
      health: enemy.health,
      guardStrength: enemy.guardStrength,
      id: enemy.id,
    };
    const result = super.damageEnemy(enemy, damage, fromBullet);
    if (!fromBullet) return result;

    const stillExists = this.enemies.includes(enemy);
    const lethal = !stillExists || enemy.health <= 0;
    const blocked = snapshot.type === 'warden'
      && stillExists
      && Number(enemy.health) === Number(snapshot.health)
      && Number(enemy.guardStrength) < Number(snapshot.guardStrength);

    if (blocked) {
      this.ricochetJuicePulse = Math.max(this.ricochetJuicePulse, 0.7);
      this.juiceEvents.push({
        type: 'guard-impact',
        x: snapshot.x,
        y: snapshot.y,
        angle: Number(enemy.guardAngle) || 0,
        life: 0.38,
        maxLife: 0.38,
      });
      return result;
    }

    const intensity = combatJuiceIntensity({
      lethal,
      boss: snapshot.type === 'warden',
      combo: this.combo,
      bankLevel: this.bankLevel,
      bounceCount: this.bullet.bounceCount,
    });

    this.juiceEvents.push({
      type: 'impact-core',
      x: snapshot.x,
      y: snapshot.y,
      color: snapshot.color,
      intensity,
      lethal,
      life: lethal ? 0.44 : 0.24,
      maxLife: lethal ? 0.44 : 0.24,
    });

    if (lethal) {
      this.killJuicePulse = 1;
      this.juiceEvents.push(makeShardCloud({
        x: snapshot.x,
        y: snapshot.y,
        color: snapshot.color,
        count: snapshot.type === 'warden' ? 24 : 15,
        seed: ++this.juiceSequence + snapshot.id * 19,
        intensity,
        life: snapshot.type === 'warden' ? 0.72 : 0.5,
      }));
      this.juiceEvents.push({
        type: 'kill-halo',
        x: snapshot.x,
        y: snapshot.y,
        color: snapshot.color,
        intensity,
        boss: snapshot.type === 'warden',
        life: snapshot.type === 'warden' ? 0.78 : 0.46,
        maxLife: snapshot.type === 'warden' ? 0.78 : 0.46,
      });
      if (!this.reducedMotion) {
        const lethalShake = snapshot.type === 'warden' ? 9.2 : 4.4 + intensity * 1.5;
        this.shake = Math.max(this.shake, lethalShake);
        this.hitStopTimer = Math.max(this.hitStopTimer, snapshot.type === 'warden' ? 0.082 : 0.045);
      }
    }

    return result;
  }

  damagePlayer(sourceX, sourceY) {
    const healthBefore = this.player.health;
    const shieldBefore = this.player.shield;
    const result = super.damagePlayer(sourceX, sourceY);
    const damaged = this.player.health < healthBefore;
    const blocked = shieldBefore > this.player.shield && !damaged;
    if (!damaged && !blocked) return result;

    this.damageJuicePulse = damaged ? 1 : Math.max(this.damageJuicePulse, 0.48);
    const direction = normalize(this.player.x - sourceX, this.player.y - sourceY);
    this.juiceEvents.push({
      type: blocked ? 'shield-slam' : 'player-damage',
      x: this.player.x,
      y: this.player.y,
      direction,
      life: blocked ? 0.34 : 0.55,
      maxLife: blocked ? 0.34 : 0.55,
    });
    return result;
  }

  beginDashJuice() {
    this.dashJuicePulse = 1;
    const direction = normalize(this.player.dashDirection?.x || 0, this.player.dashDirection?.y || 0);
    this.juiceEvents.push({
      type: 'dash-pop',
      x: this.player.x,
      y: this.player.y,
      direction,
      life: 0.3,
      maxLife: 0.3,
    });
  }

  drawParticles() {
    super.drawParticles();
    this.drawCombatJuiceWorld();
  }

  drawHud() {
    super.drawHud();
    this.drawCombatJuiceScreen();
  }

  drawCombatJuiceWorld() {
    if (!this.juiceEvents?.length) return;
    const ctx = this.ctx;

    ctx.save();
    for (const event of this.juiceEvents) {
      const ratio = clamp(event.life / event.maxLife, 0, 1);
      const age = 1 - ratio;

      if (event.type === 'bullet-ghost') {
        ctx.globalAlpha = ratio * (event.recalling ? 0.28 : 0.18);
        ctx.fillStyle = event.recalling ? UI_COLORS.electric : UI_COLORS.bullet;
        ctx.shadowColor = event.recalling ? UI_COLORS.electric : UI_COLORS.bullet;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(event.x, event.y, 2.2 + age * 3.4, 0, TAU);
        ctx.fill();
        continue;
      }

      if (event.type === 'fire-wave') {
        const angle = Math.atan2(event.direction.y, event.direction.x);
        const radius = 22 + age * (event.precision ? 70 : 46);
        ctx.save();
        ctx.translate(event.x, event.y);
        ctx.rotate(angle);
        ctx.globalAlpha = ratio * (event.precision ? 0.78 : 0.5);
        ctx.strokeStyle = event.overdrive ? UI_COLORS.violet : UI_COLORS.bullet;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = event.precision ? 20 : 12;
        ctx.lineWidth = event.precision ? 4 : 2;
        ctx.beginPath();
        ctx.arc(0, 0, radius, -0.44, 0.44);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(20 + age * 8, -8 * ratio);
        ctx.lineTo(68 + age * 44, 0);
        ctx.lineTo(20 + age * 8, 8 * ratio);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      if (event.type === 'recall-surge') {
        const angle = Math.atan2(event.direction.y, event.direction.x);
        ctx.save();
        ctx.translate(event.x, event.y);
        ctx.rotate(angle);
        ctx.globalAlpha = ratio * 0.6;
        ctx.strokeStyle = UI_COLORS.electric;
        ctx.shadowColor = UI_COLORS.electric;
        ctx.shadowBlur = 16;
        for (let lane = -1; lane <= 1; lane += 1) {
          const offset = lane * 7;
          ctx.lineWidth = lane === 0 ? 2.2 : 1;
          ctx.beginPath();
          ctx.moveTo(-10 - age * 34, offset);
          ctx.lineTo(32 + age * 54, offset * 0.3);
          ctx.stroke();
        }
        ctx.restore();
        continue;
      }

      if (event.type === 'catch-collapse') {
        const color = event.perfect ? UI_COLORS.success : UI_COLORS.electric;
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = event.perfect ? 22 : 14;
        ctx.globalAlpha = ratio * 0.78;
        for (let ring = 0; ring < 3; ring += 1) {
          const radius = 18 + (1 - age) * (22 + ring * 16) + ring * 7;
          ctx.lineWidth = Math.max(1, (3 - ring) * ratio);
          ctx.beginPath();
          ctx.arc(event.x, event.y, radius, 0, TAU);
          ctx.stroke();
        }
        continue;
      }

      if (event.type === 'ricochet-ring') {
        const radius = 10 + age * (46 + event.intensity * 18);
        ctx.globalAlpha = ratio * 0.75;
        ctx.strokeStyle = UI_COLORS.bullet;
        ctx.shadowColor = UI_COLORS.bullet;
        ctx.shadowBlur = 14;
        ctx.lineWidth = 2.5 * ratio;
        ctx.setLineDash([5, 5]);
        ctx.lineDashOffset = -age * 22;
        ctx.beginPath();
        ctx.arc(event.x, event.y, radius, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        continue;
      }

      if (event.type === 'shard-cloud') {
        ctx.fillStyle = event.color;
        ctx.strokeStyle = event.color;
        ctx.shadowColor = event.color;
        ctx.shadowBlur = 8;
        for (const shard of event.shards) {
          const localAge = clamp((age - shard.delay) / Math.max(0.001, 1 - shard.delay), 0, 1);
          if (localAge <= 0) continue;
          const distance = shard.speed * localAge * event.maxLife;
          const x = event.x + Math.cos(shard.angle) * distance;
          const y = event.y + Math.sin(shard.angle) * distance + localAge * localAge * 13;
          const tail = Math.max(2, shard.size * 3.4 * ratio);
          ctx.globalAlpha = ratio * 0.82;
          ctx.lineWidth = Math.max(0.8, shard.size * ratio);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(
            x - Math.cos(shard.angle) * tail,
            y - Math.sin(shard.angle) * tail,
          );
          ctx.stroke();
        }
        continue;
      }

      if (event.type === 'impact-core') {
        const radius = 8 + age * (event.lethal ? 64 : 34) * event.intensity;
        const glow = ctx.createRadialGradient(event.x, event.y, 0, event.x, event.y, Math.max(12, radius));
        glow.addColorStop(0, 'rgba(255,255,255,0.76)');
        glow.addColorStop(0.22, event.color);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = ratio * (event.lethal ? 0.64 : 0.42);
        ctx.fillStyle = glow;
        ctx.fillRect(event.x - radius, event.y - radius, radius * 2, radius * 2);
        continue;
      }

      if (event.type === 'kill-halo') {
        const radius = 20 + age * (event.boss ? 132 : 82) * event.intensity;
        ctx.globalAlpha = ratio * (event.boss ? 0.8 : 0.58);
        ctx.strokeStyle = event.color;
        ctx.shadowColor = event.color;
        ctx.shadowBlur = event.boss ? 28 : 18;
        ctx.lineWidth = event.boss ? 5 * ratio : 3 * ratio;
        ctx.beginPath();
        ctx.arc(event.x, event.y, radius, 0, TAU);
        ctx.stroke();
        if (event.boss) {
          ctx.globalAlpha *= 0.6;
          ctx.setLineDash([11, 10]);
          ctx.lineDashOffset = -age * 40;
          ctx.beginPath();
          ctx.arc(event.x, event.y, radius * 0.7, 0, TAU);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        continue;
      }

      if (event.type === 'guard-impact') {
        ctx.save();
        ctx.translate(event.x, event.y);
        ctx.rotate(event.angle);
        ctx.globalAlpha = ratio * 0.85;
        ctx.strokeStyle = UI_COLORS.electric;
        ctx.shadowColor = UI_COLORS.electric;
        ctx.shadowBlur = 22;
        ctx.lineWidth = 5 * ratio + 1;
        ctx.beginPath();
        ctx.arc(0, 0, 64 + age * 28, -0.88, 0.88);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      if (event.type === 'shield-slam' || event.type === 'player-damage') {
        const color = event.type === 'shield-slam' ? UI_COLORS.electric : UI_COLORS.danger;
        const radius = 24 + age * (event.type === 'shield-slam' ? 52 : 78);
        ctx.globalAlpha = ratio * 0.72;
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 18;
        ctx.lineWidth = event.type === 'shield-slam' ? 3 : 4;
        ctx.beginPath();
        ctx.arc(event.x, event.y, radius, 0, TAU);
        ctx.stroke();
        continue;
      }

      if (event.type === 'dash-pop') {
        const angle = Math.atan2(event.direction.y, event.direction.x);
        ctx.save();
        ctx.translate(event.x, event.y);
        ctx.rotate(angle);
        ctx.globalAlpha = ratio * 0.48;
        ctx.strokeStyle = UI_COLORS.player;
        ctx.shadowColor = UI_COLORS.player;
        ctx.shadowBlur = 14;
        ctx.lineWidth = 2;
        for (let lane = -1; lane <= 1; lane += 1) {
          ctx.beginPath();
          ctx.moveTo(-20 - age * 70, lane * 9);
          ctx.lineTo(8 - age * 22, lane * 4);
          ctx.stroke();
        }
        ctx.restore();
        continue;
      }

      if (event.type === 'wave-entry') {
        const radius = 90 + age * (event.expanded ? 470 : 330);
        ctx.globalAlpha = ratio * (event.expanded ? 0.34 : 0.2);
        ctx.strokeStyle = event.expanded ? UI_COLORS.warning : UI_COLORS.player;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = event.expanded ? 24 : 12;
        ctx.lineWidth = event.expanded ? 4 : 2;
        ctx.beginPath();
        ctx.arc(event.x, event.y, radius, 0, TAU);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawCombatJuiceScreen() {
    const ctx = this.ctx;
    if (this.state === 'menu') return;

    const damageAlpha = juicePulseAlpha(this.damageJuicePulse, 0.34);
    const killAlpha = juicePulseAlpha(this.killJuicePulse, 0.18);
    const waveAlpha = juicePulseAlpha(this.waveJuicePulse, 0.12);
    if (damageAlpha <= 0 && killAlpha <= 0 && waveAlpha <= 0) return;

    ctx.save();

    if (damageAlpha > 0) {
      const vignette = ctx.createRadialGradient(
        WIDTH / 2,
        HEIGHT / 2,
        HEIGHT * 0.22,
        WIDTH / 2,
        HEIGHT / 2,
        WIDTH * 0.68,
      );
      vignette.addColorStop(0, 'rgba(255,40,72,0)');
      vignette.addColorStop(0.64, `rgba(255,40,72,${(damageAlpha * 0.22).toFixed(3)})`);
      vignette.addColorStop(1, `rgba(255,32,64,${damageAlpha.toFixed(3)})`);
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }

    if (killAlpha > 0) {
      ctx.globalAlpha = killAlpha;
      ctx.strokeStyle = UI_COLORS.bullet;
      ctx.lineWidth = 1;
      ctx.strokeRect(8, 8, WIDTH - 16, HEIGHT - 16);
    }

    if (waveAlpha > 0) {
      ctx.globalAlpha = waveAlpha;
      const sweepX = WIDTH * (1 - this.waveJuicePulse);
      const sweep = ctx.createLinearGradient(sweepX - 90, 0, sweepX + 90, 0);
      sweep.addColorStop(0, 'rgba(0,0,0,0)');
      sweep.addColorStop(0.5, UI_COLORS.player);
      sweep.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sweep;
      ctx.fillRect(sweepX - 90, 0, 180, HEIGHT);
    }

    ctx.restore();
  }

  getSnapshot() {
    return {
      ...super.getSnapshot(),
      combatJuiceRuntimeVersion: COMBAT_JUICE_RUNTIME_VERSION,
      combatJuiceActive: true,
      combatJuiceStyle: 'impact-directed-cinematic-feedback',
      combatJuiceEventCount: this.juiceEvents?.length || 0,
      combatJuicePulses: {
        fire: Number((this.fireJuicePulse || 0).toFixed(3)),
        ricochet: Number((this.ricochetJuicePulse || 0).toFixed(3)),
        catch: Number((this.catchJuicePulse || 0).toFixed(3)),
        kill: Number((this.killJuicePulse || 0).toFixed(3)),
        damage: Number((this.damageJuicePulse || 0).toFixed(3)),
        wave: Number((this.waveJuicePulse || 0).toFixed(3)),
        dash: Number((this.dashJuicePulse || 0).toFixed(3)),
      },
      combatJuiceReducedMotionSafe: true,
      gameplayBalanceChangedByCombatJuice: false,
      collisionGeometryChangedByCombatJuice: false,
    };
  }
}
