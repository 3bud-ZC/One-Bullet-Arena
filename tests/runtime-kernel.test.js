import assert from 'node:assert/strict';
import test from 'node:test';

import {
  installRuntimeKernel,
  registerRuntimeSystem,
  runtimeKernelCoverage,
  runtimeSystemIds,
} from '../src/runtime-kernel.js';

function createGameClass() {
  return class TestGame {
    constructor() {
      this.state = 'menu';
      this.wave = 0;
      this.player = { health: 3, shield: 0 };
      this.bullet = { held: true, bounceCount: 0 };
      this.enemies = [];
      this.drawCount = 0;
      this.resetRun();
    }

    resetRun() { this.wave = 0; this.enemies = []; }
    startRun() { this.state = 'playing'; this.spawnNextWave(); }
    spawnNextWave() { this.wave += 1; this.enemies = [{ id: this.wave }]; }
    startBoss() { this.boss = { id: 'boss' }; }
    update(dt) { this.time = (this.time || 0) + dt; }
    drawArena() { this.arenaDrawn = true; }
    draw() { this.drawArena(); this.drawCount += 1; }
    openUpgradeSelection() { this.state = 'upgrade'; return 'opened'; }
    fireBullet() { if (this.bullet.held) this.bullet.held = false; }
    catchBullet() { this.bullet.held = true; }
    onRicochet() { this.bullet.bounceCount += 1; }
    killEnemy(enemy) { this.enemies = this.enemies.filter((item) => item.id !== enemy.id); }
    damagePlayer() { this.player.health -= 1; }
    finishRun(victory) { this.state = victory ? 'victory' : 'gameover'; }
  };
}

test('runtime systems execute in stable priority order without duplicate ids', () => {
  const Game = createGameClass();
  installRuntimeKernel(Game);
  const order = [];
  registerRuntimeSystem(Game, { id: 'late', priority: 800, hooks: { afterWaveStart: () => order.push('late') } });
  registerRuntimeSystem(Game, { id: 'early', priority: 100, hooks: { afterWaveStart: () => order.push('early') } });
  registerRuntimeSystem(Game, { id: 'late', priority: 1, hooks: { afterWaveStart: () => order.push('duplicate') } });

  const game = new Game();
  game.spawnNextWave();

  assert.deepEqual(order, ['early', 'late']);
  assert.deepEqual(runtimeSystemIds(Game), ['early', 'late']);
});

test('beforeWaveAdvance can cancel legacy progression without changing state', () => {
  const Game = createGameClass();
  installRuntimeKernel(Game);
  registerRuntimeSystem(Game, {
    id: 'gate',
    hooks: {
      beforeWaveAdvance: ({ game }) => game.allowAdvance,
    },
  });

  const game = new Game();
  game.state = 'playing';
  game.allowAdvance = false;
  assert.equal(game.openUpgradeSelection('wave'), false);
  assert.equal(game.state, 'playing');

  game.allowAdvance = true;
  assert.equal(game.openUpgradeSelection('wave'), 'opened');
  assert.equal(game.state, 'upgrade');
});

test('render cleanups run before afterRender hooks', () => {
  const Game = createGameClass();
  installRuntimeKernel(Game);
  const order = [];
  registerRuntimeSystem(Game, {
    id: 'render-system',
    hooks: {
      beforeRender: () => {
        order.push('before');
        return () => order.push('cleanup');
      },
      afterRender: () => order.push('after'),
    },
  });

  const game = new Game();
  game.draw = game.draw.bind(game);
  game.draw();
  assert.deepEqual(order, ['before', 'cleanup', 'after']);
});

test('runtime isolates one system failure and keeps later systems running', () => {
  const Game = createGameClass();
  installRuntimeKernel(Game);
  const calls = [];
  registerRuntimeSystem(Game, {
    id: 'broken',
    priority: 10,
    hooks: { afterUpdate: () => { throw new Error('expected failure'); } },
  });
  registerRuntimeSystem(Game, {
    id: 'healthy',
    priority: 20,
    hooks: { afterUpdate: () => calls.push('healthy') },
  });

  const originalError = console.error;
  console.error = () => {};
  try {
    const game = new Game();
    game.update(0.016);
    assert.deepEqual(calls, ['healthy']);
    assert.equal(game.runtime.snapshot().errors.at(-1).systemId, 'broken');
  } finally {
    console.error = originalError;
  }
});

test('kernel coverage exposes the central lifecycle surface', () => {
  const Game = createGameClass();
  installRuntimeKernel(Game);
  const coverage = runtimeKernelCoverage(Game);
  assert.equal(coverage.release, '1.4.0');
  assert.ok(coverage.wrappedMethods.includes('update'));
  assert.ok(coverage.wrappedMethods.includes('draw'));
  assert.ok(coverage.wrappedMethods.includes('openUpgradeSelection'));
  assert.ok(coverage.wrappedMethods.includes('afterEnemyKilled') === false);
});
