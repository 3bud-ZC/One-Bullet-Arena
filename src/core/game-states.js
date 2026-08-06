export const GAME_STATES = Object.freeze({
  MENU: 'menu',
  PLAYING: 'playing',
  UPGRADE: 'upgrade',
  PAUSED: 'paused',
  GAME_OVER: 'gameover',
});

export const GAME_STATE_VALUES = Object.freeze(Object.values(GAME_STATES));

const GAME_STATE_SET = new Set(GAME_STATE_VALUES);

export function isGameState(state) {
  return typeof state === 'string' && GAME_STATE_SET.has(state);
}

export function assertGameState(state) {
  if (!isGameState(state)) throw new TypeError(`Unknown game state: ${String(state)}`);
  return state;
}
