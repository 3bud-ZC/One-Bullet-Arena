import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH, TOTAL_WAVES } from './content.js';
import { formatUiNumber } from './ui-polish.js';
import {
  ACHIEVEMENTS,
  BULLET_CORES,
  PROGRESSION_STORAGE_KEY,
  achievementProgress,
  coreById,
  normalizeSave,
} from './progression-data.js';
import {
  RUN_CHALLENGES,
  dailyChallengeForDate,
  eliteModifierById,
} from './replayability-data.js';

const FONT = 'Changa, "Segoe UI", Tahoma, sans-serif';
const NUMERIC_FONT = 'Inter, "Segoe UI", Arial, sans-serif';
const VERSION = 'v0.6.1';

const COLORS = Object.freeze({
  background: '#050711',
  panel: 'rgba(8, 13, 29, 0.96)',
  panelSoft: 'rgba(17, 24, 49, 0.92)',
  border: '#35416e',
  cyan: '#62f3ff',
  yellow: '#ffe66d',
  red: '#ff526a',
  orange: '#ff9f43',
  purple: '#b983ff',
  green: '#53f2a1',
  text: '#f8f9ff',
  muted: '#aeb7da',
  dim: '#69739b',
});

export function formatProgressPair(current, target) {
  const safeCurrent = Math.max(0, Math.trunc(Number(current) || 0));
  const safeTarget = Math.max(0, Math.trunc(Number(target) || 0));
  return `${safeCurrent} / ${safeTarget}`;
}

export function deriveAccuracyStats({ shots = 0, accurateShots = 0, directImpacts = 0 } = {}) {
  const safeShots = Math.max(0, Math.trunc(Number(shots) || 0));
  const safeAccurate = Math.min(safeShots, Math.max(0, Math.trunc(Number(accurateShots) || 0)));
  const safeImpacts = Math.max(safeAccurate, Math.trunc(Number(directImpacts) || 0));
  return {
    shots: safeShots,
    accurateShots: safeAccurate,
    directImpacts: safeImpacts,
    accuracy: safeShots > 0 ? safeAccurate / safeShots : 0,
  };
}

export function deriveChallengeState(challengeId, metrics = {}, victory = false) {
  const shots = Math.max(0, Number(metrics.shots) || 0);
  const damageTaken = Math.max(0, Number(metrics.damageTaken) || 0);
  const dashes = Math.max(0, Number(metrics.dashes) || 0);
  const killsPerShot = Math.max(0, Number(metrics.maxKillsPerShot) || 0);
  const bounces = Math.max(0, Number(metrics.maxBounces) || 0);
  const eliteKills = Math.max(0, Number(metrics.eliteKills) || 0);

  if (challengeId === 'untouched') {
    if (damageTaken > 0) return { status: 'failed', progress: `${damageTaken} ضرر`, reason: 'تم تلقي ضرر' };
    return { status: victory ? 'completed' : 'active', progress: 'دون ضرر', reason: '' };
  }
  if (challengeId === 'dashless') {
    if (dashes > 0) return { status: 'failed', progress: `${dashes} اندفاع`, reason: 'تم استخدام الاندفاع' };
    return { status: victory ? 'completed' : 'active', progress: 'لم تستخدم الاندفاع', reason: '' };
  }
  if (challengeId === 'limited-shots') {
    if (shots > 30) return { status: 'failed', progress: formatProgressPair(shots, 30), reason: 'تم تجاوز حد الإطلاقات' };
    return { status: victory ? 'completed' : 'active', progress: formatProgressPair(shots, 30), reason: '' };
  }
  if (challengeId === 'triple-kill') {
    return { status: killsPerShot >= 3 ? 'completed' : 'active', progress: formatProgressPair(killsPerShot, 3), reason: '' };
  }
  if (challengeId === 'eight-bounces') {
    return { status: bounces >= 8 ? 'completed' : 'active', progress: formatProgressPair(bounces, 8), reason: '' };
  }
  if (challengeId === 'elite-hunter') {
    return { status: eliteKills >= 3 ? 'completed' : 'active', progress: formatProgressPair(eliteKills, 3), reason: '' };
  }
  return { status: 'active', progress: '—', reason: '' };
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

function panel(ctx, x, y, width, height, accent = COLORS.border, fill = COLORS.panel, glow = 10) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.shadowColor = accent;
  ctx.shadowBlur = glow;
  roundedRect(ctx, x, y, width, height, 17);
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
  ctx.fillText(String(text), x, y);
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
  gradient.addColorStop(0, `rgba(8, 13, 31, ${Math.max(0, alpha - 0.09)})`);
  gradient.addColorStop(1, `rgba(1, 2, 7, ${alpha})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function ensureSave(game) {
  game.progressionSave = normalizeSave(game.progressionSave);
  return game.progressionSave;
}

function persistSave(game) {
  const save = ensureSave(game);
  save.updatedAt = new Date().toISOString();
  if (typeof localStorage !== 'undefined') localStorage.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(save));
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
  const save = ensureSave(game);
  return coreById(game.activeCoreId || save.selectedCore) || BULLET_CORES[0];
}

function replayMetrics(game) {
  return {
    ...(game.replayMetrics || {}),
    shots: game.stats?.shots || 0,
    damageTaken: game.stats?.damageTaken || 0,
  };
}

function challengePresentation(game, victory = false) {
  const challenge = game.runChallenge || RUN_CHALLENGES[0];
  const state = deriveChallengeState(challenge.id, replayMetrics(game), victory);
  return { challenge, ...state };
}

function drawStatusTile(game, x, y, width, title, value, accent) {
  const ctx = game.ctx;
  panel(ctx, x, y, width, 46, accent, 'rgba(8, 13, 29, 0.88)', 5);
  label(ctx, title, x + width - 16, y + 28, 12, COLORS.muted, 600, 'right');
  number(ctx, value, x + 16, y + 31, 16, accent, 'left');
}

function drawRefinedMenu(game) {
  const ctx = game.ctx;
  const save = ensureSave(game);
  const core = activeCore(game);
  const daily = dailyChallengeForDate(new Date());
  const dailyRecord = save.replayability.daily.records[daily.date] || { attempts: 0, bestScore: 0, completed: false };

  label(ctx, `ONE BULLET ARENA  •  ${VERSION}`, WIDTH / 2, 44, 12, COLORS.cyan, 800);
  label(ctx, 'حلبة الطلقة الواحدة', WIDTH / 2, 102, 48, COLORS.text, 900);
  label(ctx, 'قاتل بذكاء، طوّر بناءك، وارجع بالطلقة دائمًا.', WIDTH / 2, 133, 15, COLORS.muted, 500);

  drawStatusTile(game, 355, 151, 275, 'شظايا النواة', formatNumber(game, save.shards), COLORS.yellow);
  drawStatusTile(game, 650, 151, 275, 'النواة المجهزة', `${core.icon} ${core.shortName}`, core.color);

  panel(ctx, 330, 214, 620, 400, COLORS.cyan, 'rgba(10, 16, 34, 0.94)', 18);
  game.drawButton('ابدأ الجولة', 375, 242, 530, 58, () => game.startRun(), true);
  game.drawButton('مركز النواة', 375, 318, 250, 52, () => { game.audio.play('click'); game.state = 'coreHub'; });
  game.drawButton('سجل الجولات', 655, 318, 250, 52, () => { game.audio.play('click'); game.state = 'runHistory'; });
  game.drawButton('الإنجازات', 375, 384, 250, 52, () => { game.audio.play('click'); game.state = 'achievements'; });
  game.drawButton('طريقة اللعب', 655, 384, 250, 52, () => { game.audio.play('click'); game.state = 'howto'; });
  game.drawButton('الإعدادات', 375, 450, 530, 52, () => game.openSettings('menu'));
  label(ctx, 'أعلى نتيجة', 548, 548, 12, COLORS.muted, 600);
  number(ctx, formatNumber(game, Math.max(game.highScore || 0, save.stats.bestScore || 0)), 548, 574, 20, COLORS.yellow);
  label(ctx, 'الانتصارات', 732, 548, 12, COLORS.muted, 600);
  number(ctx, formatNumber(game, save.stats.victories || 0), 732, 574, 20, COLORS.cyan);

  panel(ctx, 48, 245, 250, 310, dailyRecord.completed ? COLORS.green : COLORS.yellow, 'rgba(11, 16, 34, 0.93)', 12);
  label(ctx, 'التحدي اليومي', 173, 284, 21, COLORS.yellow, 900);
  label(ctx, daily.challenge.name, 173, 322, 18, COLORS.text, 800);
  label(ctx, daily.mutator.name, 173, 352, 13, COLORS.purple, 700);
  label(ctx, `المكافأة ${daily.challenge.reward + 65} شظية`, 173, 384, 13, COLORS.muted, 600);
  label(ctx, dailyRecord.completed ? 'مكتمل اليوم' : `${dailyRecord.attempts} محاولات`, 173, 415, 13, dailyRecord.completed ? COLORS.green : COLORS.text, 700);
  number(ctx, formatNumber(game, dailyRecord.bestScore || 0), 173, 447, 20, COLORS.cyan);
  label(ctx, 'أفضل نتيجة', 173, 469, 11, COLORS.muted, 500);
  game.drawButton('تفاصيل التحدي', 72, 490, 202, 44, () => { game.audio.play('click'); game.state = 'dailyBrief'; }, true);

  panel(ctx, 982, 245, 250, 310, core.color, 'rgba(11, 16, 34, 0.93)', 12);
  label(ctx, 'ملف المقاتل', 1107, 284, 21, COLORS.text, 900);
  label(ctx, `${core.icon} ${core.name}`, 1107, 324, 17, core.color, 800);
  label(ctx, `سلسلة يومية ${save.replayability.daily.streak || 0}`, 1107, 360, 13, COLORS.muted, 600);
  label(ctx, `تحديات مكتملة ${save.replayability.totals.challengesCompleted || 0}`, 1107, 390, 13, COLORS.muted, 600);
  label(ctx, `Elite مهزوم ${save.replayability.totals.eliteKills || 0}`, 1107, 420, 13, COLORS.muted, 600);
  label(ctx, `${save.replayability.unlockedCosmetics.length} مظهر مفتوح`, 1107, 450, 13, COLORS.yellow, 700);
  game.drawButton('المظاهر', 1006, 490, 202, 44, () => { game.audio.play('click'); game.state = 'cosmetics'; });

  label(ctx, 'Enter للبدء  •  B لفحص البناء  •  F لملء الشاشة', WIDTH / 2, 662, 12, COLORS.muted, 600);
}

function drawRefinedHud(game) {
  const ctx = game.ctx;
  const core = activeCore(game);
  const challenge = challengePresentation(game, false);
  const challengeAccent = challenge.status === 'failed' ? COLORS.red : challenge.status === 'completed' ? COLORS.green : game.isDailyRun ? COLORS.yellow : COLORS.purple;

  panel(ctx, 18, 18, 292, 78, game.bullet.held ? COLORS.yellow : COLORS.border, 'rgba(8, 13, 29, 0.84)', 7);
  label(ctx, game.bullet.held ? 'الطلقة جاهزة' : game.bullet.recalling ? 'الطلقة عائدة' : 'استعد الطلقة', 286, 48, 17, game.bullet.held ? COLORS.yellow : COLORS.text, 800, 'right');
  const dashText = game.player.dashCooldown <= 0 ? 'الاندفاع جاهز' : `الاندفاع ${game.player.dashCooldown.toFixed(1)} ث`;
  label(ctx, dashText, 286, 74, 13, COLORS.muted, 500, 'right');
  if (!game.bullet.held) label(ctx, `${Math.max(0, game.bullet.bouncesRemaining)} ارتدادات`, 42, 75, 12, COLORS.cyan, 700, 'left');

  panel(ctx, WIDTH - 330, 18, 312, 78, game.boss ? COLORS.red : COLORS.cyan, 'rgba(8, 13, 29, 0.84)', 7);
  label(ctx, game.boss ? 'معركة حارس النواة' : 'الموجة', WIDTH - 42, 45, 16, COLORS.text, 800, 'right');
  number(ctx, game.boss ? formatNumber(game, game.score) : `${game.wave} / ${TOTAL_WAVES}`, WIDTH - 178, 47, 20, game.boss ? COLORS.yellow : COLORS.cyan);
  label(ctx, 'النقاط', WIDTH - 42, 72, 11, COLORS.muted, 600, 'right');
  number(ctx, formatNumber(game, game.score), WIDTH - 178, 76, 15, COLORS.muted);
  for (let index = 0; index < game.player.maxHealth; index += 1) {
    ctx.fillStyle = index < game.player.health ? COLORS.red : '#252b43';
    ctx.beginPath();
    ctx.arc(WIDTH - 282 + index * 27, 73, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  panel(ctx, WIDTH / 2 - 122, 18, 244, 42, core.color, 'rgba(8, 13, 29, 0.88)', 6);
  label(ctx, `${core.icon} ${core.shortName}`, WIDTH / 2, 45, 15, core.color, 800);
  if (game.combo > 1 && game.comboTimer > 0) {
    panel(ctx, WIDTH / 2 - 90, 69, 180, 34, COLORS.yellow, 'rgba(24, 20, 8, 0.88)', 5);
    label(ctx, `كومبو ×${formatNumber(game, game.combo)}`, WIDTH / 2, 92, 18, COLORS.yellow, 900);
  }

  panel(ctx, WIDTH / 2 - 260, HEIGHT - 52, 520, 38, challengeAccent, 'rgba(8, 12, 27, 0.9)', 5);
  const statusWord = challenge.status === 'failed' ? 'فشل' : challenge.status === 'completed' ? 'اكتمل' : game.isDailyRun ? 'يومي' : 'تحدي';
  const challengeText = challenge.status === 'failed'
    ? `${statusWord}: ${challenge.reason}`
    : `${statusWord}: ${challenge.challenge.name}  •  ${challenge.progress}`;
  label(ctx, challengeText, WIDTH / 2, HEIGHT - 27, 12, challengeAccent, 800);

  if (game.eliteAlert?.time > 0) {
    panel(ctx, WIDTH / 2 - 190, 112, 380, 45, game.eliteAlert.color, 'rgba(15, 10, 24, 0.9)', 7);
    label(ctx, `${game.eliteAlert.icon} نخبة: ${game.eliteAlert.name}`, WIDTH / 2, 141, 15, game.eliteAlert.color, 900);
  }

  if (game.boss) game.drawBossHealthBar();
}

function drawCompactBanner(game) {
  if (!game.banner) return;
  const ctx = game.ctx;
  const alpha = Math.min(1, Math.max(0, game.banner.time * 2.2));
  ctx.save();
  ctx.globalAlpha = alpha;
  panel(ctx, WIDTH / 2 - 270, 126, 540, 92, COLORS.cyan, 'rgba(8, 15, 31, 0.94)', 12);
  label(ctx, game.banner.title, WIDTH / 2, 165, 27, COLORS.text, 900);
  label(ctx, game.banner.subtitle, WIDTH / 2, 198, 14, COLORS.yellow, 600);
  ctx.restore();
}

function drawAchievementCard(game, achievement, x, y, width, height) {
  const save = ensureSave(game);
  const ctx = game.ctx;
  const unlocked = Boolean(save.achievements[achievement.id]);
  const progress = achievementProgress(save, achievement);
  const ratio = Math.min(1, progress / achievement.target);
  const accent = unlocked ? COLORS.yellow : COLORS.cyan;
  panel(ctx, x, y, width, height, unlocked ? COLORS.yellow : COLORS.border, unlocked ? 'rgba(55, 44, 17, 0.58)' : COLORS.panelSoft, 8);
  label(ctx, unlocked ? '✓' : '◇', x + width - 28, y + 37, 22, accent, 900);
  label(ctx, achievement.name, x + width - 62, y + 35, 18, COLORS.text, 800, 'right');
  label(ctx, achievement.description, x + width - 22, y + 68, 12, COLORS.muted, 500, 'right');
  ctx.fillStyle = 'rgba(46, 56, 94, 0.75)';
  roundedRect(ctx, x + 22, y + height - 38, width - 44, 9, 5);
  ctx.fill();
  ctx.fillStyle = accent;
  roundedRect(ctx, x + 22, y + height - 38, (width - 44) * ratio, 9, 5);
  ctx.fill();
  number(ctx, formatProgressPair(progress, achievement.target), x + 22, y + height - 14, 12, unlocked ? COLORS.yellow : COLORS.text, 'left');
  label(ctx, `المكافأة ${achievement.reward}`, x + width - 22, y + height - 14, 11, COLORS.muted, 600, 'right');
}

function drawRefinedAchievements(game) {
  const ctx = game.ctx;
  const save = ensureSave(game);
  const completed = Object.keys(save.achievements).length;
  dim(ctx, 0.88);
  label(ctx, 'الإنجازات', WIDTH / 2, 62, 40, COLORS.text, 900);
  number(ctx, formatProgressPair(completed, ACHIEVEMENTS.length), WIDTH / 2, 93, 15, COLORS.cyan);
  label(ctx, 'مكتملة', WIDTH / 2 + 65, 93, 13, COLORS.muted, 600, 'left');
  ACHIEVEMENTS.forEach((achievement, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    drawAchievementCard(game, achievement, 105 + column * 535, 125 + row * 155, 505, 135);
  });
  game.drawButton('العودة', WIDTH / 2 - 145, 620, 290, 48, () => { game.audio.play('click'); game.state = 'menu'; }, true);
}

function drawRefinedDaily(game) {
  const config = dailyChallengeForDate(new Date());
  const save = ensureSave(game);
  const record = save.replayability.daily.records[config.date] || { attempts: 0, bestScore: 0, bestTime: 0, completed: false };
  const core = coreById(config.coreId) || BULLET_CORES[0];
  const ctx = game.ctx;
  dim(ctx, 0.9);
  label(ctx, 'التحدي اليومي', WIDTH / 2, 60, 42, COLORS.yellow, 900);
  number(ctx, config.date, WIDTH / 2, 91, 14, COLORS.muted);
  panel(ctx, 135, 116, 1010, 484, COLORS.yellow, 'rgba(9, 14, 31, 0.96)', 16);
  label(ctx, config.challenge.name, WIDTH / 2, 172, 30, COLORS.text, 900);
  label(ctx, config.challenge.description, WIDTH / 2, 207, 15, COLORS.muted, 600);

  panel(ctx, 185, 240, 285, 132, core.color, COLORS.panelSoft, 7);
  label(ctx, 'النواة المفروضة', 442, 273, 12, COLORS.muted, 600, 'right');
  label(ctx, `${core.icon} ${core.name}`, 442, 314, 19, core.color, 900, 'right');
  label(ctx, 'متاحة داخل التحدي حتى لو لم تُفتح.', 442, 344, 11, COLORS.muted, 500, 'right');

  panel(ctx, 497, 240, 285, 132, COLORS.purple, COLORS.panelSoft, 7);
  label(ctx, 'معدل اليوم', 754, 273, 12, COLORS.muted, 600, 'right');
  label(ctx, config.mutator.name, 754, 311, 18, COLORS.purple, 900, 'right');
  label(ctx, config.mutator.description, 754, 344, 11, COLORS.muted, 500, 'right');

  panel(ctx, 809, 240, 285, 132, COLORS.yellow, COLORS.panelSoft, 7);
  label(ctx, 'مكافأة أول إكمال', 1066, 273, 12, COLORS.muted, 600, 'right');
  number(ctx, `+${config.challenge.reward + 65}`, 951, 317, 27, COLORS.yellow);
  label(ctx, 'شظية نواة', 951, 344, 11, COLORS.muted, 500);

  const stats = [
    ['المحاولات', record.attempts || 0, COLORS.text],
    ['أفضل نتيجة', formatNumber(game, record.bestScore || 0), COLORS.cyan],
    ['أفضل وقت', record.bestTime ? formatDuration(record.bestTime) : '—', COLORS.green],
    ['السلسلة', save.replayability.daily.streak || 0, COLORS.yellow],
  ];
  stats.forEach(([title, value, color], index) => {
    const x = 185 + index * 227;
    panel(ctx, x, 402, 205, 82, COLORS.border, 'rgba(14, 20, 42, 0.86)', 4);
    label(ctx, title, x + 102, 432, 12, COLORS.muted, 600);
    number(ctx, value, x + 102, 466, 19, color);
  });

  label(ctx, record.completed ? 'مكتمل اليوم — حسّن نتيجتك أو حافظ على السلسلة غدًا.' : 'لم يكتمل بعد — نفس المحتوى سيبقى ثابتًا حتى نهاية اليوم.', WIDTH / 2, 522, 14, record.completed ? COLORS.green : COLORS.yellow, 700);
  game.drawButton('ابدأ التحدي', 330, 545, 285, 48, () => game.startDailyChallenge?.(), true);
  game.drawButton('العودة', 665, 545, 285, 48, () => { game.audio.play('click'); game.state = 'menu'; });
}

function drawResultStat(game, title, value, x, y, accent) {
  const ctx = game.ctx;
  panel(ctx, x, y, 185, 64, COLORS.border, COLORS.panelSoft, 3);
  label(ctx, title, x + 165, y + 24, 11, COLORS.muted, 600, 'right');
  number(ctx, value, x + 165, y + 50, 17, accent, 'right');
}

function drawRefinedResult(game, victory) {
  const ctx = game.ctx;
  const save = ensureSave(game);
  const recorded = game.lastProgressionReward;
  const run = recorded?.run || {};
  const core = coreById(run.coreId || game.activeCoreId) || BULLET_CORES[0];
  const rank = run.rank || 'C';
  const accuracy = deriveAccuracyStats({
    shots: game.stats.shots,
    accurateShots: game.stats.accurateShots,
    directImpacts: game.stats.directImpacts ?? game.stats.hits,
  });
  const challenge = game.lastReplayabilitySummary || {
    challenge: game.runChallenge || RUN_CHALLENGES[0],
    completed: false,
    bonus: 0,
    newCosmetics: [],
    daily: game.isDailyRun,
  };
  const accent = victory ? COLORS.yellow : COLORS.red;
  dim(ctx, 0.93);
  label(ctx, victory ? 'تم إسقاط حارس النواة' : 'انتهت الجولة', WIDTH / 2, 57, 38, accent, 900);
  label(ctx, victory ? 'الطلقة عادت ومعها غنائم الجولة.' : 'التقدم محفوظ — عدّل بناءك وارجع أقوى.', WIDTH / 2, 86, 14, COLORS.muted, 600);
  panel(ctx, 62, 105, 1156, 528, accent, 'rgba(11, 14, 30, 0.97)', 15);

  label(ctx, rank, 1070, 220, 92, rank === 'S' ? COLORS.yellow : accent, 900);
  label(ctx, 'تقييم الجولة', 1070, 253, 13, COLORS.muted, 600);
  label(ctx, `${core.icon} ${core.name}`, 1070, 291, 16, core.color, 800);

  const stats = [
    ['النقاط', formatNumber(game, game.score), COLORS.yellow],
    ['الوقت', formatDuration(game.runTime), COLORS.cyan],
    ['الإطلاقات', accuracy.shots, COLORS.text],
    ['إطلاقات أصابت', accuracy.accurateShots, COLORS.green],
    ['إجمالي الاصطدامات', accuracy.directImpacts, COLORS.purple],
    ['الدقة', `${Math.round(accuracy.accuracy * 100)}%`, COLORS.green],
    ['الأعداء', game.stats.kills, COLORS.orange],
    ['الارتدادات', game.stats.ricochets, COLORS.purple],
  ];
  stats.forEach(([title, value, color], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    drawResultStat(game, title, value, 105 + column * 202, 145 + row * 76, color);
  });

  panel(ctx, 520, 330, 635, 124, COLORS.yellow, 'rgba(55, 46, 18, 0.72)', 8);
  label(ctx, 'مكافآت الجولة', 1125, 363, 17, COLORS.text, 800, 'right');
  label(ctx, 'شظايا الأداء', 1125, 396, 13, COLORS.muted, 600, 'right');
  number(ctx, `+${recorded?.reward || 0}`, 570, 398, 21, COLORS.yellow, 'left');
  label(ctx, 'الرصيد الحالي', 1125, 428, 13, COLORS.muted, 600, 'right');
  number(ctx, formatNumber(game, save.shards), 570, 430, 21, COLORS.yellow, 'left');

  const challengeAccent = challenge.completed ? COLORS.green : COLORS.red;
  panel(ctx, 520, 470, 635, 92, challengeAccent, 'rgba(18, 12, 28, 0.92)', 7);
  label(ctx, challenge.completed ? `✓ اكتمل: ${challenge.challenge.name}` : `لم يكتمل: ${challenge.challenge.name}`, 1125, 502, 15, challengeAccent, 800, 'right');
  label(ctx, challenge.completed ? `مكافأة إضافية +${challenge.bonus}` : challenge.challenge.description, 1125, 531, 12, COLORS.muted, 600, 'right');
  if (challenge.newCosmetics?.length) label(ctx, `مظهر جديد: ${challenge.newCosmetics[0].name}`, 570, 531, 12, COLORS.yellow, 800, 'left');

  game.drawButton('العب من جديد', 105, 578, 300, 45, () => game.startRun(), true);
  game.drawButton('مركز النواة', 490, 578, 300, 45, () => { game.audio.play('click'); game.state = 'coreHub'; });
  game.drawButton('القائمة الرئيسية', 875, 578, 280, 45, () => { game.audio.play('click'); game.goToMenu(); });
}

function drawRefinedPause(game) {
  const ctx = game.ctx;
  dim(ctx, 0.82);
  panel(ctx, WIDTH / 2 - 250, 112, 500, 500, COLORS.cyan, 'rgba(9, 14, 31, 0.97)', 16);
  label(ctx, 'اللعبة متوقفة', WIDTH / 2, 172, 37, COLORS.text, 900);
  const challenge = challengePresentation(game, false);
  const challengeAccent = challenge.status === 'failed' ? COLORS.red : challenge.status === 'completed' ? COLORS.green : COLORS.purple;
  panel(ctx, WIDTH / 2 - 205, 207, 410, 82, challengeAccent, COLORS.panelSoft, 5);
  label(ctx, challenge.challenge.name, WIDTH / 2, 239, 16, COLORS.text, 800);
  label(ctx, challenge.status === 'failed' ? challenge.reason : challenge.progress, WIDTH / 2, 267, 12, challengeAccent, 700);
  game.drawButton('متابعة اللعب', WIDTH / 2 - 180, 318, 360, 48, () => game.resumeGame(), true);
  game.drawButton('فحص البناء', WIDTH / 2 - 180, 378, 360, 48, () => {
    game.audio.play('click'); game.buildReturnState = 'paused'; game.state = 'buildInspect';
  });
  game.drawButton('الإعدادات', WIDTH / 2 - 180, 438, 360, 48, () => game.openSettings('paused'));
  game.drawButton('القائمة الرئيسية', WIDTH / 2 - 180, 498, 360, 48, () => { game.audio.play('click'); game.goToMenu(); });
  label(ctx, 'B فحص البناء  •  P متابعة  •  Esc رجوع', WIDTH / 2, 578, 12, COLORS.muted, 600);
}

function drawEliteDanger(game) {
  const ctx = game.ctx;
  for (const enemy of game.enemies || []) {
    if (enemy.eliteModifier !== 'explosive') continue;
    const pulse = 0.35 + Math.sin(game.elapsed * 8 + enemy.id) * 0.15;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = COLORS.red;
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 6]);
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius + 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}

export function installUiFeedbackBalance(GameClass) {
  const prototype = GameClass.prototype;
  if (prototype.__uiFeedbackBalanceInstalled) return;
  prototype.__uiFeedbackBalanceInstalled = true;

  const originalResetRun = prototype.resetRun;
  prototype.resetRun = function resetRunWithAccuracy(...args) {
    const result = originalResetRun.apply(this, args);
    this.stats.accurateShots = 0;
    this.stats.directImpacts = 0;
    this.challengeFeedbackState = 'active';
    this.challengeToast = null;
    this.eliteAlert = null;
    this.waveIntroGrace = 0;
    return result;
  };

  const originalFireBullet = prototype.fireBullet;
  prototype.fireBullet = function fireWithAccuracyTracking(...args) {
    const wasHeld = this.bullet.held;
    const result = originalFireBullet.apply(this, args);
    if (wasHeld && !this.bullet.held) this.bullet.accuracyCounted = false;
    return result;
  };

  const markAccurateShot = (game) => {
    if (game.bullet.accuracyCounted) return;
    game.bullet.accuracyCounted = true;
    game.stats.accurateShots += 1;
  };

  const originalDamageEnemy = prototype.damageEnemy;
  prototype.damageEnemy = function damageEnemyWithAccuracy(enemy, damage, forceX, forceY, fromBullet) {
    const hpBefore = Number(enemy?.hp) || 0;
    const result = originalDamageEnemy.call(this, enemy, damage, forceX, forceY, fromBullet);
    const hpAfter = Number(enemy?.hp) || 0;
    if (fromBullet && hpAfter < hpBefore) markAccurateShot(this);
    this.stats.directImpacts = Math.max(this.stats.directImpacts || 0, this.stats.hits || 0);
    return result;
  };

  const originalDamageBoss = prototype.damageBoss;
  prototype.damageBoss = function damageBossWithAccuracy(damage, bypassShield = false) {
    const hpBefore = Number(this.boss?.hp) || 0;
    const result = originalDamageBoss.call(this, damage, bypassShield);
    const hpAfter = Number(this.boss?.hp) || 0;
    if (!bypassShield && hpAfter < hpBefore) {
      markAccurateShot(this);
      this.stats.directImpacts = Math.max(this.stats.directImpacts || 0, this.stats.hits || 0);
    }
    return result;
  };

  const originalFinishRun = prototype.finishRun;
  prototype.finishRun = function finishWithAccuracySemantics(victory) {
    const impacts = Math.max(this.stats.directImpacts || 0, this.stats.hits || 0);
    const accurateShots = Math.min(this.stats.shots || 0, this.stats.accurateShots || 0);
    const previousHits = this.stats.hits;
    this.stats.hits = accurateShots;
    const result = originalFinishRun.call(this, victory);
    this.stats.hits = previousHits;
    this.stats.directImpacts = impacts;
    if (this.lastProgressionReward?.run) {
      this.lastProgressionReward.run.hits = accurateShots;
      this.lastProgressionReward.run.directImpacts = impacts;
      this.lastProgressionReward.run.accuracy = this.stats.shots > 0 ? accurateShots / this.stats.shots : 0;
      const save = ensureSave(this);
      const history = save.history.find((item) => item.id === this.lastProgressionReward.run.id);
      if (history) Object.assign(history, this.lastProgressionReward.run);
      persistSave(this);
    }
    return result;
  };

  const originalSpawnNextWave = prototype.spawnNextWave;
  prototype.spawnNextWave = function spawnWithGrace(...args) {
    const result = originalSpawnNextWave.apply(this, args);
    this.waveIntroGrace = 0.72;
    return result;
  };

  const originalUpdateEnemies = prototype.updateEnemies;
  prototype.updateEnemies = function updateEnemiesAfterIntro(dt) {
    if (this.waveIntroGrace > 0) {
      this.waveIntroGrace = Math.max(0, this.waveIntroGrace - dt);
      return undefined;
    }
    return originalUpdateEnemies.call(this, dt);
  };

  const originalSpawnEnemy = prototype.spawnEnemy;
  prototype.spawnEnemy = function spawnEnemyWithAlert(type, options = {}) {
    const before = this.enemies.length;
    const result = originalSpawnEnemy.call(this, type, options);
    const enemy = this.enemies[before];
    if (enemy?.eliteModifier) {
      const modifier = eliteModifierById(enemy.eliteModifier);
      if (modifier) this.eliteAlert = { ...modifier, time: 2.2 };
    }
    return result;
  };

  const originalUpdate = prototype.update;
  prototype.update = function updateFeedbackTimers(dt) {
    const result = originalUpdate.call(this, dt);
    if (this.eliteAlert) this.eliteAlert.time = Math.max(0, this.eliteAlert.time - dt);
    if (this.challengeToast) this.challengeToast.time = Math.max(0, this.challengeToast.time - dt);
    const state = challengePresentation(this, false);
    if (state.status !== this.challengeFeedbackState && ['failed', 'completed'].includes(state.status)) {
      this.challengeFeedbackState = state.status;
      this.challengeToast = {
        status: state.status,
        text: state.status === 'failed' ? `فشل التحدي: ${state.reason}` : `اكتمل التحدي: ${state.challenge.name}`,
        time: 2.4,
      };
      this.audio.play(state.status === 'failed' ? 'damage' : 'upgrade');
    }
    return result;
  };

  prototype.drawMenu = function drawMenuBalanced() { drawRefinedMenu(this); };
  prototype.drawHud = function drawHudBalanced() { drawRefinedHud(this); };
  prototype.drawBanner = function drawBannerCompact() { drawCompactBanner(this); };
  prototype.drawResult = function drawResultBalanced(victory) { drawRefinedResult(this, victory); };
  prototype.drawPauseMenu = function drawPauseBalanced() { drawRefinedPause(this); };

  const originalDrawEnemies = prototype.drawEnemies;
  prototype.drawEnemies = function drawEnemiesWithDanger(...args) {
    originalDrawEnemies.apply(this, args);
    drawEliteDanger(this);
  };

  const originalDraw = prototype.draw;
  prototype.draw = function drawRefinedCustomStates(...args) {
    if (this.state === 'achievements' || this.state === 'dailyBrief') {
      this.uiRegions = [];
      this.ctx.save();
      this.drawArena();
      if (this.state === 'achievements') drawRefinedAchievements(this);
      else drawRefinedDaily(this);
      this.ctx.restore();
      return undefined;
    }
    const result = originalDraw.apply(this, args);
    if (this.challengeToast?.time > 0 && this.state === 'playing') {
      const accent = this.challengeToast.status === 'failed' ? COLORS.red : COLORS.green;
      this.ctx.save();
      panel(this.ctx, WIDTH / 2 - 245, 176, 490, 52, accent, 'rgba(10, 13, 28, 0.95)', 10);
      label(this.ctx, this.challengeToast.text, WIDTH / 2, 209, 16, accent, 900);
      this.ctx.restore();
    }
    return result;
  };
}
