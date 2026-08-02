import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from './content.js';
import { formatUiNumber } from './ui-polish.js';
import {
  PROGRESSION_STORAGE_KEY,
  coreById,
  createDefaultSave,
  normalizeSave,
} from './progression-data.js';
import {
  COSMETICS,
  ELITE_MODIFIERS,
  LEGENDARY_UPGRADES,
  RARITY_TIERS,
  RUN_CHALLENGES,
  challengeById,
  cosmeticById,
  dailyChallengeForDate,
  dateKey,
  decorateUpgradeChoices,
  deriveCosmeticUnlocks,
  eliteModifierById,
  evaluateChallenge,
  pickEliteModifier,
  previousDateKey,
  resolveSynergies,
  chooseRunChallenge,
} from './replayability-data.js';

const FONT = 'Changa, "Segoe UI", Tahoma, sans-serif';
const NUMERIC_FONT = 'Inter, "Segoe UI", Arial, sans-serif';
const CUSTOM_STATES = new Set(['dailyBrief', 'cosmetics', 'buildInspect']);
const COLORS = {
  panel: 'rgba(8, 12, 27, 0.96)',
  panelSoft: 'rgba(16, 23, 47, 0.92)',
  border: '#33406f',
  cyan: '#62f3ff',
  yellow: '#ffe66d',
  red: '#ff526a',
  orange: '#ff9f43',
  purple: '#b983ff',
  green: '#53f2a1',
  text: '#f8f9ff',
  muted: '#aeb7da',
  dim: '#6d7698',
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
  const gradient = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 60, WIDTH / 2, HEIGHT / 2, 760);
  gradient.addColorStop(0, `rgba(8, 12, 28, ${Math.max(0, alpha - 0.08)})`);
  gradient.addColorStop(1, `rgba(1, 2, 7, ${alpha})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function ensureSave(game) {
  if (!game.progressionSave) game.progressionSave = createDefaultSave();
  game.progressionSave = normalizeSave(game.progressionSave);
  return game.progressionSave;
}

function persistSave(game) {
  const save = normalizeSave(ensureSave(game));
  save.updatedAt = new Date().toISOString();
  game.progressionSave = save;
  if (typeof localStorage !== 'undefined') localStorage.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(save));
  return save;
}

function formatNumber(game, value) {
  return formatUiNumber(value, game.uiSettings?.latinDigits !== false);
}

function rarityBonus(game, upgradeId) {
  const rarities = game.upgradeRarities?.[upgradeId] || [];
  return rarities.reduce((total, rarity) => total + Math.max(0, (RARITY_TIERS[rarity]?.power || 1) - 1), 0);
}

function selectedCosmetic(game, slot) {
  const save = ensureSave(game);
  const id = save.replayability.selectedCosmetics[slot];
  return cosmeticById(id) || COSMETICS.find((item) => item.slot === slot && item.default) || null;
}

function activeSynergies(game) {
  return resolveSynergies(game.activeCoreId || ensureSave(game).selectedCore, game.upgradeStacks || {});
}

function hasSynergy(game, id) {
  return activeSynergies(game).some((synergy) => synergy.id === id);
}

function nearestEnemies(game, origin, count, radius = 190, excludedIds = new Set()) {
  return game.enemies
    .filter((enemy) => !excludedIds.has(enemy.id))
    .map((enemy) => ({ enemy, distance: (enemy.x - origin.x) ** 2 + (enemy.y - origin.y) ** 2 }))
    .filter((entry) => entry.distance <= radius ** 2)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count)
    .map((entry) => entry.enemy);
}

function challengeProgress(game) {
  const challenge = game.runChallenge || RUN_CHALLENGES[0];
  const metrics = {
    ...game.replayMetrics,
    shots: game.stats?.shots || 0,
    damageTaken: game.stats?.damageTaken || 0,
  };
  return challenge.progressLabel(metrics);
}

function applyDailyStartMutator(game) {
  const mutator = game.dailyConfig?.mutator?.id;
  if (mutator === 'fragile-core') {
    game.player.maxHealth = Math.min(game.player.maxHealth, 2);
    game.player.health = Math.min(game.player.health, 2);
  }
}

function applyCosmeticUnlocks(game) {
  const save = ensureSave(game);
  const before = new Set(save.replayability.unlockedCosmetics);
  const derived = deriveCosmeticUnlocks(save.replayability);
  for (const id of derived) if (!before.has(id)) save.replayability.unlockedCosmetics.push(id);
  return derived.filter((id) => !before.has(id)).map(cosmeticById).filter(Boolean);
}

function updateDailyRecord(game, victory) {
  if (!game.isDailyRun || !game.dailyConfig) return { firstCompletion: false, streakChanged: false };
  const save = ensureSave(game);
  const daily = save.replayability.daily;
  const key = game.dailyConfig.date;
  const record = daily.records[key] || { attempts: 0, bestScore: 0, bestTime: 0, completed: false };
  const wasCompleted = record.completed;
  record.bestScore = Math.max(record.bestScore, game.score || 0);
  if (victory && (record.bestTime === 0 || game.runTime < record.bestTime)) record.bestTime = game.runTime;
  record.completed = record.completed || victory;
  daily.records[key] = record;
  daily.lastAttemptDate = key;

  let streakChanged = false;
  if (victory && !wasCompleted) {
    if (daily.lastWinDate === previousDateKey(key)) daily.streak += 1;
    else if (daily.lastWinDate !== key) daily.streak = 1;
    daily.lastWinDate = key;
    save.replayability.totals.dailyWins += 1;
    streakChanged = true;
  }
  return { firstCompletion: victory && !wasCompleted, streakChanged };
}

function finalizeReplayabilityRun(game, victory) {
  if (game.replayabilityRunRecorded) return;
  game.replayabilityRunRecorded = true;
  const save = ensureSave(game);
  const challenge = game.runChallenge || RUN_CHALLENGES[0];
  const metrics = {
    ...game.replayMetrics,
    victory,
    shots: game.stats.shots,
    damageTaken: game.stats.damageTaken,
  };
  const challengeCompleted = evaluateChallenge(challenge.id, metrics);
  const dailyState = updateDailyRecord(game, victory);
  let bonus = challengeCompleted ? challenge.reward : 0;
  if (game.isDailyRun && challengeCompleted) bonus += 25;
  if (game.isDailyRun && dailyState.firstCompletion) bonus += 40;

  if (challengeCompleted) {
    save.replayability.challengeCompletions[challenge.id] = (save.replayability.challengeCompletions[challenge.id] || 0) + 1;
    save.replayability.totals.challengesCompleted += 1;
  }
  save.replayability.totals.legendaryPicks += game.replayMetrics.legendaryPicks;
  save.replayability.totals.eliteKills += game.replayMetrics.eliteKills;
  save.shards += bonus;
  save.stats.totalShardsEarned += bonus;

  const recorded = game.lastProgressionReward;
  if (recorded?.run) {
    recorded.reward += bonus;
    recorded.run.shards += bonus;
    recorded.run.challengeId = challenge.id;
    recorded.run.challengeCompleted = challengeCompleted;
    recorded.run.daily = game.isDailyRun;
    recorded.run.eliteKills = game.replayMetrics.eliteKills;
    recorded.run.legendaryPicks = game.replayMetrics.legendaryPicks;
    const historyRun = save.history.find((run) => run.id === recorded.run.id) || save.history[0];
    if (historyRun) Object.assign(historyRun, recorded.run);
  }

  const newCosmetics = applyCosmeticUnlocks(game);
  game.lastReplayabilitySummary = {
    challenge,
    completed: challengeCompleted,
    bonus,
    daily: game.isDailyRun,
    newCosmetics,
    synergies: activeSynergies(game),
  };
  persistSave(game);
}

function drawRarityOverlay(game, upgrade, x, y) {
  const rarity = RARITY_TIERS[upgrade.rarity || 'common'] || RARITY_TIERS.common;
  const ctx = game.ctx;
  ctx.save();
  ctx.strokeStyle = rarity.color;
  ctx.lineWidth = upgrade.rarity === 'legendary' ? 4 : 2;
  ctx.globalAlpha = 0.95;
  roundedRect(ctx, x, y, 332, 392, 20);
  ctx.stroke();
  ctx.fillStyle = `${rarity.color}24`;
  roundedRect(ctx, x + 100, y + 20, 100, 29, 14);
  ctx.fill();
  label(ctx, rarity.name, x + 150, y + 40, 13, rarity.color, 900);
  if (upgrade.rarity === 'legendary') {
    ctx.globalAlpha = 0.14 + Math.sin(game.elapsed * 7) * 0.04;
    ctx.fillStyle = rarity.color;
    roundedRect(ctx, x + 3, y + 3, 326, 386, 18);
    ctx.fill();
  }
  ctx.restore();
}

function drawEliteMarkers(game) {
  const ctx = game.ctx;
  for (const enemy of game.enemies) {
    if (!enemy.eliteModifier) continue;
    const modifier = eliteModifierById(enemy.eliteModifier);
    if (!modifier) continue;
    ctx.save();
    ctx.strokeStyle = modifier.color;
    ctx.globalAlpha = 0.52;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 7]);
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius + 16 + Math.sin(game.elapsed * 5 + enemy.id) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    label(ctx, modifier.icon, enemy.x, enemy.y - enemy.radius - 18, 15, modifier.color, 900);
    ctx.restore();
  }
}

function drawChallengeHud(game) {
  if (!game.runChallenge || game.state !== 'playing') return;
  const ctx = game.ctx;
  const complete = evaluateChallenge(game.runChallenge.id, {
    ...game.replayMetrics,
    victory: false,
    shots: game.stats.shots,
    damageTaken: game.stats.damageTaken,
  });
  ctx.save();
  ctx.fillStyle = 'rgba(8, 12, 27, 0.82)';
  ctx.strokeStyle = complete ? COLORS.green : game.isDailyRun ? COLORS.yellow : COLORS.purple;
  ctx.lineWidth = 1.5;
  roundedRect(ctx, WIDTH / 2 - 190, HEIGHT - 52, 380, 34, 12);
  ctx.fill();
  ctx.stroke();
  label(ctx, `${game.isDailyRun ? 'يومي' : 'تحدي'}: ${game.runChallenge.name}  •  ${challengeProgress(game)}`, WIDTH / 2, HEIGHT - 30, 12, complete ? COLORS.green : COLORS.text, 700);
  ctx.restore();
}

function drawCosmeticEffects(game) {
  const playerCosmetic = selectedCosmetic(game, 'player');
  const bulletCosmetic = selectedCosmetic(game, 'bullet');
  const trailCosmetic = selectedCosmetic(game, 'trail');
  const dashCosmetic = selectedCosmetic(game, 'dash');
  const ctx = game.ctx;

  if (game.player && playerCosmetic) {
    ctx.save();
    ctx.strokeStyle = playerCosmetic.color;
    ctx.globalAlpha = 0.52;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(game.player.x, game.player.y, game.player.radius + 20 + Math.sin(game.elapsed * 6) * 2, 0, Math.PI * 2);
    ctx.stroke();
    if (game.player.dashRemaining > 0 && dashCosmetic) {
      ctx.globalAlpha = 0.34;
      ctx.fillStyle = dashCosmetic.color;
      ctx.beginPath();
      ctx.arc(game.player.x, game.player.y, game.player.radius + 28, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  if (game.bullet && !game.bullet.held && bulletCosmetic) {
    ctx.save();
    ctx.strokeStyle = bulletCosmetic.color;
    ctx.shadowColor = bulletCosmetic.color;
    ctx.shadowBlur = 16;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(game.bullet.x, game.bullet.y, game.bullet.radius + 7, 0, Math.PI * 2);
    ctx.stroke();
    if (trailCosmetic) {
      game.bullet.trail.slice(0, 9).forEach((point, index) => {
        ctx.globalAlpha = Math.max(0.06, 0.34 - index * 0.03);
        ctx.fillStyle = trailCosmetic.color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, Math.max(1, 4 - index * 0.25), 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.restore();
  }
}

function drawReplayabilityResult(game) {
  const summary = game.lastReplayabilitySummary;
  if (!summary) return;
  const ctx = game.ctx;
  const accent = summary.completed ? COLORS.green : COLORS.red;
  panel(ctx, 190, 592, 900, 86, accent, 'rgba(8, 12, 27, 0.94)');
  label(ctx, summary.completed ? `✓ اكتمل: ${summary.challenge.name}` : `لم يكتمل: ${summary.challenge.name}`, 1058, 622, 15, accent, 800, 'right');
  label(ctx, summary.daily ? 'تحدي يومي ثابت' : summary.challenge.description, 1058, 650, 12, COLORS.muted, 600, 'right');
  number(ctx, summary.bonus > 0 ? `+${summary.bonus}` : '+0', 232, 636, 25, COLORS.yellow, 'left');
  label(ctx, 'شظايا إضافية', 232, 660, 11, COLORS.muted, 600, 'left');
  if (summary.newCosmetics.length) label(ctx, `مظهر جديد: ${summary.newCosmetics[0].name}`, WIDTH / 2, 660, 12, COLORS.yellow, 800);
}

function drawDailyBrief(game) {
  const config = dailyChallengeForDate(new Date());
  const save = ensureSave(game);
  const record = save.replayability.daily.records[config.date] || { attempts: 0, bestScore: 0, bestTime: 0, completed: false };
  const core = coreById(config.coreId);
  const ctx = game.ctx;
  dim(ctx, 0.91);
  label(ctx, 'التحدي اليومي', WIDTH / 2, 76, 47, COLORS.yellow, 900);
  label(ctx, config.date, WIDTH / 2, 108, 15, COLORS.muted, 700);
  panel(ctx, 190, 142, 900, 430, COLORS.yellow);
  label(ctx, config.challenge.name, WIDTH / 2, 205, 32, COLORS.text, 900);
  label(ctx, config.challenge.description, WIDTH / 2, 240, 16, COLORS.muted, 600);
  panel(ctx, 240, 276, 360, 126, core?.color || COLORS.cyan, COLORS.panelSoft);
  label(ctx, 'النواة المفروضة', 570, 310, 13, COLORS.muted, 600, 'right');
  label(ctx, `${core?.icon || '◆'} ${core?.name || 'النواة القياسية'}`, 570, 351, 22, core?.color || COLORS.cyan, 900, 'right');
  panel(ctx, 680, 276, 360, 126, COLORS.purple, COLORS.panelSoft);
  label(ctx, 'معدل اليوم', 1010, 310, 13, COLORS.muted, 600, 'right');
  label(ctx, config.mutator.name, 1010, 347, 20, COLORS.purple, 900, 'right');
  label(ctx, config.mutator.description, 1010, 377, 12, COLORS.muted, 500, 'right');
  label(ctx, `المحاولات: ${record.attempts}  •  أفضل نتيجة: ${formatNumber(game, record.bestScore)}  •  السلسلة: ${save.replayability.daily.streak}`, WIDTH / 2, 448, 15, COLORS.text, 700);
  label(ctx, record.completed ? 'مكتمل اليوم — يمكنك تحسين نتيجتك.' : 'أول إكمال يومي يمنح مكافأة إضافية ومظهرًا.', WIDTH / 2, 484, 14, record.completed ? COLORS.green : COLORS.yellow, 700);
  game.drawButton('ابدأ التحدي', 350, 515, 270, 52, () => game.startDailyChallenge?.(), true);
  game.drawButton('العودة', 660, 515, 270, 52, () => { game.audio.play('click'); game.state = 'menu'; });
}

function drawCosmeticCard(game, cosmetic, x, y, width, height) {
  const save = ensureSave(game);
  const unlocked = save.replayability.unlockedCosmetics.includes(cosmetic.id);
  const selected = save.replayability.selectedCosmetics[cosmetic.slot] === cosmetic.id;
  const ctx = game.ctx;
  panel(ctx, x, y, width, height, selected ? cosmetic.color : unlocked ? COLORS.border : '#252b42', selected ? `${cosmetic.color}1f` : COLORS.panelSoft);
  ctx.save();
  ctx.fillStyle = unlocked ? cosmetic.color : '#434a68';
  ctx.shadowColor = cosmetic.color;
  ctx.shadowBlur = unlocked ? 18 : 0;
  ctx.beginPath();
  ctx.arc(x + width - 42, y + 42, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  label(ctx, cosmetic.name, x + width - 72, y + 39, 17, unlocked ? COLORS.text : COLORS.dim, 800, 'right');
  label(ctx, cosmetic.slot === 'player' ? 'اللاعب' : cosmetic.slot === 'bullet' ? 'الطلقة' : cosmetic.slot === 'trail' ? 'الأثر' : cosmetic.slot === 'dash' ? 'الاندفاع' : 'الواجهة', x + width - 72, y + 65, 12, cosmetic.color, 700, 'right');
  label(ctx, selected ? 'مُستخدم الآن' : unlocked ? 'اضغط للاستخدام' : cosmetic.requirement, x + width / 2, y + height - 18, 12, selected ? COLORS.green : unlocked ? COLORS.muted : COLORS.dim, 700);
  game.addUiRegion(x, y, width, height, () => {
    if (!unlocked) { game.audio.play('damage'); return; }
    save.replayability.selectedCosmetics[cosmetic.slot] = cosmetic.id;
    persistSave(game);
    game.audio.play('upgrade');
  });
}

function drawCosmetics(game) {
  const ctx = game.ctx;
  const save = ensureSave(game);
  dim(ctx, 0.91);
  label(ctx, 'مخزن المظاهر', WIDTH / 2, 64, 43, COLORS.text, 900);
  label(ctx, 'مكافآت شكلية فقط — لا تمنح قوة قتالية.', WIDTH / 2, 96, 15, COLORS.muted, 600);
  const visible = COSMETICS.slice(0, 10);
  visible.forEach((cosmetic, index) => {
    const column = index % 5;
    const row = Math.floor(index / 5);
    drawCosmeticCard(game, cosmetic, 45 + column * 246, 132 + row * 205, 225, 178);
  });
  label(ctx, `${save.replayability.unlockedCosmetics.length} / ${COSMETICS.length} مظاهر مفتوحة`, WIDTH / 2, 588, 14, COLORS.yellow, 700);
  game.drawButton('العودة', WIDTH / 2 - 150, 620, 300, 48, () => { game.audio.play('click'); game.state = 'menu'; }, true);
}

function drawBuildInspect(game) {
  const ctx = game.ctx;
  const core = coreById(game.activeCoreId) || coreById('standard');
  const upgrades = Object.entries(game.upgradeStacks || {}).filter(([, count]) => count > 0);
  const synergies = activeSynergies(game);
  dim(ctx, 0.9);
  label(ctx, 'فحص البناء الحالي', WIDTH / 2, 62, 41, COLORS.text, 900);
  label(ctx, `${core.icon} ${core.name}`, WIDTH / 2, 98, 17, core.color, 800);
  panel(ctx, 60, 126, 730, 494, core.color);
  label(ctx, 'الترقيات', 752, 165, 22, COLORS.yellow, 800, 'right');
  if (!upgrades.length) label(ctx, 'لم تختر أي ترقية بعد.', 752, 220, 17, COLORS.muted, 600, 'right');
  upgrades.slice(0, 10).forEach(([id, count], index) => {
    const legendary = LEGENDARY_UPGRADES.find((item) => item.id === id);
    const rarities = game.upgradeRarities?.[id] || [];
    const rarity = RARITY_TIERS[rarities.at(-1) || (legendary ? 'legendary' : 'common')];
    const name = legendary?.name || id.replaceAll('-', ' ');
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 90 + column * 340;
    const y = 190 + row * 76;
    panel(ctx, x, y, 310, 60, rarity.color, COLORS.panelSoft);
    label(ctx, name, x + 285, y + 26, 14, COLORS.text, 800, 'right');
    label(ctx, `${rarity.name}  •  مستوى ${count}`, x + 285, y + 48, 12, rarity.color, 700, 'right');
  });
  panel(ctx, 820, 126, 400, 232, COLORS.purple);
  label(ctx, 'التركيبات', 1188, 166, 22, COLORS.purple, 800, 'right');
  if (!synergies.length) label(ctx, 'لم يكتمل أي Build خاص بعد.', 1188, 211, 14, COLORS.muted, 600, 'right');
  synergies.forEach((synergy, index) => {
    label(ctx, synergy.name, 1188, 210 + index * 55, 16, COLORS.yellow, 800, 'right');
    label(ctx, synergy.description, 1188, 232 + index * 55, 11, COLORS.muted, 500, 'right');
  });
  panel(ctx, 820, 382, 400, 238, game.isDailyRun ? COLORS.yellow : COLORS.cyan);
  label(ctx, game.isDailyRun ? 'التحدي اليومي' : 'تحدي الجولة', 1188, 422, 21, game.isDailyRun ? COLORS.yellow : COLORS.cyan, 800, 'right');
  label(ctx, game.runChallenge?.name || '—', 1188, 462, 18, COLORS.text, 800, 'right');
  label(ctx, game.runChallenge?.description || '', 1188, 492, 12, COLORS.muted, 500, 'right');
  label(ctx, `التقدم: ${challengeProgress(game)}`, 1188, 536, 14, COLORS.green, 700, 'right');
  game.drawButton('العودة للقتال', 875, 560, 290, 44, () => {
    game.audio.play('click');
    game.state = game.buildReturnState || 'paused';
    if (game.state === 'playing') game.audio.setScene(game.boss ? 'boss' : 'combat');
  }, true);
}

function drawMenuAdditions(game) {
  const config = dailyChallengeForDate(new Date());
  const save = ensureSave(game);
  const record = save.replayability.daily.records[config.date];
  const ctx = game.ctx;
  panel(ctx, 32, 250, 220, 188, COLORS.yellow, 'rgba(11, 16, 34, 0.9)');
  label(ctx, 'التحدي اليومي', 226, 284, 17, COLORS.yellow, 900, 'right');
  label(ctx, config.challenge.name, 226, 315, 14, COLORS.text, 800, 'right');
  label(ctx, record?.completed ? 'مكتمل اليوم' : 'مكافآت ثابتة يوميًا', 226, 342, 11, record?.completed ? COLORS.green : COLORS.muted, 600, 'right');
  game.drawButton('فتح التحدي', 52, 360, 180, 40, () => { game.audio.play('click'); game.state = 'dailyBrief'; }, true);
  game.drawButton('المظاهر', 52, 405, 180, 40, () => { game.audio.play('click'); game.state = 'cosmetics'; });
}

export function installReplayability(GameClass) {
  const prototype = GameClass.prototype;
  if (prototype.__replayabilityInstalled) return;
  prototype.__replayabilityInstalled = true;

  const originalResetRun = prototype.resetRun;
  prototype.resetRun = function resetRunWithReplayability(...args) {
    const result = originalResetRun.apply(this, args);
    const save = ensureSave(this);
    this.upgradeRarities = {};
    this.replayRunSeed = `${Date.now()}|${save.stats.totalRuns}|${save.selectedCore}`;
    this.dailyConfig = this.pendingDailyConfig || null;
    this.isDailyRun = Boolean(this.dailyConfig);
    this.runChallenge = this.dailyConfig?.challenge || chooseRunChallenge(this.replayRunSeed);
    this.replayMetrics = {
      dashes: 0,
      maxBounces: 0,
      currentShotKills: 0,
      maxKillsPerShot: 0,
      eliteKills: 0,
      legendaryPicks: 0,
    };
    this.replaySlowTimer = 0;
    this.replayabilityRunRecorded = false;
    this.lastReplayabilitySummary = null;
    this.eliteSerial = 0;
    applyDailyStartMutator(this);
    return result;
  };

  const originalStartRun = prototype.startRun;
  prototype.startRun = function startRunWithChallenge(...args) {
    this.pendingDailyConfig = this.nextRunDaily ? dailyChallengeForDate(new Date()) : null;
    this.nextRunDaily = false;
    const result = originalStartRun.apply(this, args);
    if (this.isDailyRun && this.dailyConfig) {
      this.activeCoreId = this.dailyConfig.coreId;
      const save = ensureSave(this);
      const record = save.replayability.daily.records[this.dailyConfig.date] || { attempts: 0, bestScore: 0, bestTime: 0, completed: false };
      record.attempts += 1;
      save.replayability.daily.records[this.dailyConfig.date] = record;
      save.replayability.daily.lastAttemptDate = this.dailyConfig.date;
      persistSave(this);
    }
    this.banner = {
      title: this.isDailyRun ? 'التحدي اليومي' : 'تحدي الجولة',
      subtitle: `${this.runChallenge.name} — ${this.runChallenge.description}`,
      time: 3.2,
    };
    return result;
  };

  const originalSpawnNextWave = prototype.spawnNextWave;
  prototype.spawnNextWave = function spawnWaveWithDailyRules(...args) {
    const result = originalSpawnNextWave.apply(this, args);
    if (this.isDailyRun && this.dailyConfig?.mutator?.id === 'elite-rush') this.spawnEnemy('scout', { elite: true });
    if (this.isDailyRun && this.dailyConfig?.mutator?.id === 'ricochet-storm') {
      for (const enemy of this.enemies) enemy.speed *= 1.1;
    }
    return result;
  };

  const originalSpawnEnemy = prototype.spawnEnemy;
  prototype.spawnEnemy = function spawnEnemyWithModifier(type, options = {}) {
    const before = this.enemies.length;
    const result = originalSpawnEnemy.call(this, type, options);
    const enemy = this.enemies[before];
    if (enemy?.elite) {
      const modifier = pickEliteModifier(this.wave, this.eliteSerial++, this.dailyConfig?.seed || this.replayRunSeed);
      enemy.eliteModifier = modifier.id;
      enemy.eliteReward = modifier.reward;
      enemy.replayLastHit = -999;
      enemy.replayTimer = 3.5 + (enemy.id % 3);
    }
    return result;
  };

  const originalOpenUpgradeSelection = prototype.openUpgradeSelection;
  prototype.openUpgradeSelection = function openRaritySelection(nextStage) {
    const result = originalOpenUpgradeSelection.call(this, nextStage);
    if (this.state !== 'upgrade') return result;
    const seed = `${this.dailyConfig?.seed || this.replayRunSeed}|upgrade|${this.wave}|${this.stats.upgrades}`;
    this.upgradeChoices = decorateUpgradeChoices(this.upgradeChoices, {
      wave: this.wave,
      stacks: this.upgradeStacks,
      seed,
      daily: this.isDailyRun,
    });
    return result;
  };

  const originalChooseUpgrade = prototype.chooseUpgrade;
  prototype.chooseUpgrade = function chooseRarityUpgrade(index) {
    const upgrade = this.upgradeChoices[index];
    if (!upgrade) return;
    const rarity = upgrade.rarity || 'common';
    const result = originalChooseUpgrade.call(this, index);
    if (!this.upgradeRarities[upgrade.id]) this.upgradeRarities[upgrade.id] = [];
    this.upgradeRarities[upgrade.id].push(rarity);
    if (rarity === 'legendary') this.replayMetrics.legendaryPicks += 1;
    if (upgrade.id === 'nuclear-gamble') {
      this.player.maxHealth = Math.max(1, this.player.maxHealth - 1);
      this.player.health = Math.min(this.player.health, this.player.maxHealth);
    }
    const synergies = activeSynergies(this);
    if (synergies.length) {
      this.banner = { title: synergies.at(-1).name, subtitle: synergies.at(-1).description, time: 2.5 };
      this.audio.play('upgrade');
    }
    return result;
  };

  const originalFireBullet = prototype.fireBullet;
  prototype.fireBullet = function fireReplayableBullet(...args) {
    const held = this.bullet.held;
    const result = originalFireBullet.apply(this, args);
    if (!held || this.bullet.held) return result;
    this.replayMetrics.currentShotKills = 0;
    this.bullet.finalExplosionTriggered = false;
    this.bullet.bouncesRemaining += Math.round(rarityBonus(this, 'extended-charge') * 1.5);
    if (this.isDailyRun && this.dailyConfig?.mutator?.id === 'ricochet-storm') this.bullet.bouncesRemaining += 2;
    if (this.isDailyRun && this.dailyConfig?.mutator?.id === 'overclocked') {
      this.bullet.vx *= 1.12;
      this.bullet.vy *= 1.12;
    }
    return result;
  };

  const originalRecallBullet = prototype.recallBullet;
  prototype.recallBullet = function recallWithRarity(...args) {
    const wasRecalling = this.bullet.recalling;
    const result = originalRecallBullet.apply(this, args);
    if (!wasRecalling && this.bullet.recalling) {
      this.bullet.recallCooldown = Math.max(0.7, this.bullet.recallCooldown - rarityBonus(this, 'magnetic-recall') * 0.4);
      if (this.isDailyRun && this.dailyConfig?.mutator?.id === 'overclocked') this.bullet.recallCooldown += 0.8;
    }
    return result;
  };

  const originalTryDash = prototype.tryDash;
  prototype.tryDash = function dashWithChallengeTracking(...args) {
    const before = this.player.dashRemaining;
    const result = originalTryDash.apply(this, args);
    if (before <= 0 && this.player.dashRemaining > 0) {
      this.replayMetrics.dashes += 1;
      this.player.dashCooldown *= Math.max(0.58, 1 - rarityBonus(this, 'quick-recovery') * 0.1);
    }
    return result;
  };

  const originalCurrentBulletDamage = prototype.currentBulletDamage;
  prototype.currentBulletDamage = function damageWithRarityAndLegendary() {
    let damage = originalCurrentBulletDamage.call(this);
    damage += rarityBonus(this, 'heavy-core') * 0.42;
    damage += this.bullet.bounceCount * rarityBonus(this, 'hot-ricochet') * 0.2;
    if (this.player.health === 1) damage *= 1 + rarityBonus(this, 'last-heart') * 0.25;
    if (this.stack('ghost-round') > 0 && this.bullet.bounceCount >= 4) damage *= 1.45;
    if (this.stack('vengeful-return') > 0 && this.bullet.recalling) damage *= 1.65;
    if (this.stack('nuclear-gamble') > 0) damage *= 1.8;
    if (hasSynergy(this, 'angle-master') && this.bullet.bounceCount > 0 && this.bullet.bounceCount % 4 === 0) damage *= 1.25;
    return damage;
  };

  const originalOnRicochet = prototype.onRicochet;
  prototype.onRicochet = function ricochetWithLegendary(...args) {
    const result = originalOnRicochet.apply(this, args);
    this.replayMetrics.maxBounces = Math.max(this.replayMetrics.maxBounces, this.bullet.bounceCount);
    if (this.stack('final-detonation') > 0 && this.bullet.bouncesRemaining <= 0 && !this.bullet.finalExplosionTriggered) {
      this.bullet.finalExplosionTriggered = true;
      const siege = hasSynergy(this, 'siege-core');
      const radius = siege ? 185 : 135;
      const damage = siege ? 3.1 : 2.1;
      this.createRing(this.bullet.x, this.bullet.y, COLORS.yellow, radius);
      this.createBurst(this.bullet.x, this.bullet.y, COLORS.orange, siege ? 38 : 26, 330);
      for (const enemy of [...this.enemies]) {
        if ((enemy.x - this.bullet.x) ** 2 + (enemy.y - this.bullet.y) ** 2 <= radius ** 2) {
          this.damageEnemy(enemy, damage, enemy.x - this.bullet.x, enemy.y - this.bullet.y, false);
        }
      }
      if (this.boss && (this.boss.x - this.bullet.x) ** 2 + (this.boss.y - this.bullet.y) ** 2 <= radius ** 2) this.damageBoss(siege ? 2.2 : 1.4, true);
      this.shake = Math.max(this.shake, 12);
    }
    return result;
  };

  const originalDamageEnemy = prototype.damageEnemy;
  prototype.damageEnemy = function damageEnemyWithReplayability(enemy, damage, forceX, forceY, fromBullet) {
    if (enemy.eliteModifier === 'armored' && fromBullet && this.bullet.bounceCount === 0) {
      this.audio.play('ricochet');
      this.createRing(enemy.x, enemy.y, COLORS.cyan, enemy.radius + 24);
      this.addFloatingText(enemy.x, enemy.y - enemy.radius - 18, 'يحتاج ارتدادًا', COLORS.cyan);
      return undefined;
    }
    enemy.replayLastHit = this.elapsed;
    const origin = { id: enemy.id, x: enemy.x, y: enemy.y };
    const result = originalDamageEnemy.call(this, enemy, damage, forceX, forceY, fromBullet);
    if (fromBullet && this.stack('chain-lightning') > 0) {
      const extraCount = hasSynergy(this, 'storm-loop') ? 3 : 2;
      const excluded = new Set([origin.id]);
      nearestEnemies(this, origin, extraCount, 220, excluded).forEach((target, index) => {
        excluded.add(target.id);
        originalDamageEnemy.call(this, target, Math.max(0.35, damage * (0.42 - index * 0.08)), target.x - origin.x, target.y - origin.y, false);
        this.createRing(target.x, target.y, COLORS.purple, 45);
      });
    }
    if (fromBullet && this.bullet.recalling && hasSynergy(this, 'recall-hunter')) this.player.shield = Math.max(this.player.shield, 1);
    return result;
  };

  const originalKillEnemy = prototype.killEnemy;
  prototype.killEnemy = function killEnemyWithModifiers(enemy) {
    const existed = this.enemies.some((item) => item.id === enemy.id);
    const modifierId = enemy.eliteModifier;
    const position = { x: enemy.x, y: enemy.y };
    const result = originalKillEnemy.call(this, enemy);
    const killed = existed && !this.enemies.some((item) => item.id === enemy.id);
    if (!killed) return result;
    this.replayMetrics.currentShotKills += 1;
    this.replayMetrics.maxKillsPerShot = Math.max(this.replayMetrics.maxKillsPerShot, this.replayMetrics.currentShotKills);
    if (modifierId) {
      this.replayMetrics.eliteKills += 1;
      this.score += enemy.eliteReward || 20;
    }
    if (this.stack('time-core') > 0 && this.bullet.bounceCount > 0) this.replaySlowTimer = Math.max(this.replaySlowTimer, 2.4);
    if (modifierId === 'explosive' && !this.replayExplosionGuard) {
      this.replayExplosionGuard = true;
      this.createRing(position.x, position.y, COLORS.red, 120);
      this.createBurst(position.x, position.y, COLORS.red, 24, 280);
      for (const target of [...this.enemies]) {
        if ((target.x - position.x) ** 2 + (target.y - position.y) ** 2 <= 120 ** 2) originalDamageEnemy.call(this, target, 1.25, target.x - position.x, target.y - position.y, false);
      }
      if ((this.player.x - position.x) ** 2 + (this.player.y - position.y) ** 2 <= 95 ** 2) this.damagePlayer(position.x, position.y);
      this.replayExplosionGuard = false;
    }
    return result;
  };

  const originalUpdateEnemies = prototype.updateEnemies;
  prototype.updateEnemies = function updateEnemiesWithModifiers(dt) {
    const originalSpeeds = new Map(this.enemies.map((enemy) => [enemy.id, enemy.speed]));
    const slowMultiplier = this.replaySlowTimer > 0 ? 0.55 : 1;
    const accelerators = this.enemies.filter((enemy) => enemy.eliteModifier === 'accelerator');
    for (const enemy of this.enemies) {
      let multiplier = slowMultiplier;
      if (accelerators.some((source) => source.id !== enemy.id && (source.x - enemy.x) ** 2 + (source.y - enemy.y) ** 2 <= 180 ** 2)) multiplier *= 1.22;
      enemy.speed *= multiplier;
    }
    const result = originalUpdateEnemies.call(this, dt);
    for (const enemy of this.enemies) {
      if (originalSpeeds.has(enemy.id)) enemy.speed = originalSpeeds.get(enemy.id);
      if (enemy.eliteModifier === 'regenerator' && this.elapsed - (enemy.replayLastHit || -999) > 2.4 && enemy.hp < enemy.maxHp) {
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + dt * 0.48);
      }
      if (enemy.eliteModifier === 'summoner') {
        enemy.replayTimer -= dt;
        if (enemy.replayTimer <= 0 && this.enemies.length < 18) {
          enemy.replayTimer = 5.4;
          this.spawnEnemy('scout', { mini: true, point: { x: Math.max(45, Math.min(WIDTH - 45, enemy.x + 34)), y: Math.max(45, Math.min(HEIGHT - 45, enemy.y + 18)) } });
        }
      }
      if (enemy.eliteModifier === 'bullet-hunter' && !this.bullet.held) {
        const dx = this.bullet.x - enemy.x;
        const dy = this.bullet.y - enemy.y;
        const length = Math.hypot(dx, dy) || 1;
        enemy.x += dx / length * 68 * dt;
        enemy.y += dy / length * 68 * dt;
      }
    }
    this.replaySlowTimer = Math.max(0, this.replaySlowTimer - dt);
    return result;
  };

  const originalFinishRun = prototype.finishRun;
  prototype.finishRun = function finishRunWithReplayability(victory) {
    const result = originalFinishRun.call(this, victory);
    finalizeReplayabilityRun(this, victory);
    return result;
  };

  const originalDrawUpgradeCard = prototype.drawUpgradeCard;
  prototype.drawUpgradeCard = function drawRarityUpgradeCard(upgrade, index, x, y) {
    originalDrawUpgradeCard.call(this, upgrade, index, x, y);
    drawRarityOverlay(this, upgrade, x, y);
  };

  const originalDrawEnemies = prototype.drawEnemies;
  prototype.drawEnemies = function drawEnemiesWithEliteMarkers(...args) {
    originalDrawEnemies.apply(this, args);
    drawEliteMarkers(this);
  };

  const originalDrawPlayer = prototype.drawPlayer;
  prototype.drawPlayer = function drawPlayerWithCosmetics(...args) {
    originalDrawPlayer.apply(this, args);
    drawCosmeticEffects(this);
  };

  const originalDrawHud = prototype.drawHud;
  prototype.drawHud = function drawHudWithChallenge(...args) {
    originalDrawHud.apply(this, args);
    drawChallengeHud(this);
  };

  const originalDrawResult = prototype.drawResult;
  prototype.drawResult = function drawResultWithReplayability(victory) {
    originalDrawResult.call(this, victory);
    drawReplayabilityResult(this);
  };

  const originalDrawMenu = prototype.drawMenu;
  prototype.drawMenu = function drawMenuWithDailyAccess(...args) {
    originalDrawMenu.apply(this, args);
    drawMenuAdditions(this);
  };

  const originalDrawPauseMenu = prototype.drawPauseMenu;
  prototype.drawPauseMenu = function drawPauseWithBuildInspector(...args) {
    originalDrawPauseMenu.apply(this, args);
    this.drawButton('فحص البناء', WIDTH / 2 - 165, 554, 330, 48, () => {
      this.audio.play('click');
      this.buildReturnState = 'paused';
      this.state = 'buildInspect';
    });
  };

  const originalHandleEscape = prototype.handleEscape;
  prototype.handleEscape = function handleReplayabilityEscape() {
    if (CUSTOM_STATES.has(this.state)) {
      this.audio.play('click');
      if (this.state === 'buildInspect') this.state = this.buildReturnState || 'paused';
      else this.state = 'menu';
      return;
    }
    originalHandleEscape.call(this);
  };

  const originalDraw = prototype.draw;
  prototype.draw = function drawReplayabilityStates(...args) {
    if (!CUSTOM_STATES.has(this.state)) return originalDraw.apply(this, args);
    this.uiRegions = [];
    this.ctx.save();
    this.drawArena();
    if (this.state === 'dailyBrief') drawDailyBrief(this);
    else if (this.state === 'cosmetics') drawCosmetics(this);
    else drawBuildInspect(this);
    this.ctx.restore();
    return undefined;
  };
}

export function attachReplayabilityControls(game) {
  game.startDailyChallenge = () => {
    game.nextRunDaily = true;
    game.startRun();
  };

  window.addEventListener('keydown', (event) => {
    if (event.code !== 'KeyB' || event.ctrlKey || event.metaKey || event.altKey) return;
    if (!['playing', 'paused', 'buildInspect'].includes(game.state)) return;
    event.preventDefault();
    game.audio.play('click');
    if (game.state === 'buildInspect') {
      game.state = game.buildReturnState || 'paused';
      if (game.state === 'playing') game.audio.setScene(game.boss ? 'boss' : 'combat');
      return;
    }
    game.buildReturnState = game.state;
    game.state = 'buildInspect';
    game.audio.setScene('menu');
  });
}
