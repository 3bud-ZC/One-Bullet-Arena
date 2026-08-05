import { COLORS, GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from './config.js';
import { clamp, normalize } from './arena.js';

export class WorldRenderer {
  constructor(context) {
    this.ctx = context;
  }

  draw(game) {
    const ctx = this.ctx;
    ctx.save();
    if (game.shake > 0 && !game.reducedMotion) {
      ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
    }
    this.drawArena(game);
    if (game.state !== 'menu') {
      this.drawBullet(game);
      this.drawEnemies(game);
      this.drawEnemyShots(game);
      this.drawPlayer(game);
      this.drawParticles(game);
      this.drawFloatingTexts(game);
      if (game.banner && game.state === 'playing') this.drawBanner(game);
    }
    if (game.flash > 0) {
      ctx.fillStyle = `rgba(255, 45, 82, ${game.flash * 0.16})`;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
    ctx.restore();
  }

  drawArena(game) {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(-20, -20, WIDTH + 40, HEIGHT + 40);
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    const grid = 48;
    const offset = game.reducedMotion ? 0 : game.elapsed * 6 % grid;
    for (let x = -grid + offset; x <= WIDTH + grid; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
    }
    for (let y = -grid + offset; y <= HEIGHT + grid; y += grid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y);
      ctx.stroke();
    }

    const glow = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 80, WIDTH / 2, HEIGHT / 2, 640);
    glow.addColorStop(0, 'rgba(45, 76, 150, 0.15)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    if (game.state === 'menu') return;
    this.drawLockedSpace(game.arenaStage.bounds);
    for (const obstacle of game.arenaStage.obstacles) this.drawObstacle(obstacle);
    this.drawArenaBorder(game);
  }

  drawLockedSpace(bounds) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(1, 3, 10, 0.93)';
    ctx.fillRect(0, 0, WIDTH, bounds.y);
    ctx.fillRect(0, bounds.y + bounds.h, WIDTH, HEIGHT - bounds.y - bounds.h);
    ctx.fillRect(0, bounds.y, bounds.x, bounds.h);
    ctx.fillRect(bounds.x + bounds.w, bounds.y, WIDTH - bounds.x - bounds.w, bounds.h);
    ctx.restore();
  }

  drawArenaBorder(game) {
    const ctx = this.ctx;
    const bounds = game.arenaStage.bounds;
    const pulse = game.reducedMotion ? 0.66 : 0.56 + Math.sin(game.elapsed * 3.1) * 0.12;
    ctx.save();
    ctx.strokeStyle = `rgba(98, 243, 255, ${pulse})`;
    ctx.shadowColor = COLORS.player;
    ctx.shadowBlur = game.reducedMotion ? 5 : 12;
    ctx.lineWidth = 4;
    ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
    ctx.restore();
  }

  drawObstacle(obstacle) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(24, 33, 65, 0.94)';
    ctx.strokeStyle = '#52618f';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#465482';
    ctx.shadowBlur = 6;
    roundedRect(ctx, obstacle.x, obstacle.y, obstacle.w, obstacle.h, 9);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawPlayer(game) {
    if (game.player.invulnerability > 0 && Math.floor(game.elapsed * 18) % 2 === 0) return;
    const ctx = this.ctx;
    if (game.player.shield > 0) {
      ctx.save();
      ctx.strokeStyle = COLORS.electric;
      ctx.lineWidth = 4;
      ctx.shadowColor = COLORS.electric;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(game.player.x, game.player.y, game.player.radius + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = COLORS.player;
    ctx.shadowColor = COLORS.player;
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(game.player.x, game.player.y, game.player.radius, 0, Math.PI * 2);
    ctx.fill();
    const aim = normalize(game.input.pointer.x - game.player.x, game.input.pointer.y - game.player.y);
    ctx.strokeStyle = '#e4feff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(game.player.x, game.player.y);
    ctx.lineTo(game.player.x + aim.x * 29, game.player.y + aim.y * 29);
    ctx.stroke();
    ctx.restore();
  }

  drawBullet(game) {
    const ctx = this.ctx;
    for (let index = game.bullet.trail.length - 1; index >= 0; index -= 1) {
      const point = game.bullet.trail[index];
      const alpha = (game.bullet.trail.length - index) / Math.max(1, game.bullet.trail.length);
      ctx.fillStyle = `rgba(255, 230, 109, ${alpha * 0.3})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2 + alpha * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    if (game.bullet.recalling) {
      ctx.save();
      ctx.strokeStyle = game.waveEnding ? 'rgba(83, 242, 161, 0.72)' : 'rgba(88, 166, 255, 0.55)';
      ctx.lineWidth = 3;
      ctx.setLineDash([9, 9]);
      ctx.beginPath();
      ctx.moveTo(game.player.x, game.player.y);
      ctx.lineTo(game.bullet.x, game.bullet.y);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = COLORS.bullet;
    ctx.shadowColor = COLORS.bullet;
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(game.bullet.x, game.bullet.y, game.bullet.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawEnemies(game) {
    const ctx = this.ctx;
    for (const enemy of game.enemies) {
      const color = enemy.hitFlash > 0 ? COLORS.text : enemy.color;
      const spawnScale = clamp(1 - enemy.spawnTime * 0.65, 0.2, 1);
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.scale(spawnScale, spawnScale);
      ctx.rotate(enemy.phase * 0.24);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      if (enemy.type === 'scout') polygon(ctx, 4, enemy.radius, Math.PI / 4);
      else if (enemy.type === 'brute') {
        ctx.fillRect(-enemy.radius, -enemy.radius, enemy.radius * 2, enemy.radius * 2);
        ctx.fillStyle = COLORS.background;
        ctx.fillRect(-8, -8, 16, 16);
      } else if (enemy.type === 'sniper') polygon(ctx, 6, enemy.radius, 0);
      else if (enemy.type === 'charger') polygon(ctx, 3, enemy.radius + 3, Math.PI / 2);
      else polygon(ctx, 5, enemy.radius, -Math.PI / 2);
      ctx.restore();

      if (enemy.maxHealth > 1.1) {
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(enemy.x - enemy.radius, enemy.y + enemy.radius + 9, enemy.radius * 2, 5);
        ctx.fillStyle = COLORS.text;
        ctx.fillRect(enemy.x - enemy.radius, enemy.y + enemy.radius + 9, enemy.radius * 2 * Math.max(0, enemy.health / enemy.maxHealth), 5);
      }

      if (enemy.type === 'charger' && enemy.chargeTelegraph > 0) {
        const direction = enemy.telegraphDirection || normalize(game.player.x - enemy.x, game.player.y - enemy.y);
        ctx.save();
        ctx.strokeStyle = COLORS.danger;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y);
        ctx.lineTo(enemy.x + direction.x * 150, enemy.y + direction.y * 150);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius + 11, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (enemy.type === 'sniper' && enemy.shotTelegraph > 0) {
        const direction = enemy.telegraphDirection || normalize(game.player.x - enemy.x, game.player.y - enemy.y);
        ctx.save();
        ctx.strokeStyle = `rgba(255, 82, 106, ${0.42 + enemy.shotTelegraph * 0.65})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 7]);
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y);
        ctx.lineTo(enemy.x + direction.x * 900, enemy.y + direction.y * 900);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  drawEnemyShots(game) {
    const ctx = this.ctx;
    for (const shot of game.enemyShots) {
      ctx.save();
      ctx.fillStyle = '#ffd0dc';
      ctx.shadowColor = '#ffd0dc';
      ctx.shadowBlur = 13;
      ctx.beginPath();
      ctx.arc(shot.x, shot.y, shot.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawParticles(game) {
    const ctx = this.ctx;
    for (const particle of game.particles) {
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      if (particle.type === 'ring') {
        ctx.strokeStyle = particle.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
      }
    }
    ctx.globalAlpha = 1;
  }

  drawFloatingTexts(game) {
    const ctx = this.ctx;
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    for (const item of game.floatingTexts) {
      ctx.globalAlpha = Math.max(0, item.life / item.maxLife);
      ctx.fillStyle = item.color;
      ctx.font = '700 20px Tahoma, Arial, sans-serif';
      ctx.fillText(item.text, item.x, item.y);
    }
    ctx.globalAlpha = 1;
  }

  drawBanner(game) {
    const ctx = this.ctx;
    const alpha = clamp(game.banner.time * 1.6, 0, 1);
    ctx.globalAlpha = alpha;
    text(ctx, game.banner.title, WIDTH / 2, HEIGHT / 2 - 20, 42, COLORS.text, 900);
    text(ctx, game.banner.subtitle, WIDTH / 2, HEIGHT / 2 + 24, 18, COLORS.bullet, 700);
    ctx.globalAlpha = 1;
  }
}

function roundedRect(ctx, x, y, width, height, radius = 14) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, width, height, radius);
  else ctx.rect(x, y, width, height);
}

function polygon(ctx, sides, radius, rotation = 0) {
  ctx.beginPath();
  for (let index = 0; index < sides; index += 1) {
    const angle = rotation + index / sides * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function text(ctx, value, x, y, size, color, weight = 700) {
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px Tahoma, Arial, sans-serif`;
  ctx.fillText(String(value), x, y);
  ctx.restore();
}
