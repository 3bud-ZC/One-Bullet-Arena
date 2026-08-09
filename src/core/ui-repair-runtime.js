import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from '../game-data.js';
import { i18n } from '../i18n.js';
import { RELEASE_VERSION } from '../release.js';
import { TOUCH_LAYOUT } from '../ui-renderer.js';
import {
  UI_TOKENS,
  angularPath,
  drawBulletGlyph,
  drawButton,
  drawGauge,
  drawLocalizedText,
  drawSurface,
  drawTargetGlyph,
  drawText,
  drawTrajectoryBackground,
  wrapText,
} from '../ui-system.js';
import { OneBulletProductionArtRuntime } from './production-art-runtime.js';

export const GLOBAL_UI_RUNTIME_VERSION = '3.6.0-global-ui';
export const GLOBAL_UI_REVISION = 'global-command-interface-v1';
export const UI_REPAIR_RUNTIME_VERSION = GLOBAL_UI_RUNTIME_VERSION;
export const UI_REPAIR_REVISION = GLOBAL_UI_REVISION;

const C = UI_TOKENS.color;
const STAGE_WAVES = Object.freeze([1, 3, 6, 9, 13, 18, 25, 35]);

function clamp01(value) { return Math.max(0, Math.min(1, Number(value) || 0)); }
function stageIndexForWave(wave) {
  let result = 0;
  for (let index = 0; index < STAGE_WAVES.length; index += 1) if (wave >= STAGE_WAVES[index]) result = index;
  return result;
}
function withAlpha(hex, alphaHex) { return `${hex}${alphaHex}`; }

export class OneBulletGlobalUiRuntime extends OneBulletProductionArtRuntime {
  constructor(canvas, liveRegion = null) {
    super(canvas, liveRegion);
    this.globalUiRuntimeVersion = GLOBAL_UI_RUNTIME_VERSION;
    this.globalUiRevision = GLOBAL_UI_REVISION;
    this.uiRepairRuntimeVersion = GLOBAL_UI_RUNTIME_VERSION;
    this.uiRepairRevision = GLOBAL_UI_REVISION;
    this.uiMotion = Object.create(null);
    this.reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
    this.locale = i18n.locale;
    this.unsubscribeLocale = i18n.subscribe(() => {
      this.locale = i18n.locale;
      this.syncDocumentCopy();
      this.announce(i18n.t('status.languageChanged'));
    });
    this.syncDocumentCopy();
    window.addEventListener('keydown', (event) => {
      if (event.key.toLowerCase() === 'l' && ['menu', 'paused'].includes(this.state)) i18n.toggle();
    });
  }

  getSnapshot() {
    return {
      ...super.getSnapshot(),
      globalUiRuntimeVersion: GLOBAL_UI_RUNTIME_VERSION,
      globalUiRevision: GLOBAL_UI_REVISION,
      globalUiActive: true,
      localizationActive: true,
      locale: i18n.locale,
      direction: i18n.dir,
      presentationOwner: 'OneBulletGlobalUiRuntime',
      uiDensity: 'game-command-surface',
      bilingualUi: true,
      legacyUiOverridesBypassed: true,
    };
  }

  syncDocumentCopy() {
    const orientation = document.querySelector('.orientation-hint');
    const strong = orientation?.querySelector('strong');
    const span = orientation?.querySelector('span');
    const frame = document.querySelector('.game-frame');
    if (strong) strong.textContent = i18n.t('orientation.title');
    if (span) span.textContent = i18n.t('orientation.body');
    if (frame) frame.setAttribute('aria-label', i18n.t('brand.title'));
    this.canvas?.setAttribute('aria-label', i18n.t('brand.title'));
    document.title = i18n.t('brand.title');
  }

  setState(state) {
    // Preserve EventRuntime's STATE_CHANGED emission and every lower-layer state side effect.
    const result = super.setState(state);
    const copy = {
      menu: i18n.t('brand.title'),
      playing: i18n.t('wave.incoming', { wave: this.wave || 1 }),
      upgrade: i18n.t('upgrade.title'),
      paused: i18n.t('pause.title'),
      gameover: i18n.t('gameOver.title'),
    };
    this.announce(copy[state]);
    return result;
  }

  startNextWave() {
    const result = super.startNextWave();
    this.announce(`${i18n.t('wave.incoming', { wave: this.wave })}. ${i18n.t('hud.enemiesLeft', { count: this.enemies.length })}.`);
    return result;
  }

  t(key, params) { return i18n.t(key, params); }
  n(value) { return i18n.number(value); }
  dir() { return i18n.dir; }
  rtl() { return i18n.isRtl; }

  mixUi(key, active, speed = 0.16) {
    if (this.reducedMotion) return active ? 1 : 0;
    const current = Number(this.uiMotion[key] || 0);
    const target = active ? 1 : 0;
    const next = current + (target - current) * speed;
    this.uiMotion[key] = Math.abs(target - next) < 0.01 ? target : next;
    return this.uiMotion[key];
  }

  localText(value, x, y, options = {}) {
    drawLocalizedText(this.ctx, i18n, value, x, y, options);
  }

  uiButton(rect, key, textValue, action, options = {}) {
    const hovered = this.menuHover(rect);
    const hover = this.mixUi(key, hovered, 0.22);
    const sweep = this.reducedMotion ? 0 : ((this.elapsed * 0.22) % 1);
    drawButton(this.ctx, rect, { ...options, hover, sweep });

    const iconX = this.rtl() ? rect.x + rect.w - 35 : rect.x + 35;
    if (options.icon === 'bullet') {
      drawBulletGlyph(this.ctx, iconX, rect.y + rect.h / 2, {
        color: options.danger ? C.red : options.primary ? C.amberBright : C.cyanBright,
        scale: 0.72,
        angle: this.rtl() ? Math.PI : 0,
      });
    } else if (options.icon) {
      drawText(this.ctx, options.icon, iconX, rect.y + rect.h / 2 + 1, {
        size: 13,
        color: options.danger ? C.red : C.cyanBright,
        weight: 900,
        align: 'center',
        baseline: 'middle',
        direction: 'ltr',
      });
    }

    const textX = this.rtl()
      ? rect.x + rect.w - (options.icon ? 62 : 22)
      : rect.x + (options.icon ? 62 : 22);
    this.localText(textValue, textX, rect.y + rect.h / 2 + 1, {
      size: options.primary ? 15 : 11.5,
      color: options.danger ? C.red : options.primary ? C.amberBright : C.text,
      weight: options.primary ? 900 : 750,
      align: this.rtl() ? 'right' : 'left',
      baseline: 'middle',
    });

    if (options.meta) {
      drawText(this.ctx, options.meta, this.rtl() ? rect.x + 20 : rect.x + rect.w - 20, rect.y + rect.h / 2 + 1, {
        size: 7.5,
        color: options.primary ? C.amber : C.textMuted,
        weight: 900,
        align: this.rtl() ? 'left' : 'right',
        baseline: 'middle',
        direction: 'ltr',
      });
    }
    this.addUiRegion(rect.x, rect.y, rect.w, rect.h, action);
  }

  utilityChip(rect, key, textValue, action, options = {}) {
    const hover = this.mixUi(key, this.menuHover(rect), 0.24);
    drawSurface(this.ctx, rect, {
      fill: `rgba(7,18,27,${0.68 + hover * 0.16})`,
      border: options.active ? withAlpha(options.accent || C.cyan, '66') : `rgba(115,164,184,${0.18 + hover * 0.18})`,
      cut: 7,
    });
    if (options.dot) {
      this.ctx.fillStyle = options.accent || C.cyan;
      this.ctx.beginPath();
      this.ctx.arc(rect.x + 15, rect.y + rect.h / 2, 3.2, 0, Math.PI * 2);
      this.ctx.fill();
    }
    drawText(this.ctx, textValue, rect.x + (options.dot ? 26 : 12), rect.y + rect.h / 2 + 1, {
      size: 7.4,
      color: options.active ? (options.accent || C.cyanBright) : C.textSoft,
      weight: 800,
      align: 'left',
      baseline: 'middle',
      direction: options.direction || 'ltr',
    });
    this.addUiRegion(rect.x, rect.y, rect.w, rect.h, action);
  }

  toggleFullscreen() {
    try {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else document.documentElement.requestFullscreen?.({ navigationUI: 'hide' });
    } catch {
      // Fullscreen is optional.
    }
  }

  toggleAudio() {
    const muted = this.audio.toggleMute();
    this.announce(this.t(muted ? 'status.audioMuted' : 'status.audioEnabled'));
  }

  drawGlobalBackground() {
    drawTrajectoryBackground(this.ctx, WIDTH, HEIGHT, this.elapsed, this.reducedMotion);
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(105,215,244,0.07)';
    this.ctx.lineWidth = 1;
    const sectors = [
      { x: 94, y: 164, w: 330, h: 226 },
      { x: 842, y: 126, w: 326, h: 188 },
      { x: 916, y: 434, w: 242, h: 146 },
    ];
    for (const rect of sectors) {
      angularPath(this.ctx, rect.x, rect.y, rect.w, rect.h, 18);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  drawTopUtility() {
    drawText(this.ctx, this.t('brand.name'), 56, 42, {
      size: 9, color: C.cyan, weight: 900, align: 'left', direction: 'ltr',
    });
    drawText(this.ctx, `v${RELEASE_VERSION}`, 56, 62, {
      size: 6.5, color: C.textMuted, weight: 700, align: 'left', direction: 'ltr',
    });

    this.utilityChip({ x: 895, y: 28, w: 104, h: 30 }, 'lang', this.rtl() ? 'English' : 'العربية', () => i18n.toggle(), {
      active: true,
      accent: C.cyan,
      direction: this.rtl() ? 'ltr' : 'rtl',
    });
    this.utilityChip({ x: 1009, y: 28, w: 94, h: 30 }, 'audio', this.audio.settings.muted ? this.t('menu.muted') : this.t('menu.soundOn'), () => this.toggleAudio(), {
      dot: true,
      active: !this.audio.settings.muted,
      accent: this.audio.settings.muted ? C.red : C.green,
      direction: this.dir(),
    });
    this.utilityChip({ x: 1113, y: 28, w: 111, h: 30 }, 'full', this.t('menu.fullscreen'), () => this.toggleFullscreen(), {
      direction: this.dir(),
    });
  }

  drawRunSnapshot(x, y, checkpoint) {
    const wave = checkpoint?.wave || 1;
    const stats = checkpoint?.stats || { upgrades: 0 };
    const score = checkpoint?.score || 0;
    const entries = [
      [this.t('stat.score'), this.n(score), C.amber],
      [this.t('stat.upgrades'), this.n(stats.upgrades || 0), C.cyan],
      [this.t('stat.bestWave'), this.n(this.highWave), C.cyan],
      [this.t('stat.highScore'), this.n(this.highScore), C.amber],
    ];
    this.localText(this.t('menu.runSnapshot'), this.rtl() ? x + 300 : x, y, {
      size: 11, color: C.text, weight: 850, align: this.rtl() ? 'right' : 'left',
    });
    entries.forEach(([labelValue, value, accent], index) => {
      const rowY = y + 34 + index * 48;
      this.ctx.fillStyle = 'rgba(255,255,255,0.055)';
      this.ctx.fillRect(x, rowY + 28, 300, 1);
      this.localText(labelValue, this.rtl() ? x + 300 : x, rowY + 12, {
        size: 8.2, color: C.textMuted, weight: 700, align: this.rtl() ? 'right' : 'left',
      });
      drawText(this.ctx, value, this.rtl() ? x : x + 300, rowY + 13, {
        size: 16, color: accent, weight: 900, align: this.rtl() ? 'left' : 'right', direction: 'ltr',
      });
    });
    const sector = stageIndexForWave(wave);
    this.localText(this.t('stat.sector'), this.rtl() ? x + 300 : x, y + 233, {
      size: 8.2, color: C.textMuted, weight: 700, align: this.rtl() ? 'right' : 'left',
    });
    this.localText(this.t(`stage.${sector}`), this.rtl() ? x : x + 300, y + 233, {
      size: 11.5, color: C.green, weight: 850, align: this.rtl() ? 'left' : 'right',
    });
  }

  drawWorldTimeline(x, y, width, wave) {
    const stage = stageIndexForWave(wave);
    const nodeGap = width / (STAGE_WAVES.length - 1);
    this.localText(this.t('menu.worldProgress'), this.rtl() ? x + width : x, y - 25, {
      size: 9.2, color: C.textSoft, weight: 800, align: this.rtl() ? 'right' : 'left',
    });
    this.ctx.strokeStyle = C.lineStrong;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(x + width, y);
    this.ctx.stroke();

    for (let index = 0; index < STAGE_WAVES.length; index += 1) {
      const nodeX = x + index * nodeGap;
      const unlocked = index <= stage;
      const current = index === stage;
      this.ctx.fillStyle = unlocked ? (current ? C.amber : C.cyan) : '#20323d';
      this.ctx.beginPath();
      this.ctx.arc(nodeX, y, current ? 7 : 4, 0, Math.PI * 2);
      this.ctx.fill();
      if (current) {
        this.ctx.strokeStyle = withAlpha(C.amber, '55');
        this.ctx.beginPath();
        this.ctx.arc(nodeX, y, 13, 0, Math.PI * 2);
        this.ctx.stroke();
      }
      drawText(this.ctx, String(index + 1).padStart(2, '0'), nodeX, y + 21, {
        size: 6.2, color: unlocked ? C.textSoft : C.textMuted, weight: 800, align: 'center', direction: 'ltr',
      });
    }

    this.localText(this.t(`stage.${stage}`), this.rtl() ? x + width : x, y + 45, {
      size: 11, color: C.cyanBright, weight: 850, align: this.rtl() ? 'right' : 'left',
    });
    const next = stage >= STAGE_WAVES.length - 1 ? null : STAGE_WAVES[stage + 1];
    if (next) {
      drawText(this.ctx, `${this.t('menu.nextExpansion').toUpperCase()}  •  WAVE ${next}`, this.rtl() ? x : x + width, y + 45, {
        size: 6.6, color: C.textMuted, weight: 800, align: this.rtl() ? 'left' : 'right', direction: 'ltr',
      });
    }
  }

  drawMenu() {
    const checkpoint = this.hasContinueCheckpoint() ? this.savedCheckpoint : null;
    const wave = checkpoint?.wave || 1;
    this.drawGlobalBackground();
    this.drawTopUtility();

    this.localText(this.t('brand.title'), this.rtl() ? WIDTH - 68 : 68, 108, {
      size: 30, color: C.text, weight: 900, align: this.rtl() ? 'right' : 'left',
    });
    this.localText(this.t('brand.mantra'), this.rtl() ? WIDTH - 68 : 68, 132, {
      size: 7.2, color: C.textMuted, weight: 750, align: this.rtl() ? 'right' : 'left',
    });

    const titleX = this.rtl() ? 826 : 112;
    const textAlign = this.rtl() ? 'right' : 'left';
    const trajectoryStart = this.rtl() ? 928 : 78;
    const trajectoryEnd = this.rtl() ? 452 : 828;
    this.ctx.strokeStyle = checkpoint ? withAlpha(C.amber, '44') : withAlpha(C.cyan, '38');
    this.ctx.lineWidth = 1.3;
    this.ctx.beginPath();
    this.ctx.moveTo(trajectoryStart, 205);
    this.ctx.lineTo(this.rtl() ? 760 : 252, 205);
    this.ctx.lineTo(this.rtl() ? 700 : 314, 244);
    this.ctx.lineTo(trajectoryEnd, 244);
    this.ctx.stroke();
    drawBulletGlyph(this.ctx, this.rtl() ? 714 : 300, 238, {
      color: checkpoint ? C.amber : C.cyan,
      scale: 0.8,
      angle: this.rtl() ? Math.PI : 0,
    });

    this.localText(checkpoint ? this.t('menu.currentRun') : this.t('menu.freshRun'), titleX, 205, {
      size: 9, color: checkpoint ? C.green : C.cyan, weight: 900, align: textAlign,
    });
    drawText(this.ctx, `WAVE ${String(wave).padStart(2, '0')}`, titleX, 310, {
      size: 74, color: checkpoint ? C.amberBright : C.cyanBright, weight: 900, align: textAlign, direction: 'ltr',
    });
    this.localText(checkpoint ? this.t('menu.continueHint') : this.t('menu.actionHint'), titleX, 348, {
      size: 12, color: C.textSoft, weight: 700, align: textAlign,
    });

    this.uiButton({ x: 112, y: 394, w: 716, h: 70 }, checkpoint ? 'continue' : 'start', checkpoint ? this.t('menu.continue') : this.t('menu.start'), checkpoint ? () => this.continueFromCheckpoint() : () => this.startRun(), {
      primary: true,
      icon: 'bullet',
      meta: `WAVE ${String(wave).padStart(2, '0')}`,
    });

    if (checkpoint) {
      this.uiButton({ x: 112, y: 478, w: 344, h: 46 }, 'new-run', this.t('menu.newRun'), () => this.startRun(), { icon: '↻' });
      this.uiButton({ x: 468, y: 478, w: 360, h: 46 }, 'delete-save', this.t('menu.deleteSave'), () => this.clearCheckpoint(), { danger: true, icon: '×' });
    } else {
      drawText(this.ctx, 'WASD  •  MOUSE  •  Q  •  SPACE', 112, 497, {
        size: 7.5, color: C.textMuted, weight: 800, align: 'left', direction: 'ltr',
      });
    }

    this.drawRunSnapshot(912, 190, checkpoint);
    const checkpointStatusX = this.rtl() ? 112 : 912;
    const checkpointStatusAlign = this.rtl() ? 'left' : 'right';
    this.localText(checkpoint ? this.t('menu.checkpointReady') : this.t('menu.noCheckpoint'), checkpointStatusX, 474, {
      size: 9, color: checkpoint ? C.green : C.textMuted, weight: 850, align: checkpointStatusAlign,
    });
    if (checkpoint) {
      this.localText(this.t('menu.savedLocally'), checkpointStatusX, 496, {
        size: 7.2, color: C.textMuted, weight: 700, align: checkpointStatusAlign,
      });
    }

    this.drawWorldTimeline(112, 590, 1056, wave);
    drawText(this.ctx, `L ${this.t('controls.language')}   •   M ${this.t('controls.audio')}   •   F ${this.t('controls.fullscreen')}`, WIDTH / 2, 682, {
      size: 6.6, color: C.textMuted, weight: 750, align: 'center', direction: this.rtl() ? 'rtl' : 'ltr',
    });
  }

  drawHudBar(x, y, width, height, value, accent) {
    drawGauge(this.ctx, x, y, width, value, accent, { height });
  }

  drawHud() {
    const ctx = this.ctx;
    const bulletColor = this.bullet.held ? C.amber : this.bullet.recalling ? C.green : C.cyan;
    const recallMax = Math.max(1.15, 3.8 - this.stack('magnetic-recall') * 0.38);
    const recallRatio = this.bullet.held ? 1 : 1 - this.bullet.recallCooldown / recallMax;
    const hpRatio = this.player.maxHealth > 0 ? this.player.health / this.player.maxHealth : 0;
    const dashMax = Math.max(0.36, 1.12 * Math.pow(0.86, this.stack('quick-dash')));
    const dashRatio = 1 - this.player.dashCooldown / dashMax;

    ctx.save();
    ctx.globalAlpha = 0.96;
    drawBulletGlyph(ctx, 34, 31, { color: bulletColor, scale: 0.75 });
    this.localText(this.bullet.held ? this.t('hud.bulletHeld') : this.bullet.recalling ? this.t('hud.bulletReturning') : this.t('hud.bulletField'), 55, 27, {
      size: 8.2, color: bulletColor, weight: 900, align: 'left', direction: this.dir(),
    });
    drawText(ctx, this.bullet.held ? 'READY' : this.bullet.recalling ? 'RETURNING' : 'Q RECALL', 55, 42, {
      size: 6.3, color: C.textMuted, weight: 800, align: 'left', direction: 'ltr',
    });
    drawGauge(ctx, 20, 52, 210, recallRatio, bulletColor, { height: 3 });
    ctx.restore();

    drawText(ctx, `WAVE ${String(this.wave).padStart(2, '0')}`, WIDTH / 2, 29, {
      size: 14, color: C.text, weight: 900, align: 'center', direction: 'ltr',
    });
    this.localText(this.t(`encounter.${this.currentEncounter?.id || 'foundation'}`), WIDTH / 2, 46, {
      size: 7.4, color: C.amber, weight: 800, align: 'center',
    });
    drawText(ctx, `${this.enemies.length}  •  ${this.n(this.score)}`, WIDTH / 2, 59, {
      size: 6.4, color: C.textMuted, weight: 800, align: 'center', direction: 'ltr',
    });

    drawText(ctx, `${this.player.health}/${this.player.maxHealth}`, WIDTH - 24, 27, {
      size: 12, color: hpRatio <= 0.34 ? C.red : C.text, weight: 900, align: 'right', direction: 'ltr',
    });
    this.localText(this.t('stat.health'), WIDTH - 72, 27, {
      size: 7.2, color: C.textMuted, weight: 750, align: 'right',
    });
    drawGauge(ctx, WIDTH - 236, 37, 212, hpRatio, hpRatio <= 0.34 ? C.red : C.green, { height: 4 });
    drawGauge(ctx, WIDTH - 236, 50, 212, dashRatio, C.cyan, { height: 3 });
    this.localText(this.player.shield > 0 ? this.t('hud.shieldActive') : this.t('hud.dashReady'), WIDTH - 24, 62, {
      size: 6.2, color: this.player.shield > 0 ? C.cyan : C.textMuted, weight: 800, align: 'right',
    });

    if (!this.touchMode && this.arenaStage.id >= 4) this.drawMiniMap();
    if (this.state === 'playing' && this.wave === 1 && this.tutorialStep < 3) this.drawTutorial();
  }

  drawMiniMap() {
    const rect = { x: WIDTH - 174, y: 82, w: 150, h: 100 };
    const bounds = this.arenaStage.bounds;
    drawSurface(this.ctx, rect, {
      fill: 'rgba(3,10,16,0.70)', border: 'rgba(105,215,244,0.20)', cut: 7,
    });
    this.localText(this.t('minimap.title'), this.rtl() ? rect.x + rect.w - 10 : rect.x + 10, rect.y + 14, {
      size: 5.8, color: C.textMuted, weight: 850, align: this.rtl() ? 'right' : 'left',
    });

    const inner = { x: rect.x + 10, y: rect.y + 23, w: rect.w - 20, h: rect.h - 32 };
    const scale = Math.min(inner.w / bounds.w, inner.h / bounds.h);
    const mapW = bounds.w * scale;
    const mapH = bounds.h * scale;
    const mapX = inner.x + (inner.w - mapW) / 2;
    const mapY = inner.y + (inner.h - mapH) / 2;
    this.ctx.strokeStyle = 'rgba(105,215,244,0.20)';
    this.ctx.strokeRect(mapX, mapY, mapW, mapH);

    const px = mapX + (this.player.x - bounds.x) * scale;
    const py = mapY + (this.player.y - bounds.y) * scale;
    drawTargetGlyph(this.ctx, px, py, 4.5, C.amber);
    this.ctx.fillStyle = 'rgba(221,102,117,0.42)';
    for (const enemy of this.enemies.slice(0, 18)) {
      const ex = mapX + (enemy.x - bounds.x) * scale;
      const ey = mapY + (enemy.y - bounds.y) * scale;
      this.ctx.fillRect(ex - 1, ey - 1, 2, 2);
    }
  }

  drawTutorial() {
    const copy = this.rtl()
      ? 'WASD  الحركة   •   MOUSE  الإطلاق   •   Q  الاستدعاء   •   SPACE  الاندفاع'
      : 'WASD  MOVE   •   MOUSE  FIRE   •   Q  RECALL   •   SPACE  DASH';
    drawText(this.ctx, copy, 22, HEIGHT - 110, {
      size: 6.8, color: C.textMuted, weight: 800, align: 'left', direction: this.rtl() ? 'rtl' : 'ltr',
    });
  }

  drawTouchControls() {
    const move = TOUCH_LAYOUT.move;
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(105,215,244,0.24)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(move.x, move.y, move.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(move.x, move.y, move.radius * 0.45, 0, Math.PI * 2);
    ctx.stroke();
    if (this.touchMove) {
      const dx = Math.max(-32, Math.min(32, this.touchMove.x - this.touchMove.originX));
      const dy = Math.max(-32, Math.min(32, this.touchMove.y - this.touchMove.originY));
      ctx.fillStyle = 'rgba(105,215,244,0.20)';
      ctx.beginPath();
      ctx.arc(move.x + dx, move.y + dy, 20, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    const radial = (circle, key, textValue, color, action) => {
      const rect = { x: circle.x - circle.radius, y: circle.y - circle.radius, w: circle.radius * 2, h: circle.radius * 2 };
      const hover = this.mixUi(`touch-${key}`, this.menuHover(rect));
      ctx.save();
      ctx.fillStyle = `rgba(3,12,19,${0.62 + hover * 0.14})`;
      ctx.strokeStyle = withAlpha(color, hover > 0.2 ? '88' : '55');
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      this.localText(textValue, circle.x, circle.y + 1, {
        size: 7.2, color, weight: 900, align: 'center', baseline: 'middle',
      });
      ctx.restore();
      this.addUiRegion(rect.x, rect.y, rect.w, rect.h, action);
    };
    radial(TOUCH_LAYOUT.recall, 'recall', this.t('touch.recall'), C.amber, () => this.recallBullet());
    radial(TOUCH_LAYOUT.dash, 'dash', this.t('touch.dash'), C.cyan, () => { this.dashRequested = true; });
    radial(TOUCH_LAYOUT.pause, 'pause', this.t('touch.pause'), C.textSoft, () => this.pause());
  }

  drawModalBackdrop(alpha = 0.64) {
    this.ctx.fillStyle = `rgba(1,5,9,${alpha})`;
    this.ctx.fillRect(0, 0, WIDTH, HEIGHT);
    this.ctx.strokeStyle = 'rgba(105,215,244,0.06)';
    for (let x = -180; x < WIDTH + 180; x += 160) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, HEIGHT);
      this.ctx.lineTo(x + 300, 0);
      this.ctx.stroke();
    }
  }

  drawPause() {
    this.drawModalBackdrop(0.66);
    const blade = { x: 96, y: 106, w: 744, h: 508 };
    const utility = { x: 884, y: 162, w: 296, h: 370 };
    drawSurface(this.ctx, blade, {
      fill: 'rgba(4,12,19,0.94)', border: 'rgba(105,215,244,0.22)', accent: C.cyan, cut: 16,
    });
    drawText(this.ctx, this.t('pause.kicker'), blade.x + 34, blade.y + 42, {
      size: 7.5, color: C.cyan, weight: 900, align: 'left', direction: 'ltr',
    });
    this.localText(this.t('pause.title'), this.rtl() ? blade.x + blade.w - 34 : blade.x + 34, blade.y + 95, {
      size: 30, color: C.text, weight: 900, align: this.rtl() ? 'right' : 'left',
    });
    drawText(this.ctx, `WAVE ${String(this.wave).padStart(2, '0')}`, blade.x + 34, blade.y + 147, {
      size: 22, color: C.amberBright, weight: 900, align: 'left', direction: 'ltr',
    });
    this.localText(this.t(`encounter.${this.currentEncounter?.id || 'foundation'}`), this.rtl() ? blade.x + blade.w - 34 : blade.x + 34, blade.y + 175, {
      size: 9.5, color: C.textSoft, weight: 750, align: this.rtl() ? 'right' : 'left',
    });

    const snapshotY = blade.y + 211;
    const colW = 204;
    const snap = [
      [this.t('stat.score'), this.n(this.score), C.amber],
      [this.t('stat.upgrades'), this.n(this.stats.upgrades), C.cyan],
      [this.t('stat.sector'), this.t(`stage.${Math.min(7, this.arenaStage.id)}`), C.green],
    ];
    snap.forEach(([labelValue, value, accent], index) => {
      const x = blade.x + 34 + index * (colW + 12);
      this.localText(labelValue, x, snapshotY, {
        size: 7.2, color: C.textMuted, weight: 750, align: 'left',
      });
      this.localText(value, x, snapshotY + 29, {
        size: index === 2 ? 12 : 18, color: accent, weight: 900, align: 'left', direction: index === 2 ? this.dir() : 'ltr',
      });
    });

    this.uiButton({ x: blade.x + 34, y: blade.y + 302, w: blade.w - 68, h: 62 }, 'pause-resume', this.t('pause.resume'), () => this.resume(), {
      primary: true, icon: 'bullet',
    });
    this.uiButton({ x: blade.x + 34, y: blade.y + 380, w: 324, h: 48 }, 'pause-new', this.t('pause.newRun'), () => this.startRun(), { icon: '↻' });
    this.uiButton({ x: blade.x + 370, y: blade.y + 380, w: 336, h: 48 }, 'pause-menu', this.t('pause.mainMenu'), () => this.goToMenu(), { icon: '←' });

    drawSurface(this.ctx, utility, {
      fill: 'rgba(4,12,19,0.74)', border: 'rgba(105,215,244,0.16)', cut: 12,
    });
    this.localText(this.t('pause.settings'), this.rtl() ? utility.x + utility.w - 22 : utility.x + 22, utility.y + 34, {
      size: 13, color: C.text, weight: 850, align: this.rtl() ? 'right' : 'left',
    });
    this.utilityChip({ x: utility.x + 22, y: utility.y + 70, w: utility.w - 44, h: 44 }, 'pause-lang', this.rtl() ? 'English' : 'العربية', () => i18n.toggle(), {
      active: true, accent: C.cyan, direction: this.rtl() ? 'ltr' : 'rtl',
    });
    this.utilityChip({ x: utility.x + 22, y: utility.y + 128, w: utility.w - 44, h: 44 }, 'pause-audio', this.audio.settings.muted ? this.t('menu.muted') : this.t('menu.soundOn'), () => this.toggleAudio(), {
      dot: true, active: !this.audio.settings.muted, accent: this.audio.settings.muted ? C.red : C.green, direction: this.dir(),
    });
    this.utilityChip({ x: utility.x + 22, y: utility.y + 186, w: utility.w - 44, h: 44 }, 'pause-full', this.t('menu.fullscreen'), () => this.toggleFullscreen(), {
      direction: this.dir(),
    });
    drawText(this.ctx, 'P / ESC', utility.x + 22, utility.y + 298, {
      size: 8, color: C.cyan, weight: 900, align: 'left', direction: 'ltr',
    });
    this.localText(this.t('pause.resume'), utility.x + utility.w - 22, utility.y + 298, {
      size: 8, color: C.textMuted, weight: 700, align: 'right',
    });
  }

  drawGameOver() {
    const checkpoint = this.hasContinueCheckpoint() ? this.savedCheckpoint : null;
    this.drawModalBackdrop(0.76);
    const x = 148;
    const y = 104;
    drawText(this.ctx, this.t('gameOver.kicker'), x, y, {
      size: 8, color: C.red, weight: 900, align: 'left', direction: 'ltr',
    });
    this.localText(this.t('gameOver.title'), this.rtl() ? WIDTH - x : x, y + 70, {
      size: 44, color: C.text, weight: 900, align: this.rtl() ? 'right' : 'left',
    });
    this.ctx.strokeStyle = 'rgba(221,102,117,0.35)';
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + 96);
    this.ctx.lineTo(WIDTH - x, y + 96);
    this.ctx.stroke();

    const metrics = [
      [this.t('gameOver.waveReached'), String(this.wave).padStart(2, '0'), C.amber],
      [this.t('gameOver.finalScore'), this.n(this.score), C.text],
      [this.t('gameOver.bestScore'), this.n(this.highScore), C.cyan],
      [this.t('stat.upgrades'), this.n(this.stats.upgrades), C.green],
    ];
    metrics.forEach(([labelValue, value, accent], index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const mx = x + col * 360;
      const my = y + 145 + row * 100;
      this.localText(labelValue, this.rtl() ? mx + 300 : mx, my, {
        size: 8, color: C.textMuted, weight: 750, align: this.rtl() ? 'right' : 'left',
      });
      drawText(this.ctx, value, this.rtl() ? mx + 300 : mx, my + 37, {
        size: 25, color: accent, weight: 900, align: this.rtl() ? 'right' : 'left', direction: 'ltr',
      });
    });

    if (checkpoint) {
      this.uiButton({ x, y: y + 357, w: 650, h: 64 }, 'over-continue', this.t('gameOver.continue'), () => this.continueFromCheckpoint(), {
        primary: true, icon: 'bullet', meta: `WAVE ${checkpoint.wave}`,
      });
    } else {
      this.uiButton({ x, y: y + 357, w: 650, h: 64 }, 'over-retry', this.t('gameOver.retry'), () => this.startRun(), {
        primary: true, icon: 'bullet',
      });
    }
    this.uiButton({ x, y: y + 437, w: 315, h: 48 }, 'over-new', this.t('gameOver.retry'), () => this.startRun(), { icon: '↻' });
    this.uiButton({ x: x + 335, y: y + 437, w: 315, h: 48 }, 'over-menu', this.t('gameOver.mainMenu'), () => this.goToMenu(), { icon: '←' });

    drawTargetGlyph(this.ctx, 1025, 315, 72, 'rgba(221,102,117,0.20)');
    drawBulletGlyph(this.ctx, 1025, 315, { color: C.red, scale: 1.5, angle: -0.5 });
  }

  upgradeEffect(upgrade) {
    const current = this.stack(upgrade.id);
    const next = Math.min(upgrade.maxStacks, current + 1);
    const arrow = this.rtl() ? '←' : '→';
    switch (upgrade.id) {
      case 'heavy-shot': return `${(1 + current * 0.35).toFixed(2)}× ${arrow} ${(1 + next * 0.35).toFixed(2)}×`;
      case 'bullet-velocity': return `${current * 7}% ${arrow} ${next * 7}%`;
      case 'extended-ricochet': return `${4 + current * 2} ${arrow} ${4 + next * 2}`;
      case 'hot-ricochet': return `${current * 24}% ${arrow} ${next * 24}%`;
      case 'shock-impact': return `${82 + current * 20} ${arrow} ${82 + next * 20}`;
      case 'magnetic-recall': return `${720 + current * 95} ${arrow} ${720 + next * 95}`;
      case 'recall-strike': return `${current * 30}% ${arrow} ${next * 30}%`;
      case 'quick-dash': return `${Math.max(0.36, 1.12 * Math.pow(0.86, current)).toFixed(2)}s ${arrow} ${Math.max(0.36, 1.12 * Math.pow(0.86, next)).toFixed(2)}s`;
      case 'swift-steps': return `${current * 7}% ${arrow} ${next * 7}%`;
      case 'vitality': return `${3 + current} ${arrow} ${3 + next}`;
      case 'wave-shield': return this.t('upgrade.wave-shield.description');
      case 'second-chance': return this.t('upgrade.second-chance.description');
      default: return this.t('upgrade.level', { current, next });
    }
  }

  drawUpgradeSelection() {
    this.drawModalBackdrop(0.62);
    drawText(this.ctx, this.t('upgrade.kicker'), WIDTH / 2, 42, {
      size: 8, color: C.cyan, weight: 900, align: 'center', direction: 'ltr',
    });
    this.localText(this.t('upgrade.title'), WIDTH / 2, 80, {
      size: 28, color: C.text, weight: 900, align: 'center',
    });
    this.localText(this.t('upgrade.subtitle'), WIDTH / 2, 104, {
      size: 9.2, color: C.textMuted, weight: 700, align: 'center',
    });

    const cardW = 350;
    const cardH = 430;
    const gap = 22;
    const total = this.upgradeChoices.length * cardW + (this.upgradeChoices.length - 1) * gap;
    const startX = WIDTH / 2 - total / 2;
    const y = 132;

    this.upgradeChoices.forEach((upgrade, index) => {
      const rect = { x: startX + index * (cardW + gap), y, w: cardW, h: cardH };
      const hover = this.mixUi(`upgrade-${index}`, this.menuHover(rect), 0.22);
      const accent = index === 1 ? C.amber : index === 2 ? C.green : C.cyan;
      const lift = this.reducedMotion ? 0 : hover * 4;
      const r = { ...rect, y: rect.y - lift };
      drawSurface(this.ctx, r, {
        fill: hover > 0.02 ? 'rgba(8,23,32,0.97)' : 'rgba(4,13,20,0.96)',
        border: hover > 0.02 ? withAlpha(accent, '88') : 'rgba(116,166,187,0.22)',
        accent,
        cut: 14,
      });

      drawText(this.ctx, `0${index + 1}`, r.x + 24, r.y + 34, {
        size: 9, color: accent, weight: 900, align: 'left', direction: 'ltr',
      });
      drawTargetGlyph(this.ctx, r.x + r.w - 42, r.y + 40, 13, withAlpha(accent, 'AA'));
      this.localText(this.t(`upgrade.${upgrade.id}.tag`), this.rtl() ? r.x + r.w - 28 : r.x + 28, r.y + 86, {
        size: 7.2, color: accent, weight: 900, align: this.rtl() ? 'right' : 'left',
      });
      this.localText(this.t(`upgrade.${upgrade.id}.name`), this.rtl() ? r.x + r.w - 28 : r.x + 28, r.y + 126, {
        size: 20, color: C.text, weight: 900, align: this.rtl() ? 'right' : 'left',
      });
      wrapText(this.ctx, i18n, this.t(`upgrade.${upgrade.id}.description`), this.rtl() ? r.x + r.w - 28 : r.x + 28, r.y + 162, r.w - 56, {
        size: 10.5, lineHeight: 18, color: C.textSoft, weight: 650, maxLines: 4, align: this.rtl() ? 'right' : 'left',
      });

      this.ctx.fillStyle = 'rgba(255,255,255,0.06)';
      this.ctx.fillRect(r.x + 28, r.y + 250, r.w - 56, 1);
      this.localText(this.t('upgrade.after'), this.rtl() ? r.x + r.w - 28 : r.x + 28, r.y + 282, {
        size: 7.2, color: C.textMuted, weight: 750, align: this.rtl() ? 'right' : 'left',
      });
      this.localText(this.upgradeEffect(upgrade), this.rtl() ? r.x + r.w - 28 : r.x + 28, r.y + 318, {
        size: 13.5, color: accent, weight: 900, align: this.rtl() ? 'right' : 'left', direction: this.rtl() ? 'rtl' : 'ltr', maxWidth: r.w - 56,
      });
      drawGauge(this.ctx, r.x + 28, r.y + 345, r.w - 56, upgrade.maxStacks ? this.stack(upgrade.id) / upgrade.maxStacks : 0, accent, { height: 4 });
      drawText(this.ctx, `${this.stack(upgrade.id)} / ${upgrade.maxStacks}`, r.x + 28, r.y + 375, {
        size: 7, color: C.textMuted, weight: 800, align: 'left', direction: 'ltr',
      });
      drawText(this.ctx, `[${index + 1}]`, r.x + r.w - 28, r.y + 375, {
        size: 8, color: hover > 0.02 ? accent : C.textMuted, weight: 900, align: 'right', direction: 'ltr',
      });
      this.localText(this.t('upgrade.select'), this.rtl() ? r.x + 28 : r.x + r.w - 28, r.y + 406, {
        size: 8, color: hover > 0.02 ? accent : C.textMuted, weight: 850, align: this.rtl() ? 'left' : 'right',
      });
      this.addUiRegion(rect.x, rect.y - 6, rect.w, rect.h + 12, () => this.chooseUpgrade(index));
    });
  }

  drawBanner() {
    if (!this.banner) return;
    const alpha = clamp01(this.banner.time * 1.6);
    const expanded = /مساحة|opened|sector/i.test(String(this.banner.subtitle || ''));
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    const y = HEIGHT / 2 - 48;
    this.ctx.strokeStyle = expanded ? withAlpha(C.green, '55') : withAlpha(C.amber, '55');
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(330, y);
    this.ctx.lineTo(950, y);
    this.ctx.stroke();
    drawBulletGlyph(this.ctx, WIDTH / 2, y, {
      color: expanded ? C.green : C.amber, scale: 0.65,
    });
    this.localText(expanded ? this.t('wave.sectorUnlocked') : this.t('wave.incoming', { wave: this.wave }), WIDTH / 2, y + 55, {
      size: expanded ? 22 : 34, color: C.text, weight: 900, align: 'center',
    });
    this.localText(expanded ? this.t(`stage.${Math.min(7, this.arenaStage.id)}`) : this.t(`encounter.${this.currentEncounter?.id || 'foundation'}`), WIDTH / 2, y + 82, {
      size: 9, color: expanded ? C.green : C.amber, weight: 800, align: 'center',
    });
    this.ctx.restore();
  }
}

export const OneBulletUiRepairRuntime = OneBulletGlobalUiRuntime;
