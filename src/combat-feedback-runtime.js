import { clamp, normalize } from './arena.js';
import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from './game-data.js';
import { OneBulletVisualDesignRuntime } from './visual-design-runtime.js';
import { UI_COLORS, label, progressBar, roundedRect } from './ui-renderer.js';

export const COMBAT_FEEDBACK_VERSION = '2.7.0-feedback';

const IMPACT_PROFILES = Object.freeze({
  scout: Object.freeze({ sparks: 4, radius: 24, shake: 1.6, color: '#ff6b7f' }),
  brute: Object.freeze({ sparks: 7, radius: 38, shake: 3.2, color: '#ffab4f' }),
  sniper: Object.freeze({ sparks: 5, radius: 32, shake: 2.4, color: '#b887ff' }),
  charger: Object.freeze({ sparks: 6, radius: 36, shake: 2.8, color: '#5df2a6' }),
  warden: Object.freeze({ sparks: 8, radius: 44, shake: 3.8, color: '#67ddff' }),
  splitter: Object.freeze({ sparks: 6, radius: 36, shake: 2.7, color: '#ff7fd3' }),
});

export function combatFeedbackProfile(enemyType = 'scout', lethal = false) {
  const base = IMPACT_PROFILES[enemyType] || IMPACT_PROFILES.scout;
  return {
    ...base,
    lethal: Boolean(lethal),
    sparks: lethal ? Math.round(base.sparks * 1.7) : base.sparks,
    radius: lethal ? Math.round(base.radius * 1.55) : base.radius,
    shake: lethal ? base.shake * 1.45 : base.shake,
    freeze: lethal ? 0.058 : 0.025,
  };
}

export function comboFeedbackRank(combo = 0) {
  const value = Math.max(0, Number(combo) || 0);
  if (value >= 12) return { code: 'OVERDRIVE', color: '#ff7fd3', threshold: 12 };
  if (value >= 8) return { code: 'RELENTLESS', color: '#ffab4f', threshold: 8 };
  if (value >= 5) return { code: 'CHAINED', color: UI_COLORS.bullet, threshold: 5 };
  if (value >= 3) return { code: 'LOCKED IN', color: UI_COLORS.player, threshold: 3 };
  return { code: 'STABLE', color: UI_COLORS.muted, threshold: 0 };
}

function makeImpactEvent({ x, y, color, radius, direction, lethal, sparks }) {
  const rays = [];
  const baseAngle = Math.atan2(direction.y, direction.x);
  for (let index = 0; index < sparks; index += 1) {
    const spread = (index / Math.max(1, sparks - 1) - 0.5) * Math.PI * 1.24;
    const angle = baseAngle + Math.PI + spread;
    const length = radius * (0.38 + ((index * 37) % 11) / 20);
    rays.push({ angle, length, width: index % 3 === 0 ? 2.2 : 1.2 });
  }
  return {
    type: 'impact',
    x,
    y,
    color,
    radius,
    rays,
    lethal,
    life: lethal ? 0.38 : 0.24,
    maxLife: lethal ? 0.38 : 0.24,
  };
}

export class OneBulletCombatFeedbackRuntime extends OneBulletVisualDesignRuntime {
  constructor(canvas, liveRegion = null) {
    super(canvas, liveRegion);
    this.version = COMBAT_FEEDBACK_VERSION;
    this.combatFeedbackVersion = COMBAT_FEEDBACK_VERSION;
  }

  resetRun() {
    super.resetRun();
    this.feedbackEvents = [];
    this.dashEchoes = [];
    this.feedbackCallout = null;
    this.comboPulse = 0;
    this.damagePulse = 0;
    this.wavePulse = 0;
    this.recallCatchPulse = 0;
    this.feedbackEventSequence = 0;
    this.lastDashEchoPosition = { x: this.player.x, y: this.player.y };
  }

  update(dt) {
    super.update(dt);
    const realDt = Math.max(0, Number(dt) || 0);

    this.comboPulse = Math.max(0, this.comboPulse - realDt * 2.5);
    this.damagePulse = Math.max(0, this.damagePulse - realDt * 2.4);
    this.wavePulse = Math.max(0, this.wavePulse - realDt * 0.85);
    this.recallCatchPulse = Math.max(0, this.recallCatchPulse - realDt * 2.8);

    if (this.feedbackCallout) {
      this.feedbackCallout.life -= realDt;
      if (this.feedbackCallout.life <= 0) this.feedbackCallout = null;
    }

    for (const event of this.feedbackEvents) event.life -= realDt;
    this.feedbackEvents = this.feedbackEvents.filter((event) => event.life > 0);

    for (const echo of this.dashEchoes) echo.life -= realDt;
    this.dashEchoes = this.dashEchoes.filter((echo) => echo.life > 0);

    if (this.player.dashRemaining > 0 && !this.reducedMotion) {
      const moved = Math.hypot(
        this.player.x - this.lastDashEchoPosition.x,
        this.player.y - this.lastDashEchoPosition.y,
      );
      if (moved >= 24) {
        this.dashEchoes.push({
          x: this.player.x,
          y: this.player.y,
          radius: this.player.radius,
          life: 0.22,
          maxLife: 0.22,
        });
        this.lastDashEchoPosition = { x: this.player.x, y: this.player.y };
        if (this.dashEchoes.length > 8) this.dashEchoes.shift();
      }
    } else {
      this.lastDashEchoPosition = { x: this.player.x, y: this.player.y };
    }
  }

  startNextWave() {
    super.startNextWave();
    this.wavePulse = 1;
    this.setFeedbackCallout(`WAVE ${String(this.wave).padStart(2, '0')}`, 'ENGAGE', UI_COLORS.player, 1.05);
  }

  fireBullet() {
    const fired = super.fireBullet();
    if (!fired) return false;

    const direction = normalize(this.bullet.vx, this.bullet.vy);
    this.feedbackEvents.push({
      type: 'muzzle',
      x: this.player.x + direction.x * 28,
      y: this.player.y + direction.y * 28,
      direction,
      color: UI_COLORS.bullet,
      life: 0.16,
      maxLife: 0.16,
    });
    return true;
  }

  recallBullet() {
    const recalled = super.recallBullet();
    if (!recalled) return false;

    this.feedbackEvents.push({
      type: 'recall-start',
      x: this.bullet.x,
      y: this.bullet.y,
      color: UI_COLORS.electric,
      life: 0.42,
      maxLife: 0.42,
    });
    return true;
  }

  catchBullet() {
    const wasReturning = this.bullet.recalling;
    const distanceTravelled = Math.hypot(this.bullet.x - this.player.x, this.bullet.y - this.player.y);
    super.catchBullet();
    if (!wasReturning) return;

    this.recallCatchPulse = 0.35;
    if (distanceTravelled >= 320) {
      this.setFeedbackCallout('LONG RECALL', 'BULLET SECURED', UI_COLORS.electric, 0.72);
    }
  }

  onRicochet() {
    super.onRicochet();
    const direction = normalize(this.bullet.vx, this.bullet.vy);
    this.feedbackEvents.push({
      type: 'ricochet',
      x: this.bullet.x,
      y: this.bullet.y,
      direction,
      color: UI_COLORS.bullet,
      life: 0.2,
      maxLife: 0.2,
    });
  }

  damageEnemy(enemy, damage, fromBullet = false) {
    if (!this.enemies.includes(enemy)) return;
    const snapshot = {
      x: enemy.x,
      y: enemy.y,
      type: enemy.type,
      color: enemy.color,
      health: enemy.health,
    };
    const lethal = snapshot.health - damage <= 0;
    const direction = normalize(this.bullet.vx, this.bullet.vy);

    super.damageEnemy(enemy, damage, fromBullet);
    if (!fromBullet) return;

    const profile = combatFeedbackProfile(snapshot.type, lethal);
    this.feedbackEvents.push(makeImpactEvent({
      x: snapshot.x,
      y: snapshot.y,
      color: profile.color || snapshot.color,
      radius: profile.radius,
      direction,
      lethal,
      sparks: profile.sparks,
    }));
    this.hitStopTimer = Math.max(this.hitStopTimer, this.reducedMotion ? 0 : profile.freeze);
    this.shake = Math.max(this.shake, this.reducedMotion ? 0 : profile.shake);

    if (lethal) {
      this.comboPulse = 1;
      const rank = comboFeedbackRank(this.combo);
      if (this.combo >= 3) {
        this.setFeedbackCallout(rank.code, `COMBO ×${this.combo}`, rank.color, 0.78);
      }
    }
  }

  damagePlayer(sourceX, sourceY) {
    const healthBefore = this.player.health;
    const shieldBefore = this.player.shield;
    super.damagePlayer(sourceX, sourceY);
    const blocked = shieldBefore > this.player.shield && healthBefore === this.player.health;
    const damaged = this.player.health < healthBefore;
    if (!blocked && !damaged) return;

    const direction = normalize(this.player.x - sourceX, this.player.y - sourceY);
    this.damagePulse = blocked ? 0.45 : 1;
    this.feedbackEvents.push({
      type: blocked ? 'shield-hit' : 'player-hit',
      x: this.player.x,
      y: this.player.y,
      direction,
      color: blocked ? UI_COLORS.electric : UI_COLORS.danger,
      life: blocked ? 0.34 : 0.52,
      maxLife: blocked ? 0.34 : 0.52,
    });
    this.setFeedbackCallout(
      blocked ? 'SHIELD HELD' : 'HULL HIT',
      blocked ? 'DAMAGE BLOCKED' : `${this.player.health}/${this.player.maxHealth} HP`,
      blocked ? UI_COLORS.electric : UI_COLORS.danger,
      0.72,
    );
  }

  chooseUpgrade(index) {
    const upgrade = this.upgradeChoices[index];
    const chosen = super.chooseUpgrade(index);
    if (chosen && upgrade) {
      this.setFeedbackCallout('UPGRADE ONLINE', upgrade.name, UI_COLORS.success, 0.88);
      this.wavePulse = Math.max(this.wavePulse, 0.45);
    }
    return chosen;
  }

  finishRun() {
    super.finishRun();
    this.damagePulse = 1;
    this.setFeedbackCallout('RUN TERMINATED', `WAVE ${this.wave}`, UI_COLORS.danger, 1.2);
  }

  setFeedbackCallout(title, subtitle, color, duration = 0.8) {
    this.feedbackCallout = {
      id: ++this.feedbackEventSequence,
      title,
      subtitle,
      color,
      life: duration,
      maxLife: duration,
    };
  }

  drawPlayer() {
    this.drawDashEchoes();
    super.drawPlayer();
  }

  drawDashEchoes() {
    if (this.reducedMotion || this.dashEchoes.length === 0) return;
    const ctx = this.ctx;
    ctx.save();
    for (const echo of this.dashEchoes) {
      const ratio = clamp(echo.life / echo.maxLife, 0, 1);
      ctx.globalAlpha = ratio * 0.28;
      ctx.strokeStyle = UI_COLORS.player;
      ctx.lineWidth = 2;
      ctx.shadowColor = UI_COLORS.player;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(echo.x, echo.y, echo.radius * (1.2 + (1 - ratio) * 0.5), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawBullet() {
    super.drawBullet();
    if (!this.bullet.recalling) return;

    const ctx = this.ctx;
    const dx = this.player.x - this.bullet.x;
    const dy = this.player.y - this.bullet.y;
    const length = Math.hypot(dx, dy);
    if (length < 40) return;
    const direction = normalize(dx, dy);
    const packets = Math.min(7, Math.max(2, Math.floor(length / 90)));

    ctx.save();
    ctx.fillStyle = UI_COLORS.electric;
    ctx.shadowColor = UI_COLORS.electric;
    ctx.shadowBlur = 0;
    for (let index = 0; index < packets; index += 1) {
      const progress = (index / packets + this.elapsed * 1.8) % 1;
      const x = this.bullet.x + direction.x * length * progress;
      const y = this.bullet.y + direction.y * length * progress;
      ctx.globalAlpha = 0.18 + progress * 0.58;
      ctx.beginPath();
      ctx.arc(x, y, 2.5 + progress * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawParticles() {
    super.drawParticles();
    this.drawFeedbackEvents();
  }

  drawFeedbackEvents() {
    const ctx = this.ctx;
    ctx.save();
    for (const event of this.feedbackEvents) {
      const ratio = clamp(event.life / event.maxLife, 0, 1);
      const age = 1 - ratio;
      ctx.globalAlpha = ratio;

      if (event.type === 'impact') {
        ctx.strokeStyle = event.color;
        ctx.shadowColor = event.color;
        ctx.shadowBlur = 0;
        ctx.lineCap = 'round';
        for (const ray of event.rays) {
          const start = event.radius * 0.12 + age * event.radius * 0.16;
          const end = start + ray.length * (0.45 + age * 0.75);
          ctx.lineWidth = ray.width * ratio;
          ctx.beginPath();
          ctx.moveTo(event.x + Math.cos(ray.angle) * start, event.y + Math.sin(ray.angle) * start);
          ctx.lineTo(event.x + Math.cos(ray.angle) * end, event.y + Math.sin(ray.angle) * end);
          ctx.stroke();
        }
      } else if (event.type === 'muzzle') {
        const angle = Math.atan2(event.direction.y, event.direction.x);
        ctx.translate(event.x, event.y);
        ctx.rotate(angle);
        ctx.fillStyle = event.color;
        ctx.shadowColor = event.color;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(4 + age * 10, 0);
        ctx.lineTo(-5, -12 * ratio);
        ctx.lineTo(-5, 12 * ratio);
        ctx.closePath();
        ctx.fill();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      } else if (event.type === 'recall-start' || event.type === 'catch') {
        ctx.strokeStyle = event.color;
        ctx.shadowColor = event.color;
        ctx.shadowBlur = 0;
        ctx.lineWidth = 2 * ratio;
        ctx.lineCap = 'round';
        const span = 12 + age * 16;
        const inset = 4 + age * 8;
        ctx.beginPath();
        ctx.moveTo(event.x - span, event.y - inset);
        ctx.lineTo(event.x - inset, event.y);
        ctx.lineTo(event.x - span, event.y + inset);
        ctx.moveTo(event.x + span, event.y - inset);
        ctx.lineTo(event.x + inset, event.y);
        ctx.lineTo(event.x + span, event.y + inset);
        ctx.stroke();
      } else if (event.type === 'ricochet') {
        const angle = Math.atan2(event.direction.y, event.direction.x);
        ctx.strokeStyle = event.color;
        ctx.shadowColor = event.color;
        ctx.shadowBlur = 0;
        ctx.lineWidth = 2.5;
        for (let index = -1; index <= 1; index += 1) {
          const rayAngle = angle + Math.PI + index * 0.46;
          ctx.beginPath();
          ctx.moveTo(event.x, event.y);
          ctx.lineTo(
            event.x + Math.cos(rayAngle) * (18 + age * 34),
            event.y + Math.sin(rayAngle) * (18 + age * 34),
          );
          ctx.stroke();
        }
      } else if (event.type === 'shield-hit' || event.type === 'player-hit') {
        ctx.strokeStyle = event.color;
        ctx.shadowColor = event.color;
        ctx.shadowBlur = 0;
        ctx.lineWidth = (event.type === 'shield-hit' ? 4 : 6) * ratio;
        ctx.beginPath();
        const start = Math.atan2(event.direction.y, event.direction.x) - 0.9;
        ctx.arc(event.x, event.y, 36 + age * 52, start, start + 1.8);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawHud() {
    super.drawHud();
    this.drawComboMomentum();
    this.drawFeedbackCallout();
  }

  drawComboMomentum() {
    if (this.state !== 'playing' || this.combo < 2) return;
    const ctx = this.ctx;
    const rank = comboFeedbackRank(this.combo);
    const ratio = clamp(this.comboTimer / 2.15, 0, 1);
    const width = 250;
    const x = WIDTH / 2 - width / 2;
    const y = 108;

    ctx.save();
    ctx.globalAlpha = 0.74 + this.comboPulse * 0.26;
    ctx.fillStyle = 'rgba(5,10,24,0.82)';
    ctx.strokeStyle = rank.color;
    ctx.lineWidth = 1.5 + this.comboPulse * 1.5;
    roundedRect(ctx, x, y, width, 28, 8);
    ctx.fill();
    ctx.stroke();
    progressBar(ctx, x + 8, y + 20, width - 16, 4, ratio, rank.color, 'rgba(255,255,255,0.08)');
    label(ctx, `${rank.code}  ·  ×${this.combo}`, WIDTH / 2, y + 15, 10, rank.color, 900);
    ctx.restore();
  }

  drawFeedbackCallout() {
    if (!this.feedbackCallout || this.state === 'menu' || this.state === 'upgrade') return;
    const callout = this.feedbackCallout;
    const ratio = clamp(callout.life / callout.maxLife, 0, 1);
    const intro = clamp((1 - ratio) * 7, 0, 1);
    const alpha = Math.min(intro, ratio * 3);
    const width = 310;
    const height = 62;
    const x = WIDTH / 2 - width / 2;
    const y = HEIGHT - 112;
    const slide = (1 - intro) * 18;
    const ctx = this.ctx;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(0, slide);
    ctx.fillStyle = 'rgba(4,9,22,0.9)';
    ctx.strokeStyle = callout.color;
    ctx.lineWidth = 2;
    ctx.shadowColor = callout.color;
    ctx.shadowBlur = 0;
    roundedRect(ctx, x, y, width, height, 10);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    label(ctx, callout.title, WIDTH / 2, y + 25, 15, callout.color, 900);
    label(ctx, callout.subtitle, WIDTH / 2, y + 47, 11, UI_COLORS.text, 800);
    ctx.restore();
  }

  draw() {
    super.draw();
    if (this.state === 'menu') return;
    this.drawScreenFeedback();
  }

  drawScreenFeedback() {
    const ctx = this.ctx;
    ctx.save();

    if (this.wavePulse > 0) {
      const radius = (1 - this.wavePulse) * Math.hypot(WIDTH, HEIGHT) * 0.72;
      ctx.globalAlpha = this.wavePulse * 0.18;
      ctx.strokeStyle = UI_COLORS.player;
      ctx.shadowColor = UI_COLORS.player;
      ctx.shadowBlur = 0;
      ctx.lineWidth = 10 * this.wavePulse;
      ctx.beginPath();
      ctx.arc(WIDTH / 2, HEIGHT / 2, Math.max(24, radius), 0, Math.PI * 2);
      ctx.stroke();
    }

    if (this.damagePulse > 0) {
      const edge = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 190, WIDTH / 2, HEIGHT / 2, 710);
      edge.addColorStop(0, 'rgba(255,82,106,0)');
      edge.addColorStop(0.68, `rgba(255,82,106,${this.damagePulse * 0.04})`);
      edge.addColorStop(1, `rgba(255,38,77,${this.damagePulse * 0.34})`);
      ctx.fillStyle = edge;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }

    if (this.state === 'playing' && this.player.health <= 1) {
      const pulse = (Math.sin(this.elapsed * 5.4) + 1) * 0.5;
      ctx.strokeStyle = `rgba(255,82,106,${0.12 + pulse * 0.12})`;
      ctx.lineWidth = 5 + pulse * 4;
      ctx.strokeRect(3, 3, WIDTH - 6, HEIGHT - 6);
    }

    ctx.restore();
  }

  getSnapshot() {
    return {
      ...super.getSnapshot(),
      version: COMBAT_FEEDBACK_VERSION,
      combatFeedback: this.combatFeedbackVersion,
      directionalImpacts: true,
      recallEnergyPackets: true,
      dashAfterimages: true,
      comboMomentumHud: true,
      screenDamageFeedback: true,
      feedbackEventCount: this.feedbackEvents.length,
      feedbackCalloutActive: Boolean(this.feedbackCallout),
    };
  }
}
