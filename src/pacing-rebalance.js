import { normalizeMission } from './regions-data.js';
import { registerRuntimeSystem } from './runtime-kernel.js';
import {
  PACING_RELEASE,
  enemyThreat,
  objectivePacingTuning,
  recoveryForWave,
  wavePacingPlan,
} from './pacing-rebalance-data.js';

const SYSTEM_ID = 'difficulty-pacing-rebalance';
const DEFAULT_MISSION = Object.freeze({ modeId: 'region', regionId: 'neon', difficultyId: 'hunter' });

function missionFor(game) {
  return normalizeMission(game.activeMission || game.selectedMission || DEFAULT_MISSION);
}

function pacingEnabled(game) {
  return !game.isDailyRun
    && !game.protocolRun
    && !game.endlessRun
    && !game.bossRushRun
    && game.gameMode !== 'bossRush'
    && game.modeId !== 'bossRush';
}

function runtimeState(game) {
  return game.runtime.getState(SYSTEM_ID, () => ({
    wave: 0,
    waveElapsed: 0,
    plan: null,
    removedEnemies: 0,
    demotedElites: 0,
    clearedEvolutions: 0,
    recoveries: 0,
    emergencyReliefUsed: false,
    pendingEmergencyRelief: false,
    lastSoftReliefAt: 0,
    lastRecoveredWave: 0,
    lastObjectiveFailures: 0,
  }));
}

function clearEvolution(enemy) {
  if (!enemy?.v12Evolution) return false;
  if (enemy.v12RageActive) enemy.speed = Math.max(1, (Number(enemy.speed) || 1) / 1.34);
  enemy.v12Evolution = null;
  enemy.v12EvolutionTimer = 0;
  enemy.v12ShellIntact = false;
  enemy.v12RageActive = false;
  return true;
}

function demoteElite(enemy) {
  if (!enemy?.elite) return false;
  const maxHp = Math.max(0.5, Number(enemy.maxHp) || Number(enemy.hp) || 1);
  const ratio = Math.max(0.05, Math.min(1, (Number(enemy.hp) || maxHp) / maxHp));
  enemy.maxHp = Math.max(0.5, maxHp / 1.45);
  enemy.hp = Math.max(0.1, enemy.maxHp * ratio);
  enemy.speed = Math.max(1, (Number(enemy.speed) || 1) / 1.1);
  enemy.score = Math.max(1, Math.round((Number(enemy.score) || 1) / 1.45));
  enemy.elite = false;
  return true;
}

function capEliteAndEvolutionPressure(game, plan, state) {
  const enemies = Array.isArray(game.enemies) ? game.enemies : [];
  const elites = enemies.filter((enemy) => enemy.elite);
  for (const enemy of elites.slice(plan.eliteCap)) {
    if (demoteElite(enemy)) state.demotedElites += 1;
  }

  const evolved = enemies.filter((enemy) => enemy.v12Evolution);
  for (const enemy of evolved.slice(plan.evolutionCap)) {
    if (clearEvolution(enemy)) state.clearedEvolutions += 1;
  }
}

function trimEnemyBudget(game, plan, state) {
  const enemies = Array.isArray(game.enemies) ? game.enemies : [];
  if (!enemies.length) return;
  const minimumCount = Math.min(enemies.length, plan.localWave <= 2 ? 3 : 4);
  const keep = [];
  let usedBudget = 0;

  for (const enemy of enemies) {
    const threat = enemyThreat(enemy);
    const underCount = keep.length < plan.enemyCap;
    const underBudget = usedBudget + threat <= plan.budget + 0.001;
    if (underCount && (keep.length < minimumCount || underBudget)) {
      keep.push(enemy);
      usedBudget += threat;
    }
  }

  const keepIds = new Set(keep.map((enemy) => enemy.id));
  const before = enemies.length;
  game.enemies = enemies.filter((enemy) => keepIds.has(enemy.id));
  state.removedEnemies += Math.max(0, before - game.enemies.length);
}

function scaleEnemyCurve(game, plan) {
  for (const enemy of game.enemies || []) {
    if (enemy.pacingScaledWave === game.wave) continue;
    const oldMax = Math.max(0.1, Number(enemy.maxHp) || Number(enemy.hp) || 1);
    const ratio = Math.max(0.05, Math.min(1, (Number(enemy.hp) || oldMax) / oldMax));
    enemy.maxHp = Math.max(0.35, oldMax * plan.healthScale);
    enemy.hp = Math.max(0.1, enemy.maxHp * ratio);
    enemy.speed = Math.max(1, (Number(enemy.speed) || 1) * plan.speedScale);
    enemy.pacingScaledWave = game.wave;
  }
}

function applyObjectiveTuning(game, plan, state) {
  const objective = game.objectiveRoom;
  if (!objective?.id || objective.status !== 'active') return;
  const tuning = objectivePacingTuning({
    objectiveId: objective.id,
    wave: game.wave,
    difficultyId: plan.difficultyId,
  });
  objective.pacingTuning = tuning;
  objective.parameters = { ...objective.parameters, ...tuning };
  objective.reinforcementTimer = Math.max(Number(objective.reinforcementTimer) || 0, tuning.reinforcementDelay);

  if (objective.id === 'circuit-sequence' && Array.isArray(objective.relays)) {
    objective.relays = objective.relays.slice(0, tuning.relayCount);
    objective.target = objective.relays.length;
  } else if (objective.id === 'ricochet-lock') {
    objective.parameters.requiredBounces = tuning.requiredBounces;
    objective.parameters.requiredHits = tuning.requiredHits;
    objective.target = tuning.requiredHits;
  } else if (objective.id === 'core-defense' && objective.core) {
    objective.parameters.duration = tuning.duration;
    objective.parameters.coreHealth = tuning.coreHealth;
    objective.parameters.assaultLimit = tuning.assaultLimit;
    objective.target = tuning.duration;
    objective.remaining = tuning.duration;
    objective.progress = 0;
    objective.core.maxHealth = tuning.coreHealth;
    objective.core.health = tuning.coreHealth;
    state.lastObjectiveFailures = objective.failures || 0;
  } else if (objective.id === 'marked-hunt') {
    objective.parameters.targetKills = tuning.targetKills;
    objective.target = tuning.targetKills;
  } else if (objective.id === 'bullet-separation') {
    objective.parameters.duration = tuning.duration;
    objective.parameters.minimumDistance = tuning.minimumDistance;
    objective.minimumDistance = tuning.minimumDistance;
    objective.target = tuning.duration;
    objective.progress = 0;
  }
}

function beginWave(game) {
  const state = runtimeState(game);
  state.wave = game.wave;
  state.waveElapsed = 0;
  state.removedEnemies = 0;
  state.demotedElites = 0;
  state.clearedEvolutions = 0;
  state.emergencyReliefUsed = false;
  state.pendingEmergencyRelief = false;
  state.lastSoftReliefAt = 0;
  state.lastObjectiveFailures = 0;

  if (!pacingEnabled(game)) {
    state.plan = null;
    game.pacingPlan = null;
    return;
  }

  const mission = missionFor(game);
  const plan = wavePacingPlan({ wave: game.wave, difficultyId: mission.difficultyId });
  state.plan = plan;
  game.pacingPlan = plan;
  game.pacingHazardScale = plan.hazardScale;

  capEliteAndEvolutionPressure(game, plan, state);
  trimEnemyBudget(game, plan, state);
  scaleEnemyCurve(game, plan);
  applyObjectiveTuning(game, plan, state);

  if (plan.localWave <= 2 && game.v12MapMutator) {
    game.pacingSuppressedMapMutator = game.v12MapMutator;
    game.v12MapMutator = null;
  } else {
    game.pacingSuppressedMapMutator = null;
  }
}

function objectiveProgressRatio(objective) {
  if (!objective || objective.status !== 'active') return 1;
  if (objective.id === 'core-defense') return Math.max(0, Math.min(1, 1 - (Number(objective.remaining) || 0) / Math.max(0.1, Number(objective.target) || 1)));
  return Math.max(0, Math.min(1, (Number(objective.progress) || 0) / Math.max(0.1, Number(objective.target) || 1)));
}

function capObjectiveAssault(game, limit) {
  const assault = (game.enemies || []).filter((enemy) => enemy.objectiveAssault);
  if (assault.length <= limit) return;
  const excessIds = new Set(assault.slice(limit).map((enemy) => enemy.id));
  game.enemies = game.enemies.filter((enemy) => !excessIds.has(enemy.id));
}

function updateObjectiveRelief(game, state, dt) {
  const objective = game.objectiveRoom;
  if (!objective?.pacingTuning || objective.status !== 'active') return;
  const tuning = objective.pacingTuning;
  const ratio = objectiveProgressRatio(objective);
  if (ratio >= tuning.stopReinforcementsAt) {
    objective.reinforcementTimer = Math.max(Number(objective.reinforcementTimer) || 0, 6);
  }

  if (objective.id === 'core-defense') {
    capObjectiveAssault(game, Math.max(1, tuning.assaultLimit));
    if ((objective.failures || 0) > state.lastObjectiveFailures) {
      const hardcodedPenalty = 4;
      const compensation = Math.max(0, hardcodedPenalty - tuning.failurePenaltySeconds);
      objective.remaining = Math.max(0, objective.remaining - compensation);
      if (objective.core) objective.core.health = Math.max(2, tuning.coreHealth - 1);
      state.lastObjectiveFailures = objective.failures || 0;
    }
  }

  if (objective.id === 'bullet-separation') {
    const distance = game.bullet && game.player
      ? Math.hypot(game.bullet.x - game.player.x, game.bullet.y - game.player.y)
      : 0;
    if (game.bullet?.held || distance < objective.minimumDistance) {
      objective.progress = Math.min(objective.target, objective.progress + dt * tuning.decayCompensation);
    }
  }
}

function applyEmergencyRelief(game, state) {
  const plan = state.plan;
  if (!plan || plan.adaptiveRelief <= 0 || state.emergencyReliefUsed || !state.pendingEmergencyRelief) return;
  state.pendingEmergencyRelief = false;
  state.emergencyReliefUsed = true;

  const elite = [...(game.enemies || [])]
    .filter((enemy) => enemy.elite)
    .sort((left, right) => enemyThreat(right) - enemyThreat(left))[0];
  if (elite && demoteElite(elite)) state.demotedElites += 1;
  for (const enemy of game.enemies || []) enemy.speed = Math.max(1, (Number(enemy.speed) || 1) * (1 - 0.06 * plan.adaptiveRelief));
  if (missionFor(game).difficultyId !== 'one-hit') game.player.shield = Math.max(Number(game.player.shield) || 0, 1);
  if (game.objectiveRoom?.status === 'active') {
    game.objectiveRoom.reinforcementTimer = Math.max(Number(game.objectiveRoom.reinforcementTimer) || 0, 5.5);
  }
  game.addFloatingText?.(game.player.x, game.player.y - 55, 'دعم طارئ', '#53f2a1');
}

function applySoftCapRelief(game, state) {
  const plan = state.plan;
  if (!plan || state.waveElapsed < plan.softCapSeconds || state.waveElapsed - state.lastSoftReliefAt < 18) return;
  const target = [...(game.enemies || [])]
    .filter((enemy) => !enemy.objectiveTarget)
    .sort((left, right) => enemyThreat(right) - enemyThreat(left))[0];
  if (!target) return;
  state.lastSoftReliefAt = state.waveElapsed;
  if (target.elite) demoteElite(target);
  const oldMax = Math.max(0.1, Number(target.maxHp) || Number(target.hp) || 1);
  target.maxHp = Math.max(0.35, oldMax * 0.88);
  target.hp = Math.min(Number(target.hp) || target.maxHp, target.maxHp);
  target.speed = Math.max(1, (Number(target.speed) || 1) * 0.92);
  game.addFloatingText?.(target.x, target.y - 35, 'انخفض الضغط', '#62f3ff');
}

function updatePacing(game, dt) {
  const state = runtimeState(game);
  if (!state.plan || game.state !== 'playing') return;
  state.waveElapsed += dt;

  if (game.v12MapState && state.plan.hazardScale < 1) {
    game.v12MapState.time = Math.max(0, (Number(game.v12MapState.time) || 0) - dt * (1 - state.plan.hazardScale) * 0.55);
    game.v12MapState.pulseTimer = Math.max(Number(game.v12MapState.pulseTimer) || 0, dt * (1 - state.plan.hazardScale));
  }

  updateObjectiveRelief(game, state, dt);
  applyEmergencyRelief(game, state);
  applySoftCapRelief(game, state);
}

function grantWaveRecovery(context) {
  const { game } = context;
  const state = runtimeState(game);
  if (context.cancelled || !state.plan || state.lastRecoveredWave === game.wave || !game.player) return;
  const mission = missionFor(game);
  const recovery = recoveryForWave({
    wave: game.wave,
    difficultyId: mission.difficultyId,
    health: game.player.health,
    maxHealth: game.player.maxHealth,
  });
  state.lastRecoveredWave = game.wave;
  if (!recovery.heal && !recovery.shield) return;

  const beforeHealth = Number(game.player.health) || 0;
  game.player.health = Math.min(Number(game.player.maxHealth) || beforeHealth, beforeHealth + recovery.heal);
  game.player.shield = Math.max(Number(game.player.shield) || 0, recovery.shield);
  state.recoveries += 1;
  if (game.stats) game.stats.pacingRecoveries = (Number(game.stats.pacingRecoveries) || 0) + 1;
  const text = recovery.heal ? `استعادة +${recovery.heal}` : 'درع استعداد';
  game.addFloatingText?.(game.player.x, game.player.y - 50, text, '#53f2a1');
}

function markDamagePressure(game) {
  const state = runtimeState(game);
  if (!state.plan || state.emergencyReliefUsed || !game.player) return;
  const ratio = (Number(game.player.health) || 0) / Math.max(1, Number(game.player.maxHealth) || 1);
  if (ratio <= 0.34) state.pendingEmergencyRelief = true;
}

function snapshotFor(game) {
  const state = runtimeState(game);
  return {
    release: PACING_RELEASE,
    enabled: pacingEnabled(game),
    wave: state.wave,
    waveElapsed: Number(state.waveElapsed.toFixed(2)),
    plan: state.plan ? { ...state.plan } : null,
    enemies: (game.enemies || []).length,
    elites: (game.enemies || []).filter((enemy) => enemy.elite).length,
    evolutions: (game.enemies || []).filter((enemy) => enemy.v12Evolution).length,
    removedEnemies: state.removedEnemies,
    demotedElites: state.demotedElites,
    clearedEvolutions: state.clearedEvolutions,
    recoveries: state.recoveries,
    emergencyReliefUsed: state.emergencyReliefUsed,
    objective: game.objectiveRoom ? {
      id: game.objectiveRoom.id,
      target: game.objectiveRoom.target,
      reinforcementDelay: game.objectiveRoom.parameters?.reinforcementDelay,
    } : null,
  };
}

export function installPacingRebalance(GameClass) {
  registerRuntimeSystem(GameClass, {
    id: SYSTEM_ID,
    priority: 470,
    hooks: {
      afterRunReset: ({ game }) => {
        game.runtime.setState(SYSTEM_ID, {
          wave: 0,
          waveElapsed: 0,
          plan: null,
          removedEnemies: 0,
          demotedElites: 0,
          clearedEvolutions: 0,
          recoveries: 0,
          emergencyReliefUsed: false,
          pendingEmergencyRelief: false,
          lastSoftReliefAt: 0,
          lastRecoveredWave: 0,
          lastObjectiveFailures: 0,
        });
        game.pacingPlan = null;
        game.getPacingSnapshot = () => snapshotFor(game);
      },
      afterWaveStart: ({ game }) => beginWave(game),
      afterUpdate: ({ game, detail }) => updatePacing(game, Math.max(0, Number(detail.dt) || 0)),
      afterPlayerDamaged: ({ game }) => markDamagePressure(game),
      beforeWaveAdvance: (context) => grantWaveRecovery(context),
      beforeBossStart: ({ game }) => {
        const state = runtimeState(game);
        state.plan = null;
        game.pacingPlan = null;
      },
    },
  });
}
