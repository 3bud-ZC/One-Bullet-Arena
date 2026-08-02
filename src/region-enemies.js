import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from './content.js';
import { coreById } from './progression-data.js';
import { difficultyById, normalizeMission, regionById } from './regions-data.js';
import {
  ENEMY_CODEX_STORAGE_KEY,
  REGION_ENEMIES,
  codexCompletion,
  createDefaultEnemyCodex,
  discoverCodexEnemy,
  normalizeEnemyCodex,
  recordCodexKill,
  regionEnemyById,
  regionEnemiesForRegion,
  regionEnemyComposition,
} from './region-enemies-data.js';

const FONT = 'Changa, "Segoe UI", Tahoma, sans-serif';
const NUMBER_FONT = 'Inter, "Segoe UI", Arial, sans-serif';
const COLORS = Object.freeze({
  panel: 'rgba(7, 12, 27, 0.96)',
  panelSoft: 'rgba(16, 23, 48, 0.94)',
  border: '#35416e',
  cyan: '#62f3ff',
  yellow: '#ffe66d',
  orange: '#ff9f43',
  purple: '#b983ff',
  green: '#53f2a1',
  red: '#ff526a',
  text: '#f8f9ff',
  muted: '#aeb7da',
});

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function normalize(x, y) {
  const length = Math.hypot(x, y);
  return length > 0 ? { x: x / length, y: y / length } : { x: 0, y: 0 };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function roundedRect(ctx, x, y, width, height, radius = 16) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function panel(ctx, x, y, width, height, accent = COLORS.border, fill = COLORS.panel, glow = 5) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.shadowColor = accent;
  ctx.shadowBlur = glow;
  roundedRect(ctx, x, y, width, height, 16);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();
  ctx.restore();
}

function label(ctx, text, x, y, size, color = COLORS.text, weight = 700, align = 'center') {
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillText(String(text), x, y);
  ctx.restore();
}

function number(ctx, text, x, y, size, color = COLORS.text, align = 'center') {
  ctx.save();
  ctx.direction = 'ltr';
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.font = `800 ${size}px ${NUMBER_FONT}`;
  ctx.fillText(String(text), x, y);
  ctx.restore();
}

function wrapRtl(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2, color = COLORS.muted, size = 12, weight = 500) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) line = candidate;
    else {
      if (line) lines.push(line);
      line = word;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  lines.forEach((item, index) => ctx.fillText(item, x, y + index * lineHeight));
  ctx.restore();
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

function loadCodex() {
  if (typeof localStorage === 'undefined') return createDefaultEnemyCodex();
  try {
    return normalizeEnemyCodex(JSON.parse(localStorage.getItem(ENEMY_CODEX_STORAGE_KEY) || 'null'));
  } catch {
    return createDefaultEnemyCodex();
  }
}

function persistCodex(game) {
  game.enemyCodex = normalizeEnemyCodex(game.enemyCodex);
  game.enemyCodex.updatedAt = new Date().toISOString();
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(ENEMY_CODEX_STORAGE_KEY, JSON.stringify(game.enemyCodex));
  }
  return game.enemyCodex;
}

function discoverEnemy(game, enemyId) {
  const result = discoverCodexEnemy(game.enemyCodex, enemyId);
  game.enemyCodex = result.codex;
  persistCodex(game);
  if (result.discovered) {
    const enemy = regionEnemyById(enemyId);
    game.regionEnemyAlert = {
      name: `تم رصد: ${enemy.name}`,
      subtitle: enemy.counter,
      color: enemy.color,
      time: 2.8,
    };
  }
}

function recordEnemyKill(game, enemyId) {
  game.enemyCodex = recordCodexKill(game.enemyCodex, enemyId);
  persistCodex(game);
}

function createHeatZone(game, x, y, radius = 62, life = 3.5) {
  game.regionEnemyHazards.push({ type: 'heat', x, y, radius, life, maxLife: life, pulse: Math.random() * Math.PI * 2 });
  game.createRing?.(x, y, COLORS.orange, radius);
}

function updateHeatZones(game, dt) {
  game.player.regionHeatCooldown = Math.max(0, (game.player.regionHeatCooldown || 0) - dt);
  for (const hazard of game.regionEnemyHazards) {
    hazard.life -= dt;
    hazard.pulse += dt * 4;
    if (hazard.life <= 0) continue;
    if (distance(game.player, hazard) <= hazard.radius + game.player.radius && game.player.regionHeatCooldown <= 0) {
      game.player.regionHeatCooldown = 0.8;
      game.damagePlayer(hazard.x, hazard.y);
    }
  }
  game.regionEnemyHazards = game.regionEnemyHazards.filter((hazard) => hazard.life > 0);
}

function updateRegionEnemyBehavior(game, enemy, dt) {
  const definition = regionEnemyById(enemy.type);
  if (!definition) return;
  const toPlayer = normalize(game.player.x - enemy.x, game.player.y - enemy.y);
  enemy.facingAngle = Math.atan2(toPlayer.y, toPlayer.x);
  enemy.specialCooldown = Math.max(0, (enemy.specialCooldown || 0) - dt);
  enemy.mirrorCooldown = Math.max(0, (enemy.mirrorCooldown || 0) - dt);
  enemy.riftExitTime = Math.max(0, (enemy.riftExitTime || 0) - dt);

  if (enemy.type === 'furnace-brute') {
    if (enemy.specialCooldown <= 0 && distance(enemy, game.player) < 470) {
      createHeatZone(game, enemy.x, enemy.y, enemy.elite ? 78 : 62, enemy.elite ? 4.2 : 3.4);
      enemy.specialCooldown = enemy.elite ? 2.35 : 3.05;
    }
    return;
  }

  if (enemy.type === 'magnet-unit') {
    if (!game.bullet.held) {
      const dx = enemy.x - game.bullet.x;
      const dy = enemy.y - game.bullet.y;
      const range = enemy.elite ? 310 : 255;
      const length = Math.hypot(dx, dy) || 1;
      enemy.magnetActive = length < range;
      if (enemy.magnetActive) {
        const force = (1 - length / range) * (enemy.elite ? 820 : 620);
        game.bullet.vx += dx / length * force * dt;
        game.bullet.vy += dy / length * force * dt;
      }
    } else enemy.magnetActive = false;
    return;
  }

  if (enemy.type === 'repair-bot') {
    const targets = game.enemies
      .filter((candidate) => candidate.id !== enemy.id && candidate.hp < candidate.maxHp - 0.05)
      .sort((a, b) => distance(enemy, a) - distance(enemy, b));
    const target = targets[0];
    enemy.repairTargetId = target?.id || null;
    if (!target) return;
    const gap = distance(enemy, target);
    if (gap > 115) {
      const direction = normalize(target.x - enemy.x, target.y - enemy.y);
      enemy.x += direction.x * 54 * dt;
      enemy.y += direction.y * 54 * dt;
    }
    if (gap <= 235 && enemy.specialCooldown <= 0) {
      const amount = enemy.elite ? 1.05 : 0.68;
      target.hp = Math.min(target.maxHp, target.hp + amount);
      target.hitFlash = Math.max(target.hitFlash, 0.08);
      game.createRing?.(target.x, target.y, COLORS.green, target.radius + 28);
      game.addFloatingText?.(target.x, target.y - target.radius - 18, `+${amount.toFixed(1)}`, COLORS.green);
      enemy.specialCooldown = enemy.elite ? 1.65 : 2.35;
    }
    return;
  }

  if (enemy.type === 'phase-walker') {
    enemy.phaseCooldown = Math.max(0, (enemy.phaseCooldown || 0) - dt);
    if (enemy.phaseShiftTimer > 0) {
      enemy.phaseShiftTimer -= dt;
      enemy.phased = true;
      if (enemy.phaseShiftTimer <= 0) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 175 + Math.random() * 95;
        enemy.x = clamp(game.player.x + Math.cos(angle) * radius, 45, WIDTH - 45);
        enemy.y = clamp(game.player.y + Math.sin(angle) * radius, 45, HEIGHT - 45);
        game.resolveEntityObstacles(enemy);
        enemy.phased = false;
        enemy.phaseCooldown = enemy.elite ? 1.9 : 2.75;
        game.createRing?.(enemy.x, enemy.y, definition.color, 72);
      }
    } else if (enemy.phaseCooldown <= 0 && distance(enemy, game.player) < 520) {
      enemy.phaseShiftTimer = 0.5;
      enemy.phased = true;
      game.createRing?.(enemy.x, enemy.y, definition.color, 64);
    }
    return;
  }

  if (enemy.type === 'gravity-orb') {
    const range = enemy.elite ? 245 : 195;
    const pullEntity = (entity, strength, velocity = false) => {
      const dx = enemy.x - entity.x;
      const dy = enemy.y - entity.y;
      const length = Math.hypot(dx, dy) || 1;
      if (length >= range) return;
      const force = (1 - length / range) * strength;
      if (velocity) {
        entity.vx += dx / length * force * dt;
        entity.vy += dy / length * force * dt;
      } else {
        entity.x += dx / length * force * dt;
        entity.y += dy / length * force * dt;
      }
    };
    pullEntity(game.player, enemy.elite ? 145 : 105);
    if (!game.bullet.held) pullEntity(game.bullet, enemy.elite ? 900 : 690, true);
  }
}

function drawHeatZones(game) {
  const ctx = game.ctx;
  for (const hazard of game.regionEnemyHazards) {
    const ratio = Math.max(0, hazard.life / hazard.maxLife);
    const pulse = 0.75 + Math.sin(hazard.pulse) * 0.08;
    ctx.save();
    ctx.globalAlpha = Math.min(0.65, ratio * 0.75);
    const gradient = ctx.createRadialGradient(hazard.x, hazard.y, 8, hazard.x, hazard.y, hazard.radius);
    gradient.addColorStop(0, 'rgba(255, 230, 109, 0.75)');
    gradient.addColorStop(0.45, 'rgba(255, 122, 61, 0.48)');
    gradient.addColorStop(1, 'rgba(255, 53, 95, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(hazard.x, hazard.y, hazard.radius * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLORS.orange;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.stroke();
    ctx.restore();
  }
}

function drawRegionEnemy(game, enemy) {
  const definition = regionEnemyById(enemy.type);
  if (!definition) return;
  const ctx = game.ctx;
  const color = enemy.hitFlash > 0 ? COLORS.text : definition.color;
  const scale = Math.max(0.25, 1 - (enemy.spawnTime || 0) * 0.55);
  const alpha = enemy.phased ? 0.22 + Math.sin(game.elapsed * 20) * 0.08 : 1;

  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;
  ctx.shadowColor = color;
  ctx.shadowBlur = enemy.elite ? 28 : 18;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;

  if (enemy.type === 'shield-drone') {
    ctx.rotate(enemy.facingAngle || 0);
    polygon(ctx, 6, enemy.radius, Math.PI / 6);
    ctx.fill();
    ctx.fillStyle = '#09101f';
    polygon(ctx, 6, enemy.radius * 0.45, Math.PI / 6);
    ctx.fill();
    ctx.strokeStyle = COLORS.cyan;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius + 11, -0.72, 0.72);
    ctx.stroke();
  } else if (enemy.type === 'furnace-brute') {
    ctx.rotate(enemy.phase * 0.18);
    polygon(ctx, 8, enemy.radius, Math.PI / 8);
    ctx.fill();
    ctx.fillStyle = '#35130d';
    polygon(ctx, 6, enemy.radius * 0.55, 0);
    ctx.fill();
    ctx.fillStyle = COLORS.yellow;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * 0.27 + Math.sin(game.elapsed * 7) * 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.type === 'magnet-unit') {
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius, Math.PI * 0.18, Math.PI * 0.82);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius, Math.PI * 1.18, Math.PI * 1.82);
    ctx.stroke();
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(-7, -enemy.radius - 3, 14, 13);
    ctx.fillRect(-7, enemy.radius - 10, 14, 13);
    if (enemy.magnetActive) {
      ctx.globalAlpha *= 0.28;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.elite ? 310 : 255, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (enemy.type === 'repair-bot') {
    ctx.rotate(-enemy.phase * 0.2);
    polygon(ctx, 6, enemy.radius, Math.PI / 6);
    ctx.fill();
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(-5, -13, 10, 26);
    ctx.fillRect(-13, -5, 26, 10);
  } else if (enemy.type === 'phase-walker') {
    ctx.rotate(enemy.phase * 0.35);
    polygon(ctx, 4, enemy.radius, Math.PI / 4);
    ctx.fill();
    ctx.globalAlpha *= 0.6;
    ctx.translate(-enemy.radius * 0.6, 0);
    polygon(ctx, 4, enemy.radius * 0.72, Math.PI / 4);
    ctx.stroke();
  } else if (enemy.type === 'rift-sniper') {
    polygon(ctx, 6, enemy.radius, 0);
    ctx.fill();
    ctx.fillStyle = COLORS.panel;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.text;
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    if (enemy.riftExitTime > 0 && enemy.riftExit) {
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = Math.min(1, enemy.riftExitTime * 2);
      ctx.strokeStyle = definition.color;
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 7]);
      ctx.beginPath();
      ctx.arc(enemy.riftExit.x, enemy.riftExit.y, 28 + Math.sin(game.elapsed * 12) * 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }
  } else if (enemy.type === 'gravity-orb') {
    ctx.fillStyle = 'rgba(10, 7, 30, 0.96)';
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    for (let ring = 0; ring < 3; ring += 1) {
      ctx.globalAlpha = 0.85 - ring * 0.18;
      ctx.lineWidth = 3 - ring * 0.5;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius * 0.55 + ring * 8 + Math.sin(game.elapsed * 4 + ring) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.16;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.elite ? 245 : 195, 0, Math.PI * 2);
    ctx.stroke();
  } else if (enemy.type === 'mirror-drone') {
    ctx.rotate(enemy.phase * 0.22);
    polygon(ctx, 4, enemy.radius + 2, Math.PI / 4);
    ctx.fill();
    ctx.fillStyle = COLORS.panel;
    polygon(ctx, 4, enemy.radius * 0.58, Math.PI / 4);
    ctx.fill();
    ctx.strokeStyle = COLORS.text;
    ctx.globalAlpha *= 0.65;
    ctx.beginPath();
    ctx.moveTo(-enemy.radius * 0.55, enemy.radius * 0.2);
    ctx.lineTo(enemy.radius * 0.55, -enemy.radius * 0.2);
    ctx.stroke();
  }

  if (enemy.elite) {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = COLORS.yellow;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius + 10, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  if (enemy.maxHp > 1.05) {
    const width = enemy.radius * 2.2;
    ctx.fillStyle = 'rgba(255,255,255,.16)';
    ctx.fillRect(enemy.x - width / 2, enemy.y + enemy.radius + 11, width, 5);
    ctx.fillStyle = color;
    ctx.fillRect(enemy.x - width / 2, enemy.y + enemy.radius + 11, width * Math.max(0, enemy.hp / enemy.maxHp), 5);
  }

  if (enemy.type === 'repair-bot' && enemy.repairTargetId) {
    const target = game.enemies.find((item) => item.id === enemy.repairTargetId);
    if (target) {
      ctx.save();
      ctx.globalAlpha = 0.38;
      ctx.strokeStyle = COLORS.green;
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function drawEnemyAlert(game) {
  const alert = game.regionEnemyAlert;
  if (!alert || alert.time <= 0 || game.state !== 'playing') return;
  const alpha = Math.min(1, alert.time * 1.8);
  const ctx = game.ctx;
  ctx.save();
  ctx.globalAlpha = alpha;
  panel(ctx, WIDTH / 2 - 230, 88, 460, 64, alert.color, 'rgba(5, 9, 21, 0.94)', 10);
  label(ctx, alert.name, WIDTH / 2, 115, 16, alert.color, 900);
  wrapRtl(ctx, alert.subtitle, WIDTH / 2 + 205, 138, 410, 17, 1, COLORS.muted, 10, 600);
  ctx.restore();
}

function drawCodexCard(game, enemy, x, y, width, height) {
  const ctx = game.ctx;
  const entry = game.enemyCodex.entries[enemy.id];
  const unlocked = Boolean(entry);
  panel(ctx, x, y, width, height, unlocked ? enemy.color : COLORS.border, unlocked ? COLORS.panelSoft : 'rgba(10, 14, 29, 0.82)', unlocked ? 8 : 2);
  label(ctx, unlocked ? enemy.icon : '؟', x + width - 30, y + 38, 26, unlocked ? enemy.color : COLORS.muted, 900);
  label(ctx, unlocked ? enemy.name : 'بيانات غير مكتملة', x + width - 70, y + 36, 18, unlocked ? COLORS.text : COLORS.muted, 900, 'right');
  if (!unlocked) {
    label(ctx, 'واجه هذا العدو داخل منطقته لفتح ملفه.', x + width / 2, y + 98, 13, COLORS.muted, 600);
    label(ctx, enemy.regionId === 'forge' ? 'مسبك المفاعل' : 'دائرة الفراغ', x + width / 2, y + 132, 15, enemy.color, 800);
    return;
  }
  wrapRtl(ctx, enemy.description, x + width - 24, y + 68, width - 48, 19, 2, COLORS.muted, 11);
  label(ctx, 'أسلوب المواجهة', x + width - 24, y + 115, 11, enemy.color, 800, 'right');
  wrapRtl(ctx, enemy.counter, x + width - 24, y + 135, width - 48, 18, 2, COLORS.text, 11, 600);
  const cores = enemy.recommendedCores.map((id) => coreById(id)?.shortName || id).join(' • ');
  label(ctx, `النوى المناسبة: ${cores}`, x + width - 24, y + height - 34, 11, enemy.color, 700, 'right');
  number(ctx, `${entry.encounters} مواجهة  •  ${entry.kills} قتل`, x + 22, y + height - 33, 11, COLORS.muted, 'left');
}

function drawEnemyCodex(game) {
  const ctx = game.ctx;
  const completion = codexCompletion(game.enemyCodex);
  const regionId = game.codexRegion === 'void' ? 'void' : 'forge';
  const region = regionById(regionId);
  const enemies = regionEnemiesForRegion(regionId);
  ctx.fillStyle = 'rgba(2, 4, 12, 0.91)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  label(ctx, 'سجل الأعداء', WIDTH / 2, 58, 40, COLORS.text, 900);
  label(ctx, 'يُفتح ملف كل وحدة بعد مواجهتها للمرة الأولى.', WIDTH / 2, 86, 13, COLORS.muted, 600);
  panel(ctx, WIDTH / 2 - 105, 101, 210, 38, region.color, 'rgba(13, 18, 37, 0.94)', 5);
  number(ctx, `${completion.discovered} / ${completion.total}`, WIDTH / 2, 127, 15, region.color);

  game.drawButton('مسبك المفاعل', 390, 148, 230, 42, () => { game.audio.play('click'); game.codexRegion = 'forge'; }, regionId === 'forge');
  game.drawButton('دائرة الفراغ', 660, 148, 230, 42, () => { game.audio.play('click'); game.codexRegion = 'void'; }, regionId === 'void');

  const positions = [[54, 211], [650, 211], [54, 430], [650, 430]];
  enemies.forEach((enemy, index) => {
    const [x, y] = positions[index];
    drawCodexCard(game, enemy, x, y, 576, 198);
  });

  game.drawButton('العودة', WIDTH / 2 - 125, 652, 250, 45, () => { game.audio.play('click'); game.state = 'menu'; }, true);
}

export function installRegionEnemies(GameClass) {
  const prototype = GameClass.prototype;
  if (prototype.__regionEnemiesInstalled) return;
  prototype.__regionEnemiesInstalled = true;

  const originalResetRun = prototype.resetRun;
  prototype.resetRun = function resetRunWithRegionEnemies(...args) {
    const result = originalResetRun.apply(this, args);
    this.enemyCodex = normalizeEnemyCodex(this.enemyCodex || loadCodex());
    this.regionEnemyHazards = [];
    this.regionEnemyAlert = null;
    this.codexRegion = this.codexRegion === 'void' ? 'void' : 'forge';
    return result;
  };

  const originalSpawnEnemy = prototype.spawnEnemy;
  prototype.spawnEnemy = function spawnRegionEnemy(type, options = {}) {
    const definition = regionEnemyById(type);
    if (!definition) return originalSpawnEnemy.call(this, type, options);
    const before = this.enemies.length;
    const result = originalSpawnEnemy.call(this, definition.baseType, options);
    const enemy = this.enemies[before];
    if (!enemy) return result;
    const difficulty = difficultyById(this.activeMission?.difficultyId);
    const eliteMultiplier = options.elite ? 1.45 : 1;
    const miniMultiplier = options.mini ? 0.68 : 1;
    Object.assign(enemy, {
      type: definition.id,
      regionType: definition.id,
      baseType: definition.baseType,
      radius: definition.radius * miniMultiplier,
      speed: definition.speed * difficulty.enemySpeed * (options.mini ? 1.18 : 1) * (options.elite ? 1.08 : 1),
      hp: definition.hp * difficulty.enemyHealth * eliteMultiplier * (options.mini ? 0.7 : 1),
      maxHp: definition.hp * difficulty.enemyHealth * eliteMultiplier * (options.mini ? 0.7 : 1),
      score: Math.round(definition.score * difficulty.enemyScore * eliteMultiplier * (options.mini ? 0.55 : 1)),
      specialCooldown: 0.8 + Math.random() * 1.2,
      phaseCooldown: 1.4 + Math.random(),
      phaseShiftTimer: 0,
      phased: false,
      mirrorCooldown: 0,
      facingAngle: 0,
    });
    discoverEnemy(this, definition.id);
    return result;
  };

  const originalSpawnNextWave = prototype.spawnNextWave;
  prototype.spawnNextWave = function spawnRegionSpecificWave(...args) {
    const result = originalSpawnNextWave.apply(this, args);
    const mission = normalizeMission(this.activeMission || this.selectedMission);
    const regionId = this.arena?.regionId || mission.regionId;
    const composition = regionEnemyComposition(regionId, this.wave, mission.modeId);
    if (!composition) return result;
    this.enemies = [];
    this.enemyShots = [];
    this.eliteAlert = null;
    composition.forEach((type, index) => {
      const eliteStep = mission.modeId === 'story' ? 4 : 5;
      this.spawnEnemy(type, { elite: this.wave >= 3 && index > 0 && index % eliteStep === eliteStep - 1 });
    });
    const region = regionById(regionId);
    this.banner = {
      title: `الموجة ${this.wave} / ${this.runTargetWaves || 5}`,
      subtitle: `${region.name} — وحدات المنطقة الخاصة`,
      time: 1.55,
    };
    return result;
  };

  const originalUpdateEnemies = prototype.updateEnemies;
  prototype.updateEnemies = function updateRegionEnemies(dt) {
    const mapped = [];
    for (const enemy of this.enemies) {
      const definition = regionEnemyById(enemy.type);
      if (!definition) continue;
      mapped.push({ enemy, type: enemy.type, speed: enemy.speed });
      enemy.regionType = enemy.type;
      enemy.type = definition.baseType;
      if (enemy.phased) enemy.speed = 0;
    }
    const result = originalUpdateEnemies.call(this, dt);
    for (const item of mapped) {
      if (!this.enemies.includes(item.enemy)) continue;
      item.enemy.type = item.type;
      item.enemy.regionType = item.type;
      item.enemy.speed = item.speed;
      updateRegionEnemyBehavior(this, item.enemy, dt);
    }
    updateHeatZones(this, dt);
    return result;
  };

  const originalUpdate = prototype.update;
  prototype.update = function updateRegionEnemyFeedback(dt) {
    const result = originalUpdate.call(this, dt);
    if (this.regionEnemyAlert) {
      this.regionEnemyAlert.time -= dt;
      if (this.regionEnemyAlert.time <= 0) this.regionEnemyAlert = null;
    }
    return result;
  };

  const originalDamageEnemy = prototype.damageEnemy;
  prototype.damageEnemy = function damageRegionEnemy(enemy, damage, forceX, forceY, fromBullet) {
    const definition = regionEnemyById(enemy.type);
    if (!definition) return originalDamageEnemy.call(this, enemy, damage, forceX, forceY, fromBullet);
    if (enemy.type === 'phase-walker' && enemy.phased) {
      this.addFloatingText?.(enemy.x, enemy.y - enemy.radius - 12, 'خارج الطور', definition.color);
      return undefined;
    }
    if (fromBullet && enemy.type === 'shield-drone' && this.bullet.bounceCount === 0) {
      const incoming = normalize(forceX, forceY);
      const facing = { x: Math.cos(enemy.facingAngle || 0), y: Math.sin(enemy.facingAngle || 0) };
      const frontHit = incoming.x * facing.x + incoming.y * facing.y < -0.15;
      if (frontHit) {
        this.bullet.vx *= -0.72;
        this.bullet.vy *= -0.72;
        this.createRing?.(enemy.x, enemy.y, definition.color, enemy.radius + 30);
        this.addFloatingText?.(enemy.x, enemy.y - enemy.radius - 14, 'صدّ أمامي', definition.color);
        this.audio.play('ricochet');
        return undefined;
      }
    }
    if (fromBullet && enemy.type === 'mirror-drone' && this.bullet.bounceCount === 0 && enemy.mirrorCooldown <= 0) {
      const direction = enemy.id % 2 === 0 ? 1 : -1;
      const angle = direction * Math.PI * 0.58;
      const vx = this.bullet.vx;
      const vy = this.bullet.vy;
      this.bullet.vx = (vx * Math.cos(angle) - vy * Math.sin(angle)) * 0.88;
      this.bullet.vy = (vx * Math.sin(angle) + vy * Math.cos(angle)) * 0.88;
      enemy.mirrorCooldown = 0.55;
      this.createRing?.(enemy.x, enemy.y, definition.color, enemy.radius + 34);
      this.addFloatingText?.(enemy.x, enemy.y - enemy.radius - 14, 'انعكاس', definition.color);
      this.audio.play('ricochet');
      return undefined;
    }
    return originalDamageEnemy.call(this, enemy, damage, forceX, forceY, fromBullet);
  };

  const originalKillEnemy = prototype.killEnemy;
  prototype.killEnemy = function killRegionEnemy(enemy) {
    const definition = regionEnemyById(enemy.type);
    const existed = this.enemies.some((candidate) => candidate.id === enemy.id);
    const result = originalKillEnemy.call(this, enemy);
    if (!definition || !existed || this.enemies.some((candidate) => candidate.id === enemy.id)) return result;
    recordEnemyKill(this, definition.id);
    if (enemy.type === 'furnace-brute') createHeatZone(this, enemy.x, enemy.y, enemy.elite ? 96 : 78, enemy.elite ? 5 : 4.1);
    if (enemy.type === 'gravity-orb') this.createRing?.(enemy.x, enemy.y, definition.color, 160);
    return result;
  };

  const originalFireEnemyShot = prototype.fireEnemyShot;
  prototype.fireEnemyShot = function fireRegionEnemyShot(enemy, direction, speed = 370) {
    if (enemy.regionType !== 'rift-sniper') return originalFireEnemyShot.call(this, enemy, direction, speed);
    const definition = regionEnemyById('rift-sniper');
    const portals = this.arena?.effects?.portals || [];
    let exit = portals.length
      ? [...portals].sort((a, b) => distance(a, this.player) - distance(b, this.player))[0]
      : { x: WIDTH - enemy.x, y: HEIGHT - enemy.y };
    exit = { x: clamp(exit.x, 35, WIDTH - 35), y: clamp(exit.y, 35, HEIGHT - 35) };
    const aim = normalize(this.player.x - exit.x, this.player.y - exit.y);
    this.enemyShots.push({
      x: exit.x,
      y: exit.y,
      vx: aim.x * (enemy.elite ? speed * 1.16 : speed),
      vy: aim.y * (enemy.elite ? speed * 1.16 : speed),
      radius: enemy.elite ? 8 : 7,
      life: 3.8,
      color: definition.color,
      riftShot: true,
    });
    enemy.riftExit = exit;
    enemy.riftExitTime = 0.7;
    this.createRing?.(enemy.x, enemy.y, definition.color, 55);
    this.createRing?.(exit.x, exit.y, definition.color, 58);
    this.audio.play('ricochet');
    return undefined;
  };

  const originalEnemyColor = prototype.enemyColor;
  prototype.enemyColor = function regionEnemyColor(type) {
    return regionEnemyById(type)?.color || originalEnemyColor.call(this, type);
  };

  const originalDrawArena = prototype.drawArena;
  prototype.drawArena = function drawRegionEnemyArena(...args) {
    const result = originalDrawArena.apply(this, args);
    drawHeatZones(this);
    return result;
  };

  const originalDrawEnemies = prototype.drawEnemies;
  prototype.drawEnemies = function drawRegionEnemies() {
    const allEnemies = this.enemies;
    const regularEnemies = allEnemies.filter((enemy) => !regionEnemyById(enemy.type));
    this.enemies = regularEnemies;
    try {
      originalDrawEnemies.call(this);
    } finally {
      this.enemies = allEnemies;
    }
    for (const enemy of allEnemies) if (regionEnemyById(enemy.type)) drawRegionEnemy(this, enemy);
  };

  const originalDrawHud = prototype.drawHud;
  prototype.drawHud = function drawRegionEnemyHud(...args) {
    const result = originalDrawHud.apply(this, args);
    drawEnemyAlert(this);
    return result;
  };

  const originalDrawMenu = prototype.drawMenu;
  prototype.drawMenu = function drawMenuWithEnemyCodex(...args) {
    const result = originalDrawMenu.apply(this, args);
    this.drawButton('سجل الأعداء', 930, 617, 250, 40, () => {
      this.audio.play('click');
      this.enemyCodex = normalizeEnemyCodex(this.enemyCodex || loadCodex());
      this.state = 'enemyCodex';
    });
    return result;
  };

  const originalHandleEscape = prototype.handleEscape;
  prototype.handleEscape = function handleEnemyCodexEscape() {
    if (this.state === 'enemyCodex') {
      this.audio.play('click');
      this.state = 'menu';
      return;
    }
    return originalHandleEscape.call(this);
  };

  const originalDraw = prototype.draw;
  prototype.draw = function drawEnemyCodexState(...args) {
    if (this.state === 'enemyCodex' && !document.body.classList.contains('mobile-portrait')) {
      this.uiRegions = [];
      this.ctx.save();
      this.drawArena();
      drawEnemyCodex(this);
      this.ctx.restore();
      return undefined;
    }
    return originalDraw.apply(this, args);
  };
}
