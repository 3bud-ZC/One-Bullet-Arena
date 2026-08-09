from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / 'src/core/ui-repair-runtime.js'
I18N = ROOT / 'src/i18n.js'
BROWSER_TEST = ROOT / 'tests/browser/ui-repair.spec.js'


def replace_once(text: str, old: str, new: str) -> str:
    if old not in text:
        raise RuntimeError(f'missing expected text: {old[:100]}')
    return text.replace(old, new, 1)


def replace_between(text: str, start: str, end: str, replacement: str) -> str:
    a = text.find(start)
    if a < 0:
        raise RuntimeError(f'missing start marker: {start}')
    b = text.find(end, a + len(start))
    if b < 0:
        raise RuntimeError(f'missing end marker: {end}')
    return text[:a] + replacement.rstrip() + '\n\n' + text[b:]


runtime = RUNTIME.read_text(encoding='utf-8')
runtime = replace_once(
    runtime,
    "    this.menuSettingsOpen = false;\n    this.menuSettingsOpen = false;\n",
    "    this.menuSettingsOpen = false;\n    this.deleteConfirmUntil = 0;\n",
)

ui_button = r'''  uiButton(rect, key, textValue, action, options = {}) {
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
      const metaX = this.rtl() ? rect.x + 18 : rect.x + rect.w - 18;
      const metaOptions = {
        size: 7.8,
        color: options.primary ? C.amber : C.textSoft,
        weight: 900,
        align: this.rtl() ? 'left' : 'right',
        baseline: 'middle',
      };
      if (options.metaLocalized) this.localText(options.meta, metaX, rect.y + rect.h / 2 + 1, metaOptions);
      else drawText(this.ctx, options.meta, metaX, rect.y + rect.h / 2 + 1, { ...metaOptions, direction: 'ltr' });
    }
    this.addUiRegion(rect.x, rect.y, rect.w, rect.h, action);
  }'''
runtime = replace_between(runtime, '  uiButton(', '  utilityChip(', ui_button)

language_selector = r'''  languageSelector(rect, key = 'lang') {
    const hover = this.mixUi(key, this.menuHover(rect), 0.22);
    const rtl = this.rtl();
    drawSurface(this.ctx, rect, {
      fill: `rgba(6,17,25,${0.74 + hover * 0.08})`,
      border: `rgba(83,205,245,${0.24 + hover * 0.16})`,
      cut: 8,
    });
    const iconX = rtl ? rect.x + rect.w - 18 : rect.x + 18;
    const labelX = rtl ? rect.x + rect.w - 34 : rect.x + 34;
    drawUiIcon(this.ctx, 'language', iconX, rect.y + rect.h / 2, { color: C.cyan, scale: 0.62 });
    this.localText(this.t('menu.language'), labelX, rect.y + rect.h / 2 + 1, {
      size: 7.4,
      color: C.textSoft,
      weight: 800,
      align: rtl ? 'right' : 'left',
      baseline: 'middle',
      direction: this.dir(),
    });

    const segW = 34;
    const gap = 4;
    const arX = rtl ? rect.x : rect.x + rect.w - (segW * 2 + gap);
    const enX = rtl ? rect.x + segW + gap : rect.x + rect.w - segW;
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
  }'''
runtime = replace_between(runtime, '  languageSelector(', '  toggleFullscreen()', language_selector)

# Insert a two-step destructive confirmation without changing checkpoint storage semantics.
runtime = replace_once(
    runtime,
    "  toggleAudio() {\n    const muted = this.audio.toggleMute();\n    this.announce(this.t(muted ? 'status.audioMuted' : 'status.audioEnabled'));\n  }\n\n",
    "  toggleAudio() {\n    const muted = this.audio.toggleMute();\n    this.announce(this.t(muted ? 'status.audioMuted' : 'status.audioEnabled'));\n  }\n\n  requestCheckpointDelete() {\n    if (this.deleteConfirmUntil > this.elapsed) {\n      this.deleteConfirmUntil = 0;\n      this.clearCheckpoint();\n      return true;\n    }\n    this.deleteConfirmUntil = this.elapsed + 3;\n    this.audio.play('click');\n    this.announce(this.t('status.confirmDelete'));\n    return false;\n  }\n\n",
)

# Localize functional metadata and mirror the current-run stat strip.
runtime = replace_once(
    runtime,
    "    drawText(this.ctx, `SECTOR ${String(sector + 1).padStart(2, '0')}`, textX, hero.y + 96, {\n      size: 7, color: C.cyan, weight: 850, align: textAlign, direction: 'ltr',\n    });",
    "    this.localText(`${this.t('stat.sector')} ${String(sector + 1).padStart(2, '0')}`, textX, hero.y + 96, {\n      size: 7, color: C.cyan, weight: 850, align: textAlign,\n    });",
)

old_stats = r'''    statData.forEach(([label, value, color, icon, localized], index) => {
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
    });'''
new_stats = r'''    statData.forEach(([label, value, color, icon, localized], index) => {
      const colW = strip.w / 3;
      const visualIndex = rtl ? 2 - index : index;
      const baseX = strip.x + visualIndex * colW;
      if (visualIndex > 0) {
        this.ctx.fillStyle = 'rgba(255,255,255,0.08)';
        this.ctx.fillRect(baseX, strip.y + 12, 1, strip.h - 24);
      }
      const iconX = rtl ? baseX + colW - 28 : baseX + 28;
      const valueX = rtl ? baseX + colW - 50 : baseX + 50;
      const statAlign = rtl ? 'right' : 'left';
      drawUiIcon(this.ctx, icon, iconX, strip.y + strip.h / 2, { color, scale: 0.58 });
      this.localText(label, valueX, strip.y + 21, { size: 7.2, color: C.textMuted, weight: 760, align: statAlign });
      if (localized) this.localText(value, valueX, strip.y + 42, { size: 11.2, color, weight: 900, align: statAlign });
      else drawText(this.ctx, value, valueX, strip.y + 43, { size: 13.8, color, weight: 900, align: statAlign, direction: 'ltr' });
    });'''
runtime = replace_once(runtime, old_stats, new_stats)

runtime = replace_once(
    runtime,
    "      { primary: true, icon: 'bullet', meta: `WAVE ${String(wave).padStart(2, '0')}` });",
    "      { primary: true, icon: 'bullet', meta: this.t('wave.incoming', { wave: String(wave).padStart(2, '0') }), metaLocalized: true });",
)
runtime = replace_once(
    runtime,
    "      this.uiButton({ x: primary.x + w + gap, y: secondaryY, w, h: 42 }, 'delete-save', this.t('menu.deleteSave'), () => this.clearCheckpoint(), { danger: true, icon: 'checkpoint' });",
    "      const deleteArmed = this.deleteConfirmUntil > this.elapsed;\n      this.uiButton({ x: primary.x + w + gap, y: secondaryY, w, h: 42 }, 'delete-save', deleteArmed ? this.t('menu.confirmDelete') : this.t('menu.deleteSave'), () => this.requestCheckpointDelete(), { danger: true, icon: 'checkpoint', active: deleteArmed });",
)

# Localize next-wave captions and all CTA metadata.
runtime = runtime.replace(
    "      drawText(this.ctx, `WAVE ${next}`, captionX, rect.y + rect.h - 16, {\n        size: 6.8, color: C.textMuted, weight: 820, align: rtl ? 'left' : 'right', direction: 'ltr',\n      });",
    "      this.localText(this.t('wave.incoming', { wave: next }), captionX, rect.y + rect.h - 16, {\n        size: 6.8, color: C.textMuted, weight: 820, align: rtl ? 'left' : 'right',\n      });",
)
runtime = runtime.replace(
    "      primary: true, icon: 'bullet', meta: `WAVE ${String(this.wave).padStart(2, '0')}`,",
    "      primary: true, icon: 'bullet', meta: this.t('wave.incoming', { wave: String(this.wave).padStart(2, '0') }), metaLocalized: true,",
)
runtime = runtime.replace(
    "      { primary: true, icon: 'bullet', meta: checkpoint ? `WAVE ${checkpoint.wave}` : null });",
    "      { primary: true, icon: 'bullet', meta: checkpoint ? this.t('wave.incoming', { wave: checkpoint.wave }) : null, metaLocalized: Boolean(checkpoint) });",
)

# Mirror the Game Over stat strip in RTL while keeping numeric direction LTR.
old_over = r'''    values.forEach(([label, value, color, icon, localized], index) => {
      const colW = strip.w / values.length;
      const x = strip.x + index * colW;
      if (index > 0) { this.ctx.fillStyle = 'rgba(255,255,255,0.07)'; this.ctx.fillRect(x, strip.y + 14, 1, strip.h - 28); }
      drawUiIcon(this.ctx, icon, x + 26, strip.y + 35, { color, scale: 0.50 });
      this.localText(label, x + 48, strip.y + 26, { size: 7, color: C.textMuted, weight: 760, align: 'left' });
      if (localized) this.localText(value, x + 48, strip.y + 49, { size: 10.2, color, weight: 900, align: 'left' });
      else drawText(this.ctx, value, x + 48, strip.y + 50, { size: 12.5, color, weight: 900, align: 'left', direction: 'ltr' });
    });'''
new_over = r'''    values.forEach(([label, value, color, icon, localized], index) => {
      const colW = strip.w / values.length;
      const visualIndex = rtl ? values.length - 1 - index : index;
      const x = strip.x + visualIndex * colW;
      if (visualIndex > 0) { this.ctx.fillStyle = 'rgba(255,255,255,0.07)'; this.ctx.fillRect(x, strip.y + 14, 1, strip.h - 28); }
      const iconX = rtl ? x + colW - 26 : x + 26;
      const valueX = rtl ? x + colW - 48 : x + 48;
      const statAlign = rtl ? 'right' : 'left';
      drawUiIcon(this.ctx, icon, iconX, strip.y + 35, { color, scale: 0.50 });
      this.localText(label, valueX, strip.y + 26, { size: 7, color: C.textMuted, weight: 760, align: statAlign });
      if (localized) this.localText(value, valueX, strip.y + 49, { size: 10.2, color, weight: 900, align: statAlign });
      else drawText(this.ctx, value, valueX, strip.y + 50, { size: 12.5, color, weight: 900, align: statAlign, direction: 'ltr' });
    });'''
runtime = replace_once(runtime, old_over, new_over)
RUNTIME.write_text(runtime, encoding='utf-8')

i18n = I18N.read_text(encoding='utf-8')
i18n = replace_once(i18n, "  'menu.deleteSave': 'Delete Checkpoint',\n", "  'menu.deleteSave': 'Delete Checkpoint',\n  'menu.confirmDelete': 'Confirm Delete',\n")
i18n = replace_once(i18n, "  'status.audioEnabled': 'Audio enabled.',\n", "  'status.audioEnabled': 'Audio enabled.',\n  'status.confirmDelete': 'Press delete again to confirm checkpoint removal.',\n")
i18n = replace_once(i18n, "  'menu.deleteSave': 'حذف نقطة الحفظ',\n", "  'menu.deleteSave': 'حذف نقطة الحفظ',\n  'menu.confirmDelete': 'تأكيد الحذف',\n")
i18n = replace_once(i18n, "  'status.audioEnabled': 'تم تشغيل الصوت.',\n", "  'status.audioEnabled': 'تم تشغيل الصوت.',\n  'status.confirmDelete': 'اضغط حذف مرة أخرى لتأكيد إزالة نقطة الحفظ.',\n")
I18N.write_text(i18n, encoding='utf-8')

# Expand actual viewport QA to all requested desktop sizes without duplicating the state setup.
browser = BROWSER_TEST.read_text(encoding='utf-8')
needle = "  await page.setViewportSize({ width: 1366, height: 768 });\n  await setLocaleAndDraw(page, 'en');\n  await capture(page, testInfo, 'dashboard-en-laptop-1366');\n  await page.setViewportSize({ width: 1280, height: 720 });"
replacement = "  for (const [width, height, name] of [[1366, 768, '1366'], [1440, 900, '1440'], [1600, 900, '1600'], [2560, 1440, '2560']]) {\n    await page.setViewportSize({ width, height });\n    await setLocaleAndDraw(page, 'en');\n    await capture(page, testInfo, `dashboard-en-${name}`);\n  }\n  await page.setViewportSize({ width: 1280, height: 720 });"
browser = replace_once(browser, needle, replacement)
BROWSER_TEST.write_text(browser, encoding='utf-8')

print('post-dashboard safety/localization cleanup applied')
