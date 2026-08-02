export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const TOTAL_WAVES = 5;

export const UPGRADES = [
  { id: 'heavy-core', name: 'النواة الثقيلة', tag: 'قوة خام', description: 'يزيد ضرر الطلقة، لكن سرعتها تقل قليلًا.', maxStacks: 2 },
  { id: 'hot-ricochet', name: 'الارتداد الملتهب', tag: 'زوايا قاتلة', description: 'كل ارتداد عن جدار يزيد ضرر الطلقة الحالية.', maxStacks: 3 },
  { id: 'magnetic-recall', name: 'الاستدعاء المغناطيسي', tag: 'تحكم', description: 'اضغط Q لاستدعاء الطلقة إليك بعد مهلة قصيرة.', maxStacks: 2 },
  { id: 'shock-impact', name: 'الصدمة الكهربائية', tag: 'ضرر جماعي', description: 'كل إصابة تطلق موجة كهربائية تضر الأعداء القريبين.', maxStacks: 2 },
  { id: 'extended-charge', name: 'شحنة ممتدة', tag: 'مسار أطول', description: 'تمنح الطلقة ارتدادات إضافية قبل أن تفقد طاقتها.', maxStacks: 3 },
  { id: 'quick-recovery', name: 'استعادة خاطفة', tag: 'سرعة', description: 'تقلل انتظار الاندفاع وتزيد نطاق التقاط الطلقة.', maxStacks: 3 },
  { id: 'last-heart', name: 'نبضة القلب الأخير', tag: 'مجازفة', description: 'عند بقاء قلب واحد، تتضاعف قوة الطلقة.', maxStacks: 1 },
  { id: 'perfect-catch', name: 'الالتقاط المثالي', tag: 'مهارة', description: 'التقاط الطلقة وهي سريعة يمنح درعًا مؤقتًا ونقاطًا إضافية.', maxStacks: 2 },
];

const ARENAS = {
  open: {
    id: 'open', name: 'الساحة المفتوحة', subtitle: 'تعلم المسافة وتوقيت الاستعادة', obstacles: [], hazards: [], nodes: [],
  },
  corridor: {
    id: 'corridor', name: 'الممر المزدوج', subtitle: 'حوّل الجدران إلى سلاح',
    obstacles: [
      { x: 360, y: 150, w: 55, h: 420, kind: 'solid' },
      { x: 865, y: 150, w: 55, h: 420, kind: 'solid' },
      { x: 610, y: 85, w: 60, h: 135, kind: 'breakable', hp: 2 },
      { x: 610, y: 500, w: 60, h: 135, kind: 'breakable', hp: 2 },
    ], hazards: [], nodes: [],
  },
  cross: {
    id: 'cross', name: 'تقاطع الصيادين', subtitle: 'الخط المستقيم أخطر طريق',
    obstacles: [
      { x: 540, y: 245, w: 200, h: 45, kind: 'solid' },
      { x: 540, y: 430, w: 200, h: 45, kind: 'solid' },
      { x: 455, y: 310, w: 45, h: 100, kind: 'solid' },
      { x: 780, y: 310, w: 45, h: 100, kind: 'solid' },
    ],
    hazards: [{ x: 600, y: 310, w: 80, h: 100, damageInterval: 0.75 }], nodes: [],
  },
  reactor: {
    id: 'reactor', name: 'غرفة المفاعل', subtitle: 'فجّر النواة في اللحظة المناسبة',
    obstacles: [
      { x: 250, y: 190, w: 70, h: 130, kind: 'breakable', hp: 3 },
      { x: 960, y: 400, w: 70, h: 130, kind: 'breakable', hp: 3 },
      { x: 250, y: 400, w: 70, h: 130, kind: 'solid' },
      { x: 960, y: 190, w: 70, h: 130, kind: 'solid' },
    ],
    hazards: [
      { x: 505, y: 0, w: 46, h: 245, damageInterval: 0.8 },
      { x: 729, y: 475, w: 46, h: 245, damageInterval: 0.8 },
    ],
    nodes: [
      { x: 520, y: 360, radius: 22, blastRadius: 150 },
      { x: 760, y: 360, radius: 22, blastRadius: 150 },
    ],
  },
  cage: {
    id: 'cage', name: 'قفص الارتدادات', subtitle: 'كل زاوية تحمل فرصة أو فخًا',
    obstacles: [
      { x: 200, y: 155, w: 250, h: 36, kind: 'solid' },
      { x: 830, y: 155, w: 250, h: 36, kind: 'solid' },
      { x: 200, y: 529, w: 250, h: 36, kind: 'solid' },
      { x: 830, y: 529, w: 250, h: 36, kind: 'solid' },
      { x: 612, y: 220, w: 56, h: 110, kind: 'breakable', hp: 3 },
      { x: 612, y: 390, w: 56, h: 110, kind: 'breakable', hp: 3 },
    ],
    hazards: [
      { x: 0, y: 330, w: 170, h: 60, damageInterval: 0.7 },
      { x: 1110, y: 330, w: 170, h: 60, damageInterval: 0.7 },
    ],
    nodes: [{ x: 640, y: 360, radius: 24, blastRadius: 170 }],
  },
  core: {
    id: 'core', name: 'قلب الحارس', subtitle: 'لا تخترق الدرع إلا طلقة مرتدة',
    obstacles: [
      { x: 250, y: 170, w: 55, h: 130, kind: 'solid' },
      { x: 975, y: 170, w: 55, h: 130, kind: 'solid' },
      { x: 250, y: 420, w: 55, h: 130, kind: 'solid' },
      { x: 975, y: 420, w: 55, h: 130, kind: 'solid' },
      { x: 535, y: 90, w: 210, h: 34, kind: 'solid' },
      { x: 535, y: 596, w: 210, h: 34, kind: 'solid' },
    ], hazards: [], nodes: [],
  },
};

const WAVE_ARENAS = ['open', 'corridor', 'cross', 'reactor', 'cage'];

export function createArenaState(id) {
  const source = ARENAS[id] || ARENAS.open;
  return {
    ...source,
    obstacles: source.obstacles.map((item, index) => ({ ...item, id: `${source.id}-obstacle-${index}`, maxHp: item.hp || 0, hitFlash: 0 })),
    hazards: source.hazards.map((item, index) => ({ ...item, id: `${source.id}-hazard-${index}`, pulse: index * 0.8 })),
    nodes: source.nodes.map((item, index) => ({ ...item, id: `${source.id}-node-${index}`, active: true })),
  };
}

export function arenaForWave(wave) {
  return createArenaState(WAVE_ARENAS[Math.max(0, Math.min(WAVE_ARENAS.length - 1, wave - 1))]);
}

export function bossArena() { return createArenaState('core'); }

export function pickUpgradeChoices(stacks, count = 3, random = Math.random) {
  const available = UPGRADES.filter((upgrade) => (stacks[upgrade.id] || 0) < upgrade.maxStacks);
  const pool = [...available];
  const selected = [];
  while (pool.length > 0 && selected.length < count) {
    const index = Math.floor(random() * pool.length);
    selected.push(pool.splice(index, 1)[0]);
  }
  return selected;
}

export function upgradeById(id) { return UPGRADES.find((upgrade) => upgrade.id === id) || null; }
