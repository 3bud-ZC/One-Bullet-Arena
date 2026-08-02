export const RELEASE_SETTINGS_KEY = 'one-bullet-arena-release-settings-v1';
export const TUTORIAL_COMPLETE_KEY = 'one-bullet-arena-tutorial-complete-v1';

export const UNIFIED_SAVE_KEYS = Object.freeze([
  'one-bullet-arena-progression',
  'one-bullet-arena-enemy-codex-v1',
  'one-bullet-arena-boss-mastery-v1',
  'one-bullet-arena-build-codex-v1',
  'one-bullet-arena-mode-records-v1',
  'one-bullet-arena-mission-v1',
  'one-bullet-arena-mobile-settings-v1',
  'one-bullet-arena-release-settings-v1',
  'one-bullet-arena-tutorial-complete-v1',
  'one-bullet-arena-high-score',
  'one-bullet-arena-high-wave',
]);

export const TUTORIAL_STEPS = Object.freeze([
  { id: 'move', title: 'تحرك', instruction: 'استخدم WASD أو الأسهم أو عصا الهاتف للتحرك داخل الحلبة.' },
  { id: 'shoot', title: 'أطلق الطلقة', instruction: 'صوّب بالماوس أو اللمس ثم أطلق طلقتك الوحيدة.' },
  { id: 'recover', title: 'استعد الطلقة', instruction: 'اقترب من الطلقة بعد توقفها لاستعادتها.' },
  { id: 'ricochet', title: 'نفذ ارتدادًا', instruction: 'أطلق نحو جدار واجعل الطلقة ترتد مرة واحدة على الأقل.' },
  { id: 'dash', title: 'استخدم الاندفاع', instruction: 'اضغط Space أو Shift أو زر الاندفاع على الهاتف.' },
  { id: 'target', title: 'اهزم الهدف', instruction: 'اقتل الهدف التدريبي باستخدام مسار الطلقة.' },
  { id: 'upgrade', title: 'اختر ترقية', instruction: 'اختر إحدى الترقيات لإنهاء التدريب.' },
]);

export const DEFAULT_GAMEPAD_BINDINGS = Object.freeze({
  fire: 0,
  dash: 1,
  recall: 2,
  overdrive: 3,
  build: 4,
  pause: 9,
});

export const GAMEPAD_ACTIONS = Object.freeze([
  { id: 'fire', name: 'إطلاق' },
  { id: 'dash', name: 'اندفاع' },
  { id: 'recall', name: 'استدعاء' },
  { id: 'overdrive', name: 'Overdrive' },
  { id: 'build', name: 'فحص الـBuild' },
  { id: 'pause', name: 'إيقاف مؤقت' },
]);

export function createDefaultReleaseSettings() {
  return {
    version: 1,
    gamepadEnabled: true,
    gamepadBindings: { ...DEFAULT_GAMEPAD_BINDINGS },
    deadzone: 0.2,
    aimSensitivity: 1,
    invertAimY: false,
    screenReaderHints: true,
  };
}

function finite(value, fallback, min, max) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

export function normalizeReleaseSettings(value) {
  const source = value && typeof value === 'object' ? value : {};
  const bindings = { ...DEFAULT_GAMEPAD_BINDINGS };
  for (const action of GAMEPAD_ACTIONS) {
    const button = Number(source.gamepadBindings?.[action.id]);
    if (Number.isInteger(button) && button >= 0 && button <= 31) bindings[action.id] = button;
  }
  return {
    version: 1,
    gamepadEnabled: source.gamepadEnabled !== false,
    gamepadBindings: bindings,
    deadzone: finite(source.deadzone, 0.2, 0.05, 0.6),
    aimSensitivity: finite(source.aimSensitivity, 1, 0.4, 2.5),
    invertAimY: Boolean(source.invertAimY),
    screenReaderHints: source.screenReaderHints !== false,
  };
}

export function createUnifiedSaveBundle(storage, metadata = {}) {
  const data = {};
  for (const key of UNIFIED_SAVE_KEYS) {
    const value = storage?.getItem?.(key);
    if (typeof value === 'string') data[key] = value;
  }
  return {
    format: 'one-bullet-arena-unified-save',
    version: 1,
    gameVersion: String(metadata.gameVersion || '1.0.0'),
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function serializeUnifiedSave(storage, metadata = {}) {
  return JSON.stringify(createUnifiedSaveBundle(storage, metadata), null, 2);
}

export function parseUnifiedSave(text) {
  if (typeof text !== 'string' || text.length > 2_000_000) throw new Error('invalid-unified-save');
  const parsed = JSON.parse(text);
  if (parsed?.format !== 'one-bullet-arena-unified-save' || parsed.version !== 1 || !parsed.data || typeof parsed.data !== 'object') {
    throw new Error('invalid-unified-save');
  }
  const data = {};
  for (const key of UNIFIED_SAVE_KEYS) {
    const value = parsed.data[key];
    if (typeof value === 'string' && value.length <= 1_000_000) data[key] = value;
  }
  return { ...parsed, data };
}

export function applyUnifiedSave(storage, bundle) {
  const parsed = typeof bundle === 'string' ? parseUnifiedSave(bundle) : parseUnifiedSave(JSON.stringify(bundle));
  for (const key of UNIFIED_SAVE_KEYS) storage?.removeItem?.(key);
  for (const [key, value] of Object.entries(parsed.data)) storage?.setItem?.(key, value);
  return parsed;
}

export const PERFORMANCE_BUDGETS = Object.freeze({
  high: { targetFps: 60, maxFrameMs: 20, maxParticles: 420 },
  balanced: { targetFps: 55, maxFrameMs: 24, maxParticles: 250 },
  performance: { targetFps: 45, maxFrameMs: 30, maxParticles: 140 },
});

export function evaluateFrameSamples(samples, tier = 'balanced') {
  const valid = Array.isArray(samples) ? samples.map(Number).filter((value) => Number.isFinite(value) && value >= 0) : [];
  const budget = PERFORMANCE_BUDGETS[tier] || PERFORMANCE_BUDGETS.balanced;
  if (!valid.length) return { passed: false, averageFrameMs: 0, estimatedFps: 0, p95FrameMs: 0, tier };
  const sorted = [...valid].sort((a, b) => a - b);
  const averageFrameMs = valid.reduce((sum, value) => sum + value, 0) / valid.length;
  const p95FrameMs = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
  const estimatedFps = averageFrameMs > 0 ? 1000 / averageFrameMs : 0;
  return {
    passed: averageFrameMs <= budget.maxFrameMs && p95FrameMs <= budget.maxFrameMs * 1.5,
    averageFrameMs,
    estimatedFps,
    p95FrameMs,
    tier,
  };
}
