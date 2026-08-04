export const OBJECTIVE_ROOM_RELEASE = '1.4.0';
export const WAVES_PER_REGION = 8;

export const OBJECTIVE_ROOM_TYPES = Object.freeze([
  Object.freeze({
    id: 'circuit-sequence',
    name: 'تسلسل الدائرة',
    shortName: 'التسلسل',
    icon: '◈',
    color: '#62f3ff',
    description: 'أصب نقاط التحكم بالترتيب الصحيح باستخدام الطلقة.',
  }),
  Object.freeze({
    id: 'ricochet-lock',
    name: 'قفل الارتداد',
    shortName: 'قفل الارتداد',
    icon: '↗',
    color: '#ffe66d',
    description: 'افتح القفل بعد تحقيق عدد الارتدادات المطلوب.',
  }),
  Object.freeze({
    id: 'core-defense',
    name: 'دفاع النواة',
    shortName: 'الدفاع',
    icon: '⬡',
    color: '#53f2a1',
    description: 'احمِ النواة حتى يكتمل استقرارها.',
  }),
  Object.freeze({
    id: 'marked-hunt',
    name: 'مطاردة الهدف',
    shortName: 'الهدف المحدد',
    icon: '◎',
    color: '#ff9f43',
    description: 'أسقط الأهداف المحددة واحدًا بعد الآخر.',
  }),
  Object.freeze({
    id: 'bullet-separation',
    name: 'فصل الطلقة',
    shortName: 'الفصل',
    icon: '◇',
    color: '#b983ff',
    description: 'حافظ على الطلقة بعيدة عنك للمدة المطلوبة.',
  }),
]);

const OBJECTIVE_BY_ID = new Map(OBJECTIVE_ROOM_TYPES.map((objective) => [objective.id, objective]));

const WAVE_SCHEDULE = Object.freeze({
  1: null,
  2: 'circuit-sequence',
  3: 'ricochet-lock',
  4: 'core-defense',
  5: 'marked-hunt',
  6: 'bullet-separation',
  7: 'circuit-sequence',
  8: null,
});

const REGION_POINTS = Object.freeze({
  neon: Object.freeze([
    Object.freeze({ x: 320, y: 230 }),
    Object.freeze({ x: 960, y: 230 }),
    Object.freeze({ x: 960, y: 490 }),
    Object.freeze({ x: 320, y: 490 }),
  ]),
  forge: Object.freeze([
    Object.freeze({ x: 390, y: 205 }),
    Object.freeze({ x: 890, y: 205 }),
    Object.freeze({ x: 890, y: 515 }),
    Object.freeze({ x: 390, y: 515 }),
  ]),
  void: Object.freeze([
    Object.freeze({ x: 350, y: 270 }),
    Object.freeze({ x: 930, y: 270 }),
    Object.freeze({ x: 930, y: 450 }),
    Object.freeze({ x: 350, y: 450 }),
  ]),
});

function safeInteger(value, fallback = 0, minimum = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(minimum, Math.trunc(number)) : fallback;
}

export function objectiveRoomById(id) {
  return OBJECTIVE_BY_ID.get(id) || null;
}

export function localObjectiveWave(wave, wavesPerRegion = WAVES_PER_REGION) {
  const safeWave = Math.max(1, safeInteger(wave, 1, 1));
  const cycle = Math.max(1, safeInteger(wavesPerRegion, WAVES_PER_REGION, 1));
  return ((safeWave - 1) % cycle) + 1;
}

export function objectiveIdForWave({ wave = 1, boss = false, disabled = false } = {}) {
  if (boss || disabled) return null;
  return WAVE_SCHEDULE[localObjectiveWave(wave)] || null;
}

export function objectiveParameters(objectiveId, wave = 1) {
  const localWave = localObjectiveWave(wave);
  const pressure = Math.max(0, localWave - 2);
  const shared = {
    localWave,
    reward: 320 + localWave * 85,
    reinforcementDelay: Math.max(1.7, 3.4 - pressure * 0.2),
  };
  if (objectiveId === 'circuit-sequence') {
    return { ...shared, relayCount: localWave >= 7 ? 4 : 3 };
  }
  if (objectiveId === 'ricochet-lock') {
    return {
      ...shared,
      requiredBounces: Math.min(3, 1 + Math.floor(pressure / 2)),
      requiredHits: localWave >= 6 ? 2 : 1,
    };
  }
  if (objectiveId === 'core-defense') {
    return {
      ...shared,
      duration: 12 + localWave * 1.25,
      coreHealth: localWave >= 7 ? 4 : 3,
      assaultLimit: Math.min(4, 2 + Math.floor(pressure / 2)),
    };
  }
  if (objectiveId === 'marked-hunt') {
    return { ...shared, targetKills: localWave >= 7 ? 4 : 3 };
  }
  if (objectiveId === 'bullet-separation') {
    return {
      ...shared,
      duration: 6 + localWave * 0.9,
      minimumDistance: 170 + localWave * 8,
    };
  }
  return shared;
}

export function objectivePoints(regionId = 'neon', count = 4) {
  const points = REGION_POINTS[regionId] || REGION_POINTS.neon;
  const safeCount = Math.max(1, Math.min(points.length, safeInteger(count, 1, 1)));
  return points.slice(0, safeCount).map((point) => ({ ...point }));
}

export function createObjectiveRoomState({ objectiveId, wave = 1, regionId = 'neon' } = {}) {
  const definition = objectiveRoomById(objectiveId);
  if (!definition) return null;
  const parameters = objectiveParameters(objectiveId, wave);
  const state = {
    id: definition.id,
    definition,
    parameters,
    wave: Math.max(1, safeInteger(wave, 1, 1)),
    regionId: REGION_POINTS[regionId] ? regionId : 'neon',
    status: 'active',
    progress: 0,
    target: 1,
    notice: definition.description,
    noticeTime: 3.4,
    reinforcementTimer: parameters.reinforcementDelay,
    contactId: '',
    failures: 0,
    completedAt: 0,
  };

  if (objectiveId === 'circuit-sequence') {
    state.relays = objectivePoints(state.regionId, parameters.relayCount).map((point, index) => ({
      ...point,
      id: `objective-relay-${index}`,
      order: index,
      radius: 24,
      complete: false,
    }));
    state.target = parameters.relayCount;
  } else if (objectiveId === 'ricochet-lock') {
    state.lock = { x: 640, y: 360, radius: 34, phase: 0, hitCooldown: 0 };
    state.target = parameters.requiredHits;
  } else if (objectiveId === 'core-defense') {
    state.core = { x: 640, y: 360, radius: 38, health: parameters.coreHealth, maxHealth: parameters.coreHealth, hitCooldown: 0 };
    state.remaining = parameters.duration;
    state.target = parameters.duration;
  } else if (objectiveId === 'marked-hunt') {
    state.markedEnemyId = null;
    state.target = parameters.targetKills;
  } else if (objectiveId === 'bullet-separation') {
    state.minimumDistance = parameters.minimumDistance;
    state.target = parameters.duration;
  }
  return state;
}
