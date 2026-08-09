const ICON_PATHS = Object.freeze({
  language: [
    '<circle cx="12" cy="12" r="9"/>',
    '<path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
  ],
  audio: [
    '<path d="M5 9v6h4l5 4V5L9 9H5z"/>',
    '<path d="M17 9.5a4 4 0 0 1 0 5M19.5 7a7 7 0 0 1 0 10"/>',
  ],
  audioOff: [
    '<path d="M5 9v6h4l5 4V5L9 9H5z"/>',
    '<path d="m18 9 4 4M22 9l-4 4"/>',
  ],
  fullscreen: [
    '<path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/>',
  ],
  settings: [
    '<circle cx="12" cy="12" r="3"/>',
    '<path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.04.04-2.78 2.78-.04-.04A1.8 1.8 0 0 0 15 19.4a1.8 1.8 0 0 0-1.08 1.64V21h-3.84v-.06A1.8 1.8 0 0 0 9 19.4a1.8 1.8 0 0 0-1.98.36l-.04.04-2.78-2.78.04-.04A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-1.64-1.08H3v-3.84h.06A1.8 1.8 0 0 0 4.6 9a1.8 1.8 0 0 0-.36-1.98L4.2 6.98 6.98 4.2l.04.04A1.8 1.8 0 0 0 9 4.6a1.8 1.8 0 0 0 1.08-1.64V3h3.84v.06A1.8 1.8 0 0 0 15 4.6a1.8 1.8 0 0 0 1.98-.36l.04-.04 2.78 2.78-.04.04A1.8 1.8 0 0 0 19.4 9a1.8 1.8 0 0 0 1.64 1.08H21v3.84h-.06A1.8 1.8 0 0 0 19.4 15z"/>',
  ],
  checkpoint: [
    '<path d="M6 4h12v16l-6-3-6 3V4z"/>',
    '<path d="m9 10 2 2 4-4"/>',
  ],
  newRun: [
    '<path d="M20 11a8 8 0 1 0-2.34 5.66"/>',
    '<path d="M20 5v6h-6"/>',
  ],
  delete: [
    '<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"/>',
    '<path d="M10 11v5M14 11v5"/>',
  ],
  bullet: [
    '<path d="M14.5 4.5 19.5 9.5 10 19H5v-5l9.5-9.5z"/>',
    '<path d="m12.5 6.5 5 5"/>',
  ],
  wave: [
    '<path d="M3 13c2.2-4 4.4-4 6.6 0s4.4 4 6.6 0 4.4-4 5.8-1"/>',
    '<path d="M3 8c2.2-3 4.4-3 6.6 0s4.4 3 6.6 0 4.4-3 5.8-1"/>',
  ],
  score: [
    '<circle cx="12" cy="12" r="9"/>',
    '<path d="M12 7v10M15 9.2c-.7-.8-1.7-1.2-3-1.2-1.7 0-3 1-3 2.3 0 1.4 1.2 2 3 2.4s3 1 3 2.4c0 1.4-1.3 2.4-3 2.4-1.4 0-2.6-.5-3.4-1.5"/>',
  ],
  upgrade: [
    '<path d="m12 3 2.4 5.1L20 9l-4 4 1 5.7L12 16l-5 2.7L8 13 4 9l5.6-.9L12 3z"/>',
  ],
  sector: [
    '<path d="M4 6 12 3l8 3v12l-8 3-8-3V6z"/>',
    '<path d="m4 6 8 3 8-3M12 9v12"/>',
  ],
  health: [
    '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  ],
  shield: [
    '<path d="M12 3 19 6v5c0 4.8-2.8 8-7 10-4.2-2-7-5.2-7-10V6l7-3z"/>',
    '<path d="m9 12 2 2 4-4"/>',
  ],
  dash: [
    '<path d="M4 8h8M2 12h10M4 16h8"/>',
    '<path d="m14 6 6 6-6 6"/>',
  ],
  pause: [
    '<path d="M8 5v14M16 5v14"/>',
  ],
  play: [
    '<path d="m8 5 11 7-11 7V5z"/>',
  ],
  target: [
    '<circle cx="12" cy="12" r="7"/>',
    '<circle cx="12" cy="12" r="2"/>',
    '<path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  ],
  chevron: [
    '<path d="m9 6 6 6-6 6"/>',
  ],
});

export function iconSvg(name, className = '') {
  const paths = ICON_PATHS[name] || ICON_PATHS.target;
  return `<svg class="ui-icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths.join('')}</svg>`;
}

export const UI_ICON_NAMES = Object.freeze(Object.keys(ICON_PATHS));
