export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const SIMPLE_GAME_VERSION = '2.0.0-simple';

export const ENEMY_TYPES = Object.freeze({
  scout: { id: 'scout', radius: 17, speed: 126, health: 1, score: 100, color: '#ff5f78' },
  brute: { id: 'brute', radius: 27, speed: 70, health: 3, score: 260, color: '#ff9f43' },
  sniper: { id: 'sniper', radius: 20, speed: 56, health: 2, score: 220, color: '#b983ff' },
  charger: { id: 'charger', radius: 21, speed: 66, health: 2, score: 240, color: '#53f2a1' },
  splitter: { id: 'splitter', radius: 24, speed: 75, health: 3, score: 320, color: '#ff79d1' },
});

export const UPGRADES = Object.freeze([
  {
    id: 'heavy-shot',
    name: 'طلقة ثقيلة',
    tag: 'ضرر',
    description: 'يزيد ضرر الطلقة بمقدار 45%.',
    maxStacks: 8,
  },
  {
    id: 'extended-ricochet',
    name: 'ارتداد ممتد',
    tag: 'ارتداد',
    description: 'يضيف ارتدادين قبل أن تفقد الطلقة سرعتها.',
    maxStacks: 6,
  },
  {
    id: 'hot-ricochet',
    name: 'ارتداد ساخن',
    tag: 'ضرر',
    description: 'كل ارتداد يزيد ضرر الطلقة الحالية.',
    maxStacks: 6,
  },
  {
    id: 'shock-impact',
    name: 'صدمة كهربائية',
    tag: 'منطقة',
    description: 'إصابة العدو تضر الأعداء القريبين منه.',
    maxStacks: 6,
  },
  {
    id: 'magnetic-recall',
    name: 'استدعاء مغناطيسي',
    tag: 'استعادة',
    description: 'يسرّع رجوع الطلقة ويقلل وقت انتظار الاستدعاء.',
    maxStacks: 6,
  },
  {
    id: 'recall-strike',
    name: 'ضربة العودة',
    tag: 'استعادة',
    description: 'الطلقة أثناء رجوعها تسبب ضررًا إضافيًا.',
    maxStacks: 5,
  },
  {
    id: 'quick-dash',
    name: 'اندفاع سريع',
    tag: 'حركة',
    description: 'يقلل وقت انتظار الاندفاع.',
    maxStacks: 6,
  },
  {
    id: 'swift-steps',
    name: 'خطوات خاطفة',
    tag: 'حركة',
    description: 'يزيد سرعة حركة اللاعب.',
    maxStacks: 6,
  },
  {
    id: 'bullet-velocity',
    name: 'سرعة المقذوف',
    tag: 'طلقة',
    description: 'يزيد سرعة الطلقة عند الإطلاق.',
    maxStacks: 6,
  },
  {
    id: 'perfect-catch',
    name: 'التقاط مثالي',
    tag: 'دفاع',
    description: 'التقاط طلقة سريعة يمنح درعًا ونقاطًا إضافية.',
    maxStacks: 4,
  },
  {
    id: 'vitality',
    name: 'قلب إضافي',
    tag: 'صحة',
    description: 'يزيد الحد الأقصى للصحة ويعالج قلبًا واحدًا.',
    maxStacks: 4,
  },
  {
    id: 'wave-shield',
    name: 'درع الموجة',
    tag: 'دفاع',
    description: 'ابدأ كل موجة بدرع يمتص ضربة واحدة.',
    maxStacks: 3,
  },
  {
    id: 'second-chance',
    name: 'فرصة أخيرة',
    tag: 'نجاة',
    description: 'تنجو مرة واحدة من ضربة قاتلة بقلب واحد.',
    maxStacks: 1,
  },
]);

export function enemyPoolForWave(wave) {
  const safeWave = Math.max(1, Math.trunc(Number(wave) || 1));
  const pool = ['scout'];
  if (safeWave >= 2) pool.push('brute');
  if (safeWave >= 3) pool.push('sniper');
  if (safeWave >= 4) pool.push('charger');
  if (safeWave >= 6) pool.push('splitter');
  return pool;
}

export function buildWaveComposition(wave) {
  const safeWave = Math.max(1, Math.trunc(Number(wave) || 1));
  const count = Math.min(14, 3 + Math.floor((safeWave - 1) * 1.15));
  const pool = enemyPoolForWave(safeWave);
  return Array.from({ length: count }, (_, index) => pool[(safeWave + index * 2) % pool.length]);
}

export function enemyScaleForWave(wave) {
  const safeWave = Math.max(1, Math.trunc(Number(wave) || 1));
  return {
    health: 1 + Math.min(1.35, (safeWave - 1) * 0.055),
    speed: 1 + Math.min(0.34, (safeWave - 1) * 0.012),
    shotSpeed: 1 + Math.min(0.4, (safeWave - 1) * 0.018),
  };
}

export function normalizedStacks(stacks = {}) {
  const result = {};
  for (const upgrade of UPGRADES) {
    result[upgrade.id] = Math.max(0, Math.min(upgrade.maxStacks, Math.trunc(Number(stacks[upgrade.id]) || 0)));
  }
  return result;
}

export function availableUpgrades(stacks = {}) {
  const normalized = normalizedStacks(stacks);
  return UPGRADES.filter((upgrade) => normalized[upgrade.id] < upgrade.maxStacks);
}

export function pickUpgradeChoices(stacks = {}, count = 3, random = Math.random) {
  const available = [...availableUpgrades(stacks)];
  const choices = [];
  while (available.length > 0 && choices.length < count) {
    const index = Math.max(0, Math.min(available.length - 1, Math.floor(random() * available.length)));
    choices.push(available.splice(index, 1)[0]);
  }
  return choices;
}
