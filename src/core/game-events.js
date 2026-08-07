export const GAME_EVENT_SCHEMA_VERSION = 2;

export const GAME_EVENTS = Object.freeze({
  RUNTIME_READY: 'runtime.ready',
  RUN_STARTED: 'run.started',
  RUN_FINISHED: 'run.finished',
  STATE_CHANGED: 'state.changed',
  WAVE_STARTED: 'wave.started',
  WAVE_CLEARED: 'wave.cleared',
  ENEMY_SPAWNED: 'enemy.spawned',
  ENEMY_DAMAGED: 'enemy.damaged',
  ENEMY_KILLED: 'enemy.killed',
  BULLET_FIRED: 'bullet.fired',
  BULLET_RECALL_STARTED: 'bullet.recall-started',
  BULLET_CAUGHT: 'bullet.caught',
  BULLET_RICOCHETED: 'bullet.ricocheted',
  PLAYER_DASHED: 'player.dashed',
  PLAYER_DAMAGED: 'player.damaged',
  PLAYER_SHIELD_ABSORBED: 'player.shield-absorbed',
  PLAYER_REVIVED: 'player.revived',
  UPGRADE_OFFERED: 'upgrade.offered',
  UPGRADE_SELECTED: 'upgrade.selected',
  PERFECT_CATCH: 'skill.perfect-catch',
  PRECISION_SHOT_FIRED: 'skill.precision-shot-fired',
  BANK_CHAINED: 'skill.bank-chained',
  MOMENTUM_CHANGED: 'skill.momentum-changed',
  OVERDRIVE_STARTED: 'skill.overdrive-started',
  OVERDRIVE_ENDED: 'skill.overdrive-ended',
});

export const GAME_EVENT_TYPES = Object.freeze(Object.values(GAME_EVENTS));

const EVENT_TYPE_SET = new Set(GAME_EVENT_TYPES);

export function isGameEventType(type) {
  return typeof type === 'string' && EVENT_TYPE_SET.has(type);
}

export function assertGameEventType(type) {
  if (!isGameEventType(type)) throw new TypeError(`Unknown game event type: ${String(type)}`);
  return type;
}
