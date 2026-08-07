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

  drawMenu() {
    if (!this.hasContinueCheckpoint()) {
      super.drawMenu();
      return;
    }

    const checkpoint = this.savedCheckpoint;
    const ctx = this.ctx;
    const pulse = 1 + Math.sin(this.elapsed * 2.1) * 0.018;

    this.drawMenuOrbit();
    label(ctx, 'ONE BULLET ARENA', WIDTH / 2, 72, 13, UI_COLORS.player, 900);
    ctx.save();
    ctx.translate(WIDTH / 2, 146);
    ctx.scale(pulse, pulse);
    label(ctx, 'حلبة الطلقة', 0, 0, 57, UI_COLORS.text, 900);
    label(ctx, 'الواحدة', 0, 58, 57, UI_COLORS.bullet, 900);
    ctx.restore();

    label(ctx, 'CHECKPOINT PROGRESSION ONLINE', WIDTH / 2, 247, 11, UI_COLORS.success, 900);
    label(ctx, `آخر نقطة حفظ: WAVE ${String(checkpoint.wave).padStart(2, '0')}  ·  ${checkpoint.stats.upgrades} UPGRADES  ·  ${checkpoint.score.toLocaleString('en-US')} SCORE`, WIDTH / 2, 277, 13, UI_COLORS.text, 800);

    this.drawButton(
      `متابعة من WAVE ${String(checkpoint.wave).padStart(2, '0')}`,
      WIDTH / 2 + 14,
      306,
      300,
      58,
      () => this.continueFromCheckpoint(),
      true,
    );
    this.drawButton('جولة جديدة من البداية', WIDTH / 2 - 314, 306, 300, 58, () => this.startRun());

    this.drawMenuFeatureCard(122, 395, 316, '01', 'احفظ', 'تُحفظ أعلى موجة تلقائيًا عند بدايتها.', UI_COLORS.success);
    this.drawMenuFeatureCard(482, 395, 316, '02', 'استكمل', 'ارجع بنفس التطويرات والتقدم المحفوظ.', UI_COLORS.electric);
    this.drawMenuFeatureCard(842, 395, 316, '03', 'اختر', 'ابدأ من الصفر أو استخدم نقطة الحفظ.', UI_COLORS.player);

    this.drawStatChip(292, 550, 220, 'CHECKPOINT', `WAVE ${checkpoint.wave}`);
    this.drawStatChip(530, 550, 220, 'BEST WAVE', this.highWave);
    this.drawStatChip(768, 550, 220, 'HIGH SCORE', this.highScore.toLocaleString('en-US'));

    this.drawButton('حذف نقطة الحفظ', WIDTH / 2 - 115, 616, 230, 42, () => this.clearCheckpoint());
    const controls = this.touchMode
      ? 'TAP A BUTTON TO CHOOSE  ·  PROGRESS IS SAVED LOCALLY'
      : 'C CONTINUE  ·  N NEW RUN  ·  PROGRESS IS SAVED LOCALLY';
    label(ctx, controls, WIDTH / 2, 686, 10, UI_COLORS.muted, 800);
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
