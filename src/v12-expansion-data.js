export const V12_RELEASE = '1.2.0';

export const EXPANDED_RUN_WAVES = Object.freeze({
  region: 8,
  story: 24,
});

export const COMBAT_TECHNIQUES = Object.freeze([
  {
    id: 'kinetic-pulse',
    name: 'النبضة الحركية',
    shortName: 'نبض',
    icon: '◉',
    key: 'R',
    color: '#62f3ff',
    cooldown: 8.5,
    description: 'موجة قريبة تدفع الأعداء وتكسر المقذوفات وتسبب ضررًا محدودًا.',
  },
  {
    id: 'phase-shift',
    name: 'التحول الطوري',
    shortName: 'طور',
    icon: '◇',
    key: 'C',
    color: '#b983ff',
    cooldown: 11.5,
    description: 'تبادل موضعك مع الطلقة الحرة، أو نفذ انتقالًا قصيرًا عندما تكون ممسوكة.',
  },
]);

export const TECHNIQUE_TIERS = Object.freeze([
  {
    tier: 1,
    name: 'الترسانة الأساسية',
    wave: 1,
    description: 'النبضة الحركية والتحول الطوري متاحان.',
  },
  {
    tier: 2,
    name: 'مضخم المجال',
    wave: 4,
    description: 'مدى النبضة وضررها أعلى، والتحول يمنح حماية قصيرة.',
  },
  {
    tier: 3,
    name: 'دورة الكسر',
    wave: 7,
    description: 'زمن انتظار أقل واستخدام القدرات يشحن Overdrive.',
  },
]);

export const ENEMY_EVOLUTIONS = Object.freeze([
  {
    id: 'armored-shell',
    name: 'غلاف مصفح',
    icon: '⬒',
    color: '#8de8ff',
    description: 'يمتص أول إصابة مباشرة من الطلقة قبل أن ينكسر.',
  },
  {
    id: 'blink-drive',
    name: 'محرك الوميض',
    icon: '◈',
    color: '#c49bff',
    description: 'ينتقل دوريًا إلى زاوية جديدة حول اللاعب.',
  },
  {
    id: 'volatile-core',
    name: 'نواة متفجرة',
    icon: '✹',
    color: '#ff7a5c',
    description: 'ينفجر عند تدميره ويؤذي الوحدات القريبة.',
  },
  {
    id: 'rage-engine',
    name: 'محرك هائج',
    icon: '▲',
    color: '#ffe66d',
    description: 'تزداد سرعته عند انخفاض صحته للنصف.',
  },
]);

export const MAP_MUTATORS = Object.freeze([
  {
    id: 'laser-sweep',
    regionId: 'neon',
    name: 'ماسح الليزر',
    color: '#ff4f88',
    description: 'حزمة متحركة تقطع الحلبة وتفرض تغيير المسار.',
  },
  {
    id: 'pulse-gates',
    regionId: 'neon',
    name: 'بوابات النبض',
    color: '#62f3ff',
    description: 'بوابتان تطلقان موجات دفع دورية في اتجاه المركز.',
  },
  {
    id: 'heat-cycle',
    regionId: 'forge',
    name: 'دورة الحرارة',
    color: '#ff7a3d',
    description: 'مناطق حرارية تتناوب بين طرفي المسبك.',
  },
  {
    id: 'piston-line',
    regionId: 'forge',
    name: 'خط المكابس',
    color: '#ffd166',
    description: 'خط ضغط متحرك يدفع الوحدات والطلقة.',
  },
  {
    id: 'gravity-tide',
    regionId: 'void',
    name: 'مد الجاذبية',
    color: '#9c7dff',
    description: 'نبضة جاذبية مركزية تتبدل بين الجذب والدفع.',
  },
  {
    id: 'rift-storm',
    regionId: 'void',
    name: 'عاصفة الشقوق',
    color: '#ff8de1',
    description: 'شقوق مؤقتة تغير سرعة الطلقة واتجاهها جزئيًا.',
  },
]);

const NEON_COMPOSITIONS = Object.freeze([
  ['scout', 'scout', 'scout'],
  ['scout', 'scout', 'scout', 'charger', 'brute'],
  ['scout', 'scout', 'sniper', 'charger', 'brute', 'splitter'],
  ['scout', 'scout', 'scout', 'sniper', 'charger', 'splitter', 'brute'],
  ['scout', 'scout', 'sniper', 'sniper', 'charger', 'brute', 'brute', 'splitter'],
  ['scout', 'sniper', 'charger', 'charger', 'brute', 'brute', 'splitter', 'splitter'],
  ['scout', 'scout', 'sniper', 'sniper', 'charger', 'charger', 'brute', 'splitter', 'splitter'],
  ['scout', 'scout', 'scout', 'sniper', 'sniper', 'charger', 'charger', 'brute', 'brute', 'splitter', 'splitter'],
]);

const FORGE_COMPOSITIONS = Object.freeze([
  ['scout', 'shield-drone', 'repair-bot'],
  ['scout', 'brute', 'shield-drone', 'furnace-brute'],
  ['scout', 'sniper', 'shield-drone', 'magnet-unit', 'repair-bot'],
  ['brute', 'charger', 'furnace-brute', 'shield-drone', 'magnet-unit', 'repair-bot'],
  ['scout', 'brute', 'sniper', 'shield-drone', 'furnace-brute', 'magnet-unit', 'repair-bot', 'repair-bot'],
  ['brute', 'charger', 'shield-drone', 'shield-drone', 'furnace-brute', 'magnet-unit', 'repair-bot', 'splitter'],
  ['sniper', 'charger', 'shield-drone', 'furnace-brute', 'furnace-brute', 'magnet-unit', 'repair-bot', 'repair-bot', 'splitter'],
  ['brute', 'brute', 'charger', 'shield-drone', 'shield-drone', 'furnace-brute', 'furnace-brute', 'magnet-unit', 'repair-bot', 'repair-bot'],
]);

const VOID_COMPOSITIONS = Object.freeze([
  ['scout', 'scout', 'phase-walker'],
  ['splitter', 'scout', 'phase-walker', 'rift-sniper'],
  ['sniper', 'charger', 'phase-walker', 'gravity-orb', 'rift-sniper'],
  ['splitter', 'charger', 'gravity-orb', 'mirror-drone', 'phase-walker', 'rift-sniper'],
  ['scout', 'sniper', 'splitter', 'phase-walker', 'rift-sniper', 'gravity-orb', 'mirror-drone', 'mirror-drone'],
  ['charger', 'splitter', 'phase-walker', 'phase-walker', 'rift-sniper', 'gravity-orb', 'mirror-drone'],
  ['sniper', 'charger', 'splitter', 'phase-walker', 'rift-sniper', 'rift-sniper', 'gravity-orb', 'mirror-drone', 'mirror-drone'],
  ['scout', 'sniper', 'charger', 'splitter', 'phase-walker', 'phase-walker', 'rift-sniper', 'rift-sniper', 'gravity-orb', 'gravity-orb', 'mirror-drone'],
]);

export function expandedTargetWaves(mission = {}, daily = false) {
  if (daily) return 5;
  return mission?.modeId === 'story' ? EXPANDED_RUN_WAVES.story : EXPANDED_RUN_WAVES.region;
}

export function expandedRegionIdForWave(mission = {}, wave = 1) {
  if (mission?.modeId !== 'story') return mission?.regionId || 'neon';
  const safeWave = Math.max(1, Math.trunc(Number(wave) || 1));
  if (safeWave <= 8) return 'neon';
  if (safeWave <= 16) return 'forge';
  return 'void';
}

export function expandedLocalWave(mission = {}, wave = 1) {
  const safeWave = Math.max(1, Math.trunc(Number(wave) || 1));
  return mission?.modeId === 'story' ? ((safeWave - 1) % 8) + 1 : Math.min(8, safeWave);
}

export function expandedComposition(regionId, localWave = 1) {
  const index = Math.max(0, Math.min(7, Math.trunc(Number(localWave) || 1) - 1));
  const source = regionId === 'forge'
    ? FORGE_COMPOSITIONS
    : regionId === 'void'
      ? VOID_COMPOSITIONS
      : NEON_COMPOSITIONS;
  return [...source[index]];
}

export function techniqueTierForWave(wave = 1) {
  const safeWave = Math.max(1, Math.trunc(Number(wave) || 1));
  if (safeWave >= 7) return 3;
  if (safeWave >= 4) return 2;
  return 1;
}

export function evolutionForEnemy({ wave = 1, enemyId = 0, elite = false, mini = false } = {}) {
  const safeWave = Math.max(1, Math.trunc(Number(wave) || 1));
  if (safeWave < 4 || elite || mini) return null;
  const chanceStep = safeWave >= 7 ? 2 : 3;
  const seed = Math.abs(Math.trunc(Number(enemyId) || 0) * 17 + safeWave * 13);
  if (seed % chanceStep !== 0) return null;
  return ENEMY_EVOLUTIONS[seed % ENEMY_EVOLUTIONS.length];
}

export function evolutionById(id) {
  return ENEMY_EVOLUTIONS.find((item) => item.id === id) || null;
}

export function mapMutatorForWave(regionId, wave = 1) {
  const options = MAP_MUTATORS.filter((item) => item.regionId === regionId);
  if (!options.length) return null;
  const safeWave = Math.max(1, Math.trunc(Number(wave) || 1));
  return options[(safeWave - 1) % options.length];
}

export function techniqueCooldown(techniqueId, tier = 1) {
  const technique = COMBAT_TECHNIQUES.find((item) => item.id === techniqueId);
  if (!technique) return 0;
  const reduction = Math.max(0, Math.min(2, Math.trunc(Number(tier) || 1) - 1)) * 0.11;
  return technique.cooldown * (1 - reduction);
}

export function mobileTechniqueLayout({ leftHanded = false, width = 1280, height = 720, scale = 1 } = {}) {
  const actionX = leftHanded ? 112 : width - 112;
  const secondaryX = leftHanded ? 228 : width - 228;
  return {
    pulse: { x: actionX, y: height - 224, radius: 38 * scale },
    phase: { x: secondaryX, y: height - 184, radius: 36 * scale },
  };
}
