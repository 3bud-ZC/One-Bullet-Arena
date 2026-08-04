import assert from 'node:assert/strict';
import test from 'node:test';

import {
  OBJECTIVE_ROOM_TYPES,
  createObjectiveRoomState,
  localObjectiveWave,
  objectiveIdForWave,
  objectiveParameters,
  objectivePoints,
  objectiveRoomById,
} from '../src/objective-rooms-data.js';

test('objective catalogue contains five distinct Arabic room types', () => {
  assert.equal(OBJECTIVE_ROOM_TYPES.length, 5);
  assert.equal(new Set(OBJECTIVE_ROOM_TYPES.map((item) => item.id)).size, 5);
  for (const objective of OBJECTIVE_ROOM_TYPES) {
    assert.ok(objective.name.length >= 4);
    assert.ok(objective.description.length >= 12);
    assert.match(objective.color, /^#[0-9a-f]{6}$/i);
  }
});

test('regional objective schedule preserves safe opening and lockdown waves', () => {
  assert.equal(objectiveIdForWave({ wave: 1 }), null);
  assert.equal(objectiveIdForWave({ wave: 2 }), 'circuit-sequence');
  assert.equal(objectiveIdForWave({ wave: 3 }), 'ricochet-lock');
  assert.equal(objectiveIdForWave({ wave: 4 }), 'core-defense');
  assert.equal(objectiveIdForWave({ wave: 5 }), 'marked-hunt');
  assert.equal(objectiveIdForWave({ wave: 6 }), 'bullet-separation');
  assert.equal(objectiveIdForWave({ wave: 7 }), 'circuit-sequence');
  assert.equal(objectiveIdForWave({ wave: 8 }), null);
  assert.equal(objectiveIdForWave({ wave: 9 }), null);
  assert.equal(objectiveIdForWave({ wave: 10 }), 'circuit-sequence');
  assert.equal(objectiveIdForWave({ wave: 4, boss: true }), null);
});

test('local wave calculation resets across each eight-wave region', () => {
  assert.equal(localObjectiveWave(1), 1);
  assert.equal(localObjectiveWave(8), 8);
  assert.equal(localObjectiveWave(9), 1);
  assert.equal(localObjectiveWave(16), 8);
  assert.equal(localObjectiveWave(17), 1);
});

test('objective pressure increases without creating unsafe values', () => {
  const earlyLock = objectiveParameters('ricochet-lock', 3);
  const lateLock = objectiveParameters('ricochet-lock', 7);
  assert.ok(lateLock.requiredBounces >= earlyLock.requiredBounces);
  assert.ok(lateLock.requiredBounces <= 3);

  const earlyDefense = objectiveParameters('core-defense', 4);
  const lateDefense = objectiveParameters('core-defense', 7);
  assert.ok(lateDefense.duration > earlyDefense.duration);
  assert.ok(lateDefense.assaultLimit >= earlyDefense.assaultLimit);

  const separation = objectiveParameters('bullet-separation', 6);
  assert.ok(separation.duration > 0);
  assert.ok(separation.minimumDistance >= 170);
  assert.ok(separation.reward > 0);
});

test('objective points are cloned and region-specific', () => {
  const neon = objectivePoints('neon', 3);
  const forge = objectivePoints('forge', 3);
  assert.equal(neon.length, 3);
  assert.equal(forge.length, 3);
  assert.notDeepEqual(neon, forge);
  neon[0].x = 1;
  assert.notEqual(objectivePoints('neon', 3)[0].x, 1);
});

test('room state contains the mechanics required by each objective', () => {
  const circuit = createObjectiveRoomState({ objectiveId: 'circuit-sequence', wave: 7, regionId: 'void' });
  assert.equal(circuit.relays.length, 4);
  assert.equal(circuit.target, 4);

  const lock = createObjectiveRoomState({ objectiveId: 'ricochet-lock', wave: 3 });
  assert.ok(lock.lock.radius > 0);
  assert.equal(lock.target, 1);

  const defense = createObjectiveRoomState({ objectiveId: 'core-defense', wave: 4 });
  assert.equal(defense.core.health, defense.core.maxHealth);
  assert.ok(defense.remaining > 0);

  const hunt = createObjectiveRoomState({ objectiveId: 'marked-hunt', wave: 5 });
  assert.ok(hunt.target >= 3);

  const separation = createObjectiveRoomState({ objectiveId: 'bullet-separation', wave: 6 });
  assert.ok(separation.minimumDistance > 0);
  assert.ok(separation.target > 0);

  assert.equal(createObjectiveRoomState({ objectiveId: 'unknown' }), null);
  assert.equal(objectiveRoomById('unknown'), null);
});
