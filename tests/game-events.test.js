import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  GAME_EVENTS,
  GAME_EVENT_SCHEMA_VERSION,
  GAME_EVENT_TYPES,
  assertGameEventType,
  isGameEventType,
} from '../src/core/game-events.js';
import {
  GAME_STATES,
  GAME_STATE_VALUES,
  assertGameState,
  isGameState,
} from '../src/core/game-states.js';

test('game event catalog is unique, frozen, and stable', () => {
  assert.equal(GAME_EVENT_SCHEMA_VERSION, 1);
  assert.ok(Object.isFrozen(GAME_EVENTS));
  assert.ok(Object.isFrozen(GAME_EVENT_TYPES));
  assert.equal(new Set(GAME_EVENT_TYPES).size, GAME_EVENT_TYPES.length);
  assert.ok(GAME_EVENT_TYPES.length >= 18);
  assert.equal(GAME_EVENTS.RUN_STARTED, 'run.started');
  assert.equal(GAME_EVENTS.WAVE_CLEARED, 'wave.cleared');
  assert.equal(GAME_EVENTS.UPGRADE_SELECTED, 'upgrade.selected');
});

test('event type guards accept only catalog values', () => {
  for (const type of GAME_EVENT_TYPES) {
    assert.equal(isGameEventType(type), true);
    assert.equal(assertGameEventType(type), type);
  }
  assert.equal(isGameEventType('unknown.event'), false);
  assert.throws(() => assertGameEventType('unknown.event'), /Unknown game event type/);
});

test('game state contract matches the runtime state machine', () => {
  assert.deepEqual(GAME_STATE_VALUES, ['menu', 'playing', 'upgrade', 'paused', 'gameover']);
  assert.ok(Object.isFrozen(GAME_STATES));
  for (const state of GAME_STATE_VALUES) {
    assert.equal(isGameState(state), true);
    assert.equal(assertGameState(state), state);
  }
  assert.equal(isGameState('loading'), false);
  assert.throws(() => assertGameState('loading'), /Unknown game state/);
});

test('event runtime integrates every required gameplay event without editing base combat', async () => {
  const source = await readFile(new URL('../src/core/event-runtime.js', import.meta.url), 'utf8');
  const mainSource = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');

  const requiredEvents = [
    'RUN_STARTED',
    'RUN_FINISHED',
    'STATE_CHANGED',
    'WAVE_STARTED',
    'WAVE_CLEARED',
    'ENEMY_SPAWNED',
    'ENEMY_DAMAGED',
    'ENEMY_KILLED',
    'BULLET_FIRED',
    'BULLET_RECALL_STARTED',
    'BULLET_CAUGHT',
    'BULLET_RICOCHETED',
    'PLAYER_DASHED',
    'PLAYER_DAMAGED',
    'PLAYER_SHIELD_ABSORBED',
    'PLAYER_REVIVED',
    'UPGRADE_OFFERED',
    'UPGRADE_SELECTED',
  ];

  for (const eventName of requiredEvents) {
    assert.match(source, new RegExp(`GAME_EVENTS\\.${eventName}`));
  }
  assert.match(mainSource, /new OneBulletEventRuntime/);
  assert.match(mainSource, /__ONE_BULLET_EVENTS__/);
});
