export const BUILD_CODEX_STORAGE_KEY = 'one-bullet-arena-build-codex-v1';

export const OVERDRIVE_BY_CORE = Object.freeze({
  standard: { id: 'standard', name: 'تزامن النواة', duration: 6, color: '#62f3ff', description: 'سرعة الطلقة وضررها والتحكم بها ترتفع مؤقتًا.' },
  ricochet: { id: 'ricochet', name: 'سيادة الزوايا', duration: 6, color: '#ffe66d', description: 'كل ارتداد يضيف ضررًا مضاعفًا خلال الحالة.' },
  heavy: { id: 'heavy', name: 'صدمة الحصار', duration: 5.5, color: '#ff9f43', description: 'الإصابات تطلق موجة صادمة وتدفع الأعداء.' },
  shock: { id: 'shock', name: 'عاصفة متسلسلة', duration: 6.5, color: '#b983ff', description: 'الشرارات تنتقل لمسافة أكبر وبين أهداف أكثر.' },
  recall: { id: 'recall', name: 'طريق العودة', duration: 7, color: '#53f2a1', description: 'مسار الاستدعاء أسرع ويسبب ضررًا مضاعفًا.' },
});

export const RELICS = Object.freeze([
  { id: 'pocket-mirror', name: 'مرآة الجيب', rarity: 'rare', effect: 'first-bounce-aim', value: 1, description: 'أول ارتداد بعد الاستعادة يعيد توجيه الطلقة نحو أقرب عدو.' },
  { id: 'pursuit-heart', name: 'قلب المطاردة', rarity: 'rare', effect: 'distance-damage', value: 0.45, description: 'يزداد الضرر كلما ابتعدت الطلقة عن اللاعب.' },
  { id: 'return-engine', name: 'محرك العودة', rarity: 'epic', effect: 'recall-pull', value: 95, description: 'الاستدعاء يسحب الأعداء الصغار نحو مسار الطلقة.' },
  { id: 'hunter-oath', name: 'قسم الصياد', rarity: 'epic', effect: 'elite-overdrive', value: 100, description: 'قتل Elite يعيد شحن Overdrive بالكامل.' },
  { id: 'collapse-core', name: 'نواة الانهيار', rarity: 'legendary', effect: 'power-slow', value: 0.7, description: 'ضرر أعلى كثيرًا، لكن كل إطلاق يبطئ الحركة لحظيًا.' },
  { id: 'glass-angle', name: 'زاوية زجاجية', rarity: 'common', effect: 'bounce-damage', value: 0.14, description: 'كل ارتداد يضيف ضررًا صغيرًا.' },
  { id: 'kinetic-loop', name: 'حلقة حركية', rarity: 'rare', effect: 'ricochet-charge', value: 6, description: 'الارتدادات تشحن Overdrive أسرع.' },
  { id: 'perfect-shell', name: 'قشرة مثالية', rarity: 'rare', effect: 'perfect-shield', value: 1, description: 'الالتقاط المثالي يمنح درعًا إضافيًا.' },
  { id: 'dash-capacitor', name: 'مكثف الاندفاع', rarity: 'common', effect: 'dash-charge', value: 8, description: 'الاندفاع الناجح يشحن Overdrive.' },
  { id: 'bloodless-victory', name: 'نصر بلا دم', rarity: 'epic', effect: 'no-damage-energy', value: 30, description: 'إنهاء مواجهة دون ضرر يمنح طاقة مكسورة إضافية.' },
  { id: 'storm-filament', name: 'خيط العاصفة', rarity: 'rare', effect: 'shock-range', value: 70, description: 'يزيد مدى وتأثير الكهرباء.' },
  { id: 'siege-fragment', name: 'شظية الحصار', rarity: 'epic', effect: 'heavy-explosion', value: 85, description: 'إصابات النواة الثقيلة تطلق انفجارًا محدودًا.' },
  { id: 'green-thread', name: 'الخيط الأخضر', rarity: 'common', effect: 'recall-speed', value: 150, description: 'سرعة الاستدعاء أعلى.' },
  { id: 'last-spark', name: 'الشرارة الأخيرة', rarity: 'rare', effect: 'low-health-damage', value: 0.5, description: 'يزداد الضرر عند بقاء قلب واحد.' },
  { id: 'boss-lens', name: 'عدسة الحارس', rarity: 'epic', effect: 'boss-damage', value: 0.25, description: 'ضرر إضافي ضد الزعماء.' },
  { id: 'fracture-tax', name: 'ضريبة الشق', rarity: 'common', effect: 'energy-gain', value: 0.15, description: 'مكافآت الطاقة المكسورة أعلى.' },
  { id: 'echo-chamber', name: 'غرفة الصدى', rarity: 'rare', effect: 'multi-kill-charge', value: 12, description: 'القتل المتتالي يشحن Overdrive بسرعة.' },
  { id: 'cold-trajectory', name: 'المسار البارد', rarity: 'common', effect: 'enemy-shot-slow', value: 0.1, description: 'مقذوفات الأعداء أبطأ قليلًا.' },
  { id: 'repair-seed', name: 'بذرة الإصلاح', rarity: 'epic', effect: 'kill-heal', value: 18, description: 'كل عدد محدد من القتلات يعيد قلبًا.' },
  { id: 'void-anchor', name: 'مرساة الفراغ', rarity: 'rare', effect: 'gravity-resist', value: 0.45, description: 'يقل تأثير الجاذبية والسحب على اللاعب والطلقة.' },
  { id: 'mirror-teeth', name: 'أسنان المرآة', rarity: 'rare', effect: 'reflected-damage', value: 0.35, description: 'الطلقة بعد الانعكاس أو الارتداد تسبب ضررًا أعلى.' },
  { id: 'redline-coil', name: 'ملف الخط الأحمر', rarity: 'epic', effect: 'overdrive-duration', value: 2, description: 'مدة Overdrive أطول.' },
  { id: 'silent-trigger', name: 'الزناد الصامت', rarity: 'common', effect: 'first-shot-damage', value: 0.4, description: 'أول إطلاق في كل مواجهة أقوى.' },
  { id: 'core-bank', name: 'بنك النواة', rarity: 'rare', effect: 'energy-interest', value: 12, description: 'كل عقدة غير قتالية تضيف طاقة مكسورة.' },
  { id: 'singularity-mark', name: 'علامة التفرد', rarity: 'legendary', effect: 'overdrive-chain', value: 1, description: 'القتل أثناء Overdrive يمدد الحالة قليلًا.' },
]);

export const ADVANCED_SYNERGIES = Object.freeze([
  { id: 'maze-master', name: 'سيد المتاهة', coreId: 'ricochet', relics: ['pocket-mirror', 'glass-angle', 'mirror-teeth'], description: 'أول ارتداد موجه وكل ارتداد يرفع الضرر بقوة.' },
  { id: 'storm-ring', name: 'حلقة العاصفة', coreId: 'shock', relics: ['storm-filament', 'echo-chamber'], description: 'السلاسل الأوسع تشحن Overdrive مع كل قتل متتالٍ.' },
  { id: 'return-hunter', name: 'صياد العودة', coreId: 'recall', relics: ['return-engine', 'green-thread'], description: 'الاستدعاء أسرع ويسحب الأعداء داخل مساره.' },
  { id: 'siege-core', name: 'نواة الحصار', coreId: 'heavy', relics: ['siege-fragment', 'boss-lens'], description: 'الضربات الثقيلة تنفجر وتكسر الزعماء أسرع.' },
  { id: 'critical-collapse', name: 'الانهيار الحرج', coreId: 'standard', relics: ['collapse-core', 'last-spark'], description: 'ضرر هائل عند القلب الأخير مقابل حركة أخطر.' },
  { id: 'perfect-engine', name: 'محرك الالتقاط', coreId: 'standard', relics: ['perfect-shell', 'kinetic-loop'], description: 'الالتقاط والارتدادات يصنعان دورة درع وطاقة.' },
]);

export function relicById(id) {
  return RELICS.find((relic) => relic.id === id) || null;
}

export function overdriveByCore(coreId) {
  return OVERDRIVE_BY_CORE[coreId] || OVERDRIVE_BY_CORE.standard;
}

function hashSeed(value) {
  let hash = 1779033703;
  for (const char of String(value || 'build')) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return hash >>> 0;
}

function randomFromSeed(seed) {
  let state = hashSeed(seed) || 1;
  return () => {
    state = Math.imul(state ^ (state >>> 16), 2246822507);
    state = Math.imul(state ^ (state >>> 13), 3266489909);
    state ^= state >>> 16;
    return (state >>> 0) / 4294967296;
  };
}

const RARITY_WEIGHT = Object.freeze({ common: 50, rare: 30, epic: 15, legendary: 5 });

export function createRelicChoices(seed, owned = [], count = 3) {
  const random = randomFromSeed(seed);
  const available = RELICS.filter((relic) => !owned.includes(relic.id));
  const result = [];
  while (available.length && result.length < count) {
    const weighted = available.flatMap((relic) => Array(Math.max(1, RARITY_WEIGHT[relic.rarity] || 1)).fill(relic));
    const chosen = weighted[Math.floor(random() * weighted.length)];
    result.push(chosen);
    available.splice(available.findIndex((relic) => relic.id === chosen.id), 1);
  }
  return result;
}

export function resolveAdvancedSynergies(coreId, relicIds = []) {
  const owned = new Set(relicIds);
  return ADVANCED_SYNERGIES.filter((synergy) => synergy.coreId === coreId && synergy.relics.every((id) => owned.has(id)));
}

export function createDefaultBuildCodex() {
  return {
    version: 1,
    discoveredRelics: [],
    discoveredSynergies: [],
    relicPickCounts: {},
    overdriveActivations: 0,
    updatedAt: '',
  };
}

export function normalizeBuildCodex(value) {
  const source = value && typeof value === 'object' ? value : {};
  const validRelics = new Set(RELICS.map((relic) => relic.id));
  const validSynergies = new Set(ADVANCED_SYNERGIES.map((synergy) => synergy.id));
  const discoveredRelics = Array.isArray(source.discoveredRelics)
    ? [...new Set(source.discoveredRelics.filter((id) => validRelics.has(id)))]
    : [];
  const discoveredSynergies = Array.isArray(source.discoveredSynergies)
    ? [...new Set(source.discoveredSynergies.filter((id) => validSynergies.has(id)))]
    : [];
  const relicPickCounts = {};
  for (const [id, count] of Object.entries(source.relicPickCounts || {})) {
    if (validRelics.has(id)) relicPickCounts[id] = Math.max(0, Math.trunc(Number(count) || 0));
  }
  return {
    version: 1,
    discoveredRelics,
    discoveredSynergies,
    relicPickCounts,
    overdriveActivations: Math.max(0, Math.trunc(Number(source.overdriveActivations) || 0)),
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : '',
  };
}

export function recordRelicDiscovery(input, relicId) {
  const codex = normalizeBuildCodex(input);
  if (!relicById(relicId)) return codex;
  if (!codex.discoveredRelics.includes(relicId)) codex.discoveredRelics.push(relicId);
  codex.relicPickCounts[relicId] = (codex.relicPickCounts[relicId] || 0) + 1;
  codex.updatedAt = new Date().toISOString();
  return codex;
}

export function recordSynergyDiscovery(input, synergyIds = []) {
  const codex = normalizeBuildCodex(input);
  const valid = new Set(ADVANCED_SYNERGIES.map((synergy) => synergy.id));
  for (const id of synergyIds) if (valid.has(id) && !codex.discoveredSynergies.includes(id)) codex.discoveredSynergies.push(id);
  codex.updatedAt = new Date().toISOString();
  return codex;
}
