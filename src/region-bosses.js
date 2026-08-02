import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from './content.js';
import { normalizeSave, PROGRESSION_STORAGE_KEY } from './progression-data.js';
import { difficultyById, normalizeMission, regionById } from './regions-data.js';
import {
  BOSS_MASTERY_STORAGE_KEY,
  REGION_BOSSES,
  bossById,
  bossByRegion,
  bossPhaseForHealth,
  createBossCombatState,
  createDefaultBossMastery,
  normalizeBossMastery,
  recordBossEncounter,
  recordBossVictory,
} from './region-bosses-data.js';

const FONT = 'Changa, "Segoe UI", Tahoma, sans-serif';
const NUMERIC_FONT = 'Inter, "Segoe UI", Arial, sans-serif';
const COLORS = Object.freeze({
  text: '#f8f9ff', muted: '#aeb7da', cyan: '#62f3ff', yellow: '#ffe66d', red: '#ff526a',
  orange: '#ff9f43', purple: '#b983ff', green: '#53f2a1', panel: 'rgba(8, 13, 29, 0.96)', border: '#33406f',
});

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function normalize(x, y) {
  const length = Math.hypot(x, y);
  return length > 0 ? { x: x / length, y: y / length } : { x: 0, y: 0 };
}

function distanceSquared(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function circlesOverlap(a, b, padding = 0) {
  const radius = Math.max(0, (a.radius || 0) + (b.radius || 0) + padding);
  return distanceSquared(a, b) <= radius * radius;
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

function panel(ctx, x, y, width, height, accent = COLORS.border, fill = COLORS.panel, blur = 12) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.shadowColor = accent;
  ctx.shadowBlur = blur;
  roundedRect(ctx, x, y, width, height, 18);
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

function number(ctx, value, x, y, size, color = COLORS.text, align = 'center') {
  ctx.save();
  ctx.direction = 'ltr';
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.font = `800 ${size}px ${NUMERIC_FONT}`;
  ctx.fillText(String(value), x, y);
  ctx.restore();
}

function polygon(ctx, sides, radius, rotation = 0) {
  ctx.beginPath();
  for (let index = 0; index < sides; index += 1) {
    const angle = rotation + (index / sides) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function loadMastery() {
  if (typeof localStorage === 'undefined') return createDefaultBossMastery();
  try {
    return normalizeBossMastery(JSON.parse(localStorage.getItem(BOSS_MASTERY_STORAGE_KEY) || 'null'));
  } catch {
    return createDefaultBossMastery();
  }
}

function persistMastery(mastery) {
  const normalized = normalizeBossMastery(mastery);
  if (typeof localStorage !== 'undefined') localStorage.setItem(BOSS_MASTERY_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

function persistProgression(game) {
  if (!game.progressionSave || typeof localStorage === 'undefined') return;
  game.progressionSave = normalizeSave(game.progressionSave);
  localStorage.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(game.progressionSave));
}

function addBossReward(game, boss) {
  if (!boss || boss.rewardSettled) return;
  boss.rewardSettled = true;
  const mission = normalizeMission(game.activeMission);
  const outcome = recordBossVictory(game.bossMastery, boss.bossId, {
    time: game.runTime,
    difficultyId: mission.difficultyId,
    damageTaken: game.stats?.damageTaken,
  });
  game.bossMastery = persistMastery(outcome.mastery);
  if (game.progressionSave) {
    game.progressionSave.shards += outcome.reward;
    game.progressionSave.stats.totalShardsEarned += outcome.reward;
    persistProgression(game);
  }
  game.bossVictoryReward = {
    bossId: boss.bossId,
    amount: outcome.reward,
    firstVictory: outcome.firstVictory,
  };
}

function fireAimedSpread(game, origin, count, speed, spread = 0.22, color = COLORS.red) {
  const direction = normalize(game.player.x - origin.x, game.player.y - origin.y);
  const baseAngle = Math.atan2(direction.y, direction.x);
  const middle = (count - 1) / 2;
  for (let index = 0; index < count; index += 1) {
    const angle = baseAngle + (index - middle) * spread;
    game.enemyShots.push({
      x: origin.x,
      y: origin.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 8,
      life: 4.2,
      color,
    });
  }
}

function updateMirrorGuardian(game, boss, dt) {
  const definition = boss.definition;
  const toPlayer = normalize(game.player.x - boss.x, game.player.y - boss.y);
  const orbit = { x: -toPlayer.y, y: toPlayer.x };
  boss.x += (orbit.x * Math.sin(boss.angle * 1.3) + toPlayer.x * 0.18) * (62 + boss.phase * 12) * dt;
  boss.y += (orbit.y * Math.sin(boss.angle * 1.3) + toPlayer.y * 0.18) * (62 + boss.phase * 12) * dt;

  if (boss.phase >= 2 && boss.decoys.length < (boss.phase === 2 ? 2 : 3) && boss.attackCooldown < 0.45) {
    const angle = boss.angle + boss.decoys.length * (Math.PI * 2 / 3);
    boss.decoys.push({
      id: `mirror-${Date.now()}-${boss.decoys.length}`,
      x: clamp(boss.x + Math.cos(angle) * 150, 80, WIDTH - 80),
      y: clamp(boss.y + Math.sin(angle) * 120, 90, HEIGHT - 90),
      radius: 38,
      life: 4.8,
      phase: angle,
    });
  }

  for (const decoy of boss.decoys) {
    decoy.life -= dt;
    decoy.phase += dt * 1.7;
    if (!game.bullet.held && circlesOverlap(game.bullet, decoy)) {
      const normal = normalize(game.bullet.x - decoy.x, game.bullet.y - decoy.y);
      const speed = Math.max(420, Math.hypot(game.bullet.vx, game.bullet.vy));
      game.bullet.vx = normal.x * speed;
      game.bullet.vy = normal.y * speed;
      decoy.life = 0;
      game.createRing(decoy.x, decoy.y, definition.accent, 76);
      game.addFloatingText(decoy.x, decoy.y - 42, 'نسخة وهمية', definition.accent);
    }
  }
  boss.decoys = boss.decoys.filter((decoy) => decoy.life > 0);

  boss.controlInvertCooldown -= dt;
  if (boss.phase === 3 && boss.controlInvertCooldown <= 0) {
    boss.controlInvertTimer = 1.35;
    boss.controlInvertCooldown = 5.1;
    game.banner = { title: 'انعكاس الحركة', subtitle: 'الاتجاهات مقلوبة لثانية واحدة', time: 1.25 };
    game.createRing(game.player.x, game.player.y, definition.accent, 120);
  }
  boss.controlInvertTimer = Math.max(0, boss.controlInvertTimer - dt);
  game.bossControlInvert = boss.controlInvertTimer > 0;

  boss.attackCooldown -= dt;
  if (boss.attackCooldown <= 0) {
    if (boss.phase === 1) game.fireRadialShots(boss, 10, 275, boss.angle);
    else if (boss.phase === 2) {
      fireAimedSpread(game, boss, 5, 390, 0.16, definition.accent);
      game.fireRadialShots(boss, 6, 235, boss.angle);
    } else {
      fireAimedSpread(game, boss, 7, 435, 0.14, definition.color);
      game.fireRadialShots(boss, 12, 245, -boss.angle);
    }
    boss.attackCooldown = boss.phase === 1 ? 2.0 : boss.phase === 2 ? 1.55 : 1.05;
    game.audio.play('boss');
  }
}

function releaseCapturedBullet(game, boss) {
  boss.captureTimer = 0;
  boss.captureCooldown = 3.2;
  boss.vulnerableTimer = 1.8;
  const direction = normalize(game.player.x - boss.x, game.player.y - boss.y);
  const speed = 760;
  game.bullet.x = boss.x + direction.x * (boss.radius + 16);
  game.bullet.y = boss.y + direction.y * (boss.radius + 16);
  game.bullet.vx = direction.x * speed;
  game.bullet.vy = direction.y * speed;
  game.bullet.held = false;
  game.bullet.recoverDelay = 0.16;
  game.createRing(boss.x, boss.y, boss.definition.accent, 105);
  game.addFloatingText(boss.x, boss.y - 78, 'نافذة ضعف', boss.definition.accent);
}

function updateBulletHunter(game, boss, dt) {
  const definition = boss.definition;
  boss.captureCooldown = Math.max(0, boss.captureCooldown - dt);
  boss.vulnerableTimer = Math.max(0, boss.vulnerableTimer - dt);

  if (boss.captureTimer > 0) {
    boss.captureTimer -= dt;
    game.bullet.held = false;
    game.bullet.recalling = false;
    game.bullet.x = boss.x;
    game.bullet.y = boss.y;
    game.bullet.vx = 0;
    game.bullet.vy = 0;
    if (boss.captureTimer <= 0) releaseCapturedBullet(game, boss);
    return;
  }

  const target = game.bullet.held ? game.player : game.bullet;
  const toTarget = normalize(target.x - boss.x, target.y - boss.y);
  const speed = game.bullet.held ? 72 : 105 + boss.phase * 18;
  boss.x += toTarget.x * speed * dt;
  boss.y += toTarget.y * speed * dt;

  if (!game.bullet.held && !game.bullet.recalling && boss.captureCooldown <= 0 && circlesOverlap(boss, game.bullet, 10)) {
    boss.captureTimer = boss.phase === 1 ? 1.25 : boss.phase === 2 ? 1.55 : 1.15;
    game.banner = { title: 'تم احتجاز الطلقة', subtitle: 'استعد موقعك قبل أن يطردها الصياد', time: 1.1 };
    game.shake = Math.max(game.shake, 10);
    game.audio.play('boss');
  }

  boss.attackCooldown -= dt;
  if (boss.attackCooldown <= 0) {
    if (boss.phase === 1) fireAimedSpread(game, boss, 3, 360, 0.18, definition.color);
    else if (boss.phase === 2) {
      game.fireRadialShots(boss, 8, 245, boss.angle);
      fireAimedSpread(game, boss, 3, 430, 0.12, definition.accent);
    } else {
      boss.dashDirection = normalize(game.player.x - boss.x, game.player.y - boss.y);
      boss.dashRemaining = 0.32;
      game.fireRadialShots(boss, 10, 270, boss.angle);
    }
    boss.attackCooldown = boss.phase === 1 ? 1.8 : boss.phase === 2 ? 1.35 : 0.95;
  }

  if (boss.dashRemaining > 0) {
    boss.dashRemaining -= dt;
    boss.x += boss.dashDirection.x * 530 * dt;
    boss.y += boss.dashDirection.y * 530 * dt;
  }
}

function updateRiftKing(game, boss, dt) {
  const definition = boss.definition;
  boss.portalCooldown = Math.max(0, boss.portalCooldown - dt);
  boss.gravityPulse += dt * (boss.phase === 1 ? 1.3 : 2.1);
  boss.segmentTimer -= dt;

  const toPlayer = normalize(game.player.x - boss.x, game.player.y - boss.y);
  const orbit = { x: -toPlayer.y, y: toPlayer.x };
  boss.x += (orbit.x * 0.82 + toPlayer.x * 0.16) * (58 + boss.phase * 14) * dt;
  boss.y += (orbit.y * 0.82 + toPlayer.y * 0.16) * (58 + boss.phase * 14) * dt;

  const portals = [
    { x: 220, y: 190, radius: 31 },
    { x: 1060, y: 530, radius: 31 },
  ];
  boss.portals = portals;
  if (!game.bullet.held && boss.portalCooldown <= 0) {
    for (let index = 0; index < portals.length; index += 1) {
      if (!circlesOverlap(game.bullet, portals[index])) continue;
      const target = portals[1 - index];
      game.bullet.x = target.x;
      game.bullet.y = target.y;
      const vx = game.bullet.vx;
      game.bullet.vx = -game.bullet.vy;
      game.bullet.vy = vx;
      boss.portalCooldown = 0.7;
      game.createRing(target.x, target.y, definition.color, 85);
      break;
    }
  }

  if (boss.phase >= 2) {
    const direction = boss.phase === 2 ? Math.sign(Math.sin(boss.gravityPulse)) || 1 : boss.gravityDirection;
    const strength = (boss.phase === 2 ? 55 : 78) * direction;
    const playerPull = normalize(boss.x - game.player.x, boss.y - game.player.y);
    game.player.x += playerPull.x * strength * dt;
    game.player.y += playerPull.y * strength * dt;
    if (!game.bullet.held) {
      const bulletPull = normalize(boss.x - game.bullet.x, boss.y - game.bullet.y);
      game.bullet.vx += bulletPull.x * strength * 2.4 * dt;
      game.bullet.vy += bulletPull.y * strength * 2.4 * dt;
    }
  }

  if (boss.phase === 3 && boss.segmentTimer <= 0) {
    boss.segmentAxis = boss.segmentAxis === 'vertical' ? 'horizontal' : 'vertical';
    boss.segmentTimer = 3.1;
    game.banner = { title: 'انقسام الحلبة', subtitle: 'ابتعد عن الخط الطيفي قبل الانهيار', time: 1.15 };
  }
  if (boss.phase === 3 && boss.segmentTimer < 0.55) {
    const vertical = boss.segmentAxis !== 'horizontal';
    const distance = vertical ? Math.abs(game.player.x - WIDTH / 2) : Math.abs(game.player.y - HEIGHT / 2);
    if (distance < 24) game.damagePlayer(WIDTH / 2, HEIGHT / 2);
  }

  boss.attackCooldown -= dt;
  if (boss.attackCooldown <= 0) {
    if (boss.phase === 1) {
      fireAimedSpread(game, boss, 4, 370, 0.16, definition.color);
      game.fireRadialShots(boss, 6, 230, boss.angle);
    } else if (boss.phase === 2) {
      game.fireRadialShots(boss, 12, 265, boss.angle);
      boss.gravityDirection *= -1;
    } else {
      fireAimedSpread(game, boss, 7, 455, 0.13, definition.accent);
      game.fireRadialShots(boss, 14, 250, -boss.angle);
    }
    boss.attackCooldown = boss.phase === 1 ? 1.75 : boss.phase === 2 ? 1.28 : 0.88;
  }
}

function updateUniqueBoss(game, dt) {
  const boss = game.boss;
  if (!boss || boss.dead || !boss.bossId) return;
  boss.hitFlash = Math.max(0, boss.hitFlash - dt);
  boss.angle += dt * (0.72 + boss.phase * 0.18);
  boss.previousPhase = boss.phase;
  boss.phase = bossPhaseForHealth(boss.definition, boss.hp, boss.maxHp);
  if (boss.phase !== boss.previousPhase) {
    const phaseData = boss.definition.phases[boss.phase - 1];
    game.banner = { title: phaseData.name, subtitle: phaseData.hint, time: 2.15 };
    game.audio.play('boss');
    game.createBurst(boss.x, boss.y, boss.definition.color, 42, 390);
    game.shake = Math.max(game.shake, 17);
  }

  if (boss.bossId === 'mirror-guardian') updateMirrorGuardian(game, boss, dt);
  else if (boss.bossId === 'bullet-hunter') updateBulletHunter(game, boss, dt);
  else updateRiftKing(game, boss, dt);

  boss.x = clamp(boss.x, boss.radius + 12, WIDTH - boss.radius - 12);
  boss.y = clamp(boss.y, boss.radius + 20, HEIGHT - boss.radius - 20);
  game.resolveEntityObstacles(boss);
  if (circlesOverlap(boss, game.player, -6)) game.damagePlayer(boss.x, boss.y);
}

function reflectBulletFromBoss(game, boss, text) {
  const normal = normalize(game.bullet.x - boss.x, game.bullet.y - boss.y);
  const speed = Math.max(500, Math.hypot(game.bullet.vx, game.bullet.vy));
  game.bullet.vx = normal.x * speed;
  game.bullet.vy = normal.y * speed;
  game.bullet.x = boss.x + normal.x * (boss.radius + game.bullet.radius + 4);
  game.bullet.y = boss.y + normal.y * (boss.radius + game.bullet.radius + 4);
  game.createRing(boss.x, boss.y, boss.definition.accent, 104);
  game.addFloatingText(boss.x, boss.y - boss.radius - 18, text, boss.definition.accent);
  game.audio.play('ricochet');
  game.shake = Math.max(game.shake, 7);
}

function damageUniqueBoss(game, damage, bypassShield = false) {
  const boss = game.boss;
  if (!boss || boss.dead || !boss.bossId) return false;
  if (boss.bossId === 'mirror-guardian' && boss.phase === 1 && game.bullet.bounceCount === 0 && !bypassShield) {
    reflectBulletFromBoss(game, boss, 'المرآة تعكس الطلقة المباشرة');
    return true;
  }
  if (boss.bossId === 'bullet-hunter' && boss.phase === 3 && !game.bullet.recalling && boss.vulnerableTimer <= 0 && !bypassShield) {
    game.createRing(boss.x, boss.y, boss.definition.color, 88);
    game.addFloatingText(boss.x, boss.y - boss.radius - 16, 'اضربه أثناء الاستدعاء أو نافذة الضعف', boss.definition.accent);
    return true;
  }

  const hpBefore = boss.hp;
  boss.hp = Math.max(0, boss.hp - Math.max(0, Number(damage) || 0));
  boss.hitFlash = 0.2;
  if (!bypassShield && boss.hp < hpBefore) {
    game.stats.hits += 1;
    game.stats.directImpacts = Math.max(0, Number(game.stats.directImpacts) || 0) + 1;
  }
  game.audio.play(boss.hp <= 0 ? 'explosion' : 'hit');
  game.hitStop = Math.max(game.hitStop, boss.hp <= 0 ? 0.15 : 0.055);
  game.shake = Math.max(game.shake, boss.hp <= 0 ? 25 : 10);
  game.createBurst(boss.x, boss.y, boss.definition.color, boss.hp <= 0 ? 78 : 20, boss.hp <= 0 ? 540 : 270);
  game.addFloatingText(boss.x, boss.y - boss.radius - 16, `-${Math.round(damage * 10) / 10}`, boss.definition.accent);
  if (boss.hp <= 0) {
    boss.dead = true;
    game.score += 6500 + boss.definition.reward * 10;
    game.stats.kills += 1;
    game.enemyShots = [];
    game.bossControlInvert = false;
    game.slowMotion = 1.5;
    game.victoryTimer = 1.65;
    addBossReward(game, boss);
    game.audio.play('victory');
  }
  return true;
}

function drawMirrorGuardian(game, boss) {
  const ctx = game.ctx;
  for (const decoy of boss.decoys || []) {
    ctx.save();
    ctx.globalAlpha = 0.32 + Math.sin(decoy.phase * 3) * 0.08;
    ctx.translate(decoy.x, decoy.y);
    ctx.rotate(decoy.phase);
    ctx.strokeStyle = boss.definition.accent;
    ctx.lineWidth = 4;
    ctx.shadowColor = boss.definition.accent;
    ctx.shadowBlur = 20;
    polygon(ctx, 4, decoy.radius, Math.PI / 4);
    ctx.stroke();
    ctx.restore();
  }
  ctx.save();
  ctx.translate(boss.x, boss.y);
  ctx.rotate(boss.angle);
  ctx.shadowColor = boss.definition.color;
  ctx.shadowBlur = 34;
  ctx.fillStyle = boss.hitFlash > 0 ? '#ffffff' : 'rgba(30, 48, 82, 0.98)';
  polygon(ctx, 8, boss.radius, Math.PI / 8);
  ctx.fill();
  ctx.strokeStyle = boss.definition.color;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.rotate(-boss.angle * 2.1);
  ctx.strokeStyle = boss.definition.accent;
  ctx.lineWidth = 4;
  polygon(ctx, 4, boss.radius * 0.58, Math.PI / 4);
  ctx.stroke();
  if (boss.phase === 1) {
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, boss.radius + 18, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBulletHunter(game, boss) {
  const ctx = game.ctx;
  ctx.save();
  ctx.translate(boss.x, boss.y);
  const aim = normalize((game.bullet?.x || game.player.x) - boss.x, (game.bullet?.y || game.player.y) - boss.y);
  ctx.rotate(Math.atan2(aim.y, aim.x));
  ctx.shadowColor = boss.definition.color;
  ctx.shadowBlur = 34;
  ctx.fillStyle = boss.hitFlash > 0 ? '#ffffff' : 'rgba(63, 36, 24, 0.98)';
  polygon(ctx, 6, boss.radius, Math.PI / 6);
  ctx.fill();
  ctx.strokeStyle = boss.definition.color;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = boss.definition.accent;
  ctx.fillRect(12, -9, boss.radius + 30, 18);
  ctx.beginPath();
  ctx.arc(-12, 0, 18, 0, Math.PI * 2);
  ctx.fill();
  if (boss.captureTimer > 0) {
    ctx.strokeStyle = boss.definition.accent;
    ctx.lineWidth = 5;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, boss.radius + 26 + Math.sin(game.elapsed * 14) * 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRiftKing(game, boss) {
  const ctx = game.ctx;
  for (const portal of boss.portals || []) {
    ctx.save();
    ctx.translate(portal.x, portal.y);
    ctx.rotate(game.elapsed * 1.4 + portal.x);
    ctx.strokeStyle = boss.definition.color;
    ctx.lineWidth = 4;
    ctx.shadowColor = boss.definition.color;
    ctx.shadowBlur = 22;
    ctx.setLineDash([7, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, portal.radius + Math.sin(game.elapsed * 4) * 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (boss.phase >= 2) {
    ctx.save();
    ctx.strokeStyle = boss.definition.accent;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 3;
    for (let ring = 0; ring < 3; ring += 1) {
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, 95 + ring * 45 + Math.sin(boss.gravityPulse + ring) * 10, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (boss.phase === 3) {
    const vertical = boss.segmentAxis !== 'horizontal';
    const danger = boss.segmentTimer < 0.55;
    ctx.save();
    ctx.strokeStyle = danger ? COLORS.red : boss.definition.color;
    ctx.lineWidth = danger ? 18 : 5;
    ctx.globalAlpha = danger ? 0.68 : 0.35;
    ctx.setLineDash(danger ? [] : [16, 12]);
    ctx.beginPath();
    if (vertical) { ctx.moveTo(WIDTH / 2, 0); ctx.lineTo(WIDTH / 2, HEIGHT); }
    else { ctx.moveTo(0, HEIGHT / 2); ctx.lineTo(WIDTH, HEIGHT / 2); }
    ctx.stroke();
    ctx.restore();
  }
  ctx.save();
  ctx.translate(boss.x, boss.y);
  ctx.rotate(boss.angle);
  ctx.shadowColor = boss.definition.color;
  ctx.shadowBlur = 40;
  ctx.fillStyle = boss.hitFlash > 0 ? '#ffffff' : 'rgba(42, 24, 72, 0.98)';
  polygon(ctx, 10, boss.radius, Math.PI / 10);
  ctx.fill();
  ctx.strokeStyle = boss.definition.color;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.rotate(-boss.angle * 2.4);
  ctx.strokeStyle = boss.definition.accent;
  ctx.lineWidth = 4;
  polygon(ctx, 5, boss.radius * 0.55, -Math.PI / 2);
  ctx.stroke();
  ctx.restore();
}

function drawUniqueBoss(game) {
  const boss = game.boss;
  if (!boss?.bossId) return false;
  if (boss.bossId === 'mirror-guardian') drawMirrorGuardian(game, boss);
  else if (boss.bossId === 'bullet-hunter') drawBulletHunter(game, boss);
  else drawRiftKing(game, boss);

  const ctx = game.ctx;
  const width = 430;
  const x = WIDTH / 2 - width / 2;
  panel(ctx, x, 18, width, 70, boss.definition.color, 'rgba(8, 13, 29, 0.94)', 8);
  label(ctx, `${boss.definition.icon} ${boss.definition.name}`, WIDTH / 2, 45, 18, boss.definition.color, 900);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  roundedRect(ctx, x + 24, 58, width - 48, 9, 5);
  ctx.fill();
  ctx.fillStyle = boss.definition.accent;
  roundedRect(ctx, x + 24, 58, (width - 48) * Math.max(0, boss.hp / boss.maxHp), 9, 5);
  ctx.fill();
  label(ctx, `المرحلة ${boss.phase} • ${boss.definition.phases[boss.phase - 1].name}`, WIDTH / 2, 82, 11, COLORS.muted, 600);
  return true;
}

function drawBossMastery(game) {
  const ctx = game.ctx;
  const mastery = normalizeBossMastery(game.bossMastery);
  ctx.fillStyle = 'rgba(2, 4, 11, 0.92)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  label(ctx, 'سجل حراس المناطق', WIDTH / 2, 78, 42, COLORS.text, 900);
  label(ctx, 'إحصاءات المواجهة والمكافآت المرتبطة بكل حارس', WIDTH / 2, 112, 16, COLORS.muted, 500);

  REGION_BOSSES.forEach((boss, index) => {
    const x = 60 + index * 405;
    const y = 160;
    const entry = mastery.bosses[boss.id];
    panel(ctx, x, y, 350, 420, boss.color, 'rgba(11, 16, 34, 0.96)', 12);
    label(ctx, boss.icon, x + 175, y + 68, 42, boss.color, 900);
    label(ctx, boss.name, x + 175, y + 112, 27, COLORS.text, 900);
    label(ctx, boss.title, x + 175, y + 140, 14, boss.accent, 700);
    label(ctx, `المواجهات`, x + 175, y + 192, 13, COLORS.muted, 600);
    number(ctx, entry.encounters, x + 175, y + 222, 25, boss.color);
    label(ctx, `الانتصارات`, x + 175, y + 260, 13, COLORS.muted, 600);
    number(ctx, entry.victories, x + 175, y + 291, 25, COLORS.green);
    label(ctx, `أفضل وقت`, x + 175, y + 330, 13, COLORS.muted, 600);
    const best = entry.bestTime > 0 ? `${Math.floor(entry.bestTime / 60)}:${String(Math.floor(entry.bestTime % 60)).padStart(2, '0')}` : '—';
    number(ctx, best, x + 175, y + 360, 22, COLORS.yellow);
    label(ctx, `انتصار دون ضرر: ${entry.noDamageWins}`, x + 175, y + 398, 13, COLORS.muted, 600);
  });

  game.drawButton('العودة', WIDTH / 2 - 150, 626, 300, 54, () => {
    game.audio.play('click');
    game.state = 'menu';
  }, true);
}

export function installRegionBosses(GameClass) {
  const prototype = GameClass.prototype;
  if (prototype.__regionBossesInstalled) return;
  prototype.__regionBossesInstalled = true;

  const originalResetRun = prototype.resetRun;
  prototype.resetRun = function resetRunWithBossMastery(...args) {
    const result = originalResetRun.apply(this, args);
    this.bossMastery = this.bossMastery || loadMastery();
    this.bossVictoryReward = null;
    this.bossControlInvert = false;
    return result;
  };

  const originalMovement = prototype.getMovementDirection;
  prototype.getMovementDirection = function getBossAdjustedMovement(...args) {
    const direction = originalMovement.apply(this, args);
    return this.bossControlInvert ? { x: -direction.x, y: -direction.y } : direction;
  };

  const originalStartBoss = prototype.startBoss;
  prototype.startBoss = function startUniqueRegionBoss(...args) {
    const result = originalStartBoss.apply(this, args);
    const mission = normalizeMission(this.activeMission);
    const regionId = this.arena?.regionId || mission.regionId;
    const definition = bossByRegion(regionId);
    const difficulty = difficultyById(mission.difficultyId);
    this.boss = createBossCombatState(regionId, {
      healthMultiplier: difficulty.enemyHealth,
      story: mission.modeId === 'story',
    });
    this.boss.missionTitle = definition.name;
    this.bossIntroTimer = 3.1;
    this.bossMastery = persistMastery(recordBossEncounter(this.bossMastery, definition.id));
    return result;
  };

  const originalUpdateBoss = prototype.updateBoss;
  prototype.updateBoss = function updateRegionBoss(dt) {
    if (!this.boss?.bossId) return originalUpdateBoss.call(this, dt);
    return updateUniqueBoss(this, dt);
  };

  const originalDamageBoss = prototype.damageBoss;
  prototype.damageBoss = function damageRegionBoss(damage, bypassShield = false) {
    if (!this.boss?.bossId) return originalDamageBoss.call(this, damage, bypassShield);
    return damageUniqueBoss(this, damage, bypassShield);
  };

  const originalDrawBoss = prototype.drawBoss;
  prototype.drawBoss = function drawRegionBoss() {
    if (!drawUniqueBoss(this)) return originalDrawBoss.call(this);
    return undefined;
  };

  const originalDrawMenu = prototype.drawMenu;
  prototype.drawMenu = function drawMenuWithBossMastery(...args) {
    originalDrawMenu.apply(this, args);
    this.drawButton('سجل الحراس', 1018, 620, 220, 42, () => {
      this.audio.play('click');
      this.state = 'bossMastery';
    }, false);
  };

  const originalHandleEscape = prototype.handleEscape;
  prototype.handleEscape = function handleBossMasteryEscape() {
    if (this.state === 'bossMastery') {
      this.audio.play('click');
      this.state = 'menu';
      return;
    }
    return originalHandleEscape.call(this);
  };

  const originalDraw = prototype.draw;
  prototype.draw = function drawBossExpansionStates(...args) {
    if (this.state === 'bossMastery') {
      this.uiRegions = [];
      this.ctx.save();
      this.drawArena();
      drawBossMastery(this);
      this.ctx.restore();
      return undefined;
    }
    return originalDraw.apply(this, args);
  };

  const originalDrawResult = prototype.drawResult;
  prototype.drawResult = function drawResultWithBossReward(victory) {
    originalDrawResult.call(this, victory);
    const reward = this.bossVictoryReward;
    if (!victory || !reward) return;
    const definition = bossById(reward.bossId);
    if (!definition) return;
    panel(this.ctx, 455, 624, 370, 48, definition.color, 'rgba(8, 13, 29, 0.96)', 8);
    label(this.ctx, `${reward.firstVictory ? 'مكافأة إتقان أولى' : 'مكافأة الحارس'}  +${reward.amount} شظية`, WIDTH / 2, 654, 14, definition.accent, 900);
  };
}
