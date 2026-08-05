export const PACING_RELEASE = '1.4.1';
export const PACING_WAVES_PER_REGION = 8;

const WAVE_CURVE = Object.freeze([
  Object.freeze({ localWave: 1, budget: 3.1, enemyCap: 3, eliteCap: 0, evolutionCap: 0, healthScale: 0.90, speedScale: 0.88, hazardScale: 0, reinforcementDelay: 5.4, softCapSeconds: 48 }),
  Object.freeze({ localWave: 2, budget: 4.2, enemyCap: 4, eliteCap: 0, evolutionCap: 0, healthScale: 0.92, speedScale: 0.90, hazardScale: 0, reinforcementDelay: 5.0, softCapSeconds: 54 }),
  Object.freeze({ localWave: 3, budget: 5.4, enemyCap: 5, eliteCap: 0, evolutionCap: 0, healthScale: 0.94, speedScale: 0.92, hazardScale: 0.30, reinforcementDelay: 4.7, softCapSeconds: 62 }),
  Object.freeze({ localWave: 4, budget: 6.6, enemyCap: 6, eliteCap: 1, evolutionCap: 1, healthScale: 0.96, speedScale: 0.94, hazardScale: 0.45, reinforcementDelay: 4.4, softCapSeconds: 70 }),
  Object.freeze({ localWave: 5, budget: 7.8, enemyCap: 7, eliteCap: 1, evolutionCap: 1, healthScale: 0.98, speedScale: 0.95, hazardScale: 0.60, reinforcementDelay: 4.1, softCapSeconds: 78 }),
  Object.freeze({ localWave: 6, budget: 9.0, enemyCap: 8, eliteCap: 1, evolutionCap: 1, healthScale: 0.99, speedScale: 0.96, hazardScale: 0.72, reinforcementDelay: 3.9, softCapSeconds: 86 }),
  Object.freeze({ localWave: 7, budget: 10.4, enemyCap: 9, eliteCap: 2, evolutionCap: 2, healthScale: 1.00, speedScale: 0.98, hazardScale: 0.86, reinforcementDelay: 3.7, softCapSeconds: 96 }),
  Object.freeze({ localWave: 8, budget: 11.8, enemyCap: 10, eliteCap: 2, evolutionCap: 2, healthScale: 1.00, speedScale: 1.00, hazardScale: 1.00, reinforcementDelay: 3.5, softCapSeconds: 108 }),
]);

export const DIFFICULTY_PACING = Object.freeze({
  recruit: Object.freeze({
    id: 'recruit',
    budgetMultiplier: 0.82,
    enemyCapOffset: -1,
    eliteCapOffset: -1,
    evolutionCapOffset: -1,
    healthMultiplier: 0.96,
    speedMultiplier: 0.96,
    reinforcementDelayMultiplier: 1.24,
    adaptiveRelief: 1.25,
  }),
  hunter: Object.freeze({
    id: 'hunter',
    budgetMultiplier: 0.92,
    enemyCapOffset: 0,
    eliteCapOffset: 0,
    evolutionCapOffset: 0,
    healthMultiplier: 0.98,
    speedMultiplier: 0.98,
    reinforcementDelayMultiplier: 1.12,
    adaptiveRelief: 1,
  }),
  corebreaker: Object.freeze({
    id: 'corebreaker',
    budgetMultiplier: 1.06,
    enemyCapOffset: 0,
    eliteCapOffset: 0,
    evolutionCapOffset: 1,
    healthMultiplier: 1,
    speedMultiplier: 1,
    reinforcementDelayMultiplier: 0.96,
    adaptiveRelief: 0.7,
  }),
  'one-hit': Object.freeze({
    id: 'one-hit',
    budgetMultiplier: 1.12,
    enemyCapOffset: 1,
    eliteCapOffset: 1,
    evolutionCapOffset: 1,
    healthMultiplier: 1.02,
    speedMultiplier: 1.02,
    reinforcementDelayMultiplier: 0.90,
    adaptiveRelief: 0,
  }),
});

export const ENEMY_THREAT = Object.freeze({
  scout: 1,
  charger: 1.35,
  sniper: 1.5,
  brute: 1.75,
  splitter: 2.15,
  prism: 1.65,
  sentinel: 1.8,
  laser: 1.75,
  welder: 1.65,
  piston: 1.9,
  riftling: 1.45,
  gravity: 1.85,
  warden: 2.1,
});

function safeInteger(value, fallback = 1, minimum = 1) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(minimum, Math.trunc(number)) : fallback;
}

export function localPacingWave(wave, wavesPerRegion = PACING_WAVES_PER_REGION) {
  const safeWave = safeInteger(wave, 1, 1);
  const cycle = safeInteger(wavesPerRegion, PACING_WAVES_PER_REGION, 1);
  return ((safeWave - 1) % cycle) + 1;
}

export function difficultyPacingById(id) {
  return DIFFICULTY_PACING[id] || DIFFICULTY_PACING.hunter;
}

export function enemyThreat(enemyOrType) {
  const type = typeof enemyOrType === 'string' ? enemyOrType : enemyOrType?.type;
  const base = ENEMY_THREAT[type] || 1.55;
  const elite = typeof enemyOrType === 'object' && enemyOrType?.elite ? 0.8 : 0;
  const evolution = typeof enemyOrType === 'object' && enemyOrType?.v12Evolution ? 0.55 : 0;
  const mini = typeof enemyOrType === 'object' && enemyOrType?.mini ? -0.35 : 0;
  return Math.max(0.55, base + elite + evolution + mini);
}

export function wavePacingPlan({ wave = 1, difficultyId = 'hunter' } = {}) {
  const localWave = localPacingWave(wave);
  const curve = WAVE_CURVE[localWave - 1];
  const difficulty = difficultyPacingById(difficultyId);
  return Object.freeze({
    release: PACING_RELEASE,
    wave: safeInteger(wave, 1, 1),
    localWave,
    difficultyId: difficulty.id,
    budget: Number((curve.budget * difficulty.budgetMultiplier).toFixed(2)),
    enemyCap: Math.max(3, curve.enemyCap + difficulty.enemyCapOffset),
    eliteCap: Math.max(0, curve.eliteCap + difficulty.eliteCapOffset),
    evolutionCap: Math.max(0, curve.evolutionCap + difficulty.evolutionCapOffset),
    healthScale: Number((curve.healthScale * difficulty.healthMultiplier).toFixed(3)),
    speedScale: Number((curve.speedScale * difficulty.speedMultiplier).toFixed(3)),
    hazardScale: curve.hazardScale,
    reinforcementDelay: Number((curve.reinforcementDelay * difficulty.reinforcementDelayMultiplier).toFixed(2)),
    softCapSeconds: Math.round(curve.softCapSeconds / Math.max(0.85, difficulty.budgetMultiplier)),
    adaptiveRelief: difficulty.adaptiveRelief,
  });
}

export function objectivePacingTuning({ objectiveId, wave = 1, difficultyId = 'hunter' } = {}) {
  const localWave = localPacingWave(wave);
  const difficulty = difficultyPacingById(difficultyId);
  const easier = difficulty.id === 'recruit';
  const standard = difficulty.id === 'hunter';
  const highPressure = difficulty.id === 'corebreaker' || difficulty.id === 'one-hit';
  const shared = {
    reinforcementDelay: wavePacingPlan({ wave, difficultyId }).reinforcementDelay,
    stopReinforcementsAt: highPressure ? 0.9 : easier ? 0.7 : 0.8,
  };

  if (objectiveId === 'circuit-sequence') {
    return {
      ...shared,
      relayCount: localWave >= 7 && highPressure ? 4 : 3,
    };
  }
  if (objectiveId === 'ricochet-lock') {
    return {
      ...shared,
      requiredBounces: easier ? 1 : standard ? Math.min(2, 1 + Math.floor(Math.max(0, localWave - 2) / 3)) : Math.min(3, 1 + Math.floor(Math.max(0, localWave - 2) / 2)),
      requiredHits: highPressure && localWave >= 7 ? 2 : 1,
    };
  }
  if (objectiveId === 'core-defense') {
    return {
      ...shared,
      duration: easier ? 11.5 : standard ? 14 : highPressure ? 17 : 14,
      coreHealth: easier ? 5 : standard ? 4 : 3,
      assaultLimit: easier ? 1 : standard ? 2 : Math.min(4, 2 + Math.floor(localWave / 3)),
      failurePenaltySeconds: easier ? 2 : standard ? 2.5 : 4,
    };
  }
  if (objectiveId === 'marked-hunt') {
    return {
      ...shared,
      targetKills: easier || standard ? 2 : localWave >= 7 ? 4 : 3,
    };
  }
  if (objectiveId === 'bullet-separation') {
    return {
      ...shared,
      duration: easier ? 6.5 : standard ? 8 : highPressure ? 10.5 : 8,
      minimumDistance: easier ? 170 : standard ? 190 : 215,
      decayCompensation: easier ? 0.30 : standard ? 0.24 : highPressure ? 0.06 : 0.24,
    };
  }
  return shared;
}

export function recoveryForWave({ wave = 1, difficultyId = 'hunter', health = 3, maxHealth = 3 } = {}) {
  const localWave = localPacingWave(wave);
  const safeHealth = Math.max(0, Number(health) || 0);
  const safeMaxHealth = Math.max(1, Number(maxHealth) || 1);
  const ratio = safeHealth / safeMaxHealth;
  if (difficultyId === 'one-hit') return Object.freeze({ heal: 0, shield: 0, reason: 'one-hit' });
  if (difficultyId === 'recruit') {
    return Object.freeze({ heal: safeHealth < safeMaxHealth ? 1 : 0, shield: safeHealth >= safeMaxHealth ? 1 : 0, reason: 'recruit-wave' });
  }
  if (difficultyId === 'hunter') {
    const checkpoint = [2, 4, 6].includes(localWave);
    const emergency = ratio <= 0.34;
    return Object.freeze({
      heal: safeHealth < safeMaxHealth && (checkpoint || emergency) ? 1 : 0,
      shield: safeHealth >= safeMaxHealth && checkpoint ? 1 : emergency ? 1 : 0,
      reason: emergency ? 'emergency' : checkpoint ? 'checkpoint' : 'none',
    });
  }
  const emergency = ratio <= 0.25 && localWave < 8;
  return Object.freeze({ heal: emergency && safeHealth < safeMaxHealth ? 1 : 0, shield: 0, reason: emergency ? 'emergency' : 'none' });
}

export function pacingCurveSnapshot(difficultyId = 'hunter') {
  return WAVE_CURVE.map((entry) => wavePacingPlan({ wave: entry.localWave, difficultyId }));
}
