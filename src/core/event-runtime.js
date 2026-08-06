import { OneBulletUiLayoutRuntime } from '../ui-layout-runtime.js';
import { RELEASE_VERSION } from '../release.js';
import { EventBus } from './event-bus.js';
import {
  GAME_EVENTS,
  GAME_EVENT_SCHEMA_VERSION,
  GAME_EVENT_TYPES,
  assertGameEventType,
} from './game-events.js';
import { assertGameState } from './game-states.js';

export class OneBulletEventRuntime extends OneBulletUiLayoutRuntime {
  constructor(canvas, liveRegion = null) {
    super(canvas, liveRegion);
    this.eventBus = new EventBus({
      allowedTypes: GAME_EVENT_TYPES,
      historyLimit: 128,
    });
    this.runId = 0;
    this.clearedEventWaves = new Set();
    this.emitGameEvent(GAME_EVENTS.RUNTIME_READY, {
      releaseVersion: RELEASE_VERSION,
      eventSchemaVersion: GAME_EVENT_SCHEMA_VERSION,
    });
  }

  emitGameEvent(type, payload = {}) {
    assertGameEventType(type);
    if (!this.eventBus) return null;
    return this.eventBus.emit(type, {
      runId: this.runId,
      state: this.state,
      wave: this.wave,
      runTime: Number((this.runTime || 0).toFixed(3)),
      ...payload,
    });
  }

  onGameEvent(type, listener) {
    assertGameEventType(type);
    return this.eventBus.on(type, listener);
  }

  onceGameEvent(type, listener) {
    assertGameEventType(type);
    return this.eventBus.once(type, listener);
  }

  getGameEventHistory(limit = 32) {
    return this.eventBus.getHistory(limit);
  }

  startRun() {
    this.runId += 1;
    this.clearedEventWaves.clear();
    this.eventBus.clearHistory();
    this.emitGameEvent(GAME_EVENTS.RUN_STARTED, { runId: this.runId });
    return super.startRun();
  }

  setState(state) {
    assertGameState(state);
    const previousState = this.state;
    const result = super.setState(state);
    if (this.eventBus && previousState !== state) {
      this.emitGameEvent(GAME_EVENTS.STATE_CHANGED, {
        previousState,
        nextState: state,
      });
    }
    return result;
  }

  startNextWave() {
    const previousStageId = this.arenaStage?.id ?? 0;
    const result = super.startNextWave();
    if (this.eventBus) {
      this.emitGameEvent(GAME_EVENTS.WAVE_STARTED, {
        enemyCount: this.enemies.length,
        arenaStageId: this.arenaStage.id,
        arenaExpanded: this.arenaStage.id > previousStageId,
      });
    }
    return result;
  }

  spawnEnemy(type, index = 0, options = {}) {
    const enemy = super.spawnEnemy(type, index, options);
    if (enemy && this.eventBus) {
      this.emitGameEvent(GAME_EVENTS.ENEMY_SPAWNED, {
        enemyId: enemy.id,
        enemyType: enemy.type,
        mini: enemy.mini,
      });
    }
    return enemy;
  }

  fireBullet() {
    const fired = super.fireBullet();
    if (fired) {
      this.emitGameEvent(GAME_EVENTS.BULLET_FIRED, {
        x: Number(this.bullet.x.toFixed(2)),
        y: Number(this.bullet.y.toFixed(2)),
        speed: Number(Math.hypot(this.bullet.vx, this.bullet.vy).toFixed(2)),
        shots: this.stats.shots,
      });
    }
    return fired;
  }

  recallBullet() {
    const recalled = super.recallBullet();
    if (recalled) {
      this.emitGameEvent(GAME_EVENTS.BULLET_RECALL_STARTED, {
        x: Number(this.bullet.x.toFixed(2)),
        y: Number(this.bullet.y.toFixed(2)),
        cooldown: Number(this.bullet.recallCooldown.toFixed(3)),
      });
    }
    return recalled;
  }

  catchBullet() {
    const x = this.bullet.x;
    const y = this.bullet.y;
    const wasReturning = this.bullet.recalling;
    const result = super.catchBullet();
    this.emitGameEvent(GAME_EVENTS.BULLET_CAUGHT, {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      wasReturning,
    });
    return result;
  }

  onRicochet() {
    const result = super.onRicochet();
    this.emitGameEvent(GAME_EVENTS.BULLET_RICOCHETED, {
      x: Number(this.bullet.x.toFixed(2)),
      y: Number(this.bullet.y.toFixed(2)),
      bounceCount: this.bullet.bounceCount,
      bouncesRemaining: this.bullet.bouncesRemaining,
    });
    return result;
  }

  tryDash() {
    const wasDashing = this.player.dashRemaining > 0;
    const previousCooldown = this.player.dashCooldown;
    const result = super.tryDash();
    if (!wasDashing && previousCooldown <= 0 && this.player.dashRemaining > 0) {
      this.emitGameEvent(GAME_EVENTS.PLAYER_DASHED, {
        directionX: Number(this.player.dashDirection.x.toFixed(4)),
        directionY: Number(this.player.dashDirection.y.toFixed(4)),
        cooldown: Number(this.player.dashCooldown.toFixed(3)),
      });
    }
    return result;
  }

  damageEnemy(enemy, damage, fromBullet = false) {
    if (this.enemies.includes(enemy)) {
      this.emitGameEvent(GAME_EVENTS.ENEMY_DAMAGED, {
        enemyId: enemy.id,
        enemyType: enemy.type,
        damage: Number(damage.toFixed(3)),
        healthBefore: Number(enemy.health.toFixed(3)),
        healthAfter: Number(Math.max(0, enemy.health - damage).toFixed(3)),
        fromBullet,
        lethal: enemy.health - damage <= 0,
      });
    }
    return super.damageEnemy(enemy, damage, fromBullet);
  }

  killEnemy(enemy) {
    const existed = this.enemies.includes(enemy);
    const enemyData = existed ? {
      enemyId: enemy.id,
      enemyType: enemy.type,
      mini: enemy.mini,
      scoreValue: enemy.score,
    } : null;
    const previousKills = this.stats.kills;
    const previousScore = this.score;
    const result = super.killEnemy(enemy);
    if (enemyData && this.stats.kills > previousKills) {
      this.emitGameEvent(GAME_EVENTS.ENEMY_KILLED, {
        ...enemyData,
        gainedScore: this.score - previousScore,
        combo: this.combo,
        enemiesRemaining: this.enemies.length,
      });
    }
    return result;
  }

  damagePlayer(sourceX, sourceY) {
    const canTakeDamage = this.state === 'playing' && this.player.invulnerability <= 0;
    const healthBefore = this.player.health;
    const shieldBefore = this.player.shield;
    const secondChanceBefore = this.secondChanceUsed;

    if (canTakeDamage && shieldBefore <= 0) {
      this.emitGameEvent(GAME_EVENTS.PLAYER_DAMAGED, {
        healthBefore,
        healthAfter: Math.max(0, healthBefore - 1),
        sourceX: Number(sourceX.toFixed(2)),
        sourceY: Number(sourceY.toFixed(2)),
      });
    }

    const result = super.damagePlayer(sourceX, sourceY);

    if (canTakeDamage && shieldBefore > this.player.shield) {
      this.emitGameEvent(GAME_EVENTS.PLAYER_SHIELD_ABSORBED, {
        shieldBefore,
        shieldAfter: this.player.shield,
      });
    }
    if (!secondChanceBefore && this.secondChanceUsed) {
      this.emitGameEvent(GAME_EVENTS.PLAYER_REVIVED, {
        health: this.player.health,
        shield: this.player.shield,
      });
    }
    return result;
  }

  finishRun() {
    const summary = {
      finalWave: this.wave,
      score: this.score,
      runTime: Number(this.runTime.toFixed(3)),
      kills: this.stats.kills,
      shots: this.stats.shots,
      hits: this.stats.hits,
      upgrades: this.stats.upgrades,
      damageTaken: this.stats.damageTaken,
      maxCombo: this.maxCombo || 0,
    };
    const result = super.finishRun();
    this.emitGameEvent(GAME_EVENTS.RUN_FINISHED, summary);
    return result;
  }

  openUpgradeSelection() {
    if (this.state === 'playing' && this.enemies.length === 0 && !this.clearedEventWaves.has(this.wave)) {
      this.clearedEventWaves.add(this.wave);
      this.emitGameEvent(GAME_EVENTS.WAVE_CLEARED, {
        score: this.score,
        health: this.player.health,
        maxHealth: this.player.maxHealth,
      });
    }

    const previousState = this.state;
    const result = super.openUpgradeSelection();
    if (previousState === 'playing' && this.state === 'upgrade') {
      this.emitGameEvent(GAME_EVENTS.UPGRADE_OFFERED, {
        choices: this.upgradeChoices.map((upgrade) => upgrade.id),
      });
    }
    return result;
  }

  chooseUpgrade(index) {
    if (this.state !== 'upgrade') return super.chooseUpgrade(index);
    const upgrade = this.upgradeChoices[index];
    if (!upgrade) return false;
    this.emitGameEvent(GAME_EVENTS.UPGRADE_SELECTED, {
      upgradeId: upgrade.id,
      choiceIndex: index,
      previousLevel: this.stack(upgrade.id),
      nextLevel: this.stack(upgrade.id) + 1,
    });
    return super.chooseUpgrade(index);
  }

  getSnapshot() {
    const history = this.eventBus?.getHistory(12) || [];
    return {
      ...super.getSnapshot(),
      eventFoundationVersion: RELEASE_VERSION,
      eventSchemaVersion: GAME_EVENT_SCHEMA_VERSION,
      gameEventBusActive: Boolean(this.eventBus),
      gameEventSequence: this.eventBus?.sequence || 0,
      gameEventListenerCount: this.eventBus?.listenerCount() || 0,
      recentGameEvents: history.map((event) => ({ type: event.type, sequence: event.sequence })),
    };
  }
}
