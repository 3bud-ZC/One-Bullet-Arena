const PHYSICAL_KEY_MAP = Object.freeze({
  KeyW: 'w',
  KeyA: 'a',
  KeyS: 's',
  KeyD: 'd',
  KeyQ: 'q',
  KeyP: 'p',
  KeyM: 'm',
  KeyR: 'r',
  Digit1: '1',
  Digit2: '2',
  Digit3: '3',
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

export function physicalKeyForCode(code) {
  return PHYSICAL_KEY_MAP[code] || null;
}

export function installPhysicalKeyboardBridge(target = window) {
  let redispatching = false;

  const bridge = (event) => {
    if (redispatching) return;

    const physicalKey = physicalKeyForCode(event.code);
    if (!physicalKey) return;

    const reportedKey = String(event.key || '').toLowerCase();
    if (reportedKey === physicalKey) return;

    redispatching = true;
    try {
      target.dispatchEvent(new KeyboardEvent(event.type, {
        key: physicalKey,
        code: event.code,
        location: event.location,
        repeat: event.repeat,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
        bubbles: true,
        cancelable: true,
      }));
    } finally {
      redispatching = false;
    }
  };

  target.addEventListener('keydown', bridge, true);
  target.addEventListener('keyup', bridge, true);

  return () => {
    target.removeEventListener('keydown', bridge, true);
    target.removeEventListener('keyup', bridge, true);
  };
}
