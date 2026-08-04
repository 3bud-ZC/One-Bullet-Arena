import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from './content.js';
import {
  createObjectiveRoomState,
  objectiveIdForWave,
  objectiveRoomById,
} from './objective-rooms-data.js';
import { registerRuntimeSystem } from './runtime-kernel.js';

const FONT = 'Changa, "Segoe UI", Tahoma, sans-serif';
const COLORS = Object.freeze({
  panel: 'rgba(4, 9, 21, 0.94)',
  panelSoft: 'rgba(9, 16, 34, 0.9)',
  text: '#f8f9ff',
  muted: '#aeb7da',
  success: '#53f2a1',
  danger: '#ff526a',
  yellow: '#ffe66d',
});

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function roundedRect(ctx, x, y, width, height, radius = 12) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
  ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
  ctx.arcTo(x, y + height, x, y, safeRadius);
  ctx.arcTo(x, y, x + width, y, safeRadius);
  ctx.closePath();
}

function panel(ctx, x, y, width, height, accent, fill = COLORS.panel, radius = 12) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 6;
  roundedRect(ctx, x, y, width, height, radius);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();
  ctx.restore();
}

function label(ctx, text, x, y, size, color = COLORS.text, weight = 700, align = 'center') {
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillText(String(text), x, y);
  ctx.restore();
}

function objectiveState(game) {
  return game.objectiveRoom || null;
}

function regionIdFor(game) {
  return game.arena?.regionId || game.activeMission?.regionId || game.selectedMission?.regionId || 'neon';
}

function objectiveDisabled(game) {
  return Boolean(
    game.boss
    || game.state === 'bossIntro'
    || game.releaseTutorialActive
    || game.tutorialActive
    || game.gameMode === 'bossRush'
    || game.modeId === 'bossRush'
  );
}

function circleOverlap(left, right, padding = 0) {
  if (!left || !right) return false;
  const radius = (Number(left.radius) || 0) + (Number(right.radius) || 0) + padding;
  return (left.x - right.x) ** 2 + (left.y - right.y) ** 2 <= radius ** 2;
}

function safePoint(game, desired) {
  const candidates = [
    desired,
    { x: desired.x + 90, y: desired.y },
    { x: desired.x - 90, y: desired.y },
    { x: desired.x, y: desired.y + 80 },
    { x: desired.x, y: desired.y - 80 },
    { x: WIDTH / 2, y: HEIGHT / 2 },
  ];
  const obstacles = game.arena?.obstacles || [];
  for (const candidate of candidates) {
    const point = { x: clamp(candidate.x, 70, WIDTH - 70), y: clamp(candidate.y, 100, HEIGHT - 85) };
    const blocked = obstacles.some((obstacle) => (
      point.x >= obstacle.x - 45
      && point.x <= obstacle.x + obstacle.w + 45
      && point.y >= obstacle.y - 45
      && point.y <= obstacle.y + obstacle.h + 45
    ));
    if (!blocked) return point;
  }
  return { x: WIDTH / 2, y: HEIGHT / 2 };
}

function prepareGeometry(game, state) {
  if (state.relays) {
    state.relays = state.relays.map((relay) => ({ ...relay, ...safePoint(game, relay) }));
  }
  if (state.lock) Object.assign(state.lock, safePoint(game, state.lock));
  if (state.core) Object.assign(state.core, safePoint(game, state.core));
}

function feedback(game, text, color, x = game.player?.x || WIDTH / 2, y = (game.player?.y || HEIGHT / 2) - 42) {
  game.addFloatingText?.(x, y, text, color);
  game.createBurst?.(x, y, color, 12, 180);
}

function completeObjective(game, state) {
  if (!state || state.status === 'complete') return;
  state.status = 'complete';
  state.completedAt = Number(game.elapsed) || 0;
  state.notice = `اكتمل: ${state.definition.name}`;
  state.noticeTime = 2.5;
  const reward = Number(state.parameters.reward) || 0;
  game.score = Math.max(0, (Number(game.score) || 0) + reward);
  if (game.stats) game.stats.objectivesCompleted = (Number(game.stats.objectivesCompleted) || 0) + 1;
  game.audio?.play?.('upgrade');
  feedback(game, `هدف مكتمل +${reward}`, state.definition.color);
}

function setContact(state, id) {
  if (state.contactId === id) return false;
  state.contactId = id;
  return true;
}

function releaseContactWhenClear(game, state, targets) {
  if (!state.contactId) return;
  const active = targets.find((target) => target.id === state.contactId);
  if (!active || !circleOverlap(game.bullet, active, 2)) state.contactId = '';
}

function updateCircuitSequence(game, state) {
  const targets = state.relays || [];
  releaseContactWhenClear(game, state, targets);
  if (game.bullet?.held) return;
  for (const relay of targets) {
    if (!circleOverlap(game.bullet, relay, 3) || !setContact(state, relay.id)) continue;
    const expected = targets[state.progress];
    if (relay.id !== expected?.id) {
      state.notice = `المطلوب الآن: النقطة ${state.progress + 1}`;
      state.noticeTime = 1.3;
      feedback(game, 'ترتيب غير صحيح', COLORS.danger, relay.x, relay.y - 30);
      return;
    }
    relay.complete = true;
    state.progress += 1;
    game.score += 90;
    game.audio?.play?.('ricochet');
    feedback(game, `${state.progress} / ${state.target}`, state.definition.color, relay.x, relay.y - 30);
    if (state.progress >= state.target) completeObjective(game, state);
    return;
  }
}

function updateRicochetLock(game, state, dt) {
  const lock = state.lock;
  if (!lock) return;
  lock.phase += dt;
  lock.hitCooldown = Math.max(0, lock.hitCooldown - dt);
  const base = safePoint(game, { x: WIDTH / 2, y: HEIGHT / 2 });
  lock.x = clamp(base.x + Math.cos(lock.phase * 0.8) * 155, 100, WIDTH - 100);
  lock.y = clamp(base.y + Math.sin(lock.phase * 1.1) * 105, 125, HEIGHT - 100);
  if (game.bullet?.held || lock.hitCooldown > 0 || !circleOverlap(game.bullet, lock, 5)) return;
  lock.hitCooldown = 0.55;
  const bounces = Number(game.bullet?.bounceCount) || 0;
  const required = Number(state.parameters.requiredBounces) || 1;
  if (bounces < required) {
    state.notice = `الهدف يحتاج ${required} ارتداد قبل الإصابة`;
    state.noticeTime = 1.5;
    feedback(game, `${bounces} / ${required} ارتداد`, COLORS.danger, lock.x, lock.y - 42);
    return;
  }
  state.progress += 1;
  game.score += 140 + bounces * 35;
  feedback(game, 'تم فتح القفل', state.definition.color, lock.x, lock.y - 42);
  lock.phase += Math.PI * 0.73;
  if (state.progress >= state.target) completeObjective(game, state);
}

function spawnAssaultEnemy(game, state, type = 'scout') {
  if (typeof game.spawnEnemy !== 'function') return null;
  const point = game.findSpawnPoint?.() || { x: 80, y: 80 };
  const before = new Set((game.enemies || []).map((enemy) => enemy.id));
  game.spawnEnemy(type, { point, elite: state.parameters.localWave >= 7 && Math.random() > 0.72 });
  const enemy = (game.enemies || []).find((candidate) => !before.has(candidate.id));
  if (enemy) enemy.objectiveAssault = true;
  return enemy || null;
}

function maintainPressure(game, state, dt, minimumEnemies = 1) {
  if (state.status === 'complete') return;
  state.reinforcementTimer -= dt;
  if ((game.enemies?.length || 0) >= minimumEnemies || state.reinforcementTimer > 0) return;
  const type = state.parameters.localWave >= 5 && Math.random() > 0.55 ? 'brute' : 'scout';
  spawnAssaultEnemy(game, state, type);
  state.reinforcementTimer = state.parameters.reinforcementDelay;
}

function updateCoreDefense(game, state, dt) {
  const core = state.core;
  if (!core) return;
  core.hitCooldown = Math.max(0, core.hitCooldown - dt);
  state.remaining = Math.max(0, state.remaining - dt);
  state.progress = state.target - state.remaining;
  maintainPressure(game, state, dt, Math.max(2, state.parameters.assaultLimit - 1));

  for (const enemy of game.enemies || []) {
    const dx = core.x - enemy.x;
    const dy = core.y - enemy.y;
    const distance = Math.hypot(dx, dy) || 1;
    if (enemy.objectiveAssault || distance < 250) {
      const pressure = enemy.objectiveAssault ? 0.28 : 0.12;
      enemy.x += dx / distance * (Number(enemy.speed) || 80) * pressure * dt;
      enemy.y += dy / distance * (Number(enemy.speed) || 80) * pressure * dt;
    }
    if (core.hitCooldown <= 0 && distance <= core.radius + (Number(enemy.radius) || 18) + 8) {
      core.health -= 1;
      core.hitCooldown = 0.7;
      game.enemies = game.enemies.filter((candidate) => candidate.id !== enemy.id);
      game.audio?.play?.('damage');
      feedback(game, `سلامة النواة ${Math.max(0, core.health)} / ${core.maxHealth}`, COLORS.danger, core.x, core.y - 52);
      break;
    }
  }

  if (core.health <= 0) {
    state.failures += 1;
    core.health = Math.max(2, core.maxHealth - 1);
    state.remaining = Math.min(state.parameters.duration, state.remaining + 4);
    game.score = Math.max(0, (Number(game.score) || 0) - 250);
    state.notice = 'تضررت النواة — تمت إعادة الاستقرار مع عقوبة زمنية';
    state.noticeTime = 2.4;
  }
  if (state.remaining <= 0) completeObjective(game, state);
}

function chooseMarkedEnemy(game, state) {
  const candidates = (game.enemies || []).filter((enemy) => enemy.spawnTime <= 0.25);
  if (!candidates.length) {
    const spawned = spawnAssaultEnemy(game, state, state.parameters.localWave >= 5 ? 'brute' : 'scout');
    state.markedEnemyId = spawned?.id ?? null;
    return;
  }
  const index = (state.progress + state.wave + state.failures) % candidates.length;
  state.markedEnemyId = candidates[index].id;
}

function updateMarkedHunt(game, state, dt) {
  if (state.markedEnemyId && (game.enemies || []).some((enemy) => enemy.id === state.markedEnemyId)) return;
  state.reinforcementTimer -= dt;
  if (state.reinforcementTimer <= 0) {
    chooseMarkedEnemy(game, state);
    state.reinforcementTimer = 0.55;
  }
}

function updateBulletSeparation(game, state, dt) {
  const distance = game.bullet && game.player
    ? Math.hypot(game.bullet.x - game.player.x, game.bullet.y - game.player.y)
    : 0;
  if (!game.bullet?.held && distance >= state.minimumDistance) {
    state.progress = Math.min(state.target, state.progress + dt);
  } else {
    state.progress = Math.max(0, state.progress - dt * 0.42);
  }
  maintainPressure(game, state, dt, 1);
  if (state.progress >= state.target) completeObjective(game, state);
}

function updateObjective(game, state, dt) {
  if (!state || state.status !== 'active' || game.state !== 'playing') return;
  state.noticeTime = Math.max(0, state.noticeTime - dt);
  if (state.id === 'circuit-sequence') updateCircuitSequence(game, state);
  else if (state.id === 'ricochet-lock') updateRicochetLock(game, state, dt);
  else if (state.id === 'core-defense') updateCoreDefense(game, state, dt);
  else if (state.id === 'marked-hunt') updateMarkedHunt(game, state, dt);
  else if (state.id === 'bullet-separation') updateBulletSeparation(game, state, dt);
  if (!['core-defense', 'bullet-separation', 'marked-hunt'].includes(state.id)) maintainPressure(game, state, dt, 1);
}

function progressText(state) {
  if (state.status === 'complete') return 'مكتمل';
  if (state.id === 'core-defense') return `${Math.ceil(state.remaining)}ث • سلامة ${state.core.health}/${state.core.maxHealth}`;
  if (state.id === 'bullet-separation') return `${state.progress.toFixed(1)} / ${state.target.toFixed(1)}ث`;
  if (state.id === 'ricochet-lock') return `${state.progress} / ${state.target} • ${state.parameters.requiredBounces} ارتداد`;
  return `${Math.floor(state.progress)} / ${state.target}`;
}

function drawRelay(game, relay, state) {
  const ctx = game.ctx;
  const active = relay.order === state.progress;
  const color = relay.complete ? COLORS.success : active ? state.definition.color : '#566083';
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = relay.complete ? 'rgba(83,242,161,0.22)' : active ? `${state.definition.color}30` : 'rgba(15,22,43,0.76)';
  ctx.lineWidth = active ? 4 : 2;
  ctx.shadowColor = active ? color : 'transparent';
  ctx.shadowBlur = active ? 16 : 0;
  ctx.beginPath();
  ctx.arc(relay.x, relay.y, relay.radius + Math.sin(game.elapsed * 5 + relay.order) * 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  label(ctx, relay.complete ? '✓' : relay.order + 1, relay.x, relay.y + 6, 15, color, 900);
  ctx.restore();
}

function drawObjectiveWorld(game, state) {
  if (!state || state.status === 'complete' || !['playing', 'paused'].includes(game.state)) return;
  const ctx = game.ctx;
  if (state.id === 'circuit-sequence') {
    for (const relay of state.relays || []) drawRelay(game, relay, state);
  } else if (state.id === 'ricochet-lock' && state.lock) {
    const lock = state.lock;
    ctx.save();
    ctx.strokeStyle = state.definition.color;
    ctx.fillStyle = `${state.definition.color}24`;
    ctx.lineWidth = 4;
    ctx.shadowColor = state.definition.color;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(lock.x, lock.y, lock.radius + Math.sin(game.elapsed * 6) * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    label(ctx, `${state.parameters.requiredBounces}↗`, lock.x, lock.y + 6, 14, state.definition.color, 900);
    ctx.restore();
  } else if (state.id === 'core-defense' && state.core) {
    const core = state.core;
    const ratio = clamp(core.health / core.maxHealth, 0, 1);
    ctx.save();
    ctx.fillStyle = `${state.definition.color}28`;
    ctx.strokeStyle = ratio <= 0.34 ? COLORS.danger : state.definition.color;
    ctx.lineWidth = 5;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(core.x, core.y, core.radius + Math.sin(game.elapsed * 5) * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    label(ctx, 'نواة', core.x, core.y + 5, 12, COLORS.text, 900);
    ctx.restore();
  } else if (state.id === 'marked-hunt') {
    const enemy = (game.enemies || []).find((candidate) => candidate.id === state.markedEnemyId);
    if (enemy) {
      ctx.save();
      ctx.strokeStyle = state.definition.color;
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 5]);
      ctx.shadowColor = state.definition.color;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius + 17 + Math.sin(game.elapsed * 7) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  } else if (state.id === 'bullet-separation' && game.player) {
    ctx.save();
    ctx.strokeStyle = `${state.definition.color}88`;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.arc(game.player.x, game.player.y, state.minimumDistance, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}

function drawObjectiveHud(game, state) {
  if (!state || !['playing', 'paused'].includes(game.state)) return;
  const width = game.touchMode ? 284 : 330;
  const x = 12;
  const y = game.touchMode ? 72 : 82;
  const accent = state.status === 'complete' ? COLORS.success : state.definition.color;
  panel(game.ctx, x, y, width, 42, accent, state.status === 'complete' ? 'rgba(9,35,28,0.93)' : COLORS.panelSoft, 11);
  label(game.ctx, `${state.definition.icon} ${state.definition.shortName}`, x + width - 14, y + 18, 10.5, accent, 900, 'right');
  label(game.ctx, progressText(state), x + width - 14, y + 35, 9, COLORS.muted, 700, 'right');
  if (state.noticeTime > 0 && state.notice) {
    panel(game.ctx, WIDTH / 2 - 190, 118, 380, 38, accent, COLORS.panel, 12);
    label(game.ctx, state.notice, WIDTH / 2, 143, 10.5, accent, 800);
  }
}

function initializeObjective(game) {
  const objectiveId = objectiveIdForWave({
    wave: game.wave,
    boss: objectiveDisabled(game),
  });
  const state = createObjectiveRoomState({
    objectiveId,
    wave: game.wave,
    regionId: regionIdFor(game),
  });
  game.objectiveRoom = state;
  if (!state) return;
  prepareGeometry(game, state);
  if (state.id === 'marked-hunt') chooseMarkedEnemy(game, state);
  if (game.stats) game.stats.objectivesSeen = (Number(game.stats.objectivesSeen) || 0) + 1;
  if (game.banner) {
    game.banner.subtitle = `هدف خاص: ${state.definition.name} — ${state.definition.description}`;
    game.banner.time = Math.max(Number(game.banner.time) || 0, 2.8);
  }
}

function handleMarkedKill(game, state, enemy) {
  if (!state || state.status !== 'active' || state.id !== 'marked-hunt') return;
  if (enemy?.id !== state.markedEnemyId) {
    state.failures += 1;
    game.score = Math.max(0, (Number(game.score) || 0) - 40);
    state.notice = 'الهدف غير محدد — اتبع العلامة البرتقالية';
    state.noticeTime = 1.3;
    return;
  }
  state.progress += 1;
  state.markedEnemyId = null;
  game.score += 160;
  feedback(game, `${state.progress} / ${state.target}`, state.definition.color, enemy.x, enemy.y - 38);
  if (state.progress >= state.target) completeObjective(game, state);
  else chooseMarkedEnemy(game, state);
}

export function installObjectiveRooms(GameClass) {
  registerRuntimeSystem(GameClass, {
    id: 'objective-rooms',
    priority: 420,
    hooks: {
      afterRunReset: ({ game }) => {
        game.objectiveRoom = null;
        if (game.stats) {
          game.stats.objectivesSeen = 0;
          game.stats.objectivesCompleted = 0;
        }
      },
      afterWaveStart: ({ game }) => initializeObjective(game),
      beforeBossStart: ({ game }) => { game.objectiveRoom = null; },
      afterUpdate: ({ game, detail }) => updateObjective(game, objectiveState(game), Number(detail.dt) || 0),
      afterEnemyKilled: ({ game, detail }) => handleMarkedKill(game, objectiveState(game), detail.enemy),
      beforeWaveAdvance: ({ game }) => {
        const state = objectiveState(game);
        if (!state || state.status === 'complete') return true;
        state.notice = `أكمل هدف الغرفة أولًا: ${state.definition.name}`;
        state.noticeTime = 1.6;
        return false;
      },
      afterArenaRender: ({ game }) => drawObjectiveWorld(game, objectiveState(game)),
      afterRender: ({ game }) => drawObjectiveHud(game, objectiveState(game)),
      afterRunFinish: ({ game }) => {
        const state = objectiveState(game);
        if (state?.status === 'active') state.status = 'abandoned';
      },
    },
  });
}

export function objectiveRoomSummary(game) {
  const state = objectiveState(game);
  if (!state) return null;
  return {
    id: state.id,
    name: objectiveRoomById(state.id)?.name || state.id,
    status: state.status,
    progress: state.progress,
    target: state.target,
    failures: state.failures,
  };
}
