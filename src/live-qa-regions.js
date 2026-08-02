import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from './content.js';
import {
  BULLET_CORES,
  PROGRESSION_STORAGE_KEY,
  coreById,
  normalizeSave,
  unlockCore,
} from './progression-data.js';
import {
  DEFAULT_MISSION,
  DIFFICULTIES,
  MISSION_STORAGE_KEY,
  REGIONS,
  RUN_MODES,
  compositionForMissionWave,
  createRegionArenaState,
  difficultyById,
  modeById,
  normalizeMission,
  regionById,
  regionIdForWave,
  totalWavesForMission,
} from './regions-data.js';

const FONT = 'Changa, "Segoe UI", Tahoma, sans-serif';
const NUMBER_FONT = 'Inter, "Segoe UI", Arial, sans-serif';
const COLORS = Object.freeze({
  panel: 'rgba(8, 13, 29, 0.97)',
  panelSoft: 'rgba(17, 24, 49, 0.94)',
  border: '#35416e',
  cyan: '#62f3ff',
  yellow: '#ffe66d',
  orange: '#ff9f43',
  purple: '#b983ff',
  green: '#53f2a1',
  red: '#ff526a',
  text: '#f8f9ff',
  muted: '#aeb7da',
});

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

function panel(ctx, x, y, width, height, accent = COLORS.border, fill = COLORS.panel, glow = 8) {
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
  ctx.font = `800 ${size}px ${NUMBER_FONT}`;
  ctx.fillText(String(value), x, y);
  ctx.restore();
}

function wrapRtl(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2, color = COLORS.muted, size = 13) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = color;
  ctx.font = `500 ${size}px ${FONT}`;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) line = candidate;
    else {
      if (line) lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  lines.forEach((item, index) => ctx.fillText(item, x, y + index * lineHeight));
  ctx.restore();
}

function dim(ctx, alpha = 0.91) {
  ctx.fillStyle = `rgba(2, 4, 12, ${alpha})`;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function loadMission() {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_MISSION };
  try {
    return normalizeMission(JSON.parse(localStorage.getItem(MISSION_STORAGE_KEY) || 'null'));
  } catch {
    return { ...DEFAULT_MISSION };
  }
}

function persistMission(mission) {
  const normalized = normalizeMission(mission);
  if (typeof localStorage !== 'undefined') localStorage.setItem(MISSION_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
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

function missionLabel(mission) {
  const normalized = normalizeMission(mission);
  const mode = modeById(normalized.modeId);
  const region = regionById(normalized.regionId);
  const difficulty = difficultyById(normalized.difficultyId);
  return normalized.modeId === 'story'
    ? `${mode.name} • ${difficulty.name}`
    : `${region.icon} ${region.shortName} • ${difficulty.name}`;
}

function drawChoiceButton(game, text, x, y, width, selected, accent, action) {
  const ctx = game.ctx;
  panel(ctx, x, y, width, 46, selected ? accent : COLORS.border, selected ? 'rgba(32, 42, 66, 0.96)' : COLORS.panelSoft, selected ? 10 : 3);
  label(ctx, text, x + width / 2, y + 29, 14, selected ? accent : COLORS.text, selected ? 900 : 700);
  game.addUiRegion(x, y, width, 46, action);
}

function drawMissionSelect(game) {
  const ctx = game.ctx;
  const draft = normalizeMission(game.missionDraft || game.selectedMission || DEFAULT_MISSION);
  dim(ctx, 0.88);
  label(ctx, 'اختر المهمة', WIDTH / 2, 58, 40, COLORS.text, 900);
  label(ctx, 'حدد بنية الجولة والمنطقة والصعوبة قبل الإطلاق.', WIDTH / 2, 88, 14, COLORS.muted, 600);

  label(ctx, 'نمط الجولة', 1160, 124, 15, COLORS.yellow, 800, 'right');
  RUN_MODES.forEach((mode, index) => {
    drawChoiceButton(game, `${mode.name} — ${mode.waves} موجات`, 650 - index * 330, 104, 300, draft.modeId === mode.id, COLORS.yellow, () => {
      game.audio.play('click');
      game.missionDraft = { ...draft, modeId: mode.id };
    });
  });

  label(ctx, 'المنطقة', 1160, 187, 15, COLORS.cyan, 800, 'right');
  REGIONS.forEach((region, index) => {
    const x = 58 + index * 408;
    const selected = draft.regionId === region.id;
    panel(ctx, x, 204, 370, 194, selected ? region.color : COLORS.border, selected ? 'rgba(18, 28, 52, 0.98)' : COLORS.panelSoft, selected ? 14 : 4);
    label(ctx, `${region.icon} ${region.name}`, x + 335, 246, 20, selected ? region.color : COLORS.text, 900, 'right');
    wrapRtl(ctx, region.subtitle, x + 335, 278, 300, 23, 2, COLORS.muted, 13);
    label(ctx, selected ? 'محددة للمهمة' : 'اضغط للاختيار', x + 335, 365, 13, selected ? region.color : COLORS.muted, 800, 'right');
    game.addUiRegion(x, 204, 370, 194, () => {
      game.audio.play('click');
      game.missionDraft = { ...draft, regionId: region.id };
    });
  });

  label(ctx, 'الصعوبة', 1160, 438, 15, COLORS.orange, 800, 'right');
  DIFFICULTIES.forEach((difficulty, index) => {
    const x = 48 + index * 304;
    const selected = draft.difficultyId === difficulty.id;
    const accent = difficulty.id === 'one-hit' ? COLORS.red : difficulty.id === 'corebreaker' ? COLORS.orange : difficulty.id === 'recruit' ? COLORS.green : COLORS.cyan;
    panel(ctx, x, 455, 280, 118, selected ? accent : COLORS.border, selected ? 'rgba(24, 31, 52, 0.98)' : COLORS.panelSoft, selected ? 11 : 3);
    label(ctx, difficulty.name, x + 250, 486, 16, selected ? accent : COLORS.text, 900, 'right');
    wrapRtl(ctx, difficulty.description, x + 250, 514, 220, 20, 2, COLORS.muted, 11);
    game.addUiRegion(x, 455, 280, 118, () => {
      game.audio.play('click');
      game.missionDraft = { ...draft, difficultyId: difficulty.id };
    });
  });

  const preview = normalizeMission(game.missionDraft || draft);
  const mode = modeById(preview.modeId);
  const region = regionById(preview.regionId);
  const difficulty = difficultyById(preview.difficultyId);
  panel(ctx, 185, 596, 910, 64, region.color, 'rgba(10, 16, 34, 0.96)', 8);
  label(ctx, `${mode.name} • ${preview.modeId === 'story' ? 'المناطق الثلاث' : region.name} • ${difficulty.name}`, 1065, 623, 15, region.color, 900, 'right');
  label(ctx, `${mode.waves} موجات • ${difficulty.playerHealth} قلوب • مكافأة ×${difficulty.rewardMultiplier}`, 1065, 648, 12, COLORS.muted, 600, 'right');
  game.drawButton('اعتماد وبدء الجولة', 205, 606, 270, 44, () => {
    game.selectedMission = persistMission(preview);
    game.missionDraft = { ...game.selectedMission };
    game.audio.play('click');
    game.startRun();
  }, true);
  game.drawButton('العودة', 495, 606, 190, 44, () => { game.audio.play('click'); game.state = 'menu'; });
}

function drawCoreAction(game, core, x, y, width, unlocked, selected) {
  const save = ensureSave(game);
  let text = selected ? 'مجهزة الآن' : unlocked ? 'تجهيز النواة' : save.shards >= core.cost ? `فتح مقابل ${core.cost}` : `تحتاج ${core.cost} شظية`;
  const actionable = !selected && (unlocked || save.shards >= core.cost);
  const accent = selected ? COLORS.green : unlocked ? core.color : save.shards >= core.cost ? COLORS.yellow : COLORS.muted;
  panel(game.ctx, x, y, width, 38, actionable || selected ? accent : COLORS.border, 'rgba(8, 13, 29, 0.92)', actionable ? 7 : 2);
  label(game.ctx, text, x + width / 2, y + 25, 12, accent, 800);
  if (!actionable) return;
  game.addUiRegion(x, y, width, 38, () => {
    game.audio.play('click');
    if (!unlocked) {
      const result = unlockCore(save, core.id);
      if (!result.unlocked) return;
      game.progressionSave = result.save;
    }
    game.progressionSave.selectedCore = core.id;
    game.activeCoreId = core.id;
    persistSave(game);
  });
}

function drawCoreCard(game, core, x, y, width, height) {
  const ctx = game.ctx;
  const save = ensureSave(game);
  const unlocked = save.unlockedCores.includes(core.id);
  const selected = save.selectedCore === core.id;
  panel(ctx, x, y, width, height, selected ? core.color : unlocked ? COLORS.border : 'rgba(53, 65, 110, 0.72)', selected ? 'rgba(48, 43, 23, 0.82)' : COLORS.panelSoft, selected ? 15 : 4);
  label(ctx, core.icon, x + width - 30, y + 37, 23, core.color, 900);
  label(ctx, core.name, x + width - 62, y + 36, 19, COLORS.text, 900, 'right');
  wrapRtl(ctx, core.description, x + width - 24, y + 70, width - 48, 21, 2, COLORS.muted, 12);
  core.traits.forEach((trait, index) => label(ctx, `• ${trait}`, x + width - 24, y + 122 + index * 23, 12, index === 0 ? core.color : COLORS.muted, index === 0 ? 800 : 600, 'right'));
  const mastery = save.coreMastery[core.id] || { runs: 0, victories: 0 };
  label(ctx, `${mastery.runs} جولة • ${mastery.victories} فوز`, x + width - 24, y + height - 52, 11, COLORS.muted, 600, 'right');
  drawCoreAction(game, core, x + 20, y + height - 43, width - 40, unlocked, selected);
}

function drawCoreHubFixed(game) {
  const ctx = game.ctx;
  const save = ensureSave(game);
  dim(ctx, 0.88);
  label(ctx, 'مركز النواة', WIDTH / 2, 56, 39, COLORS.text, 900);
  label(ctx, 'اختر نواة واحدة قبل الجولة — كل وصف وإجراء داخل بطاقته.', WIDTH / 2, 85, 14, COLORS.muted, 600);
  panel(ctx, WIDTH / 2 - 140, 99, 280, 44, COLORS.yellow, 'rgba(39, 34, 17, 0.82)', 5);
  label(ctx, 'شظايا النواة', WIDTH / 2 + 104, 127, 12, COLORS.muted, 600, 'right');
  number(ctx, save.shards, WIDTH / 2 - 103, 129, 17, COLORS.yellow, 'left');

  const cardWidth = 350;
  const cardHeight = 228;
  BULLET_CORES.slice(0, 3).forEach((core, index) => drawCoreCard(game, core, 72 + index * 393, 162, cardWidth, cardHeight));
  BULLET_CORES.slice(3).forEach((core, index) => drawCoreCard(game, core, 272 + index * 393, 412, cardWidth, cardHeight));

  game.drawButton('تصدير الحفظ', 72, 657, 190, 42, () => game.exportProgressionSave?.());
  game.drawButton('استيراد الحفظ', 280, 657, 190, 42, () => game.requestProgressionImport?.());
  game.drawButton('إعادة تعيين', 810, 657, 180, 42, () => game.requestProgressionReset?.());
  game.drawButton('العودة', 1008, 657, 200, 42, () => { game.audio.play('click'); game.state = 'menu'; }, true);
}

function applyMissionMechanics(game, dt) {
  const effects = game.arena?.effects;
  if (!effects) return;
  const clampEntity = (entity) => {
    entity.x = Math.max(entity.radius || 8, Math.min(WIDTH - (entity.radius || 8), entity.x));
    entity.y = Math.max(entity.radius || 8, Math.min(HEIGHT - (entity.radius || 8), entity.y));
  };

  for (const conveyor of effects.conveyors || []) {
    const inside = (entity) => entity.x >= conveyor.x && entity.x <= conveyor.x + conveyor.w && entity.y >= conveyor.y && entity.y <= conveyor.y + conveyor.h;
    for (const entity of [game.player, ...game.enemies]) {
      if (!inside(entity)) continue;
      entity.x += conveyor.vx * dt;
      entity.y += conveyor.vy * dt;
      clampEntity(entity);
    }
    if (!game.bullet.held && inside(game.bullet)) {
      game.bullet.x += conveyor.vx * dt;
      game.bullet.y += conveyor.vy * dt;
      clampEntity(game.bullet);
    }
  }

  for (const well of effects.gravityWells || []) {
    const apply = (entity, velocityOnly = false) => {
      const dx = well.x - entity.x;
      const dy = well.y - entity.y;
      const distance = Math.hypot(dx, dy) || 1;
      if (distance > well.radius) return;
      const force = well.strength * (1 - distance / well.radius);
      if (velocityOnly) {
        entity.vx += dx / distance * force * dt * 5;
        entity.vy += dy / distance * force * dt * 5;
      } else {
        entity.x += dx / distance * force * dt;
        entity.y += dy / distance * force * dt;
        clampEntity(entity);
      }
    };
    apply(game.player);
    for (const enemy of game.enemies) apply(enemy);
    if (!game.bullet.held) apply(game.bullet, true);
  }

  game.regionPortalCooldown = Math.max(0, (game.regionPortalCooldown || 0) - dt);
  if (game.regionPortalCooldown > 0 || game.bullet.held) return;
  const portals = effects.portals || [];
  for (let index = 0; index < portals.length; index += 1) {
    const portal = portals[index];
    if (Math.hypot(game.bullet.x - portal.x, game.bullet.y - portal.y) > portal.radius + game.bullet.radius) continue;
    const destination = portals[portal.pair];
    if (!destination) continue;
    game.bullet.x = destination.x;
    game.bullet.y = destination.y;
    game.regionPortalCooldown = 0.48;
    game.createRing?.(destination.x, destination.y, regionById(game.arena.regionId).color, 80);
    game.audio.play('ricochet');
    break;
  }
}

function drawMissionMechanics(game) {
  const ctx = game.ctx;
  const effects = game.arena?.effects;
  if (!effects) return;
  const region = regionById(game.arena.regionId);
  for (const conveyor of effects.conveyors || []) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 159, 67, 0.09)';
    ctx.strokeStyle = 'rgba(255, 159, 67, 0.45)';
    ctx.lineWidth = 2;
    ctx.fillRect(conveyor.x, conveyor.y, conveyor.w, conveyor.h);
    ctx.strokeRect(conveyor.x, conveyor.y, conveyor.w, conveyor.h);
    ctx.globalAlpha = 0.55;
    for (let x = conveyor.x + 18; x < conveyor.x + conveyor.w - 10; x += 45) {
      const direction = Math.sign(conveyor.vx || conveyor.vy || 1);
      label(ctx, direction > 0 ? '›' : '‹', x, conveyor.y + conveyor.h / 2 + 8, 24, COLORS.orange, 900);
    }
    ctx.restore();
  }
  for (const well of effects.gravityWells || []) {
    ctx.save();
    const pulse = 0.55 + Math.sin(game.elapsed * 3 + well.x) * 0.12;
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = region.color;
    ctx.lineWidth = 2;
    for (let ring = 0; ring < 3; ring += 1) {
      ctx.beginPath();
      ctx.arc(well.x, well.y, 28 + ring * 22 + Math.sin(game.elapsed * 2 + ring) * 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  for (const portal of effects.portals || []) {
    ctx.save();
    ctx.translate(portal.x, portal.y);
    ctx.rotate(game.elapsed * 0.9 + portal.x);
    ctx.strokeStyle = region.color;
    ctx.lineWidth = 4;
    ctx.shadowColor = region.color;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(0, 0, portal.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([5, 7]);
    ctx.beginPath();
    ctx.arc(0, 0, portal.radius + 11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function settleMissionBonus(game, victory) {
  if (game.missionRewardSettled || !game.lastProgressionReward) return;
  game.missionRewardSettled = true;
  const mission = normalizeMission(game.activeMission || DEFAULT_MISSION);
  const difficulty = difficultyById(mission.difficultyId);
  const base = Math.max(0, game.lastProgressionReward.reward || 0);
  const difficultyBonus = Math.max(0, Math.round(base * (difficulty.rewardMultiplier - 1)));
  const storyBonus = victory && mission.modeId === 'story' ? 100 : 0;
  const bonus = difficultyBonus + storyBonus;
  game.missionRewardBonus = bonus;
  if (bonus <= 0) return;
  const save = ensureSave(game);
  save.shards += bonus;
  save.stats.totalShardsEarned += bonus;
  if (game.lastProgressionReward.run) {
    game.lastProgressionReward.run.shards += bonus;
    game.lastProgressionReward.run.regionId = mission.regionId;
    game.lastProgressionReward.run.modeId = mission.modeId;
    game.lastProgressionReward.run.difficultyId = mission.difficultyId;
    const history = save.history.find((run) => run.id === game.lastProgressionReward.run.id);
    if (history) Object.assign(history, game.lastProgressionReward.run);
  }
  game.lastProgressionReward.reward += bonus;
  persistSave(game);
}

export function installLiveQaRegions(GameClass) {
  const prototype = GameClass.prototype;
  if (prototype.__liveQaRegionsInstalled) return;
  prototype.__liveQaRegionsInstalled = true;

  const originalResetRun = prototype.resetRun;
  prototype.resetRun = function resetRunWithMission(...args) {
    const result = originalResetRun.apply(this, args);
    this.selectedMission = normalizeMission(this.selectedMission || loadMission());
    this.activeMission = normalizeMission(this.activeMission || this.selectedMission);
    this.runTargetWaves = totalWavesForMission(this.activeMission);
    const difficulty = difficultyById(this.activeMission.difficultyId);
    this.player.maxHealth = difficulty.playerHealth;
    this.player.health = difficulty.playerHealth;
    this.regionPortalCooldown = 0;
    this.missionRewardSettled = false;
    this.missionRewardBonus = 0;
    this.challengeToast = null;
    this.eliteAlert = null;
    return result;
  };

  const originalStartRun = prototype.startRun;
  prototype.startRun = function startMissionRun(...args) {
    const selected = this.nextRunDaily
      ? { modeId: 'region', regionId: 'neon', difficultyId: 'hunter' }
      : normalizeMission(this.selectedMission || loadMission());
    this.activeMission = selected;
    this.runTargetWaves = totalWavesForMission(selected);
    const result = originalStartRun.apply(this, args);
    const difficulty = difficultyById(selected.difficultyId);
    this.player.maxHealth = difficulty.playerHealth;
    this.player.health = difficulty.playerHealth;
    return result;
  };

  const originalOpenUpgrade = prototype.openUpgradeSelection;
  prototype.openUpgradeSelection = function openUpgradeForMission(nextStage) {
    const effectiveStage = this.wave >= (this.runTargetWaves || 5) ? 'boss' : 'wave';
    return originalOpenUpgrade.call(this, effectiveStage || nextStage);
  };

  const originalSpawnEnemy = prototype.spawnEnemy;
  prototype.spawnEnemy = function spawnEnemyWithDifficulty(type, options = {}) {
    const before = this.enemies.length;
    const result = originalSpawnEnemy.call(this, type, options);
    const enemy = this.enemies[before];
    if (!enemy) return result;
    const difficulty = difficultyById(this.activeMission?.difficultyId);
    enemy.hp *= difficulty.enemyHealth;
    enemy.maxHp *= difficulty.enemyHealth;
    enemy.speed *= difficulty.enemySpeed;
    enemy.score = Math.round(enemy.score * difficulty.enemyScore);
    return result;
  };

  const originalSpawnNextWave = prototype.spawnNextWave;
  prototype.spawnNextWave = function spawnRegionWave(...args) {
    const result = originalSpawnNextWave.apply(this, args);
    const mission = normalizeMission(this.activeMission || this.selectedMission || DEFAULT_MISSION);
    const regionId = regionIdForWave(mission, this.wave);
    this.arena = createRegionArenaState(regionId, this.wave);
    this.enemies = [];
    this.enemyShots = [];
    compositionForMissionWave(mission, this.wave).forEach((type, index) => {
      const eliteStep = mission.modeId === 'story' ? 4 : 5;
      this.spawnEnemy(type, { elite: this.wave >= 3 && index > 0 && index % eliteStep === eliteStep - 1 });
    });
    const region = regionById(regionId);
    this.banner = {
      title: `الموجة ${this.wave} / ${this.runTargetWaves}`,
      subtitle: `${region.name} — ${this.arena.name}`,
      time: 1.55,
    };
    return result;
  };

  const originalStartBoss = prototype.startBoss;
  prototype.startBoss = function startRegionBoss(...args) {
    const result = originalStartBoss.apply(this, args);
    const mission = normalizeMission(this.activeMission || DEFAULT_MISSION);
    const regionId = regionIdForWave(mission, this.wave || this.runTargetWaves);
    const region = regionById(regionId);
    const difficulty = difficultyById(mission.difficultyId);
    this.arena.regionId = regionId;
    this.arena.regionName = region.name;
    this.arena.regionColor = region.color;
    this.boss.maxHp = Math.round(this.boss.maxHp * difficulty.enemyHealth * (mission.modeId === 'story' ? 1.25 : 1));
    this.boss.hp = this.boss.maxHp;
    this.boss.missionTitle = mission.modeId === 'story' ? 'حارس النواة النهائي' : `حارس ${region.shortName}`;
    return result;
  };

  const originalUpdateBossIntro = prototype.updateBossIntro;
  prototype.updateBossIntro = function updateRegionBossIntro(dt) {
    const previousState = this.state;
    const result = originalUpdateBossIntro.call(this, dt);
    if (previousState === 'bossIntro' && this.state === 'playing' && this.boss?.missionTitle) {
      this.banner = {
        title: this.boss.missionTitle,
        subtitle: 'في المرحلة الأولى: لا تؤذيه إلا طلقة ارتدت عن جدار',
        time: 2.4,
      };
    }
    return result;
  };

  const originalUpdate = prototype.update;
  prototype.update = function updateRegionMechanics(dt) {
    const result = originalUpdate.call(this, dt);
    if (this.state === 'playing') applyMissionMechanics(this, dt);
    return result;
  };

  const originalDrawArena = prototype.drawArena;
  prototype.drawArena = function drawRegionArena(...args) {
    originalDrawArena.apply(this, args);
    drawMissionMechanics(this);
    if (this.arena?.regionId) {
      const region = regionById(this.arena.regionId);
      this.ctx.save();
      this.ctx.strokeStyle = region.color;
      this.ctx.globalAlpha = 0.45;
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(4, 4, WIDTH - 8, HEIGHT - 8);
      this.ctx.restore();
    }
  };

  const originalFinishRun = prototype.finishRun;
  prototype.finishRun = function finishMissionRun(victory) {
    this.challengeToast = null;
    this.eliteAlert = null;
    this.banner = null;
    this.combo = 0;
    this.comboTimer = 0;
    const result = originalFinishRun.call(this, victory);
    settleMissionBonus(this, victory);
    return result;
  };

  const originalDrawMenu = prototype.drawMenu;
  prototype.drawMenu = function drawMenuWithMissionAccess(...args) {
    originalDrawMenu.apply(this, args);
    const mission = normalizeMission(this.selectedMission || loadMission());
    const region = regionById(mission.regionId);
    panel(this.ctx, WIDTH / 2 - 205, 617, 410, 40, region.color, 'rgba(8, 13, 29, 0.94)', 5);
    label(this.ctx, `المهمة: ${missionLabel(mission)}`, WIDTH / 2 + 180, 642, 12, region.color, 800, 'right');
    this.addUiRegion(WIDTH / 2 - 205, 617, 410, 40, () => {
      this.audio.play('click');
      this.missionDraft = { ...mission };
      this.state = 'missionSelect';
    });
  };

  const originalHandleEscape = prototype.handleEscape;
  prototype.handleEscape = function handleMissionEscape() {
    if (this.state === 'missionSelect') {
      this.audio.play('click');
      this.state = 'menu';
      return;
    }
    return originalHandleEscape.call(this);
  };

  const originalDraw = prototype.draw;
  prototype.draw = function drawLiveQaStates(...args) {
    if (this.state === 'missionSelect' || this.state === 'coreHub') {
      this.uiRegions = [];
      this.ctx.save();
      this.drawArena();
      if (this.state === 'missionSelect') drawMissionSelect(this);
      else drawCoreHubFixed(this);
      this.ctx.restore();
      return undefined;
    }
    if (this.state === 'gameover' || this.state === 'victory') {
      this.uiRegions = [];
      this.ctx.save();
      this.drawArena();
      dim(this.ctx, 0.42);
      this.drawResult(this.state === 'victory');
      if (this.missionRewardBonus > 0) {
        panel(this.ctx, 78, 646, 300, 42, COLORS.yellow, 'rgba(42, 35, 15, 0.93)', 5);
        label(this.ctx, `مكافأة المهمة +${this.missionRewardBonus}`, 228, 672, 13, COLORS.yellow, 900);
      }
      this.ctx.restore();
      return undefined;
    }
    return originalDraw.apply(this, args);
  };
}
