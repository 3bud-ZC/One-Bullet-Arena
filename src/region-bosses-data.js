export const BOSS_MASTERY_STORAGE_KEY = 'one-bullet-arena-boss-mastery-v1';

export const REGION_BOSSES = Object.freeze([
  {
    id: 'mirror-guardian',
    regionId: 'neon',
    name: 'حارس المرآة',
    title: 'مهندس الانعكاس',
    icon: '◇',
    color: '#62f3ff',
    accent: '#b983ff',
    maxHp: 24,
    reward: 120,
    masteryReward: 45,
    phases: [
      { id: 1, threshold: 0.66, name: 'درع الانعكاس', hint: 'الطلقة المباشرة تنعكس. استخدم الجدران لكسر الدرع.' },
      { id: 2, threshold: 0.33, name: 'قاعة النسخ', hint: 'النسخ الوهمية تسرق مسار الطلقة وتخفي الحارس الحقيقي.' },
      { id: 3, threshold: 0, name: 'المرآة المقلوبة', hint: 'الموجة العكسية تقلب الحركة لفترات قصيرة مع إنذار واضح.' },
    ],
  },
  {
    id: 'bullet-hunter',
    regionId: 'forge',
    name: 'صياد الطلقة',
    title: 'قافل المسار',
    icon: '⬢',
    color: '#ff9f43',
    accent: '#ffe66d',
    maxHp: 29,
    reward: 150,
    masteryReward: 55,
    phases: [
      { id: 1, threshold: 0.66, name: 'المطاردة', hint: 'الصياد يتجه نحو الطلقة الحرة ويحاول احتجازها.' },
      { id: 2, threshold: 0.33, name: 'القفص المغناطيسي', hint: 'اكسر ضغط القفص وانتظر لحظة طرد الطلقة للهجوم.' },
      { id: 3, threshold: 0, name: 'نافذة الاستعادة', hint: 'يصبح ضعيفًا أثناء الاستدعاء أو بعد تحرير الطلقة مباشرة.' },
    ],
  },
  {
    id: 'rift-king',
    regionId: 'void',
    name: 'ملك الشقوق',
    title: 'سيد الفراغ المنهار',
    icon: '◎',
    color: '#b983ff',
    accent: '#62f3ff',
    maxHp: 34,
    reward: 200,
    masteryReward: 70,
    phases: [
      { id: 1, threshold: 0.66, name: 'بوابات الشق', hint: 'المقذوفات والطلقة تنتقل بين بوابات ظاهرة.' },
      { id: 2, threshold: 0.33, name: 'انقلاب الجاذبية', hint: 'مجال الفراغ يسحب ثم يدفع كل ما في الساحة.' },
      { id: 3, threshold: 0, name: 'تقسيم الحلبة', hint: 'الجدران الطيفية تقسم الساحة وتتبدل قبل الانهيار.' },
    ],
  },
]);

export function bossById(id) {
  return REGION_BOSSES.find((boss) => boss.id === id) || null;
}

export function bossByRegion(regionId) {
  return REGION_BOSSES.find((boss) => boss.regionId === regionId) || REGION_BOSSES[0];
}

export function bossPhaseForHealth(boss, hp, maxHp = boss?.maxHp || 1) {
  if (!boss) return 1;
  const ratio = Math.max(0, Number(hp) || 0) / Math.max(1, Number(maxHp) || 1);
  if (ratio > boss.phases[0].threshold) return 1;
  if (ratio > boss.phases[1].threshold) return 2;
  return 3;
}

export function createBossCombatState(regionId, options = {}) {
  const definition = bossByRegion(regionId);
  const healthMultiplier = Math.max(0.5, Number(options.healthMultiplier) || 1);
  const storyMultiplier = options.story ? 1.18 : 1;
  const maxHp = Math.round(definition.maxHp * healthMultiplier * storyMultiplier);
  return {
    bossId: definition.id,
    regionId: definition.regionId,
    definition,
    x: 640,
    y: 235,
    radius: definition.id === 'rift-king' ? 68 : 62,
    hp: maxHp,
    maxHp,
    phase: 1,
    previousPhase: 1,
    angle: 0,
    attackCooldown: 1.2,
    telegraph: 0,
    hitFlash: 0,
    dead: false,
    dashRemaining: 0,
    dashDirection: { x: 0, y: 0 },
    captureTimer: 0,
    captureCooldown: 2.8,
    vulnerableTimer: 0,
    controlInvertTimer: 0,
    controlInvertCooldown: 5.2,
    portalCooldown: 0,
    gravityPulse: 0,
    gravityDirection: 1,
    segmentTimer: 0,
    decoys: [],
    rewardSettled: false,
  };
}

export function createDefaultBossMastery() {
  const bosses = {};
  for (const boss of REGION_BOSSES) {
    bosses[boss.id] = {
      encounters: 0,
      victories: 0,
      bestTime: 0,
      highestDifficulty: '',
      noDamageWins: 0,
      firstVictoryAt: '',
    };
  }
  return { version: 1, bosses, totalVictories: 0, updatedAt: '' };
}

function safeInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0;
}

function safeTime(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

export function normalizeBossMastery(value) {
  const defaults = createDefaultBossMastery();
  const source = value && typeof value === 'object' ? value : {};
  for (const boss of REGION_BOSSES) {
    const item = source.bosses?.[boss.id] || {};
    defaults.bosses[boss.id] = {
      encounters: safeInteger(item.encounters),
      victories: safeInteger(item.victories),
      bestTime: safeTime(item.bestTime),
      highestDifficulty: ['recruit', 'hunter', 'corebreaker', 'one-hit'].includes(item.highestDifficulty) ? item.highestDifficulty : '',
      noDamageWins: safeInteger(item.noDamageWins),
      firstVictoryAt: typeof item.firstVictoryAt === 'string' ? item.firstVictoryAt : '',
    };
  }
  defaults.totalVictories = Object.values(defaults.bosses).reduce((sum, item) => sum + item.victories, 0);
  defaults.updatedAt = typeof source.updatedAt === 'string' ? source.updatedAt : '';
  return defaults;
}

const DIFFICULTY_RANK = Object.freeze({ recruit: 1, hunter: 2, corebreaker: 3, 'one-hit': 4 });

export function recordBossEncounter(input, bossId) {
  const mastery = normalizeBossMastery(input);
  if (!bossById(bossId)) return mastery;
  mastery.bosses[bossId].encounters += 1;
  mastery.updatedAt = new Date().toISOString();
  return mastery;
}

export function recordBossVictory(input, bossId, result = {}) {
  const mastery = normalizeBossMastery(input);
  const boss = bossById(bossId);
  if (!boss) return { mastery, reward: 0, firstVictory: false };
  const entry = mastery.bosses[bossId];
  const firstVictory = entry.victories === 0;
  entry.victories += 1;
  const time = safeTime(result.time);
  if (time > 0 && (entry.bestTime === 0 || time < entry.bestTime)) entry.bestTime = time;
  const difficulty = DIFFICULTY_RANK[result.difficultyId] ? result.difficultyId : 'hunter';
  if ((DIFFICULTY_RANK[difficulty] || 0) > (DIFFICULTY_RANK[entry.highestDifficulty] || 0)) entry.highestDifficulty = difficulty;
  if (safeInteger(result.damageTaken) === 0) entry.noDamageWins += 1;
  if (firstVictory) entry.firstVictoryAt = new Date().toISOString();
  mastery.totalVictories = Object.values(mastery.bosses).reduce((sum, item) => sum + item.victories, 0);
  mastery.updatedAt = new Date().toISOString();
  return {
    mastery,
    firstVictory,
    reward: boss.reward + (firstVictory ? boss.masteryReward : 0),
  };
}
