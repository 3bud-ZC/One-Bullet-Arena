import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PROTOCOL_REGIONS,
  ROUTE_NODE_TYPES,
  completeRouteNode,
  createProtocolRoute,
  currentRouteNodes,
  protocolComplete,
  selectProtocolChallenge,
  spendBrokenEnergy,
} from '../src/roguelite-route-data.js';

test('protocol route builds three deterministic acts with a boss row', () => {
  const first = createProtocolRoute('fixed-seed');
  const second = createProtocolRoute('fixed-seed');
  assert.equal(first.acts.length, 3);
  assert.deepEqual(first.acts, second.acts);
  assert.deepEqual(first.acts.map((act) => act.regionId), PROTOCOL_REGIONS);
  for (const act of first.acts) {
    assert.equal(act.rows.length, 4);
    assert.equal(act.rows[3].length, 1);
    assert.equal(act.rows[3][0].type, 'boss');
  }
});

test('current route nodes expose only the active row', () => {
  const route = createProtocolRoute('active-row');
  assert.equal(currentRouteNodes(route).length, 3);
  const node = currentRouteNodes(route)[0];
  completeRouteNode(route, node.id);
  assert.equal(route.rowIndex, 1);
  assert.notEqual(currentRouteNodes(route)[0].rowIndex, node.rowIndex);
});

test('completing nodes grants temporary energy and advances acts after bosses', () => {
  const route = createProtocolRoute('economy');
  const combat = route.acts[0].rows[0].find((node) => node.type === 'combat') || route.acts[0].rows[0][0];
  completeRouteNode(route, combat.id, 10);
  assert.equal(route.brokenEnergy, (ROUTE_NODE_TYPES[combat.type]?.reward || 0) + 10);
  route.rowIndex = 3;
  const boss = route.acts[0].rows[3][0];
  completeRouteNode(route, boss.id);
  assert.equal(route.actIndex, 1);
  assert.equal(route.rowIndex, 0);
  assert.ok(route.brokenEnergy >= ROUTE_NODE_TYPES.boss.reward);
});

test('broken energy spending cannot create negative balances', () => {
  const route = createProtocolRoute('spending');
  route.brokenEnergy = 40;
  assert.equal(spendBrokenEnergy(route, 25), true);
  assert.equal(route.brokenEnergy, 15);
  assert.equal(spendBrokenEnergy(route, 20), false);
  assert.equal(route.brokenEnergy, 15);
});

test('protocol completion requires clearing all three boss acts', () => {
  const route = createProtocolRoute('complete');
  assert.equal(protocolComplete(route), false);
  route.actIndex = 3;
  assert.equal(protocolComplete(route), true);
});

test('challenge selection is deterministic and always supported', () => {
  const first = selectProtocolChallenge('daily', 1, 2);
  const second = selectProtocolChallenge('daily', 1, 2);
  assert.deepEqual(first, second);
  assert.ok(['no-damage', 'limited-shots', 'ricochet-hunt'].includes(first.id));
});
