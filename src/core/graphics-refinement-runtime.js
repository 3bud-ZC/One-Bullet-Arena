import { clamp, normalize } from '../arena.js';
import { UI_COLORS, polygon, roundedRect } from '../ui-renderer.js';
import { OneBulletInterfaceRedesignRuntime } from './interface-redesign-runtime.js';

export const GRAPHICS_REFINEMENT_RUNTIME_VERSION = '3.5.0-graphics-refinement';

const ENEMY_GRAPHICS = Object.freeze({
  scout: Object.freeze({ core: '#ff637d', rim: '#ffb4c2', fill: '#190b18', sides: 4 }),
  brute: Object.freeze({ core: '#ffad52', rim: '#ffd38f', fill: '#211309', sides: 4 }),
  sniper: Object.freeze({ core: '#b98aff', rim: '#e3d0ff', fill: '#140d24', sides: 6 }),
  charger: Object.freeze({ core: '#5cf2aa', rim: '#c2ffe0', fill: '#082019', sides: 3 }),
  splitter: Object.freeze({ core: '#ff7bd0', rim: '#ffc8ed', fill: '#220d20', sides: 5 }),
  warden: Object.freeze({ core: '#8da8ff', rim: '#e2e9ff', fill: '#0b1330', sides: 8 }),
});

function enemyStyle(type) {
  return ENEMY_GRAPHICS[type] || ENEMY_GRAPHICS.scout;
}

function strokeArc(ctx, x, y, radius, start, end, color, width = 2, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(x, y, radius, start, end);
  ctx.stroke();
  ctx.restore();
}

export class OneBulletGraphicsRefinementRuntime extends OneBulletInterfaceRedesignRuntime {
  constructor(canvas, liveRegion = null) {
    super(canvas, liveRegion);
    this.graphicsRefinementRuntimeVersion = GRAPHICS_REFINEMENT_RUNTIME_VERSION;
  }

  drawPlayer() {
    if (this.player.invulnerability > 0 && Math.floor(this.elapsed * 18) % 2 === 0) return;
    const ctx = this.ctx;
    const aim = normalize(this.pointer.x - this.player.x, this.pointer.y - this.player.y);
    const rotation = Math.atan2(aim.y, aim.x);
    const dashing = this.player.dashRemaining > 0;
    const pulse = 1 + Math.sin(this.elapsed * 6.8) * 0.025;

    ctx.save();
    ctx.translate(this.player.x, this.player.y);
    ctx.rotate(rotation);

    if (dashing) {
      for (let index = 0; index < 3; index += 1) {
        const length = 68 + index * 25;
        ctx.globalAlpha = 0.34 - index * 0.07;
        ctx.strokeStyle = UI_COLORS.player;
        ctx.lineWidth = 5 - index;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-18, -10 + index * 10);
        ctx.lineTo(-length, -10 + index * 10);
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
    ctx.scale(pulse, pulse);

    const hull = ctx.createLinearGradient(-22, -18, 28, 18);
    hull.addColorStop(0, '#071523');
    hull.addColorStop(0.5, '#123754');
    hull.addColorStop(1, '#07121f');
    ctx.fillStyle = hull;
    ctx.strokeStyle = UI_COLORS.player;
    ctx.lineWidth = 2.4;
    ctx.shadowColor = UI_COLORS.player;
    ctx.shadowBlur = 18 + (dashing ? 14 : 0);

    ctx.beginPath();
    ctx.moveTo(29, 0);
    ctx.lineTo(8, -15);
    ctx.lineTo(-7, -13);
    ctx.lineTo(-17, -6);
    ctx.lineTo(-24, 0);
    ctx.lineTo(-17, 6);
    ctx.lineTo(-7, 13);
    ctx.lineTo(8, 15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(95, 243, 255, 0.11)';
    ctx.beginPath();
    ctx.moveTo(5, -11);
    ctx.lineTo(-6, -22);
    ctx.lineTo(-18, -18);
    ctx.lineTo(-9, -8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(98,243,255,0.6)';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(5, 11);
    ctx.lineTo(-6, 22);
    ctx.lineTo(-18, 18);
    ctx.lineTo(-9, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#dfffff';
    ctx.shadowColor = UI_COLORS.player;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(2, 0, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = UI_COLORS.player;
    ctx.beginPath();
    ctx.arc(2, 0, 3.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = UI_COLORS.bullet;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = UI_COLORS.bullet;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(33, 0);
    ctx.stroke();

    ctx.shadowBlur = 10;
    ctx.fillStyle = dashing ? '#dfffff' : '#4fc8ef';
    ctx.beginPath();
    ctx.moveTo(-21, -6);
    ctx.lineTo(-31 - (dashing ? 9 : 0), -3);
    ctx.lineTo(-31 - (dashing ? 9 : 0), 3);
    ctx.lineTo(-21, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    const ringPulse = this.player.radius + 16 + Math.sin(this.elapsed * 5) * 1.5;
    strokeArc(ctx, this.player.x, this.player.y, ringPulse, -0.9, 0.9, UI_COLORS.player, 1.2, 0.28);
    strokeArc(ctx, this.player.x, this.player.y, ringPulse, Math.PI - 0.9, Math.PI + 0.9, UI_COLORS.player, 1.2, 0.28);

    if (this.player.shield > 0) {
      ctx.save();
      ctx.strokeStyle = UI_COLORS.electric;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = UI_COLORS.electric;
      ctx.shadowBlur = 15;
      ctx.setLineDash([10, 7]);
      ctx.lineDashOffset = -this.elapsed * 24;
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, this.player.radius + 17, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawBullet() {
    const ctx = this.ctx;
    const returning = this.bullet.recalling;
    const accent = returning ? '#68a8ff' : '#ffe66d';

    ctx.save();
    if (this.bullet.trail.length > 1) {
      ctx.lineCap = 'round';
      for (let index = this.bullet.trail.length - 1; index > 0; index -= 1) {
        const point = this.bullet.trail[index];
        const next = this.bullet.trail[index - 1];
        const strength = 1 - index / this.bullet.trail.length;
        ctx.strokeStyle = returning
          ? `rgba(104,168,255,${0.04 + strength * 0.62})`
          : `rgba(255,230,109,${0.04 + strength * 0.68})`;
        ctx.lineWidth = 1 + strength * 8;
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(next.x, next.y);
        ctx.stroke();
      }
    }

    if (returning) {
      ctx.strokeStyle = 'rgba(104,168,255,0.44)';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([8, 9]);
      ctx.lineDashOffset = -this.elapsed * 58;
      ctx.beginPath();
      ctx.moveTo(this.player.x, this.player.y);
      ctx.lineTo(this.bullet.x, this.bullet.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.translate(this.bullet.x, this.bullet.y);
    ctx.rotate(this.elapsed * 7.8);
    ctx.shadowColor = accent;
    ctx.shadowBlur = 26;
    ctx.fillStyle = accent;
    polygon(ctx, 6, this.bullet.radius * 1.45, Math.PI / 6);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fffdf2';
    polygon(ctx, 6, Math.max(3.2, this.bullet.radius * 0.58), Math.PI / 6);
    ctx.fill();

    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.6;
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.arc(0, 0, 18 + Math.sin(this.elapsed * 12) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.28;
    ctx.beginPath();
    ctx.arc(0, 0, 25 + Math.sin(this.elapsed * 7) * 2.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    if (this.muzzleFlash > 0) {
      const alpha = clamp(this.muzzleFlash * 7, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(this.player.x, this.player.y);
      const aim = normalize(this.pointer.x - this.player.x, this.pointer.y - this.player.y);
      ctx.rotate(Math.atan2(aim.y, aim.x));
      ctx.fillStyle = UI_COLORS.bullet;
      ctx.shadowColor = UI_COLORS.bullet;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.moveTo(28, 0);
      ctx.lineTo(52, -7);
      ctx.lineTo(45, 0);
      ctx.lineTo(52, 7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  drawEnemyBody(enemy) {
    const ctx = this.ctx;
    const style = enemyStyle(enemy.type);
    const hit = enemy.hitFlash > 0;
    const spawnScale = Math.max(0.2, 1 - enemy.spawnTime * 0.65);
    const r = enemy.radius;
    const toPlayer = normalize(this.player.x - enemy.x, this.player.y - enemy.y);
    const face = Math.atan2(toPlayer.y, toPlayer.x);

    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.scale(spawnScale, spawnScale);
    ctx.rotate(enemy.type === 'charger' || enemy.type === 'sniper' ? face : enemy.phase * 0.14);
    ctx.shadowColor = hit ? '#ffffff' : style.core;
    ctx.shadowBlur = hit ? 26 : enemy.type === 'warden' ? 28 : 16;
    ctx.fillStyle = hit ? '#f8fbff' : style.fill;
    ctx.strokeStyle = hit ? '#ffffff' : style.core;
    ctx.lineWidth = enemy.mini ? 1.8 : enemy.type === 'warden' ? 3.4 : 2.4;

    if (enemy.type === 'brute') {
      roundedRect(ctx, -r, -r, r * 2, r * 2, 5);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 0.65;
      roundedRect(ctx, -r + 7, -r + 7, r * 2 - 14, r * 2 - 14, 3);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = style.core;
      ctx.fillRect(-r - 5, -r * 0.55, 7, r * 1.1);
      ctx.fillRect(r - 2, -r * 0.55, 7, r * 1.1);
    } else if (enemy.type === 'charger') {
      ctx.beginPath();
      ctx.moveTo(r + 8, 0);
      ctx.lineTo(-r * 0.55, -r * 0.88);
      ctx.lineTo(-r * 0.18, -r * 0.28);
      ctx.lineTo(-r, 0);
      ctx.lineTo(-r * 0.18, r * 0.28);
      ctx.lineTo(-r * 0.55, r * 0.88);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 0.58;
      ctx.beginPath();
      ctx.moveTo(r * 0.2, -r * 0.5);
      ctx.lineTo(r * 0.72, 0);
      ctx.lineTo(r * 0.2, r * 0.5);
      ctx.stroke();
    } else if (enemy.type === 'sniper') {
      polygon(ctx, 6, r + 2, Math.PI / 6);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 0.52;
      ctx.beginPath();
      ctx.moveTo(-r * 0.45, 0);
      ctx.lineTo(r * 1.35, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
      ctx.stroke();
    } else if (enemy.type === 'splitter') {
      polygon(ctx, 5, r + 2, -Math.PI / 2);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 0.55;
      ctx.rotate(-enemy.phase * 0.5);
      polygon(ctx, 5, r * 0.58, Math.PI / 2);
      ctx.stroke();
      ctx.rotate(enemy.phase * 0.5);
      ctx.beginPath();
      ctx.moveTo(-r * 0.72, 0);
      ctx.lineTo(r * 0.72, 0);
      ctx.moveTo(0, -r * 0.72);
      ctx.lineTo(0, r * 0.72);
      ctx.stroke();
    } else if (enemy.type === 'warden') {
      polygon(ctx, 8, r + 4, Math.PI / 8);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 0.48;
      ctx.rotate(-this.elapsed * 0.45);
      polygon(ctx, 8, r * 0.72, 0);
      ctx.stroke();
      ctx.rotate(this.elapsed * 0.45);
      ctx.globalAlpha = 0.72;
      for (let index = 0; index < 4; index += 1) {
        const angle = index * Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * r * 0.82, Math.sin(angle) * r * 0.82);
        ctx.lineTo(Math.cos(angle) * r * 1.18, Math.sin(angle) * r * 1.18);
        ctx.stroke();
      }
    } else {
      polygon(ctx, 4, r + 2, Math.PI / 4);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 0.5;
      ctx.rotate(-enemy.phase * 0.42);
      polygon(ctx, 4, r * 0.58, Math.PI / 4);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.shadowColor = style.core;
    ctx.shadowBlur = 15;
    ctx.fillStyle = style.core;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(4, r * 0.26), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = style.rim;
    ctx.beginPath();
    ctx.arc(-1.5, -1.5, Math.max(1.5, r * 0.09), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    strokeArc(ctx, enemy.x, enemy.y, r + 10, -0.55, 0.55, style.core, 1.3, 0.3);
    strokeArc(ctx, enemy.x, enemy.y, r + 10, Math.PI - 0.55, Math.PI + 0.55, style.core, 1.3, 0.3);
  }

  drawEnemyShots() {
    const ctx = this.ctx;
    for (const shot of this.enemyShots) {
      const velocity = normalize(shot.vx, shot.vy);
      const angle = Math.atan2(velocity.y, velocity.x);
      ctx.save();
      ctx.translate(shot.x, shot.y);
      ctx.rotate(angle);

      const trail = ctx.createLinearGradient(-34, 0, 0, 0);
      trail.addColorStop(0, 'rgba(255,77,111,0)');
      trail.addColorStop(1, 'rgba(255,128,154,0.9)');
      ctx.fillStyle = trail;
      ctx.beginPath();
      ctx.moveTo(-38, -4.5);
      ctx.lineTo(2, -2.5);
      ctx.lineTo(2, 2.5);
      ctx.lineTo(-38, 4.5);
      ctx.closePath();
      ctx.fill();

      ctx.shadowColor = UI_COLORS.danger;
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#ff6787';
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(0, -5.5);
      ctx.lineTo(-6, 0);
      ctx.lineTo(0, 5.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffe4eb';
      ctx.beginPath();
      ctx.arc(2, 0, Math.max(1.5, shot.radius * 0.42), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawObstacle(obstacle) {
    super.drawObstacle(obstacle);
    const ctx = this.ctx;
    const cut = Math.min(12, obstacle.w * 0.12, obstacle.h * 0.22);
    ctx.save();
    ctx.globalAlpha = 0.24;
    ctx.strokeStyle = '#d8efff';
    ctx.lineWidth = 1;
    roundedRect(ctx, obstacle.x + 8, obstacle.y + 8, obstacle.w - 16, obstacle.h - 16, Math.max(2, cut - 4));
    ctx.stroke();
    ctx.globalAlpha = 0.62;
    ctx.fillStyle = '#ffe66d';
    const cx = obstacle.x + obstacle.w / 2;
    const cy = obstacle.y + obstacle.h / 2;
    const marker = Math.min(12, obstacle.w * 0.11, obstacle.h * 0.11);
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-marker / 2, -marker / 2, marker, marker);
    ctx.fillStyle = '#081220';
    ctx.fillRect(-marker / 4, -marker / 4, marker / 2, marker / 2);
    ctx.restore();
  }

  getSnapshot() {
    return {
      ...super.getSnapshot(),
      graphicsRefinementRuntimeVersion: GRAPHICS_REFINEMENT_RUNTIME_VERSION,
      graphicsRefinementActive: true,
      playerVisualRevision: 'tactical-interceptor-v2',
      enemyVisualRevision: 'distinct-silhouette-v2',
      bulletVisualRevision: 'reactor-core-v2',
      hostileProjectileVisualRevision: 'directional-bolt-v2',
      obstacleDetailRevision: 'tactical-inset-markers-v2',
      gameplayGeometryChanged: false,
      collisionGeometryChanged: false,
    };
  }
}
