import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from '../game-data.js';
import { RELEASE_VERSION } from '../release.js';
import { UI_COLORS, dim, formatRunTime, label, panel } from '../ui-renderer.js';
import { OneBulletCombatDepthRuntime } from './combat-depth-runtime.js';
import {
  CHECKPOINT_SCHEMA_VERSION,
  CheckpointStore,
  captureCheckpoint,
} from './checkpoint-store.js';
import { GAME_EVENTS } from './game-events.js';

export const CHECKPOINT_RUNTIME_VERSION = '3.0.0-checkpoint';

export class OneBulletCheckpointRuntime extends OneBulletCombatDepthRuntime {
  constructor(canvas, liveRegion = null) {
    super(canvas, liveRegion);
    this.checkpointRuntimeVersion = CHECKPOINT_RUNTIME_VERSION;
    this.checkpointStore = new CheckpointStore();
    this.savedCheckpoint = this.checkpointStore.load();
    this.pendingCheckpoint = null;
    this.restoredFromCheckpoint = false;
  }

  resetRun() {
    super.resetRun();
    this.restoredFromCheckpoint = false;
  }

  startRun() {
    this.pendingCheckpoint = null;
    return super.startRun();
  }

  continueFromCheckpoint() {
    const checkpoint = this.checkpointStore?.load() || this.savedCheckpoint;
    if (!checkpoint || checkpoint.wave < 2) {
      this.announce('لا توجد نقطة حفظ متاحة بعد.');
      return false;
    }

    this.savedCheckpoint = checkpoint;
    this.pendingCheckpoint = checkpoint;
    super.startRun();
    return true;
  }

  startNextWave() {
    const checkpoint = this.pendingCheckpoint;
    if (!checkpoint) {
      const result = super.startNextWave();
      this.saveWaveCheckpoint();
      return result;
    }

    this.applyCheckpointBeforeWave(checkpoint);
    this.wave = checkpoint.wave - 1;
    const result = super.startNextWave();
    this.applyCheckpointAfterWave(checkpoint);
    this.pendingCheckpoint = null;
    this.restoredFromCheckpoint = true;
    this.savedCheckpoint = checkpoint;
    this.banner = {
      title: `CHECKPOINT WAVE ${String(this.wave).padStart(2, '0')}`,
      subtitle: 'تم استعادة التطويرات والتقدم عند بداية الموجة',
      time: 1.8,
    };
    this.emitGameEvent(GAME_EVENTS.CHECKPOINT_LOADED, {
      checkpointWave: checkpoint.wave,
      score: checkpoint.score,
      upgrades: checkpoint.stats.upgrades,
      schemaVersion: checkpoint.schemaVersion,
    });
    this.announce(`تم استكمال الجولة من الموجة ${checkpoint.wave}.`);
    return result;
  }

  applyCheckpointBeforeWave(checkpoint) {
    this.upgradeStacks = { ...checkpoint.upgradeStacks };
    this.previousUpgradeChoices = [...checkpoint.previousUpgradeChoices];
    this.score = checkpoint.score;
    this.runTime = checkpoint.runTime;
    this.combo = checkpoint.combo;
    this.comboTimer = checkpoint.comboTimer;
    this.maxCombo = checkpoint.maxCombo;
    this.secondChanceUsed = checkpoint.secondChanceUsed;
    this.stats = { ...checkpoint.stats };
    Object.assign(this.player, checkpoint.player);
    this.restoreCombatCheckpoint(checkpoint);
  }

  applyCheckpointAfterWave(checkpoint) {
    this.score = checkpoint.score;
    this.runTime = checkpoint.runTime;
    this.combo = checkpoint.combo;
    this.comboTimer = checkpoint.comboTimer;
    this.maxCombo = checkpoint.maxCombo;
    this.secondChanceUsed = checkpoint.secondChanceUsed;
    this.stats = { ...checkpoint.stats };
    this.upgradeStacks = { ...checkpoint.upgradeStacks };
    this.previousUpgradeChoices = [...checkpoint.previousUpgradeChoices];
    Object.assign(this.player, checkpoint.player, {
      invulnerability: 0.8,
      dashCooldown: 0,
      dashRemaining: 0,
    });
    this.constrainCombatCircle(this.player);
    this.resetBulletToPlayer();
    this.restoreCombatCheckpoint(checkpoint);
    this.tutorialStep = 3;
  }

  restoreCombatCheckpoint(checkpoint) {
    this.momentum = checkpoint.combat.momentum;
    this.momentumIdleTimer = 0;
    this.overdriveTimer = checkpoint.combat.overdriveTimer;
    this.precisionCharge = checkpoint.combat.precisionCharge;
    this.precisionShotActive = false;
    this.bankLevel = 0;
    this.bankTimer = 0;
    Object.assign(this.combatDepthStats, {
      perfectCatches: checkpoint.combat.perfectCatches,
      precisionKills: checkpoint.combat.precisionKills,
      bankKills: checkpoint.combat.bankKills,
      overdrives: checkpoint.combat.overdrives,
    });
  }

  saveWaveCheckpoint() {
    if (!this.checkpointStore || this.wave < 2 || this.state !== 'playing') return null;
    const previous = this.checkpointStore.load();
    const candidate = captureCheckpoint(this, RELEASE_VERSION);
    const saved = this.checkpointStore.save(candidate);
    this.savedCheckpoint = saved;

    if (saved && saved.wave === candidate.wave && (!previous || candidate.wave >= previous.wave)) {
      this.emitGameEvent(GAME_EVENTS.CHECKPOINT_SAVED, {
        checkpointWave: saved.wave,
        score: saved.score,
        upgrades: saved.stats.upgrades,
        schemaVersion: saved.schemaVersion,
      });
    }
    return saved;
  }

  clearCheckpoint() {
    if (!this.checkpointStore) return;
    const previousWave = this.savedCheckpoint?.wave || 0;
    this.checkpointStore.clear();
    this.savedCheckpoint = null;
    this.pendingCheckpoint = null;
    this.audio.play('click');
    this.emitGameEvent(GAME_EVENTS.CHECKPOINT_CLEARED, { previousWave });
    this.announce('تم حذف نقطة الحفظ.');
  }

  hasContinueCheckpoint() {
    return Boolean(this.savedCheckpoint && this.savedCheckpoint.wave >= 2);
  }

  drawMenuRecord(x, y, w, title, value, accent) {
    const ctx = this.ctx;
    panel(ctx, x, y, w, 58, accent, 'rgba(5,11,27,0.88)', 3);
    label(ctx, title, x + 15, y + 21, 8, UI_COLORS.muted, 900, 'left');
    label(ctx, value, x + w - 15, y + 42, 18, UI_COLORS.text, 900, 'right');
  }

  drawMenu() {
    const checkpoint = this.hasContinueCheckpoint() ? this.savedCheckpoint : null;
    const ctx = this.ctx;
    const main = { x: 282, y: 226, w: 506, h: 332 };
    const rail = { x: 808, y: 226, w: 202, h: 332 };

    this.drawMenuOrbit();
    label(ctx, 'ONE BULLET ARENA', WIDTH / 2, 72, 12, UI_COLORS.player, 900);
    label(ctx, 'حلبة الطلقة الواحدة', WIDTH / 2, 166, 40, UI_COLORS.text, 900);
    label(
      ctx,
      checkpoint ? 'CHECKPOINT READY // LOCAL SAVE' : 'NEW RUN // SINGLE ROUND',
      WIDTH / 2,
      202,
      10,
      checkpoint ? UI_COLORS.success : UI_COLORS.player,
      900,
    );

    panel(ctx, main.x, main.y, main.w, main.h, checkpoint ? UI_COLORS.bullet : UI_COLORS.player, 'rgba(4,10,24,0.93)', 5);
    panel(ctx, rail.x, rail.y, rail.w, rail.h, UI_COLORS.electric, 'rgba(4,10,24,0.88)', 4);

    if (checkpoint) {
      label(ctx, 'ACTIVE CHECKPOINT', main.x + 24, main.y + 31, 9, UI_COLORS.success, 900, 'left');
      label(ctx, `WAVE ${String(checkpoint.wave).padStart(2, '0')}`, main.x + main.w / 2, main.y + 108, 54, UI_COLORS.bullet, 900);
      label(ctx, 'آخر نقطة حفظ جاهزة للمتابعة', main.x + main.w / 2, main.y + 146, 16, UI_COLORS.text, 800);
      label(
        ctx,
        `${checkpoint.stats.upgrades} UPGRADES  ·  ${checkpoint.score.toLocaleString('en-US')} RUN SCORE`,
        main.x + main.w / 2,
        main.y + 176,
        10,
        UI_COLORS.muted,
        800,
      );

      this.drawButton(
        `متابعة الجولة من WAVE ${String(checkpoint.wave).padStart(2, '0')}`,
        main.x + 38,
        main.y + 205,
        main.w - 76,
        64,
        () => this.continueFromCheckpoint(),
        true,
      );
      this.drawButton('جولة جديدة من البداية', main.x + 38, main.y + 282, main.w - 76, 38, () => this.startRun());
    } else {
      label(ctx, 'RUN READY', main.x + 24, main.y + 31, 9, UI_COLORS.player, 900, 'left');
      label(ctx, 'WAVE 01', main.x + main.w / 2, main.y + 108, 54, UI_COLORS.player, 900);
      label(ctx, 'طلقة واحدة. استرجعها. واصل القتال.', main.x + main.w / 2, main.y + 146, 16, UI_COLORS.text, 800);
      label(ctx, 'FIRE  ·  RICOCHET  ·  RECALL  ·  SURVIVE', main.x + main.w / 2, main.y + 176, 10, UI_COLORS.muted, 800);
      this.drawButton('ابدأ الجولة', main.x + 38, main.y + 214, main.w - 76, 66, () => this.startRun(), true);
      label(ctx, 'WASD MOVE  ·  MOUSE FIRE  ·  Q RECALL  ·  SPACE DASH', main.x + main.w / 2, main.y + 309, 9, UI_COLORS.muted, 800);
    }

    label(ctx, 'RUN RECORDS', rail.x + 18, rail.y + 29, 9, UI_COLORS.electric, 900, 'left');
    this.drawMenuRecord(rail.x + 12, rail.y + 48, rail.w - 24, 'BEST WAVE', this.highWave, UI_COLORS.player);
    this.drawMenuRecord(rail.x + 12, rail.y + 116, rail.w - 24, 'HIGH SCORE', this.highScore.toLocaleString('en-US'), UI_COLORS.bullet);
    this.drawMenuRecord(
      rail.x + 12,
      rail.y + 184,
      rail.w - 24,
      checkpoint ? 'CHECKPOINT' : 'SAVE STATUS',
      checkpoint ? `WAVE ${checkpoint.wave}` : 'EMPTY',
      checkpoint ? UI_COLORS.success : UI_COLORS.muted,
    );

    if (checkpoint) {
      this.drawButton('حذف الحفظ', rail.x + 14, rail.y + 264, rail.w - 28, 40, () => this.clearCheckpoint());
    } else {
      label(ctx, 'AUTO SAVE', rail.x + rail.w / 2, rail.y + 286, 9, UI_COLORS.success, 900);
      label(ctx, 'يبدأ من WAVE 02', rail.x + rail.w / 2, rail.y + 305, 9, UI_COLORS.muted, 700);
    }

    const controls = this.touchMode
      ? 'TAP TO SELECT  ·  PROGRESS SAVES LOCALLY'
      : checkpoint
        ? 'C CONTINUE  ·  N NEW RUN  ·  PROGRESS SAVES LOCALLY'
        : 'ENTER START  ·  PROGRESS SAVES LOCALLY';
    label(ctx, controls, WIDTH / 2, 628, 9, UI_COLORS.muted, 800);
    label(ctx, `v${RELEASE_VERSION}`, WIDTH - 24, 696, 10, '#63739a', 700, 'right');
  }

  drawGameOver() {
    if (!this.hasContinueCheckpoint()) {
      super.drawGameOver();
      return;
    }

    const checkpoint = this.savedCheckpoint;
    const ctx = this.ctx;
    dim(ctx, 0.91);

    label(ctx, 'RUN TERMINATED', WIDTH / 2, 48, 11, UI_COLORS.danger, 900);
    label(ctx, 'انتهت الجولة', WIDTH / 2, 91, 39, UI_COLORS.text, 900);
    label(ctx, `وصلت إلى الموجة ${this.wave}  ·  نقطة الحفظ عند WAVE ${checkpoint.wave}`, WIDTH / 2, 124, 14, UI_COLORS.muted, 700);

    const items = [
      ['SCORE', this.score.toLocaleString('en-US'), UI_COLORS.bullet],
      ['TIME', formatRunTime(this.runTime), UI_COLORS.player],
      ['KILLS', this.stats.kills, UI_COLORS.danger],
      ['BEST COMBO', this.maxCombo, UI_COLORS.success],
      ['SHOTS', this.stats.shots, UI_COLORS.electric],
      ['HITS', this.stats.hits, UI_COLORS.player],
      ['UPGRADES', this.stats.upgrades, UI_COLORS.bullet],
      ['DAMAGE', this.stats.damageTaken, UI_COLORS.danger],
    ];

    items.forEach(([title, value, accent], index) => {
      const column = index % 4;
      const row = Math.floor(index / 4);
      const x = 128 + column * 260;
      const y = 153 + row * 77;
      panel(ctx, x, y, 244, 61, accent, 'rgba(6,11,26,0.9)', 4);
      label(ctx, title, x + 18, y + 20, 9, UI_COLORS.muted, 900, 'left');
      label(ctx, value, x + 220, y + 44, 18, UI_COLORS.text, 900, 'right');
    });

    label(ctx, 'اختر طريقة العودة', WIDTH / 2, 337, 15, UI_COLORS.text, 800);
    this.drawButton(
      `كمّل من WAVE ${String(checkpoint.wave).padStart(2, '0')}`,
      WIDTH / 2 + 12,
      360,
      318,
      58,
      () => this.continueFromCheckpoint(),
      true,
    );
    this.drawButton('ابدأ من WAVE 01', WIDTH / 2 - 330, 360, 318, 58, () => this.startRun());
    this.drawButton('القائمة الرئيسية', WIDTH / 2 - 180, 438, 360, 52, () => this.goToMenu());
    label(ctx, 'ENTER / C: CONTINUE  ·  R / N: NEW RUN', WIDTH / 2, 525, 10, UI_COLORS.muted, 800);
  }

  getSnapshot() {
    const checkpoint = this.savedCheckpoint;
    return {
      ...super.getSnapshot(),
      checkpointRuntimeVersion: CHECKPOINT_RUNTIME_VERSION,
      checkpointSchemaVersion: CHECKPOINT_SCHEMA_VERSION,
      checkpointProgressionActive: true,
      checkpointAvailable: this.hasContinueCheckpoint(),
      checkpointWave: checkpoint?.wave || 0,
      checkpointScore: checkpoint?.score || 0,
      checkpointUpgrades: checkpoint?.stats.upgrades || 0,
      restoredFromCheckpoint: this.restoredFromCheckpoint,
      checkpointSaveTiming: 'wave-start',
      checkpointStorage: 'local-only',
    };
  }
}
