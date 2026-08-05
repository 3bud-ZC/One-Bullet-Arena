import { GAME_HEIGHT, GAME_VERSION, GAME_WIDTH, MAX_ACTIVE_ENEMIES } from './config.js';

export { GAME_HEIGHT, GAME_VERSION, GAME_WIDTH, MAX_ACTIVE_ENEMIES };

export const ENEMY_TYPES = Object.freeze({
  scout: Object.freeze({ id: 'scout', radius: 17, speed: 124, health: 1, score: 100, color: '#ff5f78', unlockWave: 1, cap: 14 }),
  brute: Object.freeze({ id: 'brute', radius: 27, speed: 68, health: 3, score: 250, color: '#ff9f43', unlockWave: 3, cap: 4 }),
  sniper: Object.freeze({ id: 'sniper', radius: 20, speed: 55, health: 2, score: 225, color: '#b983ff', unlockWave: 4, cap: 2 }),
  charger: Object.freeze({ id: 'charger', radius: 21, speed: 65, health: 2, score: 240, color: '#53f2a1', unlockWave: 6, cap: 2 }),
  splitter: Object.freeze({ id: 'splitter', radius: 24, speed: 72, health: 3, score: 310, color: '#ff79d1', unlockWave: 8, cap: 2 }),
});

export const UPGRADES = Object.freeze([
  Object.freeze({ id: 'heavy-shot', name: 'طلقة ثقيلة', tag: 'ضرر', description: 'يزيد ضرر الطلقة بنسبة 35%.', maxStacks: 10 }),
  Object.freeze({ id: 'bullet-velocity', name: 'سرعة الطلقة', tag: 'طلقة', description: 'يزيد سرعة الطلقة عند الإطلاق بنسبة 7%.', maxStacks: 8 }),
  Object.freeze({ id: 'extended-ricochet', name: 'ارتداد ممتد', tag: 'ارتداد', description: 'يضيف ارتدادين قبل أن تبدأ الطلقة في فقدان سرعتها.', maxStacks: 7 }),
  Object.freeze({ id: 'hot-ricochet', name: 'ارتداد ساخن', tag: 'ضرر', description: 'كل ارتداد يزيد ضرر الطلقة الحالية.', maxStacks: 7 }),
  Object.freeze({ id: 'shock-impact', name: 'صدمة كهربائية', tag: 'منطقة', description: 'إصابة العدو تضر الأعداء القريبين منه.', maxStacks: 6 }),
  Object.freeze({ id: 'magnetic-recall', name: 'استدعاء مغناطيسي', tag: 'استعادة', description: 'يسرّع رجوع الطلقة ويقلل وقت انتظار الاستدعاء.', maxStacks: 7 }),
  Object.freeze({ id: 'recall-strike', name: 'ضربة العودة', tag: 'استعادة', description: 'الطلقة أثناء رجوعها تسبب ضررًا إضافيًا.', maxStacks: 6 }),
  Object.freeze({ id: 'quick-dash', name: 'اندفاع أسرع', tag: 'حركة', description: 'يقلل وقت انتظار الاندفاع.', maxStacks: 7 }),
  Object.freeze({ id: 'swift-steps', name: 'خطوات خاطفة', tag: 'حركة', description: 'يزيد سرعة حركة اللاعب بنسبة 7%.', maxStacks: 7 }),
  Object.freeze({ id: 'vitality', name: 'قلب إضافي', tag: 'صحة', description: 'يزيد الحد الأقصى للصحة ويعالج قلبًا واحدًا.', maxStacks: 4 }),
  Object.freeze({ id: 'wave-shield', name: 'درع الموجة', tag: 'دفاع', description: 'ابدأ كل موجة بدرع يمتص ضربة واحدة.', maxStacks: 1 }),
  Object.freeze({ id: 'second-chance', name: 'فرصة أخيرة', tag: 'نجاة', description: 'تنجو مرة واحدة من ضربة قاتلة بقلب واحد.', maxStacks: 1 }),
]);

export function sanitizeWave(value) {
  return Math.max(1, Math.trunc(Number(value) || 1));
}

export function enemyPoolForWave(wave) {
  const safeWave = sanitizeWave(wave);
  return Object.values(ENEMY_TYPES)
    .filter((enemy) => safeWave >= enemy.unlockWave)
    .map((enemy) => enemy.id);
}

export function enemyCountForWave(wave) {
  const safeWave = sanitizeWave(wave);
  return Math.min(MAX_ACTIVE_ENEMIES, 3 + Math.floor((safeWave - 1) * 0.78));
}

export function enemyCapsForWave(wave) {
  const safeWave = sanitizeWave(wave);
  return Object.freeze({
    scout: MAX_ACTIVE_ENEMIES,
    brute: safeWave < 6 ? 2 : 4,
    sniper: safeWave < 8 ? 1 : 2,
    charger: safeWave < 10 ? 1 : 2,
    splitter: safeWave < 11 ? 1 : 2,
  });
}

export function buildWaveComposition(wave) {
  const safeWave = sanitizeWave(wave);
  const count = enemyCountForWave(safeWave);
  if (safeWave <= 2) return Array(count).fill('scout');

  const pool = enemyPoolForWave(safeWave);
  const caps = enemyCapsForWave(safeWave);
  const composition = [];
  const counts = Object.fromEntries(Object.keys(ENEMY_TYPES).map((id) => [id, 0]));
  const minimumScouts = Math.max(2, Math.ceil(count * 0.34));

  const push = (type) => {
    if (!pool.includes(type) || composition.length >= count || counts[type] >= caps[type]) return false;
    composition.push(type);
    counts[type] += 1;
    return true;
  };

  for (let index = 0; index < minimumScouts; index += 1) push('scout');

  const introductions = [
    ['brute', 3],
    ['sniper', 4],
    ['charger', 6],
    ['splitter', 8],
  ];
  for (const [type, unlockWave] of introductions) {
    if (safeWave >= unlockWave) push(type);
  }

  const weightedOrder = ['scout', 'brute', 'scout', 'sniper', 'scout', 'charger', 'brute', 'splitter'];
  let cursor = safeWave % weightedOrder.length;
  let safety = 0;
  while (composition.length < count && safety < 200) {
    const type = weightedOrder[cursor % weightedOrder.length];
    push(type);
    cursor += 1;
    safety += 1;
  }

  while (composition.length < count) push('scout');
  return deterministicShuffle(composition, safeWave * 7919 + count * 97);
}

export function enemyScaleForWave(wave) {
  const safeWave = sanitizeWave(wave);
  return Object.freeze({
    health: 1 + Math.min(1.05, (safeWave - 1) * 0.043),
    speed: 1 + Math.min(0.26, (safeWave - 1) * 0.0095),
    shotSpeed: 1 + Math.min(0.3, (safeWave - 1) * 0.013),
  });
}

export function normalizedStacks(stacks = {}) {
  return Object.fromEntries(UPGRADES.map((upgrade) => [
    upgrade.id,
    Math.max(0, Math.min(upgrade.maxStacks, Math.trunc(Number(stacks[upgrade.id]) || 0))),
  ]));
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
    const index = Math.floor(normalized * pool.length);
    choices.push(pool.splice(index, 1)[0]);
  }
  return choices;
}

export function upgradePreview(upgradeId, currentStack = 0) {
  const current = Math.max(0, Math.trunc(Number(currentStack) || 0));
  const next = current + 1;
  const previews = {
    'heavy-shot': [`${formatPercent(current * 35)} ضرر`, `${formatPercent(next * 35)} ضرر`],
    'bullet-velocity': [`${formatPercent(current * 7)} سرعة`, `${formatPercent(next * 7)} سرعة`],
    'extended-ricochet': [`${4 + current * 2} ارتدادات`, `${4 + next * 2} ارتدادات`],
    'hot-ricochet': [`${formatPercent(current * 24)} لكل ارتداد`, `${formatPercent(next * 24)} لكل ارتداد`],
    'shock-impact': [`مدى ${82 + current * 20}`, `مدى ${82 + next * 20}`],
    'magnetic-recall': [`سرعة +${current * 95}`, `سرعة +${next * 95}`],
    'recall-strike': [`${formatPercent(current * 30)} ضرر عودة`, `${formatPercent(next * 30)} ضرر عودة`],
    'quick-dash': [`المستوى ${current}`, `المستوى ${next}`],
    'swift-steps': [`${formatPercent(current * 7)} حركة`, `${formatPercent(next * 7)} حركة`],
    vitality: [`+${current} قلوب`, `+${next} قلوب`],
    'wave-shield': [current ? 'درع مفعل' : 'بدون درع', 'ضربة محمية كل موجة'],
    'second-chance': [current ? 'مفعلة' : 'غير مفعلة', 'نجاة واحدة'],
  };
  return previews[upgradeId] || [`المستوى ${current}`, `المستوى ${next}`];
}

function deterministicShuffle(items, seed) {
  const result = [...items];
  let state = seed >>> 0;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function formatPercent(value) {
  return `+${Math.round(value)}%`;
}
