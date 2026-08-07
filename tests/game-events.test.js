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
  assert.equal(GAME_EVENT_SCHEMA_VERSION, 3);
  assert.ok(Object.isFrozen(GAME_EVENTS));
  assert.ok(Object.isFrozen(GAME_EVENT_TYPES));
  assert.equal(new Set(GAME_EVENT_TYPES).size, GAME_EVENT_TYPES.length);
  assert.ok(GAME_EVENT_TYPES.length >= 27);
  assert.equal(GAME_EVENTS.RUN_STARTED, 'run.started');
  assert.equal(GAME_EVENTS.WAVE_CLEARED, 'wave.cleared');
  assert.equal(GAME_EVENTS.UPGRADE_SELECTED, 'upgrade.selected');
  assert.equal(GAME_EVENTS.PERFECT_CATCH, 'skill.perfect-catch');
  assert.equal(GAME_EVENTS.OVERDRIVE_STARTED, 'skill.overdrive-started');
  assert.equal(GAME_EVENTS.CHECKPOINT_SAVED, 'checkpoint.saved');
  assert.equal(GAME_EVENTS.CHECKPOINT_LOADED, 'checkpoint.loaded');
  assert.equal(GAME_EVENTS.CHECKPOINT_CLEARED, 'checkpoint.cleared');
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

test('runtime layers integrate required events without editing base combat', async () => {
  const eventSource = await readFile(new URL('../src/core/event-runtime.js', import.meta.url), 'utf8');
  const combatSource = await readFile(new URL('../src/core/combat-depth-runtime.js', import.meta.url), 'utf8');
  const checkpointSource = await readFile(new URL('../src/core/checkpoint-runtime.js', import.meta.url), 'utf8');
  const mainSource = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');

  const requiredBaseEvents = [
    'RUN_STARTED', 'RUN_FINISHED', 'STATE_CHANGED', 'WAVE_STARTED', 'WAVE_CLEARED',
    'ENEMY_SPAWNED', 'ENEMY_DAMAGED', 'ENEMY_KILLED', 'BULLET_FIRED',
    'BULLET_RECALL_STARTED', 'BULLET_CAUGHT', 'BULLET_RICOCHETED', 'PLAYER_DASHED',
    'PLAYER_DAMAGED', 'PLAYER_SHIELD_ABSORBED', 'PLAYER_REVIVED', 'UPGRADE_OFFERED',
    'UPGRADE_SELECTED',
  ];
  const requiredSkillEvents = [
    'PERFECT_CATCH', 'PRECISION_SHOT_FIRED', 'BANK_CHAINED', 'MOMENTUM_CHANGED',
    'OVERDRIVE_STARTED', 'OVERDRIVE_ENDED',
  ];
  const requiredCheckpointEvents = ['CHECKPOINT_SAVED', 'CHECKPOINT_LOADED', 'CHECKPOINT_CLEARED'];

  for (const eventName of requiredBaseEvents) assert.match(eventSource, new RegExp(`GAME_EVENTS\\.${eventName}`));
  for (const eventName of requiredSkillEvents) assert.match(combatSource, new RegExp(`GAME_EVENTS\\.${eventName}`));
  for (const eventName of requiredCheckpointEvents) assert.match(checkpointSource, new RegExp(`GAME_EVENTS\\.${eventName}`));
  assert.match(mainSource, /new OneBulletCheckpointRuntime/);
  assert.match(mainSource, /__ONE_BULLET_CHECKPOINT__/);
});
