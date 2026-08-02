import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from './content.js';
import { createRegionArenaState, normalizeMission, regionById } from './regions-data.js';
import {
  COMBAT_TECHNIQUES,
  TECHNIQUE_TIERS,
  expandedComposition,
  expandedLocalWave,
  expandedRegionIdForWave,
  expandedTargetWaves,
  evolutionById,
  evolutionForEnemy,
  mapMutatorForWave,
  mobileTechniqueLayout,
  techniqueCooldown,
  techniqueTierForWave,
} from './v12-expansion-data.js';

const FONT = 'Changa, "Segoe UI", Tahoma, sans-serif';
const COLORS = Object.freeze({
  panel: 'rgba(5, 9, 22, 0.9)',
  panelStrong: 'rgba(7, 12, 28, 0.97)',
  border: '#35416e',
  cyan: '#62f3ff',
  yellow: '#ffe66d',
  purple: '#b983ff',
  orange: '#ff9f43',
  red: '#ff526a',
  green: '#53f2a1',
  text: '#f8f9ff',
  muted: '#aeb7da',
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalize(x, y) {
  const length = Math.hypot(x, y);
  return length > 0.0001 ? { x: x / length, y: y / length } : { x: 0, y: 0 };
}

function roundedRect(ctx, x, y, width, height, radius = 14) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, width, height, radius);
  else ctx.rect(x, y, width, height);
}

function panel(ctx, x, y, width, height, accent = COLORS.border, fill = COLORS.panel, glow = 5) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.shadowColor = accent;
  ctx.shadowBlur = glow;
  roundedRect(ctx, x, y, width, height, 14);
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

function techniqueById(id) {
  return COMBAT_TECHNIQUES.find((item) => item.id === id) || null;
}

function relevantExpandedRun(game) {
  return !game.isDailyRun && !game.protocolRun && !game.endlessRun && !game.bossRushRun;
}

function missionFor(game) {
  return normalizeMission(game.activeMission || game.selectedMission || { modeId: 'region', regionId: 'neon', difficultyId: 'hunter' });
}

function techniqueState(game, id) {
  if (!game.v12Techniques) game.v12Techniques = {};
  if (!game.v12Techniques[id]) game.v12Techniques[id] = { cooldown: 0, uses: 0 };
  return game.v12Techniques[id];
}

function techniqueReady(game, id) {
  return game.state === 'playing' && techniqueState(game, id).cooldown <= 0;
}

function chargeOverdriveFromTechnique(game) {
  if (game.v12TechniqueTier < 3 || game.overdriveActive > 0) return;
  game.overdriveCharge = Math.min(100, (game.overdriveCharge || 0) + 14);
}

function triggerTechniqueFeedback(game, technique) {
  game.v12TechniqueNotice = { technique, time: 1.1 };
  game.audio.play('upgrade');
  chargeOverdriveFromTechnique(game);
}

function useKineticPulse(game) {
  const technique = techniqueById('kinetic-pulse');
  const state = techniqueState(game, technique.id);
  if (!techniqueReady(game, technique.id)) return false;
  const tier = game.v12TechniqueTier || 1;
  const radius = 155 + tier * 24;
  const damage = 0.55 + tier * 0.28;
  state.cooldown = techniqueCooldown(technique.id, tier);
  state.uses += 1;
  game.createRing(game.player.x, game.player.y, technique.color, radius);
  game.createBurst(game.player.x, game.player.y, technique.color, 28 + tier * 5, 320);
  game.shake = Math.max(game.shake, 9);

  for (const enemy of [...game.enemies]) {
    const dx = enemy.x - game.player.x;
    const dy = enemy.y - game.player.y;
    const distance = Math.hypot(dx, dy);
    if (distance > radius) continue;
    const direction = normalize(dx, dy);
    game.damageEnemy(enemy, damage, direction.x * 900, direction.y * 900, false);
    if (game.enemies.includes(enemy)) {
      enemy.knockbackX = (enemy.knockbackX || 0) + direction.x * (280 + tier * 60);
      enemy.knockbackY = (enemy.knockbackY || 0) + direction.y * (280 + tier * 60);
    }
  }

  let destroyedShots = 0;
  game.enemyShots = game.enemyShots.filter((shot) => {
    if (Math.hypot(shot.x - game.player.x, shot.y - game.player.y) > radius) return true;
    destroyedShots += 1;
    game.createBurst(shot.x, shot.y, technique.color, 6, 130);
    return false;
  });
  if (destroyedShots) game.addFloatingText(game.player.x, game.player.y - 55, `صد ${destroyedShots}`, technique.color);
  if (game.boss && Math.hypot(game.boss.x - game.player.x, game.boss.y - game.player.y) <= radius) game.damageBoss(0.45 + tier * 0.2, true);
  if (tier >= 2) game.player.shield = Math.max(game.player.shield || 0, 1);
  triggerTechniqueFeedback(game, technique);
  return true;
}

function usePhaseShift(game) {
  const technique = techniqueById('phase-shift');
  const state = techniqueState(game, technique.id);
  if (!techniqueReady(game, technique.id)) return false;
  const tier = game.v12TechniqueTier || 1;
  state.cooldown = techniqueCooldown(technique.id, tier);
  state.uses += 1;
  const origin = { x: game.player.x, y: game.player.y };

  if (!game.bullet.held) {
    const destination = {
      x: clamp(game.bullet.x, 34, WIDTH - 34),
      y: clamp(game.bullet.y, 34, HEIGHT - 34),
    };
    game.player.x = destination.x;
    game.player.y = destination.y;
    game.bullet.x = origin.x;
    game.bullet.y = origin.y;
    game.bullet.recalling = false;
    game.bullet.recoverDelay = Math.max(game.bullet.recoverDelay || 0, 0.24);
    game.bullet.hitEnemyIds?.clear?.();
    game.createRing(origin.x, origin.y, technique.color, 76);
    game.createRing(destination.x, destination.y, technique.color, 110);
  } else {
    const direction = normalize(game.pointer.x - game.player.x, game.pointer.y - game.player.y);
    const distance = 135 + tier * 25;
    game.player.x = clamp(game.player.x + direction.x * distance, 34, WIDTH - 34);
    game.player.y = clamp(game.player.y + direction.y * distance, 34, HEIGHT - 34);
    game.resolveEntityObstacles?.(game.player);
    game.createRing(origin.x, origin.y, technique.color, 62);
    game.createRing(game.player.x, game.player.y, technique.color, 92);
  }

  game.player.invulnerability = Math.max(game.player.invulnerability || 0, 0.28 + tier * 0.08);
  if (tier >= 2) game.player.shield = Math.max(game.player.shield || 0, 1);
  game.createBurst(game.player.x, game.player.y, technique.color, 26, 280);
  game.shake = Math.max(game.shake, 7);
  triggerTechniqueFeedback(game, technique);
  return true;
}

function useTechnique(game, id) {
  if (id === 'kinetic-pulse') return useKineticPulse(game);
  if (id === 'phase-shift') return usePhaseShift(game);
  return false;
}

function assignEvolutions(game) {
  if (!relevantExpandedRun(game)) return;
  for (const enemy of game.enemies) {
    if (enemy.v12Evolution) continue;
    const evolution = evolutionForEnemy({
      wave: expandedLocalWave(missionFor(game), game.wave),
      enemyId: enemy.id,
      elite: enemy.elite,
      mini: enemy.mini,
    });
    if (!evolution) continue;
    enemy.v12Evolution = evolution.id;
    enemy.v12EvolutionTimer = 1.8 + (enemy.id % 5) * 0.4;
    enemy.v12ShellIntact = evolution.id === 'armored-shell';
  }
}

function addWaveReinforcements(game, regionId, localWave) {
  if (localWave <= 5) return;
  const desired = expandedComposition(regionId, localWave);
  const count = Math.min(3, localWave - 5);
  for (let index = 0; index < count; index += 1) {
    const type = desired[Math.max(0, desired.length - 1 - index)] || 'scout';
    game.spawnEnemy(type, { elite: localWave === 8 && index === 0 });
  }
}

function applyTechniqueTier(game, localWave) {
  const nextTier = techniqueTierForWave(localWave);
  if (nextTier <= (game.v12TechniqueTier || 1)) return;
  game.v12TechniqueTier = nextTier;
  const tier = TECHNIQUE_TIERS.find((item) => item.tier === nextTier);
  game.v12PendingTierNotice = { tier, delay: 1.8 };
}

function updateEnemyEvolutions(game, dt) {
  for (const enemy of game.enemies) {
    const evolution = evolutionById(enemy.v12Evolution);
    if (!evolution) continue;
    if (evolution.id === 'blink-drive') {
      enemy.v12EvolutionTimer = Math.max(0, (enemy.v12EvolutionTimer || 0) - dt);
      if (enemy.v12EvolutionTimer <= 0 && enemy.spawnTime <= 0) {
        const angle = (enemy.id * 2.17 + game.elapsed) % (Math.PI * 2);
        const radius = 190 + (enemy.id % 4) * 35;
        game.createRing(enemy.x, enemy.y, evolution.color, 55);
        enemy.x = clamp(game.player.x + Math.cos(angle) * radius, enemy.radius + 12, WIDTH - enemy.radius - 12);
        enemy.y = clamp(game.player.y + Math.sin(angle) * radius, enemy.radius + 12, HEIGHT - enemy.radius - 12);
        game.resolveEntityObstacles?.(enemy);
        game.createRing(enemy.x, enemy.y, evolution.color, 70);
        enemy.v12EvolutionTimer = 3.4 + (enemy.id % 3) * 0.5;
      }
    }
    if (evolution.id === 'rage-engine' && !enemy.v12RageActive && enemy.hp <= enemy.maxHp * 0.5) {
      enemy.v12RageActive = true;
      enemy.speed *= 1.34;
      game.createBurst(enemy.x, enemy.y, evolution.color, 18, 250);
      game.addFloatingText(enemy.x, enemy.y - enemy.radius - 18, 'هائج', evolution.color);
    }
  }
}

function volatileExplosion(game, source) {
  const evolution = evolutionById('volatile-core');
  const radius = 112;
  game.createRing(source.x, source.y, evolution.color, radius);
  game.createBurst(source.x, source.y, evolution.color, 34, 370);
  game.shake = Math.max(game.shake, 11);
  for (const enemy of [...game.enemies]) {
    if (Math.hypot(enemy.x - source.x, enemy.y - source.y) > radius) continue;
    game.damageEnemy(enemy, 1.25, enemy.x - source.x, enemy.y - source.y, false);
  }
  if (Math.hypot(game.player.x - source.x, game.player.y - source.y) <= radius * 0.72) game.damagePlayer(source.x, source.y);
}

function updateMapMutator(game, dt) {
  const mutator = game.v12MapMutator;
  if (!mutator || game.state !== 'playing') return;
  const state = game.v12MapState;
  state.time += dt;
  state.damageCooldown = Math.max(0, state.damageCooldown - dt);
  state.pulseTimer = Math.max(0, state.pulseTimer - dt);
  const player = game.player;

  if (mutator.id === 'laser-sweep') {
    const x = 90 + (WIDTH - 180) * ((Math.sin(state.time * 0.72) + 1) / 2);
    state.primary = x;
    if (Math.abs(player.x - x) < 18 && state.damageCooldown <= 0) {
      game.damagePlayer(x, player.y);
      state.damageCooldown = 0.72;
    }
  } else if (mutator.id === 'pulse-gates') {
    if (state.pulseTimer <= 0) {
      state.pulseTimer = 2.8;
      for (const entity of [player, ...game.enemies]) {
        const direction = normalize(WIDTH / 2 - entity.x, HEIGHT / 2 - entity.y);
        entity.x += direction.x * 42;
        entity.y += direction.y * 42;
      }
      game.createRing(110, HEIGHT / 2, mutator.color, 150);
      game.createRing(WIDTH - 110, HEIGHT / 2, mutator.color, 150);
    }
  } else if (mutator.id === 'heat-cycle') {
    const activeLeft = Math.sin(state.time * 1.45) >= 0;
    state.primary = activeLeft ? 270 : WIDTH - 270;
    if (Math.hypot(player.x - state.primary, player.y - HEIGHT / 2) < 118 && state.damageCooldown <= 0) {
      game.damagePlayer(state.primary, HEIGHT / 2);
      state.damageCooldown = 0.82;
    }
  } else if (mutator.id === 'piston-line') {
    const y = 115 + (HEIGHT - 230) * ((Math.sin(state.time * 0.9) + 1) / 2);
    state.primary = y;
    if (Math.abs(player.y - y) < 24) {
      const direction = player.x < WIDTH / 2 ? -1 : 1;
      player.x = clamp(player.x + direction * 105 * dt, 34, WIDTH - 34);
    }
    if (!game.bullet.held && Math.abs(game.bullet.y - y) < 22) game.bullet.vx += (game.bullet.x < WIDTH / 2 ? -1 : 1) * 420 * dt;
  } else if (mutator.id === 'gravity-tide') {
    const direction = normalize(WIDTH / 2 - player.x, HEIGHT / 2 - player.y);
    const polarity = Math.sin(state.time * 0.8) >= 0 ? 1 : -1;
    player.x = clamp(player.x + direction.x * polarity * 68 * dt, 30, WIDTH - 30);
    player.y = clamp(player.y + direction.y * polarity * 68 * dt, 30, HEIGHT - 30);
    if (!game.bullet.held) {
      const bulletDirection = normalize(WIDTH / 2 - game.bullet.x, HEIGHT / 2 - game.bullet.y);
      game.bullet.vx += bulletDirection.x * polarity * 155 * dt;
      game.bullet.vy += bulletDirection.y * polarity * 155 * dt;
    }
    state.primary = polarity;
  } else if (mutator.id === 'rift-storm') {
    if (state.pulseTimer <= 0) {
      state.pulseTimer = 3.15;
      state.riftAngle = (state.riftAngle + Math.PI * 0.57) % (Math.PI * 2);
      if (!game.bullet.held) {
        const speed = Math.hypot(game.bullet.vx, game.bullet.vy);
        const angle = Math.atan2(game.bullet.vy, game.bullet.vx) + (state.riftAngle > Math.PI ? -0.28 : 0.28);
        game.bullet.vx = Math.cos(angle) * speed * 1.05;
        game.bullet.vy = Math.sin(angle) * speed * 1.05;
        game.createRing(game.bullet.x, game.bullet.y, mutator.color, 95);
      }
    }
  }
}

function drawMapMutator(game) {
  const mutator = game.v12MapMutator;
  if (!mutator || !['playing', 'paused', 'bossIntro'].includes(game.state)) return;
  const ctx = game.ctx;
  const state = game.v12MapState;
  ctx.save();
  if (mutator.id === 'laser-sweep') {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = mutator.color;
    ctx.shadowColor = mutator.color;
    ctx.shadowBlur = 22;
    ctx.fillRect((state.primary || 0) - 8, 0, 16, HEIGHT);
  } else if (mutator.id === 'pulse-gates') {
    ctx.globalAlpha = 0.34 + Math.sin(state.time * 5) * 0.08;
    ctx.strokeStyle = mutator.color;
    ctx.lineWidth = 5;
    for (const x of [110, WIDTH - 110]) {
      ctx.beginPath();
      ctx.arc(x, HEIGHT / 2, 52, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (mutator.id === 'heat-cycle') {
    ctx.globalAlpha = 0.2 + Math.abs(Math.sin(state.time * 1.45)) * 0.16;
    ctx.fillStyle = mutator.color;
    ctx.beginPath();
    ctx.arc(state.primary || 270, HEIGHT / 2, 118, 0, Math.PI * 2);
    ctx.fill();
  } else if (mutator.id === 'piston-line') {
    ctx.globalAlpha = 0.36;
    ctx.fillStyle = mutator.color;
    ctx.fillRect(0, (state.primary || HEIGHT / 2) - 12, WIDTH, 24);
  } else if (mutator.id === 'gravity-tide') {
    const radius = 150 + Math.sin(state.time * 2.2) * 24;
    ctx.globalAlpha = 0.38;
    ctx.strokeStyle = mutator.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(WIDTH / 2, HEIGHT / 2, radius, 0, Math.PI * 2);
    ctx.stroke();
  } else if (mutator.id === 'rift-storm') {
    ctx.globalAlpha = 0.32;
    ctx.strokeStyle = mutator.color;
    ctx.lineWidth = 4;
    for (let index = 0; index < 3; index += 1) {
      const angle = state.riftAngle + index * Math.PI * 0.66;
      const x = WIDTH / 2 + Math.cos(angle) * 260;
      const y = HEIGHT / 2 + Math.sin(angle) * 190;
      ctx.beginPath();
      ctx.arc(x, y, 28 + Math.sin(state.time * 4 + index) * 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawEvolutionMarkers(game) {
  const ctx = game.ctx;
  for (const enemy of game.enemies) {
    const evolution = evolutionById(enemy.v12Evolution);
    if (!evolution) continue;
    ctx.save();
    ctx.strokeStyle = evolution.color;
    ctx.fillStyle = evolution.color;
    ctx.lineWidth = enemy.v12ShellIntact ? 4 : 2;
    ctx.globalAlpha = enemy.v12ShellIntact ? 0.9 : 0.62;
    ctx.setLineDash(evolution.id === 'blink-drive' ? [5, 6] : []);
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius + 14 + Math.sin(game.elapsed * 5 + enemy.id) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, evolution.icon, enemy.x, enemy.y - enemy.radius - 18, 13, evolution.color, 900);
    ctx.restore();
  }
}

function drawTechniqueHud(game) {
  if (!['playing', 'paused', 'bossIntro'].includes(game.state)) return;
  const ctx = game.ctx;
  const mobile = Boolean(game.touchMode);
  if (!mobile) {
    COMBAT_TECHNIQUES.forEach((technique, index) => {
      const state = techniqueState(game, technique.id);
      const ready = state.cooldown <= 0;
      const x = 22 + index * 188;
      const y = HEIGHT - 58;
      panel(ctx, x, y, 172, 38, ready ? technique.color : COLORS.border, COLORS.panel, ready ? 5 : 1);
      label(ctx, ready ? `${technique.key} • ${technique.shortName}` : `${technique.shortName} ${state.cooldown.toFixed(1)}ث`, x + 86, y + 25, 12, ready ? technique.color : COLORS.muted, 800);
    });
  } else {
    const settings = game.mobileSettings || { leftHanded: false, controlScale: 1, opacity: 0.64 };
    const layout = mobileTechniqueLayout({ leftHanded: settings.leftHanded, scale: settings.controlScale });
    const entries = [
      [COMBAT_TECHNIQUES[0], layout.pulse],
      [COMBAT_TECHNIQUES[1], layout.phase],
    ];
    for (const [technique, control] of entries) {
      const state = techniqueState(game, technique.id);
      const ready = state.cooldown <= 0;
      ctx.save();
      ctx.globalAlpha = ready ? settings.opacity : settings.opacity * 0.48;
      ctx.fillStyle = 'rgba(5, 9, 22, 0.72)';
      ctx.strokeStyle = ready ? technique.color : COLORS.muted;
      ctx.lineWidth = 4;
      ctx.shadowColor = ready ? technique.color : 'transparent';
      ctx.shadowBlur = ready ? 12 : 0;
      ctx.beginPath();
      ctx.arc(control.x, control.y, control.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 1;
      label(ctx, ready ? technique.shortName : Math.ceil(state.cooldown), control.x, control.y + 5, 11, ready ? technique.color : COLORS.muted, 900);
      ctx.restore();
    }
  }

  if (game.v12TechniqueNotice?.time > 0) {
    const technique = game.v12TechniqueNotice.technique;
    panel(ctx, WIDTH / 2 - 190, 118, 380, 48, technique.color, COLORS.panelStrong, 10);
    label(ctx, `${technique.icon} ${technique.name}`, WIDTH / 2, 149, 15, technique.color, 900);
  }
}

function redrawExpandedMissionCounts(game) {
  if (game.state !== 'missionSelect') return;
  const ctx = game.ctx;
  panel(ctx, 650, 104, 300, 46, COLORS.yellow, 'rgba(32, 42, 66, 0.98)', 4);
  label(ctx, 'مهمة منطقة — 8 موجات', 800, 133, 14, COLORS.yellow, 900);
  panel(ctx, 320, 104, 300, 46, COLORS.yellow, 'rgba(32, 42, 66, 0.98)', 4);
  label(ctx, 'المسار القصصي — 24 موجة', 470, 133, 14, COLORS.yellow, 900);
  const mission = normalizeMission(game.missionDraft || game.selectedMission);
  const target = expandedTargetWaves(mission, false);
  panel(ctx, 690, 606, 365, 44, COLORS.cyan, 'rgba(8, 13, 29, 0.96)', 3);
  label(ctx, `${target} موجة • تقنيات نشطة • موجات اقتحام`, 872, 634, 12, COLORS.cyan, 800);
}

function redrawExpandedWaveCounter(game) {
  if (!game.touchMode || !['playing', 'paused', 'bossIntro'].includes(game.state)) return;
  const region = regionById(game.arena?.regionId || missionFor(game).regionId);
  panel(game.ctx, WIDTH - 266, 14, 250, 62, region.color, COLORS.panel, 4);
  label(game.ctx, `${region.icon} ${region.shortName} • توسعة القتال`, WIDTH - 34, 38, 11, region.color, 800, 'right');
  label(game.ctx, `${game.wave} / ${game.runTargetWaves || 8}`, WIDTH - 226, 64, 17, COLORS.cyan, 900, 'left');
  label(game.ctx, `${game.score || 0}`, WIDTH - 34, 63, 12, COLORS.muted, 700, 'right');
  for (let index = 0; index < game.player.maxHealth; index += 1) {
    game.ctx.fillStyle = index < game.player.health ? COLORS.red : '#252b43';
    game.ctx.beginPath();
    game.ctx.arc(WIDTH - 232 + index * 23, 37, 6, 0, Math.PI * 2);
    game.ctx.fill();
  }
}

export function installV12Expansion(GameClass) {
  const prototype = GameClass.prototype;
  if (prototype.__v12ExpansionInstalled) return;
  prototype.__v12ExpansionInstalled = true;

  const previousResetRun = prototype.resetRun;
  prototype.resetRun = function resetV12Expansion(...args) {
    const result = previousResetRun.apply(this, args);
    this.v12TechniqueTier = 1;
    this.v12Techniques = {
      'kinetic-pulse': { cooldown: 0, uses: 0 },
      'phase-shift': { cooldown: 0, uses: 0 },
    };
    this.v12TechniqueNotice = null;
    this.v12PendingTierNotice = null;
    this.v12MapMutator = null;
    this.v12MapState = { time: 0, damageCooldown: 0, pulseTimer: 1.5, primary: 0, riftAngle: 0 };
    const mission = missionFor(this);
    this.runTargetWaves = expandedTargetWaves(mission, Boolean(this.nextRunDaily));
    return result;
  };

  const previousStartRun = prototype.startRun;
  prototype.startRun = function startExpandedRun(...args) {
    const dailyRequested = Boolean(this.nextRunDaily);
    const mission = normalizeMission(this.selectedMission || this.activeMission);
    this.v12RequestedTarget = expandedTargetWaves(mission, dailyRequested);
    const result = previousStartRun.apply(this, args);
    this.runTargetWaves = expandedTargetWaves(missionFor(this), Boolean(this.isDailyRun || dailyRequested));
    this.v12RequestedTarget = null;
    return result;
  };

  const previousSpawnNextWave = prototype.spawnNextWave;
  prototype.spawnNextWave = function spawnExpandedWave(...args) {
    const originalMission = missionFor(this);
    const nextWave = (this.wave || 0) + 1;
    const target = expandedTargetWaves(originalMission, Boolean(this.isDailyRun));
    this.runTargetWaves = target;
    let temporaryMission = null;
    if (relevantExpandedRun(this) && originalMission.modeId === 'story') {
      temporaryMission = this.activeMission;
      this.activeMission = {
        ...originalMission,
        modeId: 'region',
        regionId: expandedRegionIdForWave(originalMission, nextWave),
      };
    }
    const result = previousSpawnNextWave.apply(this, args);
    if (temporaryMission) this.activeMission = temporaryMission;
    if (!relevantExpandedRun(this)) return result;

    const regionId = expandedRegionIdForWave(originalMission, this.wave);
    const localWave = expandedLocalWave(originalMission, this.wave);
    this.runTargetWaves = target;
    this.arena = createRegionArenaState(regionId, localWave);
    addWaveReinforcements(this, regionId, localWave);
    assignEvolutions(this);
    this.v12MapMutator = mapMutatorForWave(regionId, localWave);
    this.v12MapState = { time: 0, damageCooldown: 0, pulseTimer: 1.35, primary: 0, riftAngle: 0 };
    applyTechniqueTier(this, localWave);
    const region = regionById(regionId);
    this.banner = {
      title: `الموجة ${this.wave} / ${target}`,
      subtitle: `${region.name} — ${this.v12MapMutator?.name || this.arena.name}`,
      time: 1.45,
    };
    return result;
  };

  const previousDamageEnemy = prototype.damageEnemy;
  prototype.damageEnemy = function damageEvolvedEnemy(enemy, damage, forceX, forceY, fromBullet) {
    if (enemy?.v12Evolution === 'armored-shell' && enemy.v12ShellIntact && fromBullet) {
      enemy.v12ShellIntact = false;
      const evolution = evolutionById('armored-shell');
      this.createRing(enemy.x, enemy.y, evolution.color, enemy.radius + 26);
      this.createBurst(enemy.x, enemy.y, evolution.color, 16, 230);
      this.addFloatingText(enemy.x, enemy.y - enemy.radius - 15, 'انكسر الغلاف', evolution.color);
      this.audio.play('ricochet');
      return undefined;
    }
    return previousDamageEnemy.call(this, enemy, damage, forceX, forceY, fromBullet);
  };

  const previousKillEnemy = prototype.killEnemy;
  prototype.killEnemy = function killEvolvedEnemy(enemy) {
    const volatile = enemy?.v12Evolution === 'volatile-core';
    const source = volatile ? { x: enemy.x, y: enemy.y } : null;
    const existed = this.enemies.includes(enemy);
    const result = previousKillEnemy.call(this, enemy);
    if (volatile && existed && !this.enemies.includes(enemy)) volatileExplosion(this, source);
    return result;
  };

  const previousUpdateEnemies = prototype.updateEnemies;
  prototype.updateEnemies = function updateEvolvedEnemies(dt) {
    const result = previousUpdateEnemies.call(this, dt);
    updateEnemyEvolutions(this, dt);
    return result;
  };

  const previousUpdate = prototype.update;
  prototype.update = function updateV12Expansion(dt) {
    const result = previousUpdate.call(this, dt);
    for (const technique of COMBAT_TECHNIQUES) {
      const state = techniqueState(this, technique.id);
      state.cooldown = Math.max(0, state.cooldown - dt);
    }
    if (this.v12TechniqueNotice) {
      this.v12TechniqueNotice.time -= dt;
      if (this.v12TechniqueNotice.time <= 0) this.v12TechniqueNotice = null;
    }
    if (this.v12PendingTierNotice) {
      this.v12PendingTierNotice.delay -= dt;
      if (this.v12PendingTierNotice.delay <= 0 && !this.banner) {
        const tier = this.v12PendingTierNotice.tier;
        this.banner = { title: tier.name, subtitle: tier.description, time: 1.8 };
        this.v12PendingTierNotice = null;
      }
    }
    updateMapMutator(this, dt);
    return result;
  };

  const previousDrawArena = prototype.drawArena;
  prototype.drawArena = function drawExpandedArena(...args) {
    const result = previousDrawArena.apply(this, args);
    drawMapMutator(this);
    return result;
  };

  const previousDrawEnemies = prototype.drawEnemies;
  prototype.drawEnemies = function drawExpandedEnemies(...args) {
    const result = previousDrawEnemies.apply(this, args);
    drawEvolutionMarkers(this);
    return result;
  };

  const previousDraw = prototype.draw;
  prototype.draw = function drawV12Expansion(...args) {
    const result = previousDraw.apply(this, args);
    redrawExpandedMissionCounts(this);
    redrawExpandedWaveCounter(this);
    drawTechniqueHud(this);
    return result;
  };

  prototype.useCombatTechnique = function useCombatTechnique(id) {
    return useTechnique(this, id);
  };
}

function pointInCircle(point, circle) {
  return Math.hypot(point.x - circle.x, point.y - circle.y) <= circle.radius;
}

function canvasPoint(game, event) {
  const rect = game.canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / Math.max(1, rect.width)) * WIDTH,
    y: ((event.clientY - rect.top) / Math.max(1, rect.height)) * HEIGHT,
  };
}

export function attachV12ExpansionControls(game) {
  window.addEventListener('keydown', (event) => {
    if (event.repeat || game.state !== 'playing') return;
    if (event.code === 'KeyR') {
      event.preventDefault();
      game.useCombatTechnique?.('kinetic-pulse');
    } else if (event.code === 'KeyC') {
      event.preventDefault();
      game.useCombatTechnique?.('phase-shift');
    }
  });

  game.canvas.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'touch' || game.state !== 'playing') return;
    const settings = game.mobileSettings || { leftHanded: false, controlScale: 1 };
    const layout = mobileTechniqueLayout({ leftHanded: settings.leftHanded, scale: settings.controlScale });
    const point = canvasPoint(game, event);
    let techniqueId = null;
    if (pointInCircle(point, layout.pulse)) techniqueId = 'kinetic-pulse';
    else if (pointInCircle(point, layout.phase)) techniqueId = 'phase-shift';
    if (!techniqueId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    game.audio.ensure();
    const used = game.useCombatTechnique?.(techniqueId);
    if (used && game.mobileSettings?.haptics && typeof navigator.vibrate === 'function') navigator.vibrate([14, 18, 14]);
  }, { capture: true, passive: false });
}
