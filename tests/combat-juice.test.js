import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  COMBAT_JUICE_RUNTIME_VERSION,
  combatJuiceIntensity,
  deterministicShard,
  juicePulseAlpha,
} from '../src/core/combat-juice-runtime.js';

test('combat juice exposes the v3.4 runtime contract', () => {
  assert.equal(COMBAT_JUICE_RUNTIME_VERSION, '3.4.0-combat-juice');
  assert.equal(juicePulseAlpha(0.5, 0.4), 0.2);
  assert.equal(juicePulseAlpha(4, 1), 1);
  assert.equal(juicePulseAlpha(-1, 1), 0);
});

test('combat juice intensity rewards high-value moments but stays bounded', () => {
  const base = combatJuiceIntensity();
  const chained = combatJuiceIntensity({ combo: 8, bankLevel: 4, bounceCount: 5 });
  const lethal = combatJuiceIntensity({ lethal: true, combo: 8, bankLevel: 4, bounceCount: 5 });
  const boss = combatJuiceIntensity({ lethal: true, boss: true, combo: 30, bankLevel: 20, bounceCount: 20 });

  assert.ok(base >= 0.72);
  assert.ok(chained > base);
  assert.ok(lethal > chained);
  assert.ok(boss <= 1.75);
  assert.ok(boss > lethal);
});

test('combat shard layout is deterministic and visually varied', () => {
  const first = deterministicShard(4, 99, 15);
  const second = deterministicShard(4, 99, 15);
  const neighbor = deterministicShard(5, 99, 15);

  assert.deepEqual(first, second);
  assert.notDeepEqual(first, neighbor);
  assert.ok(first.angle >= 0 && first.angle < Math.PI * 2);
  assert.ok(first.speed > 100);
  assert.ok(first.size > 0);
  assert.ok(first.delay >= 0 && first.delay < 0.035);
  assert.ok(Object.isFrozen(first));
});

test('combat juice remains presentation-focused and preserves gameplay values', async () => {
  const source = await readFile(new URL('../src/core/combat-juice-runtime.js', import.meta.url), 'utf8');

  assert.match(source, /extends OneBulletVisualOverhaulRuntime/);
  assert.match(source, /gameplayBalanceChangedByCombatJuice: false/);
  assert.match(source, /collisionGeometryChangedByCombatJuice: false/);
  assert.doesNotMatch(source, /arenaStage\.obstacles\s*=/);
  assert.doesNotMatch(source, /player\.speed\s*=/);
  assert.doesNotMatch(source, /enemy\.speed\s*=/);
  assert.doesNotMatch(source, /enemy\.health\s*[-+*/]?=/);
  assert.doesNotMatch(source, /currentBulletDamage\s*\(/);
});
