import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADVANCED_SYNERGIES,
  OVERDRIVE_BY_CORE,
  RELICS,
  createDefaultBuildCodex,
  createRelicChoices,
  normalizeBuildCodex,
  recordRelicDiscovery,
  recordSynergyDiscovery,
  resolveAdvancedSynergies,
} from '../src/advanced-builds-data.js';

test('advanced catalogue contains twenty-five unique Arabic Relics', () => {
  assert.equal(RELICS.length, 25);
  assert.equal(new Set(RELICS.map((relic) => relic.id)).size, 25);
  for (const relic of RELICS) {
    assert.ok(relic.name.length >= 4);
    assert.ok(relic.description.length >= 12);
    assert.ok(['common', 'rare', 'epic', 'legendary'].includes(relic.rarity));
  }
});

test('every bullet core owns a distinct Overdrive configuration', () => {
  assert.deepEqual(Object.keys(OVERDRIVE_BY_CORE).sort(), ['heavy', 'recall', 'ricochet', 'shock', 'standard']);
  assert.equal(new Set(Object.values(OVERDRIVE_BY_CORE).map((item) => item.name)).size, 5);
  for (const item of Object.values(OVERDRIVE_BY_CORE)) assert.ok(item.duration >= 5);
});

test('Relic choices are deterministic, unique, and exclude owned Relics', () => {
  const owned = ['pocket-mirror', 'collapse-core'];
  const first = createRelicChoices('stable-seed', owned, 3);
  const second = createRelicChoices('stable-seed', owned, 3);
  assert.deepEqual(first, second);
  assert.equal(first.length, 3);
  assert.equal(new Set(first.map((item) => item.id)).size, 3);
  assert.equal(first.some((item) => owned.includes(item.id)), false);
});

test('advanced Synergies require the correct core and every required Relic', () => {
  const maze = ADVANCED_SYNERGIES.find((item) => item.id === 'maze-master');
  assert.ok(maze);
  assert.deepEqual(resolveAdvancedSynergies('standard', maze.relics), []);
  assert.deepEqual(resolveAdvancedSynergies('ricochet', maze.relics.slice(0, -1)), []);
  assert.equal(resolveAdvancedSynergies('ricochet', maze.relics)[0].id, 'maze-master');
});

test('Build Codex discovery remains unique while pick counts accumulate', () => {
  let codex = createDefaultBuildCodex();
  codex = recordRelicDiscovery(codex, 'pocket-mirror');
  codex = recordRelicDiscovery(codex, 'pocket-mirror');
  codex = recordSynergyDiscovery(codex, ['maze-master', 'maze-master']);
  assert.deepEqual(codex.discoveredRelics, ['pocket-mirror']);
  assert.equal(codex.relicPickCounts['pocket-mirror'], 2);
  assert.deepEqual(codex.discoveredSynergies, ['maze-master']);
});

test('malformed Build Codex data is repaired and unsupported ids are removed', () => {
  const normalized = normalizeBuildCodex({
    discoveredRelics: ['pocket-mirror', 'invalid', 'pocket-mirror'],
    discoveredSynergies: ['maze-master', 'invalid'],
    relicPickCounts: { 'pocket-mirror': '3.9', invalid: 999 },
    overdriveActivations: -4,
  });
  assert.deepEqual(normalized.discoveredRelics, ['pocket-mirror']);
  assert.deepEqual(normalized.discoveredSynergies, ['maze-master']);
  assert.equal(normalized.relicPickCounts['pocket-mirror'], 3);
  assert.equal(Object.hasOwn(normalized.relicPickCounts, 'invalid'), false);
  assert.equal(normalized.overdriveActivations, 0);
});
