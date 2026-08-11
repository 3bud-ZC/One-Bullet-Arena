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
export const CHECKPOINT_DASHBOARD_REVISION = 'tactical-command-hud-v5';

function techPath(ctx, x, y, w, h, cut = 14) {
  const c = Math.max(4, Math.min(cut, Math.min(w, h) / 3));
  ctx.beginPath();
  ctx.moveTo(x + c, y);
  ctx.lineTo(x + w - c, y);
  ctx.lineTo(x + w, y + c);
  ctx.lineTo(x + w, y + h - c);
  ctx.lineTo(x + w - c, y + h);
  ctx.lineTo(x + c, y + h);
  ctx.lineTo(x, y + h - c);
  ctx.lineTo(x, y + c);
  ctx.closePath();
}

function hexPath(ctx, cx, cy, radius) {
  ctx.beginPath();
  for (let index = 0; index < 6; index += 1) {
    const angle = Math.PI / 6 + index * Math.PI / 3;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export class OneBulletCheckpointRuntime extends OneBulletCombatDepthRuntime {
  constructor(canvas, liveRegion = null) {
    super(canvas, liveRegion);
    this.checkpointRuntimeVersion = CHECKPOINT_RUNTIME_VERSION;
    this.checkpointDashboardRevision = CHECKPOINT_DASHBOARD_REVISION;
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
    // Carried after startRun, which resets run state. Spent through the normal
    // upgrade panel as waves complete, so the player always picks.
    this.owedUpgrades = Math.max(0, Math.trunc(Number(checkpoint.owedUpgrades) || 0));
    return true;
  }

  // Persist the remaining debt immediately after one is spent so a reload
  // mid-run cannot hand out the same catch-up reward twice.
  persistOwedUpgrades() {
    if (!this.savedCheckpoint) return;
    this.savedCheckpoint.owedUpgrades = Math.max(0, Math.trunc(Number(this.owedUpgrades) || 0));
    this.checkpointStore?.save?.(this.savedCheckpoint);
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

  menuHover(rect) {
    return this.pointer.x >= rect.x && this.pointer.x <= rect.x + rect.w
      && this.pointer.y >= rect.y && this.pointer.y <= rect.y + rect.h;
  }

  drawDashboardBackdrop() {
    const ctx = this.ctx;
    ctx.save();
    const bg = ctx.createRadialGradient(WIDTH / 2, 300, 80, WIDTH / 2, 360, 760);
    bg.addColorStop(0, 'rgba(4, 22, 43, 0.97)');
    bg.addColorStop(0.55, 'rgba(1, 11, 26, 0.985)');
    bg.addColorStop(1, 'rgba(0, 5, 16, 0.995)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.globalAlpha = 0.13;
    ctx.strokeStyle = '#169cff';
    ctx.lineWidth = 1;
    for (let x = 32; x < WIDTH; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
    }
    for (let y = 28; y < HEIGHT; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = '#20a9ff';
    for (const radius of [220, 320, 440, 560]) {
      ctx.beginPath();
      ctx.arc(WIDTH / 2, 226, radius, Math.PI * 0.97, Math.PI * 2.03);
      ctx.stroke();
    }
    ctx.setLineDash([4, 9]);
    ctx.globalAlpha = 0.28;
    ctx.beginPath();
    ctx.arc(WIDTH / 2, 224, 270, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  drawOuterTechFrame() {
    const ctx = this.ctx;
    ctx.save();
    const x = 14;
    const y = 14;
    const w = WIDTH - 28;
    const h = HEIGHT - 28;
    techPath(ctx, x, y, w, h, 24);
    ctx.strokeStyle = '#159dff';
    ctx.lineWidth = 2.2;
    ctx.shadowColor = '#118fe9';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    techPath(ctx, x + 8, y + 8, w - 16, h - 16, 19);
    ctx.strokeStyle = 'rgba(69, 179, 255, 0.38)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.strokeStyle = '#19a9ff';
    ctx.lineWidth = 3;
    const L = 78;
    for (const [cx, cy, sx, sy] of [
      [x + 18, y + 18, 1, 1],
      [x + w - 18, y + 18, -1, 1],
      [x + 18, y + h - 18, 1, -1],
      [x + w - 18, y + h - 18, -1, -1],
    ]) {
      ctx.beginPath();
      ctx.moveTo(cx, cy + sy * L);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + sx * L, cy);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#24b7ff';
    for (let i = 0; i < 14; i += 1) {
      ctx.fillRect(26, 150 + i * 22, 7, 3);
      ctx.fillRect(WIDTH - 33, 150 + i * 22, 7, 3);
    }
    ctx.restore();
  }

  drawTechPanel(rect, accent, fill = 'rgba(2, 13, 30, 0.94)', glow = 5) {
    const ctx = this.ctx;
    ctx.save();
    if (glow > 0) {
      ctx.shadowColor = accent;
      ctx.shadowBlur = glow;
    }
    techPath(ctx, rect.x, rect.y, rect.w, rect.h, 16);
    const gradient = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    gradient.addColorStop(0, fill);
    gradient.addColorStop(1, 'rgba(1, 7, 20, 0.98)');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.7;
    ctx.stroke();

    techPath(ctx, rect.x + 7, rect.y + 7, rect.w - 14, rect.h - 14, 11);
    ctx.strokeStyle = 'rgba(101, 184, 255, 0.18)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rect.x + 22, rect.y + 3);
    ctx.lineTo(rect.x + Math.min(176, rect.w * 0.34), rect.y + 3);
    ctx.moveTo(rect.x + rect.w - 22, rect.y + rect.h - 3);
    ctx.lineTo(rect.x + rect.w - Math.min(148, rect.w * 0.3), rect.y + rect.h - 3);
    ctx.stroke();
    ctx.restore();
  }

  drawHexIcon(cx, cy, accent, glyph) {
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowColor = accent;
    ctx.shadowBlur = 9;
    hexPath(ctx, cx, cy, 23);
    ctx.fillStyle = 'rgba(3, 18, 34, 0.96)';
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.shadowBlur = 0;
    label(ctx, glyph, cx, cy + 7, 19, accent, 900);
    ctx.restore();
  }

  drawMenuRecord(rect, arTitle, enTitle, value, accent, glyph) {
    const ctx = this.ctx;
    this.drawTechPanel(rect, accent, 'rgba(3, 18, 35, 0.94)', 4);
    this.drawHexIcon(rect.x + 48, rect.y + rect.h / 2, accent, glyph);
    label(ctx, arTitle, rect.x + 92, rect.y + 31, 13, accent, 900, 'left');
    label(ctx, enTitle, rect.x + 92, rect.y + 51, 9, '#7fc7ff', 900, 'left');
    label(ctx, value, rect.x + rect.w - 22, rect.y + rect.h / 2 + 10, 25, UI_COLORS.text, 900, 'right');
  }

  drawTechButton(rect, text, accent, action, options = {}) {
    const ctx = this.ctx;
    const hovered = this.menuHover(rect);
    const primary = Boolean(options.primary);
    const danger = Boolean(options.danger);
    const icon = options.icon || '';
    const baseFill = danger
      ? 'rgba(35, 5, 15, 0.94)'
      : primary
        ? 'rgba(57, 42, 5, 0.96)'
        : 'rgba(3, 17, 38, 0.95)';
    const hoverFill = danger
      ? 'rgba(67, 8, 22, 0.98)'
      : primary
        ? 'rgba(91, 65, 5, 0.99)'
        : 'rgba(6, 35, 66, 0.99)';

    this.drawTechPanel(rect, accent, hovered ? hoverFill : baseFill, hovered || primary ? 13 : 4);
    if (icon) label(ctx, icon, rect.x + 42, rect.y + rect.h / 2 + 8, 23, accent, 900);
    label(ctx, text, rect.x + rect.w / 2 + (icon ? 16 : 0), rect.y + rect.h / 2 + 7, primary ? 20 : 16, primary ? UI_COLORS.bullet : danger ? '#ff7184' : '#80c7ff', 900);
    this.addUiRegion(rect.x, rect.y, rect.w, rect.h, action);
  }

  drawBottomCommandBar(checkpoint) {
    const ctx = this.ctx;
    const rect = { x: 190, y: 650, w: 900, h: 46 };
    this.drawTechPanel(rect, 'rgba(34, 158, 255, 0.78)', 'rgba(2, 12, 27, 0.96)', 3);
    const y = rect.y + 29;
    label(ctx, '▶', rect.x + 55, y, 14, '#57c7ff', 900);
    label(ctx, checkpoint ? 'متابعة الجولة' : 'ابدأ الجولة', rect.x + 92, y, 12, '#9fd9ff', 800, 'left');
    label(ctx, checkpoint ? 'C' : 'ENTER', rect.x + 225, y, 11, UI_COLORS.player, 900);
    ctx.fillStyle = 'rgba(80, 170, 235, 0.35)';
    ctx.fillRect(rect.x + 285, rect.y + 10, 1, 26);
    label(ctx, '↻', rect.x + 340, y, 15, '#57c7ff', 900);
    label(ctx, 'جولة جديدة', rect.x + 375, y, 12, '#9fd9ff', 800, 'left');
    label(ctx, 'N', rect.x + 493, y, 11, UI_COLORS.player, 900);
    ctx.fillRect(rect.x + 545, rect.y + 10, 1, 26);
    label(ctx, '▣', rect.x + 602, y, 14, '#57c7ff', 900);
    label(ctx, 'التقدم يُحفظ محليًا', rect.x + 640, y, 12, '#9fd9ff', 800, 'left');
  }

  drawMenu() {
    const checkpoint = this.hasContinueCheckpoint() ? this.savedCheckpoint : null;
    const ctx = this.ctx;
    const main = { x: 120, y: 190, w: 690, h: 438 };
    const rail = { x: 830, y: 190, w: 330, h: 438 };

    this.drawDashboardBackdrop();
    this.drawOuterTechFrame();

    label(ctx, 'ONE BULLET ARENA', WIDTH / 2, 58, 12, '#31dfff', 900);
    label(ctx, 'حلبة الطلقة الواحدة', WIDTH / 2, 132, 44, UI_COLORS.text, 900);
    label(
      ctx,
      checkpoint ? '✓  نقطة الحفظ جاهزة  //  حفظ محلي' : '◆  الجولة جاهزة  //  حفظ محلي',
      WIDTH / 2,
      166,
      13,
      checkpoint ? UI_COLORS.success : UI_COLORS.player,
      900,
    );

    this.drawTechPanel(main, '#1aa8ff', 'rgba(2, 14, 31, 0.965)', 7);
    this.drawTechPanel(rail, '#18a8ff', 'rgba(2, 14, 31, 0.955)', 7);

    label(ctx, 'سجلات الجولة', rail.x + rail.w / 2, rail.y + 41, 18, '#55c7ff', 900);
    ctx.fillStyle = 'rgba(42, 167, 245, 0.32)';
    ctx.fillRect(rail.x + 30, rail.y + 62, rail.w - 60, 1);

    if (checkpoint) {
      label(ctx, 'نقطة الحفظ النشطة   ▣', main.x + main.w / 2, main.y + 43, 13, UI_COLORS.success, 900);

      ctx.save();
      const waveGlow = ctx.createRadialGradient(main.x + main.w / 2, main.y + 126, 20, main.x + main.w / 2, main.y + 126, 210);
      waveGlow.addColorStop(0, 'rgba(255, 197, 44, 0.17)');
      waveGlow.addColorStop(1, 'rgba(255, 197, 44, 0)');
      ctx.fillStyle = waveGlow;
      ctx.fillRect(main.x + 50, main.y + 56, main.w - 100, 150);
      ctx.restore();

      label(ctx, '»', main.x + 145, main.y + 138, 30, UI_COLORS.bullet, 900);
      label(ctx, `WAVE ${String(checkpoint.wave).padStart(2, '0')}`, main.x + main.w / 2, main.y + 150, 60, UI_COLORS.bullet, 900);
      label(ctx, '«', main.x + main.w - 145, main.y + 138, 30, UI_COLORS.bullet, 900);
      label(ctx, 'آخر نقطة حفظ جاهزة للمتابعة', main.x + main.w / 2, main.y + 184, 16, UI_COLORS.text, 800);

      ctx.fillStyle = 'rgba(63, 175, 245, 0.32)';
      ctx.fillRect(main.x + 132, main.y + 206, main.w - 264, 1);
      this.drawHexIcon(main.x + 255, main.y + 236, '#32c5ff', '⇈');
      label(ctx, 'الترقيات', main.x + 298, main.y + 226, 10, '#64cfff', 800, 'left');
      label(ctx, checkpoint.stats.upgrades.toLocaleString('en-US'), main.x + 298, main.y + 248, 16, '#8edcff', 900, 'left');
      this.drawHexIcon(main.x + 430, main.y + 236, '#32c5ff', '◎');
      label(ctx, 'نقاط الجولة', main.x + 473, main.y + 226, 10, '#64cfff', 800, 'left');
      label(ctx, checkpoint.score.toLocaleString('en-US'), main.x + 473, main.y + 248, 16, '#8edcff', 900, 'left');

      this.drawTechButton(
        { x: main.x + 44, y: main.y + 274, w: main.w - 88, h: 62 },
        `متابعة الجولة من WAVE ${String(checkpoint.wave).padStart(2, '0')}`,
        '#ffd441',
        () => this.continueFromCheckpoint(),
        { primary: true, icon: '▶' },
      );
      this.drawTechButton(
        { x: main.x + 44, y: main.y + 348, w: main.w - 88, h: 48 },
        'جولة جديدة من البداية',
        '#238ee8',
        () => this.startRun(),
        { icon: '↻' },
      );
      this.drawTechButton(
        { x: main.x + 142, y: main.y + 406, w: main.w - 284, h: 38 },
        'حذف نقطة الحفظ',
        '#ff4f63',
        () => this.clearCheckpoint(),
        { danger: true, icon: '▥' },
      );
    } else {
      label(ctx, 'جولة جديدة   ◆', main.x + main.w / 2, main.y + 43, 13, UI_COLORS.player, 900);
      label(ctx, 'WAVE 01', main.x + main.w / 2, main.y + 150, 60, UI_COLORS.player, 900);
      label(ctx, 'طلقة واحدة. استرجعها. واصل القتال.', main.x + main.w / 2, main.y + 184, 16, UI_COLORS.text, 800);
      label(ctx, 'FIRE  ·  RICOCHET  ·  RECALL  ·  SURVIVE', main.x + main.w / 2, main.y + 234, 11, '#77bde8', 900);
      this.drawTechButton(
        { x: main.x + 44, y: main.y + 282, w: main.w - 88, h: 68 },
        'ابدأ الجولة',
        '#ffd441',
        () => this.startRun(),
        { primary: true, icon: '▶' },
      );
      label(ctx, 'WASD MOVE  ·  MOUSE FIRE  ·  Q RECALL  ·  SPACE DASH', main.x + main.w / 2, main.y + 394, 10, UI_COLORS.muted, 800);
    }

    this.drawMenuRecord(
      { x: rail.x + 26, y: rail.y + 92, w: rail.w - 52, h: 88 },
      'أفضل موجة',
      'BEST WAVE',
      this.highWave,
      '#32c8ff',
      '⌾',
    );
    this.drawMenuRecord(
      { x: rail.x + 26, y: rail.y + 198, w: rail.w - 52, h: 88 },
      'أعلى نتيجة',
      'HIGH SCORE',
      this.highScore.toLocaleString('en-US'),
      '#ffd441',
      '◎',
    );
    this.drawMenuRecord(
      { x: rail.x + 26, y: rail.y + 304, w: rail.w - 52, h: 88 },
      checkpoint ? 'نقطة الحفظ' : 'حالة الحفظ',
      checkpoint ? 'CHECKPOINT' : 'SAVE STATUS',
      checkpoint ? `WAVE ${checkpoint.wave}` : 'EMPTY',
      checkpoint ? '#34ef9a' : '#6784a5',
      '▣',
    );

    this.drawBottomCommandBar(checkpoint);
    label(ctx, `v${RELEASE_VERSION}`, WIDTH - 26, HEIGHT - 16, 9, '#5d91b9', 800, 'right');
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
      checkpointDashboardRevision: CHECKPOINT_DASHBOARD_REVISION,
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
