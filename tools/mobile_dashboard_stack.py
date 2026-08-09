from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / 'src/core/ui-repair-runtime.js'


def replace_once(text: str, old: str, new: str) -> str:
    if old not in text:
        raise RuntimeError(f'missing expected text: {old[:100]}')
    return text.replace(old, new, 1)

runtime = RUNTIME.read_text(encoding='utf-8')

mobile_methods = r'''  drawCompactRunSnapshot(rect, checkpoint) {
    const rtl = this.rtl();
    const wave = checkpoint?.wave || 1;
    const sector = stageIndexForWave(wave);
    const entries = [
      [this.t('stat.wave'), String(wave).padStart(2, '0'), C.cyanBright, false],
      [this.t('stat.score'), this.n(checkpoint?.score || 0), C.amberBright, false],
      [this.t('stat.upgrades'), this.n(checkpoint?.stats?.upgrades || 0), C.cyanBright, false],
      [this.t('stat.bestWave'), this.n(this.highWave), C.cyan, false],
      [this.t('stat.highScore'), this.n(this.highScore), C.amber, false],
      [this.t('stat.sector'), this.t(`stage.${sector}`), C.green, true],
    ];
    drawSurface(this.ctx, rect, {
      fill: 'rgba(3,12,19,0.82)', border: 'rgba(83,205,245,0.22)', cut: 10, accent: C.cyan,
    });
    const titleX = rtl ? rect.x + rect.w - 24 : rect.x + 24;
    this.localText(this.t('menu.runSnapshot'), titleX, rect.y + 22, {
      size: 10.2, color: C.cyanBright, weight: 900, align: rtl ? 'right' : 'left',
    });
    const top = rect.y + 39;
    const rowH = 32;
    const colW = (rect.w - 34) / 3;
    entries.forEach(([label, value, color, localized], index) => {
      const row = Math.floor(index / 3);
      const logicalCol = index % 3;
      const col = rtl ? 2 - logicalCol : logicalCol;
      const x = rect.x + 17 + col * colW;
      const align = rtl ? 'right' : 'left';
      const textX = rtl ? x + colW - 14 : x + 14;
      if (logicalCol > 0) {
        const dividerX = rtl ? x + colW : x;
        this.ctx.fillStyle = 'rgba(255,255,255,0.055)';
        this.ctx.fillRect(dividerX, top + row * rowH + 2, 1, rowH - 7);
      }
      this.localText(label, textX, top + row * rowH + 10, {
        size: 7.3, color: C.textMuted, weight: 760, align,
      });
      if (localized) this.localText(value, textX, top + row * rowH + 27, { size: 10.8, color, weight: 900, align });
      else drawText(this.ctx, value, textX, top + row * rowH + 27, { size: 11.5, color, weight: 900, align, direction: 'ltr' });
    });
  }

  drawTouchDashboard(checkpoint, wave, sector) {
    const rtl = this.rtl();
    const accent = checkpoint ? C.amber : C.cyan;
    const hero = { x: 44, y: 112, w: 1192, h: 344 };
    drawSurface(this.ctx, hero, {
      fill: 'rgba(3,12,19,0.80)', border: withAlpha(accent, '38'), cut: 14, accent,
    });

    const textX = rtl ? hero.x + hero.w - 36 : hero.x + 36;
    const align = rtl ? 'right' : 'left';
    this.localText(checkpoint ? this.t('menu.currentRun') : this.t('menu.freshRun'), textX, hero.y + 34, {
      size: 10.5, color: C.cyanBright, weight: 900, align,
    });
    this.localText(this.t(`stage.${sector}`), textX, hero.y + 68, {
      size: 22, color: C.text, weight: 900, align,
    });
    this.localText(`${this.t('stat.sector')} ${String(sector + 1).padStart(2, '0')}`, textX, hero.y + 91, {
      size: 8.4, color: C.cyan, weight: 850, align,
    });
    drawText(this.ctx, String(wave).padStart(2, '0'), textX, hero.y + 174, {
      size: 78, color: checkpoint ? C.amberBright : C.cyanBright, weight: 900, align, direction: 'ltr',
    });
    this.localText(this.t('stat.wave'), textX, hero.y + 198, {
      size: 10, color: C.textSoft, weight: 850, align,
    });

    this.drawRunRadar(WIDTH / 2, hero.y + 105, 74, wave, sector);

    const strip = { x: hero.x + 28, y: hero.y + 205, w: hero.w - 56, h: 50 };
    drawSurface(this.ctx, strip, { fill: 'rgba(1,7,12,0.65)', border: 'rgba(255,255,255,0.08)', cut: 7 });
    const data = [
      [this.t('stat.score'), this.n(checkpoint?.score || 0), C.amberBright, 'score', false],
      [this.t('stat.upgrades'), this.n(checkpoint?.stats?.upgrades || 0), C.cyanBright, 'upgrade', false],
      [this.t('stat.checkpoint'), checkpoint ? this.t('stat.ready') : this.t('stat.empty'), checkpoint ? C.green : C.textMuted, 'checkpoint', true],
    ];
    data.forEach(([label, value, color, icon, localized], index) => {
      const colW = strip.w / 3;
      const col = rtl ? 2 - index : index;
      const x = strip.x + col * colW;
      const iconX = rtl ? x + colW - 28 : x + 28;
      const tx = rtl ? x + colW - 50 : x + 50;
      const statAlign = rtl ? 'right' : 'left';
      if (col > 0) { this.ctx.fillStyle = 'rgba(255,255,255,0.07)'; this.ctx.fillRect(x, strip.y + 11, 1, strip.h - 22); }
      drawUiIcon(this.ctx, icon, iconX, strip.y + 25, { color, scale: 0.56 });
      this.localText(label, tx, strip.y + 18, { size: 7.8, color: C.textMuted, weight: 760, align: statAlign });
      if (localized) this.localText(value, tx, strip.y + 38, { size: 11.4, color, weight: 900, align: statAlign });
      else drawText(this.ctx, value, tx, strip.y + 39, { size: 13, color, weight: 900, align: statAlign, direction: 'ltr' });
    });

    const primary = { x: hero.x + 190, y: hero.y + 265, w: hero.w - 380, h: 46 };
    this.uiButton(primary, checkpoint ? 'touch-continue' : 'touch-start', checkpoint ? this.t('menu.continue') : this.t('menu.start'),
      checkpoint ? () => this.continueFromCheckpoint() : () => this.startRun(),
      { primary: true, icon: 'bullet', meta: this.t('wave.incoming', { wave: String(wave).padStart(2, '0') }), metaLocalized: true });

    if (checkpoint) {
      const gap = 16;
      const w = (primary.w - gap) / 2;
      const y = hero.y + 316;
      this.uiButton({ x: primary.x, y, w, h: 36 }, 'touch-new', this.t('menu.newRun'), () => this.startRun(), { icon: 'restart' });
      const deleteArmed = this.deleteConfirmUntil > this.elapsed;
      this.uiButton({ x: primary.x + w + gap, y, w, h: 36 }, 'touch-delete', deleteArmed ? this.t('menu.confirmDelete') : this.t('menu.deleteSave'), () => this.requestCheckpointDelete(), { danger: true, icon: 'checkpoint', active: deleteArmed });
    }

    this.drawCompactRunSnapshot({ x: 44, y: 468, w: 1192, h: 112 }, checkpoint);
    this.drawWorldTimeline({ x: 44, y: 590, w: 1192, h: 104 }, wave);
  }

'''
marker = '  drawMenu() {'
if marker not in runtime:
    raise RuntimeError('drawMenu marker missing')
runtime = runtime.replace(marker, mobile_methods + marker, 1)

runtime = replace_once(
    runtime,
    "    this.drawGlobalBackground();\n    this.drawTopUtility();\n\n    const hero = rtl ?",
    "    this.drawGlobalBackground();\n    this.drawTopUtility();\n    if (this.touchMode) {\n      this.drawTouchDashboard(checkpoint, wave, sector);\n      this.drawMenuSettingsPanel();\n      return;\n    }\n\n    const hero = rtl ?",
)

RUNTIME.write_text(runtime, encoding='utf-8')
print('mobile stacked dashboard applied')
