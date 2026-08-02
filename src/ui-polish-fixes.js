const STORAGE_KEY = 'one-bullet-arena-ui-settings';
const FONT = 'Changa, "Segoe UI", Tahoma, sans-serif';
const COLORS = {
  panel: 'rgba(10, 14, 29, 0.96)',
  border: '#33406f',
  cyan: '#62f3ff',
  yellow: '#ffe66d',
  text: '#f8f9ff',
  muted: '#929bbf',
  track: '#252d4b',
};

function roundedRect(ctx, x, y, width, height, radius = 16) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function label(ctx, text, x, y, size, color = COLORS.text, weight = 700, align = 'center') {
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function save(game) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(game.uiSettings || {}));
}

function drawPanel(ctx, x, y, width, height, accent = COLORS.border) {
  ctx.save();
  ctx.fillStyle = COLORS.panel;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 16;
  roundedRect(ctx, x, y, width, height, 18);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();
  ctx.restore();
}

function drawToggle(game, text, key, x, y, width = 390) {
  const ctx = game.ctx;
  const enabled = Boolean(game.uiSettings?.[key]);
  ctx.fillStyle = enabled ? 'rgba(98, 243, 255, 0.15)' : 'rgba(87, 96, 128, 0.11)';
  ctx.strokeStyle = enabled ? COLORS.cyan : COLORS.border;
  ctx.lineWidth = 2;
  roundedRect(ctx, x, y, width, 48, 14);
  ctx.fill();
  ctx.stroke();
  label(ctx, text, x + width - 18, y + 31, 17, enabled ? COLORS.text : COLORS.muted, 700, 'right');

  ctx.fillStyle = enabled ? COLORS.cyan : '#576080';
  roundedRect(ctx, x + 18, y + 12, 52, 24, 12);
  ctx.fill();
  ctx.fillStyle = '#050711';
  ctx.beginPath();
  ctx.arc(enabled ? x + 57 : x + 31, y + 24, 9, 0, Math.PI * 2);
  ctx.fill();

  game.addUiRegion(x, y, width, 48, () => {
    game.uiSettings[key] = !game.uiSettings[key];
    save(game);
    game.audio.play('click');
  });
}

function drawVolume(game, text, value, x, y, setter) {
  const ctx = game.ctx;
  const width = 390;
  label(ctx, text, x + width, y + 20, 18, COLORS.text, 700, 'right');
  ctx.save();
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.muted;
  ctx.font = `700 15px Inter, "Segoe UI", sans-serif`;
  ctx.fillText(`${Math.round(value * 100)}%`, x, y + 20);
  ctx.restore();

  const barY = y + 35;
  ctx.fillStyle = COLORS.track;
  roundedRect(ctx, x, barY, width, 18, 9);
  ctx.fill();
  ctx.fillStyle = COLORS.cyan;
  roundedRect(ctx, x, barY, Math.max(10, width * value), 18, 9);
  ctx.fill();
  ctx.fillStyle = COLORS.text;
  ctx.beginPath();
  ctx.arc(x + width * value, barY + 9, 10, 0, Math.PI * 2);
  ctx.fill();

  for (let index = 0; index <= 10; index += 1) {
    const segmentX = x + index / 11 * width;
    game.addUiRegion(segmentX, barY - 13, width / 11, 44, () => setter(index / 10));
  }
}

export function installUiPolishFixes(GameClass) {
  const prototype = GameClass.prototype;
  if (prototype.__uiPolishFixesInstalled) return;
  prototype.__uiPolishFixesInstalled = true;

  const polishedDraw = prototype.draw;
  prototype.draw = function drawWithDocumentPresentation() {
    const settings = this.uiSettings || {};
    document.body.classList.toggle('high-contrast', Boolean(settings.highContrast));
    document.body.classList.toggle('reduce-motion', Boolean(settings.reduceMotion));
    polishedDraw.call(this);
  };

  prototype.drawSettings = function drawRefinedSettings() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(2, 3, 9, 0.94)';
    ctx.fillRect(0, 0, 1280, 720);
    drawPanel(ctx, 105, 42, 1070, 636, COLORS.cyan);
    label(ctx, 'الإعدادات', 640, 101, 43, COLORS.text, 900);
    label(ctx, 'العرض والوصول', 375, 152, 22, COLORS.cyan, 800);
    label(ctx, 'الصوت والتجربة', 905, 152, 22, COLORS.yellow, 800);

    drawToggle(this, 'اهتزاز الشاشة', 'screenShake', 160, 182);
    drawToggle(this, 'تقليل الحركة', 'reduceMotion', 160, 242);
    drawToggle(this, 'إظهار أرقام الضرر', 'damageNumbers', 160, 302);
    drawToggle(this, 'استخدام أرقام إنجليزية', 'latinDigits', 160, 362);
    drawToggle(this, 'تباين مرتفع', 'highContrast', 160, 422);

    drawVolume(this, 'الموسيقى', this.audio.settings.music, 690, 190, (value) => this.audio.setMusic(value));
    drawVolume(this, 'المؤثرات الصوتية', this.audio.settings.sfx, 690, 286, (value) => {
      this.audio.setSfx(value);
      this.audio.play('click');
    });

    this.drawButton(this.audio.settings.muted ? 'تشغيل الصوت' : 'كتم الصوت', 690, 390, 390, 52, () => {
      this.audio.toggleMute();
      this.audio.play('click');
    }, !this.audio.settings.muted);
    this.drawButton('ملء الشاشة', 690, 456, 390, 52, () => {
      document.querySelector('#fullscreen-toggle')?.click();
      this.audio.play('click');
    });

    this.drawButton('حفظ والعودة', 440, 573, 400, 58, () => {
      save(this);
      this.audio.play('click');
      this.state = this.settingsReturnState;
      if (this.state === 'playing') this.audio.setScene(this.boss ? 'boss' : 'combat');
    }, true);
    label(ctx, 'كل الإعدادات محفوظة تلقائيًا على هذا الجهاز.', 640, 655, 14, COLORS.muted, 500);
  };
}
