import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from './game-data.js';
import { TOUCH_LAYOUT, pointInsideCircle } from './ui-renderer.js';

const PHYSICAL_KEY_MAP = Object.freeze({
  KeyW: 'w',
  KeyA: 'a',
  KeyS: 's',
  KeyD: 'd',
  KeyQ: 'q',
  KeyM: 'm',
  KeyP: 'p',
  KeyR: 'r',
  Digit1: '1',
  Digit2: '2',
  Digit3: '3',
  Numpad1: '1',
  Numpad2: '2',
  Numpad3: '3',
  Space: ' ',
  ShiftLeft: 'shift',
  ShiftRight: 'shift',
  Enter: 'enter',
  NumpadEnter: 'enter',
  Escape: 'escape',
  ArrowUp: 'arrowup',
  ArrowDown: 'arrowdown',
  ArrowLeft: 'arrowleft',
  ArrowRight: 'arrowright',
});

export function normalizeKeyboardInput(event = {}) {
  const code = typeof event.code === 'string' ? event.code : '';
  if (Object.hasOwn(PHYSICAL_KEY_MAP, code)) return PHYSICAL_KEY_MAP[code];
  return typeof event.key === 'string' ? event.key.toLowerCase() : '';
}

export class InputController {
  constructor(game) {
    this.game = game;
    this.bound = false;
  }

  bind() {
    if (this.bound) return;
    this.bound = true;
    const game = this.game;

    window.addEventListener('keydown', (event) => {
      const key = normalizeKeyboardInput(event);
      if (!key) return;
      game.keys.add(key);
      game.audio.ensure();
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();

      const firstPress = !event.repeat;
      if (firstPress && (key === 'escape' || key === 'p')) {
        if (game.state === 'playing') game.pause();
        else if (game.state === 'paused') game.resume();
        else if (game.state === 'gameover') game.goToMenu();
        return;
      }
      if (firstPress && (key === ' ' || key === 'shift') && game.state === 'playing') game.dashRequested = true;
      if (firstPress && key === 'q' && game.state === 'playing') game.recallBullet();
      if (firstPress && key === 'm') {
        const muted = game.audio.toggleMute();
        game.announce(muted ? 'تم كتم الصوت' : 'تم تشغيل الصوت');
      }
      if (firstPress && game.state === 'upgrade' && ['1', '2', '3'].includes(key)) game.chooseUpgrade(Number(key) - 1);
      if (firstPress && (key === 'enter' || key === ' ') && game.state === 'menu') game.startRun();
      if (firstPress && (key === 'enter' || key === 'r') && game.state === 'gameover') game.startRun();
    });

    window.addEventListener('keyup', (event) => {
      const key = normalizeKeyboardInput(event);
      if (key) game.keys.delete(key);
    });

    const coordinates = (event) => {
      const rect = game.canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      return {
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      };
    };

    game.canvas.addEventListener('contextmenu', (event) => event.preventDefault());

    game.canvas.addEventListener('pointermove', (event) => {
      const point = coordinates(event);
      if (!point) return;
      if (game.touchMove?.id === event.pointerId) {
        game.touchMove.x = point.x;
        game.touchMove.y = point.y;
        return;
      }
      if (event.pointerType !== 'touch') Object.assign(game.pointer, point);
    });

    game.canvas.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      const point = coordinates(event);
      if (!point) return;
      game.pointer.down = true;
      game.audio.ensure();
      game.canvas.setPointerCapture?.(event.pointerId);

      if (game.handleUiClick(point.x, point.y)) return;
      if (game.state !== 'playing') return;

      if (event.pointerType === 'touch') {
        game.touchMode = true;
        if (!game.touchMove && pointInsideCircle(point, {
          ...TOUCH_LAYOUT.move,
          radius: TOUCH_LAYOUT.move.activationRadius,
        })) {
          game.touchMove = {
            id: event.pointerId,
            originX: TOUCH_LAYOUT.move.x,
            originY: TOUCH_LAYOUT.move.y,
            x: point.x,
            y: point.y,
          };
          return;
        }
      }

      Object.assign(game.pointer, point);
      game.fireBullet();
    });

    const releasePointer = (event) => {
      if (game.touchMove?.id === event.pointerId) game.touchMove = null;
      game.pointer.down = false;
    };
    game.canvas.addEventListener('pointerup', releasePointer);
    game.canvas.addEventListener('pointercancel', releasePointer);

    window.addEventListener('blur', () => {
      game.keys.clear();
      game.touchMove = null;
      if (game.state === 'playing') game.pause();
    });
  }
}
