import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_MISSION,
  DIFFICULTIES,
  REGIONS,
  RUN_MODES,
  compositionForMissionWave,
  createRegionArenaState,
  difficultyById,
  normalizeMission,
  regionIdForWave,
  totalWavesForMission,
} from '../src/regions-data.js';

test('mission normalization repairs unknown values', () => {
  assert.deepEqual(normalizeMission({ modeId: 'bad', regionId: 'bad', difficultyId: 'bad' }), DEFAULT_MISSION);
});

test('story route advances through all three regions', () => {
  const mission = { modeId: 'story', regionId: 'void', difficultyId: 'hunter' };
  assert.equal(totalWavesForMission(mission), 12);
  assert.equal(regionIdForWave(mission, 1), 'neon');
  assert.equal(regionIdForWave(mission, 4), 'neon');
  assert.equal(regionIdForWave(mission, 5), 'forge');
  assert.equal(regionIdForWave(mission, 8), 'forge');
  assert.equal(regionIdForWave(mission, 9), 'void');
  assert.equal(regionIdForWave(mission, 12), 'void');
});

test('region missions keep their selected region for all waves', () => {
  const mission = { modeId: 'region', regionId: 'forge', difficultyId: 'corebreaker' };
  assert.equal(totalWavesForMission(mission), 5);
  assert.equal(regionIdForWave(mission, 1), 'forge');
  assert.equal(regionIdForWave(mission, 5), 'forge');
});

test('each region creates a cloned playable arena with unique mechanics', () => {
  const neon = createRegionArenaState('neon', 1);
  const forge = createRegionArenaState('forge', 1);
  const voidArena = createRegionArenaState('void', 1);

  assert.ok(neon.effects.portals.length >= 2);
  assert.ok(forge.effects.conveyors.length >= 1);
  assert.ok(voidArena.effects.gravityWells.length >= 1);
  assert.notEqual(neon.obstacles, createRegionArenaState('neon', 1).obstacles);
  assert.ok(neon.obstacles.every((item) => item.id));
});

test('story compositions scale without introducing unsupported enemy ids', () => {
  const supported = new Set(['scout', 'brute', 'sniper', 'charger', 'splitter']);
  for (let wave = 1; wave <= 12; wave += 1) {
    const composition = compositionForMissionWave({ modeId: 'story', regionId: 'neon', difficultyId: 'hunter' }, wave);
    assert.ok(composition.length >= 3);
    assert.ok(composition.every((id) => supported.has(id)));
  }
});

test('difficulty catalogue exposes safe health and reward multipliers', () => {
  assert.equal(REGIONS.length, 3);
  assert.equal(RUN_MODES.length, 2);
  assert.equal(DIFFICULTIES.length, 4);
  assert.equal(difficultyById('one-hit').playerHealth, 1);
  assert.ok(difficultyById('corebreaker').rewardMultiplier > 1);
  assert.equal(difficultyById('unknown').id, 'hunter');
});
