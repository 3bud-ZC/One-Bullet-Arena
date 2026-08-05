import { STORAGE_KEYS } from './config.js';

export function readNumber(key, fallback = 0) {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : fallback;
  } catch {
    return fallback;
  }
}

export function writeNumber(key, value) {
  try {
    localStorage.setItem(key, String(Math.max(0, Math.trunc(Number(value) || 0))));
  } catch {
    // Storage may be unavailable in private or restricted contexts.
  }
}

export function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Runtime state must not depend on persistent storage.
  }
}

export function migrateLegacyStorage() {
  const migrations = [
    ['one-bullet-simple-high-score', STORAGE_KEYS.highScore],
    ['one-bullet-clean-high-score', STORAGE_KEYS.highScore],
    ['one-bullet-simple-high-wave', STORAGE_KEYS.highWave],
    ['one-bullet-clean-high-wave', STORAGE_KEYS.highWave],
    ['one-bullet-arena-audio-settings', STORAGE_KEYS.audio],
    ['one-bullet-clean-audio', STORAGE_KEYS.audio],
  ];

  try {
    for (const [legacyKey, currentKey] of migrations) {
      if (localStorage.getItem(currentKey) !== null) continue;
      const legacyValue = localStorage.getItem(legacyKey);
      if (legacyValue !== null) localStorage.setItem(currentKey, legacyValue);
    }
  } catch {
    // Restricted storage must never prevent startup.
  }
}
