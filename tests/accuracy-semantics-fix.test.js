import test from 'node:test';
import assert from 'node:assert/strict';

import { installAccuracySemanticsFix } from '../src/accuracy-semantics-fix.js';

class MockGame {
  constructor() {
    this.stats = { hits: 0, directImpacts: 0 };
    this.boss = { hp: 10 };
  }

  damageEnemy(enemy, damage, _forceX, _forceY, fromBullet) {
    enemy.hp -= damage;
    if (fromBullet) this.stats.hits += 1;
  }

  damageBoss(damage) {
    this.boss.hp -= damage;
    this.stats.hits += 1;
  }

  finishRun() {
    return this.stats.hits;
  }
}

installAccuracySemanticsFix(MockGame);

test('only direct bullet collisions contribute to direct impacts', () => {
  const game = new MockGame();
  const enemy = { hp: 5 };

  game.damageEnemy(enemy, 1, 0, 0, true);
  assert.equal(game.stats.directImpacts, 1);

  game.damageEnemy(enemy, 1, 0, 0, false);
  assert.equal(game.stats.directImpacts, 1);

  game.damageBoss(1, true);
  assert.equal(game.stats.directImpacts, 1);

  game.damageBoss(1, false);
  assert.equal(game.stats.directImpacts, 2);
});

test('run settlement replaces legacy hit count with strict direct impacts', () => {
  const game = new MockGame();
  game.stats.hits = 99;
  game.stats.directImpacts = 4;
  assert.equal(game.finishRun(false), 4);
  assert.equal(game.stats.hits, 4);
});
