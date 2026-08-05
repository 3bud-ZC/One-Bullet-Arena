import { ARENA_STAGE_COUNT, pointInsideCircle, pointInsideRect } from './arena.js';
import { COLORS, GAME_HEIGHT as HEIGHT, GAME_VERSION, GAME_WIDTH as WIDTH, TOUCH_CONTROLS } from './config.js';
import { upgradePreview } from './game-data.js';

const FONT = 'Tahoma, Arial, sans-serif';

export class CanvasUi {
  constructor(context) {
    this.ctx = context;
    this.regions = [];
  }

  draw(game) {
    this.regions = [];
    if (game.state === 'menu') {
      this.drawMenu(game);
      return;
    }

    this.drawHud(game);
    if (game.state === 'playing') {
      if (game.input.touchMode) this.drawTouchControls(game);
      this.drawTutorialHint(game);
    } else if (game.state === 'upgrade') this.drawUpgradeSelection(game);
    else if (game.state === 'paused') this.drawPause(game);
    else if (game.state === 'gameover') this.drawGameOver(game);
  }

  handlePointer(point) {
    for (let index = this.regions.length - 1; index >= 0; index -= 1) {
      const region = this.regions[index];
      const inside = region.shape === 'circle'
        ? pointInsideCircle(point, region)
        : pointInsideRect(point, region);
      if (!inside) continue;
      region.action?.();
      return true;
    }
    return false;
  }

  drawHud(game) {
    const ctx = this.ctx;
    panel(ctx, 18, 18, 300, 80, game.bullet.held ? COLORS.bullet : COLORS.border);
    label(ctx, game.bullet.held ? 'الطلقة جاهزة' : game.bullet.recalling ? 'الطلقة عائدة' : 'استدعِ الطلقة', 294, 48, 19, game.bullet.held ? COLORS.bullet : COLORS.text, 900, 'right');
    const dash = game.player.dashCooldown <= 0 ? 'جاهز' : `${game.player.dashCooldown.toFixed(1)}ث`;
    const recall = game.bullet.recallCooldown <= 0 ? 'جاهز' : `${game.bullet.recallCooldown.toFixed(1)}ث`;
    label(ctx, `اندفاع ${dash}  •  استدعاء ${recall}`, 294, 76, 13, COLORS.muted, 700, 'right');

    panel(ctx, WIDTH / 2 - 148, 18, 296, 58, COLORS.border, 'rgba(10,15,31,0.9)', 4);
    label(ctx, `${game.stats.upgrades} قدرات  •  الساحة ${game.arenaStage.id + 1}/${ARENA_STAGE_COUNT}`, WIDTH / 2, 51, 14, COLORS.muted, 800);

    panel(ctx, WIDTH - 318, 18, 300, 80, COLORS.player);
    label(ctx, `الموجة ${game.wave}`, WIDTH - 42, 49, 21, COLORS.text, 900, 'right');
    label(ctx, `${game.enemies.length} أعداء  •  ${game.score.toLocaleString('en-US')} نقطة`, WIDTH - 42, 77, 13, COLORS.muted, 700, 'right');

    const healthX = WIDTH - 292;
    for (let index = 0; index < game.player.maxHealth; index += 1) {
      ctx.fillStyle = index < game.player.health ? COLORS.danger : '#252b42';
      ctx.beginPath();
      ctx.arc(healthX + index * 24, 91, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    if (game.player.shield > 0) label(ctx, 'درع', WIDTH - 42, 95, 12, COLORS.electric, 900, 'right');
  }

  drawMenu(game) {
    const ctx = this.ctx;
    const pulse = game.reducedMotion ? 1 : 1 + Math.sin(game.elapsed * 2) * 0.014;
    ctx.save();
    ctx.translate(WIDTH / 2, 134);
    ctx.scale(pulse, pulse);
    label(ctx, 'حلبة الطلقة', 0, 0, 65, COLORS.text, 900);
    label(ctx, 'الواحدة', 0, 70, 65, COLORS.bullet, 900);
    ctx.restore();

    panel(ctx, WIDTH / 2 - 420, 244, 840, 82, COLORS.border, 'rgba(9,15,33,0.74)', 5);
    label(ctx, 'طلقة واحدة فقط: أطلقها، استغل الارتدادات، ثم استدعها لتطلق من جديد.', WIDTH / 2, 278, 20, COLORS.text, 800);
    label(ctx, 'اهزم كل الأعداء واختر قدرة واحدة قبل الانتقال للموجة التالية.', WIDTH / 2, 307, 16, COLORS.muted, 650);

    this.drawButton('ابدأ الجولة', WIDTH / 2 - 200, 354, 400, 70, () => game.startRun(), true);

    panel(ctx, WIDTH / 2 - 365, 450, 730, 116, COLORS.border, 'rgba(10,15,31,0.8)', 4);
    const controls = game.input.touchMode
      ? 'حرّك بالعصا  •  المس الشاشة للتصويب والإطلاق  •  استخدم أزرار الاستدعاء والاندفاع'
      : 'WASD حركة  •  الماوس إطلاق  •  Q استدعاء  •  Space اندفاع';
    label(ctx, controls, WIDTH / 2, 489, game.input.touchMode ? 14 : 17, COLORS.text, 750);
    label(ctx, game.input.touchMode ? 'الأفضل اللعب بالعرض' : 'P إيقاف  •  F ملء الشاشة  •  M كتم الصوت', WIDTH / 2, 526, 14, COLORS.muted, 650);
    label(ctx, `أعلى موجة ${game.highWave}  •  أعلى نتيجة ${game.highScore.toLocaleString('en-US')}`, WIDTH / 2, 552, 14, COLORS.muted, 650);

    this.drawButton(game.audio.settings.muted ? 'الصوت: مكتوم' : 'الصوت: يعمل', WIDTH / 2 - 150, 592, 300, 48, () => game.toggleMute());
    label(ctx, `v${GAME_VERSION}`, WIDTH / 2, 687, 12, '#7380aa', 700);
  }

  drawTutorialHint(game) {
    const hint = game.currentHint();
    if (!hint) return;
    const y = game.input.touchMode ? 124 : HEIGHT - 46;
    panel(this.ctx, WIDTH / 2 - 330, y - 27, 660, 44, COLORS.bullet, 'rgba(8,13,29,0.88)', 5);
    label(this.ctx, hint, WIDTH / 2, y + 2, 15, COLORS.text, 750);
  }

  drawUpgradeSelection(game) {
    const ctx = this.ctx;
    dim(ctx, 0.88);
    label(ctx, `تم اجتياز الموجة ${game.wave}`, WIDTH / 2, 65, 21, COLORS.success, 800);
    label(ctx, 'اختر تطويرًا واحدًا', WIDTH / 2, 111, 39, COLORS.bullet, 900);

    const cardWidth = 338;
    const gap = 24;
    const total = game.upgradeChoices.length * cardWidth + Math.max(0, game.upgradeChoices.length - 1) * gap;
    const start = WIDTH / 2 - total / 2;
    game.upgradeChoices.forEach((upgrade, index) => {
      this.drawUpgradeCard(game, upgrade, index, start + index * (cardWidth + gap), 148, cardWidth, 370);
    });
    label(ctx, 'اضغط على بطاقة أو استخدم 1 / 2 / 3', WIDTH / 2, 560, 16, COLORS.muted, 650);
  }

  drawUpgradeCard(game, upgrade, index, x, y, width, height) {
    const hovered = pointInsideRect(game.input.pointer, { x, y, w: width, h: height });
    const ctx = this.ctx;
    const stack = game.stack(upgrade.id);
    const [current, next] = upgradePreview(upgrade.id, stack);
    panel(ctx, x, y, width, height, hovered ? COLORS.bullet : COLORS.border, hovered ? '#1b2440' : COLORS.panel, hovered ? 18 : 7);
    label(ctx, `${index + 1}`, x + 34, y + 43, 18, COLORS.bullet, 900);
    label(ctx, upgrade.tag, x + width - 26, y + 42, 14, COLORS.bullet, 850, 'right');
    wrapRtl(ctx, upgrade.name, x + width - 26, y + 93, width - 52, 35, 28, COLORS.text, 900, 2);
    wrapRtl(ctx, upgrade.description, x + width - 26, y + 169, width - 52, 29, 17, COLORS.muted, 600, 3);

    panel(ctx, x + 22, y + 257, width - 44, 70, COLORS.border, 'rgba(4,8,20,0.72)', 2);
    label(ctx, current, x + width / 2, y + 284, 13, COLORS.muted, 700);
    label(ctx, `←  ${next}`, x + width / 2, y + 311, 14, COLORS.success, 850);
    label(ctx, `المستوى ${stack}/${upgrade.maxStacks}`, x + width - 24, y + height - 20, 13, stack ? COLORS.electric : COLORS.muted, 750, 'right');
    this.addRectRegion(x, y, width, height, () => game.chooseUpgrade(index));
  }

  drawPause(game) {
    dim(this.ctx, 0.86);
    label(this.ctx, 'متوقف مؤقتًا', WIDTH / 2, 170, 50, COLORS.text, 900);
    this.drawButton('استكمال', WIDTH / 2 - 180, 244, 360, 60, () => game.resume(), true);
    this.drawButton('إعادة الجولة', WIDTH / 2 - 180, 322, 360, 58, () => game.startRun());
    this.drawButton(game.audio.settings.muted ? 'تشغيل الصوت' : 'كتم الصوت', WIDTH / 2 - 180, 398, 360, 58, () => game.toggleMute());
    this.drawButton('القائمة الرئيسية', WIDTH / 2 - 180, 474, 360, 58, () => game.goToMenu());
  }

  drawGameOver(game) {
    dim(this.ctx, 0.9);
    label(this.ctx, 'انتهت الجولة', WIDTH / 2, 120, 54, COLORS.danger, 900);
    label(this.ctx, `وصلت إلى الموجة ${game.wave}`, WIDTH / 2, 178, 25, COLORS.text, 850);

    const accuracy = game.stats.shots > 0 ? Math.round(game.stats.hits / game.stats.shots * 100) : 0;
    panel(this.ctx, WIDTH / 2 - 360, 218, 720, 118, COLORS.border, 'rgba(9,15,33,0.88)', 5);
    label(this.ctx, `${game.score.toLocaleString('en-US')} نقطة  •  ${game.stats.kills} عدو  •  ${game.stats.upgrades} قدرات`, WIDTH / 2, 260, 18, COLORS.text, 800);
    label(this.ctx, `دقة ${accuracy}%  •  مدة ${formatTime(game.runTime)}  •  ضرر مستلم ${game.stats.damageTaken}`, WIDTH / 2, 302, 15, COLORS.muted, 650);

    this.drawButton('العب من جديد', WIDTH / 2 - 190, 378, 380, 64, () => game.startRun(), true);
    this.drawButton('القائمة الرئيسية', WIDTH / 2 - 190, 460, 380, 58, () => game.goToMenu());
    label(this.ctx, `أفضل نتيجة ${game.highScore.toLocaleString('en-US')}  •  أفضل موجة ${game.highWave}`, WIDTH / 2, 565, 15, COLORS.muted, 700);
  }

  drawTouchControls(game) {
    const ctx = this.ctx;
    const joystick = game.input.joystickSnapshot();
    ctx.save();
    ctx.globalAlpha = 0.76;
    ctx.fillStyle = 'rgba(98,243,255,0.1)';
    ctx.strokeStyle = COLORS.player;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(joystick.origin.x, joystick.origin.y, TOUCH_CONTROLS.move.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = joystick.active ? 'rgba(98,243,255,0.58)' : 'rgba(98,243,255,0.32)';
    ctx.beginPath();
    ctx.arc(joystick.knob.x, joystick.knob.y, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    this.drawCircleButton(TOUCH_CONTROLS.dash, game.player.dashCooldown <= 0 ? 'اندفاع' : game.player.dashCooldown.toFixed(1), COLORS.player, () => { game.dashRequested = true; });
    this.drawCircleButton(TOUCH_CONTROLS.recall, game.bullet.held ? 'جاهزة' : 'استدعاء', COLORS.electric, () => game.recallBullet());
    this.drawCircleButton(TOUCH_CONTROLS.pause, 'إيقاف', COLORS.muted, () => game.pause());
  }

  drawCircleButton(control, text, color, action) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(8,14,31,0.84)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(control.x, control.y, control.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    label(ctx, text, control.x, control.y + 5, 13, color, 850);
    ctx.restore();
    this.addCircleRegion(control.x, control.y, control.radius + 9, action);
  }

  drawButton(textValue, x, y, width, height, action, primary = false) {
    panel(this.ctx, x, y, width, height, primary ? COLORS.bullet : COLORS.border, primary ? 'rgba(56,48,17,0.94)' : COLORS.panelSoft, primary ? 14 : 5);
    label(this.ctx, textValue, x + width / 2, y + height / 2 + 7, 19, primary ? COLORS.bullet : COLORS.text, 850);
    this.addRectRegion(x, y, width, height, action);
  }

  addRectRegion(x, y, w, h, action) {
    this.regions.push({ shape: 'rect', x, y, w, h, action });
  }

  addCircleRegion(x, y, radius, action) {
    this.regions.push({ shape: 'circle', x, y, radius, action });
  }
}

function roundedRect(ctx, x, y, width, height, radius = 14) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, width, height, radius);
  else ctx.rect(x, y, width, height);
}

function panel(ctx, x, y, width, height, accent = COLORS.border, fill = COLORS.panel, glow = 8) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.shadowColor = accent;
  ctx.shadowBlur = glow;
  roundedRect(ctx, x, y, width, height, 15);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();
  ctx.restore();
}

function label(ctx, value, x, y, size, color = COLORS.text, weight = 700, align = 'center') {
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillText(String(value), x, y);
  ctx.restore();
}

function wrapRtl(ctx, value, x, y, maxWidth, lineHeight, size, color, weight, maxLines = 3) {
  const words = String(value).split(/\s+/);
  const lines = [];
  let line = '';
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) line = candidate;
    else {
      if (line) lines.push(line);
      line = word;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  lines.forEach((item, index) => ctx.fillText(item, x, y + index * lineHeight));
  ctx.restore();
}

function dim(ctx, alpha = 0.84) {
  ctx.fillStyle = `rgba(2, 4, 12, ${alpha})`;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.trunc(Number(seconds) || 0));
  const minutes = Math.floor(safe / 60);
  const remainder = String(safe % 60).padStart(2, '0');
  return `${minutes}:${remainder}`;
}
