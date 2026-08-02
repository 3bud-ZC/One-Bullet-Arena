export const MAP_OVERHAUL_RELEASE = '1.3.0';

const WIDTH = 1280;
const HEIGHT = 720;

const REGION_VARIANTS = Object.freeze({
  neon: Object.freeze([
    { id: 'arrival-grid', name: 'شبكة الوصول', subtitle: 'ساحة مفتوحة ومسارات مضيئة تعرّفك على اتجاهات الارتداد.', pattern: 'open', complexity: 1, pads: 2, relays: 0, fields: 0, ambience: 'rain' },
    { id: 'signal-crossing', name: 'تقاطع الإشارة', subtitle: 'حاجز متحرك بطيء ونقطة تحكم واحدة قبل بدء الخطر الحقيقي.', pattern: 'split', complexity: 2, pads: 2, relays: 1, fields: 0, ambience: 'rain' },
    { id: 'ricochet-rail', name: 'سكة الارتداد', subtitle: 'مساران يسرّعان الطلقة وحواجز تحول الزوايا باستمرار.', pattern: 'lanes', complexity: 3, pads: 3, relays: 1, fields: 0, ambience: 'scan' },
    { id: 'prism-gate', name: 'بوابة المنشور', subtitle: 'بوابتان متعاكستان تفتحان وتغلقان الممر المركزي.', pattern: 'cross', complexity: 4, pads: 2, relays: 2, fields: 0, ambience: 'scan' },
    { id: 'dual-circuit', name: 'الدائرة المزدوجة', subtitle: 'مسارات متقاطعة وحواجز متزامنة تفرض تغيير الخطة.', pattern: 'orbit', complexity: 5, pads: 3, relays: 2, fields: 1, ambience: 'storm' },
    { id: 'siege-station', name: 'محطة الحصار', subtitle: 'بوابات جانبية تضيق الساحة كلما استمر القتال.', pattern: 'shutters', complexity: 6, pads: 3, relays: 2, fields: 1, ambience: 'storm' },
    { id: 'sector-lockdown', name: 'إغلاق القطاع', subtitle: 'أربعة حواجز متحركة ونقاط تحكم تفتح نافذة للهجوم.', pattern: 'lockdown', complexity: 7, pads: 4, relays: 2, fields: 1, ambience: 'overload' },
    { id: 'core-plaza', name: 'ساحة قلب النيون', subtitle: 'أقصى كثافة للمسارات والحواجز قبل مواجهة الحارس.', pattern: 'core', complexity: 8, pads: 4, relays: 3, fields: 1, ambience: 'overload' },
  ]),
  forge: Object.freeze([
    { id: 'maintenance-deck', name: 'رصيف الصيانة', subtitle: 'ألواح صناعية مفتوحة وممر تبريد آمن.', pattern: 'open', complexity: 1, pads: 1, relays: 0, fields: 1, ambience: 'embers' },
    { id: 'coolant-channel', name: 'قناة التبريد', subtitle: 'صمام واحد وحاجز بطيء يقدمان ميكانيكيات المسبك.', pattern: 'split', complexity: 2, pads: 1, relays: 1, fields: 1, ambience: 'embers' },
    { id: 'piston-gallery', name: 'معرض المكابس', subtitle: 'مكابس أفقية تدفع مسار الطلقة نحو زوايا جديدة.', pattern: 'lanes', complexity: 3, pads: 2, relays: 1, fields: 1, ambience: 'steam' },
    { id: 'smelting-room', name: 'غرفة الصهر', subtitle: 'ممرات ضيقة وصمامات تبريد توقف ضغط المفاعل مؤقتًا.', pattern: 'cross', complexity: 4, pads: 1, relays: 2, fields: 2, ambience: 'steam' },
    { id: 'ore-crane', name: 'رافعة الخام', subtitle: 'كتل صناعية تتحرك في مدار وتعيد تشكيل الساحة.', pattern: 'orbit', complexity: 5, pads: 2, relays: 2, fields: 2, ambience: 'sparks' },
    { id: 'pressure-grid', name: 'شبكة الضغط', subtitle: 'بوابات جانبية ومناطق بخار متبادلة.', pattern: 'shutters', complexity: 6, pads: 2, relays: 2, fields: 2, ambience: 'sparks' },
    { id: 'reactor-lock', name: 'قفل المفاعل', subtitle: 'المكابس تعمل معًا وتترك ممرات قصيرة فقط.', pattern: 'lockdown', complexity: 7, pads: 2, relays: 3, fields: 2, ambience: 'overheat' },
    { id: 'upper-foundry', name: 'المسبك الأعلى', subtitle: 'أقصى ضغط صناعي قبل صياد الطلقة.', pattern: 'core', complexity: 8, pads: 3, relays: 3, fields: 3, ambience: 'overheat' },
  ]),
  void: Object.freeze([
    { id: 'rift-edge', name: 'حافة الشق', subtitle: 'فراغ مفتوح وحقل طور يغيّر إحساس حركة الطلقة.', pattern: 'open', complexity: 1, pads: 1, relays: 0, fields: 1, ambience: 'stars' },
    { id: 'silent-orbit', name: 'المدار الصامت', subtitle: 'كتلة واحدة تدور حول المركز ونقطة تثبيت للشق.', pattern: 'orbit-lite', complexity: 2, pads: 1, relays: 1, fields: 1, ambience: 'stars' },
    { id: 'phase-corridor', name: 'ممر الطور', subtitle: 'حواجز تنزلق وحقول تغيّر سرعة الطلقة.', pattern: 'split', complexity: 3, pads: 2, relays: 1, fields: 2, ambience: 'wisps' },
    { id: 'broken-constellation', name: 'الكوكبة المكسورة', subtitle: 'تقاطع جاذبي يبدل الممرات الآمنة باستمرار.', pattern: 'cross', complexity: 4, pads: 1, relays: 2, fields: 2, ambience: 'wisps' },
    { id: 'gravity-ring', name: 'حلقة الجاذبية', subtitle: 'أربع كتل تدور حول مركز غير مستقر.', pattern: 'orbit', complexity: 5, pads: 2, relays: 2, fields: 2, ambience: 'rift' },
    { id: 'fracture-lanes', name: 'ممرات الانكسار', subtitle: 'الشقوق الجانبية تضيق الساحة وتعيد فتحها.', pattern: 'shutters', complexity: 6, pads: 2, relays: 2, fields: 3, ambience: 'rift' },
    { id: 'singularity-lock', name: 'قفل التفرد', subtitle: 'حواجز متزامنة وحقول طور متعاكسة.', pattern: 'lockdown', complexity: 7, pads: 2, relays: 3, fields: 3, ambience: 'collapse' },
    { id: 'void-heart', name: 'قلب الفراغ', subtitle: 'أقصى تشوه للمسارات قبل ملك الشقوق.', pattern: 'core', complexity: 8, pads: 3, relays: 3, fields: 4, ambience: 'collapse' },
  ]),
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function seeded(seed) {
  let value = Math.abs(Math.trunc(Number(seed) || 1)) % 2147483647;
  if (value === 0) value = 1;
  return () => {
    value = value * 48271 % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function regionSeed(regionId) {
  return regionId === 'forge' ? 4703 : regionId === 'void' ? 7907 : 1301;
}

function wall(x, y, w, h, axis = 'x', amplitude = 0, speed = 0.5, phase = 0, path = 'sine') {
  return { x, y, w, h, axis, amplitude, speed, phase, path };
}

function patternWalls(pattern, complexity, regionId) {
  const speed = 0.22 + complexity * 0.035;
  const amplitude = 28 + complexity * 5;
  const walls = [];
  if (pattern === 'open') return walls;
  if (pattern === 'orbit-lite') return [wall(610, 190, 60, 80, 'orbit', 120, speed, 0, 'orbit')];
  if (pattern === 'split') {
    walls.push(wall(470, 190, 46, 270, 'y', amplitude, speed, 0));
    if (complexity >= 3) walls.push(wall(764, 260, 46, 270, 'y', amplitude, speed, Math.PI));
  } else if (pattern === 'lanes') {
    walls.push(wall(300, 245, 190, 38, 'x', amplitude, speed, 0));
    walls.push(wall(790, 437, 190, 38, 'x', amplitude, speed, Math.PI));
    if (complexity >= 6) walls.push(wall(545, 340, 190, 38, 'x', amplitude * 0.8, speed * 1.15, Math.PI / 2));
  } else if (pattern === 'cross') {
    walls.push(wall(604, 120, 72, 210, 'y', amplitude, speed, 0));
    walls.push(wall(510, 341, 260, 42, 'x', amplitude * 1.2, speed * 0.9, Math.PI / 2));
  } else if (pattern === 'orbit') {
    for (let index = 0; index < 4; index += 1) walls.push(wall(610, 325, 60, 70, 'orbit', 145 + complexity * 5, speed * 0.72, index * Math.PI / 2, 'orbit'));
  } else if (pattern === 'shutters') {
    walls.push(wall(120, 180, 52, 360, 'x', 110 + complexity * 4, speed * 0.72, 0, 'shutter-left'));
    walls.push(wall(1108, 180, 52, 360, 'x', 110 + complexity * 4, speed * 0.72, Math.PI, 'shutter-right'));
  } else if (pattern === 'lockdown') {
    walls.push(wall(180, 160, 48, 250, 'x', 145, speed, 0, 'shutter-left'));
    walls.push(wall(1052, 310, 48, 250, 'x', 145, speed, Math.PI, 'shutter-right'));
    walls.push(wall(480, 105, 320, 42, 'y', 95, speed * 0.85, Math.PI / 2));
    walls.push(wall(480, 573, 320, 42, 'y', 95, speed * 0.85, -Math.PI / 2));
  } else if (pattern === 'core') {
    for (let index = 0; index < 4; index += 1) walls.push(wall(610, 325, 60, 70, 'orbit', 175, speed * 0.75, index * Math.PI / 2, 'orbit'));
    walls.push(wall(160, 270, 44, 180, 'x', 100, speed, 0, 'shutter-left'));
    walls.push(wall(1076, 270, 44, 180, 'x', 100, speed, Math.PI, 'shutter-right'));
  }
  if (regionId === 'forge') {
    for (const item of walls) item.speed *= 0.82;
  }
  if (regionId === 'void') {
    for (const item of walls) item.speed *= 0.68;
  }
  return walls;
}

function buildPads(count, regionId, random) {
  const pads = [];
  const placements = [
    [190, 338, 170, 44], [920, 338, 170, 44], [555, 170, 170, 44], [555, 506, 170, 44],
  ];
  for (let index = 0; index < count; index += 1) {
    const [x, y, w, h] = placements[index % placements.length];
    pads.push({
      id: `${regionId}-pad-${index}`,
      x: x + Math.round((random() - 0.5) * 18),
      y: y + Math.round((random() - 0.5) * 12),
      w,
      h,
      boost: 1.08 + index * 0.025,
      angle: index % 2 === 0 ? 0 : Math.PI,
    });
  }
  return pads;
}

function buildRelays(count, regionId) {
  const placements = [[150, 140], [1130, 580], [1130, 140], [150, 580]];
  return placements.slice(0, count).map(([x, y], index) => ({
    id: `${regionId}-relay-${index}`,
    x,
    y,
    radius: 21,
    suppression: 3.4 + index * 0.4,
  }));
}

function buildFields(count, regionId, random) {
  const placements = [[640, 360], [340, 360], [940, 360], [640, 190]];
  const types = regionId === 'forge'
    ? ['coolant', 'steam', 'coolant', 'steam']
    : regionId === 'void'
      ? ['phase-slow', 'phase-fast', 'phase-slow', 'phase-fast']
      : ['signal', 'signal', 'signal', 'signal'];
  return placements.slice(0, count).map(([x, y], index) => ({
    id: `${regionId}-field-${index}`,
    x: x + Math.round((random() - 0.5) * 26),
    y: y + Math.round((random() - 0.5) * 22),
    radius: 72 + index * 8,
    type: types[index],
    phase: index * 1.7,
  }));
}

export function normalizeMapWave(wave = 1) {
  return clamp(Math.trunc(Number(wave) || 1), 1, 8);
}

export function mapVariantsForRegion(regionId) {
  return REGION_VARIANTS[regionId] || REGION_VARIANTS.neon;
}

export function mapVariantForWave(regionId, localWave = 1) {
  const variants = mapVariantsForRegion(regionId);
  return variants[normalizeMapWave(localWave) - 1];
}

export function createMapOverhaulProfile(regionId, localWave = 1) {
  const safeRegion = REGION_VARIANTS[regionId] ? regionId : 'neon';
  const wave = normalizeMapWave(localWave);
  const variant = mapVariantForWave(safeRegion, wave);
  const random = seeded(regionSeed(safeRegion) + wave * 991);
  const movingWalls = patternWalls(variant.pattern, variant.complexity, safeRegion).map((item, index) => ({
    ...item,
    id: `${safeRegion}-${variant.id}-wall-${index}`,
  }));
  return {
    ...variant,
    regionId: safeRegion,
    localWave: wave,
    stage: Math.min(4, Math.ceil(wave / 2)),
    movingWalls,
    boostPads: buildPads(variant.pads, safeRegion, random),
    relays: buildRelays(variant.relays, safeRegion),
    fields: buildFields(variant.fields, safeRegion, random),
    seed: regionSeed(safeRegion) + wave * 991,
  };
}

export function movingWallRect(definition, time = 0, gateOpen = false) {
  const item = definition || {};
  const speed = Number(item.speed) || 0;
  const phase = Number(item.phase) || 0;
  const amplitude = gateOpen ? (Number(item.amplitude) || 0) * 1.55 : Number(item.amplitude) || 0;
  let x = Number(item.x) || 0;
  let y = Number(item.y) || 0;
  if (item.path === 'orbit' || item.axis === 'orbit') {
    const angle = time * speed + phase;
    x += Math.cos(angle) * amplitude;
    y += Math.sin(angle) * amplitude * 0.72;
  } else if (item.path === 'shutter-left') {
    x += (Math.sin(time * speed + phase) + 1) * 0.5 * amplitude;
  } else if (item.path === 'shutter-right') {
    x -= (Math.sin(time * speed + phase) + 1) * 0.5 * amplitude;
  } else if (item.axis === 'y') {
    y += Math.sin(time * speed + phase) * amplitude;
  } else {
    x += Math.sin(time * speed + phase) * amplitude;
  }
  return {
    x: clamp(x, 42, WIDTH - (item.w || 40) - 42),
    y: clamp(y, 42, HEIGHT - (item.h || 40) - 42),
    w: Math.max(24, Number(item.w) || 40),
    h: Math.max(24, Number(item.h) || 40),
  };
}

export function mapProfileComplexity(profile) {
  if (!profile) return 0;
  return profile.movingWalls.length * 3 + profile.boostPads.length * 2 + profile.relays.length * 2 + profile.fields.length;
}
