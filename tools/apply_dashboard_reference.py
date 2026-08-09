from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / 'src/core/ui-repair-runtime.js'
UI_SYSTEM = ROOT / 'src/ui-system.js'
I18N = ROOT / 'src/i18n.js'

OLD_VERSION = '3.6.1-ui-refinement'
NEW_VERSION = '3.6.2-dashboard-command'
OLD_REVISION = 'production-refinement-v1'
NEW_REVISION = 'dashboard-reference-v2'


def replace_between(source: str, start: str, end: str, replacement: str) -> str:
    a = source.find(start)
    if a < 0:
        raise RuntimeError(f'missing start marker: {start}')
    b = source.find(end, a + len(start))
    if b < 0:
        raise RuntimeError(f'missing end marker: {end}')
    return source[:a] + replacement.rstrip() + '\n\n' + source[b:]


def replace_once(source: str, old: str, new: str) -> str:
    if old not in source:
        raise RuntimeError(f'missing exact text: {old[:80]}')
    return source.replace(old, new, 1)


runtime = RUNTIME.read_text(encoding='utf-8')
runtime = runtime.replace(OLD_VERSION, NEW_VERSION)
runtime = runtime.replace(OLD_REVISION, NEW_REVISION)
runtime = replace_once(
    runtime,
    '    this.upgradeFocusIndex = 0;\n',
    '    this.upgradeFocusIndex = 0;\n    this.menuSettingsOpen = false;\n',
)

utility_chip = r'''  utilityChip(rect, key, textValue, action, options = {}) {
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
  }'''
runtime = replace_between(runtime, '  utilityChip(', '  languageSelector(', utility_chip)

background = r'''  drawGlobalBackground() {
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
  }'''
runtime = replace_between(runtime, '  drawGlobalBackground()', '  drawTopUtility()', background)

top_utility = r'''  drawTopUtility() {
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
  }'''
runtime = replace_between(runtime, '  drawTopUtility()', '  drawRunSnapshot(', top_utility)

snapshot_and_helpers = r'''  drawMenuSettingsPanel() {
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
  }'''
runtime = replace_between(runtime, '  drawRunSnapshot(', '  drawWorldTimeline(', snapshot_and_helpers)

world_timeline = r'''  drawWorldTimeline(rect, wave) {
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
  }'''
runtime = replace_between(runtime, '  drawWorldTimeline(', '  drawMenu()', world_timeline)

menu = r'''  drawMenu() {
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
  }'''
runtime = replace_between(runtime, '  drawMenu()', '  drawPlayer()', menu)

game_over = r'''  drawGameOver() {
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
  }'''
runtime = replace_between(runtime, '  drawGameOver()', '  upgradeVisual(', game_over)

RUNTIME.write_text(runtime, encoding='utf-8')

ui = UI_SYSTEM.read_text(encoding='utf-8')
ui = ui.replace("    bg: '#02070c',", "    bg: '#01070c',")
ui = ui.replace("    bgRaised: '#071019',", "    bgRaised: '#06121b',")
ui = ui.replace("    graphite: '#0b141d',", "    graphite: '#091620',")
ui = ui.replace("    steel: '#12202b',", "    steel: '#102532',")
ui = ui.replace("    cyan: '#69d7f4',", "    cyan: '#53cdf5',")
ui = ui.replace("    cyanBright: '#b7efff',", "    cyanBright: '#a9ecff',")
ui = ui.replace("    amber: '#e7b84d',", "    amber: '#f0bd4d',")
ui = ui.replace("    green: '#58d6a2',", "    green: '#55e0b0',")
ui = ui.replace("    red: '#dd6675',", "    red: '#ee6678',")
ui = ui.replace("    textSoft: '#b6c4cc',", "    textSoft: '#c2d0d8',")
ui = ui.replace("    textMuted: '#8197a2',", "    textMuted: '#718995',")

surface = r'''export function drawSurface(ctx, rect, options = {}) {
  const color = UI_TOKENS.color;
  ctx.save();
  angularPath(ctx, rect.x, rect.y, rect.w, rect.h, options.cut ?? 12);
  ctx.fillStyle = options.fill ?? 'rgba(5, 14, 22, 0.88)';
  ctx.fill();
  if (options.border !== false) {
    ctx.strokeStyle = options.border ?? color.lineStrong;
    ctx.lineWidth = options.lineWidth ?? 1;
    ctx.stroke();
  }
  if (rect.w > 120 && rect.h > 40) {
    const topFade = ctx.createLinearGradient(rect.x + 12, 0, rect.x + Math.min(rect.w * 0.44, 260), 0);
    topFade.addColorStop(0, 'rgba(169,236,255,0.13)');
    topFade.addColorStop(1, 'rgba(169,236,255,0)');
    ctx.strokeStyle = topFade;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rect.x + 18, rect.y + 5);
    ctx.lineTo(rect.x + Math.min(rect.w * 0.40, 230), rect.y + 5);
    ctx.stroke();
  }
  if (options.accent) {
    ctx.strokeStyle = options.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rect.x + 18, rect.y);
    ctx.lineTo(rect.x + Math.min(rect.w * 0.24, 112), rect.y);
    ctx.stroke();
  }
  ctx.restore();
}'''
ui = replace_between(ui, 'export function drawSurface(', 'export function drawButton(', surface)

button = r'''export function drawButton(ctx, rect, state = {}) {
  const color = UI_TOKENS.color;
  const hover = Math.max(0, Math.min(1, state.hover ?? 0));
  const pressed = Boolean(state.pressed);
  const focused = Boolean(state.focused);
  const disabled = Boolean(state.disabled);
  const primary = Boolean(state.primary);
  const danger = Boolean(state.danger);
  const accent = danger ? color.red : primary ? color.amber : color.cyan;
  const lift = disabled ? 0 : pressed ? 1 : hover * 1.5;
  const r = { ...rect, y: rect.y - lift };
  const fill = danger
    ? `rgba(42, 10, 18, ${0.72 + hover * 0.10})`
    : primary
      ? `rgba(54, 37, 8, ${0.90 + hover * 0.06})`
      : `rgba(5, 18, 27, ${0.84 + hover * 0.07})`;

  ctx.save();
  if (!disabled && hover > 0.04) {
    ctx.shadowColor = accent;
    ctx.shadowBlur = primary ? 8 * hover : 4 * hover;
  }
  drawSurface(ctx, r, {
    fill,
    border: disabled ? color.line : `${accent}${focused ? 'CC' : primary ? 'AA' : hover > 0.02 ? '88' : '55'}`,
    accent: disabled ? color.textMuted : accent,
    cut: primary ? 13 : 9,
  });
  ctx.shadowBlur = 0;
  if (primary && !disabled) {
    ctx.strokeStyle = `${accent}66`;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(r.x + 11, r.y + r.h / 2); ctx.lineTo(r.x + 24, r.y + r.h / 2);
    ctx.moveTo(r.x + r.w - 24, r.y + r.h / 2); ctx.lineTo(r.x + r.w - 11, r.y + r.h / 2);
    ctx.stroke();
  }
  if (focused) {
    ctx.strokeStyle = `${accent}99`;
    ctx.setLineDash([4, 5]);
    angularPath(ctx, r.x + 4, r.y + 4, r.w - 8, r.h - 8, primary ? 10 : 7);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (primary && !disabled) {
    const sweep = r.x + 18 + (r.w - 36) * (state.sweep ?? 0);
    const gradient = ctx.createLinearGradient(sweep - 92, 0, sweep + 92, 0);
    gradient.addColorStop(0, 'rgba(255,225,154,0)');
    gradient.addColorStop(0.5, `rgba(255,225,154,${0.045 + hover * 0.055})`);
    gradient.addColorStop(1, 'rgba(255,225,154,0)');
    ctx.fillStyle = gradient;
    angularPath(ctx, r.x + 1, r.y + 1, r.w - 2, r.h - 2, 12);
    ctx.fill();
  }
  ctx.restore();
}'''
ui = replace_between(ui, 'export function drawButton(', 'export function drawGauge(', button)

ui = ui.replace(
    "    case 'menu':\n      line(-9, -6, 9, -6); line(-9, 0, 9, 0); line(-9, 6, 9, 6); break;",
    "    case 'menu':\n      line(-9, -6, 9, -6); line(-9, 0, 9, 0); line(-9, 6, 9, 6); break;\n    case 'settings':\n      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.stroke();\n      for (let i = 0; i < 8; i += 1) { const a = i * Math.PI / 4; line(Math.cos(a) * 7, Math.sin(a) * 7, Math.cos(a) * 11, Math.sin(a) * 11); } break;\n    case 'check':\n      line(-8, 0, -2, 6, 9, -7); break;",
)

background_fn = r'''export function drawTrajectoryBackground(ctx, width, height, time = 0, reducedMotion = false) {
  const color = UI_TOKENS.color;
  ctx.fillStyle = color.bg;
  ctx.fillRect(0, 0, width, height);

  const radialA = ctx.createRadialGradient(width * 0.34, height * 0.38, 40, width * 0.34, height * 0.38, 520);
  radialA.addColorStop(0, 'rgba(15, 61, 83, 0.22)');
  radialA.addColorStop(0.55, 'rgba(6, 29, 42, 0.08)');
  radialA.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = radialA; ctx.fillRect(0, 0, width, height);

  const radialB = ctx.createRadialGradient(width * 0.78, height * 0.42, 50, width * 0.78, height * 0.42, 440);
  radialB.addColorStop(0, 'rgba(6, 43, 59, 0.16)');
  radialB.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = radialB; ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.strokeStyle = 'rgba(83,205,245,0.040)';
  ctx.lineWidth = 1;
  for (let x = 32; x < width; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
  for (let y = 32; y < height; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }

  ctx.strokeStyle = 'rgba(83,205,245,0.055)';
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.arc(width * 0.52, height * 0.46, 110 + i * 54, -2.8, 0.65);
    ctx.stroke();
  }

  const drift = reducedMotion ? 0 : ((time * 14) % 220);
  ctx.strokeStyle = 'rgba(240,189,77,0.10)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-120 + drift, height * 0.72);
  ctx.lineTo(width * 0.28 + drift * 0.13, height * 0.52);
  ctx.lineTo(width * 0.49 + drift * 0.05, height * 0.63);
  ctx.lineTo(width + 80, height * 0.36);
  ctx.stroke();
  ctx.restore();

  const vignette = ctx.createRadialGradient(width / 2, height / 2, 250, width / 2, height / 2, 790);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.66)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}'''
ui = replace_between(ui, 'export function drawTrajectoryBackground(', '__END__', background_fn) if '__END__' in ui else ui[:ui.find('export function drawTrajectoryBackground(')] + background_fn + '\n'
UI_SYSTEM.write_text(ui, encoding='utf-8')

i18n = I18N.read_text(encoding='utf-8')
i18n = i18n.replace("  'brand.shortMantra': 'FIRE • RICOCHET • RECOVER • SURVIVE',", "  'brand.shortMantra': 'PRECISION. DODGE. SURVIVE.',")
i18n = i18n.replace("  'brand.shortMantra': 'أطلق • ارتد • استعد • انجُ',", "  'brand.shortMantra': 'الدقة • المراوغة • النجاة',")
I18N.write_text(i18n, encoding='utf-8')

# Release/cache/test identity: update current runtime contracts consistently without touching gameplay data.
for path in [ROOT / 'package.json', ROOT / 'package-lock.json', ROOT / 'src/release-config.js']:
    if path.exists():
        text = path.read_text(encoding='utf-8')
        text = text.replace(OLD_VERSION, NEW_VERSION)
        path.write_text(text, encoding='utf-8')

for folder in [ROOT / 'tests', ROOT / '.github/workflows']:
    if folder.exists():
        for path in folder.rglob('*'):
            if path.is_file() and path.suffix in {'.js', '.mjs', '.json', '.yml', '.yaml'}:
                text = path.read_text(encoding='utf-8')
                updated = text.replace(OLD_VERSION, NEW_VERSION).replace(OLD_REVISION, NEW_REVISION)
                if updated != text:
                    path.write_text(updated, encoding='utf-8')

print('dashboard reference refinement applied')
