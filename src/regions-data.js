export const MISSION_STORAGE_KEY = 'one-bullet-arena-mission-v1';

export const REGIONS = Object.freeze([
  {
    id: 'neon',
    name: 'حي النواة النيوني',
    shortName: 'النيون',
    subtitle: 'ليزر، ممرات دقيقة، وبوابات تعيد رسم مسار الطلقة.',
    color: '#62f3ff',
    icon: '◇',
  },
  {
    id: 'forge',
    name: 'مسبك المفاعل',
    shortName: 'المسبك',
    subtitle: 'سيور ناقلة، فتحات حرارية، وعوائق صناعية قابلة للكسر.',
    color: '#ff9f43',
    icon: '⬢',
  },
  {
    id: 'void',
    name: 'دائرة الفراغ',
    shortName: 'الفراغ',
    subtitle: 'آبار جاذبية وبوابات شقوق تغير موضع الطلقة.',
    color: '#b983ff',
    icon: '◎',
  },
]);

export const RUN_MODES = Object.freeze([
  {
    id: 'region',
    name: 'مهمة منطقة',
    description: 'خمس موجات ثم حارس المنطقة. مدة مستهدفة 8–14 دقيقة.',
    waves: 5,
  },
  {
    id: 'story',
    name: 'المسار القصصي',
    description: 'اثنتا عشرة موجة عبر المناطق الثلاث ثم المواجهة النهائية.',
    waves: 12,
  },
]);

export const DIFFICULTIES = Object.freeze([
  {
    id: 'recruit',
    name: 'مبتدئ',
    description: 'أربعة قلوب وأعداء أبطأ قليلًا.',
    enemyHealth: 0.85,
    enemySpeed: 0.9,
    enemyScore: 0.85,
    rewardMultiplier: 1,
    playerHealth: 4,
  },
  {
    id: 'hunter',
    name: 'صياد',
    description: 'التوازن القياسي المصمم للجولة الأساسية.',
    enemyHealth: 1,
    enemySpeed: 1,
    enemyScore: 1,
    rewardMultiplier: 1,
    playerHealth: 3,
  },
  {
    id: 'corebreaker',
    name: 'كاسر النواة',
    description: 'أعداء أسرع وأقوى مع مكافآت شظايا إضافية.',
    enemyHealth: 1.35,
    enemySpeed: 1.16,
    enemyScore: 1.3,
    rewardMultiplier: 1.3,
    playerHealth: 3,
  },
  {
    id: 'one-hit',
    name: 'بروتوكول الضربة الواحدة',
    description: 'قلب واحد فقط، ضغط أعلى، ومكافأة مخاطرة كبيرة.',
    enemyHealth: 1.5,
    enemySpeed: 1.23,
    enemyScore: 1.55,
    rewardMultiplier: 1.65,
    playerHealth: 1,
  },
]);

export const DEFAULT_MISSION = Object.freeze({
  modeId: 'region',
  regionId: 'neon',
  difficultyId: 'hunter',
});

function findById(list, id, fallback) {
  return list.find((item) => item.id === id) || fallback;
}

export function regionById(id) {
  return findById(REGIONS, id, REGIONS[0]);
}

export function modeById(id) {
  return findById(RUN_MODES, id, RUN_MODES[0]);
}

export function difficultyById(id) {
  return findById(DIFFICULTIES, id, DIFFICULTIES[1]);
}

export function normalizeMission(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    modeId: modeById(source.modeId).id,
    regionId: regionById(source.regionId).id,
    difficultyId: difficultyById(source.difficultyId).id,
  };
}

export function totalWavesForMission(mission) {
  return modeById(normalizeMission(mission).modeId).waves;
}

export function regionIdForWave(mission, wave) {
  const normalized = normalizeMission(mission);
  if (normalized.modeId !== 'story') return normalized.regionId;
  const safeWave = Math.max(1, Math.trunc(Number(wave) || 1));
  if (safeWave <= 4) return 'neon';
  if (safeWave <= 8) return 'forge';
  return 'void';
}

function obstacle(x, y, w, h, kind = 'solid', hp = 0) {
  return { x, y, w, h, kind, ...(hp ? { hp } : {}) };
}

function hazard(x, y, w, h, damageInterval = 0.85) {
  return { x, y, w, h, damageInterval };
}

function node(x, y, radius = 22, blastRadius = 150) {
  return { x, y, radius, blastRadius };
}

function neonLayout(index) {
  const layouts = [
    {
      name: 'بوابة النيون', subtitle: 'تعلم البوابات قبل أن يبدأ الضغط',
      obstacles: [obstacle(410, 180, 38, 360), obstacle(832, 180, 38, 360)],
      hazards: [], nodes: [],
      effects: { portals: [{ x: 260, y: 360, pair: 1 }, { x: 1020, y: 360, pair: 0 }] },
    },
    {
      name: 'ممر الليزر', subtitle: 'المساحات الآمنة تتغير مع زاوية الهجوم',
      obstacles: [obstacle(560, 130, 55, 170, 'breakable', 2), obstacle(665, 420, 55, 170, 'breakable', 2)],
      hazards: [hazard(0, 318, 250, 34), hazard(1030, 368, 250, 34)], nodes: [], effects: {},
    },
    {
      name: 'شبكة التحويل', subtitle: 'استخدم البوابة لبناء ارتداد غير متوقع',
      obstacles: [obstacle(330, 245, 180, 42), obstacle(770, 430, 180, 42)],
      hazards: [], nodes: [node(640, 360)],
      effects: { portals: [{ x: 270, y: 560, pair: 1 }, { x: 1010, y: 160, pair: 0 }] },
    },
    {
      name: 'الحاجز المتقاطع', subtitle: 'الليزر يقسم الساحة إلى قرارات سريعة',
      obstacles: [obstacle(605, 90, 70, 180, 'breakable', 3), obstacle(605, 450, 70, 180, 'breakable', 3)],
      hazards: [hazard(350, 338, 580, 44)], nodes: [node(215, 150), node(1065, 570)], effects: {},
    },
    {
      name: 'قلب الحي', subtitle: 'آخر اختبار قبل الحارس',
      obstacles: [obstacle(230, 170, 60, 150), obstacle(990, 170, 60, 150), obstacle(230, 400, 60, 150), obstacle(990, 400, 60, 150)],
      hazards: [hazard(590, 0, 40, 200), hazard(650, 520, 40, 200)], nodes: [node(640, 360, 24, 170)],
      effects: { portals: [{ x: 400, y: 360, pair: 1 }, { x: 880, y: 360, pair: 0 }] },
    },
  ];
  return layouts[index % layouts.length];
}

function forgeLayout(index) {
  const layouts = [
    {
      name: 'خط التجميع', subtitle: 'السيور تدفع كل شيء فوقها',
      obstacles: [obstacle(350, 170, 55, 380), obstacle(875, 170, 55, 380)], hazards: [], nodes: [],
      effects: { conveyors: [{ x: 430, y: 250, w: 420, h: 70, vx: 90, vy: 0 }, { x: 430, y: 410, w: 420, h: 70, vx: -90, vy: 0 }] },
    },
    {
      name: 'غرفة الضغط', subtitle: 'فتحات الحرارة تعاقب الوقوف في المنتصف',
      obstacles: [obstacle(260, 180, 90, 120, 'breakable', 3), obstacle(930, 420, 90, 120, 'breakable', 3)],
      hazards: [hazard(560, 0, 55, 270), hazard(665, 450, 55, 270)], nodes: [], effects: {},
    },
    {
      name: 'المكابس', subtitle: 'مسارات قصيرة وحواف قابلة للكسر',
      obstacles: [obstacle(470, 170, 70, 210), obstacle(740, 340, 70, 210), obstacle(600, 300, 80, 120, 'breakable', 4)],
      hazards: [], nodes: [node(220, 530), node(1060, 190)],
      effects: { conveyors: [{ x: 80, y: 325, w: 1120, h: 65, vx: 70, vy: 0 }] },
    },
    {
      name: 'قناة التبريد', subtitle: 'الحرارة والسيور يصنعان مسارًا متغيرًا',
      obstacles: [obstacle(300, 145, 50, 430), obstacle(930, 145, 50, 430)],
      hazards: [hazard(0, 320, 230, 60), hazard(1050, 320, 230, 60)], nodes: [node(640, 360)],
      effects: { conveyors: [{ x: 380, y: 150, w: 520, h: 60, vx: -80, vy: 0 }, { x: 380, y: 510, w: 520, h: 60, vx: 80, vy: 0 }] },
    },
    {
      name: 'نواة المسبك', subtitle: 'دمر الحواجز وافتح زاوية الحسم',
      obstacles: [obstacle(420, 220, 80, 280, 'breakable', 4), obstacle(780, 220, 80, 280, 'breakable', 4)],
      hazards: [hazard(600, 0, 80, 190), hazard(600, 530, 80, 190)], nodes: [node(640, 360, 27, 185)], effects: {},
    },
  ];
  return layouts[index % layouts.length];
}

function voidLayout(index) {
  const layouts = [
    {
      name: 'مدخل الشق', subtitle: 'الجاذبية تسحب اللاعب والطلقة معًا',
      obstacles: [obstacle(350, 250, 55, 220), obstacle(875, 250, 55, 220)], hazards: [], nodes: [],
      effects: { gravityWells: [{ x: 640, y: 360, radius: 165, strength: 80 }] },
    },
    {
      name: 'المرآة المكسورة', subtitle: 'البوابات تعكس اتجاه المواجهة',
      obstacles: [obstacle(520, 170, 240, 42), obstacle(520, 508, 240, 42)], hazards: [], nodes: [],
      effects: { portals: [{ x: 190, y: 190, pair: 1 }, { x: 1090, y: 530, pair: 0 }], gravityWells: [{ x: 640, y: 360, radius: 120, strength: -55 }] },
    },
    {
      name: 'الحقل المنهار', subtitle: 'آبار متعاكسة تغير سرعة الاقتراب',
      obstacles: [obstacle(590, 280, 100, 160, 'breakable', 3)], hazards: [], nodes: [node(640, 360)],
      effects: { gravityWells: [{ x: 310, y: 360, radius: 170, strength: 95 }, { x: 970, y: 360, radius: 170, strength: -70 }] },
    },
    {
      name: 'مدار الصمت', subtitle: 'المركز يدفعك للخارج والبوابات تعيد الطلقة',
      obstacles: [obstacle(340, 165, 50, 390), obstacle(890, 165, 50, 390)], hazards: [hazard(590, 315, 100, 90)], nodes: [],
      effects: { portals: [{ x: 260, y: 360, pair: 1 }, { x: 1020, y: 360, pair: 0 }], gravityWells: [{ x: 640, y: 360, radius: 190, strength: -90 }] },
    },
    {
      name: 'قلب الفراغ', subtitle: 'كل القوى تعمل في مساحة واحدة',
      obstacles: [obstacle(250, 170, 55, 130), obstacle(975, 170, 55, 130), obstacle(250, 420, 55, 130), obstacle(975, 420, 55, 130)],
      hazards: [], nodes: [node(640, 360, 25, 175)],
      effects: { portals: [{ x: 420, y: 160, pair: 1 }, { x: 860, y: 560, pair: 0 }], gravityWells: [{ x: 640, y: 360, radius: 155, strength: 110 }] },
    },
  ];
  return layouts[index % layouts.length];
}

function cloneArena(regionId, layout, wave) {
  const region = regionById(regionId);
  const prefix = `${regionId}-${wave}`;
  return {
    id: `${prefix}-arena`,
    regionId,
    name: layout.name,
    subtitle: layout.subtitle,
    regionName: region.name,
    regionColor: region.color,
    obstacles: (layout.obstacles || []).map((item, index) => ({
      ...item,
      id: `${prefix}-obstacle-${index}`,
      maxHp: item.hp || 0,
      hitFlash: 0,
    })),
    hazards: (layout.hazards || []).map((item, index) => ({ ...item, id: `${prefix}-hazard-${index}`, pulse: index * 0.8 })),
    nodes: (layout.nodes || []).map((item, index) => ({ ...item, id: `${prefix}-node-${index}`, active: true })),
    effects: {
      portals: (layout.effects?.portals || []).map((item, index) => ({ ...item, id: `${prefix}-portal-${index}`, radius: 25 })),
      conveyors: (layout.effects?.conveyors || []).map((item, index) => ({ ...item, id: `${prefix}-conveyor-${index}` })),
      gravityWells: (layout.effects?.gravityWells || []).map((item, index) => ({ ...item, id: `${prefix}-gravity-${index}` })),
    },
  };
}

export function createRegionArenaState(regionId, wave) {
  const safeWave = Math.max(1, Math.trunc(Number(wave) || 1));
  const index = (safeWave - 1) % 5;
  const id = regionById(regionId).id;
  const layout = id === 'forge' ? forgeLayout(index) : id === 'void' ? voidLayout(index) : neonLayout(index);
  return cloneArena(id, layout, safeWave);
}

const BASE_WAVES = Object.freeze([
  ['scout', 'scout', 'scout'],
  ['scout', 'scout', 'scout', 'scout', 'brute'],
  ['scout', 'scout', 'scout', 'sniper', 'charger', 'brute'],
  ['scout', 'scout', 'scout', 'scout', 'brute', 'brute', 'sniper', 'splitter'],
  ['scout', 'scout', 'scout', 'scout', 'brute', 'brute', 'sniper', 'sniper', 'charger', 'splitter'],
]);

export function compositionForMissionWave(mission, wave) {
  const normalized = normalizeMission(mission);
  const regionId = regionIdForWave(normalized, wave);
  const localWave = normalized.modeId === 'story' ? ((Math.max(1, wave) - 1) % 4) + 1 : Math.min(5, Math.max(1, wave));
  const base = [...BASE_WAVES[Math.min(BASE_WAVES.length - 1, localWave - 1)]];
  if (regionId === 'forge') base.push(localWave >= 3 ? 'brute' : 'scout');
  if (regionId === 'void') base.push(localWave >= 3 ? 'sniper' : 'splitter');
  if (normalized.modeId === 'story' && wave >= 9) base.push('charger');
  return base;
}
