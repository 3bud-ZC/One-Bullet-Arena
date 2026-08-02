import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from './content.js';

const PALETTE = {
  ink: '#050711',
  panel: '#0c1328',
  grid: 'rgba(94, 132, 255, 0.105)',
  cyan: '#62f3ff',
  cyanDeep: '#168ca5',
  yellow: '#ffe66d',
  red: '#ff526a',
  orange: '#ff9f43',
  purple: '#b983ff',
  green: '#53f2a1',
  pink: '#ff79d1',
  white: '#f8f9ff',
};

const ENEMY_STYLE = {
  scout: { color: PALETTE.red, sides: 3, spin: 2.6 },
  brute: { color: PALETTE.orange, sides: 8, spin: 0.45 },
  sniper: { color: PALETTE.purple, sides: 4, spin: 0.85 },
  charger: { color: PALETTE.green, sides: 3, spin: 1.8 },
  splitter: { color: PALETTE.pink, sides: 6, spin: -1.2 },
};

export function arenaThemeForWave(wave, boss = false) {
  if (boss) return 'core-sanctum';
  if (wave <= 2) return 'neon-circuit';
  if (wave <= 4) return 'reactor-forge';
  return 'void-rift';
}

export function enemySilhouette(type) {
  return ENEMY_STYLE[type]?.sides || 4;
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
}

function roundedRect(ctx, x, y, width, height, radius = 10) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawCircuitFloor(game, theme) {
  const ctx = game.ctx;
  const colors = {
    'neon-circuit': ['#050915', '#0a1830', 'rgba(98,243,255,.12)'],
    'reactor-forge': ['#0d0808', '#25120f', 'rgba(255,159,67,.12)'],
    'void-rift': ['#080511', '#160b2a', 'rgba(185,131,255,.13)'],
    'core-sanctum': ['#10040b', '#260817', 'rgba(255,82,106,.15)'],
  }[theme];

  const gradient = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 50, WIDTH / 2, HEIGHT / 2, 760);
  gradient.addColorStop(0, colors[1]);
  gradient.addColorStop(1, colors[0]);
  ctx.fillStyle = gradient;
  ctx.fillRect(-40, -40, WIDTH + 80, HEIGHT + 80);

  const spacing = theme === 'reactor-forge' ? 64 : 48;
  const offset = game.elapsed * (theme === 'void-rift' ? 4 : 8) % spacing;
  ctx.strokeStyle = colors[2];
  ctx.lineWidth = 1;
  for (let x = -spacing + offset; x < WIDTH + spacing; x += spacing) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke();
  }
  for (let y = -spacing + offset; y < HEIGHT + spacing; y += spacing) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke();
  }

  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = theme === 'reactor-forge' ? PALETTE.orange : theme === 'void-rift' ? PALETTE.purple : theme === 'core-sanctum' ? PALETTE.red : PALETTE.cyan;
  ctx.lineWidth = 2;
  for (let index = 0; index < 9; index += 1) {
    const y = 90 + index * 74;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(150 + (index % 3) * 70, y);
    ctx.lineTo(205 + (index % 2) * 60, y + 28);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(WIDTH, HEIGHT - y);
    ctx.lineTo(WIDTH - 180 - (index % 3) * 60, HEIGHT - y);
    ctx.lineTo(WIDTH - 230 - (index % 2) * 50, HEIGHT - y - 30);
    ctx.stroke();
  }
  ctx.restore();
}

function drawObstacle(game, obstacle, theme) {
  const ctx = game.ctx;
  const breakable = obstacle.kind === 'breakable';
  const accent = breakable ? PALETTE.yellow : theme === 'reactor-forge' ? PALETTE.orange : theme === 'void-rift' ? PALETTE.purple : PALETTE.cyan;
  ctx.save();
  ctx.shadowColor = accent;
  ctx.shadowBlur = breakable ? 18 : 10;
  const gradient = ctx.createLinearGradient(obstacle.x, obstacle.y, obstacle.x + obstacle.w, obstacle.y + obstacle.h);
  gradient.addColorStop(0, breakable ? 'rgba(86,67,30,.96)' : 'rgba(19,29,60,.98)');
  gradient.addColorStop(1, breakable ? 'rgba(45,32,15,.98)' : 'rgba(7,12,28,.98)');
  ctx.fillStyle = gradient;
  ctx.strokeStyle = accent;
  ctx.lineWidth = breakable ? 3 : 2;
  roundedRect(ctx, obstacle.x, obstacle.y, obstacle.w, obstacle.h, 10);
  ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = accent;
  for (let offset = 14; offset < obstacle.w + obstacle.h; offset += 24) {
    ctx.beginPath();
    ctx.moveTo(obstacle.x + Math.min(offset, obstacle.w), obstacle.y + Math.max(0, offset - obstacle.w));
    ctx.lineTo(obstacle.x + Math.max(0, offset - obstacle.h), obstacle.y + Math.min(offset, obstacle.h));
    ctx.stroke();
  }
  ctx.restore();
}

function drawHazard(game, hazard, theme) {
  const ctx = game.ctx;
  const color = theme === 'reactor-forge' ? PALETTE.orange : PALETTE.red;
  const pulse = 0.35 + Math.sin(hazard.pulse || game.elapsed * 5) * 0.12;
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = pulse;
  ctx.shadowColor = color;
  ctx.shadowBlur = 24;
  roundedRect(ctx, hazard.x, hazard.y, hazard.w, hazard.h, 7);
  ctx.fill();
  ctx.globalAlpha = 0.75;
  ctx.strokeStyle = PALETTE.white;
  ctx.lineWidth = 2;
  for (let offset = -hazard.h; offset < hazard.w; offset += 28) {
    ctx.beginPath();
    ctx.moveTo(hazard.x + offset, hazard.y + hazard.h);
    ctx.lineTo(hazard.x + offset + hazard.h, hazard.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawNode(game, node) {
  const ctx = game.ctx;
  const pulse = 1 + Math.sin(game.elapsed * 5 + node.x) * 0.09;
  ctx.save();
  ctx.translate(node.x, node.y);
  ctx.scale(pulse, pulse);
  ctx.rotate(game.elapsed * 0.8);
  ctx.shadowColor = PALETTE.red;
  ctx.shadowBlur = 26;
  ctx.fillStyle = 'rgba(255,82,106,.26)';
  ctx.strokeStyle = PALETTE.red;
  ctx.lineWidth = 3;
  polygon(ctx, 8, node.radius + 9, Math.PI / 8); ctx.fill(); ctx.stroke();
  ctx.rotate(-game.elapsed * 1.7);
  ctx.fillStyle = PALETTE.yellow;
  polygon(ctx, 4, node.radius * 0.58, Math.PI / 4); ctx.fill();
  ctx.restore();
}

function drawPlayer(game) {
  const ctx = game.ctx;
  const player = game.player;
  const aim = Math.atan2(game.pointer.y - player.y, game.pointer.x - player.x);
  const moving = game.getMovementDirection?.() || { x: 0, y: 0 };
  const movementStrength = Math.min(1, Math.hypot(moving.x, moving.y));
  const pulse = 1 + Math.sin(game.elapsed * 6) * 0.035;

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(aim);
  ctx.scale(pulse, pulse);

  if (movementStrength > 0 || player.dashRemaining > 0) {
    ctx.globalAlpha = player.dashRemaining > 0 ? 0.75 : 0.28;
    ctx.fillStyle = PALETTE.cyan;
    for (let index = 0; index < 3; index += 1) {
      ctx.beginPath();
      ctx.moveTo(-22 - index * 9, -7 + index * 7);
      ctx.lineTo(-48 - index * 12, 0);
      ctx.lineTo(-22 - index * 9, 7 - index * 7);
      ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  ctx.shadowColor = PALETTE.cyan;
  ctx.shadowBlur = player.dashRemaining > 0 ? 32 : 20;
  ctx.fillStyle = '#0b3850';
  ctx.strokeStyle = PALETTE.cyan;
  ctx.lineWidth = 3;
  polygon(ctx, 6, player.radius + 7, Math.PI / 6); ctx.fill(); ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#10233d';
  polygon(ctx, 6, player.radius + 1, Math.PI / 6); ctx.fill();

  ctx.fillStyle = PALETTE.white;
  ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PALETTE.cyan;
  ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = PALETTE.cyan;
  roundedRect(ctx, 9, -5, 24, 10, 5); ctx.fill();
  ctx.fillStyle = PALETTE.yellow;
  ctx.beginPath(); ctx.arc(34, 0, 5, 0, Math.PI * 2); ctx.fill();

  if (player.shield > 0) {
    ctx.strokeStyle = PALETTE.yellow;
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, player.radius + 14, -1.15, 1.15); ctx.stroke();
  }
  ctx.restore();
}

function drawEnemy(game, enemy) {
  const ctx = game.ctx;
  const style = ENEMY_STYLE[enemy.type] || ENEMY_STYLE.scout;
  const rotation = game.elapsed * style.spin + enemy.phase;
  const hitScale = enemy.hitFlash > 0 ? 1.15 : 1;

  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(rotation);
  ctx.scale(hitScale, hitScale);
  ctx.shadowColor = style.color;
  ctx.shadowBlur = enemy.elite ? 30 : 17;
  ctx.fillStyle = enemy.hitFlash > 0 ? PALETTE.white : `${style.color}33`;
  ctx.strokeStyle = style.color;
  ctx.lineWidth = enemy.elite ? 4 : 3;
  polygon(ctx, style.sides, enemy.radius + (enemy.elite ? 6 : 2), Math.PI / style.sides);
  ctx.fill(); ctx.stroke();

  ctx.rotate(-rotation * 1.8);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#081020';
  polygon(ctx, Math.max(3, style.sides), enemy.radius * 0.62, Math.PI / 4); ctx.fill();

  ctx.fillStyle = style.color;
  if (enemy.type === 'sniper') {
    roundedRect(ctx, -enemy.radius * 0.7, -4, enemy.radius * 1.4, 8, 4); ctx.fill();
    ctx.fillStyle = PALETTE.white;
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
  } else if (enemy.type === 'charger') {
    ctx.beginPath(); ctx.moveTo(enemy.radius * 0.82, 0); ctx.lineTo(-5, -8); ctx.lineTo(-5, 8); ctx.closePath(); ctx.fill();
  } else if (enemy.type === 'splitter') {
    ctx.strokeStyle = style.color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-8, -12); ctx.lineTo(2, -3); ctx.lineTo(-4, 5); ctx.lineTo(9, 13); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(0, 0, Math.max(5, enemy.radius * 0.25), 0, Math.PI * 2); ctx.fill();
  }

  if (enemy.elite) {
    ctx.rotate(game.elapsed * -2);
    ctx.strokeStyle = PALETTE.yellow;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 6]);
    ctx.beginPath(); ctx.arc(0, 0, enemy.radius + 13, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();

  if (enemy.maxHp > 1) {
    const width = Math.max(26, enemy.radius * 2);
    ctx.fillStyle = 'rgba(4,7,15,.75)';
    roundedRect(ctx, enemy.x - width / 2, enemy.y + enemy.radius + 10, width, 5, 3); ctx.fill();
    ctx.fillStyle = style.color;
    roundedRect(ctx, enemy.x - width / 2, enemy.y + enemy.radius + 10, width * Math.max(0, enemy.hp / enemy.maxHp), 5, 3); ctx.fill();
  }
}

function drawBoss(game) {
  const boss = game.boss;
  if (!boss || boss.dead) return;
  const ctx = game.ctx;
  const phaseColor = boss.phase === 1 ? PALETTE.cyan : boss.phase === 2 ? PALETTE.orange : PALETTE.red;
  const overload = boss.phase === 3 ? 1 + Math.sin(game.elapsed * 14) * 0.06 : 1;
  ctx.save();
  ctx.translate(boss.x, boss.y);
  ctx.scale(overload, overload);

  for (let ring = 0; ring < 3; ring += 1) {
    ctx.save();
    ctx.rotate(game.elapsed * (ring % 2 === 0 ? 0.45 : -0.65) + ring);
    ctx.strokeStyle = ring === 1 ? PALETTE.yellow : phaseColor;
    ctx.globalAlpha = 0.65 - ring * 0.12;
    ctx.lineWidth = 3;
    ctx.setLineDash([18 - ring * 3, 10 + ring * 2]);
    ctx.beginPath(); ctx.arc(0, 0, boss.radius + 18 + ring * 16, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  ctx.shadowColor = phaseColor;
  ctx.shadowBlur = 38;
  ctx.fillStyle = `${phaseColor}30`;
  ctx.strokeStyle = phaseColor;
  ctx.lineWidth = 5;
  polygon(ctx, 8, boss.radius, Math.PI / 8 + boss.angle * 0.25); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#160b20';
  polygon(ctx, 6, boss.radius * 0.7, boss.angle * -0.35); ctx.fill();
  ctx.fillStyle = PALETTE.white;
  ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = phaseColor;
  ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();

  if (boss.phase === 1) {
    ctx.strokeStyle = PALETTE.cyan;
    ctx.lineWidth = 5;
    ctx.globalAlpha = 0.75;
    ctx.beginPath(); ctx.arc(0, 0, boss.radius + 9, 0, Math.PI * 2); ctx.stroke();
  }
  if (boss.phase >= 2) {
    ctx.strokeStyle = PALETTE.yellow;
    ctx.lineWidth = 3;
    for (let index = 0; index < 6; index += 1) {
      const angle = index / 6 * Math.PI * 2 + boss.angle;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 21, Math.sin(angle) * 21);
      ctx.lineTo(Math.cos(angle + 0.2) * (boss.radius - 8), Math.sin(angle + 0.2) * (boss.radius - 8));
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawBullet(game) {
  const bullet = game.bullet;
  if (bullet.held) return;
  const ctx = game.ctx;
  ctx.save();
  for (let index = bullet.trail.length - 1; index >= 0; index -= 1) {
    const point = bullet.trail[index];
    const alpha = (1 - index / Math.max(1, bullet.trail.length)) * 0.36;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = bullet.recalling ? PALETTE.cyan : PALETTE.yellow;
    ctx.beginPath(); ctx.arc(point.x, point.y, Math.max(1, bullet.radius * alpha), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.translate(bullet.x, bullet.y);
  ctx.rotate(game.elapsed * 5);
  ctx.shadowColor = bullet.recalling ? PALETTE.cyan : PALETTE.yellow;
  ctx.shadowBlur = 28;
  ctx.fillStyle = bullet.recalling ? PALETTE.cyan : PALETTE.yellow;
  polygon(ctx, 4, bullet.radius + 4, Math.PI / 4); ctx.fill();
  ctx.fillStyle = PALETTE.white;
  polygon(ctx, 4, bullet.radius * 0.48, Math.PI / 4); ctx.fill();
  ctx.restore();
}

export function installVisualIdentity(GameClass) {
  const prototype = GameClass.prototype;
  if (prototype.__visualIdentityInstalled) return;
  prototype.__visualIdentityInstalled = true;

  prototype.drawArena = function drawVisualArena() {
    const theme = arenaThemeForWave(this.wave, Boolean(this.boss));
    drawCircuitFloor(this, theme);
    for (const hazard of this.arena.hazards) drawHazard(this, hazard, theme);
    for (const obstacle of this.arena.obstacles) drawObstacle(this, obstacle, theme);
    for (const node of this.arena.nodes) if (node.active) drawNode(this, node);
    this.ctx.strokeStyle = theme === 'core-sanctum' ? PALETTE.red : theme === 'reactor-forge' ? PALETTE.orange : theme === 'void-rift' ? PALETTE.purple : PALETTE.cyan;
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(2, 2, WIDTH - 4, HEIGHT - 4);
  };

  prototype.drawPlayer = function drawVisualPlayer() { drawPlayer(this); };
  prototype.drawEnemies = function drawVisualEnemies() { for (const enemy of this.enemies) drawEnemy(this, enemy); };
  prototype.drawBoss = function drawVisualBoss() { drawBoss(this); };
  prototype.drawBullet = function drawVisualBullet() { drawBullet(this); };
}
