import test from 'node:test';
import assert from 'node:assert/strict';

import { arenaThemeForWave, enemySilhouette } from '../src/visual-identity.js';

test('arena themes progress across the run', () => {
  assert.equal(arenaThemeForWave(1), 'neon-circuit');
  assert.equal(arenaThemeForWave(2), 'neon-circuit');
  assert.equal(arenaThemeForWave(3), 'reactor-forge');
  assert.equal(arenaThemeForWave(4), 'reactor-forge');
  assert.equal(arenaThemeForWave(5), 'void-rift');
  assert.equal(arenaThemeForWave(5, true), 'core-sanctum');
});

test('enemy types have distinct readable silhouettes', () => {
  assert.equal(enemySilhouette('scout'), 3);
  assert.equal(enemySilhouette('brute'), 8);
  assert.equal(enemySilhouette('sniper'), 4);
  assert.equal(enemySilhouette('charger'), 3);
  assert.equal(enemySilhouette('splitter'), 6);
  assert.equal(enemySilhouette('unknown'), 4);
});
