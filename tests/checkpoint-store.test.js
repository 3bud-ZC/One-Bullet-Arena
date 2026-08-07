import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHECKPOINT_SCHEMA_VERSION,
  CHECKPOINT_STORAGE_KEY,
  CheckpointStore,
  captureCheckpoint,
  sanitizeCheckpoint,
} from '../src/core/checkpoint-store.js';

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

function checkpoint(overrides = {}) {
  return {
    schemaVersion: CHECKPOINT_SCHEMA_VERSION,
    savedAt: 1234,
    releaseVersion: '3.0.0-checkpoint',
    wave: 5,
    score: 4200,
    runTime: 95.5,
    combo: 3,
    comboTimer: 1.2,
    maxCombo: 9,
    secondChanceUsed: true,
    player: { x: 600, y: 350, health: 2, maxHealth: 4, shield: 1 },
    upgradeStacks: { vitality: 1, 'heavy-shot': 2, unknown: 99 },
    previousUpgradeChoices: ['vitality', 'heavy-shot'],
    stats: { shots: 18, hits: 15, kills: 27, upgrades: 4, damageTaken: 2 },
    combat: {
      momentum: 72,
      precisionCharge: 1,
      overdriveTimer: 2.4,
      perfectCatches: 3,
      precisionKills: 2,
      bankKills: 4,
      overdrives: 1,
    },
    ...overrides,
  };
}

test('checkpoint sanitizer validates schema and required wave', () => {
  assert.equal(sanitizeCheckpoint(null), null);
  assert.equal(sanitizeCheckpoint({ schemaVersion: 99, wave: 5 }), null);
  assert.equal(sanitizeCheckpoint({ schemaVersion: 1 }), null);
  assert.equal(sanitizeCheckpoint({ schemaVersion: 1, wave: 0 }), null);

  const clean = sanitizeCheckpoint(checkpoint({
    player: { health: 99, maxHealth: 4, shield: 99 },
    combat: { momentum: 500, overdriveTimer: 50 },
  }));
  assert.equal(clean.wave, 5);
  assert.equal(clean.player.health, 4);
  assert.equal(clean.player.shield, 9);
  assert.equal(clean.combat.momentum, 100);
  assert.equal(clean.combat.overdriveTimer, 6.5);
  assert.equal(Object.hasOwn(clean.upgradeStacks, 'unknown'), false);
});

test('store preserves the highest wave and allows an equal-wave replacement', () => {
  const storage = new MemoryStorage();
  const store = new CheckpointStore(storage);

  assert.equal(store.save(checkpoint({ wave: 5 })).wave, 5);
  assert.equal(store.save(checkpoint({ wave: 3, score: 99999 })).wave, 5);
  assert.equal(store.load().score, 4200);

  store.save(checkpoint({ wave: 5, score: 6100 }));
  assert.equal(store.load().score, 6100);

  store.save(checkpoint({ wave: 6, score: 7200 }));
  assert.equal(store.load().wave, 6);
  assert.equal(store.load().score, 7200);
});

test('invalid stored data is ignored and removed without throwing', () => {
  const storage = new MemoryStorage();
  const store = new CheckpointStore(storage);
  storage.setItem(CHECKPOINT_STORAGE_KEY, '{broken');
  assert.equal(store.load(), null);

  storage.setItem(CHECKPOINT_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, wave: 0 }));
  assert.equal(store.load(), null);
  assert.equal(storage.getItem(CHECKPOINT_STORAGE_KEY), null);

  store.clear();
  assert.equal(store.load(), null);
});

test('capture serializes gameplay progress without transient entities', () => {
  const game = {
    wave: 8,
    score: 12345,
    runTime: 180,
    combo: 4,
    comboTimer: 1.5,
    maxCombo: 12,
    secondChanceUsed: false,
    player: { x: 700, y: 420, health: 3, maxHealth: 5, shield: 1 },
    upgradeStacks: { vitality: 2, 'magnetic-recall': 3 },
    previousUpgradeChoices: ['vitality'],
    stats: { shots: 40, hits: 31, kills: 55, upgrades: 7, damageTaken: 4 },
    momentum: 88,
    precisionCharge: 1,
    overdriveTimer: 0,
    combatDepthStats: { perfectCatches: 5, precisionKills: 4, bankKills: 6, overdrives: 2 },
    enemies: [{ id: 1 }],
    enemyShots: [{ id: 2 }],
  };

  const saved = captureCheckpoint(game, '3.0.0-checkpoint');
  assert.equal(saved.wave, 8);
  assert.equal(saved.player.maxHealth, 5);
  assert.equal(saved.upgradeStacks.vitality, 2);
  assert.equal(saved.combat.momentum, 88);
  assert.equal(saved.combat.perfectCatches, 5);
  assert.equal(Object.hasOwn(saved, 'enemies'), false);
  assert.equal(Object.hasOwn(saved, 'enemyShots'), false);
});
