export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const GAME_VERSION = '2.5.0-polish';
export const MAX_ACTIVE_ENEMIES = 18;

export const ENEMY_TYPES = Object.freeze({
  scout: Object.freeze({ id: 'scout', radius: 17, speed: 124, health: 1, score: 100, color: '#ff5f78', unlockWave: 1 }),
  brute: Object.freeze({ id: 'brute', radius: 27, speed: 68, health: 3, score: 250, color: '#ff9f43', unlockWave: 3 }),
  sniper: Object.freeze({ id: 'sniper', radius: 20, speed: 55, health: 2, score: 225, color: '#b983ff', unlockWave: 4 }),
  charger: Object.freeze({ id: 'charger', radius: 21, speed: 65, health: 2, score: 240, color: '#53f2a1', unlockWave: 6 }),
  warden: Object.freeze({ id: 'warden', radius: 25, speed: 54, health: 4, score: 360, color: '#67ddff', unlockWave: 7 }),
  splitter: Object.freeze({ id: 'splitter', radius: 24, speed: 72, health: 3, score: 310, color: '#ff79d1', unlockWave: 8 }),
});

export const UPGRADES = Object.freeze([
  Object.freeze({ id: 'heavy-shot', name: 'طلقة ثقيلة', tag: 'ضرر', description: 'يزيد ضرر الطلقة بنسبة 55%.', maxStacks: 8 }),
  Object.freeze({ id: 'bullet-velocity', name: 'سرعة الطلقة', tag: 'طلقة', description: 'يزيد سرعة الطلقة عند الإطلاق بنسبة 12%.', maxStacks: 7 }),
  Object.freeze({ id: 'extended-ricochet', name: 'ارتداد ممتد', tag: 'ارتداد', description: 'يضيف ثلاثة ارتدادات قبل أن تبدأ الطلقة في فقدان سرعتها.', maxStacks: 6 }),
  Object.freeze({ id: 'hot-ricochet', name: 'ارتداد ساخن', tag: 'ضرر', description: 'كل ارتداد يزيد ضرر الطلقة الحالية بقوة أكبر.', maxStacks: 6 }),
  Object.freeze({ id: 'shock-impact', name: 'صدمة كهربائية', tag: 'منطقة', description: 'إصابة العدو تضر الأعداء القريبين بمدى وضرر أعلى.', maxStacks: 5 }),
  Object.freeze({ id: 'magnetic-recall', name: 'استدعاء مغناطيسي', tag: 'استعادة', description: 'يسرّع رجوع الطلقة بقوة ويقلل وقت انتظار الاستدعاء.', maxStacks: 6 }),
  Object.freeze({ id: 'recall-strike', name: 'ضربة العودة', tag: 'استعادة', description: 'الطلقة أثناء رجوعها تسبب ضررًا إضافيًا كبيرًا.', maxStacks: 5 }),
  Object.freeze({ id: 'quick-dash', name: 'اندفاع أسرع', tag: 'حركة', description: 'يقلل وقت انتظار الاندفاع بوضوح.', maxStacks: 6 }),
  Object.freeze({ id: 'swift-steps', name: 'خطوات خاطفة', tag: 'حركة', description: 'يزيد سرعة حركة اللاعب بنسبة 11%.', maxStacks: 6 }),
  Object.freeze({ id: 'vitality', name: 'قلب إضافي', tag: 'صحة', description: 'يزيد الحد الأقصى للصحة ويعالج قلبين.', maxStacks: 4 }),
  Object.freeze({ id: 'wave-shield', name: 'درع الموجة', tag: 'دفاع', description: 'ابدأ كل موجة بدرع أقوى يمتص عدة ضربات.', maxStacks: 3 }),
  Object.freeze({ id: 'second-chance', name: 'فرصة أخيرة', tag: 'نجاة', description: 'تنجو مرة واحدة من ضربة قاتلة بقلب واحد.', maxStacks: 1 }),
  Object.freeze({ id: 'phase-round', name: 'طلقة نافذة', tag: 'اختراق', description: 'تقلل فقدان سرعة الطلقة بعد الإصابة وتساعدها على عبور تجمعات الأعداء.', maxStacks: 4 }),
  Object.freeze({ id: 'kinetic-catch', name: 'التقاط حركي', tag: 'فيزياء', description: 'استلام الطلقة الراجعة يدفع الأعداء القريبين ويعطل ضغطهم لحظة قصيرة.', maxStacks: 4 }),
  Object.freeze({ id: 'field-medic', name: 'ترميم ميداني', tag: 'استشفاء', description: 'بعد كل مكافأة قدرة، تستعيد صحة إضافية وتدخل الموجات الصعبة بثبات أعلى.', maxStacks: 3 }),
  Object.freeze({ id: 'dash-impact', name: 'صدمة اندفاع', tag: 'حركة', description: 'الاندفاع يصنع موجة دفع قصيرة تضر الأعداء القريبين.', maxStacks: 4 }),
]);

const ENCOUNTER_PROFILES = Object.freeze([
  Object.freeze({ id: 'rush', name: 'اندفاع خاطف', health: 0.94, speed: 1.12, shotSpeed: 1.02 }),
  Object.freeze({ id: 'crossfire', name: 'نيران متقاطعة', health: 1.0, speed: 0.98, shotSpeed: 1.16 }),
  Object.freeze({ id: 'swarm', name: 'سرب متحرك', health: 0.9, speed: 1.16, shotSpeed: 1.04 }),
  Object.freeze({ id: 'siege', name: 'حصار ثقيل', health: 1.2, speed: 0.92, shotSpeed: 1.08 }),
  Object.freeze({ id: 'hunters', name: 'مطاردة النخبة', health: 1.1, speed: 1.08, shotSpeed: 1.12 }),
]);

const EARLY_ENCOUNTER = Object.freeze({ id: 'foundation', name: 'ضغط متوازن', health: 1, speed: 1, shotSpeed: 1 });

// Archetype weights per encounter. These decide what a wave IS, so an encounter
// name predicts the fight rather than just tinting three stat multipliers.
const ENCOUNTER_SQUADS = Object.freeze({
  rush: Object.freeze([['charger', 4], ['splitter', 2], ['brute', 1]]),
  // No wardens here on purpose: crossfire is about ranged lanes and siege is
  // where armour shows up. Keeping them apart is what makes the two read
  // differently instead of blurring into one late-game soup.
  crossfire: Object.freeze([['sniper', 4], ['splitter', 2], ['brute', 1]]),
  swarm: Object.freeze([['splitter', 4], ['charger', 2], ['scout', 2]]),
  siege: Object.freeze([['brute', 4], ['warden', 3], ['sniper', 1]]),
  hunters: Object.freeze([['charger', 2], ['warden', 2], ['sniper', 2], ['splitter', 2], ['brute', 1]]),
});

// Scouts are the wave-1 enemy and were previously used as unlimited filler, so
// a wave-35 fight was still ~60% wave-1 trash. They stay as pressure filler but
// their share falls as the run escalates.
function scoutShareForWave(wave) {
  const safeWave = sanitizeWave(wave);
  if (safeWave < 10) return 1;
  return Math.max(0.12, 0.5 - (safeWave - 10) * 0.018);
}

export function sanitizeWave(value) {
  return Math.max(1, Math.trunc(Number(value) || 1));
}

export function waveEncounterForWave(wave) {
  const safeWave = sanitizeWave(wave);
  if (safeWave < 10) return EARLY_ENCOUNTER;

  // Sectors unlock every 5 waves and there are 5 encounter profiles, so a plain
  // modulo phase-locked the two: every sector was entered on the same encounter
  // for the life of a run. Advancing the index by one extra step per completed
  // cycle breaks that alignment while keeping all five profiles in rotation.
  const cycle = safeWave - 10;
  const rotation = Math.floor(cycle / ENCOUNTER_PROFILES.length);
  return ENCOUNTER_PROFILES[(cycle + rotation) % ENCOUNTER_PROFILES.length];
}

export function enemyPoolForWave(wave) {
  const safeWave = sanitizeWave(wave);
  return Object.values(ENEMY_TYPES).filter((enemy) => safeWave >= enemy.unlockWave).map((enemy) => enemy.id);
}

export function enemyCountForWave(wave) {
  const safeWave = sanitizeWave(wave);
  if (safeWave <= 14) return Math.min(MAX_ACTIVE_ENEMIES, 3 + Math.floor((safeWave - 1) * 0.72));
  return Math.min(MAX_ACTIVE_ENEMIES, 13 + Math.floor((safeWave - 14) * 0.28));
}

function addTypes(result, type, amount, count) {
  for (let index = 0; index < amount && result.length < count; index += 1) result.push(type);
}

export function buildWaveComposition(wave) {
  const safeWave = sanitizeWave(wave);
  const count = enemyCountForWave(safeWave);
  if (safeWave <= 2) return Array(count).fill('scout');

  if (safeWave < 10) {
    const result = [];
    addTypes(result, 'splitter', safeWave >= 8 && safeWave % 4 === 0 ? 1 : 0, count);
    addTypes(result, 'warden', safeWave >= 7 && safeWave % 4 === 3 ? 1 : 0, count);
    addTypes(result, 'sniper', safeWave >= 4 && safeWave % 3 === 1 ? 1 : 0, count);
    addTypes(result, 'charger', safeWave >= 6 && safeWave % 3 === 0 ? 1 : 0, count);
    addTypes(result, 'brute', Math.max(1, Math.floor(count / 4)), count);
    while (result.length < count) result.push('scout');
    return result;
  }

  const squad = ENCOUNTER_SQUADS[encounterIdForWave(safeWave)] || ENCOUNTER_SQUADS.hunters;
  const scouts = Math.min(count, Math.round(count * scoutShareForWave(safeWave)));
  const result = [];

  // Deal the squad out by weight, round-robin, so an encounter reads as its
  // archetype rather than as a handful of specials in a crowd of scouts.
  const budget = count - scouts;
  const totalWeight = squad.reduce((sum, [, weight]) => sum + weight, 0);
  let assigned = 0;
  for (const [type, weight] of squad) {
    const share = Math.round((weight / totalWeight) * budget);
    addTypes(result, type, share, count - scouts);
    assigned += share;
  }
  // Rounding can leave the budget short; top up with the heaviest archetype.
  if (assigned < budget) addTypes(result, squad[0][0], budget - assigned, count - scouts);

  while (result.length < count) result.push('scout');
  const rotation = (safeWave * 3 + encounterIdForWave(safeWave).length) % result.length;
  return [...result.slice(rotation), ...result.slice(0, rotation)];
}

function encounterIdForWave(wave) {
  return waveEncounterForWave(wave).id;
}

export function enemyScaleForWave(wave) {
  const safeWave = sanitizeWave(wave);
  const encounter = waveEncounterForWave(safeWave);
  const latePressure = Math.max(0, safeWave - 15);
  const baseHealth = 1 + Math.min(1.4, (safeWave - 1) * 0.048 + latePressure * 0.004);
  const baseSpeed = 1 + Math.min(0.42, (safeWave - 1) * 0.011 + latePressure * 0.0018);
  const baseShotSpeed = 1 + Math.min(0.5, (safeWave - 1) * 0.015 + latePressure * 0.0022);
  return Object.freeze({
    health: Math.min(2.8, baseHealth * encounter.health),
    speed: Math.min(1.58, baseSpeed * encounter.speed),
    shotSpeed: Math.min(1.72, baseShotSpeed * encounter.shotSpeed),
    encounterId: encounter.id,
  });
}

export function normalizedStacks(stacks = {}) {
  return Object.fromEntries(UPGRADES.map((upgrade) => [upgrade.id, Math.max(0, Math.min(upgrade.maxStacks, Math.trunc(Number(stacks[upgrade.id]) || 0)))]));
}

export function availableUpgrades(stacks = {}) {
  const normalized = normalizedStacks(stacks);
  return UPGRADES.filter((upgrade) => normalized[upgrade.id] < upgrade.maxStacks);
}

export function pickUpgradeChoices(stacks = {}, count = 3, random = Math.random, excludedIds = []) {
  const excluded = new Set(excludedIds);
  const all = availableUpgrades(stacks);
  const preferred = all.filter((upgrade) => !excluded.has(upgrade.id));
  const available = preferred.length >= Math.min(count, all.length) ? preferred : all;
  const choices = [];
  const pool = [...available];
  while (pool.length > 0 && choices.length < count) {
    const sample = Number(random());
    const normalized = Number.isFinite(sample) ? Math.max(0, Math.min(0.999999, sample)) : 0;
    choices.push(pool.splice(Math.floor(normalized * pool.length), 1)[0]);
  }
  return choices;
}
