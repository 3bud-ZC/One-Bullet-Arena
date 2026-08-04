export const RUNTIME_RELEASE = '1.4.0';

const SYSTEMS = Symbol('one-bullet-arena-runtime-systems');
const INSTANCE = Symbol('one-bullet-arena-runtime-instance');

const WRAPPED_METHODS = Object.freeze([
  'resetRun',
  'startRun',
  'spawnNextWave',
  'startBoss',
  'update',
  'drawArena',
  'draw',
  'openUpgradeSelection',
  'fireBullet',
  'catchBullet',
  'onRicochet',
  'killEnemy',
  'damagePlayer',
  'finishRun',
]);

function systemsFor(GameClass) {
  if (!Object.prototype.hasOwnProperty.call(GameClass, SYSTEMS)) {
    Object.defineProperty(GameClass, SYSTEMS, {
      configurable: false,
      enumerable: false,
      writable: false,
      value: [],
    });
  }
  return GameClass[SYSTEMS];
}

function normalizePriority(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 500;
}

function normalizeSystem(system) {
  if (!system || typeof system !== 'object') throw new TypeError('Runtime system must be an object.');
  const id = String(system.id || '').trim();
  if (!id) throw new TypeError('Runtime system requires a stable id.');
  const hooks = {};
  for (const [name, handler] of Object.entries(system.hooks || {})) {
    if (typeof handler === 'function') hooks[name] = handler;
  }
  return Object.freeze({
    id,
    priority: normalizePriority(system.priority),
    hooks: Object.freeze(hooks),
  });
}

export function registerRuntimeSystem(GameClass, system) {
  const systems = systemsFor(GameClass);
  const normalized = normalizeSystem(system);
  const existing = systems.find((item) => item.id === normalized.id);
  if (existing) return existing;
  systems.push(normalized);
  systems.sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id));
  return normalized;
}

export function runtimeSystemIds(GameClass) {
  return systemsFor(GameClass).map((system) => system.id);
}

function ensureInstance(game) {
  if (game[INSTANCE]) return game[INSTANCE];
  const runtime = {
    release: RUNTIME_RELEASE,
    frame: 0,
    states: new Map(),
    errors: [],
    events: [],
  };
  Object.defineProperty(game, INSTANCE, {
    configurable: false,
    enumerable: false,
    writable: false,
    value: runtime,
  });
  game.runtime = Object.freeze({
    release: RUNTIME_RELEASE,
    getState(systemId, factory = () => ({})) {
      if (!runtime.states.has(systemId)) runtime.states.set(systemId, factory());
      return runtime.states.get(systemId);
    },
    setState(systemId, value) {
      runtime.states.set(systemId, value);
      return value;
    },
    clearState(systemId) {
      runtime.states.delete(systemId);
    },
    emit(hook, detail = {}) {
      return invoke(game, hook, detail);
    },
    snapshot() {
      return {
        release: runtime.release,
        frame: runtime.frame,
        systems: systemsFor(game.constructor).map((system) => system.id),
        errors: runtime.errors.slice(-12),
        events: runtime.events.slice(-24),
      };
    },
  });
  return runtime;
}

function recordEvent(game, hook, systemId, status, message = '') {
  const runtime = ensureInstance(game);
  runtime.events.push({ hook, systemId, status, message, frame: runtime.frame });
  if (runtime.events.length > 80) runtime.events.splice(0, runtime.events.length - 80);
}

function invoke(game, hook, detail = {}, options = {}) {
  const runtime = ensureInstance(game);
  const context = {
    game,
    hook,
    detail,
    cancelled: false,
    reason: '',
    cancel(reason = '') {
      this.cancelled = true;
      this.reason = String(reason || 'cancelled');
    },
  };
  const cleanups = [];
  for (const system of systemsFor(game.constructor)) {
    const handler = system.hooks[hook];
    if (!handler) continue;
    try {
      const result = handler(context);
      if (result === false) context.cancel(system.id);
      else if (typeof result === 'function' && options.collectCleanups) cleanups.push(result);
      else if (result?.cancel) context.cancel(result.reason || system.id);
      recordEvent(game, hook, system.id, context.cancelled ? 'cancelled' : 'ok');
    } catch (error) {
      const entry = {
        hook,
        systemId: system.id,
        message: error instanceof Error ? error.message : String(error),
        frame: runtime.frame,
      };
      runtime.errors.push(entry);
      if (runtime.errors.length > 40) runtime.errors.splice(0, runtime.errors.length - 40);
      recordEvent(game, hook, system.id, 'error', entry.message);
      console.error(`[Runtime:${system.id}:${hook}]`, error);
    }
  }
  return { context, cleanups };
}

function wrap(prototype, methodName, factory) {
  const original = prototype[methodName];
  if (typeof original !== 'function') return;
  prototype[methodName] = factory(original);
}

function entityExists(game, enemyId) {
  return Array.isArray(game.enemies) && game.enemies.some((enemy) => enemy.id === enemyId);
}

export function installRuntimeKernel(GameClass) {
  const prototype = GameClass.prototype;
  if (prototype.__runtimeKernelInstalled) return;
  prototype.__runtimeKernelInstalled = true;
  systemsFor(GameClass);

  wrap(prototype, 'resetRun', (original) => function runtimeResetRun(...args) {
    ensureInstance(this);
    invoke(this, 'beforeRunReset', { args });
    this[INSTANCE].states.clear();
    const result = original.apply(this, args);
    invoke(this, 'afterRunReset', { args, result });
    return result;
  });

  wrap(prototype, 'startRun', (original) => function runtimeStartRun(...args) {
    invoke(this, 'beforeRunStart', { args });
    const result = original.apply(this, args);
    invoke(this, 'afterRunStart', { args, result });
    return result;
  });

  wrap(prototype, 'spawnNextWave', (original) => function runtimeSpawnNextWave(...args) {
    const nextWave = Math.max(1, (Number(this.wave) || 0) + 1);
    invoke(this, 'beforeWaveStart', { args, nextWave });
    const result = original.apply(this, args);
    invoke(this, 'afterWaveStart', { args, result, wave: this.wave, nextWave });
    return result;
  });

  wrap(prototype, 'startBoss', (original) => function runtimeStartBoss(...args) {
    invoke(this, 'beforeBossStart', { args });
    const result = original.apply(this, args);
    invoke(this, 'afterBossStart', { args, result, boss: this.boss });
    return result;
  });

  wrap(prototype, 'update', (original) => function runtimeUpdate(dt, ...args) {
    const runtime = ensureInstance(this);
    runtime.frame += 1;
    invoke(this, 'beforeUpdate', { dt, args, frame: runtime.frame });
    const result = original.call(this, dt, ...args);
    invoke(this, 'afterUpdate', { dt, args, result, frame: runtime.frame });
    return result;
  });

  wrap(prototype, 'drawArena', (original) => function runtimeDrawArena(...args) {
    invoke(this, 'beforeArenaRender', { args });
    const result = original.apply(this, args);
    invoke(this, 'afterArenaRender', { args, result });
    return result;
  });

  wrap(prototype, 'draw', (original) => function runtimeDraw(...args) {
    const before = invoke(this, 'beforeRender', { args, state: this.state }, { collectCleanups: true });
    let result;
    try {
      result = original.apply(this, args);
    } finally {
      for (const cleanup of before.cleanups.reverse()) {
        try { cleanup(); }
        catch (error) { console.error('[Runtime:render-cleanup]', error); }
      }
    }
    invoke(this, 'afterRender', { args, result, state: this.state });
    return result;
  });

  wrap(prototype, 'openUpgradeSelection', (original) => function runtimeOpenUpgrade(nextStage, ...args) {
    const before = invoke(this, 'beforeWaveAdvance', { nextStage, args, wave: this.wave });
    if (before.context.cancelled) return false;
    const result = original.call(this, nextStage, ...args);
    invoke(this, 'afterWaveAdvance', { nextStage, args, result, wave: this.wave });
    return result;
  });

  wrap(prototype, 'fireBullet', (original) => function runtimeFireBullet(...args) {
    const wasHeld = Boolean(this.bullet?.held);
    invoke(this, 'beforeBulletFired', { args, wasHeld });
    const result = original.apply(this, args);
    if (wasHeld && this.bullet && !this.bullet.held) invoke(this, 'afterBulletFired', { args, result });
    return result;
  });

  wrap(prototype, 'catchBullet', (original) => function runtimeCatchBullet(...args) {
    const wasHeld = Boolean(this.bullet?.held);
    const result = original.apply(this, args);
    if (!wasHeld && this.bullet?.held) invoke(this, 'afterBulletCaught', { args, result });
    return result;
  });

  wrap(prototype, 'onRicochet', (original) => function runtimeRicochet(...args) {
    const previousBounces = Number(this.bullet?.bounceCount) || 0;
    const result = original.apply(this, args);
    invoke(this, 'afterRicochet', {
      args,
      result,
      previousBounces,
      bounceCount: Number(this.bullet?.bounceCount) || 0,
    });
    return result;
  });

  wrap(prototype, 'killEnemy', (original) => function runtimeKillEnemy(enemy, ...args) {
    const enemyId = enemy?.id;
    const existed = entityExists(this, enemyId);
    invoke(this, 'beforeEnemyKilled', { enemy, args, existed });
    const result = original.call(this, enemy, ...args);
    if (existed && !entityExists(this, enemyId)) invoke(this, 'afterEnemyKilled', { enemy, args, result });
    return result;
  });

  wrap(prototype, 'damagePlayer', (original) => function runtimeDamagePlayer(sourceX, sourceY, ...args) {
    const beforeHealth = Number(this.player?.health) || 0;
    const beforeShield = Number(this.player?.shield) || 0;
    const result = original.call(this, sourceX, sourceY, ...args);
    const afterHealth = Number(this.player?.health) || 0;
    const afterShield = Number(this.player?.shield) || 0;
    if (afterHealth < beforeHealth || afterShield < beforeShield) {
      invoke(this, 'afterPlayerDamaged', {
        sourceX,
        sourceY,
        args,
        result,
        beforeHealth,
        afterHealth,
        beforeShield,
        afterShield,
      });
    }
    return result;
  });

  wrap(prototype, 'finishRun', (original) => function runtimeFinishRun(victory, ...args) {
    invoke(this, 'beforeRunFinish', { victory: Boolean(victory), args });
    const result = original.call(this, victory, ...args);
    invoke(this, 'afterRunFinish', { victory: Boolean(victory), args, result });
    return result;
  });
}

export function runtimeKernelCoverage(GameClass) {
  return {
    release: RUNTIME_RELEASE,
    systems: runtimeSystemIds(GameClass),
    wrappedMethods: [...WRAPPED_METHODS],
  };
}
