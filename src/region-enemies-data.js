export const ENEMY_CODEX_STORAGE_KEY = 'one-bullet-arena-enemy-codex-v1';

export const REGION_ENEMIES = Object.freeze([
  {
    id: 'shield-drone',
    regionId: 'forge',
    baseType: 'brute',
    name: 'طائرة الدرع',
    shortName: 'الدرع',
    icon: '⬒',
    color: '#62f3ff',
    radius: 25,
    speed: 70,
    hp: 4.2,
    score: 390,
    description: 'وحدة مدرعة توجه لوحًا طاقيًا نحو اللاعب وتصد الضربات الأمامية غير المرتدة.',
    behavior: 'تحمي واجهتها وتواصل التقدم ببطء لفتح مساحة لباقي وحدات المسبك.',
    counter: 'اضربها من الخلف أو استخدم طلقة ارتدت عن جدار لتجاوز الدرع.',
    recommendedCores: ['ricochet', 'recall'],
  },
  {
    id: 'furnace-brute',
    regionId: 'forge',
    baseType: 'brute',
    name: 'وحش الفرن',
    shortName: 'الفرن',
    icon: '⬢',
    color: '#ff7a3d',
    radius: 29,
    speed: 66,
    hp: 5.2,
    score: 470,
    description: 'وحدة ثقيلة شديدة الحرارة تترك مناطق حارقة مؤقتة أثناء المطاردة وعند تدميرها.',
    behavior: 'تضغط على المساحة الآمنة وتجبر اللاعب على تغيير موقعه باستمرار.',
    counter: 'حافظ على المسافة، واستخدم العوائق والارتداد لضربها دون دخول مناطق الحرارة.',
    recommendedCores: ['heavy', 'ricochet'],
  },
  {
    id: 'magnet-unit',
    regionId: 'forge',
    baseType: 'sniper',
    name: 'وحدة المغناطيس',
    shortName: 'المغناطيس',
    icon: '∩',
    color: '#ffd166',
    radius: 21,
    speed: 57,
    hp: 2.8,
    score: 350,
    description: 'مولد مغناطيسي يغير مسار الطلقة الحرة ويجذبها نحو مركزه عندما تدخل مداه.',
    behavior: 'يفسد الزوايا الآمنة ويحوّل مسار الاستعادة إلى مخاطرة.',
    counter: 'اقضِ عليه مبكرًا أو استخدم الاستدعاء قبل دخول الطلقة مجال الجذب.',
    recommendedCores: ['recall', 'heavy'],
  },
  {
    id: 'repair-bot',
    regionId: 'forge',
    baseType: 'scout',
    name: 'روبوت الإصلاح',
    shortName: 'الإصلاح',
    icon: '✚',
    color: '#53f2a1',
    radius: 19,
    speed: 92,
    hp: 2.2,
    score: 330,
    description: 'وحدة دعم تتجه إلى الحلفاء المتضررين وتعيد جزءًا من صحتهم على فترات.',
    behavior: 'تطيل المواجهة وتحول الأعداء الثقيلة إلى تهديد مستمر.',
    counter: 'اجعله هدفك الأول أو افصل بينه وبين الوحدات الثقيلة.',
    recommendedCores: ['shock', 'ricochet'],
  },
  {
    id: 'phase-walker',
    regionId: 'void',
    baseType: 'scout',
    name: 'سائر الطور',
    shortName: 'الطور',
    icon: '◈',
    color: '#c49bff',
    radius: 19,
    speed: 112,
    hp: 2.1,
    score: 360,
    description: 'كائن غير مستقر يختفي لفترة قصيرة ثم يظهر في نقطة جديدة حول اللاعب.',
    behavior: 'يقطع المسافات فجأة ويبدل اتجاه التهديد أثناء التصويب.',
    counter: 'انتظر اكتمال الظهور قبل إطلاق الطلقة، ولا تهدرها أثناء حالة الطور.',
    recommendedCores: ['standard', 'shock'],
  },
  {
    id: 'rift-sniper',
    regionId: 'void',
    baseType: 'sniper',
    name: 'قناص الشق',
    shortName: 'قناص الشق',
    icon: '⌾',
    color: '#b983ff',
    radius: 21,
    speed: 54,
    hp: 2.6,
    score: 420,
    description: 'قناص يفتح شقًا صغيرًا ويطلق المقذوف من نقطة أخرى داخل الساحة.',
    behavior: 'يكسر توقع خط النار ويعاقب الوقوف خلف العوائق الثابتة.',
    counter: 'راقب علامة الخروج البنفسجية وتحرك عرضيًا قبل اكتمال الإطلاق.',
    recommendedCores: ['recall', 'standard'],
  },
  {
    id: 'gravity-orb',
    regionId: 'void',
    baseType: 'brute',
    name: 'جرم الجاذبية',
    shortName: 'الجاذبية',
    icon: '◎',
    color: '#8f7cff',
    radius: 27,
    speed: 52,
    hp: 4.5,
    score: 460,
    description: 'جرم كثيف يولد مجال جذب يؤثر في اللاعب والطلقة عند الاقتراب منه.',
    behavior: 'يسحب الحركة ومسار الطلقة نحو مركزه ويضيق مساحة المناورة.',
    counter: 'ابقَ خارج الحلقة المرئية واضربه من زوايا بعيدة أو بطلقة ثقيلة.',
    recommendedCores: ['heavy', 'ricochet'],
  },
  {
    id: 'mirror-drone',
    regionId: 'void',
    baseType: 'charger',
    name: 'طائرة المرآة',
    shortName: 'المرآة',
    icon: '◇',
    color: '#ff8de1',
    radius: 22,
    speed: 76,
    hp: 3,
    score: 440,
    description: 'سطح عاكس يدير الطلقة المباشرة بزاوية جديدة ولا ينكشف إلا بعد ارتدادها.',
    behavior: 'يحول الطلقة إلى خطر متحرك ويغير خط الاستعادة المتوقع.',
    counter: 'استخدم الجدار أولًا ثم أصب المرآة بطلقة مرتدة لتجاوز الانعكاس.',
    recommendedCores: ['ricochet', 'shock'],
  },
]);

export const REGION_ENEMY_IDS = Object.freeze(REGION_ENEMIES.map((enemy) => enemy.id));

export function regionEnemyById(id) {
  return REGION_ENEMIES.find((enemy) => enemy.id === id) || null;
}

export function regionEnemiesForRegion(regionId) {
  return REGION_ENEMIES.filter((enemy) => enemy.regionId === regionId);
}

export function isRegionEnemy(id) {
  return Boolean(regionEnemyById(id));
}

export function createDefaultEnemyCodex() {
  return { version: 1, entries: {}, updatedAt: new Date(0).toISOString() };
}

function safeCount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0;
}

export function normalizeEnemyCodex(value) {
  const source = value && typeof value === 'object' ? value : {};
  const entries = {};
  for (const enemy of REGION_ENEMIES) {
    const item = source.entries?.[enemy.id];
    if (!item || typeof item !== 'object') continue;
    entries[enemy.id] = {
      discoveredAt: String(item.discoveredAt || new Date(0).toISOString()),
      encounters: safeCount(item.encounters),
      kills: safeCount(item.kills),
    };
  }
  return {
    version: 1,
    entries,
    updatedAt: String(source.updatedAt || new Date(0).toISOString()),
  };
}

export function discoverCodexEnemy(input, enemyId, now = new Date().toISOString()) {
  const codex = normalizeEnemyCodex(input);
  const enemy = regionEnemyById(enemyId);
  if (!enemy) return { codex, discovered: false };
  const existing = codex.entries[enemyId];
  codex.entries[enemyId] = {
    discoveredAt: existing?.discoveredAt || now,
    encounters: safeCount(existing?.encounters) + 1,
    kills: safeCount(existing?.kills),
  };
  codex.updatedAt = now;
  return { codex, discovered: !existing };
}

export function recordCodexKill(input, enemyId, now = new Date().toISOString()) {
  const discovered = discoverCodexEnemy(input, enemyId, now).codex;
  discovered.entries[enemyId].encounters = Math.max(1, discovered.entries[enemyId].encounters - 1);
  discovered.entries[enemyId].kills += 1;
  discovered.updatedAt = now;
  return discovered;
}

export function codexCompletion(input) {
  const codex = normalizeEnemyCodex(input);
  const discovered = REGION_ENEMY_IDS.filter((id) => Boolean(codex.entries[id])).length;
  return { discovered, total: REGION_ENEMY_IDS.length, ratio: discovered / REGION_ENEMY_IDS.length };
}

const FORGE_WAVES = Object.freeze([
  ['scout', 'scout', 'shield-drone'],
  ['scout', 'brute', 'shield-drone', 'furnace-brute'],
  ['scout', 'sniper', 'shield-drone', 'magnet-unit', 'repair-bot'],
  ['brute', 'charger', 'furnace-brute', 'shield-drone', 'magnet-unit', 'repair-bot'],
  ['scout', 'brute', 'sniper', 'shield-drone', 'furnace-brute', 'magnet-unit', 'repair-bot', 'repair-bot'],
]);

const VOID_WAVES = Object.freeze([
  ['scout', 'scout', 'phase-walker'],
  ['splitter', 'scout', 'phase-walker', 'rift-sniper'],
  ['sniper', 'charger', 'phase-walker', 'gravity-orb', 'rift-sniper'],
  ['splitter', 'charger', 'gravity-orb', 'mirror-drone', 'phase-walker', 'rift-sniper'],
  ['scout', 'sniper', 'splitter', 'phase-walker', 'rift-sniper', 'gravity-orb', 'mirror-drone', 'mirror-drone'],
]);

export function regionEnemyComposition(regionId, wave, modeId = 'region') {
  const safeWave = Math.max(1, Math.trunc(Number(wave) || 1));
  const localWave = modeId === 'story' ? ((safeWave - 1) % 4) + 1 : Math.min(5, safeWave);
  const waves = regionId === 'forge' ? FORGE_WAVES : regionId === 'void' ? VOID_WAVES : null;
  return waves ? [...waves[localWave - 1]] : null;
}
