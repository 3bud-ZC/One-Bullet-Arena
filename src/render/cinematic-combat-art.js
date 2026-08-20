import { UI_COLORS } from '../ui-renderer.js';

export const CINEMATIC_COMBAT_ART_VERSION = '3.14.0-cinematic-combat-art';

const STYLE = Object.freeze({
  scout: { core: '#ff6b7f', fill: '#2a1020', accent: '#ffb1bd', glow: 'rgba(255,107,127,0.34)' },
  brute: { core: '#ff9f43', fill: '#2f1b0d', accent: '#ffd08a', glow: 'rgba(255,159,67,0.32)' },
  sniper: { core: '#a78bfa', fill: '#1b1534', accent: '#dfd2ff', glow: 'rgba(167,139,250,0.34)' },
  charger: { core: '#ff526a', fill: '#341017', accent: '#ffc0ca', glow: 'rgba(255,82,106,0.38)' },
  splitter: { core: '#7ef29a', fill: '#102817', accent: '#ccffd6', glow: 'rgba(126,242,154,0.3)' },
  warden: { core: '#4fe4ff', fill: '#0c2530', accent: '#d5f9ff', glow: 'rgba(79,228,255,0.34)' },
  guardian: { core: '#67ddff', fill: '#071322', accent: '#e0fbff', glow: 'rgba(103,221,255,0.36)' },
});

const DEFAULT_STYLE = STYLE.scout;
const HIT_STYLE = Object.freeze({ core: '#fff', fill: '#233142', accent: '#fff', glow: 'rgba(255,255,255,0.45)' });

export function cinematicCombatTokens() {
  return Object.freeze({
    version: CINEMATIC_COMBAT_ART_VERSION,
    renderOnly: true,
    gameplayGeometryChanged: false,
    collisionGeometryChanged: false,
    replacesGeometricCombatShapes: true,
    animatedEffects: true,
    silhouetteDrivenEnemies: true,
    runtimeOwner: 'OneBulletGlobalUiRuntime',
  });
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function normalize(x, y) {
  const length = Math.hypot(Number(x) || 0, Number(y) || 0);
  return length > 0.0001 ? { x: x / length, y: y / length } : { x: 1, y: 0 };
}

function enemyStyle(enemy) {
  if (enemy?.guardian) return STYLE.guardian;
  return STYLE[enemy?.type] || DEFAULT_STYLE;
}

function drawSoftEllipse(ctx, x, y, rx, ry, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBodyGradient(ctx, radius, style, heat = 0) {
  const gradient = ctx.createRadialGradient(-radius * 0.22, -radius * 0.28, radius * 0.12, 0, 0, radius * 1.15);
  gradient.addColorStop(0, style.accent);
  gradient.addColorStop(0.28, style.core);
  gradient.addColorStop(1, style.fill);
  ctx.fillStyle = gradient;
  ctx.shadowColor = style.core;
  ctx.shadowBlur = 5 + heat * 10;
}

function drawTeardrop(ctx, radius, length = 1.35, waist = 0.82, tail = 0.78) {
  ctx.beginPath();
  ctx.moveTo(radius * length, 0);
  ctx.bezierCurveTo(radius * 0.58, -radius * waist, -radius * 0.52, -radius * tail, -radius * 0.96, 0);
  ctx.bezierCurveTo(-radius * 0.52, radius * tail, radius * 0.58, radius * waist, radius * length, 0);
  ctx.closePath();
}

function strokeFeather(ctx, radius, side, color, phase, alpha = 0.48) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.2, radius * 0.11);
  ctx.lineCap = 'round';
  const lift = Math.sin(phase) * radius * 0.08;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.18, side * radius * 0.18);
  ctx.bezierCurveTo(-radius * 0.44, side * (radius * 0.52 + lift), -radius * 1.08, side * radius * 0.78, -radius * 1.54, side * radius * 0.5);
  ctx.stroke();
  ctx.restore();
}

export class CinematicCombatArt {
  constructor() {
    this.tokens = cinematicCombatTokens();
  }

  drawPlayer(ctx, runtime) {
    const player = runtime.player;
    if (!player) return;
    if (player.invulnerability > 0 && Math.floor(runtime.elapsed * 18) % 2 === 0) return;

    const aim = normalize(runtime.pointer.x - player.x, runtime.pointer.y - player.y);
    const angle = Math.atan2(aim.y, aim.x);
    const dash = clamp01(runtime.dashVisual);
    const recoil = runtime.muzzleRecoil ? clamp01(runtime.muzzleRecoil.life / 0.12) : 0;
    const pulse = runtime.reducedMotion ? 0 : Math.sin(runtime.elapsed * 8.2) * 0.035;

    ctx.save();
    ctx.translate(player.x - aim.x * recoil * 6, player.y - aim.y * recoil * 6);
    ctx.rotate(angle);

    if (dash > 0.02 && !runtime.reducedMotion) {
      const trail = ctx.createLinearGradient(-88, 0, -6, 0);
      trail.addColorStop(0, 'rgba(98, 243, 255, 0)');
      trail.addColorStop(0.55, 'rgba(98, 243, 255, 0.12)');
      trail.addColorStop(1, 'rgba(255, 244, 190, 0.28)');
      ctx.fillStyle = trail;
      ctx.globalAlpha = 0.35 + dash * 0.35;
      ctx.beginPath();
      ctx.moveTo(-84, -8);
      ctx.bezierCurveTo(-54, -19, -22, -17, 7, -8);
      ctx.bezierCurveTo(-18, -2, -18, 2, 7, 8);
      ctx.bezierCurveTo(-22, 17, -54, 19, -84, 8);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    const body = ctx.createRadialGradient(-3, -5, 2, 0, 0, 31);
    body.addColorStop(0, '#f4feff');
    body.addColorStop(0.24, '#62f3ff');
    body.addColorStop(1, '#061828');
    ctx.shadowColor = '#62f3ff';
    ctx.shadowBlur = 9 + dash * 8;
    ctx.fillStyle = body;
    ctx.strokeStyle = '#dffbff';
    ctx.lineWidth = 2.4;
    ctx.scale(1 + dash * 0.08 + pulse, 1 - dash * 0.05 - pulse * 0.5);
    drawTeardrop(ctx, 23, 1.32, 0.74, 0.68);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    strokeFeather(ctx, 20, -1, '#9ff8ff', runtime.elapsed * 8, 0.5);
    strokeFeather(ctx, 20, 1, '#9ff8ff', runtime.elapsed * 8 + Math.PI, 0.5);

    ctx.fillStyle = '#fff7c6';
    ctx.beginPath();
    ctx.ellipse(9, 0, 7.6, 4.8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = UI_COLORS.bullet;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.quadraticCurveTo(27, -1.8, 34, 0);
    ctx.stroke();

    if (runtime.bullet?.held) drawSoftEllipse(ctx, 39, 0, 4.3, 3.1, UI_COLORS.bullet, 0.9);
    ctx.restore();
  }

  drawBullet(ctx, runtime) {
    const bullet = runtime.bullet;
    if (!bullet || bullet.held) return;
    const returning = Boolean(bullet.recalling);
    const accent = returning ? '#62d5f3' : UI_COLORS.bullet;
    const trail = Array.isArray(bullet.trail) ? bullet.trail : [];

    ctx.save();
    ctx.lineCap = 'round';
    for (let index = trail.length - 1; index > 0; index -= 1) {
      const point = trail[index];
      const next = trail[index - 1];
      const strength = 1 - index / trail.length;
      ctx.globalAlpha = 0.1 + strength * 0.62;
      ctx.strokeStyle = returning ? '#62d5f3' : '#ffd441';
      ctx.lineWidth = 1.8 + strength * 9;
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.quadraticCurveTo((point.x + next.x) * 0.5, (point.y + next.y) * 0.5 + Math.sin(runtime.elapsed * 7 + index) * 1.8, next.x, next.y);
      ctx.stroke();
    }

    if (returning) this.drawRecallRibbon(ctx, runtime);

    const velocity = normalize(bullet.vx, bullet.vy);
    const angle = Math.atan2(velocity.y, velocity.x);
    const pulse = runtime.reducedMotion ? 1 : 1 + Math.sin(runtime.elapsed * 18) * 0.1;
    ctx.translate(bullet.x, bullet.y);
    ctx.rotate(angle);
    ctx.globalAlpha = 1;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 12;
    const core = ctx.createRadialGradient(-2, -2, 1, 0, 0, bullet.radius * 1.45);
    core.addColorStop(0, '#fffdf0');
    core.addColorStop(0.45, accent);
    core.addColorStop(1, 'rgba(255,212,65,0.22)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.ellipse(0, 0, bullet.radius * 1.45 * pulse, bullet.radius * 0.92, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fffdf0';
    ctx.beginPath();
    ctx.ellipse(2.5, 0, Math.max(2.5, bullet.radius * 0.38), Math.max(1.8, bullet.radius * 0.26), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    this.drawDistantBulletCue(ctx, runtime);
  }

  drawRecallRibbon(ctx, runtime) {
    const bullet = runtime.bullet;
    const player = runtime.player;
    const dx = player.x - bullet.x;
    const dy = player.y - bullet.y;
    const length = Math.hypot(dx, dy);
    if (length <= 38) return;
    const direction = normalize(dx, dy);
    const normalX = -direction.y;
    const normalY = direction.x;
    const bend = Math.min(34, length * 0.075) * Math.sin(runtime.elapsed * 6.5);
    const cx = (player.x + bullet.x) * 0.5 + normalX * bend;
    const cy = (player.y + bullet.y) * 0.5 + normalY * bend;

    ctx.save();
    ctx.globalAlpha = 0.28 + clamp01(runtime.recallVisual) * 0.22;
    ctx.strokeStyle = '#6dd7f2';
    ctx.shadowColor = '#62d5f3';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(bullet.x, bullet.y);
    ctx.quadraticCurveTo(cx, cy, player.x, player.y);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha *= 0.65;
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = '#f4feff';
    ctx.beginPath();
    ctx.moveTo(bullet.x, bullet.y);
    ctx.quadraticCurveTo(cx, cy, player.x, player.y);
    ctx.stroke();
    ctx.restore();
  }

  drawDistantBulletCue(ctx, runtime) {
    const bullet = runtime.bullet;
    if (!bullet || bullet.held || bullet.recalling) return;
    const dx = bullet.x - runtime.player.x;
    const dy = bullet.y - runtime.player.y;
    const length = Math.hypot(dx, dy);
    if (length <= 250) return;
    const direction = normalize(dx, dy);
    const x = runtime.player.x + direction.x * 58;
    const y = runtime.player.y + direction.y * 58;
    const normalX = -direction.y;
    const normalY = direction.x;

    ctx.save();
    ctx.globalAlpha = 0.78;
    ctx.strokeStyle = UI_COLORS.bullet;
    ctx.fillStyle = '#fff1a8';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + direction.x * 11, y + direction.y * 11);
    ctx.quadraticCurveTo(x - direction.x * 2 + normalX * 7, y - direction.y * 2 + normalY * 7, x - direction.x * 10, y - direction.y * 10);
    ctx.moveTo(x + direction.x * 11, y + direction.y * 11);
    ctx.quadraticCurveTo(x - direction.x * 2 - normalX * 7, y - direction.y * 2 - normalY * 7, x - direction.x * 10, y - direction.y * 10);
    ctx.stroke();
    drawSoftEllipse(ctx, x + direction.x * 12, y + direction.y * 12, 3.8, 3.8, '#fff1a8', 0.8);
    ctx.restore();
  }

  drawEnemy(ctx, runtime, enemy) {
    if (enemy?.guardian) return this.drawGuardian(ctx, runtime, enemy);
    const type = enemy?.type || 'scout';
    if (type === 'brute') return this.drawBrute(ctx, runtime, enemy);
    if (type === 'sniper') return this.drawSniper(ctx, runtime, enemy);
    if (type === 'charger') return this.drawCharger(ctx, runtime, enemy);
    if (type === 'warden') return this.drawWarden(ctx, runtime, enemy);
    if (type === 'splitter') return this.drawSplitter(ctx, runtime, enemy);
    return this.drawScout(ctx, runtime, enemy);
  }

  beginEnemy(ctx, runtime, enemy, style, heat = 0) {
    const radius = enemy.radius || 16;
    const spawnScale = Math.max(0.2, 1 - (Number(enemy.spawnTime) || 0) * 0.65);
    const hit = enemy.hitFlash > 0;
    const squash = clamp01(enemy.hitSquash);
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    if (squash > 0) {
      const angle = Math.atan2(enemy.hitDirY || 0, enemy.hitDirX || 0);
      ctx.rotate(angle);
      ctx.scale(1 - squash * 0.28, 1 + squash * 0.2);
      ctx.rotate(-angle);
    }
    ctx.scale(spawnScale, spawnScale);
    ctx.globalAlpha = enemy.spawnTime > 0 ? 0.45 + spawnScale * 0.55 : 1;
    ctx.strokeStyle = hit ? '#fff' : style.accent;
    ctx.lineWidth = enemy.mini ? 1.8 : 2.5;
    drawBodyGradient(ctx, radius, hit ? HIT_STYLE : style, heat);
    return radius;
  }

  drawCore(ctx, radius, style, x = 0, y = 0, alpha = 1) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.shadowBlur = 0;
    ctx.fillStyle = style.core;
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(3.5, radius * 0.24), Math.max(2.5, radius * 0.18), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = style.accent;
    ctx.beginPath();
    ctx.ellipse(x - radius * 0.05, y - radius * 0.06, Math.max(1.3, radius * 0.075), Math.max(1.1, radius * 0.06), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawScout(ctx, runtime, enemy) {
    const style = enemyStyle(enemy);
    const radius = this.beginEnemy(ctx, runtime, enemy, style, 0.15);
    const toPlayer = normalize(runtime.player.x - enemy.x, runtime.player.y - enemy.y);
    ctx.rotate(Math.atan2(toPlayer.y, toPlayer.x));
    const wing = runtime.reducedMotion ? 0 : Math.sin(enemy.phase * 9.5) * radius * 0.12;
    drawTeardrop(ctx, radius, enemy.mini ? 1.12 : 1.24, 0.58, 0.52);
    ctx.fill();
    ctx.stroke();
    strokeFeather(ctx, radius, -1, style.core, enemy.phase * 10, 0.62);
    strokeFeather(ctx, radius, 1, style.core, enemy.phase * 10 + Math.PI, 0.62);
    ctx.strokeStyle = style.accent;
    ctx.globalAlpha = 0.62;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.4, -radius * 0.35 - wing);
    ctx.quadraticCurveTo(radius * 0.05, -radius * 0.18, radius * 0.62, 0);
    ctx.moveTo(-radius * 0.4, radius * 0.35 + wing);
    ctx.quadraticCurveTo(radius * 0.05, radius * 0.18, radius * 0.62, 0);
    ctx.stroke();
    this.drawCore(ctx, radius, style, radius * 0.16, 0);
    ctx.restore();
  }

  drawBrute(ctx, runtime, enemy) {
    const style = enemyStyle(enemy);
    const radius = this.beginEnemy(ctx, runtime, enemy, style, 0.08);
    const breath = runtime.reducedMotion ? 0 : Math.sin(enemy.phase * 3.2) * radius * 0.04;
    ctx.scale(1 + breath / radius, 1 - breath / radius * 0.45);
    ctx.beginPath();
    ctx.moveTo(radius * 0.82, -radius * 0.2);
    ctx.bezierCurveTo(radius * 0.7, -radius * 0.9, -radius * 0.38, -radius * 1.08, -radius * 0.92, -radius * 0.52);
    ctx.bezierCurveTo(-radius * 1.22, -radius * 0.16, -radius * 1.16, radius * 0.44, -radius * 0.58, radius * 0.82);
    ctx.bezierCurveTo(0, radius * 1.12, radius * 0.9, radius * 0.78, radius * 0.98, radius * 0.12);
    ctx.bezierCurveTo(radius * 1.08, -radius * 0.02, radius * 1.02, -radius * 0.12, radius * 0.82, -radius * 0.2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = style.core;
    ctx.globalAlpha = 0.52;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.52, -radius * 0.28);
    ctx.quadraticCurveTo(0, -radius * 0.56, radius * 0.48, -radius * 0.2);
    ctx.moveTo(-radius * 0.5, radius * 0.2);
    ctx.quadraticCurveTo(0, radius * 0.5, radius * 0.56, radius * 0.1);
    ctx.stroke();
    this.drawCore(ctx, radius, style, radius * 0.14, 0, 0.9);
    ctx.restore();
  }

  drawSniper(ctx, runtime, enemy) {
    const style = enemyStyle(enemy);
    const radius = this.beginEnemy(ctx, runtime, enemy, style, 0.12);
    const toPlayer = normalize(runtime.player.x - enemy.x, runtime.player.y - enemy.y);
    ctx.rotate(Math.atan2(toPlayer.y, toPlayer.x));
    ctx.scale(1.2, 0.82);
    drawTeardrop(ctx, radius, 1.48, 0.5, 0.4);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = style.core;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(radius * 0.42, 0);
    ctx.quadraticCurveTo(radius * 1.1, -radius * 0.04, radius * 1.7, 0);
    ctx.stroke();
    ctx.globalAlpha = 0.55 + clamp01(enemy.shotTelegraph) * 0.35;
    ctx.strokeStyle = style.accent;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.55, -radius * 0.32);
    ctx.quadraticCurveTo(0, -radius * 0.12, radius * 0.56, -radius * 0.24);
    ctx.moveTo(-radius * 0.55, radius * 0.32);
    ctx.quadraticCurveTo(0, radius * 0.12, radius * 0.56, radius * 0.24);
    ctx.stroke();
    this.drawCore(ctx, radius, style, radius * 0.25, 0);
    ctx.restore();
  }

  drawCharger(ctx, runtime, enemy) {
    const style = enemyStyle(enemy);
    const heat = clamp01(enemy.chargeTelegraph ? 1 - enemy.chargeTelegraph / 0.62 : 0);
    const radius = this.beginEnemy(ctx, runtime, enemy, style, heat);
    const direction = enemy.chargeDirection?.x || enemy.chargeDirection?.y
      ? enemy.chargeDirection
      : normalize(runtime.player.x - enemy.x, runtime.player.y - enemy.y);
    ctx.rotate(Math.atan2(direction.y, direction.x));
    ctx.scale(1 + heat * 0.18, 1 - heat * 0.08);
    drawTeardrop(ctx, radius, 1.42, 0.7, 0.54);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = style.accent;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(radius * 0.54, -radius * 0.34);
    ctx.quadraticCurveTo(radius * 1.24, -radius * 0.28, radius * 1.52, -radius * 0.08);
    ctx.moveTo(radius * 0.54, radius * 0.34);
    ctx.quadraticCurveTo(radius * 1.24, radius * 0.28, radius * 1.52, radius * 0.08);
    ctx.stroke();
    if (heat > 0.05) {
      ctx.globalAlpha = 0.36 + heat * 0.28;
      ctx.strokeStyle = style.core;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-radius * 1.25, 0);
      ctx.quadraticCurveTo(-radius * 1.85, Math.sin(runtime.elapsed * 18) * radius * 0.26, -radius * 2.36, 0);
      ctx.stroke();
    }
    this.drawCore(ctx, radius, style, radius * 0.18, 0);
    ctx.restore();
  }

  drawSplitter(ctx, runtime, enemy) {
    const style = enemyStyle(enemy);
    const radius = this.beginEnemy(ctx, runtime, enemy, style, 0.2);
    const wobble = runtime.reducedMotion ? 0 : Math.sin(enemy.phase * 8.8) * radius * 0.08;
    ctx.rotate(Math.sin(enemy.phase * 2.2) * 0.18);
    ctx.beginPath();
    ctx.moveTo(radius * 0.9, 0);
    ctx.bezierCurveTo(radius * 0.72, -radius * 0.78, radius * 0.05 + wobble, -radius * 1.05, -radius * 0.36, -radius * 0.52);
    ctx.bezierCurveTo(-radius * 0.92, -radius * 0.86, -radius * 1.28, -radius * 0.16, -radius * 0.82, radius * 0.24);
    ctx.bezierCurveTo(-radius * 0.48, radius * 0.96, radius * 0.22 - wobble, radius * 0.84, radius * 0.9, 0);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = style.accent;
    ctx.globalAlpha = 0.76;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.68, -radius * 0.12);
    ctx.bezierCurveTo(-radius * 0.18, -radius * 0.32, radius * 0.18, -radius * 0.26, radius * 0.66, -radius * 0.08);
    ctx.moveTo(-radius * 0.68, radius * 0.18);
    ctx.bezierCurveTo(-radius * 0.18, radius * 0.42, radius * 0.18, radius * 0.34, radius * 0.66, radius * 0.08);
    ctx.stroke();
    this.drawCore(ctx, radius, style, -radius * 0.18, -radius * 0.14, 0.86);
    this.drawCore(ctx, radius, style, radius * 0.22, radius * 0.16, 0.68);
    ctx.restore();
  }

  drawWarden(ctx, runtime, enemy) {
    const style = enemyStyle(enemy);
    const active = (enemy.guardBrokenTimer || 0) <= 0;
    const strength = clamp01((enemy.guardStrength || 0) / Math.max(1, enemy.guardMax || 1));
    const radius = this.beginEnemy(ctx, runtime, enemy, style, active ? strength : 0);
    const breath = runtime.reducedMotion ? 0 : Math.sin(enemy.phase * 3.4) * 0.035;
    ctx.scale(1 + breath, 1 - breath * 0.45);
    ctx.beginPath();
    ctx.moveTo(radius * 0.82, 0);
    ctx.bezierCurveTo(radius * 0.58, -radius * 0.86, -radius * 0.62, -radius * 0.92, -radius * 0.98, -radius * 0.16);
    ctx.bezierCurveTo(-radius * 1.12, radius * 0.3, -radius * 0.5, radius * 0.95, radius * 0.28, radius * 0.76);
    ctx.bezierCurveTo(radius * 0.88, radius * 0.58, radius * 1.02, radius * 0.18, radius * 0.82, 0);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    this.drawCore(ctx, radius, style, -radius * 0.1, 0);

    const guardAngle = Number(enemy.guardAngle);
    if (Number.isFinite(guardAngle)) {
      ctx.save();
      ctx.rotate(guardAngle);
      ctx.globalAlpha = active ? 0.46 + strength * 0.5 : 0.2;
      ctx.strokeStyle = active ? '#bff8ff' : UI_COLORS.danger;
      ctx.fillStyle = active ? 'rgba(79, 228, 255, 0.16)' : 'rgba(255, 82, 106, 0.12)';
      ctx.lineWidth = active ? 3.2 + strength * 3.2 : 2.2;
      ctx.beginPath();
      ctx.moveTo(radius * 0.28, -radius * 0.84);
      ctx.bezierCurveTo(radius * 1.18, -radius * 0.68, radius * 1.44, -radius * 0.22, radius * 1.46, 0);
      ctx.bezierCurveTo(radius * 1.44, radius * 0.22, radius * 1.18, radius * 0.68, radius * 0.28, radius * 0.84);
      ctx.stroke();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  drawGuardian(ctx, runtime, enemy) {
    const style = enemyStyle(enemy);
    const open = enemy.phaseName === 'stalk';
    const radius = this.beginEnemy(ctx, runtime, enemy, style, open ? 0.12 : 0.45);
    const slow = runtime.reducedMotion ? 0 : Math.sin(enemy.phase * 1.8) * 0.04;
    ctx.scale(1 + slow, 1 - slow * 0.5);
    ctx.beginPath();
    ctx.moveTo(radius * 0.98, 0);
    ctx.bezierCurveTo(radius * 0.78, -radius * 0.92, -radius * 0.68, -radius * 1.05, -radius * 1.05, -radius * 0.2);
    ctx.bezierCurveTo(-radius * 1.24, radius * 0.34, -radius * 0.46, radius * 1.08, radius * 0.5, radius * 0.78);
    ctx.bezierCurveTo(radius * 1.04, radius * 0.58, radius * 1.22, radius * 0.14, radius * 0.98, 0);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = style.core;
    ctx.globalAlpha = open ? 0.78 : 0.34;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 0.58, radius * 0.34, enemy.phase * 0.1, 0, Math.PI * 2);
    ctx.stroke();
    this.drawCore(ctx, radius, style, 0, 0, open ? 1 : 0.38);

    if (!open) {
      ctx.save();
      ctx.rotate(enemy.guardAngle || 0);
      ctx.globalAlpha = 0.72;
      ctx.strokeStyle = UI_COLORS.danger;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(radius * 0.34, -radius * 0.9);
      ctx.bezierCurveTo(radius * 1.18, -radius * 0.52, radius * 1.3, radius * 0.52, radius * 0.34, radius * 0.9);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  drawEnemyShot(ctx, shot, runtime) {
    const velocity = normalize(shot.vx, shot.vy);
    const angle = Math.atan2(velocity.y, velocity.x);
    ctx.save();
    ctx.translate(shot.x, shot.y);
    ctx.rotate(angle);
    ctx.lineCap = 'round';
    const trail = ctx.createLinearGradient(-38, 0, 4, 0);
    trail.addColorStop(0, 'rgba(255, 82, 106, 0)');
    trail.addColorStop(0.64, 'rgba(255, 82, 106, 0.38)');
    trail.addColorStop(1, 'rgba(255, 218, 226, 0.92)');
    ctx.strokeStyle = trail;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-38, 0);
    ctx.quadraticCurveTo(-18, Math.sin(runtime.elapsed * 14 + shot.x) * 2.5, 0, 0);
    ctx.stroke();
    ctx.shadowColor = UI_COLORS.danger;
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffd4df';
    ctx.beginPath();
    ctx.ellipse(0, 0, (shot.radius || 5) * 1.25, (shot.radius || 5) * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawThreat(ctx, runtime, enemy, priority, ready, telegraphing) {
    const style = enemyStyle(enemy);
    const radius = enemy.radius + (priority ? 12 : 7) + (telegraphing ? 5 : 0);
    const phase = runtime.elapsed * (priority ? 5.2 : 7.4) + (Number(enemy.id) || 0);
    const alpha = priority ? 0.72 : telegraphing ? 0.6 : 0.36;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = priority ? UI_COLORS.bullet : telegraphing ? UI_COLORS.danger : style.core;
    ctx.lineWidth = priority ? 2.5 : 1.8;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i += 1) {
      const a = phase + i * Math.PI * 2 / 3;
      const x = Math.cos(a) * radius;
      const y = Math.sin(a) * radius;
      ctx.beginPath();
      ctx.moveTo(x * 0.82, y * 0.82);
      ctx.quadraticCurveTo(Math.cos(a + 0.28) * radius * 1.05, Math.sin(a + 0.28) * radius * 1.05, Math.cos(a + 0.55) * radius * 0.82, Math.sin(a + 0.55) * radius * 0.82);
      ctx.stroke();
    }
    if (priority) {
      ctx.fillStyle = UI_COLORS.bullet;
      drawSoftEllipse(ctx, 0, -radius - 10, 4.4, 6.2, UI_COLORS.bullet, 0.85);
    }
    ctx.restore();
  }

  drawParticles(ctx, runtime) {
    const particles = runtime.particles || [];
    if (particles.length <= 0) return;
    ctx.save();
    ctx.lineCap = 'round';
    for (const particle of particles) {
      const t = clamp01(particle.life);
      if (t <= 0) continue;
      const color = particle.color || '#62f3ff';
      if (particle.type === 'ring') {
        ctx.globalAlpha = t * 0.24;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2 + t * 1.4;
        ctx.beginPath();
        ctx.ellipse(particle.x, particle.y, particle.radius || 8, (particle.radius || 8) * 0.58, runtime.elapsed * 0.55, 0, Math.PI * 2);
        ctx.stroke();
        continue;
      }
      const speed = Math.hypot(particle.vx || 0, particle.vy || 0) || 1;
      const ux = (particle.vx || 0) / speed;
      const uy = (particle.vy || 0) / speed;
      ctx.globalAlpha = t * 0.68;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2 + t * 2.2;
      ctx.beginPath();
      ctx.moveTo(particle.x, particle.y);
      ctx.quadraticCurveTo(particle.x - ux * 4 + uy * 3, particle.y - uy * 4 - ux * 3, particle.x - ux * 14 * t, particle.y - uy * 14 * t);
      ctx.stroke();
      drawSoftEllipse(ctx, particle.x, particle.y, 1.2 + t * 2.2, 1 + t * 1.7, color, t * 0.34);
    }
    ctx.restore();
  }
}
