import test from 'node:test';
import assert from 'node:assert/strict';
import { UPGRADES, arenaForWave, bossArena, pickUpgradeChoices } from '../src/content.js';

test('upgrade catalogue uses unique ids and Arabic labels', () => {
  assert.equal(UPGRADES.length, 8);
  assert.equal(new Set(UPGRADES.map((upgrade) => upgrade.id)).size, UPGRADES.length);
  assert.ok(UPGRADES.every((upgrade) => /[\u0600-\u06FF]/.test(upgrade.name)));
});

test('upgrade choices respect max stacks', () => {
  const fullStacks = Object.fromEntries(UPGRADES.slice(0, 6).map((upgrade) => [upgrade.id, upgrade.maxStacks]));
  const choices = pickUpgradeChoices(fullStacks, 3, () => 0);
  assert.equal(choices.length, 2);
  assert.ok(choices.every((upgrade) => !fullStacks[upgrade.id]));
});

test('arena state is cloned for each wave load', () => {
  const first = arenaForWave(2);
  const second = arenaForWave(2);
  first.obstacles.pop();
  assert.notEqual(first.obstacles.length, second.obstacles.length);
});

test('boss arena has a distinct Arabic identity', () => {
  const arena = bossArena();
  assert.equal(arena.id, 'core');
  assert.match(arena.name, /[\u0600-\u06FF]/);
  assert.ok(arena.obstacles.length >= 4);
});
