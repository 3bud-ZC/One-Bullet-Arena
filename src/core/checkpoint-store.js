import { normalizedStacks } from '../game-data.js';

export const CHECKPOINT_SCHEMA_VERSION = 1;
export const CHECKPOINT_STORAGE_KEY = 'one-bullet-arena-checkpoint-v1';

const MAX_WAVE = 9999;
const MAX_SCORE = 999999999;
const MAX_RUN_TIME = 60 * 60 * 24;

function finiteNumber(value, fallback = 0, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(maximum, Math.max(minimum, number));
}

function integer(value, fallback = 0, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  return Math.trunc(finiteNumber(value, fallback, minimum, maximum));
}

function sanitizeStats(stats = {}) {
  return {
    shots: integer(stats.shots, 0, 0, 1000000),
    hits: integer(stats.hits, 0, 0, 1000000),
    kills: integer(stats.kills, 0, 0, 1000000),
    upgrades: integer(stats.upgrades, 0, 0, 1000),
    damageTaken: integer(stats.damageTaken, 0, 0, 100000),
  };
}

function sanitizeCombat(combat = {}) {
  return {
    momentum: finiteNumber(combat.momentum, 0, 0, 100),
    precisionCharge: integer(combat.precisionCharge, 0, 0, 1),
    overdriveTimer: finiteNumber(combat.overdriveTimer, 0, 0, 6.5),
    perfectCatches: integer(combat.perfectCatches, 0, 0, 100000),
    precisionKills: integer(combat.precisionKills, 0, 0, 100000),
    bankKills: integer(combat.bankKills, 0, 0, 100000),
    overdrives: integer(combat.overdrives, 0, 0, 100000),
  };
}

export function sanitizeCheckpoint(value) {
  if (!value || typeof value !== 'object') return null;
  if (integer(value.schemaVersion, 0) !== CHECKPOINT_SCHEMA_VERSION) return null;

  const rawWave = Number(value.wave);
  if (!Number.isFinite(rawWave) || rawWave < 1) return null;
  const wave = Math.min(MAX_WAVE, Math.trunc(rawWave));

  const maxHealth = integer(value.player?.maxHealth, 3, 1, 20);
  const health = integer(value.player?.health, maxHealth, 1, maxHealth);
  return {
    schemaVersion: CHECKPOINT_SCHEMA_VERSION,
    savedAt: integer(value.savedAt, Date.now(), 0, Number.MAX_SAFE_INTEGER),
    releaseVersion: String(value.releaseVersion || ''),
    wave,
    score: integer(value.score, 0, 0, MAX_SCORE),
    runTime: finiteNumber(value.runTime, 0, 0, MAX_RUN_TIME),
    combo: integer(value.combo, 0, 0, 999),
    comboTimer: finiteNumber(value.comboTimer, 0, 0, 10),
    maxCombo: integer(value.maxCombo, 0, 0, 9999),
    secondChanceUsed: Boolean(value.secondChanceUsed),
    player: {
      x: finiteNumber(value.player?.x, 640, -1000, 3000),
      y: finiteNumber(value.player?.y, 360, -1000, 3000),
      health,
      maxHealth,
      shield: integer(value.player?.shield, 0, 0, 9),
    },
    upgradeStacks: normalizedStacks(value.upgradeStacks || {}),
    previousUpgradeChoices: Array.isArray(value.previousUpgradeChoices)
      ? value.previousUpgradeChoices.map(String).slice(0, 3)
      : [],
    stats: sanitizeStats(value.stats),
    combat: sanitizeCombat(value.combat),
  };
}

export function captureCheckpoint(game, releaseVersion = '') {
  return sanitizeCheckpoint({
    schemaVersion: CHECKPOINT_SCHEMA_VERSION,
    savedAt: Date.now(),
    releaseVersion,
    wave: game.wave,
    score: game.score,
    runTime: game.runTime,
    combo: game.combo,
    comboTimer: game.comboTimer,
    maxCombo: game.maxCombo,
    secondChanceUsed: game.secondChanceUsed,
    player: {
      x: game.player.x,
      y: game.player.y,
      health: game.player.health,
      maxHealth: game.player.maxHealth,
      shield: game.player.shield,
    },
    upgradeStacks: game.upgradeStacks,
    previousUpgradeChoices: game.previousUpgradeChoices,
    stats: game.stats,
    combat: {
      momentum: game.momentum,
      precisionCharge: game.precisionCharge,
      overdriveTimer: game.overdriveTimer,
      perfectCatches: game.combatDepthStats?.perfectCatches,
      precisionKills: game.combatDepthStats?.precisionKills,
      bankKills: game.combatDepthStats?.bankKills,
      overdrives: game.combatDepthStats?.overdrives,
    },
  });
}

export class CheckpointStore {
  constructor(storage, key = CHECKPOINT_STORAGE_KEY) {
    if (storage !== undefined) this.storage = storage;
    else {
      try { this.storage = globalThis.localStorage; }
      catch { this.storage = null; }
    }
    this.key = key;
  }

  load() {
    try {
      const raw = this.storage?.getItem(this.key);
      if (!raw) return null;
      const checkpoint = sanitizeCheckpoint(JSON.parse(raw));
      if (!checkpoint) this.clear();
      return checkpoint;
    } catch {
      return null;
    }
  }

  save(value) {
    const checkpoint = sanitizeCheckpoint(value);
    if (!checkpoint) return null;

    const current = this.load();
    if (current && current.wave > checkpoint.wave) return current;

    try {
      this.storage?.setItem(this.key, JSON.stringify(checkpoint));
      return checkpoint;
    } catch {
      return current || null;
    }
  }

  clear() {
    try { this.storage?.removeItem(this.key); }
    catch { /* Restricted storage must not block gameplay. */ }
  }
}
