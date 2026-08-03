import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from './content.js';
import { normalizeMission, regionById } from './regions-data.js';
import { expandedLocalWave, expandedRegionIdForWave } from './v12-expansion-data.js';
import { createMapOverhaulProfile, movingWallRect } from './map-overhaul-data.js';

const FONT = 'Changa, "Segoe UI", Tahoma, sans-serif';
const REGION_COLORS = Object.freeze({ neon: '#62f3ff', forge: '#ff9f43', void: '#b983ff' });

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function circlesOverlap(a, b, padding = 0) {
  const radius = (a.radius || 0) + (b.radius || 0) + padding;
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 <= radius ** 2;
}

function circleRectOverlap(circle, rect) {
  const nearestX = clamp(circle.x, rect.x, rect.x + rect.w);
  const nearestY = clamp(circle.y, rect.y, rect.y + rect.h);
  return (circle.x - nearestX) ** 2 + (circle.y - nearestY) ** 2 <= (circle.radius || 0) ** 2;
}

function qualityCount(game, full, balanced, performance) {
  const quality = document.body?.dataset?.quality || game.mobileSettings?.quality || 'high';
  if (quality === 'performance') return performance;
  if (quality === 'balanced' || game.touchMode) return balanced;
  return full;
}

function mapContext(game) {
  const mission = normalizeMission(game.activeMission || game.selectedMission || {
    modeId: 'region', regionId: game.arena?.regionId || 'neon', difficultyId: 'hunter',
  });
  const wave = Math.max(1, Math.trunc(Number(game.wave) || 1));
  const regionId = game.arena?.regionId || expandedRegionIdForWave(mission, wave);
  const localWave = mission.modeId === 'story'
    ? expandedLocalWave(mission, wave)
    : ((wave - 1) % 8) + 1;
  return { mission, regionId, localWave };
}

function removeDynamicWalls(game) {
  if (!game.arena?.obstacles) return;
  game.arena.obstacles = game.arena.obstacles.filter((item) => !item.mapOverhaulDynamic);
}

function createState(game, regionId, localWave, bossMode = false) {
  const profile = createMapOverhaulProfile(regionId, localWave);
  removeDynamicWalls(game);
  const state = {
    profile,
    time: 0,
    transition: 0.9,
    bossMode,
    gateOpenTimer: 0,
    hazardSuppression: 0,
    relayBonusAwarded: false,
    relays: profile.relays.map((item) => ({ ...item, active: true, flash: 0 })),
    pads: profile.boostPads.map((item) => ({ ...item, cooldown: 0, pulse: 0 })),
    fields: profile.fields.map((item) => ({ ...item, cooldown: 0 })),
    wallRects: [],
    destroyedCover: 0,
  };
  game.mapOverhaulState = state;
  if (game.arena) {
    game.arena.mapOverhaul = { id: profile.id, stage: profile.stage, localWave: profile.localWave };
    game.arena.name = profile.name;
    game.arena.subtitle = profile.subtitle;
  }
  syncDynamicWalls(game);
  if (game.banner) {
    const region = regionById(regionId);
    game.banner.subtitle = `${region.name} — ${profile.name} • مستوى الساحة ${profile.stage}`;
  }
  return state;
}

function syncDynamicWalls(game) {
  const state = game.mapOverhaulState;
  if (!state || !game.arena?.obstacles) return;
  removeDynamicWalls(game);
  const open = state.gateOpenTimer > 0;
  state.wallRects = state.profile.movingWalls.map((definition) => {
    const rect = movingWallRect(definition, state.time * (state.bossMode ? 0.72 : 1), open);
    return {
      ...rect,
      id: definition.id,
      kind: 'solid',
      hitFlash: 0,
      mapOverhaulDynamic: true,
      mapOverhaulRegion: state.profile.regionId,
    };
  });
  game.arena.obstacles.push(...state.wallRects);
}

function entityInsideField(entity, field) {
  return Math.hypot(entity.x - field.x, entity.y - field.y) <= field.radius + (entity.radius || 0);
}

function prepareFieldEffects(game) {
  const state = game.mapOverhaulState;
  if (!state) return [];
  const restores = [];
  for (const field of state.fields) {
    if (field.type !== 'coolant') continue;
    for (const enemy of game.enemies || []) {
      if (!entityInsideField(enemy, field) || enemy._mapCoolantApplied) continue;
      enemy._mapCoolantApplied = true;
      const original = enemy.speed;
      enemy.speed *= 0.72;
      restores.push(() => {
        enemy.speed = Math.max(enemy.speed, original * 0.72) / 0.72;
        enemy._mapCoolantApplied = false;
      });
    }
  }
  return restores;
}

function updateFields(game, dt) {
  const state = game.mapOverhaulState;
  if (!state) return;
  for (const field of state.fields) {
    field.cooldown = Math.max(0, field.cooldown - dt);
    if (field.type === 'signal' && !game.bullet.held && entityInsideField(game.bullet, field)) {
      const speed = Math.hypot(game.bullet.vx, game.bullet.vy);
      if (speed > 80 && speed < 1380) {
        const angle = Math.atan2(game.bullet.vy, game.bullet.vx) + Math.sin(state.time * 2 + field.phase) * dt * 0.13;
        const next = Math.min(1380, speed * (1 + dt * 0.045));
        game.bullet.vx = Math.cos(angle) * next;
        game.bullet.vy = Math.sin(angle) * next;
      }
    } else if (field.type === 'phase-slow' && !game.bullet.held && entityInsideField(game.bullet, field)) {
      const factor = Math.max(0.78, 1 - dt * 0.42);
      game.bullet.vx *= factor;
      game.bullet.vy *= factor;
    } else if (field.type === 'phase-fast' && !game.bullet.held && entityInsideField(game.bullet, field)) {
      const speed = Math.hypot(game.bullet.vx, game.bullet.vy);
      if (speed < 1420) {
        game.bullet.vx *= 1 + dt * 0.34;
        game.bullet.vy *= 1 + dt * 0.34;
      }
    } else if (field.type === 'steam') {
      const active = Math.sin(state.time * 1.55 + field.phase) > 0.62;
      if (!active) continue;
      const pushEntity = (entity, scale = 1) => {
        if (!entityInsideField(entity, field)) return;
        const dx = entity.x - field.x;
        const dy = entity.y - field.y;
        const length = Math.hypot(dx, dy) || 1;
        entity.x = clamp(entity.x + dx / length * 58 * dt * scale, entity.radius || 20, WIDTH - (entity.radius || 20));
        entity.y = clamp(entity.y + dy / length * 58 * dt * scale, entity.radius || 20, HEIGHT - (entity.radius || 20));
      };
      pushEntity(game.player, 1);
      for (const enemy of game.enemies || []) pushEntity(enemy, 0.65);
      if (!game.bullet.held && entityInsideField(game.bullet, field)) {
        const dx = game.bullet.x - field.x;
        const dy = game.bullet.y - field.y;
        const length = Math.hypot(dx, dy) || 1;
        game.bullet.vx += dx / length * 180 * dt;
        game.bullet.vy += dy / length * 180 * dt;
      }
    }
  }
}

function updatePadsAndRelays(game, dt) {
  const state = game.mapOverhaulState;
  if (!state) return;
  state.gateOpenTimer = Math.max(0, state.gateOpenTimer - dt);
  state.hazardSuppression = Math.max(0, state.hazardSuppression - dt);
  state.transition = Math.max(0, state.transition - dt * 1.7);

  for (const pad of state.pads) {
    pad.cooldown = Math.max(0, pad.cooldown - dt);
    pad.pulse = Math.max(0, pad.pulse - dt);
    if (game.bullet.held || pad.cooldown > 0 || !circleRectOverlap(game.bullet, pad)) continue;
    const speed = Math.hypot(game.bullet.vx, game.bullet.vy);
    if (speed < 80) continue;
    const boosted = Math.min(1480, speed * (pad.boost + state.profile.stage * 0.012));
    const direction = { x: game.bullet.vx / speed, y: game.bullet.vy / speed };
    game.bullet.vx = direction.x * boosted;
    game.bullet.vy = direction.y * boosted;
    pad.cooldown = 0.82;
    pad.pulse = 0.34;
    game.createRing?.(game.bullet.x, game.bullet.y, REGION_COLORS[state.profile.regionId], 62);
    game.audio?.play('ricochet');
  }

  for (const relay of state.relays) {
    relay.flash = Math.max(0, relay.flash - dt);
    if (!relay.active || game.bullet.held || !circlesOverlap(game.bullet, relay, 3)) continue;
    relay.active = false;
    relay.flash = 0.45;
    state.hazardSuppression = Math.max(state.hazardSuppression, relay.suppression + state.profile.stage * 0.22);
    state.gateOpenTimer = Math.max(state.gateOpenTimer, 2.6 + state.profile.stage * 0.22);
    game.score += 125 + state.profile.stage * 25;
    game.createRing?.(relay.x, relay.y, REGION_COLORS[state.profile.regionId], 112);
    game.createBurst?.(relay.x, relay.y, REGION_COLORS[state.profile.regionId], 20, 220);
    game.addFloatingText?.(relay.x, relay.y - 32, 'تم تثبيت الخطر', '#f8f9ff');
    game.audio?.play('recover');
  }

  if (!state.relayBonusAwarded && state.relays.length > 0 && state.relays.every((relay) => !relay.active)) {
    state.relayBonusAwarded = true;
    game.score += 300 + state.profile.stage * 50;
    game.addFloatingText?.(WIDTH / 2, 128, 'سيطرة كاملة على الساحة', '#ffe66d');
    game.createRing?.(WIDTH / 2, HEIGHT / 2, '#ffe66d', 210);
  }
}

function drawNeonAmbient(game, state, count) {
  const ctx = game.ctx;
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = '#62f3ff';
  ctx.lineWidth = 2;
  for (let index = 0; index < count; index += 1) {
    const y = 150 + index * (420 / Math.max(1, count - 1));
    const offset = (state.time * (22 + index * 3) + index * 140) % (WIDTH + 220) - 110;
    ctx.beginPath();
    ctx.moveTo(offset - 90, y);
    ctx.lineTo(offset, y);
    ctx.lineTo(offset + 34, y - 34);
    ctx.lineTo(offset + 120, y - 34);
    ctx.stroke();
    ctx.fillStyle = '#ffe66d';
    ctx.fillRect(offset + 116, y - 38, 7, 7);
  }
  ctx.restore();
}

function drawForgeAmbient(game, state, count) {
  const ctx = game.ctx;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,159,67,0.16)';
  ctx.lineWidth = 2;
  for (let x = 100; x < WIDTH; x += 180) {
    ctx.strokeRect(x, 95, 130, HEIGHT - 190);
    for (let y = 125; y < HEIGHT - 90; y += 95) {
      ctx.fillStyle = 'rgba(255,209,102,0.22)';
      ctx.beginPath();
      ctx.arc(x + 12, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (let index = 0; index < count; index += 1) {
    const x = (index * 197 + state.time * (28 + index * 2)) % WIDTH;
    const y = HEIGHT - ((index * 83 + state.time * 60) % 260);
    ctx.fillStyle = `rgba(255,${120 + index * 5},55,0.35)`;
    ctx.fillRect(x, y, 3, 7);
  }
  ctx.restore();
}

function drawVoidAmbient(game, state, count) {
  const ctx = game.ctx;
  ctx.save();
  for (let index = 0; index < count; index += 1) {
    const angle = state.time * (0.08 + index * 0.006) + index * 2.17;
    const radius = 150 + (index * 47) % 430;
    const x = WIDTH / 2 + Math.cos(angle) * radius;
    const y = HEIGHT / 2 + Math.sin(angle * 1.17) * radius * 0.55;
    ctx.fillStyle = index % 3 === 0 ? 'rgba(255,141,225,0.32)' : 'rgba(185,131,255,0.24)';
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + index % 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = '#b983ff';
  ctx.lineWidth = 2;
  for (let ring = 0; ring < 3; ring += 1) {
    ctx.beginPath();
    ctx.ellipse(WIDTH / 2, HEIGHT / 2, 230 + ring * 95, 110 + ring * 52, state.time * 0.04 + ring, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPads(game, state) {
  const ctx = game.ctx;
  const color = REGION_COLORS[state.profile.regionId];
  for (const pad of state.pads) {
    ctx.save();
    ctx.globalAlpha = 0.38 + Math.sin(state.time * 5 + pad.x) * 0.08;
    ctx.fillStyle = `${color}22`;
    ctx.strokeStyle = color;
    ctx.lineWidth = pad.pulse > 0 ? 4 : 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = pad.pulse > 0 ? 24 : 10;
    ctx.fillRect(pad.x, pad.y, pad.w, pad.h);
    ctx.strokeRect(pad.x, pad.y, pad.w, pad.h);
    const direction = pad.angle === 0 ? 1 : -1;
    ctx.fillStyle = color;
    ctx.font = `900 22px ${FONT}`;
    ctx.textAlign = 'center';
    for (let x = pad.x + 28; x < pad.x + pad.w - 16; x += 42) ctx.fillText(direction > 0 ? '›' : '‹', x, pad.y + pad.h / 2 + 8);
    ctx.restore();
  }
}

function drawRelays(game, state) {
  const ctx = game.ctx;
  const color = REGION_COLORS[state.profile.regionId];
  for (const relay of state.relays) {
    ctx.save();
    ctx.translate(relay.x, relay.y);
    ctx.rotate(state.time * (relay.active ? 0.8 : 0.18));
    ctx.globalAlpha = relay.active ? 0.94 : 0.25;
    ctx.strokeStyle = relay.active ? color : '#66708e';
    ctx.lineWidth = relay.flash > 0 ? 6 : 3;
    ctx.shadowColor = color;
    ctx.shadowBlur = relay.active ? 18 : 0;
    ctx.beginPath();
    ctx.arc(0, 0, relay.radius + 8 + Math.sin(state.time * 4 + relay.x) * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([5, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, relay.radius + 17, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = relay.active ? color : '#3a415a';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawFields(game, state) {
  const ctx = game.ctx;
  for (const field of state.fields) {
    const activeSteam = field.type !== 'steam' || Math.sin(state.time * 1.55 + field.phase) > 0.62;
    const color = field.type === 'coolant'
      ? '#62d9ff'
      : field.type === 'steam'
        ? '#ffb55f'
        : field.type === 'phase-fast'
          ? '#ff8de1'
          : field.type === 'phase-slow'
            ? '#8e7dff'
            : '#62f3ff';
    ctx.save();
    ctx.globalAlpha = activeSteam ? 0.18 : 0.07;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = activeSteam ? 14 : 4;
    ctx.beginPath();
    ctx.arc(field.x, field.y, field.radius + Math.sin(state.time * 3 + field.phase) * 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha *= 2.2;
    ctx.stroke();
    ctx.restore();
  }
}

function drawWallHighlights(game, state) {
  const ctx = game.ctx;
  const color = REGION_COLORS[state.profile.regionId];
  for (const wall of state.wallRects) {
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = state.gateOpenTimer > 0 ? 18 : 8;
    ctx.strokeRect(wall.x + 4, wall.y + 4, wall.w - 8, wall.h - 8);
    ctx.fillStyle = color;
    const horizontal = wall.w >= wall.h;
    const centerX = wall.x + wall.w / 2;
    const centerY = wall.y + wall.h / 2;
    ctx.font = `900 17px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(horizontal ? '↔' : '↕', centerX, centerY + 6);
    ctx.restore();
  }
}

function drawMapStatus(game, state) {
  if (state.hazardSuppression <= 0) return;
  const ctx = game.ctx;
  const color = REGION_COLORS[state.profile.regionId];
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(5,8,18,0.88)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  const x = WIDTH / 2 - 122;
  const y = 106;
  const w = 244;
  const h = 34;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = `800 13px ${FONT}`;
  ctx.fillText(`الخطر متوقف ${state.hazardSuppression.toFixed(1)}ث`, WIDTH / 2, y + 23);
  ctx.restore();
}

function drawMapOverhaul(game) {
  const state = game.mapOverhaulState;
  if (!state || !game.arena?.regionId) return;
  const ambient = qualityCount(game, 18, 11, 5);
  if (state.profile.regionId === 'forge') drawForgeAmbient(game, state, ambient);
  else if (state.profile.regionId === 'void') drawVoidAmbient(game, state, ambient);
  else drawNeonAmbient(game, state, ambient);
  drawFields(game, state);
  drawPads(game, state);
  drawRelays(game, state);
  drawWallHighlights(game, state);
  drawMapStatus(game, state);

  const ctx = game.ctx;
  const color = REGION_COLORS[state.profile.regionId];
  ctx.save();
  const edge = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 250, WIDTH / 2, HEIGHT / 2, 760);
  edge.addColorStop(0, 'rgba(0,0,0,0)');
  edge.addColorStop(1, `${color}${state.profile.stage >= 4 ? '18' : '0d'}`);
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  if (state.transition > 0) {
    ctx.globalAlpha = state.transition * 0.22;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
  ctx.restore();
}

function installArenaProfile(game, bossMode = false) {
  if (!game.arena?.regionId) return;
  const context = mapContext(game);
  createState(game, context.regionId, bossMode ? 8 : context.localWave, bossMode);
}

export function installMapOverhaul(GameClass) {
  const prototype = GameClass.prototype;
  if (prototype.__mapOverhaulInstalled) return;
  prototype.__mapOverhaulInstalled = true;

  const previousResetRun = prototype.resetRun;
  prototype.resetRun = function resetMapOverhaul(...args) {
    const result = previousResetRun.apply(this, args);
    this.mapOverhaulState = null;
    return result;
  };

  const previousSpawnNextWave = prototype.spawnNextWave;
  prototype.spawnNextWave = function spawnOverhauledMap(...args) {
    const result = previousSpawnNextWave.apply(this, args);
    installArenaProfile(this, false);
    return result;
  };

  const previousStartBoss = prototype.startBoss;
  prototype.startBoss = function startBossOnOverhauledMap(...args) {
    const result = previousStartBoss.apply(this, args);
    installArenaProfile(this, true);
    return result;
  };

  const previousUpdate = prototype.update;
  prototype.update = function updateMapOverhaul(dt, ...args) {
    const state = this.mapOverhaulState;
    if (state) {
      state.time += dt;
      syncDynamicWalls(this);
    }
    const restorers = prepareFieldEffects(this);
    const storedMutator = this.v12MapMutator;
    if (state?.hazardSuppression > 0) this.v12MapMutator = null;
    const result = previousUpdate.call(this, dt, ...args);
    this.v12MapMutator = storedMutator;
    for (const restore of restorers) restore();
    if (this.state === 'playing' && this.mapOverhaulState) {
      updateFields(this, dt);
      updatePadsAndRelays(this, dt);
      syncDynamicWalls(this);
    }
    return result;
  };

  const previousObstacleRicochet = prototype.handleObstacleRicochet;
  prototype.handleObstacleRicochet = function handleMapCoverRicochet(previous, ...args) {
    const before = new Set((this.arena?.obstacles || []).filter((item) => item.kind === 'breakable').map((item) => item.id));
    const result = previousObstacleRicochet.call(this, previous, ...args);
    const after = new Set((this.arena?.obstacles || []).filter((item) => item.kind === 'breakable').map((item) => item.id));
    const destroyed = [...before].filter((id) => !after.has(id));
    if (destroyed.length && this.mapOverhaulState) {
      this.mapOverhaulState.destroyedCover += destroyed.length;
      this.mapOverhaulState.gateOpenTimer = Math.max(this.mapOverhaulState.gateOpenTimer, 1.4);
      this.addFloatingText?.(this.bullet.x, this.bullet.y - 24, 'فتح مسار جديد', REGION_COLORS[this.mapOverhaulState.profile.regionId]);
    }
    return result;
  };

  const previousDrawArena = prototype.drawArena;
  prototype.drawArena = function drawOverhauledArena(...args) {
    if (this.mapOverhaulState) syncDynamicWalls(this);
    const result = previousDrawArena.apply(this, args);
    drawMapOverhaul(this);
    return result;
  };
}
