import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from './content.js';

const STORAGE_KEY = 'one-bullet-arena-ui-settings';
const FONT = 'Changa, "Segoe UI", Tahoma, sans-serif';
const NUMERIC_FONT = 'Inter, "Segoe UI", Arial, sans-serif';

const THEME = {
  bg: '#050711',
  panel: 'rgba(10, 14, 29, 0.94)',
  panelSoft: 'rgba(14, 20, 40, 0.86)',
  border: '#33406f',
  cyan: '#62f3ff',
  cyanSoft: 'rgba(98, 243, 255, 0.16)',
  yellow: '#ffe66d',
  yellowSoft: 'rgba(255, 230, 109, 0.16)',
  red: '#ff526a',
  green: '#65f59a',
  purple: '#b983ff',
  text: '#f8f9ff',
  muted: '#929bbf',
  darkMuted: '#576080',
};

const DEFAULT_UI_SETTINGS = Object.freeze({
  screenShake: true,
  reduceMotion: false,
  damageNumbers: true,
  latinDigits: true,
  highContrast: false,
});

const UPGRADE_META = {
  'heavy-core': { icon: '◆', category: 'هجومي', metric: '+1 ضرر' },
  'hot-ricochet': { icon: '↗', category: 'ارتداد', metric: '+55٪ لكل ارتداد' },
  'magnetic-recall': { icon: '◎', category: 'تحكم', metric: 'استدعاء أسرع' },
  'shock-impact': { icon: 'ϟ', category: 'جماعي', metric: 'موجة كهربائية' },
  'extended-charge': { icon: '∞', category: 'مسار', metric: '+2 ارتداد' },
  'quick-recovery': { icon: '»', category: 'حركة', metric: '-22٪ انتظار' },
  'last-heart': { icon: '♥', category: 'مجازفة', metric: '×2 ضرر' },
  'perfect-catch': { icon: '✦', category: 'مهارة', metric: 'درع + نقاط' },
};

export function calculateRank({ score = 0, hits = 0, shots = 0, runTime = 999, victory = false } = {}) {
  const accuracy = shots > 0 ? hits / shots : 0;
  let points = Math.min(45, score / 400);
  points += Math.min(30, accuracy * 35);
  points += Math.max(0, 20 - Math.max(0, runTime - 110) * 0.18);
  if (victory) points += 12;
  if (points >= 88) return 'S';
  if (points >= 72) return 'A';
  if (points >= 55) return 'B';
  return 'C';
}

export function formatUiNumber(value, latinDigits = true, options = {}) {
  const locale = latinDigits ? 'en-US' : 'ar-EG';
  return new Intl.NumberFormat(locale, options).format(value);
}

function loadSettings() {
  try {
    return { ...DEFAULT_UI_SETTINGS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return { ...DEFAULT_UI_SETTINGS };
  }
}

function ensureSettings(game) {
  if (!game.uiSettings) game.uiSettings = loadSettings();
  return game.uiSettings;
}

function saveSettings(game) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ensureSettings(game)));
}

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

function panel(ctx, x, y, width, height, accent = THEME.border, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = THEME.panel;
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

function drawLabel(ctx, text, x, y, size, color = THEME.text, weight = 700, align = 'center', direction = 'rtl') {
  ctx.save();
  ctx.direction = direction;
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawNumber(ctx, value, x, y, size, color = THEME.text, align = 'center') {
  ctx.save();
  ctx.direction = 'ltr';
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.font = `800 ${size}px ${NUMERIC_FONT}`;
  ctx.fillText(String(value), x, y);
  ctx.restore();
}

function dim(ctx, alpha = 0.9) {
  const gradient = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 60, WIDTH / 2, HEIGHT / 2, 720);
  gradient.addColorStop(0, `rgba(8, 11, 24, ${Math.max(0, alpha - 0.08)})`);
  gradient.addColorStop(1, `rgba(1, 2, 7, ${alpha})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawSpeedLines(ctx, elapsed, color = THEME.cyan, strength = 1) {
  ctx.save();
  ctx.globalAlpha = 0.11 * strength;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  const centerX = WIDTH / 2;
  const centerY = HEIGHT / 2;
  for (let index = 0; index < 34; index += 1) {
    const angle = index / 34 * Math.PI * 2 + elapsed * 0.03;
    const inner = 260 + (index % 4) * 24;
    const outer = 760 + (index % 5) * 35;
    ctx.beginPath();
    ctx.moveTo(centerX + Math.cos(angle) * inner, centerY + Math.sin(angle) * inner);
    ctx.lineTo(centerX + Math.cos(angle) * outer, centerY + Math.sin(angle) * outer);
    ctx.stroke();
  }
  ctx.restore();
}

function toggleRow(game, label, key, x, y, width = 390) {
  const ctx = game.ctx;
  const settings = ensureSettings(game);
  const enabled = Boolean(settings[key]);
  ctx.save();
  ctx.fillStyle = enabled ? THEME.cyanSoft : 'rgba(87, 96, 128, 0.12)';
  ctx.strokeStyle = enabled ? THEME.cyan : THEME.border;
  ctx.lineWidth = 2;
  roundedRect(ctx, x, y, width, 48, 14);
  ctx.fill();
  ctx.stroke();
  drawLabel(ctx, label, x + width - 20, y + 31, 17, enabled ? THEME.text : THEME.muted, 700, 'right');
  ctx.fillStyle = enabled ? THEME.cyan : THEME.darkMuted;
  roundedRect(ctx, x + 18, y + 12, 52, 24, 12);
  ctx.fill();
  ctx.fillStyle = THEME.bg;
  ctx.beginPath();
  ctx.arc(enabled ? x + 57 : x + 31, y + 24, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  game.addUiRegion(x, y, width, 48, () => {
    settings[key] = !settings[key];
    saveSettings(game);
    game.audio.play('click');
  });
}

function resultMessage(rank, victory) {
  if (!victory) return 'الجولة انتهت، لكن الزوايا التي تعلمتها ستبقى معك.';
  if (rank === 'S') return 'سيد الارتدادات — طلقة واحدة كانت كافية.';
  if (rank === 'A') return 'سيطرة حادة ودقة تستحق الإعادة.';
  if (rank === 'B') return 'انتصار قوي، وما زال هناك وقت لأداء أنظف.';
  return 'أسقطت الحارس. الجولة القادمة ستكون أسرع.';
}

function drawStatCard(ctx, label, value, icon, x, y, accent) {
  ctx.save();
  ctx.fillStyle = THEME.panelSoft;
  ctx.strokeStyle = 'rgba(90, 108, 174, 0.48)';
  ctx.lineWidth = 1.5;
  roundedRect(ctx, x, y, 214, 82, 14);
  ctx.fill();
  ctx.stroke();
  drawLabel(ctx, icon, x + 184, y + 33, 23, accent, 800);
  drawLabel(ctx, label, x + 155, y + 28, 14, THEME.muted, 600, 'right');
  drawNumber(ctx, value, x + 155, y + 60, 23, THEME.text, 'right');
  ctx.restore();
}

function drawBulletLocator(game) {
  if (game.bullet.held) return;
  const dx = game.bullet.x - game.player.x;
  const dy = game.bullet.y - game.player.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 210) return;
  const angle = Math.atan2(dy, dx);
  const radius = 74;
  const x = game.player.x + Math.cos(angle) * radius;
  const y = game.player.y + Math.sin(angle) * radius;
  const ctx = game.ctx;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = distance > 520 ? THEME.red : THEME.yellow;
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(17, 0);
  ctx.lineTo(-10, -10);
  ctx.lineTo(-5, 0);
  ctx.lineTo(-10, 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawFullscreenHint(ctx, active) {
  ctx.save();
  ctx.globalAlpha = active ? 0.95 : 0.55;
  drawLabel(ctx, 'F  وضع ملء الشاشة', WIDTH / 2, HEIGHT - 18, 13, THEME.muted, 600);
  ctx.restore();
}

export function installUiPolish(GameClass) {
  const prototype = GameClass.prototype;
  if (prototype.__uiPolishInstalled) return;
  prototype.__uiPolishInstalled = true;

  const originalDraw = prototype.draw;
  const originalDrawFloatingTexts = prototype.drawFloatingTexts;
  const originalStartRun = prototype.startRun;
  const originalFinishRun = prototype.finishRun;

  prototype.startRun = function startRunWithTransition(...args) {
    ensureSettings(this);
    this.uiTransition = ensureSettings(this).reduceMotion ? 0 : 0.42;
    return originalStartRun.apply(this, args);
  };

  prototype.finishRun = function finishRunWithTransition(victory) {
    this.uiTransition = ensureSettings(this).reduceMotion ? 0 : 0.58;
    return originalFinishRun.call(this, victory);
  };

  prototype.draw = function drawWithPresentation() {
    const settings = ensureSettings(this);
    const savedShake = this.shake;
    if (!settings.screenShake) this.shake = 0;
    originalDraw.call(this);
    this.shake = savedShake;

    if (this.uiTransition > 0 && !settings.reduceMotion) {
      const progress = this.uiTransition / 0.58;
      const ctx = this.ctx;
      ctx.save();
      ctx.globalAlpha = Math.min(0.85, progress * 1.2);
      ctx.translate(WIDTH * (1 - progress) - 250, 0);
      ctx.fillStyle = THEME.cyan;
      ctx.transform(1, 0, -0.42, 1, 0, 0);
      ctx.fillRect(0, 0, 260, HEIGHT);
      ctx.fillStyle = THEME.yellow;
      ctx.fillRect(270, 0, 42, HEIGHT);
      ctx.restore();
      this.uiTransition = Math.max(0, this.uiTransition - 0.025);
    }
  };

  prototype.drawFloatingTexts = function drawFloatingTextsWithSetting() {
    if (!ensureSettings(this).damageNumbers) return;
    originalDrawFloatingTexts.call(this);
  };

  prototype.drawMenu = function drawPolishedMenu() {
    const settings = ensureSettings(this);
    const ctx = this.ctx;
    if (!settings.reduceMotion) drawSpeedLines(ctx, this.elapsed, THEME.cyan, 0.85);

    const float = settings.reduceMotion ? 0 : Math.sin(this.elapsed * 2.15) * 6;
    ctx.save();
    ctx.translate(0, float);
    drawLabel(ctx, 'حلبة الطلقة', WIDTH / 2, 178, 74, THEME.text, 900);
    drawLabel(ctx, 'الواحدة', WIDTH / 2, 250, 76, THEME.yellow, 900);
    ctx.restore();
    drawLabel(ctx, 'طلقة واحدة • ارتدادات محسوبة • لا مكان للإهدار', WIDTH / 2, 298, 19, THEME.muted, 500);

    panel(ctx, WIDTH / 2 - 230, 334, 460, 242, THEME.cyan, 0.9);
    this.drawButton('ابدأ الجولة', WIDTH / 2 - 180, 360, 360, 56, () => this.startRun(), true);
    this.drawButton('طريقة اللعب', WIDTH / 2 - 180, 428, 360, 52, () => { this.audio.play('click'); this.state = 'howto'; });
    this.drawButton('الإعدادات', WIDTH / 2 - 180, 492, 360, 52, () => this.openSettings('menu'));

    const digits = settings.latinDigits;
    drawLabel(ctx, 'أعلى نتيجة', WIDTH / 2 + 176, 616, 14, THEME.muted, 500, 'right');
    drawNumber(ctx, formatUiNumber(this.highScore, digits), WIDTH / 2 + 176, 641, 20, THEME.text, 'right');
    drawLabel(ctx, 'أفضل موجة', WIDTH / 2 - 176, 616, 14, THEME.muted, 500, 'left');
    drawNumber(ctx, formatUiNumber(this.highWave, digits), WIDTH / 2 - 176, 641, 20, THEME.text, 'left');
    drawFullscreenHint(ctx, false);
  };

  prototype.drawHud = function drawPolishedHud() {
    const settings = ensureSettings(this);
    const ctx = this.ctx;
    const digits = settings.latinDigits;

    panel(ctx, WIDTH - 346, 18, 328, 82, this.boss ? THEME.red : THEME.cyan, 0.83);
    drawLabel(ctx, this.boss ? 'معركة حارس النواة' : `الموجة ${formatUiNumber(this.wave, digits)} / 5`, WIDTH - 42, 49, 18, THEME.text, 800, 'right');
    drawNumber(ctx, formatUiNumber(this.score, digits), WIDTH - 42, 76, 18, THEME.muted, 'right');
    for (let index = 0; index < this.player.maxHealth; index += 1) {
      ctx.fillStyle = index < this.player.health ? THEME.red : '#242a42';
      ctx.beginPath();
      ctx.arc(WIDTH - 300 + index * 29, 75, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    const ready = this.bullet.held;
    panel(ctx, 18, 18, 304, 82, ready ? THEME.yellow : THEME.border, 0.83);
    drawLabel(ctx, ready ? 'الطلقة جاهزة' : this.bullet.recalling ? 'الطلقة عائدة' : 'استعد الطلقة', 296, 48, 18, ready ? THEME.yellow : THEME.text, 800, 'right');
    const dashText = this.player.dashCooldown <= 0 ? 'الاندفاع جاهز' : `الاندفاع ${this.player.dashCooldown.toFixed(1)} ث`;
    drawLabel(ctx, dashText, 296, 75, 14, THEME.muted, 500, 'right');

    if (!ready) {
      const remaining = Math.max(0, this.bullet.bouncesRemaining);
      drawLabel(ctx, `ارتدادات ${formatUiNumber(remaining, digits)}`, 42, 75, 13, THEME.muted, 600, 'left');
      drawBulletLocator(this);
    }

    if (this.combo > 1 && this.comboTimer > 0) {
      drawLabel(ctx, `كومبو ×${formatUiNumber(this.combo, digits)}`, WIDTH / 2, 49, 27, THEME.yellow, 900);
    }
    if (this.boss) this.drawBossHealthBar();
  };

  prototype.drawSettings = function drawPolishedSettings() {
    const ctx = this.ctx;
    const settings = ensureSettings(this);
    dim(ctx, 0.92);
    panel(ctx, 120, 48, 1040, 624, THEME.cyan);
    drawLabel(ctx, 'الإعدادات', WIDTH / 2, 108, 43, THEME.text, 900);
    drawLabel(ctx, 'الصوت', 905, 155, 22, THEME.yellow, 800);
    drawLabel(ctx, 'العرض والوصول', 520, 155, 22, THEME.cyan, 800);

    this.drawVolumeControl('الموسيقى', this.audio.settings.music, 205, (value) => this.audio.setMusic(value));
    this.drawVolumeControl('المؤثرات الصوتية', this.audio.settings.sfx, 300, (value) => { this.audio.setSfx(value); this.audio.play('click'); });
    this.drawButton(this.audio.settings.muted ? 'تشغيل الصوت' : 'كتم الصوت', 700, 382, 300, 52, () => { this.audio.toggleMute(); this.audio.play('click'); }, !this.audio.settings.muted);

    toggleRow(this, 'اهتزاز الشاشة', 'screenShake', 180, 184);
    toggleRow(this, 'تقليل الحركة', 'reduceMotion', 180, 244);
    toggleRow(this, 'إظهار أرقام الضرر', 'damageNumbers', 180, 304);
    toggleRow(this, 'استخدام أرقام إنجليزية', 'latinDigits', 180, 364);
    toggleRow(this, 'تباين مرتفع', 'highContrast', 180, 424);

    this.drawButton('ملء الشاشة', 180, 510, 390, 52, () => {
      document.querySelector('#fullscreen-toggle')?.click();
      this.audio.play('click');
    });
    this.drawButton('حفظ والعودة', 700, 552, 300, 55, () => {
      saveSettings(this);
      this.audio.play('click');
      this.state = this.settingsReturnState;
      if (this.state === 'playing') this.audio.setScene(this.boss ? 'boss' : 'combat');
    }, true);

    drawLabel(ctx, 'يمكن تغيير كل الإعدادات أثناء اللعب من قائمة الإيقاف.', WIDTH / 2, 642, 14, THEME.muted, 500);
  };

  prototype.drawUpgradeSelection = function drawPolishedUpgradeSelection() {
    const ctx = this.ctx;
    const settings = ensureSettings(this);
    dim(ctx, 0.93);
    if (!settings.reduceMotion) drawSpeedLines(ctx, this.elapsed, THEME.yellow, 0.7);
    drawLabel(ctx, this.pendingStage === 'boss' ? 'اختيارك الأخير' : 'اختر تطويرًا واحدًا', WIDTH / 2, 88, 42, THEME.yellow, 900);
    drawLabel(ctx, 'راقب الفرق الرقمي، ثم ابنِ أسلوب جولتك.', WIDTH / 2, 122, 17, THEME.muted, 500);
    const cardWidth = 332;
    const gap = 28;
    const total = this.upgradeChoices.length * cardWidth + Math.max(0, this.upgradeChoices.length - 1) * gap;
    const start = WIDTH / 2 - total / 2;
    this.upgradeChoices.forEach((upgrade, index) => this.drawUpgradeCard(upgrade, index, start + index * (cardWidth + gap), 162));
  };

  prototype.drawUpgradeCard = function drawPolishedUpgradeCard(upgrade, index, x, y) {
    const ctx = this.ctx;
    const width = 332;
    const height = 392;
    const hovered = this.pointer.x >= x && this.pointer.x <= x + width && this.pointer.y >= y && this.pointer.y <= y + height;
    const meta = UPGRADE_META[upgrade.id] || { icon: '◆', category: upgrade.tag, metric: 'تحسين مباشر' };
    const current = this.stack(upgrade.id);

    ctx.save();
    ctx.fillStyle = hovered ? 'rgba(27, 35, 65, 0.97)' : THEME.panel;
    ctx.strokeStyle = hovered ? THEME.yellow : THEME.border;
    ctx.lineWidth = hovered ? 3 : 2;
    ctx.shadowColor = hovered ? THEME.yellow : 'rgba(0,0,0,.5)';
    ctx.shadowBlur = hovered ? 24 : 10;
    roundedRect(ctx, x, y, width, height, 20);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = hovered ? THEME.yellowSoft : THEME.cyanSoft;
    roundedRect(ctx, x + 22, y + 22, 64, 64, 17);
    ctx.fill();
    drawLabel(ctx, meta.icon, x + 54, y + 66, 34, hovered ? THEME.yellow : THEME.cyan, 900);
    drawLabel(ctx, `${index + 1}  •  ${meta.category}`, x + width - 24, y + 48, 14, THEME.muted, 700, 'right');
    drawLabel(ctx, upgrade.name, x + width - 24, y + 112, 25, THEME.text, 900, 'right');

    ctx.save();
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillStyle = THEME.muted;
    ctx.font = `500 17px ${FONT}`;
    wrapText(ctx, upgrade.description, x + width - 24, y + 156, width - 48, 28);
    ctx.restore();

    ctx.fillStyle = 'rgba(98, 243, 255, 0.08)';
    roundedRect(ctx, x + 22, y + 238, width - 44, 58, 13);
    ctx.fill();
    drawLabel(ctx, meta.metric, x + width - 38, y + 274, 17, THEME.cyan, 800, 'right');
    drawLabel(ctx, `المستوى ${current}  ←  ${Math.min(upgrade.maxStacks, current + 1)}`, x + width - 24, y + 334, 15, THEME.muted, 600, 'right');

    for (let stack = 0; stack < upgrade.maxStacks; stack += 1) {
      ctx.fillStyle = stack < current ? THEME.cyan : stack === current ? THEME.yellow : '#28304f';
      roundedRect(ctx, x + 24 + stack * 28, y + 320, 20, 7, 4);
      ctx.fill();
    }
    drawLabel(ctx, hovered ? 'اضغط للاختيار' : 'اختيار سريع', x + width / 2, y + 374, 14, hovered ? THEME.yellow : THEME.darkMuted, 700);
    this.addUiRegion(x, y, width, height, () => this.chooseUpgrade(index));
  };

  prototype.drawBanner = function drawPolishedBanner() {
    const settings = ensureSettings(this);
    const ctx = this.ctx;
    const alpha = Math.min(1, Math.max(0, this.banner.time * 1.8));
    ctx.save();
    ctx.globalAlpha = alpha;
    if (!settings.reduceMotion) {
      ctx.strokeStyle = THEME.cyan;
      ctx.globalAlpha *= 0.18;
      for (let index = 0; index < 18; index += 1) {
        const y = 210 + index * 18;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(320 + index * 24, y - 72);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(WIDTH, y);
        ctx.lineTo(WIDTH - 320 - index * 24, y - 72);
        ctx.stroke();
      }
      ctx.globalAlpha = alpha;
    }
    panel(ctx, WIDTH / 2 - 320, HEIGHT / 2 - 72, 640, 144, THEME.cyan, 0.9);
    drawLabel(ctx, this.banner.title, WIDTH / 2, HEIGHT / 2 - 8, 38, THEME.text, 900);
    drawLabel(ctx, this.banner.subtitle, WIDTH / 2, HEIGHT / 2 + 33, 17, THEME.yellow, 600);
    ctx.restore();
  };

  prototype.drawBossIntro = function drawPolishedBossIntro() {
    const settings = ensureSettings(this);
    const ctx = this.ctx;
    dim(ctx, 0.87);
    if (!settings.reduceMotion) drawSpeedLines(ctx, this.elapsed * 2, THEME.red, 1.35);
    ctx.fillStyle = 'rgba(255, 82, 106, 0.13)';
    ctx.fillRect(0, 262, WIDTH, 176);
    drawLabel(ctx, 'تحذير', WIDTH / 2, 220, 18, THEME.yellow, 800);
    drawLabel(ctx, 'حارس النواة', WIDTH / 2, 336, 76, THEME.red, 900);
    drawLabel(ctx, 'الدرع الأول لا ينكسر إلا بطلقة مرتدة', WIDTH / 2, 392, 20, THEME.text, 700);
  };

  prototype.drawResult = function drawPolishedResult(victory) {
    const ctx = this.ctx;
    const settings = ensureSettings(this);
    dim(ctx, 0.96);
    if (!settings.reduceMotion) drawSpeedLines(ctx, this.elapsed, victory ? THEME.green : THEME.red, 0.65);

    const rank = calculateRank({
      score: this.score,
      hits: this.stats.hits,
      shots: this.stats.shots,
      runTime: this.runTime,
      victory,
    });
    const accent = victory ? THEME.green : THEME.red;
    drawLabel(ctx, victory ? 'تم إسقاط حارس النواة' : 'انتهت الجولة', WIDTH / 2, 105, 48, accent, 900);
    drawLabel(ctx, resultMessage(rank, victory), WIDTH / 2, 142, 17, THEME.text, 600);

    panel(ctx, 154, 172, 972, 378, accent);
    drawLabel(ctx, 'تقييم الجولة', 1030, 218, 15, THEME.muted, 600, 'right');
    drawNumber(ctx, rank, 1018, 300, 86, rank === 'S' ? THEME.yellow : accent, 'center');

    const digits = settings.latinDigits;
    const time = `${formatUiNumber(this.runTime, digits, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ث`;
    const stats = [
      ['النقاط', formatUiNumber(this.score, digits), '◆', THEME.yellow],
      ['الوقت', time, '◷', THEME.cyan],
      ['الإطلاقات', formatUiNumber(this.stats.shots, digits), '➤', THEME.purple],
      ['الإصابات', formatUiNumber(this.stats.hits, digits), '✦', THEME.green],
      ['الارتدادات', formatUiNumber(this.stats.ricochets, digits), '↗', THEME.yellow],
      ['الأعداء', formatUiNumber(this.stats.kills, digits), '×', THEME.red],
    ];
    stats.forEach(([label, value, icon, color], index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      drawStatCard(ctx, label, value, icon, 210 + column * 236, 208 + row * 102, color);
    });

    this.drawButton('العب من جديد', 240, 582, 350, 58, () => this.startRun(), true);
    this.drawButton('القائمة الرئيسية', 690, 582, 350, 58, () => { this.audio.play('click'); this.goToMenu(); });
    drawLabel(ctx, `أعلى نتيجة: ${formatUiNumber(this.highScore, digits)}`, WIDTH / 2, 674, 14, THEME.muted, 500);
  };
}

export function attachPresentationControls(game) {
  ensureSettings(game);
  const fullscreenButton = document.querySelector('#fullscreen-toggle');
  const stage = document.querySelector('#game-stage');
  const status = document.querySelector('#presentation-status');

  const updateFullscreenState = () => {
    const active = Boolean(document.fullscreenElement);
    document.body.classList.toggle('is-fullscreen', active);
    if (fullscreenButton) fullscreenButton.textContent = active ? 'إنهاء ملء الشاشة' : 'ملء الشاشة';
    if (status) status.textContent = active ? 'وضع التركيز مفعّل' : 'جاهز للعب';
    game.canvas.focus();
  };

  fullscreenButton?.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await stage?.requestFullscreen();
    } catch {
      if (status) status.textContent = 'المتصفح منع ملء الشاشة';
    }
  });
  document.addEventListener('fullscreenchange', updateFullscreenState);
  window.addEventListener('keydown', (event) => {
    if (event.code !== 'KeyF' || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    fullscreenButton?.click();
  });
  updateFullscreenState();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(' ');
  let line = '';
  let lineIndex = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + lineIndex * lineHeight);
      line = word;
      lineIndex += 1;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, y + lineIndex * lineHeight);
}
