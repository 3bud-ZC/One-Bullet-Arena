import test from 'node:test';
import assert from 'node:assert/strict';

import {
  REGION_ENEMIES,
  REGION_ENEMY_IDS,
  codexCompletion,
  createDefaultEnemyCodex,
  discoverCodexEnemy,
  normalizeEnemyCodex,
  recordCodexKill,
  regionEnemiesForRegion,
  regionEnemyComposition,
} from '../src/region-enemies-data.js';

test('region enemy catalogue contains eight unique Arabic archetypes', () => {
  assert.equal(REGION_ENEMIES.length, 8);
  assert.equal(new Set(REGION_ENEMY_IDS).size, 8);
  for (const enemy of REGION_ENEMIES) {
    assert.match(enemy.name, /[\u0600-\u06FF]/);
    assert.ok(['forge', 'void'].includes(enemy.regionId));
    assert.ok(enemy.radius > 0);
    assert.ok(enemy.speed > 0);
    assert.ok(enemy.hp > 0);
    assert.ok(enemy.score > 0);
    assert.equal(enemy.recommendedCores.length, 2);
  }
});

test('each advanced region owns four distinct enemies', () => {
  assert.equal(regionEnemiesForRegion('forge').length, 4);
  assert.equal(regionEnemiesForRegion('void').length, 4);
  assert.equal(regionEnemiesForRegion('neon').length, 0);
});

test('region wave compositions introduce all supported custom enemy ids', () => {
  const forge = new Set();
  const voidIds = new Set();
  for (let wave = 1; wave <= 5; wave += 1) {
    for (const id of regionEnemyComposition('forge', wave, 'region')) forge.add(id);
    for (const id of regionEnemyComposition('void', wave, 'region')) voidIds.add(id);
  }
  for (const enemy of regionEnemiesForRegion('forge')) assert.ok(forge.has(enemy.id));
  for (const enemy of regionEnemiesForRegion('void')) assert.ok(voidIds.has(enemy.id));
  assert.equal(regionEnemyComposition('neon', 1), null);
});

test('story compositions reset local wave progression inside each region', () => {
  assert.deepEqual(
    regionEnemyComposition('forge', 5, 'story'),
    regionEnemyComposition('forge', 1, 'region')
  );
  assert.deepEqual(
    regionEnemyComposition('void', 9, 'story'),
    regionEnemyComposition('void', 1, 'region')
  );
});

test('codex discovery records encounters without unlocking unknown ids', () => {
  const initial = createDefaultEnemyCodex();
  const first = discoverCodexEnemy(initial, 'shield-drone', '2026-08-02T12:00:00.000Z');
  assert.equal(first.discovered, true);
  assert.equal(first.codex.entries['shield-drone'].encounters, 1);
  const second = discoverCodexEnemy(first.codex, 'shield-drone', '2026-08-02T12:01:00.000Z');
  assert.equal(second.discovered, false);
  assert.equal(second.codex.entries['shield-drone'].encounters, 2);
  const unknown = discoverCodexEnemy(second.codex, 'unsupported-enemy');
  assert.equal(unknown.discovered, false);
  assert.equal(unknown.codex.entries['unsupported-enemy'], undefined);
});

test('codex kill tracking preserves encounter totals and completion', () => {
  let codex = discoverCodexEnemy(createDefaultEnemyCodex(), 'phase-walker').codex;
  codex = recordCodexKill(codex, 'phase-walker');
  assert.equal(codex.entries['phase-walker'].encounters, 1);
  assert.equal(codex.entries['phase-walker'].kills, 1);
  const completion = codexCompletion(codex);
  assert.deepEqual(completion, { discovered: 1, total: 8, ratio: 1 / 8 });
});

test('malformed codex data is repaired and unsupported entries are removed', () => {
  const normalized = normalizeEnemyCodex({
    version: 99,
    entries: {
      'repair-bot': { discoveredAt: 12, encounters: -9, kills: '4' },
      unknown: { encounters: 99, kills: 99 },
    },
  });
  assert.deepEqual(normalized.entries['repair-bot'], {
    discoveredAt: '12',
    encounters: 0,
    kills: 4,
  });
  assert.equal(normalized.entries.unknown, undefined);
  assert.equal(normalized.version, 1);
});
