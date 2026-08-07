import test from 'node:test';
import assert from 'node:assert/strict';
import { UI_LAYOUT_VERSION, bulletHudCopy, compactHudLayout } from '../src/ui-layout-runtime.js';

test('UI release identity follows the canonical release source', () => {
  assert.equal(UI_LAYOUT_VERSION, '3.0.0-checkpoint');
});

test('bullet HUD copy is technical, compact, and deterministic', () => {
  assert.deepEqual(bulletHudCopy('READY'), { title: 'IN HAND', subtitle: 'READY TO FIRE' });
  assert.deepEqual(bulletHudCopy('FIRED'), { title: 'IN ARENA', subtitle: 'Q TO RECALL' });
  assert.deepEqual(bulletHudCopy('RETURNING'), { title: 'RETURNING', subtitle: 'MOVE TO CATCH' });
  assert.deepEqual(bulletHudCopy('unknown'), bulletHudCopy('READY'));
});

test('compact desktop HUD remains inside the canvas and below the safe-height target', () => {
  const layout = compactHudLayout(1280);
  assert.equal(layout.height, 62);
  assert.ok(layout.safeBottom <= 82);
  assert.equal(layout.left.x, layout.margin);
  assert.ok(layout.left.x + layout.left.w <= layout.center.x);
  assert.ok(layout.center.x + layout.center.w <= layout.right.x);
  assert.ok(layout.right.x + layout.right.w <= 1280 - layout.margin + 0.001);
});

test('compact HUD keeps equal side panels and deterministic gaps', () => {
  const layout = compactHudLayout(1280);
  const leftGap = layout.center.x - (layout.left.x + layout.left.w);
  const rightGap = layout.right.x - (layout.center.x + layout.center.w);
  assert.ok(Math.abs(layout.left.w - layout.right.w) < 0.001);
  assert.ok(Math.abs(leftGap - layout.gap) < 0.001);
  assert.ok(Math.abs(rightGap - layout.gap) < 0.001);
});

test('narrow logical canvases still receive non-overlapping panels', () => {
  const layout = compactHudLayout(960);
  assert.ok(layout.left.w > 0);
  assert.ok(layout.center.w > 0);
  assert.ok(layout.right.w > 0);
  assert.ok(layout.left.x + layout.left.w < layout.center.x);
  assert.ok(layout.center.x + layout.center.w < layout.right.x);
  assert.ok(layout.right.x + layout.right.w <= 960);
});
