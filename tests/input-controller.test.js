import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeKeyboardInput } from '../src/input-controller.js';

test('physical WASD stays stable when the active keyboard layout is Arabic', () => {
  assert.equal(normalizeKeyboardInput({ code: 'KeyW', key: 'ص' }), 'w');
  assert.equal(normalizeKeyboardInput({ code: 'KeyA', key: 'ش' }), 'a');
  assert.equal(normalizeKeyboardInput({ code: 'KeyS', key: 'س' }), 's');
  assert.equal(normalizeKeyboardInput({ code: 'KeyD', key: 'ي' }), 'd');
});

test('physical action keys stay stable across keyboard layouts', () => {
  assert.equal(normalizeKeyboardInput({ code: 'KeyQ', key: 'ض' }), 'q');
  assert.equal(normalizeKeyboardInput({ code: 'KeyP', key: 'ح' }), 'p');
  assert.equal(normalizeKeyboardInput({ code: 'KeyM', key: 'ة' }), 'm');
  assert.equal(normalizeKeyboardInput({ code: 'Digit1', key: '!' }), '1');
});

test('arrow keys and fallback key values remain supported', () => {
  assert.equal(normalizeKeyboardInput({ code: 'ArrowUp', key: 'ArrowUp' }), 'arrowup');
  assert.equal(normalizeKeyboardInput({ code: '', key: 'X' }), 'x');
  assert.equal(normalizeKeyboardInput({}), '');
});
