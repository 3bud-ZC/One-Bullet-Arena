import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateRank, formatUiNumber } from '../src/ui-polish.js';

test('result ranking rewards strong victorious runs', () => {
  assert.equal(calculateRank({ score: 18000, hits: 34, shots: 38, runTime: 105, victory: true }), 'S');
  assert.equal(calculateRank({ score: 9000, hits: 18, shots: 35, runTime: 145, victory: true }), 'A');
});

test('result ranking keeps incomplete or inefficient runs below top grades', () => {
  assert.equal(calculateRank({ score: 2500, hits: 4, shots: 22, runTime: 190, victory: false }), 'C');
});

test('UI number formatter supports Latin digits for RTL-safe stats', () => {
  assert.equal(formatUiNumber(15379, true), '15,379');
  assert.match(formatUiNumber(37, false), /٣٧|37/);
});
