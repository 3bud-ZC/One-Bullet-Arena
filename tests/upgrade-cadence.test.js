import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEGACY_UPGRADE_WAVE_INTERVAL,
  UPGRADE_WAVE_INTERVAL,
  upgradesEarnedByWave,
} from '../src/game-data.js';
import {
  CHECKPOINT_CADENCE_VERSION,
  captureCheckpoint,
  owedUpgradesForLegacyWave,
  sanitizeCheckpoint,
} from '../src/core/checkpoint-store.js';

test('upgrades are offered every three completed waves', () => {
  assert.equal(UPGRADE_WAVE_INTERVAL, 3);
  const offered = [];
  for (let wave = 1; wave <= 20; wave += 1) {
    if (wave > 0 && wave % UPGRADE_WAVE_INTERVAL === 0) offered.push(wave);
  }
  assert.deepEqual(offered, [3, 6, 9, 12, 15, 18]);
});

test('the sector cadence is unchanged and independent of the upgrade cadence', () => {
  // Sectors still unlock every 5 waves; only rewards moved.
  assert.equal(LEGACY_UPGRADE_WAVE_INTERVAL, 5);
  assert.notEqual(UPGRADE_WAVE_INTERVAL, LEGACY_UPGRADE_WAVE_INTERVAL);
});

test('a wave-15 run has a materially developed build under the new cadence', () => {
  assert.equal(upgradesEarnedByWave(15, UPGRADE_WAVE_INTERVAL), 5);
  assert.equal(upgradesEarnedByWave(15, LEGACY_UPGRADE_WAVE_INTERVAL), 3);
});

test('legacy checkpoints are owed exactly the difference between cadences', () => {
  // A checkpoint stores the wave about to be played, so the debt is based on
  // wave - 1 completed waves.
  const owed = (wave) => upgradesEarnedByWave(wave - 1, UPGRADE_WAVE_INTERVAL)
    - upgradesEarnedByWave(wave - 1, LEGACY_UPGRADE_WAVE_INTERVAL);

  for (const wave of [1, 2, 6, 10, 15, 21, 30, 41]) {
    assert.equal(owedUpgradesForLegacyWave(wave), Math.max(0, owed(wave)), `wave ${wave}`);
  }
  assert.equal(owedUpgradesForLegacyWave(15), 2);
  assert.equal(owedUpgradesForLegacyWave(10), 2);
  assert.equal(owedUpgradesForLegacyWave(1), 0);
});

test('a pre-cadence checkpoint is migrated once and carries its debt', () => {
  // No cadenceVersion field: this is what a v3.10 save looks like.
  const legacy = sanitizeCheckpoint({
    schemaVersion: 1,
    wave: 15,
    score: 4820,
    player: { x: 640, y: 360, health: 3, maxHealth: 4 },
    upgradeStacks: {},
    stats: { upgrades: 3 },
  });

  assert.equal(legacy.cadenceVersion, CHECKPOINT_CADENCE_VERSION);
  assert.equal(legacy.owedUpgrades, 2);
});

test('a migrated checkpoint never re-grants a spent debt on reload', () => {
  // Round-trip a migrated save whose debt has been fully spent.
  const spent = sanitizeCheckpoint({
    schemaVersion: 1,
    cadenceVersion: CHECKPOINT_CADENCE_VERSION,
    owedUpgrades: 0,
    wave: 15,
    player: { x: 640, y: 360, health: 3, maxHealth: 4 },
    upgradeStacks: {},
    stats: { upgrades: 5 },
  });

  assert.equal(spent.owedUpgrades, 0, 'a spent debt must stay spent');

  const partially = sanitizeCheckpoint({
    schemaVersion: 1,
    cadenceVersion: CHECKPOINT_CADENCE_VERSION,
    owedUpgrades: 1,
    wave: 15,
    player: { x: 640, y: 360, health: 3, maxHealth: 4 },
    upgradeStacks: {},
    stats: { upgrades: 4 },
  });
  assert.equal(partially.owedUpgrades, 1);
});

test('checkpoint capture persists the remaining debt rather than recomputing it', () => {
  const game = {
    wave: 15,
    score: 100,
    runTime: 10,
    combo: 0,
    comboTimer: 0,
    maxCombo: 0,
    owedUpgrades: 1,
    player: { x: 640, y: 360, health: 3, maxHealth: 4, shield: 0 },
    upgradeStacks: {},
    previousUpgradeChoices: [],
    stats: { upgrades: 4 },
  };
  const captured = captureCheckpoint(game, '3.11.0');
  assert.equal(captured.owedUpgrades, 1);
  assert.equal(captured.cadenceVersion, CHECKPOINT_CADENCE_VERSION);
});

test('migration never fabricates upgrades or touches the saved build', () => {
  const stacks = { 'heavy-shot': 2, 'quick-dash': 1 };
  const legacy = sanitizeCheckpoint({
    schemaVersion: 1,
    wave: 15,
    player: { x: 640, y: 360, health: 3, maxHealth: 4 },
    upgradeStacks: stacks,
    stats: { upgrades: 3 },
  });

  assert.equal(legacy.upgradeStacks['heavy-shot'], 2);
  assert.equal(legacy.upgradeStacks['quick-dash'], 1);
  assert.equal(legacy.stats.upgrades, 3, 'the earned count must not be inflated by the debt');
});

test('checkpoint schema version stays 1 so existing saves still load', () => {
  const legacy = sanitizeCheckpoint({
    schemaVersion: 1,
    wave: 9,
    player: { x: 640, y: 360, health: 2, maxHealth: 3 },
    upgradeStacks: {},
    stats: {},
  });
  assert.ok(legacy, 'a v3.10 checkpoint must still deserialize');
  assert.equal(legacy.schemaVersion, 1);
  assert.equal(legacy.wave, 9);
});
