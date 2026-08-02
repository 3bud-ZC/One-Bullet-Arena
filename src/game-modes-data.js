export const GAME_MODE_RECORDS_KEY = 'one-bullet-arena-mode-records-v1';

export const CORE_CONTRACTS = Object.freeze([
  { id: 'one-heart', name: 'عقد القلب الواحد', description: 'قلب واحد فقط طوال المهمة.', regionId: 'neon', forcedCore: '', reward: 140, modifier: 'one-heart' },
  { id: 'no-dash', name: 'عقد الثبات', description: 'أكمل المهمة دون استخدام الاندفاع.', regionId: 'forge', forcedCore: 'heavy', reward: 170, modifier: 'no-dash' },
  { id: 'elite-wave', name: 'عقد النخبة', description: 'كل موجة تحتوي على عدو Elite إضافي.', regionId: 'void', forcedCore: 'shock', reward: 190, modifier: 'elite-wave' },
  { id: 'slow-bullet', name: 'عقد المسار الثقيل', description: 'سرعة الطلقة أقل بعد كل ارتداد.', regionId: 'forge', forcedCore: 'ricochet', reward: 180, modifier: 'slow-bullet' },
  { id: 'recall-only', name: 'عقد العودة', description: 'النواة المفروضة هي نواة الاستدعاء.', regionId: 'neon', forcedCore: 'recall', reward: 160, modifier: 'recall-only' },
]);

export function contractById(id) {
  return CORE_CONTRACTS.find((contract) => contract.id === id) || null;
}

export function createDefaultModeRecords() {
  return {
    version: 1,
    endless: { attempts: 0, bestWave: 0, bestScore: 0, bossesDefeated: 0 },
    bossRush: { attempts: 0, completions: 0, bestTime: 0, leastDamage: 0 },
    contracts: {},
    updatedAt: '',
  };
}

function safeInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0;
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

export function normalizeModeRecords(value) {
  const source = value && typeof value === 'object' ? value : {};
  const contracts = {};
  for (const contract of CORE_CONTRACTS) {
    const entry = source.contracts?.[contract.id] || {};
    contracts[contract.id] = {
      attempts: safeInteger(entry.attempts),
      completions: safeInteger(entry.completions),
      bestScore: safeInteger(entry.bestScore),
      firstCompletedAt: typeof entry.firstCompletedAt === 'string' ? entry.firstCompletedAt : '',
    };
  }
  return {
    version: 1,
    endless: {
      attempts: safeInteger(source.endless?.attempts),
      bestWave: safeInteger(source.endless?.bestWave),
      bestScore: safeInteger(source.endless?.bestScore),
      bossesDefeated: safeInteger(source.endless?.bossesDefeated),
    },
    bossRush: {
      attempts: safeInteger(source.bossRush?.attempts),
      completions: safeInteger(source.bossRush?.completions),
      bestTime: safeNumber(source.bossRush?.bestTime),
      leastDamage: safeInteger(source.bossRush?.leastDamage),
    },
    contracts,
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : '',
  };
}

export function recordEndlessAttempt(input, result = {}) {
  const records = normalizeModeRecords(input);
  records.endless.attempts += 1;
  records.endless.bestWave = Math.max(records.endless.bestWave, safeInteger(result.wave));
  records.endless.bestScore = Math.max(records.endless.bestScore, safeInteger(result.score));
  records.endless.bossesDefeated = Math.max(records.endless.bossesDefeated, safeInteger(result.bossesDefeated));
  records.updatedAt = new Date().toISOString();
  return records;
}

export function recordBossRushAttempt(input, result = {}) {
  const records = normalizeModeRecords(input);
  records.bossRush.attempts += 1;
  if (result.completed) {
    records.bossRush.completions += 1;
    const time = safeNumber(result.time);
    if (time > 0 && (records.bossRush.bestTime === 0 || time < records.bossRush.bestTime)) records.bossRush.bestTime = time;
    const damage = safeInteger(result.damageTaken);
    if (records.bossRush.completions === 1 || damage < records.bossRush.leastDamage) records.bossRush.leastDamage = damage;
  }
  records.updatedAt = new Date().toISOString();
  return records;
}

export function recordContractAttempt(input, contractId, result = {}) {
  const records = normalizeModeRecords(input);
  const contract = contractById(contractId);
  if (!contract) return records;
  const entry = records.contracts[contractId];
  entry.attempts += 1;
  entry.bestScore = Math.max(entry.bestScore, safeInteger(result.score));
  if (result.completed) {
    const first = entry.completions === 0;
    entry.completions += 1;
    if (first) entry.firstCompletedAt = new Date().toISOString();
  }
  records.updatedAt = new Date().toISOString();
  return records;
}
