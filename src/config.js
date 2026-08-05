export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const GAME_VERSION = '2.3.0-stable';
export const MAX_ACTIVE_ENEMIES = 14;
export const GAME_STATES = Object.freeze(['menu', 'playing', 'upgrade', 'paused', 'gameover']);

export const COLORS = Object.freeze({
  background: '#050711',
  panel: 'rgba(9, 15, 33, 0.94)',
  panelSoft: 'rgba(17, 25, 49, 0.94)',
  border: '#3b4978',
  grid: 'rgba(102, 126, 196, 0.08)',
  text: '#f8f9ff',
  muted: '#b6bfdf',
  player: '#62f3ff',
  bullet: '#ffe66d',
  danger: '#ff526a',
  success: '#53f2a1',
  electric: '#58a6ff',
  warning: '#ffb454',
});

export const PHYSICS = Object.freeze({
  playerSpeed: 285,
  dashSpeed: 760,
  baseBulletSpeed: 900,
  bulletStep: 8,
  enemyShotStep: 8,
});

export const TOUCH_CONTROLS = Object.freeze({
  move: Object.freeze({ x: 118, y: GAME_HEIGHT - 112, radius: 68, hitRadius: 92 }),
  recall: Object.freeze({ x: GAME_WIDTH - 92, y: GAME_HEIGHT - 216, radius: 48 }),
  dash: Object.freeze({ x: GAME_WIDTH - 92, y: GAME_HEIGHT - 92, radius: 55 }),
  pause: Object.freeze({ x: GAME_WIDTH - 216, y: GAME_HEIGHT - 92, radius: 42 }),
});

export const STORAGE_KEYS = Object.freeze({
  highScore: 'one-bullet-stable-high-score',
  highWave: 'one-bullet-stable-high-wave',
  audio: 'one-bullet-stable-audio',
  tutorialSeen: 'one-bullet-stable-tutorial-seen',
});
