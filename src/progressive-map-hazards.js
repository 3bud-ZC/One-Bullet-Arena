import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from './content.js';
import { normalizeMission, regionById } from './regions-data.js';
import {
  expandedLocalWave,
  expandedRegionIdForWave,
  mapMutatorForWave,
} from './v12-expansion-data.js';

const ACTIVE_INTENSITIES = Object.freeze([0.28, 0.4, 0.54, 0.68, 0.84, 1]);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalize(x, y) {
  const length = Math.hypot(x, y);
  return length > 0.0001 ? { x: x / length, y: y / length } : { x: 0, y: 0 };
}

function relevantExpandedRun(game) {
  return !game.isDailyRun && !game.protocolRun && !game.endlessRun && !game.bossRushRun;
}

function missionFor(game) {
  return normalizeMission(game.activeMission || game.selectedMission || {
    modeId: 'region',
    regionId: 'neon',
    difficultyId: 'hunter',
  });
}

export function progressiveHazardProfile(localWave = 1) {
  const wave = clamp(Math.trunc(Number(localWave) || 1), 1, 8);
  if (wave === 1) {
    return Object.freeze({
      wave,
      stage: 0,
      active: false,
      preview: false,
      intensity: 0,
      label: 'استطلاع آمن',
    });
  }
  if (wave === 2) {
    return Object.freeze({
      wave,
      stage: 0,
      active: false,
      preview: true,
      intensity: 0.12,
      label: 'تحذير مبكر',
    });
  }
  const stage = wave - 2;
  return Object.freeze({
    wave,
    stage,
    active: true,
    preview: false,
    intensity: ACTIVE_INTENSITIES[stage - 1],
    label: `مستوى خطر ${stage} / 6`,
  });
}

export function progressiveMutatorForWave(regionId, localWave = 1) {
  const profile = progressiveHazardProfile(localWave);
  if (profile.wave === 1) return null;
  if (profile.preview) return mapMutatorForWave(regionId, 3);
  return mapMutatorForWave(regionId, profile.wave);
}

function ensureState(game) {
  if (!game.v12MapState) {
    game.v12MapState = {
      time: 0,
      damageCooldown: 0,
      pulseTimer: 1.5,
      primary: 0,
      riftAngle: 0,
    };
  }
  return game.v12MapState;
}

function updateProgressiveHazard(game, dt) {
  const profile = game.v12HazardProfile;
  const mutator = game.v12MapMutator;
  if (!profile || !mutator || game.state !== 'playing') return;

  const state = ensureState(game);
  state.time += dt;
  state.damageCooldown = Math.max(0, state.damageCooldown - dt);
  state.pulseTimer = Math.max(0, state.pulseTimer - dt);
  if (!profile.active) return;

  const intensity = profile.intensity;
  const player = game.player;

  if (mutator.id === 'laser-sweep') {
    const speed = 0.18 + intensity * 0.68;
    const x = 90 + (WIDTH - 180) * ((Math.sin(state.time * speed) + 1) / 2);
    const dangerWidth = 8 + intensity * 13;
    state.primary = x;
    if (Math.abs(player.x - x) < dangerWidth && state.damageCooldown <= 0) {
      game.damagePlayer(x, player.y);
      state.damageCooldown = 1.25 - intensity * 0.5;
    }
  } else if (mutator.id === 'pulse-gates') {
    if (state.pulseTimer <= 0) {
      state.pulseTimer = 4.2 - intensity * 1.7;
      const push = 20 + intensity * 38;
      for (const entity of [player, ...game.enemies]) {
        const direction = normalize(WIDTH / 2 - entity.x, HEIGHT / 2 - entity.y);
        entity.x = clamp(entity.x + direction.x * push, entity.radius || 24, WIDTH - (entity.radius || 24));
        entity.y = clamp(entity.y + direction.y * push, entity.radius || 24, HEIGHT - (entity.radius || 24));
      }
      game.createRing(110, HEIGHT / 2, mutator.color, 110 + intensity * 65);
      game.createRing(WIDTH - 110, HEIGHT / 2, mutator.color, 110 + intensity * 65);
    }
  } else if (mutator.id === 'heat-cycle') {
    const speed = 0.75 + intensity * 0.9;
    const activeLeft = Math.sin(state.time * speed) >= 0;
    const radius = 75 + intensity * 45;
    state.primary = activeLeft ? 270 : WIDTH - 270;
    state.secondary = radius;
    if (Math.hypot(player.x - state.primary, player.y - HEIGHT / 2) < radius && state.damageCooldown <= 0) {
      game.damagePlayer(state.primary, HEIGHT / 2);
      state.damageCooldown = 1.2 - intensity * 0.35;
    }
  } else if (mutator.id === 'piston-line') {
    const speed = 0.45 + intensity * 0.65;
    const y = 115 + (HEIGHT - 230) * ((Math.sin(state.time * speed) + 1) / 2);
    const dangerWidth = 12 + intensity * 15;
    const force = 55 + intensity * 85;
    state.primary = y;
    state.secondary = dangerWidth;
    if (Math.abs(player.y - y) < dangerWidth) {
      const direction = player.x < WIDTH / 2 ? -1 : 1;
      player.x = clamp(player.x + direction * force * dt, 34, WIDTH - 34);
    }
    if (!game.bullet.held && Math.abs(game.bullet.y - y) < dangerWidth) {
      game.bullet.vx += (game.bullet.x < WIDTH / 2 ? -1 : 1) * (220 + intensity * 300) * dt;
    }
  } else if (mutator.id === 'gravity-tide') {
    const direction = normalize(WIDTH / 2 - player.x, HEIGHT / 2 - player.y);
    const polarity = Math.sin(state.time * (0.5 + intensity * 0.45)) >= 0 ? 1 : -1;
    const playerForce = 28 + intensity * 60;
    player.x = clamp(player.x + direction.x * polarity * playerForce * dt, 30, WIDTH - 30);
    player.y = clamp(player.y + direction.y * polarity * playerForce * dt, 30, HEIGHT - 30);
    if (!game.bullet.held) {
      const bulletDirection = normalize(WIDTH / 2 - game.bullet.x, HEIGHT / 2 - game.bullet.y);
      const bulletForce = 70 + intensity * 135;
      game.bullet.vx += bulletDirection.x * polarity * bulletForce * dt;
      game.bullet.vy += bulletDirection.y * polarity * bulletForce * dt;
    }
    state.primary = polarity;
  } else if (mutator.id === 'rift-storm') {
    if (state.pulseTimer <= 0) {
      state.pulseTimer = 4.6 - intensity * 1.8;
      state.riftAngle = (state.riftAngle + Math.PI * (0.34 + intensity * 0.3)) % (Math.PI * 2);
      if (!game.bullet.held) {
        const speed = Math.hypot(game.bullet.vx, game.bullet.vy);
        const shift = 0.08 + intensity * 0.24;
        const angle = Math.atan2(game.bullet.vy, game.bullet.vx) + (state.riftAngle > Math.PI ? -shift : shift);
        const acceleration = 1.02 + intensity * 0.06;
        game.bullet.vx = Math.cos(angle) * speed * acceleration;
        game.bullet.vy = Math.sin(angle) * speed * acceleration;
        game.createRing(game.bullet.x, game.bullet.y, mutator.color, 70 + intensity * 35);
      }
    }
  }
}

function drawProgressiveHazard(game) {
  const profile = game.v12HazardProfile;
  const mutator = game.v12MapMutator;
  if (!profile || !mutator || !['playing', 'paused', 'bossIntro'].includes(game.state)) return;

  const ctx = game.ctx;
  const state = ensureState(game);
  const intensity = profile.intensity;
  const alphaScale = profile.preview ? 0.22 : 0.52 + intensity * 0.32;

  ctx.save();
  if (mutator.id === 'laser-sweep') {
    const x = profile.preview ? WIDTH / 2 : state.primary || WIDTH / 2;
    const width = profile.preview ? 4 : 7 + intensity * 11;
    ctx.globalAlpha = alphaScale;
    ctx.fillStyle = mutator.color;
    ctx.shadowColor = mutator.color;
    ctx.shadowBlur = profile.preview ? 8 : 12 + intensity * 18;
    ctx.fillRect(x - width / 2, 0, width, HEIGHT);
  } else if (mutator.id === 'pulse-gates') {
    ctx.globalAlpha = alphaScale * (0.72 + Math.sin(state.time * 5) * 0.1);
    ctx.strokeStyle = mutator.color;
    ctx.lineWidth = profile.preview ? 2 : 3 + intensity * 3;
    for (const x of [110, WIDTH - 110]) {
      ctx.beginPath();
      ctx.arc(x, HEIGHT / 2, 42 + intensity * 18, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (mutator.id === 'heat-cycle') {
    const radius = profile.preview ? 70 : state.secondary || 80;
    ctx.globalAlpha = alphaScale * 0.55;
    ctx.fillStyle = mutator.color;
    ctx.beginPath();
    ctx.arc(state.primary || 270, HEIGHT / 2, radius, 0, Math.PI * 2);
    ctx.fill();
  } else if (mutator.id === 'piston-line') {
    const width = profile.preview ? 8 : state.secondary || 14;
    ctx.globalAlpha = alphaScale * 0.7;
    ctx.fillStyle = mutator.color;
    ctx.fillRect(0, (state.primary || HEIGHT / 2) - width / 2, WIDTH, width);
  } else if (mutator.id === 'gravity-tide') {
    const radius = 125 + intensity * 45 + Math.sin(state.time * 2.2) * (10 + intensity * 15);
    ctx.globalAlpha = alphaScale * 0.72;
    ctx.strokeStyle = mutator.color;
    ctx.lineWidth = profile.preview ? 2 : 3 + intensity * 2;
    ctx.beginPath();
    ctx.arc(WIDTH / 2, HEIGHT / 2, radius, 0, Math.PI * 2);
    ctx.stroke();
  } else if (mutator.id === 'rift-storm') {
    ctx.globalAlpha = alphaScale * 0.7;
    ctx.strokeStyle = mutator.color;
    ctx.lineWidth = profile.preview ? 2 : 3 + intensity * 2;
    const count = profile.preview ? 1 : 2 + Math.ceil(intensity);
    for (let index = 0; index < count; index += 1) {
      const angle = state.riftAngle + index * Math.PI * 0.66;
      const x = WIDTH / 2 + Math.cos(angle) * 260;
      const y = HEIGHT / 2 + Math.sin(angle) * 190;
      ctx.beginPath();
      ctx.arc(x, y, 22 + intensity * 11 + Math.sin(state.time * 4 + index) * 5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function installProgressiveMapHazards(GameClass) {
  const prototype = GameClass.prototype;
  if (prototype.__progressiveMapHazardsInstalled) return;
  prototype.__progressiveMapHazardsInstalled = true;

  const previousResetRun = prototype.resetRun;
  prototype.resetRun = function resetProgressiveHazards(...args) {
    const result = previousResetRun.apply(this, args);
    this.v12HazardProfile = progressiveHazardProfile(1);
    return result;
  };

  const previousSpawnNextWave = prototype.spawnNextWave;
  prototype.spawnNextWave = function spawnProgressiveHazardWave(...args) {
    const result = previousSpawnNextWave.apply(this, args);
    if (!relevantExpandedRun(this)) return result;

    const mission = missionFor(this);
    const localWave = expandedLocalWave(mission, this.wave);
    const regionId = expandedRegionIdForWave(mission, this.wave);
    const profile = progressiveHazardProfile(localWave);
    const mutator = progressiveMutatorForWave(regionId, localWave);
    const region = regionById(regionId);

    this.v12HazardProfile = profile;
    this.v12MapMutator = mutator;
    this.v12MapState = {
      time: 0,
      damageCooldown: 0,
      pulseTimer: profile.active ? 1.6 : 99,
      primary: 0,
      secondary: 0,
      riftAngle: 0,
    };

    if (this.banner) {
      if (!mutator) this.banner.subtitle = `${region.name} — ${profile.label}`;
      else if (profile.preview) this.banner.subtitle = `${region.name} — ${profile.label}: ${mutator.name}`;
      else this.banner.subtitle = `${region.name} — ${mutator.name} • ${profile.label}`;
    }
    return result;
  };

  const previousUpdate = prototype.update;
  prototype.update = function updateProgressiveHazards(dt, ...args) {
    const mutator = this.v12MapMutator;
    this.v12MapMutator = null;
    const result = previousUpdate.call(this, dt, ...args);
    this.v12MapMutator = mutator;
    updateProgressiveHazard(this, dt);
    return result;
  };

  const previousDrawArena = prototype.drawArena;
  prototype.drawArena = function drawProgressiveHazardArena(...args) {
    const mutator = this.v12MapMutator;
    this.v12MapMutator = null;
    const result = previousDrawArena.apply(this, args);
    this.v12MapMutator = mutator;
    drawProgressiveHazard(this);
    return result;
  };
}
