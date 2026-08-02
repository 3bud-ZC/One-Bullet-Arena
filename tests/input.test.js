import test from 'node:test';
import assert from 'node:assert/strict';
import { physicalKeyForCode } from '../src/input.js';

test('movement controls use physical key positions regardless of keyboard language', () => {
  assert.equal(physicalKeyForCode('KeyW'), 'w');
  assert.equal(physicalKeyForCode('KeyA'), 'a');
  assert.equal(physicalKeyForCode('KeyS'), 's');
  assert.equal(physicalKeyForCode('KeyD'), 'd');
});

test('arrow, dash, recall, pause, and upgrade controls have stable physical mappings', () => {
  assert.equal(physicalKeyForCode('ArrowUp'), 'arrowup');
  assert.equal(physicalKeyForCode('Space'), ' ');
  assert.equal(physicalKeyForCode('ShiftLeft'), 'shift');
  assert.equal(physicalKeyForCode('KeyQ'), 'q');
  assert.equal(physicalKeyForCode('KeyP'), 'p');
  assert.equal(physicalKeyForCode('Digit1'), '1');
  assert.equal(physicalKeyForCode('F12'), null);
});
