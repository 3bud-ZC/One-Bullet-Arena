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
  drawUiIcon,
  drawTrajectoryBackground,
  wrapText,
} from '../ui-system.js';
import { OneBulletProductionArtRuntime } from './production-art-runtime.js';

export const GLOBAL_UI_RUNTIME_VERSION = '3.6.2-dashboard-command';
export const GLOBAL_UI_REVISION = 'dashboard-reference-v2';
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
    this.upgradeFocusIndex = 0;
    this.menuSettingsOpen = false;
    this.menuSettingsOpen = false;
    window.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      if (key === 'l' && ['menu', 'paused'].includes(this.state)) {
        i18n.toggle();
        return;
      }
      if (this.state !== 'upgrade' || this.upgradeChoices.length === 0) return;
      if (key === 'arrowleft' || key === 'arrowright') {
        const delta = key === 'arrowright' ? 1 : -1;
        this.upgradeFocusIndex = (this.upgradeFocusIndex + delta + this.upgradeChoices.length) % this.upgradeChoices.length;
        event.preventDefault();
      } else if (key === 'enter') {
        this.chooseUpgrade(Math.min(this.upgradeChoices.length - 1, this.upgradeFocusIndex));
        event.preventDefault();
      }
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
      uiDensity: 'production-refined',
      visualRefinementActive: true,
      responsiveHudRefinement: true,
      semanticUpgradeDirection: 'current-to-new',
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
    if (state === 'upgrade') this.upgradeFocusIndex = 0;
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
    const hover = this.mixUi(key, hovered, 0.2);
    const sweep = this.reducedMotion ? 0 : ((this.elapsed * 0.18) % 1);
    drawButton(this.ctx, rect, {
      ...options,
      hover,
      sweep,
      focused: Boolean(options.focused),
      pressed: Boolean(options.pressed),
    });

    const iconName = options.icon || null;
    const iconX = this.rtl() ? rect.x + rect.w - 32 : rect.x + 32;
    if (iconName) {
      drawUiIcon(this.ctx, iconName, iconX, rect.y + rect.h / 2, {
        color: options.danger ? C.red : options.primary ? C.amberBright : C.cyanBright,
        scale: options.primary ? 0.88 : 0.78,
        active: options.active,
      });
    }

    const textX = this.rtl()
      ? rect.x + rect.w - (iconName ? 56 : 20)
      : rect.x + (iconName ? 56 : 20);
    this.localText(textValue, textX, rect.y + rect.h / 2 + 1, {
      size: options.primary ? 14.5 : 10.5,
      color: options.danger ? C.red : options.primary ? C.amberBright : C.text,
      weight: options.primary ? 900 : 800,
      align: this.rtl() ? 'right' : 'left',
      baseline: 'middle',
    });

    if (options.meta) {
      drawText(this.ctx, options.meta, this.rtl() ? rect.x + 18 : rect.x + rect.w - 18, rect.y + rect.h / 2 + 1, {
        size: 7.8,
        color: options.primary ? C.amber : C.textSoft,
        weight: 900,
        align: this.rtl() ? 'left' : 'right',
        baseline: 'middle',
        direction: 'ltr',
      });
    }
    this.addUiRegion(rect.x, rect.y, rect.w, rect.h, action);
  }

  utilityChip(rect, key, textValue, action, options = {}) {
    const hover = this.mixUi(key, this.menuHover(rect), 0.22);
    const active = options.active ?? false;
    const accent = options.accent || C.cyan;
    const rtl = Boolean(options.rtl);
    drawSurface(this.ctx, rect, {
      fill: `rgba(4,14,22,${0.76 + hover * 0.08})`,
      border: active ? withAlpha(accent, '62') : `rgba(115,184,210,${0.18 + hover * 0.16})`,
      cut: 7,
      accent: hover > 0.12 ? accent : null,
    });
    const iconX = rtl ? rect.x + rect.w - 17 : rect.x + 17;
    if (options.icon) {
      drawUiIcon(this.ctx, options.icon, iconX, rect.y + rect.h / 2, {
        color: active ? accent : C.textSoft,
        scale: 0.60,
        active: options.icon !== 'audio' || !this.audio.settings.muted,
      });
    }
    const textX = rtl ? rect.x + rect.w - (options.icon ? 32 : 12) : rect.x + (options.icon ? 32 : 12);
    this.localText(textValue, textX, rect.y + rect.h / 2 + 1, {
      size: 7.4,
      color: active ? (options.accent || C.cyanBright) : C.textSoft,
      weight: 850,
      align: rtl ? 'right' : 'left',
      baseline: 'middle',
      direction: options.direction || this.dir(),
    });
    this.addUiRegion(rect.x, rect.y, rect.w, rect.h, action);
  }

  languageSelector(rect, key = 'lang') {
    const hover = this.mixUi(key, this.menuHover(rect), 0.22);
    drawSurface(this.ctx, rect, {
      fill: `rgba(6,17,25,${0.74 + hover * 0.08})`,
      border: `rgba(105,215,244,${0.24 + hover * 0.16})`,
      cut: 8,
    });
    drawUiIcon(this.ctx, 'language', rect.x + 18, rect.y + rect.h / 2, { color: C.cyan, scale: 0.62 });
    this.localText(this.t('menu.language'), rect.x + 34, rect.y + rect.h / 2 + 1, {
      size: 7.4,
      color: C.textSoft,
      weight: 800,
      align: 'left',
      baseline: 'middle',
      direction: this.dir(),
    });

    const segW = 34;
    const gap = 4;
    const enX = rect.x + rect.w - segW;
    const arX = enX - gap - segW;
    const drawLocale = (code, x) => {
      const active = i18n.locale === code.toLowerCase();
      const segment = { x, y: rect.y + 5, w: segW, h: rect.h - 10 };
      if (active) {
        drawSurface(this.ctx, segment, {
          fill: withAlpha(C.cyan, '18'),
          border: withAlpha(C.cyan, '66'),
          cut: 5,
        });
      }
      drawText(this.ctx, code, x + segW / 2, rect.y + rect.h / 2 + 1, {
        size: 7.5,
        color: active ? C.cyanBright : C.textMuted,
        weight: 900,
        align: 'center',
        baseline: 'middle',
        direction: 'ltr',
      });
      this.addUiRegion(segment.x, segment.y, segment.w, segment.h, () => i18n.setLocale(code.toLowerCase()));
    };
    drawLocale('AR', arX);
    drawLocale('EN', enX);
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
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(83,205,245,0.055)';
    ctx.lineWidth = 1;
    const horizon = 112;
    for (let i = 0; i < 4; i += 1) {
      const inset = 26 + i * 18;
      angularPath(ctx, inset, horizon + i * 7, WIDTH - inset * 2, HEIGHT - horizon - 46 - i * 12, 22);
      ctx.globalAlpha = 0.45 - i * 0.08;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const scanX = this.reducedMotion ? WIDTH * 0.54 : ((this.elapsed * 22) % (WIDTH + 260)) - 130;
    const scan = ctx.createLinearGradient(scanX - 90, 0, scanX + 90, 0);
    scan.addColorStop(0, 'rgba(83,205,245,0)');
    scan.addColorStop(0.5, 'rgba(83,205,245,0.028)');
    scan.addColorStop(1, 'rgba(83,205,245,0)');
    ctx.fillStyle = scan;
    ctx.fillRect(0, 106, WIDTH, HEIGHT - 106);
    ctx.restore();
  }

  drawTopUtility() {
    const rtl = this.rtl();
    const markX = rtl ? WIDTH - 62 : 62;
    const textX = rtl ? WIDTH - 106 : 106;
    const align = rtl ? 'right' : 'left';
    const ctx = this.ctx;

    ctx.save();
    ctx.strokeStyle = 'rgba(83,205,245,0.72)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const a = Math.PI / 3 * i - Math.PI / 6;
      const x = markX + Math.cos(a) * 24;
      const y = 52 + Math.sin(a) * 24;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    drawTargetGlyph(ctx, markX, 52, 13, C.cyan);
    drawBulletGlyph(ctx, markX, 52, { color: C.amberBright, scale: 0.42, angle: -Math.PI / 2 });
    ctx.restore();

    drawText(ctx, this.t('brand.name'), textX, 39, {
      size: 17.5, color: C.text, weight: 900, align, direction: 'ltr',
    });
    this.localText(this.t('brand.shortMantra'), textX, 61, {
      size: 7.4, color: C.cyan, weight: 820, align,
    });
    drawText(ctx, `v${RELEASE_VERSION}`, textX, 78, {
      size: 6.4, color: C.textMuted, weight: 760, align, direction: 'ltr',
    });

    const totalW = 494;
    const start = rtl ? 54 : WIDTH - 54 - totalW;
    this.languageSelector({ x: start, y: 31, w: 148, h: 38 }, 'top-language');
    this.utilityChip(
      { x: start + 156, y: 31, w: 102, h: 38 },
      'top-audio',
      this.audio.settings.muted ? this.t('menu.muted') : this.t('menu.audio'),
      () => this.toggleAudio(),
      { icon: 'audio', active: !this.audio.settings.muted, accent: this.audio.settings.muted ? C.red : C.green, rtl, direction: this.dir() },
    );
    this.utilityChip(
      { x: start + 266, y: 31, w: 118, h: 38 },
      'top-fullscreen',
      this.t('menu.fullscreen'),
      () => this.toggleFullscreen(),
      { icon: 'fullscreen', rtl, direction: this.dir() },
    );
    this.utilityChip(
      { x: start + 392, y: 31, w: 102, h: 38 },
      'top-settings',
      this.t('menu.settings'),
      () => { this.menuSettingsOpen = !this.menuSettingsOpen; },
      { icon: 'settings', active: this.menuSettingsOpen, rtl, direction: this.dir() },
    );

    ctx.strokeStyle = 'rgba(116,188,216,0.14)';
    ctx.beginPath();
    ctx.moveTo(54, 100);
    ctx.lineTo(WIDTH - 54, 100);
    ctx.stroke();
  }

  drawMenuSettingsPanel() {
    if (!this.menuSettingsOpen) return;
    const rtl = this.rtl();
    const rect = rtl ? { x: 54, y: 78, w: 302, h: 86 } : { x: WIDTH - 356, y: 78, w: 302, h: 86 };
    drawSurface(this.ctx, rect, {
      fill: 'rgba(3,12,19,0.96)',
      border: 'rgba(83,205,245,0.28)',
      cut: 9,
      accent: C.cyan,
    });
    const x = rtl ? rect.x + rect.w - 18 : rect.x + 18;
    this.localText(this.t('menu.settings'), x, rect.y + 23, {
      size: 8.4, color: C.text, weight: 900, align: rtl ? 'right' : 'left',
    });
    this.localText(`${this.t('controls.move')}  •  ${this.t('controls.fire')}  •  ${this.t('controls.recall')}  •  ${this.t('controls.dash')}`,
      x, rect.y + 46, { size: 7.1, color: C.textSoft, weight: 730, align: rtl ? 'right' : 'left' });
    drawText(this.ctx, 'WASD  •  MOUSE  •  Q  •  SPACE', x, rect.y + 67, {
      size: 6.8, color: C.textMuted, weight: 820, align: rtl ? 'right' : 'left', direction: 'ltr',
    });
  }

  drawRunRadar(cx, cy, radius, wave, stage) {
    const ctx = this.ctx;
    const pulse = this.reducedMotion ? 0 : (Math.sin(this.elapsed * 2.2) + 1) * 0.5;
    const scanner = this.reducedMotion ? -0.9 : this.elapsed * 0.48;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineWidth = 1;
    for (let ring = 1; ring <= 5; ring += 1) {
      const r = radius * (ring / 5);
      ctx.strokeStyle = `rgba(83,205,245,${0.055 + ring * 0.018})`;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(83,205,245,0.20)';
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.moveTo(-radius - 16, 0); ctx.lineTo(radius + 16, 0);
    ctx.moveTo(0, -radius - 16); ctx.lineTo(0, radius + 16);
    ctx.stroke();
    ctx.setLineDash([]);

    const sides = 6;
    for (let layer = 0; layer < 3; layer += 1) {
      const r = 24 + layer * 15;
      ctx.strokeStyle = `rgba(83,205,245,${0.26 - layer * 0.05})`;
      ctx.beginPath();
      for (let i = 0; i <= sides; i += 1) {
        const a = Math.PI / 3 * i - Math.PI / 6;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(240,189,77,0.58)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius - 5, scanner, scanner + 0.48);
    ctx.stroke();
    ctx.fillStyle = `rgba(240,189,77,${0.55 + pulse * 0.20})`;
    ctx.beginPath();
    ctx.arc(Math.cos(scanner + 0.48) * (radius - 5), Math.sin(scanner + 0.48) * (radius - 5), 3.2, 0, Math.PI * 2);
    ctx.fill();

    const markerCount = Math.min(9, 4 + stage);
    for (let i = 0; i < markerCount; i += 1) {
      const angle = ((wave * 0.61 + i * 2.13) % 6.283) - Math.PI;
      const rr = radius * (0.40 + ((wave * (i + 3) * 17) % 46) / 100);
      const mx = Math.cos(angle) * rr;
      const my = Math.sin(angle) * rr;
      ctx.fillStyle = i === markerCount - 1 ? C.amberBright : 'rgba(238,100,118,0.78)';
      ctx.beginPath();
      ctx.arc(mx, my, i === markerCount - 1 ? 3 : 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    drawTargetGlyph(ctx, cx, cy, 7, C.cyanBright);
  }

  drawRunSnapshot(rect, checkpoint) {
    const wave = checkpoint?.wave || 1;
    const stats = checkpoint?.stats || { upgrades: 0 };
    const score = checkpoint?.score || 0;
    const sector = stageIndexForWave(wave);
    const entries = [
      [this.t('stat.wave'), String(wave).padStart(2, '0'), C.cyanBright, 'wave', false],
      [this.t('stat.score'), this.n(score), C.amberBright, 'score', false],
      [this.t('stat.upgrades'), this.n(stats.upgrades || 0), C.cyanBright, 'upgrade', false],
      [this.t('stat.bestWave'), this.n(this.highWave), C.cyan, 'wave', false],
      [this.t('stat.highScore'), this.n(this.highScore), C.amber, 'score', false],
      [this.t('stat.sector'), this.t(`stage.${sector}`), C.green, 'sector', true],
    ];

    drawSurface(this.ctx, rect, {
      fill: 'rgba(3,12,19,0.82)',
      border: 'rgba(83,205,245,0.24)',
      cut: 13,
      accent: C.cyan,
    });
    const titleX = this.rtl() ? rect.x + rect.w - 24 : rect.x + 24;
    this.localText(this.t('menu.runSnapshot'), titleX, rect.y + 34, {
      size: 12.5, color: C.cyanBright, weight: 900, align: this.rtl() ? 'right' : 'left',
    });
    this.ctx.fillStyle = 'rgba(83,205,245,0.11)';
    this.ctx.fillRect(rect.x + 22, rect.y + 51, rect.w - 44, 1);

    const rowY = rect.y + 70;
    const rowH = 48;
    entries.forEach(([labelValue, value, accent, icon, localized], index) => {
      const y = rowY + index * rowH;
      if (index > 0) {
        this.ctx.fillStyle = 'rgba(255,255,255,0.055)';
        this.ctx.fillRect(rect.x + 22, y - 18, rect.w - 44, 1);
      }
      const iconX = this.rtl() ? rect.x + rect.w - 31 : rect.x + 31;
      drawUiIcon(this.ctx, icon, iconX, y, { color: accent, scale: 0.54, alpha: 0.94 });
      this.localText(labelValue, this.rtl() ? rect.x + rect.w - 52 : rect.x + 52, y + 4, {
        size: 8.3, color: C.textSoft, weight: 760, align: this.rtl() ? 'right' : 'left',
      });
      const valueX = this.rtl() ? rect.x + 22 : rect.x + rect.w - 22;
      if (localized) {
        this.localText(value, valueX, y + 4, { size: 10.6, color: accent, weight: 900, align: this.rtl() ? 'left' : 'right' });
      } else {
        drawText(this.ctx, value, valueX, y + 4, { size: index === 1 || index === 4 ? 13.5 : 12.5, color: accent, weight: 900, align: this.rtl() ? 'left' : 'right', direction: 'ltr' });
      }
    });

    const status = { x: rect.x + 20, y: rect.y + rect.h - 48, w: rect.w - 40, h: 30 };
    drawSurface(this.ctx, status, {
      fill: checkpoint ? 'rgba(41,104,80,0.16)' : 'rgba(255,255,255,0.025)',
      border: checkpoint ? 'rgba(85,224,176,0.28)' : 'rgba(255,255,255,0.06)',
      cut: 6,
    });
    drawUiIcon(this.ctx, 'checkpoint', this.rtl() ? status.x + status.w - 18 : status.x + 18, status.y + status.h / 2, {
      color: checkpoint ? C.green : C.textMuted, scale: 0.46,
    });
    this.localText(checkpoint ? this.t('menu.checkpointReady') : this.t('menu.noCheckpoint'),
      this.rtl() ? status.x + status.w - 34 : status.x + 34, status.y + 19,
      { size: 7.6, color: checkpoint ? C.green : C.textMuted, weight: 850, align: this.rtl() ? 'right' : 'left' });
  }

  drawWorldTimeline(rect, wave) {
    const stage = stageIndexForWave(wave);
    const rtl = this.rtl();
    const railX = rect.x + 112;
    const railW = rect.w - 290;
    const nodeGap = railW / (STAGE_WAVES.length - 1);
    const y = rect.y + 60;

    drawSurface(this.ctx, rect, {
      fill: 'rgba(3,12,19,0.72)',
      border: 'rgba(83,205,245,0.18)',
      cut: 11,
      accent: C.cyan,
    });
    const leftX = rtl ? rect.x + rect.w - 28 : rect.x + 28;
    this.localText(this.t('menu.worldProgress'), leftX, rect.y + 25, {
      size: 9.3, color: C.cyanBright, weight: 900, align: rtl ? 'right' : 'left',
    });
    const stageLabelX = rtl ? rect.x + 28 : rect.x + rect.w - 28;
    this.localText(this.t(`stage.${stage}`), stageLabelX, rect.y + 25, {
      size: 9.3, color: C.amberBright, weight: 900, align: rtl ? 'left' : 'right',
    });

    const nodeX = (index) => rtl ? railX + railW - index * nodeGap : railX + index * nodeGap;
    const startX = nodeX(0);
    const currentX = nodeX(stage);
    const endX = nodeX(STAGE_WAVES.length - 1);
    this.ctx.lineWidth = 3;
    this.ctx.strokeStyle = 'rgba(102,130,143,0.20)';
    this.ctx.beginPath(); this.ctx.moveTo(startX, y); this.ctx.lineTo(endX, y); this.ctx.stroke();
    this.ctx.strokeStyle = 'rgba(83,205,245,0.62)';
    this.ctx.beginPath(); this.ctx.moveTo(startX, y); this.ctx.lineTo(currentX, y); this.ctx.stroke();

    for (let index = 0; index < STAGE_WAVES.length; index += 1) {
      const x = nodeX(index);
      const completed = index < stage;
      const current = index === stage;
      const future = index > stage;
      const accent = current ? C.amberBright : completed ? C.cyanBright : C.textMuted;
      if (current && !this.reducedMotion) {
        this.ctx.save();
        this.ctx.globalAlpha = 0.08 + (Math.sin(this.elapsed * 4) + 1) * 0.05;
        this.ctx.fillStyle = C.amber;
        this.ctx.beginPath(); this.ctx.arc(x, y, 18, 0, Math.PI * 2); this.ctx.fill();
        this.ctx.restore();
      }
      drawTargetGlyph(this.ctx, x, y, current ? 10 : 8, future ? 'rgba(113,137,149,0.34)' : accent);
      if (completed) drawUiIcon(this.ctx, 'check', x, y, { color: C.cyanBright, scale: 0.42 });
      else if (current) drawUiIcon(this.ctx, 'sector', x, y, { color: C.amberBright, scale: 0.38 });
      else {
        this.ctx.fillStyle = 'rgba(113,137,149,0.42)';
        this.ctx.beginPath(); this.ctx.arc(x, y, 2.2, 0, Math.PI * 2); this.ctx.fill();
      }
      drawText(this.ctx, String(index + 1).padStart(2, '0'), x, y + 29, {
        size: current ? 8.5 : 7, color: current ? C.amberBright : completed ? C.cyan : C.textMuted,
        weight: 900, align: 'center', direction: 'ltr',
      });
    }

    const next = stage >= STAGE_WAVES.length - 1 ? null : STAGE_WAVES[stage + 1];
    if (next) {
      const captionX = rtl ? rect.x + 28 : rect.x + rect.w - 28;
      drawText(this.ctx, `WAVE ${next}`, captionX, rect.y + rect.h - 16, {
        size: 6.8, color: C.textMuted, weight: 820, align: rtl ? 'left' : 'right', direction: 'ltr',
      });
    }
  }

  drawMenu() {
    const checkpoint = this.hasContinueCheckpoint() ? this.savedCheckpoint : null;
    const wave = checkpoint?.wave || 1;
    const sector = stageIndexForWave(wave);
    const rtl = this.rtl();

    this.drawGlobalBackground();
    this.drawTopUtility();

    const hero = rtl ? { x: 430, y: 128, w: 794, h: 424 } : { x: 56, y: 128, w: 794, h: 424 };
    const summary = rtl ? { x: 56, y: 128, w: 350, h: 424 } : { x: 874, y: 128, w: 350, h: 424 };
    const accent = checkpoint ? C.amber : C.cyan;
    drawSurface(this.ctx, hero, {
      fill: 'rgba(3,12,19,0.78)',
      border: withAlpha(accent, '38'),
      cut: 15,
      accent,
    });

    const leftPad = 44;
    const textX = rtl ? hero.x + hero.w - leftPad : hero.x + leftPad;
    const textAlign = rtl ? 'right' : 'left';
    const radarX = rtl ? hero.x + 268 : hero.x + hero.w - 278;
    const radarY = hero.y + 154;
    this.drawRunRadar(radarX, radarY, 102, wave, sector);

    this.localText(checkpoint ? this.t('menu.currentRun') : this.t('menu.freshRun'), textX, hero.y + 38, {
      size: 9.2, color: C.cyanBright, weight: 900, align: textAlign,
    });
    this.localText(this.t(`stage.${sector}`), textX, hero.y + 76, {
      size: 18, color: C.text, weight: 900, align: textAlign,
    });
    drawText(this.ctx, `SECTOR ${String(sector + 1).padStart(2, '0')}`, textX, hero.y + 96, {
      size: 7, color: C.cyan, weight: 850, align: textAlign, direction: 'ltr',
    });
    drawText(this.ctx, String(wave).padStart(2, '0'), textX, hero.y + 190, {
      size: 76, color: checkpoint ? C.amberBright : C.cyanBright, weight: 900, align: textAlign, direction: 'ltr',
    });
    this.localText(this.t('stat.wave'), textX, hero.y + 216, {
      size: 9.2, color: C.textSoft, weight: 850, align: textAlign,
    });

    const strip = { x: hero.x + 40, y: hero.y + 234, w: hero.w - 80, h: 56 };
    drawSurface(this.ctx, strip, {
      fill: 'rgba(1,7,12,0.64)', border: 'rgba(255,255,255,0.08)', cut: 8,
    });
    const statData = [
      [this.t('stat.score'), this.n(checkpoint?.score || 0), C.amberBright, 'score', false],
      [this.t('stat.upgrades'), this.n(checkpoint?.stats?.upgrades || 0), C.cyanBright, 'upgrade', false],
      [this.t('stat.checkpoint'), checkpoint ? this.t('stat.ready') : this.t('stat.empty'), checkpoint ? C.green : C.textMuted, 'checkpoint', true],
    ];
    statData.forEach(([label, value, color, icon, localized], index) => {
      const colW = strip.w / 3;
      const baseX = strip.x + index * colW;
      if (index > 0) {
        this.ctx.fillStyle = 'rgba(255,255,255,0.08)';
        this.ctx.fillRect(baseX, strip.y + 12, 1, strip.h - 24);
      }
      const iconX = baseX + 28;
      drawUiIcon(this.ctx, icon, iconX, strip.y + strip.h / 2, { color, scale: 0.58 });
      this.localText(label, baseX + 50, strip.y + 21, { size: 7.2, color: C.textMuted, weight: 760, align: 'left' });
      if (localized) this.localText(value, baseX + 50, strip.y + 42, { size: 11.2, color, weight: 900, align: 'left' });
      else drawText(this.ctx, value, baseX + 50, strip.y + 43, { size: 13.8, color, weight: 900, align: 'left', direction: 'ltr' });
    });

    const primary = { x: hero.x + 82, y: hero.y + 306, w: hero.w - 164, h: 58 };
    this.uiButton(primary, checkpoint ? 'continue' : 'start', checkpoint ? this.t('menu.continue') : this.t('menu.start'),
      checkpoint ? () => this.continueFromCheckpoint() : () => this.startRun(),
      { primary: true, icon: 'bullet', meta: `WAVE ${String(wave).padStart(2, '0')}` });

    if (checkpoint) {
      const secondaryY = hero.y + 376;
      const gap = 18;
      const w = (primary.w - gap) / 2;
      this.uiButton({ x: primary.x, y: secondaryY, w, h: 42 }, 'new-run', this.t('menu.newRun'), () => this.startRun(), { icon: 'restart' });
      this.uiButton({ x: primary.x + w + gap, y: secondaryY, w, h: 42 }, 'delete-save', this.t('menu.deleteSave'), () => this.clearCheckpoint(), { danger: true, icon: 'checkpoint' });
    } else {
      drawText(this.ctx, 'WASD  •  MOUSE  •  Q  •  SPACE', hero.x + hero.w / 2, hero.y + 401, {
        size: 7, color: C.textMuted, weight: 820, align: 'center', direction: 'ltr',
      });
    }

    this.drawRunSnapshot(summary, checkpoint);
    this.drawWorldTimeline({ x: 56, y: 568, w: 1168, h: 104 }, wave);

    const saveRect = rtl ? { x: WIDTH - 192, y: 684, w: 136, h: 24 } : { x: 56, y: 684, w: 136, h: 24 };
    drawSurface(this.ctx, saveRect, {
      fill: checkpoint ? 'rgba(41,104,80,0.13)' : 'rgba(255,255,255,0.02)',
      border: checkpoint ? 'rgba(85,224,176,0.24)' : 'rgba(255,255,255,0.05)', cut: 6,
    });
    drawUiIcon(this.ctx, checkpoint ? 'check' : 'bullet', rtl ? saveRect.x + saveRect.w - 14 : saveRect.x + 14, saveRect.y + 12, {
      color: checkpoint ? C.green : C.textMuted, scale: 0.38,
    });
    this.localText(checkpoint ? this.t('menu.savedLocally') : this.t('brand.shortMantra'),
      rtl ? saveRect.x + saveRect.w - 28 : saveRect.x + 28, saveRect.y + 15,
      { size: 6.4, color: checkpoint ? C.green : C.textMuted, weight: 820, align: rtl ? 'right' : 'left' });

    this.drawMenuSettingsPanel();
  }

  drawPlayer() {
    if (this.player.invulnerability > 0 && Math.floor(this.elapsed * 18) % 2 === 0) {
      super.drawPlayer();
      return;
    }
    super.drawPlayer();
    const dx = this.pointer.x - this.player.x;
    const dy = this.pointer.y - this.player.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = dx / length;
    const ny = dy / length;
    const dashMax = Math.max(0.36, 1.12 * Math.pow(0.86, this.stack('quick-dash')));
    const dashReady = this.player.dashCooldown <= 0.01;

    this.ctx.save();
    this.ctx.strokeStyle = dashReady ? 'rgba(105,215,244,0.72)' : 'rgba(105,215,244,0.28)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(this.player.x + nx * (this.player.radius + 14), this.player.y + ny * (this.player.radius + 14));
    this.ctx.lineTo(this.player.x + nx * (this.player.radius + 24), this.player.y + ny * (this.player.radius + 24));
    this.ctx.stroke();
    if (dashReady) {
      const readyAlpha = this.reducedMotion ? 0.34 : 0.24 + (Math.sin(this.elapsed * 5) + 1) * 0.06;
      this.ctx.globalAlpha = readyAlpha;
      this.ctx.strokeStyle = C.cyan;
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.arc(this.player.x, this.player.y, this.player.radius + 20, -0.45, 0.45);
      this.ctx.stroke();
    } else if (dashMax > 0) {
      this.ctx.globalAlpha = 0.18;
    }
    this.ctx.restore();
  }

  drawBullet() {
    super.drawBullet();
    if (this.bullet.held) return;
    const speed = Math.hypot(this.bullet.vx || 0, this.bullet.vy || 0);
    if (speed <= 1) return;
    const nx = this.bullet.vx / speed;
    const ny = this.bullet.vy / speed;
    const accent = this.bullet.recalling ? C.green : C.amberBright;
    this.ctx.save();
    this.ctx.strokeStyle = accent;
    this.ctx.lineWidth = 2;
    this.ctx.globalAlpha = 0.9;
    this.ctx.beginPath();
    this.ctx.moveTo(this.bullet.x - nx * 20, this.bullet.y - ny * 20);
    this.ctx.lineTo(this.bullet.x - nx * 8, this.bullet.y - ny * 8);
    this.ctx.stroke();
    this.ctx.fillStyle = '#fffdf0';
    this.ctx.beginPath();
    this.ctx.arc(this.bullet.x, this.bullet.y, 2.4, 0, Math.PI * 2);
    this.ctx.fill();
    if (this.bullet.recalling) {
      this.ctx.strokeStyle = withAlpha(C.green, '88');
      this.ctx.setLineDash([3, 4]);
      this.ctx.lineDashOffset = this.reducedMotion ? 0 : -this.elapsed * 18;
      this.ctx.beginPath();
      this.ctx.arc(this.bullet.x, this.bullet.y, 21, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    this.ctx.restore();
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
    const critical = hpRatio <= 0.34;
    const dashMax = Math.max(0.36, 1.12 * Math.pow(0.86, this.stack('quick-dash')));
    const dashRatio = clamp01(1 - this.player.dashCooldown / dashMax);
    const pulse = this.reducedMotion ? 0 : (Math.sin(this.elapsed * 7) + 1) * 0.5;

    const left = { x: 18, y: 14, w: 286, h: 64 };
    const center = { x: WIDTH / 2 - 150, y: 14, w: 300, h: 66 };
    const right = { x: WIDTH - 322, y: 14, w: 304, h: 66 };

    const hudPlate = (rect, accent, alpha = 0.76) => {
      drawSurface(ctx, rect, {
        fill: `rgba(3,12,19,${alpha})`,
        border: withAlpha(accent, '30'),
        cut: 9,
      });
      ctx.fillStyle = withAlpha(accent, 'AA');
      ctx.fillRect(rect.x + 12, rect.y + 5, 44, 2);
    };

    hudPlate(left, bulletColor);
    hudPlate(center, C.cyan);
    hudPlate(right, critical ? C.red : C.green);

    const bulletIconX = left.x + 30;
    const bulletIconY = left.y + 29;
    if (this.bullet.held && !this.reducedMotion) {
      ctx.save();
      ctx.globalAlpha = 0.10 + pulse * 0.08;
      ctx.fillStyle = C.amber;
      ctx.beginPath();
      ctx.arc(bulletIconX, bulletIconY, 20 + pulse * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    drawUiIcon(ctx, 'bullet', bulletIconX, bulletIconY, { color: bulletColor, scale: 0.94 });
    const bulletLabelX = left.x + 56;
    this.localText(
      this.bullet.held ? this.t('hud.bulletHeld') : this.bullet.recalling ? this.t('hud.bulletReturning') : this.t('hud.bulletField'),
      bulletLabelX,
      left.y + 29,
      { size: 10.5, color: bulletColor, weight: 900, align: 'left' },
    );
    if (!this.bullet.held) {
      drawText(ctx, this.bullet.recalling ? this.t('stat.returning') : this.t('hud.recallKey'), bulletLabelX, left.y + 46, {
        size: 7.4, color: C.textSoft, weight: 800, align: 'left', direction: this.bullet.recalling ? this.dir() : 'ltr',
      });
    } else {
      this.localText(this.t('stat.ready'), bulletLabelX, left.y + 46, {
        size: 7.4, color: C.textSoft, weight: 800, align: 'left',
      });
    }
    drawGauge(ctx, left.x + 18, left.y + 56, left.w - 36, recallRatio, bulletColor, { height: 4, marker: !this.bullet.held });

    this.localText(this.t('hud.wave'), center.x + center.w / 2, center.y + 18, {
      size: 7.8, color: C.textMuted, weight: 850, align: 'center',
    });
    drawText(ctx, String(this.wave).padStart(2, '0'), center.x + center.w / 2, center.y + 43, {
      size: 22, color: C.text, weight: 900, align: 'center', direction: 'ltr',
    });
    this.localText(this.t(`encounter.${this.currentEncounter?.id || 'foundation'}`), center.x + center.w / 2, center.y + 58, {
      size: 8.4, color: C.amberBright, weight: 850, align: 'center',
    });
    this.localText(this.t('hud.enemiesLeft', { count: this.enemies.length }), center.x + center.w - 14, center.y + 18, {
      size: 7.2, color: C.textSoft, weight: 800, align: 'right',
    });

    if (critical && !this.reducedMotion) {
      ctx.save();
      ctx.strokeStyle = `rgba(221,102,117,${0.18 + pulse * 0.28})`;
      ctx.lineWidth = 2;
      angularPath(ctx, right.x - 2, right.y - 2, right.w + 4, right.h + 4, 10);
      ctx.stroke();
      ctx.restore();
    }
    drawUiIcon(ctx, 'health', right.x + 24, right.y + 25, {
      color: critical ? C.red : C.green, scale: 0.68,
    });
    this.localText(this.t('stat.health'), right.x + 43, right.y + 22, {
      size: 7.8, color: C.textSoft, weight: 800, align: 'left',
    });
    drawText(ctx, `${this.player.health}/${this.player.maxHealth}`, right.x + right.w - 16, right.y + 24, {
      size: 13, color: critical ? C.red : C.text, weight: 900, align: 'right', direction: 'ltr',
    });
    drawGauge(ctx, right.x + 18, right.y + 33, right.w - 36, hpRatio, critical ? C.red : C.green, { height: 5, marker: true });

    drawUiIcon(ctx, this.player.shield > 0 ? 'shield' : 'dash', right.x + 24, right.y + 51, {
      color: this.player.shield > 0 ? C.cyanBright : C.cyan, scale: 0.52,
    });
    this.localText(
      this.player.shield > 0 ? this.t('hud.shieldActive') : this.t('stat.dash'),
      right.x + 39,
      right.y + 54,
      { size: 7.2, color: this.player.shield > 0 ? C.cyanBright : C.textSoft, weight: 850, align: 'left' },
    );
    drawGauge(ctx, right.x + 145, right.y + 50, right.w - 163, this.player.shield > 0 ? 1 : dashRatio, this.player.shield > 0 ? C.cyanBright : C.cyan, { height: 4, marker: true });

    if (!this.touchMode && this.arenaStage.id >= 4) this.drawMiniMap();
    if (this.state === 'playing' && this.wave === 1 && this.tutorialStep < 3) this.drawTutorial();
  }

  drawMiniMap() {
    const rect = { x: WIDTH - 178, y: 92, w: 160, h: 106 };
    const bounds = this.arenaStage.bounds;
    drawSurface(this.ctx, rect, {
      fill: 'rgba(3,10,16,0.76)', border: 'rgba(105,215,244,0.22)', cut: 8,
    });
    drawUiIcon(this.ctx, 'sector', rect.x + 16, rect.y + 15, { color: C.cyan, scale: 0.44 });
    this.localText(this.t('minimap.title'), rect.x + 29, rect.y + 18, {
      size: 6.8, color: C.textSoft, weight: 850, align: 'left',
    });
    drawText(this.ctx, `S${this.arenaStage.id + 1}`, rect.x + rect.w - 12, rect.y + 18, {
      size: 6.8, color: C.amber, weight: 900, align: 'right', direction: 'ltr',
    });

    const inner = { x: rect.x + 10, y: rect.y + 29, w: rect.w - 20, h: rect.h - 39 };
    const scale = Math.min(inner.w / bounds.w, inner.h / bounds.h);
    const mapW = bounds.w * scale;
    const mapH = bounds.h * scale;
    const mapX = inner.x + (inner.w - mapW) / 2;
    const mapY = inner.y + (inner.h - mapH) / 2;
    this.ctx.fillStyle = 'rgba(105,215,244,0.025)';
    this.ctx.fillRect(mapX, mapY, mapW, mapH);
    this.ctx.strokeStyle = 'rgba(105,215,244,0.22)';
    this.ctx.strokeRect(mapX, mapY, mapW, mapH);

    const project = (point) => ({
      x: mapX + (point.x - bounds.x) * scale,
      y: mapY + (point.y - bounds.y) * scale,
    });
    const player = project(this.player);
    drawTargetGlyph(this.ctx, player.x, player.y, 4.7, C.amber);
    this.ctx.fillStyle = 'rgba(221,102,117,0.55)';
    for (const enemy of this.enemies.slice(0, 18)) {
      const p = project(enemy);
      const r = enemy.type === 'brute' || enemy.type === 'warden' ? 1.7 : 1.2;
      this.ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
    }
  }

  drawTutorial() {
    const copy = `WASD ${this.t('controls.move')}  •  MOUSE ${this.t('controls.fire')}  •  Q ${this.t('controls.recall')}  •  SPACE ${this.t('controls.dash')}`;
    this.localText(copy, this.rtl() ? WIDTH - 22 : 22, HEIGHT - 110, {
      size: 7.2, color: C.textSoft, weight: 800, align: this.rtl() ? 'right' : 'left',
    });
  }

  drawTouchControls() {
    const move = TOUCH_LAYOUT.move;
    const ctx = this.ctx;
    const moveRadius = move.radius + 5;
    ctx.save();
    ctx.fillStyle = 'rgba(3,12,19,0.22)';
    ctx.strokeStyle = 'rgba(105,215,244,0.30)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(move.x, move.y, moveRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(105,215,244,0.14)';
    ctx.beginPath();
    ctx.arc(move.x, move.y, move.radius * 0.48, 0, Math.PI * 2);
    ctx.stroke();
    if (this.touchMove) {
      const dx = Math.max(-34, Math.min(34, this.touchMove.x - this.touchMove.originX));
      const dy = Math.max(-34, Math.min(34, this.touchMove.y - this.touchMove.originY));
      ctx.fillStyle = 'rgba(105,215,244,0.24)';
      ctx.beginPath();
      ctx.arc(move.x + dx, move.y + dy, 21, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    const radial = (circle, key, labelValue, color, icon, action) => {
      const hitRadius = circle.radius + 8;
      const rect = { x: circle.x - hitRadius, y: circle.y - hitRadius, w: hitRadius * 2, h: hitRadius * 2 };
      const hover = this.mixUi(`touch-${key}`, this.menuHover(rect), 0.2);
      ctx.save();
      ctx.fillStyle = `rgba(3,12,19,${0.52 + hover * 0.12})`;
      ctx.strokeStyle = withAlpha(color, hover > 0.2 ? '88' : '55');
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.radius + 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      drawUiIcon(ctx, icon, circle.x, circle.y - 6, { color, scale: 0.58 });
      this.localText(labelValue, circle.x, circle.y + 18, {
        size: 6.8, color, weight: 900, align: 'center', baseline: 'middle',
      });
      ctx.restore();
      this.addUiRegion(rect.x, rect.y, rect.w, rect.h, action);
    };
    radial(TOUCH_LAYOUT.recall, 'recall', this.t('touch.recall'), C.amber, 'recall', () => this.recallBullet());
    radial(TOUCH_LAYOUT.dash, 'dash', this.t('touch.dash'), C.cyan, 'dash', () => { this.dashRequested = true; });
    radial(TOUCH_LAYOUT.pause, 'pause', this.t('touch.pause'), C.textSoft, 'menu', () => this.pause());
  }

  drawModalBackdrop(alpha = 0.52) {
    const ctx = this.ctx;
    const overlay = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 90, WIDTH / 2, HEIGHT / 2, 760);
    overlay.addColorStop(0, `rgba(1,5,9,${Math.max(0.28, alpha - 0.16)})`);
    overlay.addColorStop(0.62, `rgba(1,5,9,${alpha})`);
    overlay.addColorStop(1, `rgba(0,2,6,${Math.min(0.82, alpha + 0.14)})`);
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.strokeStyle = 'rgba(105,215,244,0.035)';
    ctx.lineWidth = 1;
    for (let x = -220; x < WIDTH + 220; x += 220) {
      ctx.beginPath();
      ctx.moveTo(x, HEIGHT);
      ctx.lineTo(x + 270, 0);
      ctx.stroke();
    }
  }

  drawPause() {
    this.drawModalBackdrop(this.touchMode ? 0.58 : 0.50);
    const panel = { x: 315, y: 132, w: 650, h: 456 };
    const rtl = this.rtl();
    const pad = 30;
    const contentLeft = panel.x + pad;
    const contentRight = panel.x + panel.w - pad;
    const anchorX = rtl ? contentRight : contentLeft;
    const align = rtl ? 'right' : 'left';
    const sector = Math.min(7, this.arenaStage?.id ?? 0);

    drawSurface(this.ctx, panel, {
      fill: 'rgba(3,11,18,0.92)',
      border: 'rgba(105,215,244,0.30)',
      cut: 15,
      accent: C.cyan,
    });

    drawText(this.ctx, this.t('pause.kicker'), anchorX, panel.y + 34, {
      size: 7.8, color: C.cyan, weight: 900, align, direction: this.dir(),
    });
    this.localText(this.t('pause.title'), anchorX, panel.y + 73, {
      size: 27, color: C.text, weight: 900, align,
    });

    const waveX = rtl ? contentRight : contentLeft;
    drawText(this.ctx, String(this.wave).padStart(2, '0'), waveX, panel.y + 126, {
      size: 28, color: C.amberBright, weight: 900, align, direction: 'ltr',
    });
    this.localText(this.t('stat.wave'), rtl ? waveX - 48 : waveX + 48, panel.y + 121, {
      size: 8.5, color: C.textMuted, weight: 850, align: rtl ? 'right' : 'left',
    });
    this.localText(this.t(`stage.${sector}`), rtl ? contentLeft : contentRight, panel.y + 120, {
      size: 11, color: C.green, weight: 900, align: rtl ? 'left' : 'right',
    });
    this.localText(this.t(`encounter.${this.currentEncounter?.id || 'foundation'}`), rtl ? contentLeft : contentRight, panel.y + 140, {
      size: 7.8, color: C.textSoft, weight: 750, align: rtl ? 'left' : 'right',
    });

    this.ctx.fillStyle = C.line;
    this.ctx.fillRect(contentLeft, panel.y + 154, panel.w - pad * 2, 1);

    const metrics = [
      [this.t('stat.score'), this.n(this.score), C.amber, 'score', false],
      [this.t('stat.upgrades'), this.n(this.stats.upgrades), C.cyan, 'upgrade', false],
      [this.t('stat.sector'), this.t(`stage.${sector}`), C.green, 'sector', true],
    ];
    const metricW = 184;
    const metricGap = 18;
    metrics.forEach(([labelValue, value, color, icon, localized], index) => {
      const x = contentLeft + index * (metricW + metricGap);
      const y = panel.y + 181;
      drawUiIcon(this.ctx, icon, x + 10, y + 5, { color, scale: 0.48 });
      this.localText(labelValue, x + 25, y + 8, {
        size: 7.5, color: C.textMuted, weight: 760, align: 'left',
      });
      if (localized) {
        this.localText(value, x, y + 34, {
          size: 10.5, color, weight: 900, align: 'left',
        });
      } else {
        drawText(this.ctx, value, x, y + 34, {
          size: 15, color, weight: 900, align: 'left', direction: 'ltr',
        });
      }
    });

    const resume = { x: panel.x + 120, y: panel.y + 238, w: panel.w - 240, h: 58 };
    this.uiButton(resume, 'pause-resume', this.t('pause.resume'), () => this.resume(), {
      primary: true, icon: 'bullet', meta: `WAVE ${String(this.wave).padStart(2, '0')}`,
    });

    const secondaryY = panel.y + 310;
    this.uiButton(
      { x: panel.x + 120, y: secondaryY, w: 194, h: 44 },
      'pause-new',
      this.t('pause.newRun'),
      () => this.startRun(),
      { icon: 'restart' },
    );
    this.uiButton(
      { x: panel.x + 326, y: secondaryY, w: 204, h: 44 },
      'pause-menu',
      this.t('pause.mainMenu'),
      () => this.goToMenu(),
      { icon: 'menu' },
    );

    this.ctx.fillStyle = C.line;
    this.ctx.fillRect(contentLeft, panel.y + 374, panel.w - pad * 2, 1);
    this.languageSelector({ x: contentLeft, y: panel.y + 392, w: 192, h: 38 }, 'pause-language');
    this.utilityChip(
      { x: contentLeft + 204, y: panel.y + 392, w: 132, h: 38 },
      'pause-audio',
      this.audio.settings.muted ? this.t('menu.muted') : this.t('menu.audio'),
      () => this.toggleAudio(),
      {
        icon: 'audio',
        active: !this.audio.settings.muted,
        accent: this.audio.settings.muted ? C.red : C.green,
        direction: this.dir(),
      },
    );
    this.utilityChip(
      { x: contentLeft + 348, y: panel.y + 392, w: 152, h: 38 },
      'pause-fullscreen',
      this.t('menu.fullscreen'),
      () => this.toggleFullscreen(),
      { icon: 'fullscreen', direction: this.dir() },
    );
    drawText(this.ctx, 'P / ESC', contentRight, panel.y + 417, {
      size: 6.6, color: C.textMuted, weight: 850, align: 'right', direction: 'ltr',
    });
  }

  drawGameOver() {
    const checkpoint = this.hasContinueCheckpoint() ? this.savedCheckpoint : null;
    const rtl = this.rtl();
    const sector = Math.min(7, this.arenaStage?.id ?? stageIndexForWave(this.wave));
    this.drawModalBackdrop(0.70);
    const panel = { x: 116, y: 96, w: 1048, h: 528 };
    drawSurface(this.ctx, panel, {
      fill: 'rgba(3,11,18,0.94)',
      border: 'rgba(238,102,120,0.26)',
      cut: 16,
      accent: C.red,
    });

    const textSideX = rtl ? panel.x + panel.w - 54 : panel.x + 54;
    const align = rtl ? 'right' : 'left';
    this.localText(this.t('gameOver.kicker'), textSideX, panel.y + 42, { size: 8, color: C.red, weight: 900, align });
    this.localText(this.t('gameOver.title'), textSideX, panel.y + 88, { size: 34, color: C.text, weight: 900, align });

    const radarX = rtl ? panel.x + 250 : panel.x + panel.w - 250;
    this.drawRunRadar(radarX, panel.y + 185, 88, this.wave, sector);
    drawUiIcon(this.ctx, 'bullet', radarX, panel.y + 185, { color: C.red, scale: 0.62 });

    const resultX = textSideX;
    drawText(this.ctx, String(this.wave).padStart(2, '0'), resultX, panel.y + 190, {
      size: 68, color: C.amberBright, weight: 900, align, direction: 'ltr',
    });
    this.localText(this.t('gameOver.waveReached'), resultX, panel.y + 218, { size: 8.4, color: C.textSoft, weight: 820, align });
    drawText(this.ctx, this.n(this.score), resultX, panel.y + 272, { size: 28, color: C.text, weight: 900, align, direction: 'ltr' });
    this.localText(this.t('gameOver.finalScore'), resultX, panel.y + 294, { size: 7.8, color: C.textMuted, weight: 760, align });

    const strip = { x: panel.x + 52, y: panel.y + 320, w: panel.w - 104, h: 70 };
    drawSurface(this.ctx, strip, { fill: 'rgba(1,7,12,0.62)', border: 'rgba(255,255,255,0.07)', cut: 8 });
    const values = [
      [this.t('gameOver.bestScore'), this.n(this.highScore), C.cyanBright, 'score', false],
      [this.t('stat.upgrades'), this.n(this.stats.upgrades), C.green, 'upgrade', false],
      [this.t('stat.sector'), this.t(`stage.${sector}`), C.cyan, 'sector', true],
      [this.t('stat.checkpoint'), checkpoint ? this.t('stat.ready') : this.t('stat.empty'), checkpoint ? C.green : C.textMuted, 'checkpoint', true],
    ];
    values.forEach(([label, value, color, icon, localized], index) => {
      const colW = strip.w / values.length;
      const x = strip.x + index * colW;
      if (index > 0) { this.ctx.fillStyle = 'rgba(255,255,255,0.07)'; this.ctx.fillRect(x, strip.y + 14, 1, strip.h - 28); }
      drawUiIcon(this.ctx, icon, x + 26, strip.y + 35, { color, scale: 0.50 });
      this.localText(label, x + 48, strip.y + 26, { size: 7, color: C.textMuted, weight: 760, align: 'left' });
      if (localized) this.localText(value, x + 48, strip.y + 49, { size: 10.2, color, weight: 900, align: 'left' });
      else drawText(this.ctx, value, x + 48, strip.y + 50, { size: 12.5, color, weight: 900, align: 'left', direction: 'ltr' });
    });

    const primary = { x: panel.x + 236, y: panel.y + 414, w: panel.w - 472, h: 58 };
    this.uiButton(primary, checkpoint ? 'over-continue' : 'over-retry',
      checkpoint ? this.t('gameOver.continue') : this.t('gameOver.retry'),
      checkpoint ? () => this.continueFromCheckpoint() : () => this.startRun(),
      { primary: true, icon: 'bullet', meta: checkpoint ? `WAVE ${checkpoint.wave}` : null });
    const gap = 18;
    const w = (primary.w - gap) / 2;
    this.uiButton({ x: primary.x, y: panel.y + 484, w, h: 40 }, 'over-new', this.t('gameOver.retry'), () => this.startRun(), { icon: 'restart' });
    this.uiButton({ x: primary.x + w + gap, y: panel.y + 484, w, h: 40 }, 'over-menu', this.t('gameOver.mainMenu'), () => this.goToMenu(), { icon: 'menu' });
  }

  upgradeVisual(upgrade) {
    const currentStack = this.stack(upgrade.id);
    const nextStack = Math.min(upgrade.maxStacks, currentStack + 1);
    const pair = (current, next, icon) => ({ current: String(current), next: String(next), icon });
    switch (upgrade.id) {
      case 'heavy-shot':
        return pair(`${(1 + currentStack * 0.35).toFixed(2)}×`, `${(1 + nextStack * 0.35).toFixed(2)}×`, 'bullet');
      case 'bullet-velocity':
        return pair(`${currentStack * 7}%`, `${nextStack * 7}%`, 'bullet');
      case 'extended-ricochet':
        return pair(4 + currentStack * 2, 4 + nextStack * 2, 'ricochet');
      case 'hot-ricochet':
        return pair(`${currentStack * 24}%`, `${nextStack * 24}%`, 'ricochet');
      case 'shock-impact':
        return pair(82 + currentStack * 20, 82 + nextStack * 20, 'electric');
      case 'magnetic-recall':
        return pair(720 + currentStack * 95, 720 + nextStack * 95, 'recall');
      case 'recall-strike':
        return pair(`${currentStack * 30}%`, `${nextStack * 30}%`, 'recall');
      case 'quick-dash':
        return pair(
          `${Math.max(0.36, 1.12 * Math.pow(0.86, currentStack)).toFixed(2)}s`,
          `${Math.max(0.36, 1.12 * Math.pow(0.86, nextStack)).toFixed(2)}s`,
          'dash',
        );
      case 'swift-steps':
        return pair(`${currentStack * 7}%`, `${nextStack * 7}%`, 'movement');
      case 'vitality':
        return pair(3 + currentStack, 3 + nextStack, 'health');
      case 'wave-shield':
        return pair(currentStack, nextStack, 'shield');
      case 'second-chance':
        return pair(currentStack, nextStack, 'second-chance');
      default:
        return pair(currentStack, nextStack, 'upgrade');
    }
  }

  upgradeEffect(upgrade) {
    const values = this.upgradeVisual(upgrade);
    return `${values.current} → ${values.next}`;
  }

  drawUpgradeSelection() {
    this.drawModalBackdrop(this.touchMode ? 0.66 : 0.58);

    drawText(this.ctx, this.t('upgrade.kicker'), WIDTH / 2, 38, {
      size: 7.8, color: C.cyan, weight: 900, align: 'center', direction: this.dir(),
    });
    this.localText(this.t('upgrade.title'), WIDTH / 2, 74, {
      size: 27, color: C.text, weight: 900, align: 'center',
    });
    this.localText(this.t('upgrade.subtitle'), WIDTH / 2, 99, {
      size: 9.4, color: C.textSoft, weight: 700, align: 'center',
    });

    const cardW = 348;
    const cardH = 366;
    const gap = 24;
    const total = this.upgradeChoices.length * cardW + (this.upgradeChoices.length - 1) * gap;
    const startX = WIDTH / 2 - total / 2;
    const y = 128;

    this.upgradeChoices.forEach((upgrade, index) => {
      const rect = { x: startX + index * (cardW + gap), y, w: cardW, h: cardH };
      const hovered = this.menuHover(rect);
      if (hovered) this.upgradeFocusIndex = index;
      const focused = this.upgradeFocusIndex === index;
      const hover = this.mixUi(`upgrade-${index}`, hovered || focused, 0.18);
      const values = this.upgradeVisual(upgrade);
      const accents = [C.cyan, C.amber, C.green];
      const accent = accents[index % accents.length];
      const lift = this.reducedMotion ? 0 : hover * 3;
      const r = { ...rect, y: rect.y - lift };

      drawSurface(this.ctx, r, {
        fill: `rgba(4,13,20,${0.90 + hover * 0.04})`,
        border: focused ? withAlpha(accent, '72') : `rgba(116,166,187,${0.18 + hover * 0.12})`,
        cut: 13,
      });

      this.ctx.fillStyle = withAlpha(accent, focused ? 'CC' : '88');
      this.ctx.fillRect(r.x + 20, r.y + 5, 70 + hover * 18, 2);

      const iconBox = { x: r.x + 24, y: r.y + 24, w: 44, h: 44 };
      drawSurface(this.ctx, iconBox, {
        fill: withAlpha(accent, '0D'),
        border: withAlpha(accent, focused ? '55' : '2F'),
        cut: 8,
      });
      drawUiIcon(this.ctx, values.icon, iconBox.x + 22, iconBox.y + 22, {
        color: accent,
        scale: 0.72,
      });
      drawText(this.ctx, `0${index + 1}`, r.x + r.w - 24, r.y + 38, {
        size: 8.5, color: C.textMuted, weight: 900, align: 'right', direction: 'ltr',
      });
      this.localText(this.t(`upgrade.${upgrade.id}.tag`), r.x + r.w - 24, r.y + 62, {
        size: 7.4, color: accent, weight: 900, align: 'right',
      });

      const titleX = this.rtl() ? r.x + r.w - 24 : r.x + 24;
      const titleAlign = this.rtl() ? 'right' : 'left';
      this.localText(this.t(`upgrade.${upgrade.id}.name`), titleX, r.y + 106, {
        size: 18.5, color: C.text, weight: 900, align: titleAlign,
      });
      wrapText(
        this.ctx,
        i18n,
        this.t(`upgrade.${upgrade.id}.description`),
        titleX,
        r.y + 136,
        r.w - 48,
        {
          size: 9.8,
          lineHeight: 16,
          color: C.textSoft,
          weight: 650,
          maxLines: 3,
          align: titleAlign,
        },
      );

      const compare = { x: r.x + 24, y: r.y + 204, w: r.w - 48, h: 82 };
      drawSurface(this.ctx, compare, {
        fill: 'rgba(2,9,14,0.64)',
        border: 'rgba(255,255,255,0.07)',
        cut: 8,
      });
      const currentX = compare.x + 70;
      const newX = compare.x + compare.w - 70;
      this.localText(this.t('upgrade.current'), currentX, compare.y + 22, {
        size: 7.1, color: C.textMuted, weight: 800, align: 'center',
      });
      this.localText(this.t('upgrade.after'), newX, compare.y + 22, {
        size: 7.1, color: accent, weight: 850, align: 'center',
      });
      drawText(this.ctx, values.current, currentX, compare.y + 55, {
        size: 14, color: C.textSoft, weight: 900, align: 'center', direction: 'ltr',
      });
      drawText(this.ctx, '→', compare.x + compare.w / 2, compare.y + 55, {
        size: 16, color: C.textMuted, weight: 800, align: 'center', direction: 'ltr',
      });
      drawText(this.ctx, values.next, newX, compare.y + 55, {
        size: 15, color: accent, weight: 900, align: 'center', direction: 'ltr',
      });

      const stack = this.stack(upgrade.id);
      const ratio = upgrade.maxStacks ? stack / upgrade.maxStacks : 0;
      drawText(this.ctx, `${stack}/${upgrade.maxStacks}`, titleX, r.y + 310, {
        size: 7.2, color: C.textMuted, weight: 850, align: titleAlign, direction: 'ltr',
      });
      drawGauge(this.ctx, r.x + 24, r.y + 321, r.w - 48, ratio, accent, { height: 3 });

      const keyRect = { x: r.x + 24, y: r.y + 337, w: 38, h: 22 };
      drawSurface(this.ctx, keyRect, {
        fill: focused ? withAlpha(accent, '12') : 'rgba(255,255,255,0.025)',
        border: focused ? withAlpha(accent, '55') : 'rgba(255,255,255,0.08)',
        cut: 5,
      });
      drawText(this.ctx, String(index + 1), keyRect.x + keyRect.w / 2, keyRect.y + keyRect.h / 2 + 1, {
        size: 8, color: focused ? accent : C.textSoft, weight: 900, align: 'center', baseline: 'middle', direction: 'ltr',
      });
      this.localText(this.t('upgrade.select'), r.x + r.w - 24, r.y + 353, {
        size: 8.2, color: focused ? accent : C.textSoft, weight: 850, align: 'right',
      });

      this.addUiRegion(rect.x, rect.y - 6, rect.w, rect.h + 12, () => this.chooseUpgrade(index));
    });

    drawText(this.ctx, '1   •   2   •   3   •   ENTER', WIDTH / 2, 676, {
      size: 7.2, color: C.textMuted, weight: 850, align: 'center', direction: 'ltr',
    });
  }

  drawBanner() {
    if (!this.banner) return;
    const expanded = /مساحة|opened|sector/i.test(String(this.banner.subtitle || ''));
    const remaining = Number(this.banner.time || 0);
    const total = expanded ? 2.45 : 1.55;
    const intro = clamp01((remaining - (total - 0.48)) / 0.48);
    const outro = clamp01(remaining / 0.36);
    const alpha = Math.min(1, outro * 1.08);
    const compactY = 104;
    const introY = HEIGHT / 2 - 46;
    const y = compactY + (introY - compactY) * intro;
    const headlineSize = (expanded ? 17 : 20) + intro * (expanded ? 8 : 13);
    const railHalf = 150 + intro * 150;
    const accent = expanded ? C.green : C.amber;

    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    const shade = this.ctx.createLinearGradient(0, y - 28, 0, y + 66);
    shade.addColorStop(0, 'rgba(1,6,10,0)');
    shade.addColorStop(0.5, `rgba(2,9,14,${0.36 + intro * 0.16})`);
    shade.addColorStop(1, 'rgba(1,6,10,0)');
    this.ctx.fillStyle = shade;
    this.ctx.fillRect(WIDTH / 2 - railHalf - 40, y - 30, railHalf * 2 + 80, 98);

    this.ctx.strokeStyle = withAlpha(accent, intro > 0.3 ? '66' : '44');
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(WIDTH / 2 - railHalf, y);
    this.ctx.lineTo(WIDTH / 2 - 22, y);
    this.ctx.moveTo(WIDTH / 2 + 22, y);
    this.ctx.lineTo(WIDTH / 2 + railHalf, y);
    this.ctx.stroke();
    drawUiIcon(this.ctx, expanded ? 'sector' : 'bullet', WIDTH / 2, y, {
      color: accent,
      scale: intro > 0.3 ? 0.72 : 0.58,
    });

    this.localText(
      expanded ? this.t('wave.sectorUnlocked') : this.t('wave.incoming', { wave: this.wave }),
      WIDTH / 2,
      y + 39,
      { size: headlineSize, color: C.text, weight: 900, align: 'center' },
    );
    this.localText(
      expanded ? this.t(`stage.${Math.min(7, this.arenaStage.id)}`) : this.t(`encounter.${this.currentEncounter?.id || 'foundation'}`),
      WIDTH / 2,
      y + 61,
      { size: 8.5 + intro * 0.8, color: accent, weight: 850, align: 'center' },
    );
    this.ctx.restore();
  }
}

export const OneBulletUiRepairRuntime = OneBulletGlobalUiRuntime;
