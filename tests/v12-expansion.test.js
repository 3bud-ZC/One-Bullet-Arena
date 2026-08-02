import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMBAT_TECHNIQUES,
  ENEMY_EVOLUTIONS,
  EXPANDED_RUN_WAVES,
  MAP_MUTATORS,
  expandedComposition,
  expandedLocalWave,
  expandedRegionIdForWave,
  expandedTargetWaves,
  evolutionForEnemy,
  mapMutatorForWave,
  mobileTechniqueLayout,
  techniqueCooldown,
  techniqueTierForWave,
} from '../src/v12-expansion-data.js';

test('expanded missions contain eight regional waves and twenty-four story waves', () => {
  assert.deepEqual(EXPANDED_RUN_WAVES, { region: 8, story: 24 });
  assert.equal(expandedTargetWaves({ modeId: 'region' }), 8);
  assert.equal(expandedTargetWaves({ modeId: 'story' }), 24);
  assert.equal(expandedTargetWaves({ modeId: 'story' }, true), 5);
});

test('expanded story assigns eight waves to every region', () => {
  const story = { modeId: 'story', regionId: 'neon' };
  assert.equal(expandedRegionIdForWave(story, 1), 'neon');
  assert.equal(expandedRegionIdForWave(story, 8), 'neon');
  assert.equal(expandedRegionIdForWave(story, 9), 'forge');
  assert.equal(expandedRegionIdForWave(story, 16), 'forge');
  assert.equal(expandedRegionIdForWave(story, 17), 'void');
  assert.equal(expandedRegionIdForWave(story, 24), 'void');
  assert.equal(expandedLocalWave(story, 17), 1);
  assert.equal(expandedLocalWave(story, 24), 8);
});

test('every region exposes eight increasingly dense compositions', () => {
  for (const regionId of ['neon', 'forge', 'void']) {
    const waves = Array.from({ length: 8 }, (_, index) => expandedComposition(regionId, index + 1));
    assert.equal(waves.length, 8);
    assert.ok(waves.every((wave) => wave.length >= 3));
    assert.ok(waves.at(-1).length > waves[0].length);
  }
});

test('combat techniques are unique and gain shorter cooldowns at higher tiers', () => {
  assert.equal(COMBAT_TECHNIQUES.length, 2);
  assert.equal(new Set(COMBAT_TECHNIQUES.map((item) => item.id)).size, 2);
  for (const technique of COMBAT_TECHNIQUES) {
    assert.ok(technique.name.length >= 5);
    assert.ok(technique.description.length >= 20);
    assert.ok(techniqueCooldown(technique.id, 3) < techniqueCooldown(technique.id, 1));
  }
  assert.equal(techniqueTierForWave(1), 1);
  assert.equal(techniqueTierForWave(4), 2);
  assert.equal(techniqueTierForWave(7), 3);
});

test('enemy evolutions remain deterministic and avoid early, elite, and mini enemies', () => {
  assert.equal(ENEMY_EVOLUTIONS.length, 4);
  assert.equal(evolutionForEnemy({ wave: 2, enemyId: 20 }), null);
  assert.equal(evolutionForEnemy({ wave: 7, enemyId: 20, elite: true }), null);
  assert.equal(evolutionForEnemy({ wave: 7, enemyId: 20, mini: true }), null);
  assert.deepEqual(
    evolutionForEnemy({ wave: 7, enemyId: 24 }),
    evolutionForEnemy({ wave: 7, enemyId: 24 }),
  );
});

test('map mutators rotate predictably inside each region', () => {
  assert.equal(MAP_MUTATORS.length, 6);
  for (const regionId of ['neon', 'forge', 'void']) {
    const first = mapMutatorForWave(regionId, 1);
    const second = mapMutatorForWave(regionId, 2);
    const third = mapMutatorForWave(regionId, 3);
    assert.equal(first.regionId, regionId);
    assert.equal(second.regionId, regionId);
    assert.equal(third.id, first.id);
    assert.notEqual(first.id, second.id);
  }
});

test('mobile technique controls mirror correctly for left-handed play', () => {
  const right = mobileTechniqueLayout({ leftHanded: false, width: 1280, height: 720, scale: 1 });
  const left = mobileTechniqueLayout({ leftHanded: true, width: 1280, height: 720, scale: 1 });
  assert.equal(right.pulse.x + left.pulse.x, 1280);
  assert.equal(right.phase.x + left.phase.x, 1280);
  assert.ok(right.pulse.y < 720);
  assert.ok(right.phase.y < 720);
});
