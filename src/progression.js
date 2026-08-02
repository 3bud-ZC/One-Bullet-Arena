import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from './content.js';
import { calculateRank, formatUiNumber } from './ui-polish.js';
import {
  ACHIEVEMENTS,
  BULLET_CORES,
  PROGRESSION_STORAGE_KEY,
  achievementProgress,
  coreById,
  createDefaultSave,
  normalizeSave,
  parseImportedSave,
  recordRun,
  serializeSave,
  unlockCore,
} from './progression-data.js';

const FONT = 'Changa, "Segoe UI", Tahoma, sans-serif';
const NUMERIC_FONT = 'Inter, "Segoe UI", Arial, sans-serif';
const CUSTOM_STATES = new Set(['coreHub', 'runHistory', 'achievements']);
const COLORS = {
  background: '#050711',
  panel: 'rgba(10, 14, 29, 0.96)',
  panelSoft: 'rgba(17, 23, 47, 0.9)',
  border: '#33406f',
  cyan: '#62f3ff',
  yellow: '#ffe66d',
  orange: '#ff9f43',
  red: '#ff526a',
  purple: '#b983ff',
  green: '#53f2a1',
  text: '#f8f9ff',
  muted: '#aeb7da',
  dim: '#69739b',
};

function storageAvailable() {
  return typeof localStorage !== 'undefined';
}

function loadProgression() {
  if (!storageAvailable()) return createDefaultSave();
  try {
    return normalizeSave(JSON.parse(localStorage.getItem(PROGRESSION_STORAGE_KEY) || 'null'));
  } catch {
    return createDefaultSave();
  }
}

function saveProgression(save) {
  const normalized = normalizeSave(save);
  if (storageAvailable()) localStorage.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

function ensureProgression(game) {
  if (!game.progressionSave) game.progressionSave = loadProgression();
  game.progressionSave.stats.bestScore = Math.max(game.progressionSave.stats.bestScore, Number(game.highScore) || 0);
  game.progressionSave.stats.bestWave = Math.max(game.progressionSave.stats.bestWave, Number(game.highWave) || 0);
  if (!game.progressionSave.unlockedCores.includes(game.progressionSave.selectedCore)) game.progressionSave.selectedCore = 'standard';
  return game.progressionSave;
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

function panel(ctx, x, y, width, height, accent = COLORS.border, fill = COLORS.panel) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 14;
  roundedRect(ctx, x, y, width, height, 18);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();
  ctx.restore();
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

function number(ctx, value, x, y, size, color = COLORS.text, align = 'center') {
  ctx.save();
  ctx.direction = 'ltr';
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.font = `800 ${size}px ${NUMERIC_FONT}`;
  ctx.fillText(String(value), x, y);
  ctx.restore();
}

function dim(ctx, alpha = 0.9) {
  const gradient = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 80, WIDTH / 2, HEIGHT / 2, 760);
  gradient.addColorStop(0, `rgba(8, 12, 28, ${Math.max(0, alpha - 0.08)})`);
  gradient.addColorStop(1, `rgba(1, 2, 7, ${alpha})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function formatNumber(game, value, options = {}) {
  return formatUiNumber(value, game.uiSettings?.latinDigits !== false, options);
}

function formatDuration(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safe / 60);
  const remainder = Math.floor(safe % 60);
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function activeCore(game) {
  const save = ensureProgression(game);
  return coreById(game.activeCoreId || save.selectedCore) || BULLET_CORES[0];
}

function drawCoreBadge(game, x, y, width = 220) {
  const core = activeCore(game);
  const ctx = game.ctx;
  ctx.save();
  ctx.fillStyle = 'rgba(8, 13, 29, 0.9)';
  ctx.strokeStyle = core.color;
  ctx.lineWidth = 2;
  roundedRect(ctx, x, y, width, 42, 13);
  ctx.fill();
  ctx.stroke();
  label(ctx, `${core.icon}  ${core.shortName}`, x + width - 16, y + 27, 15, core.color, 800, 'right');
  ctx.restore();
}

function drawShardTile(game, x, y, width = 220) {
  const save = ensureProgression(game);
  const ctx = game.ctx;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 230, 109, 0.1)';
  ctx.strokeStyle = COLORS.yellow;
  ctx.lineWidth = 2;
  roundedRect(ctx, x, y, width, 42, 13);
  ctx.fill();
  ctx.stroke();
  label(ctx, 'شظايا النواة', x + width - 16, y + 25, 13, COLORS.muted, 600, 'right');
  number(ctx, formatNumber(game, save.shards), x + 18, y + 28, 17, COLORS.yellow, 'left');
  ctx.restore();
}

function menuButton(game, labelText, x, y, width, action, primary = false) {
  game.drawButton(labelText, x, y, width, 52, action, primary);
}

function drawProgressionMenu(game) {
  const ctx = game.ctx;
  const save = ensureProgression(game);
  const core = activeCore(game);

  ctx.save();
  ctx.strokeStyle = 'rgba(98, 243, 255, 0.22)';
  ctx.lineWidth = 2;
  for (let index = 0; index < 9; index += 1) {
    const y = 56 + index * 77;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(150 + (index % 3) * 54, y);
    ctx.lineTo(205 + (index % 2) * 38, y + 24);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(WIDTH, HEIGHT - y);
    ctx.lineTo(WIDTH - 170 - (index % 3) * 48, HEIGHT - y);
    ctx.stroke();
  }
  ctx.restore();

  label(ctx, 'ONE BULLET ARENA  •  v0.5.0', WIDTH / 2, 64, 13, COLORS.cyan, 800);
  label(ctx, 'حلبة الطلقة الواحدة', WIDTH / 2, 132, 55, COLORS.text, 900);
  label(ctx, 'قاتل • اجمع الشظايا • افتح نواة تغيّر أسلوبك', WIDTH / 2, 168, 17, COLORS.muted, 500);

  drawShardTile(game, 292, 192, 265);
  drawCoreBadge(game, 723, 192, 265);

  panel(ctx, 282, 252, 716, 342, core.color);
  menuButton(game, 'ابدأ الجولة', 330, 278, 620, () => game.startRun(), true);
  menuButton(game, 'مركز النواة', 330, 344, 300, () => { game.audio.play('click'); game.state = 'coreHub'; }, false);
  menuButton(game, 'سجل الجولات', 650, 344, 300, () => { game.audio.play('click'); game.state = 'runHistory'; }, false);
  menuButton(game, 'الإنجازات', 330, 410, 300, () => { game.audio.play('click'); game.state = 'achievements'; }, false);
  menuButton(game, 'طريقة اللعب', 650, 410, 300, () => { game.audio.play('click'); game.state = 'howto'; }, false);
  menuButton(game, 'الإعدادات', 330, 476, 620, () => game.openSettings('menu'), false);

  label(ctx, 'أعلى نتيجة', 534, 560, 13, COLORS.muted, 600);
  number(ctx, formatNumber(game, Math.max(game.highScore, save.stats.bestScore)), 534, 584, 20, COLORS.yellow);
  label(ctx, 'الانتصارات', 746, 560, 13, COLORS.muted, 600);
  number(ctx, formatNumber(game, save.stats.victories), 746, 584, 20, COLORS.cyan);
  label(ctx, 'Enter للبدء  •  F لملء الشاشة  •  M لكتم الصوت', WIDTH / 2, 646, 13, COLORS.muted, 600);
}

function drawCoreCard(game, core, x, y, width, height) {
  const save = ensureProgression(game);
  const ctx = game.ctx;
  const unlocked = save.unlockedCores.includes(core.id);
  const selected = save.selectedCore === core.id;
  const mastery = save.coreMastery[core.id] || { runs: 0, victories: 0, bestScore: 0 };
  const affordable = save.shards >= core.cost;
  const hovered = game.pointer.x >= x && game.pointer.x <= x + width && game.pointer.y >= y && game.pointer.y <= y + height;

  ctx.save();
  ctx.fillStyle = selected ? `${core.color}20` : hovered ? 'rgba(24, 32, 62, 0.96)' : COLORS.panelSoft;
  ctx.strokeStyle = selected || hovered ? core.color : COLORS.border;
  ctx.lineWidth = selected ? 4 : 2;
  ctx.shadowColor = core.color;
  ctx.shadowBlur = selected ? 22 : hovered ? 14 : 5;
  roundedRect(ctx, x, y, width, height, 18);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();

  label(ctx, core.icon, x + width - 32, y + 44, 30, core.color, 900);
  label(ctx, core.name, x + width - 65, y + 39, 20, COLORS.text, 800, 'right');
  label(ctx, core.description, x + width - 22, y + 78, 13, COLORS.muted, 500, 'right');
  core.traits.forEach((trait, index) => label(ctx, `• ${trait}`, x + width - 24, y + 113 + index * 24, 13, index === 0 ? core.color : COLORS.muted, 600, 'right'));

  if (unlocked) {
    label(ctx, selected ? 'مُجهزة الآن' : 'اضغط للتجهيز', x + width / 2, y + height - 47, 15, selected ? COLORS.green : core.color, 800);
    label(ctx, `${mastery.runs} جولة  •  ${mastery.victories} فوز`, x + width / 2, y + height - 20, 12, COLORS.muted, 600);
  } else {
    label(ctx, affordable ? `فتح مقابل ${core.cost} شظية` : `تحتاج ${core.cost} شظية`, x + width / 2, y + height - 38, 15, affordable ? COLORS.yellow : COLORS.dim, 800);
  }
  ctx.restore();

  game.addUiRegion(x, y, width, height, () => {
    if (unlocked) {
      save.selectedCore = core.id;
      game.activeCoreId = core.id;
      game.progressionSave = saveProgression(save);
      game.audio.play('upgrade');
      return;
    }
    const result = unlockCore(save, core.id);
    if (!result.unlocked) {
      game.audio.play('damage');
      game.progressionNotice = result.reason === 'insufficient-shards' ? 'رصيد الشظايا غير كافٍ.' : 'تعذر فتح النواة.';
      return;
    }
    result.save.selectedCore = core.id;
    game.progressionSave = saveProgression(result.save);
    game.activeCoreId = core.id;
    game.progressionNotice = `تم فتح ${core.name} وتجهيزها.`;
    game.audio.play('upgrade');
  });
}

function drawCoreHub(game) {
  const ctx = game.ctx;
  const save = ensureProgression(game);
  dim(ctx, 0.84);
  label(ctx, 'مركز النواة', WIDTH / 2, 66, 43, COLORS.text, 900);
  label(ctx, 'اختر نواة واحدة قبل الجولة — قاعدة الطلقة الواحدة لا تتغير', WIDTH / 2, 98, 16, COLORS.muted, 500);
  drawShardTile(game, WIDTH / 2 - 130, 112, 260);

  const positions = [
    [78, 174], [344, 174], [610, 174], [876, 174],
    [344, 424],
  ];
  BULLET_CORES.forEach((core, index) => {
    const [x, y] = positions[index];
    drawCoreCard(game, core, x, y, 250, index === 4 ? 202 : 222);
  });

  if (game.progressionNotice) label(ctx, game.progressionNotice, WIDTH / 2, 660, 14, COLORS.yellow, 700);
  game.drawButton('تصدير الحفظ', 80, 632, 185, 46, () => game.exportProgressionSave?.());
  game.drawButton('استيراد الحفظ', 278, 632, 185, 46, () => game.requestProgressionImport?.());
  game.drawButton('إعادة تعيين', 816, 632, 185, 46, () => game.resetProgressionSave?.());
  game.drawButton('العودة', 1015, 632, 185, 46, () => { game.audio.play('click'); game.progressionNotice = ''; game.state = 'menu'; }, true);
  label(ctx, `${save.unlockedCores.length} / ${BULLET_CORES.length} نوى مفتوحة`, 728, 661, 13, COLORS.muted, 600);
}

function drawHistoryRow(game, run, index, x, y, width) {
  const ctx = game.ctx;
  const core = coreById(run.coreId) || BULLET_CORES[0];
  const rowColor = run.victory ? COLORS.green : COLORS.red;
  ctx.save();
  ctx.fillStyle = index % 2 ? 'rgba(17, 23, 47, 0.72)' : 'rgba(11, 16, 34, 0.78)';
  ctx.strokeStyle = 'rgba(66, 80, 132, 0.45)';
  roundedRect(ctx, x, y, width, 54, 11);
  ctx.fill();
  ctx.stroke();
  label(ctx, run.victory ? 'فوز' : 'خسارة', x + width - 22, y + 34, 14, rowColor, 800, 'right');
  label(ctx, core.shortName, x + width - 122, y + 34, 13, core.color, 700, 'right');
  number(ctx, run.rank, x + width - 235, y + 35, 21, run.rank === 'S' ? COLORS.yellow : COLORS.text);
  number(ctx, formatNumber(game, run.score), x + width - 355, y + 34, 15, COLORS.text);
  number(ctx, formatDuration(run.runTime), x + width - 485, y + 34, 14, COLORS.muted);
  label(ctx, `دقة ${Math.round(run.accuracy * 100)}٪`, x + 360, y + 34, 13, COLORS.muted, 600);
  label(ctx, `+${run.shards} شظية`, x + 185, y + 34, 13, COLORS.yellow, 700);
  const date = new Date(run.playedAt);
  label(ctx, Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('ar-EG'), x + 18, y + 34, 12, COLORS.dim, 500, 'left');
  ctx.restore();
}

function drawRunHistory(game) {
  const ctx = game.ctx;
  const save = ensureProgression(game);
  dim(ctx, 0.86);
  label(ctx, 'سجل الجولات', WIDTH / 2, 64, 43, COLORS.text, 900);
  label(ctx, `${save.stats.totalRuns} جولة  •  ${save.stats.victories} فوز  •  ${formatDuration(save.stats.totalTime)} وقت لعب`, WIDTH / 2, 96, 15, COLORS.muted, 600);

  panel(ctx, 70, 122, 1140, 500, COLORS.cyan);
  if (save.history.length === 0) {
    label(ctx, 'لا توجد جولات مسجلة بعد.', WIDTH / 2, 330, 28, COLORS.muted, 700);
    label(ctx, 'ابدأ أول جولة لتظهر نتيجتها وإحصائياتها هنا.', WIDTH / 2, 370, 16, COLORS.dim, 500);
  } else {
    save.history.slice(0, 8).forEach((run, index) => drawHistoryRow(game, run, index, 92, 145 + index * 58, 1096));
  }
  game.drawButton('العودة', WIDTH / 2 - 145, 638, 290, 48, () => { game.audio.play('click'); game.state = 'menu'; }, true);
}

function drawAchievementCard(game, achievement, x, y, width, height) {
  const save = ensureProgression(game);
  const ctx = game.ctx;
  const unlocked = Boolean(save.achievements[achievement.id]);
  const progress = achievementProgress(save, achievement);
  const ratio = Math.min(1, progress / achievement.target);
  const accent = unlocked ? COLORS.yellow : COLORS.cyan;

  panel(ctx, x, y, width, height, unlocked ? COLORS.yellow : COLORS.border, unlocked ? 'rgba(55, 44, 17, 0.62)' : COLORS.panelSoft);
  label(ctx, unlocked ? '✓' : '◇', x + width - 28, y + 38, 24, accent, 900);
  label(ctx, achievement.name, x + width - 62, y + 36, 19, COLORS.text, 800, 'right');
  label(ctx, achievement.description, x + width - 22, y + 70, 13, COLORS.muted, 500, 'right');
  ctx.fillStyle = 'rgba(46, 56, 94, 0.75)';
  roundedRect(ctx, x + 22, y + height - 42, width - 44, 10, 5);
  ctx.fill();
  ctx.fillStyle = accent;
  roundedRect(ctx, x + 22, y + height - 42, (width - 44) * ratio, 10, 5);
  ctx.fill();
  label(ctx, unlocked ? `مكتمل  •  +${achievement.reward} شظية` : `${progress} / ${achievement.target}  •  المكافأة ${achievement.reward}`, x + width / 2, y + height - 16, 12, unlocked ? COLORS.yellow : COLORS.muted, 700);
}

function drawAchievements(game) {
  const ctx = game.ctx;
  const save = ensureProgression(game);
  const unlockedCount = Object.keys(save.achievements).length;
  dim(ctx, 0.86);
  label(ctx, 'الإنجازات', WIDTH / 2, 62, 43, COLORS.text, 900);
  label(ctx, `${unlockedCount} / ${ACHIEVEMENTS.length} مكتملة`, WIDTH / 2, 94, 15, COLORS.muted, 600);

  ACHIEVEMENTS.forEach((achievement, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    drawAchievementCard(game, achievement, 110 + column * 535, 128 + row * 158, 505, 138);
  });
  game.drawButton('العودة', WIDTH / 2 - 145, 624, 290, 48, () => { game.audio.play('click'); game.state = 'menu'; }, true);
}

function drawResultStat(ctx, labelText, value, x, y, accent) {
  ctx.save();
  ctx.fillStyle = COLORS.panelSoft;
  ctx.strokeStyle = 'rgba(72, 88, 148, 0.56)';
  roundedRect(ctx, x, y, 210, 66, 13);
  ctx.fill();
  ctx.stroke();
  label(ctx, labelText, x + 190, y + 25, 12, COLORS.muted, 600, 'right');
  number(ctx, value, x + 190, y + 51, 19, accent, 'right');
  ctx.restore();
}

function drawProgressionResult(game, victory) {
  const ctx = game.ctx;
  const save = ensureProgression(game);
  const rewardInfo = game.lastProgressionReward;
  const rank = rewardInfo?.run?.rank || calculateRank({ score: game.score, hits: game.stats.hits, shots: game.stats.shots, runTime: game.runTime, victory });
  const core = coreById(rewardInfo?.run?.coreId || game.activeCoreId) || BULLET_CORES[0];

  dim(ctx, 0.92);
  label(ctx, victory ? 'تم إسقاط حارس النواة' : 'انتهت الجولة', WIDTH / 2, 68, 39, victory ? COLORS.yellow : COLORS.red, 900);
  label(ctx, victory ? 'الطلقة عادت ومعها غنائم الجولة.' : 'التقدم محفوظ — ارجع أقوى في الجولة التالية.', WIDTH / 2, 101, 16, COLORS.muted, 500);

  panel(ctx, 78, 126, 1124, 454, victory ? COLORS.yellow : COLORS.red);
  label(ctx, rank, 1040, 226, 94, rank === 'S' ? COLORS.yellow : victory ? COLORS.cyan : COLORS.red, 900);
  label(ctx, 'تقييم الجولة', 1040, 260, 14, COLORS.muted, 600);
  label(ctx, `${core.icon} ${core.name}`, 1040, 298, 17, core.color, 800);

  drawResultStat(ctx, 'النقاط', formatNumber(game, game.score), 110, 164, COLORS.yellow);
  drawResultStat(ctx, 'الوقت', formatDuration(game.runTime), 335, 164, COLORS.cyan);
  drawResultStat(ctx, 'الإصابات', `${game.stats.hits} / ${game.stats.shots}`, 110, 242, COLORS.green);
  drawResultStat(ctx, 'الارتدادات', formatNumber(game, game.stats.ricochets), 335, 242, COLORS.purple);
  drawResultStat(ctx, 'الأعداء', formatNumber(game, game.stats.kills), 110, 320, COLORS.orange);
  drawResultStat(ctx, 'أفضل موجة', formatNumber(game, game.wave), 335, 320, COLORS.cyan);

  panel(ctx, 580, 330, 565, 174, COLORS.yellow, 'rgba(45, 37, 16, 0.72)');
  label(ctx, 'مكافآت الجولة', 1116, 363, 18, COLORS.text, 800, 'right');
  label(ctx, 'شظايا الأداء', 1116, 399, 14, COLORS.muted, 600, 'right');
  number(ctx, `+${rewardInfo?.reward || 0}`, 650, 401, 22, COLORS.yellow, 'left');
  label(ctx, 'الرصيد الحالي', 1116, 435, 14, COLORS.muted, 600, 'right');
  number(ctx, formatNumber(game, save.shards), 650, 437, 22, COLORS.yellow, 'left');
  const newAchievements = rewardInfo?.unlockedAchievements || [];
  label(ctx, newAchievements.length ? `إنجاز جديد: ${newAchievements[0].name}` : 'كل جولة تقرّبك من نواة أو إنجاز جديد.', 1116, 477, 13, newAchievements.length ? COLORS.green : COLORS.muted, 700, 'right');

  game.drawButton('العب من جديد', 104, 514, 300, 50, () => game.startRun(), true);
  game.drawButton('مركز النواة', 426, 514, 300, 50, () => { game.audio.play('click'); game.state = 'coreHub'; });
  game.drawButton('القائمة الرئيسية', 748, 514, 300, 50, () => { game.audio.play('click'); game.goToMenu(); });
}

function drawCoreAura(game) {
  const core = activeCore(game);
  const ctx = game.ctx;
  if (!game.player || game.state !== 'playing') return;
  ctx.save();
  ctx.strokeStyle = core.color;
  ctx.globalAlpha = 0.32;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 7]);
  ctx.beginPath();
  ctx.arc(game.player.x, game.player.y, game.player.radius + 15 + Math.sin(game.elapsed * 5) * 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function nearestShockTarget(game, origin) {
  let target = null;
  let bestDistance = 150 ** 2;
  for (const enemy of game.enemies) {
    if (enemy.id === origin.id) continue;
    const dx = enemy.x - origin.x;
    const dy = enemy.y - origin.y;
    const distance = dx * dx + dy * dy;
    if (distance >= bestDistance) continue;
    bestDistance = distance;
    target = enemy;
  }
  return target;
}

export function installProgression(GameClass) {
  const prototype = GameClass.prototype;
  if (prototype.__progressionInstalled) return;
  prototype.__progressionInstalled = true;

  const originalResetRun = prototype.resetRun;
  prototype.resetRun = function resetRunWithProgression(...args) {
    const result = originalResetRun.apply(this, args);
    const save = ensureProgression(this);
    this.activeCoreId = save.selectedCore;
    this.lastProgressionReward = null;
    this.progressionRunRecorded = false;
    this.progressionNotice = '';
    return result;
  };

  const originalStartRun = prototype.startRun;
  prototype.startRun = function startRunWithSelectedCore(...args) {
    const save = ensureProgression(this);
    this.activeCoreId = save.selectedCore;
    this.progressionRunRecorded = false;
    this.lastProgressionReward = null;
    return originalStartRun.apply(this, args);
  };

  const originalStack = prototype.stack;
  prototype.stack = function stackWithCoreBonus(id) {
    const base = originalStack.call(this, id);
    return id === 'magnetic-recall' && this.activeCoreId === 'recall' ? base + 1 : base;
  };

  const originalFireBullet = prototype.fireBullet;
  prototype.fireBullet = function fireBulletWithCore(...args) {
    const wasHeld = this.bullet.held;
    const result = originalFireBullet.apply(this, args);
    if (!wasHeld || this.bullet.held) return result;
    if (this.activeCoreId === 'ricochet') {
      this.bullet.bouncesRemaining += 2;
      this.bullet.vx *= 0.92;
      this.bullet.vy *= 0.92;
    } else if (this.activeCoreId === 'heavy') {
      this.bullet.bouncesRemaining = Math.max(2, this.bullet.bouncesRemaining - 1);
      this.bullet.vx *= 0.78;
      this.bullet.vy *= 0.78;
    }
    return result;
  };

  const originalCurrentBulletDamage = prototype.currentBulletDamage;
  prototype.currentBulletDamage = function currentBulletDamageWithCore() {
    let damage = originalCurrentBulletDamage.call(this);
    if (this.activeCoreId === 'ricochet') damage += this.bullet.bounceCount * 0.25;
    else if (this.activeCoreId === 'heavy') damage *= 1.65;
    else if (this.activeCoreId === 'shock') damage *= 0.82;
    else if (this.activeCoreId === 'recall') damage *= 0.95;
    return damage;
  };

  const originalDamageEnemy = prototype.damageEnemy;
  prototype.damageEnemy = function damageEnemyWithCore(enemy, damage, forceX, forceY, fromBullet) {
    const origin = { id: enemy.id, x: enemy.x, y: enemy.y };
    const result = originalDamageEnemy.call(this, enemy, damage, forceX, forceY, fromBullet);
    if (fromBullet && this.activeCoreId === 'heavy' && this.enemies.some((item) => item.id === enemy.id)) {
      const length = Math.hypot(forceX, forceY) || 1;
      enemy.knockbackX += forceX / length * 170;
      enemy.knockbackY += forceY / length * 170;
    }
    if (fromBullet && this.activeCoreId === 'shock') {
      const target = nearestShockTarget(this, origin);
      if (target) {
        this.createRing(origin.x, origin.y, COLORS.purple, 150);
        originalDamageEnemy.call(this, target, 0.55 + this.bullet.bounceCount * 0.08, target.x - origin.x, target.y - origin.y, false);
      }
    }
    return result;
  };

  const originalFinishRun = prototype.finishRun;
  prototype.finishRun = function finishRunWithProgression(victory) {
    const result = originalFinishRun.call(this, victory);
    if (this.progressionRunRecorded) return result;
    this.progressionRunRecorded = true;
    const rank = calculateRank({ score: this.score, hits: this.stats.hits, shots: this.stats.shots, runTime: this.runTime, victory });
    const recorded = recordRun(ensureProgression(this), {
      victory,
      score: this.score,
      wave: this.wave,
      rank,
      runTime: this.runTime,
      shots: this.stats.shots,
      hits: this.stats.hits,
      ricochets: this.stats.ricochets,
      kills: this.stats.kills,
      coreId: this.activeCoreId,
    });
    this.progressionSave = saveProgression(recorded.save);
    this.lastProgressionReward = recorded;
    this.highScore = Math.max(this.highScore, this.progressionSave.stats.bestScore);
    this.highWave = Math.max(this.highWave, this.progressionSave.stats.bestWave);
    return result;
  };

  const originalDrawMenu = prototype.drawMenu;
  prototype.drawMenu = function drawMenuWithProgression() {
    ensureProgression(this);
    drawProgressionMenu(this);
  };
  prototype.__previousProgressionMenu = originalDrawMenu;

  prototype.drawResult = function drawResultWithProgression(victory) {
    drawProgressionResult(this, victory);
  };

  const originalDrawHud = prototype.drawHud;
  prototype.drawHud = function drawHudWithActiveCore(...args) {
    originalDrawHud.apply(this, args);
    drawCoreBadge(this, WIDTH / 2 - 112, 18, 224);
  };

  const originalDrawPlayer = prototype.drawPlayer;
  prototype.drawPlayer = function drawPlayerWithCoreAura(...args) {
    originalDrawPlayer.apply(this, args);
    drawCoreAura(this);
  };

  const originalHandleEscape = prototype.handleEscape;
  prototype.handleEscape = function handleProgressionEscape() {
    if (CUSTOM_STATES.has(this.state)) {
      this.audio.play('click');
      this.progressionNotice = '';
      this.state = 'menu';
      return;
    }
    originalHandleEscape.call(this);
  };

  const originalDraw = prototype.draw;
  prototype.draw = function drawProgressionStates(...args) {
    if (!CUSTOM_STATES.has(this.state)) return originalDraw.apply(this, args);
    this.uiRegions = [];
    this.ctx.save();
    this.drawArena();
    if (this.state === 'coreHub') drawCoreHub(this);
    else if (this.state === 'runHistory') drawRunHistory(this);
    else drawAchievements(this);
    this.ctx.restore();
    return undefined;
  };
}

export function attachProgressionControls(game) {
  ensureProgression(game);

  game.exportProgressionSave = () => {
    const blob = new Blob([serializeSave(ensureProgression(game))], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `one-bullet-arena-save-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    game.progressionNotice = 'تم تصدير ملف الحفظ.';
    game.audio.play('click');
  };

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.hidden = true;
  document.body.append(input);

  game.requestProgressionImport = () => {
    input.value = '';
    input.click();
  };

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const imported = parseImportedSave(await file.text());
      game.progressionSave = saveProgression(imported);
      game.activeCoreId = game.progressionSave.selectedCore;
      game.highScore = Math.max(game.highScore, game.progressionSave.stats.bestScore);
      game.highWave = Math.max(game.highWave, game.progressionSave.stats.bestWave);
      game.progressionNotice = 'تم استيراد الحفظ بنجاح.';
      game.audio.play('upgrade');
    } catch {
      game.progressionNotice = 'ملف الحفظ غير صالح أو تالف.';
      game.audio.play('damage');
    }
  });

  game.resetProgressionSave = () => {
    if (!window.confirm('هل تريد حذف الشظايا والنوى والإنجازات وسجل الجولات؟ لا يمكن التراجع.')) return;
    game.progressionSave = saveProgression(createDefaultSave());
    game.activeCoreId = 'standard';
    game.highScore = 0;
    game.highWave = 0;
    localStorage.removeItem('one-bullet-arena-high-score');
    localStorage.removeItem('one-bullet-arena-high-wave');
    game.progressionNotice = 'تمت إعادة تعيين التقدم بالكامل.';
    game.audio.play('click');
  };
}
