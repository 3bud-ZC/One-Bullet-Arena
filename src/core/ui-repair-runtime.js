import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from '../game-data.js';
import { RELEASE_VERSION } from '../release.js';
import { UI_FONT, upgradeEffectText, wrapRtl } from '../ui-renderer.js';
import { OneBulletProductionArtRuntime } from './production-art-runtime.js';

export const UI_REPAIR_RUNTIME_VERSION = '3.5.1-ui-repair';
export const UI_REPAIR_REVISION = 'production-ui-repair-v1';

const UI = Object.freeze({
  bg: '#020913',
  surface: 'rgba(4, 17, 29, 0.94)',
  surface2: 'rgba(6, 24, 39, 0.84)',
  cyan: '#66d6f2',
  cyanSoft: '#9bcfe0',
  cyanLine: 'rgba(102, 214, 242, 0.27)',
  gold: '#e8bd4a',
  goldSoft: '#f5dc82',
  green: '#58d69b',
  red: '#df687b',
  white: '#f4f8fa',
  soft: '#b7cad4',
  muted: '#6f8e9d',
  divider: 'rgba(102, 177, 207, 0.16)',
});

function label(ctx, value, x, y, size, color, weight = 700, align = 'center', direction = 'rtl') {
  ctx.save();
  ctx.direction = direction;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${weight} ${size}px ${UI_FONT}`;
  ctx.fillStyle = color;
  ctx.fillText(String(value), x, y);
  ctx.restore();
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

export class OneBulletUiRepairRuntime extends OneBulletProductionArtRuntime {
  constructor(canvas, liveRegion = null) {
    super(canvas, liveRegion);
    this.uiRepairRuntimeVersion = UI_REPAIR_RUNTIME_VERSION;
    this.uiRepairRevision = UI_REPAIR_REVISION;
  }

  drawSectionTitle(x, y, kicker, title, accent = UI.cyan) {
    label(this.ctx, kicker, x, y, 7.2, accent, 900, 'left', 'ltr');
    label(this.ctx, title, x, y + 28, 18, UI.white, 900, 'left');
  }

  drawFlatStat(rect, labelText, value, accent, suffix = '') {
    this.panel(rect, {
      fill: 'rgba(5, 21, 35, 0.76)',
      border: 'rgba(79, 160, 194, 0.19)',
      cut: 8,
    });
    this.ctx.fillStyle = accent;
    this.ctx.fillRect(rect.x, rect.y + 12, 2, rect.h - 24);
    label(this.ctx, labelText, rect.x + 16, rect.y + 21, 7.2, UI.muted, 850, 'left', 'ltr');
    const textValue = `${value}${suffix}`;
    const size = textValue.length >= 10 ? 14 : textValue.length >= 7 ? 16 : 18;
    label(this.ctx, textValue, rect.x + 16, rect.y + 47, size, UI.white, 900, 'left', 'ltr');
  }

  drawRecordRow(rect, title, english, value, accent, glyph) {
    this.panel(rect, {
      fill: 'rgba(5, 20, 33, 0.66)',
      border: 'rgba(76, 153, 186, 0.16)',
      cut: 8,
    });

    const iconX = rect.x + 18;
    const cy = rect.y + rect.h / 2;
    this.ctx.strokeStyle = `${accent}88`;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(iconX + 17, cy, 17, 0, Math.PI * 2);
    this.ctx.stroke();
    label(this.ctx, glyph, iconX + 17, cy + 5, 10.5, accent, 900, 'center', 'ltr');

    label(this.ctx, title, rect.x + 58, rect.y + 27, 10.2, accent, 900, 'left');
    label(this.ctx, english, rect.x + 58, rect.y + 45, 6.7, UI.muted, 850, 'left', 'ltr');
    const s = String(value);
    label(this.ctx, s, rect.x + rect.w - 16, cy + 7, s.length > 9 ? 14 : s.length > 6 ? 16 : 20, UI.white, 900, 'right', 'ltr');
  }

  drawWorldProgress(rect, checkpoint) {
    const wave = checkpoint?.wave || 1;
    const thresholds = [1, 3, 6, 9, 13, 18, 25, 35];
    let stage = 0;
    for (let i = 0; i < thresholds.length; i += 1) if (wave >= thresholds[i]) stage = i;
    const final = stage === thresholds.length - 1;
    const nextWave = final ? null : thresholds[stage + 1];
    const progress = final ? 1 : clamp01((wave - thresholds[stage]) / Math.max(1, nextWave - thresholds[stage]));

    this.panel(rect, {
      fill: 'rgba(7, 25, 39, 0.62)',
      border: 'rgba(88, 170, 202, 0.18)',
      cut: 8,
    });
    label(this.ctx, 'WORLD PROGRESSION', rect.x + 16, rect.y + 22, 6.8, UI.muted, 900, 'left', 'ltr');
    label(this.ctx, final ? 'الخريطة مفتوحة بالكامل' : `القطاع ${stage + 1} من ${thresholds.length}`, rect.x + 16, rect.y + 48, 11.2, final ? UI.green : UI.cyanSoft, 850, 'left');
    label(this.ctx, final ? 'FINAL BELT ONLINE' : `NEXT EXPANSION  •  WAVE ${nextWave}`, rect.x + 16, rect.y + 70, 7.2, final ? UI.muted : UI.goldSoft, 850, 'left', 'ltr');
    this.ctx.fillStyle = 'rgba(116, 168, 190, 0.12)';
    this.ctx.fillRect(rect.x + 16, rect.y + rect.h - 17, rect.w - 32, 5);
    this.ctx.fillStyle = final ? UI.green : UI.cyan;
    this.ctx.fillRect(rect.x + 16, rect.y + rect.h - 17, (rect.w - 32) * progress, 5);
  }

  drawMenuHeader(checkpoint) {
    label(this.ctx, 'ONE BULLET ARENA', 58, 43, 9, UI.cyan, 900, 'left', 'ltr');
    label(this.ctx, 'حلبة الطلقة الواحدة', 58, 83, 31, UI.white, 900, 'left');
    label(this.ctx, 'SINGLE ROUND  /  ZERO WASTE', 58, 105, 7.2, UI.muted, 850, 'left', 'ltr');

    const status = { x: 912, y: 39, w: 310, h: 55 };
    this.panel(status, {
      fill: 'rgba(5, 21, 34, 0.72)',
      border: checkpoint ? 'rgba(88,214,155,0.28)' : 'rgba(102,214,242,0.22)',
      cut: 9,
    });
    this.ctx.fillStyle = checkpoint ? UI.green : UI.cyan;
    this.ctx.beginPath();
    this.ctx.arc(status.x + 22, status.y + 27, 5, 0, Math.PI * 2);
    this.ctx.fill();
    label(this.ctx, checkpoint ? 'CHECKPOINT READY' : 'NEW RUN READY', status.x + 39, status.y + 23, 7.2, checkpoint ? UI.green : UI.cyan, 900, 'left', 'ltr');
    label(this.ctx, checkpoint ? `الموجة ${checkpoint.wave} محفوظة وجاهزة` : 'ابدأ من الموجة الأولى', status.x + 39, status.y + 41, 9, UI.soft, 700, 'left');
  }

  drawMenu() {
    const checkpoint = this.hasContinueCheckpoint() ? this.savedCheckpoint : null;
    this.drawProductionBackground();
    this.drawMenuHeader(checkpoint);

    const main = { x: 58, y: 132, w: 780, h: 520 };
    const rail = { x: 858, y: 132, w: 364, h: 520 };
    this.panel(main, {
      fill: 'rgba(4, 17, 29, 0.90)',
      border: 'rgba(83, 168, 202, 0.24)',
      cut: 13,
    });
    this.panel(rail, {
      fill: 'rgba(3, 15, 26, 0.82)',
      border: 'rgba(83, 168, 202, 0.22)',
      cut: 13,
    });

    const wave = checkpoint?.wave || 1;
    this.drawSectionTitle(main.x + 30, main.y + 32, checkpoint ? 'ACTIVE CHECKPOINT' : 'NEW RUN', checkpoint ? 'استكمال الجولة' : 'جولة جديدة', checkpoint ? UI.green : UI.cyan);

    const hero = { x: main.x + 30, y: main.y + 82, w: main.w - 60, h: 166 };
    this.panel(hero, {
      fill: 'rgba(6, 24, 39, 0.58)',
      border: checkpoint ? 'rgba(232,189,74,0.22)' : 'rgba(102,214,242,0.18)',
      cut: 10,
    });
    this.ctx.fillStyle = checkpoint ? UI.gold : UI.cyan;
    this.ctx.fillRect(hero.x, hero.y + 18, 3, hero.h - 36);

    label(this.ctx, 'CURRENT WAVE', hero.x + 28, hero.y + 29, 7, UI.muted, 850, 'left', 'ltr');
    label(this.ctx, String(wave).padStart(2, '0'), hero.x + 28, hero.y + 112, 72, checkpoint ? UI.goldSoft : UI.cyanSoft, 900, 'left', 'ltr');

    const copyX = hero.x + 245;
    label(this.ctx, checkpoint ? 'ارجع إلى قلب المعركة' : 'طلقة واحدة. مساحة أكبر. قرار أسرع.', copyX, hero.y + 55, 16, UI.white, 900, 'left');
    label(this.ctx, checkpoint ? 'كل ترقياتك محفوظة عند بداية الموجة.' : 'استكشف القطاعات الجديدة واستعد طلقتك قبل أن تُحاصر.', copyX, hero.y + 84, 10.5, UI.soft, 650, 'left');
    label(this.ctx, checkpoint ? 'CONTINUE  •  SURVIVE  •  EXPAND' : 'FIRE  •  RICOCHET  •  RECALL  •  EXPLORE', copyX, hero.y + 115, 7.4, UI.muted, 850, 'left', 'ltr');

    const metricY = main.y + 267;
    const metricGap = 12;
    const metricW = (main.w - 60 - metricGap * 2) / 3;
    this.drawFlatStat({ x: main.x + 30, y: metricY, w: metricW, h: 61 }, 'UPGRADES', checkpoint ? checkpoint.stats.upgrades.toLocaleString('en-US') : '0', UI.cyan);
    this.drawFlatStat({ x: main.x + 30 + metricW + metricGap, y: metricY, w: metricW, h: 61 }, 'RUN SCORE', checkpoint ? checkpoint.score.toLocaleString('en-US') : '0', UI.gold);
    this.drawFlatStat({ x: main.x + 30 + (metricW + metricGap) * 2, y: metricY, w: metricW, h: 61 }, 'SAVE', checkpoint ? 'READY' : 'EMPTY', checkpoint ? UI.green : UI.muted);

    if (checkpoint) {
      this.drawProductionButton(
        { x: main.x + 30, y: main.y + 348, w: main.w - 60, h: 62 },
        'repair-continue',
        `متابعة من الموجة ${checkpoint.wave}`,
        () => this.continueFromCheckpoint(),
        { primary: true, icon: '▶', badge: `WAVE ${String(checkpoint.wave).padStart(2, '0')}` },
      );
      const secondaryW = (main.w - 72) / 2;
      this.drawProductionButton(
        { x: main.x + 30, y: main.y + 424, w: secondaryW, h: 48 },
        'repair-new-run',
        'جولة جديدة',
        () => this.startRun(),
        { icon: '↻' },
      );
      this.drawProductionButton(
        { x: main.x + 42 + secondaryW, y: main.y + 424, w: secondaryW, h: 48 },
        'repair-delete-save',
        'حذف نقطة الحفظ',
        () => this.clearCheckpoint(),
        { danger: true },
      );
    } else {
      this.drawProductionButton(
        { x: main.x + 30, y: main.y + 356, w: main.w - 60, h: 64 },
        'repair-start',
        'ابدأ الجولة الأولى',
        () => this.startRun(),
        { primary: true, icon: '▶', badge: 'WAVE 01' },
      );
      label(this.ctx, 'WASD MOVE  •  MOUSE FIRE  •  Q RECALL  •  SPACE DASH', main.x + main.w / 2, main.y + 473, 7.6, UI.muted, 850, 'center', 'ltr');
    }

    this.drawSectionTitle(rail.x + 22, rail.y + 31, 'RUN INTELLIGENCE', 'سجل الجولة');
    this.ctx.fillStyle = UI.divider;
    this.ctx.fillRect(rail.x + 22, rail.y + 70, rail.w - 44, 1);

    const rowX = rail.x + 18;
    const rowW = rail.w - 36;
    this.drawRecordRow({ x: rowX, y: rail.y + 87, w: rowW, h: 74 }, 'أفضل موجة', 'BEST WAVE', this.highWave, UI.cyan, '◎');
    this.drawRecordRow({ x: rowX, y: rail.y + 173, w: rowW, h: 74 }, 'أعلى نتيجة', 'HIGH SCORE', this.highScore.toLocaleString('en-US'), UI.gold, '◉');
    this.drawRecordRow({ x: rowX, y: rail.y + 259, w: rowW, h: 74 }, 'نقطة الحفظ', 'CHECKPOINT', checkpoint ? `WAVE ${checkpoint.wave}` : 'EMPTY', checkpoint ? UI.green : UI.muted, '◆');
    this.drawWorldProgress({ x: rowX, y: rail.y + 351, w: rowW, h: 132 }, checkpoint);

    label(this.ctx, checkpoint ? 'C  CONTINUE' : 'ENTER  START', 58, 690, 7.2, UI.muted, 850, 'left', 'ltr');
    label(this.ctx, 'N  NEW RUN', 200, 690, 7.2, UI.muted, 850, 'left', 'ltr');
    label(this.ctx, 'F  FULLSCREEN', 318, 690, 7.2, UI.muted, 850, 'left', 'ltr');
    label(this.ctx, `v${RELEASE_VERSION}`, WIDTH - 28, 690, 7.1, '#496b7a', 800, 'right', 'ltr');
  }

  drawHud() {
    const ctx = this.ctx;
    const bullet = { x: 18, y: 14, w: 268, h: 54 };
    const wave = { x: WIDTH / 2 - 176, y: 14, w: 352, h: 54 };
    const vital = { x: WIDTH - 286, y: 14, w: 268, h: 54 };
    const bulletColor = this.bullet.held ? UI.gold : UI.cyan;
    const lowHealth = this.player.health <= Math.max(1, this.player.maxHealth * 0.34);

    for (const [rect, accent] of [[bullet, bulletColor], [wave, UI.cyan], [vital, lowHealth ? UI.red : UI.green]]) {
      this.panel(rect, {
        fill: 'rgba(3, 15, 26, 0.78)',
        border: 'rgba(79, 158, 192, 0.22)',
        cut: 8,
      });
      ctx.fillStyle = accent;
      ctx.fillRect(rect.x + 12, rect.y + 5, 48, 2);
    }

    label(ctx, this.bullet.held ? 'الطلقة جاهزة' : this.bullet.recalling ? 'الطلقة عائدة' : 'الطلقة في الميدان', bullet.x + 15, bullet.y + 22, 9.5, bulletColor, 900, 'left');
    label(ctx, this.bullet.held ? 'READY' : this.bullet.recalling ? 'RETURNING' : 'Q  RECALL', bullet.x + 15, bullet.y + 38, 6.5, UI.muted, 850, 'left', 'ltr');
    const recallMax = Math.max(1.15, 3.8 - this.stack('magnetic-recall') * 0.38);
    this.drawHudBar(bullet.x + 15, bullet.y + 45, bullet.w - 30, 3, this.bullet.held ? 1 : 1 - this.bullet.recallCooldown / recallMax, bulletColor);

    label(ctx, `WAVE ${String(this.wave).padStart(2, '0')}`, wave.x + 18, wave.y + 25, 14, UI.white, 900, 'left', 'ltr');
    label(ctx, this.currentEncounter?.name || 'ضغط متوازن', wave.x + wave.w - 18, wave.y + 24, 8.5, UI.goldSoft, 850, 'right');
    label(ctx, `${this.enemies.length} ENEMIES  •  ${this.score.toLocaleString('en-US')} SCORE  •  SECTOR ${this.arenaStage.id + 1}`, wave.x + wave.w / 2, wave.y + 43, 6.2, UI.muted, 850, 'center', 'ltr');

    const hpRatio = this.player.maxHealth > 0 ? this.player.health / this.player.maxHealth : 0;
    label(ctx, `HP ${this.player.health}/${this.player.maxHealth}`, vital.x + 15, vital.y + 22, 9.5, UI.white, 900, 'left', 'ltr');
    label(ctx, this.player.shield > 0 ? 'SHIELD' : `${this.stats.upgrades} UPGRADES`, vital.x + vital.w - 15, vital.y + 22, 6.4, this.player.shield > 0 ? UI.cyan : UI.muted, 850, 'right', 'ltr');
    this.drawHudBar(vital.x + 15, vital.y + 31, vital.w - 30, 5, hpRatio, lowHealth ? UI.red : '#e67682');
    const dashMax = Math.max(0.36, 1.12 * Math.pow(0.86, this.stack('quick-dash')));
    this.drawHudBar(vital.x + 15, vital.y + 44, vital.w - 30, 3, 1 - this.player.dashCooldown / dashMax, UI.cyan);

    if (!this.touchMode && this.arenaStage.id >= 4) this.drawMiniMap();
    if (this.state === 'playing' && this.wave === 1 && this.tutorialStep < 3) this.drawTutorial();
  }

  drawMiniMap() {
    const rect = { x: WIDTH - 176, y: 82, w: 158, h: 96 };
    this.panel(rect, {
      fill: 'rgba(3, 15, 26, 0.74)',
      border: 'rgba(78, 157, 191, 0.20)',
      cut: 8,
    });
    label(this.ctx, `S${this.arenaStage.id + 1}`, rect.x + 11, rect.y + 16, 6.4, UI.cyanSoft, 900, 'left', 'ltr');
    label(this.ctx, 'MAP', rect.x + rect.w - 11, rect.y + 16, 5.7, UI.muted, 850, 'right', 'ltr');

    const bounds = this.arenaStage.bounds;
    const inner = { x: rect.x + 10, y: rect.y + 25, w: rect.w - 20, h: rect.h - 35 };
    const scale = Math.min(inner.w / bounds.w, inner.h / bounds.h);
    const mapW = bounds.w * scale;
    const mapH = bounds.h * scale;
    const mapX = inner.x + (inner.w - mapW) / 2;
    const mapY = inner.y + (inner.h - mapH) / 2;
    const project = (p) => ({ x: mapX + (p.x - bounds.x) * scale, y: mapY + (p.y - bounds.y) * scale });

    this.ctx.fillStyle = 'rgba(47, 91, 113, 0.10)';
    this.ctx.fillRect(mapX, mapY, mapW, mapH);
    this.ctx.strokeStyle = 'rgba(102, 214, 242, 0.22)';
    this.ctx.strokeRect(mapX, mapY, mapW, mapH);
    this.ctx.fillStyle = 'rgba(88, 214, 155, 0.22)';
    for (const point of this.explorationTrail) {
      const p = project(point);
      this.ctx.fillRect(p.x - 0.8, p.y - 0.8, 1.6, 1.6);
    }
    const view = this.viewportWorldBounds();
    const viewP = project(view);
    this.ctx.strokeStyle = 'rgba(232, 189, 74, 0.52)';
    this.ctx.strokeRect(viewP.x, viewP.y, view.w * scale, view.h * scale);
    const player = project(this.player);
    this.ctx.fillStyle = UI.cyan;
    this.ctx.beginPath();
    this.ctx.arc(player.x, player.y, 2.4, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawPause() {
    this.drawModalBackdrop(0.58);
    const modal = { x: WIDTH / 2 - 260, y: 158, w: 520, h: 360 };
    this.panel(modal, {
      fill: 'rgba(4, 16, 28, 0.97)',
      border: 'rgba(102, 214, 242, 0.34)',
      cut: 13,
      shadow: 8,
      shadowColor: 'rgba(102,214,242,0.20)',
    });
    this.drawSectionTitle(modal.x + 30, modal.y + 34, 'TACTICAL PAUSE', 'متوقف مؤقتًا');
    label(this.ctx, 'الجولة متوقفة — التقدم الحالي محفوظ في الذاكرة', modal.x + 30, modal.y + 89, 9, UI.soft, 650, 'left');

    const statW = 140;
    this.drawFlatStat({ x: modal.x + 30, y: modal.y + 110, w: statW, h: 56 }, 'WAVE', String(this.wave).padStart(2, '0'), UI.gold);
    this.drawFlatStat({ x: modal.x + 190, y: modal.y + 110, w: statW, h: 56 }, 'SCORE', this.score.toLocaleString('en-US'), UI.cyan);
    this.drawFlatStat({ x: modal.x + 350, y: modal.y + 110, w: statW, h: 56 }, 'SECTOR', String((this.arenaStage?.id ?? 0) + 1), UI.green);

    this.drawProductionButton({ x: modal.x + 30, y: modal.y + 188, w: modal.w - 60, h: 58 }, 'repair-pause-resume', 'استكمال الجولة', () => this.resume(), { primary: true, icon: '▶', badge: `WAVE ${String(this.wave).padStart(2, '0')}` });
    const secondaryW = (modal.w - 72) / 2;
    this.drawProductionButton({ x: modal.x + 30, y: modal.y + 260, w: secondaryW, h: 46 }, 'repair-pause-new', 'جولة جديدة', () => this.startRun(), { icon: '↻' });
    this.drawProductionButton({ x: modal.x + 42 + secondaryW, y: modal.y + 260, w: secondaryW, h: 46 }, 'repair-pause-menu', 'القائمة الرئيسية', () => this.goToMenu());
    label(this.ctx, 'P / ESC  RESUME   •   F  FULLSCREEN', modal.x + modal.w / 2, modal.y + 337, 7.2, UI.muted, 850, 'center', 'ltr');
  }

  drawGameOver() {
    const checkpoint = this.hasContinueCheckpoint() ? this.savedCheckpoint : null;
    this.drawModalBackdrop(0.70);
    const modal = { x: WIDTH / 2 - 320, y: 100, w: 640, h: 500 };
    this.panel(modal, {
      fill: 'rgba(4, 16, 28, 0.975)',
      border: 'rgba(223, 104, 123, 0.42)',
      cut: 14,
      shadow: 9,
      shadowColor: 'rgba(223,104,123,0.20)',
    });
    this.drawSectionTitle(modal.x + 32, modal.y + 34, 'RUN TERMINATED', 'انتهت الجولة', UI.red);
    label(this.ctx, `وصلت إلى الموجة ${this.wave}`, modal.x + 32, modal.y + 91, 10, UI.soft, 650, 'left');

    const statGap = 10;
    const statW = (modal.w - 64 - statGap * 3) / 4;
    const stats = [
      ['SCORE', this.score.toLocaleString('en-US'), UI.gold],
      ['KILLS', String(this.stats.kills), UI.cyan],
      ['TIME', `${Math.floor(this.runTime / 60)}:${String(Math.floor(this.runTime % 60)).padStart(2, '0')}`, UI.green],
      ['UPGRADES', String(this.stats.upgrades), UI.cyanSoft],
    ];
    stats.forEach(([name, value, accent], index) => this.drawFlatStat({ x: modal.x + 32 + index * (statW + statGap), y: modal.y + 112, w: statW, h: 58 }, name, value, accent));

    const note = { x: modal.x + 32, y: modal.y + 188, w: modal.w - 64, h: 62 };
    this.panel(note, {
      fill: checkpoint ? 'rgba(18, 58, 45, 0.26)' : 'rgba(7, 24, 38, 0.58)',
      border: checkpoint ? 'rgba(88, 214, 155, 0.24)' : 'rgba(102, 177, 207, 0.16)',
      cut: 8,
    });
    label(this.ctx, checkpoint ? `CHECKPOINT  •  WAVE ${checkpoint.wave}` : 'NO CHECKPOINT', note.x + 18, note.y + 25, 7.2, checkpoint ? UI.green : UI.muted, 900, 'left', 'ltr');
    label(this.ctx, checkpoint ? 'يمكنك الرجوع إلى بداية آخر موجة محفوظة.' : 'ابدأ من جديد وحاول بناء مسار ترقيات أقوى.', note.x + 18, note.y + 46, 9.5, UI.soft, 650, 'left');

    if (checkpoint) {
      this.drawProductionButton({ x: modal.x + 32, y: modal.y + 272, w: modal.w - 64, h: 60 }, 'repair-over-continue', `متابعة من الموجة ${checkpoint.wave}`, () => this.continueFromCheckpoint(), { primary: true, icon: '▶', badge: `WAVE ${String(checkpoint.wave).padStart(2, '0')}` });
      const secondaryW = (modal.w - 76) / 2;
      this.drawProductionButton({ x: modal.x + 32, y: modal.y + 346, w: secondaryW, h: 46 }, 'repair-over-new', 'جولة جديدة', () => this.startRun(), { icon: '↻' });
      this.drawProductionButton({ x: modal.x + 44 + secondaryW, y: modal.y + 346, w: secondaryW, h: 46 }, 'repair-over-menu', 'القائمة الرئيسية', () => this.goToMenu());
    } else {
      this.drawProductionButton({ x: modal.x + 32, y: modal.y + 282, w: modal.w - 64, h: 60 }, 'repair-over-retry', 'ابدأ جولة جديدة', () => this.startRun(), { primary: true, icon: '↻', badge: 'WAVE 01' });
      this.drawProductionButton({ x: modal.x + 32, y: modal.y + 356, w: modal.w - 64, h: 46 }, 'repair-over-menu', 'القائمة الرئيسية', () => this.goToMenu());
    }
    label(this.ctx, 'ONE BULLET  •  ONE DECISION AT A TIME', modal.x + modal.w / 2, modal.y + 466, 7.2, UI.muted, 850, 'center', 'ltr');
  }

  drawUpgradeSelection() {
    this.drawModalBackdrop(0.62);
    label(this.ctx, 'UPGRADE PROTOCOL', WIDTH / 2, 42, 8, UI.cyan, 900, 'center', 'ltr');
    label(this.ctx, 'اختر تطويرًا واحدًا', WIDTH / 2, 78, 27, UI.white, 900);
    label(this.ctx, `WAVE ${this.wave} CLEARED  •  BUILD ${this.stats.upgrades + 1}`, WIDTH / 2, 101, 7.5, UI.muted, 850, 'center', 'ltr');

    const cardW = 344;
    const cardH = 420;
    const gap = 20;
    const total = this.upgradeChoices.length * cardW + (this.upgradeChoices.length - 1) * gap;
    const startX = WIDTH / 2 - total / 2;
    const y = 128;

    this.upgradeChoices.forEach((upgrade, index) => {
      const rect = { x: startX + index * (cardW + gap), y, w: cardW, h: cardH };
      const hovered = this.menuHover(rect);
      const accent = index === 1 ? UI.gold : UI.cyan;
      this.panel(rect, {
        fill: hovered ? 'rgba(8, 31, 49, 0.96)' : 'rgba(4, 17, 29, 0.96)',
        border: hovered ? `${accent}aa` : 'rgba(78, 157, 190, 0.24)',
        cut: 12,
        shadow: hovered ? 5 : 0,
        shadowColor: accent,
      });
      this.ctx.fillStyle = accent;
      this.ctx.fillRect(rect.x + 18, rect.y + 6, 62, 2);
      label(this.ctx, `0${index + 1}`, rect.x + 20, rect.y + 34, 8.5, accent, 900, 'left', 'ltr');
      label(this.ctx, upgrade.tag, rect.x + rect.w - 20, rect.y + 34, 8.5, accent, 900, 'right');
      wrapRtl(this.ctx, upgrade.name, rect.x + rect.w - 22, rect.y + 78, rect.w - 44, 28, 21, UI.white, 900, 2);
      wrapRtl(this.ctx, upgrade.description, rect.x + rect.w - 22, rect.y + 140, rect.w - 44, 23, 12.8, UI.soft, 600, 3);
      this.ctx.fillStyle = UI.divider;
      this.ctx.fillRect(rect.x + 22, rect.y + 228, rect.w - 44, 1);
      label(this.ctx, 'التأثير التالي', rect.x + rect.w - 22, rect.y + 254, 8.2, UI.cyanSoft, 850, 'right');
      wrapRtl(this.ctx, upgradeEffectText(upgrade, this.stack(upgrade.id)), rect.x + rect.w - 22, rect.y + 280, rect.w - 44, 20, 11, UI.soft, 700, 3);
      label(this.ctx, `LEVEL ${this.stack(upgrade.id)} / ${upgrade.maxStacks}`, rect.x + 20, rect.y + rect.h - 24, 7.2, UI.muted, 900, 'left', 'ltr');
      label(this.ctx, hovered ? 'SELECT' : 'READY', rect.x + rect.w - 20, rect.y + rect.h - 24, 7.2, hovered ? accent : UI.muted, 900, 'right', 'ltr');
      this.addUiRegion(rect.x, rect.y, rect.w, rect.h, () => this.chooseUpgrade(index));
    });

    label(this.ctx, 'CLICK A CARD  •  1 / 2 / 3', WIDTH / 2, 586, 7.2, UI.muted, 850, 'center', 'ltr');
  }

  getSnapshot() {
    return {
      ...super.getSnapshot(),
      uiRepairRuntimeVersion: UI_REPAIR_RUNTIME_VERSION,
      uiRepairRevision: UI_REPAIR_REVISION,
      uiRepairActive: true,
      uiRepairScope: 'menu-hud-minimap-pause-gameover-upgrade',
      uiDensity: 'balanced-production',
    };
  }
}
