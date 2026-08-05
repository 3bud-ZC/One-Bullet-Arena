import { GAME_HEIGHT, GAME_WIDTH, TOUCH_CONTROLS } from './config.js';
import { clamp, normalize, pointInsideCircle } from './arena.js';

export class InputController {
  constructor(canvas, actions = {}) {
    this.canvas = canvas;
    this.actions = actions;
    this.keys = new Set();
    this.pointer = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2, down: false };
    this.touchMode = window.matchMedia?.('(pointer: coarse)').matches || false;
    this.moveTouch = null;
    this.bind();
  }

  bind() {
    window.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      this.keys.add(key);
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) event.preventDefault();
      this.actions.onInteraction?.();
      this.actions.onKeyDown?.(key);
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.key.toLowerCase()));

    this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    this.canvas.addEventListener('pointermove', (event) => {
      const point = this.toGamePoint(event);
      this.pointer.x = point.x;
      this.pointer.y = point.y;
      if (this.moveTouch?.id === event.pointerId) {
        this.moveTouch.x = point.x;
        this.moveTouch.y = point.y;
      }
    });
    this.canvas.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      const point = this.toGamePoint(event);
      Object.assign(this.pointer, point, { down: true });
      this.actions.onInteraction?.();
      try {
        this.canvas.setPointerCapture?.(event.pointerId);
      } catch {
        // Some browsers and synthetic events can reject capture; input must continue normally.
      }
      if (this.actions.onUiPointer?.(point)) return;

      if (event.pointerType === 'touch') {
        this.touchMode = true;
        if (pointInsideCircle(point, { ...TOUCH_CONTROLS.move, radius: TOUCH_CONTROLS.move.hitRadius })) {
          this.moveTouch = {
            id: event.pointerId,
            originX: TOUCH_CONTROLS.move.x,
            originY: TOUCH_CONTROLS.move.y,
            x: point.x,
            y: point.y,
          };
          return;
        }
      }
      this.actions.onFire?.(point);
    });

    const releasePointer = (event) => {
      this.pointer.down = false;
      if (this.moveTouch?.id === event.pointerId) this.moveTouch = null;
    };
    this.canvas.addEventListener('pointerup', releasePointer);
    this.canvas.addEventListener('pointercancel', releasePointer);
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.moveTouch = null;
      this.actions.onBlur?.();
    });
  }

  movementDirection() {
    let x = Number(this.keys.has('d') || this.keys.has('arrowright')) - Number(this.keys.has('a') || this.keys.has('arrowleft'));
    let y = Number(this.keys.has('s') || this.keys.has('arrowdown')) - Number(this.keys.has('w') || this.keys.has('arrowup'));
    if (this.moveTouch) {
      const dx = clamp(this.moveTouch.x - this.moveTouch.originX, -72, 72);
      const dy = clamp(this.moveTouch.y - this.moveTouch.originY, -72, 72);
      if (Math.hypot(dx, dy) > 8) {
        x += dx / 72;
        y += dy / 72;
      }
    }
    return normalize(x, y);
  }

  joystickSnapshot() {
    const origin = { x: TOUCH_CONTROLS.move.x, y: TOUCH_CONTROLS.move.y };
    if (!this.moveTouch) return { origin, knob: origin, active: false };
    const dx = this.moveTouch.x - origin.x;
    const dy = this.moveTouch.y - origin.y;
    const length = Math.hypot(dx, dy) || 1;
    const max = 47;
    const scale = Math.min(1, max / length);
    return {
      origin,
      knob: { x: origin.x + dx * scale, y: origin.y + dy * scale },
      active: true,
    };
  }

  toGamePoint(event) {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
    return {
      x: ((event.clientX - rect.left) / rect.width) * GAME_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * GAME_HEIGHT,
    };
  }
}
