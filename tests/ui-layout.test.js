import test from 'node:test';
import assert from 'node:assert/strict';
import { UI_LAYOUT_VERSION, bulletHudCopy, compactHudLayout } from '../src/ui-layout-runtime.js';

test('UI release identity follows the canonical release source', () => {
  assert.equal(UI_LAYOUT_VERSION, '3.6.0-global-ui');
});

test('legacy bullet HUD helpers remain deterministic for gameplay compatibility', () => {
  assert.deepEqual(bulletHudCopy('READY'), { title: 'IN HAND', subtitle: 'READY TO FIRE' });
  assert.deepEqual(bulletHudCopy('FIRED'), { title: 'IN ARENA', subtitle: 'Q TO RECALL' });
  assert.deepEqual(bulletHudCopy('RETURNING'), { title: 'RETURNING', subtitle: 'MOVE TO CATCH' });
  assert.deepEqual(bulletHudCopy('unknown'), bulletHudCopy('READY'));
});

test('legacy compact HUD geometry remains safe for inherited gameplay hit zones', () => {
  const layout = compactHudLayout(1280);
  assert.equal(layout.height, 62);
  assert.ok(layout.safeBottom <= 82);
  assert.equal(layout.left.x, layout.margin);
  assert.ok(layout.left.x + layout.left.w <= layout.center.x);
  assert.ok(layout.center.x + layout.center.w <= layout.right.x);
  assert.ok(layout.right.x + layout.right.w <= 1280 - layout.margin + 0.001);
});

test('narrow logical canvases still receive non-overlapping inherited HUD geometry', () => {
  const layout = compactHudLayout(960);
  assert.ok(layout.left.w > 0);
  assert.ok(layout.center.w > 0);
  assert.ok(layout.right.w > 0);
  assert.ok(layout.left.x + layout.left.w < layout.center.x);
  assert.ok(layout.center.x + layout.center.w < layout.right.x);
  assert.ok(layout.right.x + layout.right.w <= 960);
});
