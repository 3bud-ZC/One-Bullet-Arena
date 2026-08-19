export const GAME_FEEL_VERSION = '3.14.0-gameplay-feel';

const DIRECTIVES = Object.freeze({
  standard: Object.freeze({
    id: 'standard',
    name: 'ضغط متوازن',
    hint: 'اقض على الموجة بالطريقة المناسبة.',
    banner: 'استمر واضغط عليهم',
  }),
  priority: Object.freeze({
    id: 'priority',
    name: 'هدف أولوية',
    hint: 'أسقط العدو المحدد لتكسر ضغط الموجة.',
    banner: 'هدف أولوية داخل الموجة',
  }),
  bank: Object.freeze({
    id: 'bank',
    name: 'ارتداد قاتل',
    hint: 'القتل بعد ارتداد يمنح مكافأة مضاعفة.',
    banner: 'زاوية ارتداد تساوي مكافأة',
  }),
  recall: Object.freeze({
    id: 'recall',
    name: 'عودة حاسمة',
    hint: 'القتل أثناء عودة الطلقة يمنح مكافأة.',
    banner: 'استدعاء ذكي يصنع فرقًا',
  }),
});

const SYNERGIES = Object.freeze([
  Object.freeze({
    id: 'bank-forge',
    name: 'حدادة الارتداد',
    requires: Object.freeze([['extended-ricochet', 1], ['hot-ricochet', 1]]),
  }),
  Object.freeze({
    id: 'return-relay',
    name: 'مرحل العودة',
    requires: Object.freeze([['magnetic-recall', 1], ['quick-dash', 1]]),
  }),
  Object.freeze({
    id: 'kinetic-field',
    name: 'حقل حركي',
    requires: Object.freeze([['magnetic-recall', 1], ['kinetic-catch', 1]]),
  }),
  Object.freeze({
    id: 'shock-carom',
    name: 'صدمة مرتدة',
    requires: Object.freeze([['shock-impact', 1], ['hot-ricochet', 1]]),
  }),
]);

function safeWave(wave) {
  return Math.max(1, Math.trunc(Number(wave) || 1));
}

function stack(stacks, id) {
  return Math.max(0, Math.trunc(Number(stacks?.[id]) || 0));
}

export function waveDirectiveForWave(wave) {
  const current = safeWave(wave);
  if (current < 3) return DIRECTIVES.standard;
  if (current % 5 === 0) return DIRECTIVES.priority;
  if (current % 4 === 0) return DIRECTIVES.bank;
  if (current % 3 === 0) return DIRECTIVES.recall;
  return DIRECTIVES.standard;
}

export function createWaveDirectiveState(wave) {
  const directive = waveDirectiveForWave(wave);
  return {
    ...directive,
    wave: safeWave(wave),
    targetEnemyId: null,
    completed: directive.id === 'standard',
    bonuses: 0,
  };
}

export function selectPriorityTarget(enemies = []) {
  let selected = null;
  let score = -Infinity;
  for (const enemy of enemies) {
    if (!enemy || enemy.spawnTime > 1.2 || enemy.mini) continue;
    const candidateScore = (Number(enemy.maxHealth) || 0) * 100
      + (enemy.guardian ? 5000 : 0)
      + (enemy.type === 'warden' ? 600 : 0)
      + (enemy.type === 'brute' ? 420 : 0)
      + (enemy.type === 'charger' ? 300 : 0)
      + (enemy.type === 'sniper' ? 260 : 0)
      + (Number(enemy.id) || 0) * 0.001;
    if (candidateScore > score) {
      score = candidateScore;
      selected = enemy;
    }
  }
  return selected;
}

export function resolveWaveDirectiveKill(directive, enemy, context = {}) {
  if (!directive || directive.id === 'standard' || !enemy) {
    return { matched: false, scoreMultiplier: 1, scoreBonus: 0, label: '', completesDirective: false };
  }

  if (directive.id === 'priority' && enemy.priorityTarget) {
    return {
      matched: true,
      scoreMultiplier: 1.75,
      scoreBonus: 250 + safeWave(directive.wave) * 18,
      label: 'PRIORITY',
      completesDirective: true,
    };
  }

  if (directive.id === 'bank' && context.banked) {
    return {
      matched: true,
      scoreMultiplier: 1.35,
      scoreBonus: 150 + safeWave(directive.wave) * 10,
      label: 'BANK BONUS',
      completesDirective: true,
    };
  }

  if (directive.id === 'recall' && context.recalling) {
    return {
      matched: true,
      scoreMultiplier: 1.25,
      scoreBonus: 130 + safeWave(directive.wave) * 9,
      label: 'RECALL BONUS',
      completesDirective: true,
    };
  }

  return { matched: false, scoreMultiplier: 1, scoreBonus: 0, label: '', completesDirective: false };
}

export function activeAbilitySynergies(stacks = {}) {
  return SYNERGIES.filter((synergy) => synergy.requires.every(([id, minimum]) => stack(stacks, id) >= minimum));
}

export function hasAbilitySynergy(stacks, id) {
  return activeAbilitySynergies(stacks).some((synergy) => synergy.id === id);
}

export function abilitySynergyDamageMultiplier(stacks = {}, context = {}) {
  let multiplier = 1;
  const banks = Math.max(0, Number(context.bankLevel) || Number(context.bounceCount) || 0);
  if (banks > 0 && hasAbilitySynergy(stacks, 'bank-forge')) {
    const depth = Math.min(stack(stacks, 'extended-ricochet'), stack(stacks, 'hot-ricochet'));
    multiplier *= 1 + Math.min(0.22, banks * (0.035 + depth * 0.01));
  }
  if (context.recalling && hasAbilitySynergy(stacks, 'return-relay')) {
    multiplier *= 1.08;
  }
  return multiplier;
}

export function catchImpulseSynergyScale(stacks = {}) {
  if (!hasAbilitySynergy(stacks, 'kinetic-field')) return { radius: 1, strength: 1 };
  const depth = Math.min(stack(stacks, 'magnetic-recall'), stack(stacks, 'kinetic-catch'));
  return {
    radius: 1 + Math.min(0.28, 0.08 + depth * 0.035),
    strength: 1 + Math.min(0.34, 0.1 + depth * 0.045),
  };
}

export function dashRefundForCatch(stacks = {}, context = {}) {
  if (!hasAbilitySynergy(stacks, 'return-relay')) return 0;
  const distance = Math.max(0, Number(context.recallDistance) || 0);
  const depth = Math.min(stack(stacks, 'magnetic-recall'), stack(stacks, 'quick-dash'));
  const perfectBonus = context.perfect ? 0.12 : 0;
  return Math.min(0.55, 0.12 + depth * 0.045 + Math.min(0.18, distance / 1800) + perfectBonus);
}

export function shockImpactSynergyScale(stacks = {}, context = {}) {
  if (!context.banked || !hasAbilitySynergy(stacks, 'shock-carom')) return { radius: 1, damage: 1 };
  const depth = Math.min(stack(stacks, 'shock-impact'), stack(stacks, 'hot-ricochet'));
  return {
    radius: 1 + Math.min(0.26, 0.08 + depth * 0.035),
    damage: 1 + Math.min(0.28, 0.08 + depth * 0.04),
  };
}
