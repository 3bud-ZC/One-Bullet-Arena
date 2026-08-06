export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const GAME_VERSION = '2.5.0-polish';
export const MAX_ACTIVE_ENEMIES = 14;

export const ENEMY_TYPES = Object.freeze({
  scout: Object.freeze({ id: 'scout', radius: 17, speed: 124, health: 1, score: 100, color: '#ff5f78', unlockWave: 1 }),
  brute: Object.freeze({ id: 'brute', radius: 27, speed: 68, health: 3, score: 250, color: '#ff9f43', unlockWave: 3 }),
  sniper: Object.freeze({ id: 'sniper', radius: 20, speed: 55, health: 2, score: 225, color: '#b983ff', unlockWave: 4 }),
  charger: Object.freeze({ id: 'charger', radius: 21, speed: 65, health: 2, score: 240, color: '#53f2a1', unlockWave: 6 }),
  splitter: Object.freeze({ id: 'splitter', radius: 24, speed: 72, health: 3, score: 310, color: '#ff79d1', unlockWave: 8 }),
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
  return Object.values(ENEMY_TYPES).filter((enemy) => safeWave >= enemy.unlockWave).map((enemy) => enemy.id);
}

export function enemyCountForWave(wave) {
  const safeWave = sanitizeWave(wave);
  return Math.min(MAX_ACTIVE_ENEMIES, 3 + Math.floor((safeWave - 1) * 0.72));
}

export function buildWaveComposition(wave) {
  const safeWave = sanitizeWave(wave);
  const count = enemyCountForWave(safeWave);
  if (safeWave <= 2) return Array(count).fill('scout');

  const limits = {
    brute: Math.min(3, 1 + Math.floor(safeWave / 6)),
    sniper: safeWave >= 4 ? Math.min(2, 1 + Math.floor((safeWave - 4) / 8)) : 0,
    charger: safeWave >= 6 ? Math.min(2, 1 + Math.floor((safeWave - 6) / 9)) : 0,
    splitter: safeWave >= 8 ? Math.min(2, 1 + Math.floor((safeWave - 8) / 12)) : 0,
  };
  const result = [];
  const add = (type, amount) => {
    for (let index = 0; index < amount && result.length < count; index += 1) result.push(type);
  };
  add('splitter', Math.min(limits.splitter, safeWave % 4 === 0 ? 1 : 0));
  add('sniper', Math.min(limits.sniper, safeWave % 3 === 1 ? 1 : 0));
  add('charger', Math.min(limits.charger, safeWave % 3 === 0 ? 1 : 0));
  add('brute', Math.min(limits.brute, Math.max(1, Math.floor(count / 4))));
  while (result.length < count) result.push('scout');
  return result.sort((a, b) => ((safeWave * 7 + a.length * 3) % 11) - ((safeWave * 7 + b.length * 3) % 11));
}

export function enemyScaleForWave(wave) {
  const safeWave = sanitizeWave(wave);
  return Object.freeze({
    health: 1 + Math.min(1.1, (safeWave - 1) * 0.045),
    speed: 1 + Math.min(0.28, (safeWave - 1) * 0.01),
    shotSpeed: 1 + Math.min(0.32, (safeWave - 1) * 0.014),
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
