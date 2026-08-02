import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMapOverhaulProfile,
  mapProfileComplexity,
  mapVariantForWave,
  mapVariantsForRegion,
  movingWallRect,
  normalizeMapWave,
} from '../src/map-overhaul-data.js';

const REGIONS = ['neon', 'forge', 'void'];

test('every region exposes eight unique arena identities', () => {
  for (const regionId of REGIONS) {
    const variants = mapVariantsForRegion(regionId);
    assert.equal(variants.length, 8);
    assert.equal(new Set(variants.map((item) => item.id)).size, 8);
    assert.equal(new Set(variants.map((item) => item.name)).size, 8);
    assert.ok(variants.every((item) => item.name && item.subtitle));
  }
});

test('map profiles remain deterministic for region and local wave', () => {
  for (const regionId of REGIONS) {
    for (let wave = 1; wave <= 8; wave += 1) {
      assert.deepEqual(
        createMapOverhaulProfile(regionId, wave),
        createMapOverhaulProfile(regionId, wave),
      );
    }
  }
});

test('arena complexity grows from the introduction to the guardian approach', () => {
  for (const regionId of REGIONS) {
    const first = createMapOverhaulProfile(regionId, 1);
    const middle = createMapOverhaulProfile(regionId, 4);
    const final = createMapOverhaulProfile(regionId, 8);
    assert.ok(mapProfileComplexity(first) < mapProfileComplexity(middle));
    assert.ok(mapProfileComplexity(middle) < mapProfileComplexity(final));
    assert.equal(first.stage, 1);
    assert.equal(final.stage, 4);
  }
});

test('early maps stay readable while late maps provide interactive counterplay', () => {
  for (const regionId of REGIONS) {
    const first = createMapOverhaulProfile(regionId, 1);
    const second = createMapOverhaulProfile(regionId, 2);
    const final = createMapOverhaulProfile(regionId, 8);
    assert.equal(first.movingWalls.length, 0);
    assert.equal(first.relays.length, 0);
    assert.ok(second.relays.length >= 1);
    assert.ok(final.movingWalls.length >= 4);
    assert.ok(final.relays.length >= 3);
    assert.ok(final.boostPads.length >= 3);
  }
});

test('region profiles preserve distinct interactive field identities', () => {
  const neon = createMapOverhaulProfile('neon', 8);
  const forge = createMapOverhaulProfile('forge', 8);
  const voidMap = createMapOverhaulProfile('void', 8);
  assert.ok(neon.fields.every((field) => field.type === 'signal'));
  assert.ok(forge.fields.some((field) => field.type === 'coolant'));
  assert.ok(forge.fields.some((field) => field.type === 'steam'));
  assert.ok(voidMap.fields.some((field) => field.type === 'phase-slow'));
  assert.ok(voidMap.fields.some((field) => field.type === 'phase-fast'));
});

test('moving wall positions are bounded and repeatable', () => {
  for (const regionId of REGIONS) {
    const profile = createMapOverhaulProfile(regionId, 8);
    for (const wall of profile.movingWalls) {
      const first = movingWallRect(wall, 12.75, false);
      const repeated = movingWallRect(wall, 12.75, false);
      const opened = movingWallRect(wall, 12.75, true);
      assert.deepEqual(first, repeated);
      assert.ok(first.x >= 42 && first.y >= 42);
      assert.ok(first.x + first.w <= 1238);
      assert.ok(first.y + first.h <= 678);
      assert.ok(opened.x >= 42 && opened.y >= 42);
    }
  }
});

test('unsafe wave values normalize into the supported eight-map cycle', () => {
  assert.equal(normalizeMapWave(-99), 1);
  assert.equal(normalizeMapWave(0), 1);
  assert.equal(normalizeMapWave(4.9), 4);
  assert.equal(normalizeMapWave(999), 8);
  assert.equal(mapVariantForWave('unknown', 1).id, 'arrival-grid');
});
