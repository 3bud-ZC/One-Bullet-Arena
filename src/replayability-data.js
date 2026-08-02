export const RARITY_TIERS = Object.freeze({
  common: { id: 'common', name: 'عادية', color: '#aeb7da', power: 1, weight: 0.58 },
  rare: { id: 'rare', name: 'نادرة', color: '#62f3ff', power: 1.25, weight: 0.27 },
  epic: { id: 'epic', name: 'ملحمية', color: '#b983ff', power: 1.55, weight: 0.12 },
  legendary: { id: 'legendary', name: 'أسطورية', color: '#ffe66d', power: 2, weight: 0.03 },
});

export const LEGENDARY_UPGRADES = Object.freeze([
  {
    id: 'ghost-round',
    name: 'طلقة الشبح',
    tag: 'اختراق زاوي',
    description: 'بعد أربعة ارتدادات تدخل الطلقة حالة شبحية وتسبب ضررًا أعلى.',
    maxStacks: 1,
    rarity: 'legendary',
    icon: '◇',
  },
  {
    id: 'vengeful-return',
    name: 'العودة الانتقامية',
    tag: 'استدعاء قاتل',
    description: 'الطلقة المستدعاة تسبب ضررًا مضاعفًا للأعداء في طريق عودتها.',
    maxStacks: 1,
    rarity: 'legendary',
    icon: '↶',
  },
  {
    id: 'final-detonation',
    name: 'الانفجار الأخير',
    tag: 'نهاية المسار',
    description: 'عند استهلاك آخر ارتداد تطلق الطلقة انفجارًا يضرب المنطقة المحيطة.',
    maxStacks: 1,
    rarity: 'legendary',
    icon: '✹',
  },
  {
    id: 'time-core',
    name: 'نواة الزمن',
    tag: 'سيطرة زمنية',
    description: 'قتل عدو بعد ارتداد يبطئ جميع الأعداء لفترة قصيرة.',
    maxStacks: 1,
    rarity: 'legendary',
    icon: '◷',
  },
  {
    id: 'chain-lightning',
    name: 'الصاعقة المتسلسلة',
    tag: 'عاصفة',
    description: 'الصدمات الكهربائية تقفز إلى هدفين إضافيين بضرر متناقص.',
    maxStacks: 1,
    rarity: 'legendary',
    icon: 'ϟ',
  },
  {
    id: 'nuclear-gamble',
    name: 'المقامرة النووية',
    tag: 'مخاطرة قصوى',
    description: 'تفقد قلبًا من الحد الأقصى، لكن ضرر الطلقة يرتفع بشدة.',
    maxStacks: 1,
    rarity: 'legendary',
    icon: '☢',
  },
]);

export const ELITE_MODIFIERS = Object.freeze([
  { id: 'explosive', name: 'المتفجر', icon: '✹', color: '#ff526a', reward: 18 },
  { id: 'regenerator', name: 'المتجدد', icon: '✚', color: '#53f2a1', reward: 20 },
  { id: 'armored', name: 'المحصّن', icon: '⬡', color: '#62f3ff', reward: 22 },
  { id: 'summoner', name: 'المستدعي', icon: '♢', color: '#b983ff', reward: 24 },
  { id: 'bullet-hunter', name: 'صياد الطلقة', icon: '◎', color: '#ffe66d', reward: 24 },
  { id: 'accelerator', name: 'المسرّع', icon: '»', color: '#ff9f43', reward: 20 },
]);

export const RUN_CHALLENGES = Object.freeze([
  {
    id: 'untouched',
    name: 'دون خدش',
    description: 'أنه الجولة دون تلقي أي ضرر.',
    reward: 55,
    progressLabel: (metrics) => `${metrics.damageTaken || 0} ضرر`,
  },
  {
    id: 'triple-kill',
    name: 'طلقة لثلاثة',
    description: 'اقتل ثلاثة أعداء على الأقل بنفس الإطلاق.',
    reward: 45,
    progressLabel: (metrics) => `${metrics.maxKillsPerShot || 0} / 3`,
  },
  {
    id: 'eight-bounces',
    name: 'هندسة قاتلة',
    description: 'حقق ثمانية ارتدادات في طلقة واحدة.',
    reward: 42,
    progressLabel: (metrics) => `${metrics.maxBounces || 0} / 8`,
  },
  {
    id: 'dashless',
    name: 'خطوة محسوبة',
    description: 'أنه الجولة دون استخدام الاندفاع.',
    reward: 60,
    progressLabel: (metrics) => `${metrics.dashes || 0} اندفاع`,
  },
  {
    id: 'limited-shots',
    name: 'اقتصاد الذخيرة',
    description: 'افز باستخدام 30 إطلاقًا أو أقل.',
    reward: 65,
    progressLabel: (metrics) => `${metrics.shots || 0} / 30`,
  },
  {
    id: 'elite-hunter',
    name: 'صائد النخبة',
    description: 'اقتل ثلاثة أعداء Elite في جولة واحدة.',
    reward: 50,
    progressLabel: (metrics) => `${metrics.eliteKills || 0} / 3`,
  },
]);

export const DAILY_MUTATORS = Object.freeze([
  { id: 'elite-rush', name: 'غزو النخبة', description: 'يظهر Elite إضافي في كل موجة.' },
  { id: 'fragile-core', name: 'نواة هشة', description: 'تبدأ بقلبين فقط، لكن مكافأة التحدي أعلى.' },
  { id: 'ricochet-storm', name: 'عاصفة الارتداد', description: 'تحصل على ارتدادين إضافيين، والأعداء أسرع قليلًا.' },
  { id: 'overclocked', name: 'تحميل زائد', description: 'سرعة الطلقة أعلى، لكن استدعاءها يحتاج وقتًا أطول.' },
]);

export const COSMETICS = Object.freeze([
  { id: 'player-cyan', slot: 'player', name: 'حارس السيان', color: '#62f3ff', default: true, requirement: 'متاح من البداية' },
  { id: 'player-crimson', slot: 'player', name: 'القلب القرمزي', color: '#ff526a', requirement: 'أكمل 3 تحديات' },
  { id: 'player-void', slot: 'player', name: 'شبح الفراغ', color: '#b983ff', requirement: 'سلسلة يومية 3 أيام' },
  { id: 'bullet-diamond', slot: 'bullet', name: 'الماسة الأصلية', color: '#ffe66d', default: true, requirement: 'متاح من البداية' },
  { id: 'bullet-prism', slot: 'bullet', name: 'منشور الصاعقة', color: '#d8b4ff', requirement: 'أكمل تحديًا يوميًا' },
  { id: 'trail-neon', slot: 'trail', name: 'أثر النيون', color: '#62f3ff', default: true, requirement: 'متاح من البداية' },
  { id: 'trail-gold', slot: 'trail', name: 'أثر الذهب', color: '#ffe66d', requirement: 'أكمل تحديًا واحدًا' },
  { id: 'dash-cyan', slot: 'dash', name: 'اندفاع السيان', color: '#62f3ff', default: true, requirement: 'متاح من البداية' },
  { id: 'dash-violet', slot: 'dash', name: 'شق بنفسجي', color: '#b983ff', requirement: 'اختر 3 ترقيات أسطورية' },
  { id: 'hud-cyan', slot: 'hud', name: 'واجهة النواة', color: '#62f3ff', default: true, requirement: 'متاح من البداية' },
  { id: 'hud-void', slot: 'hud', name: 'واجهة الفراغ', color: '#b983ff', requirement: 'اقتل 10 أعداء Elite' },
]);

export const SYNERGIES = Object.freeze([
  {
    id: 'angle-master',
    name: 'سيد الزوايا',
    description: 'ضرر إضافي بعد كل ارتداد رابع.',
    active: (coreId, stacks) => coreId === 'ricochet' && (stacks['hot-ricochet'] || 0) > 0 && (stacks['ghost-round'] || 0) > 0,
  },
  {
    id: 'storm-loop',
    name: 'حلقة العاصفة',
    description: 'الصدمات المتسلسلة تحصل على قفزة إضافية.',
    active: (coreId, stacks) => coreId === 'shock' && (stacks['shock-impact'] || 0) > 0 && (stacks['chain-lightning'] || 0) > 0,
  },
  {
    id: 'recall-hunter',
    name: 'صياد العودة',
    description: 'الاستدعاء أسرع ويصنع درعًا عند إصابة عدو.',
    active: (coreId, stacks) => coreId === 'recall' && (stacks['magnetic-recall'] || 0) > 0 && (stacks['vengeful-return'] || 0) > 0,
  },
  {
    id: 'siege-core',
    name: 'نواة الحصار',
    description: 'الانفجار الأخير أكبر وأقوى.',
    active: (coreId, stacks) => coreId === 'heavy' && (stacks['heavy-core'] || 0) > 0 && (stacks['final-detonation'] || 0) > 0,
  },
]);

export function hashSeed(value) {
  const text = String(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createSeededRandom(seed) {
  let state = hashSeed(seed) || 0x6d2b79f5;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function dateKey(input = new Date()) {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '1970-01-01';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function rarityForRoll(roll, wave = 1, daily = false) {
  const safeRoll = Math.max(0, Math.min(0.999999, Number(roll) || 0));
  const waveBonus = Math.max(0, Math.min(5, Number(wave) || 1) - 1);
  const legendary = Math.min(0.12, 0.025 + waveBonus * 0.009 + (daily ? 0.025 : 0));
  const epic = Math.min(0.24, 0.105 + waveBonus * 0.014 + (daily ? 0.02 : 0));
  const rare = Math.min(0.4, 0.255 + waveBonus * 0.012);
  if (safeRoll < legendary) return 'legendary';
  if (safeRoll < legendary + epic) return 'epic';
  if (safeRoll < legendary + epic + rare) return 'rare';
  return 'common';
}

export function decorateUpgradeChoices(baseChoices, options = {}) {
  const choices = Array.isArray(baseChoices) ? baseChoices : [];
  const wave = Math.max(1, Number(options.wave) || 1);
  const stacks = options.stacks || {};
  const daily = Boolean(options.daily);
  const random = options.random || createSeededRandom(options.seed || `run-${wave}`);
  const output = choices.map((upgrade) => {
    let rarity = rarityForRoll(random(), wave, daily);
    if (rarity === 'legendary') rarity = 'epic';
    return { ...upgrade, rarity, rarityPower: RARITY_TIERS[rarity].power };
  });

  const legendaryPool = LEGENDARY_UPGRADES.filter((upgrade) => (stacks[upgrade.id] || 0) < upgrade.maxStacks);
  const legendaryChance = Math.min(0.28, 0.045 + wave * 0.018 + (daily ? 0.055 : 0));
  if (output.length > 0 && legendaryPool.length > 0 && random() < legendaryChance) {
    const targetIndex = Math.floor(random() * output.length);
    const legendary = legendaryPool[Math.floor(random() * legendaryPool.length)];
    output[targetIndex] = { ...legendary, rarityPower: RARITY_TIERS.legendary.power };
  }
  return output;
}

export function resolveSynergies(coreId, stacks = {}) {
  return SYNERGIES.filter((synergy) => synergy.active(coreId, stacks));
}

export function challengeById(id) {
  return RUN_CHALLENGES.find((challenge) => challenge.id === id) || RUN_CHALLENGES[0];
}

export function eliteModifierById(id) {
  return ELITE_MODIFIERS.find((modifier) => modifier.id === id) || null;
}

export function pickEliteModifier(wave = 1, index = 0, seed = '') {
  const random = createSeededRandom(`${seed}|elite|${wave}|${index}`);
  return ELITE_MODIFIERS[Math.floor(random() * ELITE_MODIFIERS.length)];
}

export function chooseRunChallenge(seed = '') {
  const random = createSeededRandom(`${seed}|challenge`);
  return RUN_CHALLENGES[Math.floor(random() * RUN_CHALLENGES.length)];
}

export function dailyChallengeForDate(input = new Date()) {
  const key = dateKey(input);
  const random = createSeededRandom(`daily|${key}`);
  const cores = ['standard', 'ricochet', 'heavy', 'shock', 'recall'];
  return {
    date: key,
    seed: hashSeed(`daily|${key}`),
    challenge: RUN_CHALLENGES[Math.floor(random() * RUN_CHALLENGES.length)],
    coreId: cores[Math.floor(random() * cores.length)],
    mutator: DAILY_MUTATORS[Math.floor(random() * DAILY_MUTATORS.length)],
  };
}

export function evaluateChallenge(challengeId, metrics = {}) {
  const victory = Boolean(metrics.victory);
  if (challengeId === 'untouched') return victory && Number(metrics.damageTaken || 0) === 0;
  if (challengeId === 'triple-kill') return Number(metrics.maxKillsPerShot || 0) >= 3;
  if (challengeId === 'eight-bounces') return Number(metrics.maxBounces || 0) >= 8;
  if (challengeId === 'dashless') return victory && Number(metrics.dashes || 0) === 0;
  if (challengeId === 'limited-shots') return victory && Number(metrics.shots || 0) <= 30;
  if (challengeId === 'elite-hunter') return Number(metrics.eliteKills || 0) >= 3;
  return false;
}

export function cosmeticById(id) {
  return COSMETICS.find((cosmetic) => cosmetic.id === id) || null;
}

export function deriveCosmeticUnlocks(replayability = {}) {
  const totals = replayability.totals || {};
  const daily = replayability.daily || {};
  const unlocked = COSMETICS.filter((cosmetic) => cosmetic.default).map((cosmetic) => cosmetic.id);
  if (Number(totals.challengesCompleted || 0) >= 1) unlocked.push('trail-gold');
  if (Number(totals.challengesCompleted || 0) >= 3) unlocked.push('player-crimson');
  if (Number(totals.dailyWins || 0) >= 1) unlocked.push('bullet-prism');
  if (Number(totals.legendaryPicks || 0) >= 3) unlocked.push('dash-violet');
  if (Number(totals.eliteKills || 0) >= 10) unlocked.push('hud-void');
  if (Number(daily.streak || 0) >= 3) unlocked.push('player-void');
  return [...new Set(unlocked)];
}

export function previousDateKey(key) {
  const date = new Date(`${key}T12:00:00`);
  date.setDate(date.getDate() - 1);
  return dateKey(date);
}
