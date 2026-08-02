export const PROGRESSION_STORAGE_KEY = 'one-bullet-arena-progression';
export const SAVE_VERSION = 1;
export const MAX_RUN_HISTORY = 20;

export const BULLET_CORES = Object.freeze([
  {
    id: 'standard',
    name: 'النواة القياسية',
    shortName: 'قياسية',
    icon: '◆',
    cost: 0,
    color: '#62f3ff',
    description: 'نواة متوازنة تحافظ على السرعة والضرر والارتدادات الأساسية.',
    traits: ['توازن كامل', '4 ارتدادات', 'ضرر قياسي'],
  },
  {
    id: 'ricochet',
    name: 'نواة الارتداد',
    shortName: 'ارتداد',
    icon: '↗',
    cost: 120,
    color: '#ffe66d',
    description: 'مسار أطول وضرر يتصاعد كلما أتقنت زوايا الجدران.',
    traits: ['+2 ارتداد', '+ضرر بعد الارتداد', '-8٪ سرعة'],
  },
  {
    id: 'heavy',
    name: 'النواة الثقيلة',
    shortName: 'ثقيلة',
    icon: '⬢',
    cost: 180,
    color: '#ff9f43',
    description: 'طلقة أبطأ، لكنها تضرب بقوة وتدفع الأعداء بعيدًا.',
    traits: ['×1.65 ضرر', 'دفع أقوى', '-1 ارتداد'],
  },
  {
    id: 'shock',
    name: 'النواة الصاعقة',
    shortName: 'صاعقة',
    icon: 'ϟ',
    cost: 220,
    color: '#b983ff',
    description: 'كل إصابة مباشرة تنقل شرارة إلى أقرب عدو داخل المدى.',
    traits: ['ضرر متسلسل', 'ممتازة للتجمعات', '-18٪ ضرر مباشر'],
  },
  {
    id: 'recall',
    name: 'نواة الاستدعاء',
    shortName: 'استدعاء',
    icon: '◎',
    cost: 260,
    color: '#53f2a1',
    description: 'تمنح الاستدعاء المغناطيسي من بداية الجولة دون انتظار ترقية.',
    traits: ['استدعاء من البداية', 'أسلوب أكثر أمانًا', '-5٪ ضرر'],
  },
]);

export const ACHIEVEMENTS = Object.freeze([
  {
    id: 'first-run',
    name: 'أول طلقة',
    description: 'أنهِ أول جولة لك.',
    reward: 20,
    target: 1,
    progress: (save) => save.stats.totalRuns,
  },
  {
    id: 'first-victory',
    name: 'سقوط الحارس',
    description: 'اهزم حارس النواة للمرة الأولى.',
    reward: 50,
    target: 1,
    progress: (save) => save.stats.victories,
  },
  {
    id: 'rank-s',
    name: 'سيد الارتدادات',
    description: 'حقق تقييم S في جولة كاملة.',
    reward: 75,
    target: 1,
    progress: (save) => save.stats.sRanks,
  },
  {
    id: 'precision',
    name: 'طلقة لا تُهدر',
    description: 'حقق دقة 75٪ أو أكثر في جولة تحتوي على 15 طلقة على الأقل.',
    reward: 45,
    target: 1,
    progress: (save) => save.stats.precisionRuns,
  },
  {
    id: 'hundred-kills',
    name: 'مئة هدف',
    description: 'اقتل 100 عدو عبر جميع الجولات.',
    reward: 90,
    target: 100,
    progress: (save) => save.stats.totalKills,
  },
  {
    id: 'ten-runs',
    name: 'لا تتوقف',
    description: 'أكمل 10 جولات.',
    reward: 60,
    target: 10,
    progress: (save) => save.stats.totalRuns,
  },
]);

function finiteNumber(value, fallback = 0, minimum = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(minimum, number) : fallback;
}

function safeInteger(value, fallback = 0, minimum = 0) {
  return Math.trunc(finiteNumber(value, fallback, minimum));
}

export function createDefaultSave() {
  return {
    version: SAVE_VERSION,
    shards: 0,
    selectedCore: 'standard',
    unlockedCores: ['standard'],
    coreMastery: { standard: { runs: 0, victories: 0, bestScore: 0 } },
    achievements: {},
    history: [],
    stats: {
      totalRuns: 0,
      victories: 0,
      defeats: 0,
      totalScore: 0,
      bestScore: 0,
      bestWave: 0,
      totalTime: 0,
      totalShots: 0,
      totalHits: 0,
      totalKills: 0,
      totalRicochets: 0,
      totalShardsEarned: 0,
      sRanks: 0,
      precisionRuns: 0,
      fastestVictory: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeCoreMastery(value = {}) {
  const output = {};
  for (const core of BULLET_CORES) {
    const item = value?.[core.id];
    if (!item && core.id !== 'standard') continue;
    output[core.id] = {
      runs: safeInteger(item?.runs),
      victories: safeInteger(item?.victories),
      bestScore: safeInteger(item?.bestScore),
    };
  }
  if (!output.standard) output.standard = { runs: 0, victories: 0, bestScore: 0 };
  return output;
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(0, MAX_RUN_HISTORY).map((run, index) => ({
    id: String(run?.id || `legacy-${index}`),
    playedAt: String(run?.playedAt || new Date(0).toISOString()),
    victory: Boolean(run?.victory),
    score: safeInteger(run?.score),
    wave: safeInteger(run?.wave),
    rank: ['S', 'A', 'B', 'C'].includes(run?.rank) ? run.rank : 'C',
    runTime: finiteNumber(run?.runTime),
    shots: safeInteger(run?.shots),
    hits: safeInteger(run?.hits),
    accuracy: Math.min(1, finiteNumber(run?.accuracy)),
    ricochets: safeInteger(run?.ricochets),
    kills: safeInteger(run?.kills),
    coreId: coreById(run?.coreId) ? run.coreId : 'standard',
    shards: safeInteger(run?.shards),
  }));
}

export function normalizeSave(candidate) {
  const defaults = createDefaultSave();
  if (!candidate || typeof candidate !== 'object') return defaults;

  const unlocked = Array.isArray(candidate.unlockedCores)
    ? [...new Set(['standard', ...candidate.unlockedCores.filter((id) => Boolean(coreById(id)))])]
    : ['standard'];
  const selectedCore = unlocked.includes(candidate.selectedCore) ? candidate.selectedCore : 'standard';
  const achievements = {};
  for (const achievement of ACHIEVEMENTS) {
    if (candidate.achievements?.[achievement.id]) {
      achievements[achievement.id] = {
        unlockedAt: String(candidate.achievements[achievement.id].unlockedAt || new Date().toISOString()),
        reward: safeInteger(candidate.achievements[achievement.id].reward, achievement.reward),
      };
    }
  }

  const sourceStats = candidate.stats || {};
  const stats = {};
  for (const key of Object.keys(defaults.stats)) stats[key] = finiteNumber(sourceStats[key], defaults.stats[key]);

  return {
    ...defaults,
    version: SAVE_VERSION,
    shards: safeInteger(candidate.shards),
    selectedCore,
    unlockedCores: unlocked,
    coreMastery: normalizeCoreMastery(candidate.coreMastery),
    achievements,
    history: normalizeHistory(candidate.history),
    stats,
    createdAt: String(candidate.createdAt || defaults.createdAt),
    updatedAt: String(candidate.updatedAt || new Date().toISOString()),
  };
}

export function coreById(id) {
  return BULLET_CORES.find((core) => core.id === id) || null;
}

export function achievementProgress(save, achievement) {
  return Math.min(achievement.target, safeInteger(achievement.progress(normalizeSave(save))));
}

export function calculateRunReward({ victory = false, wave = 0, rank = 'C', accuracy = 0, kills = 0, runTime = 0 } = {}) {
  const rankBonus = { S: 35, A: 24, B: 14, C: 6 }[rank] ?? 6;
  const waveReward = Math.min(5, safeInteger(wave)) * 8;
  const killReward = Math.min(30, safeInteger(kills)) * 2;
  const victoryBonus = victory ? 45 : 0;
  const accuracyBonus = accuracy >= 0.85 ? 18 : accuracy >= 0.75 ? 12 : accuracy >= 0.6 ? 6 : 0;
  const speedBonus = victory && runTime > 0 && runTime <= 150 ? 10 : 0;
  return waveReward + killReward + rankBonus + victoryBonus + accuracyBonus + speedBonus;
}

export function canUnlockCore(save, coreId) {
  const normalized = normalizeSave(save);
  const core = coreById(coreId);
  if (!core) return { allowed: false, reason: 'unknown-core' };
  if (normalized.unlockedCores.includes(coreId)) return { allowed: false, reason: 'already-unlocked' };
  if (normalized.shards < core.cost) return { allowed: false, reason: 'insufficient-shards' };
  return { allowed: true, reason: 'ok' };
}

export function unlockCore(save, coreId) {
  const normalized = normalizeSave(save);
  const core = coreById(coreId);
  const decision = canUnlockCore(normalized, coreId);
  if (!decision.allowed) return { save: normalized, unlocked: false, reason: decision.reason };
  normalized.shards -= core.cost;
  normalized.unlockedCores.push(coreId);
  normalized.coreMastery[coreId] = { runs: 0, victories: 0, bestScore: 0 };
  normalized.updatedAt = new Date().toISOString();
  return { save: normalized, unlocked: true, reason: 'ok' };
}

function unlockEarnedAchievements(save) {
  const unlocked = [];
  for (const achievement of ACHIEVEMENTS) {
    if (save.achievements[achievement.id]) continue;
    if (achievementProgress(save, achievement) < achievement.target) continue;
    save.achievements[achievement.id] = {
      unlockedAt: new Date().toISOString(),
      reward: achievement.reward,
    };
    save.shards += achievement.reward;
    save.stats.totalShardsEarned += achievement.reward;
    unlocked.push(achievement);
  }
  return unlocked;
}

export function recordRun(inputSave, runInput) {
  const save = normalizeSave(inputSave);
  const accuracy = runInput.shots > 0 ? Math.min(1, runInput.hits / runInput.shots) : 0;
  const coreId = save.unlockedCores.includes(runInput.coreId) ? runInput.coreId : save.selectedCore;
  const reward = calculateRunReward({ ...runInput, accuracy });
  const run = {
    id: String(runInput.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    playedAt: String(runInput.playedAt || new Date().toISOString()),
    victory: Boolean(runInput.victory),
    score: safeInteger(runInput.score),
    wave: safeInteger(runInput.wave),
    rank: ['S', 'A', 'B', 'C'].includes(runInput.rank) ? runInput.rank : 'C',
    runTime: finiteNumber(runInput.runTime),
    shots: safeInteger(runInput.shots),
    hits: safeInteger(runInput.hits),
    accuracy,
    ricochets: safeInteger(runInput.ricochets),
    kills: safeInteger(runInput.kills),
    coreId,
    shards: reward,
  };

  save.shards += reward;
  save.stats.totalRuns += 1;
  save.stats.victories += run.victory ? 1 : 0;
  save.stats.defeats += run.victory ? 0 : 1;
  save.stats.totalScore += run.score;
  save.stats.bestScore = Math.max(save.stats.bestScore, run.score);
  save.stats.bestWave = Math.max(save.stats.bestWave, run.wave);
  save.stats.totalTime += run.runTime;
  save.stats.totalShots += run.shots;
  save.stats.totalHits += run.hits;
  save.stats.totalKills += run.kills;
  save.stats.totalRicochets += run.ricochets;
  save.stats.totalShardsEarned += reward;
  save.stats.sRanks += run.rank === 'S' ? 1 : 0;
  save.stats.precisionRuns += run.shots >= 15 && run.accuracy >= 0.75 ? 1 : 0;
  if (run.victory && (save.stats.fastestVictory === 0 || run.runTime < save.stats.fastestVictory)) {
    save.stats.fastestVictory = run.runTime;
  }

  const mastery = save.coreMastery[coreId] || { runs: 0, victories: 0, bestScore: 0 };
  mastery.runs += 1;
  mastery.victories += run.victory ? 1 : 0;
  mastery.bestScore = Math.max(mastery.bestScore, run.score);
  save.coreMastery[coreId] = mastery;
  save.history.unshift(run);
  save.history = save.history.slice(0, MAX_RUN_HISTORY);
  const unlockedAchievements = unlockEarnedAchievements(save);
  save.updatedAt = new Date().toISOString();

  return { save, run, reward, unlockedAchievements };
}

export function serializeSave(save) {
  return JSON.stringify(normalizeSave(save), null, 2);
}

export function parseImportedSave(text) {
  if (typeof text !== 'string' || text.length > 1_000_000) throw new Error('invalid-save');
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object') throw new Error('invalid-save');
  return normalizeSave(parsed);
}
