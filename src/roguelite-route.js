import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH, pickUpgradeChoices } from './content.js';
import { normalizeMission, regionById } from './regions-data.js';
import {
  PROTOCOL_CHALLENGES,
  PROTOCOL_REGIONS,
  ROUTE_NODE_TYPES,
  SERVICE_OPTIONS,
  completeRouteNode,
  createProtocolRoute,
  currentRouteNodes,
  protocolComplete,
  selectProtocolChallenge,
  spendBrokenEnergy,
} from './roguelite-route-data.js';

const FONT = 'Changa, "Segoe UI", Tahoma, sans-serif';
const NUMBER_FONT = 'Inter, "Segoe UI", Arial, sans-serif';
const COLORS = Object.freeze({
  text: '#f8f9ff', muted: '#aeb7da', dim: '#69739b', cyan: '#62f3ff', yellow: '#ffe66d',
  red: '#ff526a', orange: '#ff9f43', purple: '#b983ff', green: '#53f2a1', panel: 'rgba(8, 13, 29, 0.96)', border: '#33406f',
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

function panel(ctx, x, y, width, height, accent = COLORS.border, fill = COLORS.panel, blur = 10) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.shadowColor = accent;
  ctx.shadowBlur = blur;
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
  ctx.font = `800 ${size}px ${NUMBER_FONT}`;
  ctx.fillText(String(value), x, y);
  ctx.restore();
}

function routeSeed() {
  const date = new Date();
  return `${date.toISOString().slice(0, 10)}-${Date.now().toString(36)}`;
}

function activeRegion(game) {
  return PROTOCOL_REGIONS[game.protocolRoute?.actIndex] || 'void';
}

function resetBulletToPlayer(game) {
  Object.assign(game.bullet, {
    held: true,
    recalling: false,
    vx: 0,
    vy: 0,
    x: game.player.x,
    y: game.player.y,
    trail: [],
    recoverDelay: 0,
  });
  game.bullet.hitEnemyIds?.clear?.();
}

function beginProtocolEncounter(game, node) {
  const mission = normalizeMission({
    modeId: 'region',
    regionId: node.regionId,
    difficultyId: game.selectedMission?.difficultyId || 'hunter',
  });
  game.activeMission = mission;
  game.runTargetWaves = 99;
  game.wave = node.rowIndex;
  game.protocolCurrentNode = node;
  game.protocolChallenge = node.type === 'challenge'
    ? selectProtocolChallenge(game.protocolRoute.seed, node.actIndex, node.rowIndex)
    : null;
  game.protocolEncounterBaseline = {
    damageTaken: Number(game.stats.damageTaken) || 0,
    shots: Number(game.stats.shots) || 0,
    ricochets: Number(game.stats.ricochets) || 0,
  };
  game.state = 'playing';
  game.audio.setScene('combat');
  resetBulletToPlayer(game);
  game.spawnNextWave();

  if (node.type === 'elite') {
    for (const enemy of game.enemies) {
      enemy.elite = true;
      enemy.hp *= 1.35;
      enemy.maxHp *= 1.35;
      enemy.speed *= 1.08;
      enemy.score = Math.round(enemy.score * 1.5);
    }
    game.banner = { title: 'عقدة نخبة', subtitle: 'كل الأهداف معززة • المكافأة مضاعفة', time: 1.7 };
  }
  if (node.type === 'challenge') {
    game.banner = { title: game.protocolChallenge.name, subtitle: game.protocolChallenge.description, time: 1.9 };
  }
}

function beginProtocolBoss(game, node) {
  game.protocolCurrentNode = node;
  game.activeMission = normalizeMission({
    modeId: 'region',
    regionId: node.regionId,
    difficultyId: game.selectedMission?.difficultyId || 'hunter',
  });
  game.runTargetWaves = 99;
  game.wave = 5;
  resetBulletToPlayer(game);
  game.startBoss();
}

function evaluateProtocolChallenge(game) {
  const challenge = game.protocolChallenge;
  const baseline = game.protocolEncounterBaseline || {};
  if (!challenge) return { completed: false, bonus: 0 };
  const damage = (Number(game.stats.damageTaken) || 0) - (Number(baseline.damageTaken) || 0);
  const shots = (Number(game.stats.shots) || 0) - (Number(baseline.shots) || 0);
  const ricochets = (Number(game.stats.ricochets) || 0) - (Number(baseline.ricochets) || 0);
  const completed = challenge.id === 'no-damage'
    ? damage === 0
    : challenge.id === 'limited-shots'
      ? shots <= 12
      : ricochets >= 6;
  return { completed, bonus: completed ? challenge.bonus : 0 };
}

function completeCombatNode(game) {
  const node = game.protocolCurrentNode;
  if (!node) return;
  const challengeResult = evaluateProtocolChallenge(game);
  completeRouteNode(game.protocolRoute, node.id, challengeResult.bonus);
  game.protocolLastNodeResult = {
    node,
    challenge: game.protocolChallenge,
    challengeCompleted: challengeResult.completed,
    reward: (ROUTE_NODE_TYPES[node.type]?.reward || 0) + challengeResult.bonus,
  };
  game.protocolRewardChoices = pickUpgradeChoices(game.upgradeStacks, 3);
  game.protocolCurrentNode = null;
  game.protocolChallenge = null;
  game.state = 'protocolReward';
  game.audio.setScene('menu');
  game.audio.play('upgrade');
}

function randomUpgrade(game) {
  const choice = pickUpgradeChoices(game.upgradeStacks, 1)[0];
  if (!choice) return null;
  game.upgradeStacks[choice.id] = (game.upgradeStacks[choice.id] || 0) + 1;
  game.stats.upgrades += 1;
  return choice;
}

function applyServiceOption(game, option) {
  const route = game.protocolRoute;
  if (!spendBrokenEnergy(route, option.cost)) {
    game.protocolNotice = 'لا توجد طاقة مكسورة كافية.';
    game.audio.play('damage');
    return false;
  }
  if (option.effect === 'heal') game.player.health = Math.min(game.player.maxHealth, game.player.health + 1);
  else if (option.effect === 'shield') game.player.shield = Math.max(1, game.player.shield || 0);
  else if (option.effect === 'random-upgrade') {
    const upgrade = randomUpgrade(game);
    game.protocolNotice = upgrade ? `تم الحصول على: ${upgrade.name}` : 'لا توجد ترقية متاحة.';
  } else if (option.effect === 'risk-energy') {
    game.player.health = Math.max(1, game.player.health - 1);
    route.brokenEnergy += 70;
  } else if (option.effect === 'safe-energy') route.brokenEnergy += 35;
  else if (option.effect) {
    game.upgradeStacks[option.effect] = (game.upgradeStacks[option.effect] || 0) + 1;
    game.stats.upgrades += 1;
  }
  game.audio.play('upgrade');
  return true;
}

function finishServiceNode(game) {
  const node = game.protocolCurrentNode;
  if (node) completeRouteNode(game.protocolRoute, node.id);
  game.protocolCurrentNode = null;
  game.state = 'routeMap';
}

function selectProtocolNode(game, node) {
  if (!node || node.completed) return;
  game.audio.play('click');
  if (['combat', 'elite', 'challenge'].includes(node.type)) beginProtocolEncounter(game, node);
  else if (node.type === 'boss') beginProtocolBoss(game, node);
  else {
    game.protocolCurrentNode = node;
    game.protocolNotice = '';
    game.state = 'protocolService';
  }
}

function drawEnergy(game, x, y) {
  const ctx = game.ctx;
  panel(ctx, x, y, 250, 48, COLORS.yellow, 'rgba(42, 35, 15, 0.93)', 7);
  label(ctx, 'الطاقة المكسورة', x + 222, y + 29, 13, COLORS.muted, 600, 'right');
  number(ctx, game.protocolRoute?.brokenEnergy || 0, x + 28, y + 31, 19, COLORS.yellow, 'left');
}

function drawRouteMap(game) {
  const ctx = game.ctx;
  const route = game.protocolRoute;
  const actIndex = Math.min(route.actIndex, PROTOCOL_REGIONS.length - 1);
  const region = regionById(PROTOCOL_REGIONS[actIndex]);
  ctx.fillStyle = 'rgba(2, 4, 12, 0.9)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  label(ctx, 'بروتوكول الكسر', WIDTH / 2, 62, 42, COLORS.text, 900);
  label(ctx, `الفصل ${actIndex + 1} / 3 • ${region.name}`, WIDTH / 2, 98, 17, region.color, 800);
  drawEnergy(game, WIDTH - 300, 34);

  const act = route.acts[actIndex];
  const rowY = [180, 300, 420, 550];
  for (let rowIndex = 0; rowIndex < act.rows.length; rowIndex += 1) {
    const row = act.rows[rowIndex];
    const available = rowIndex === route.rowIndex;
    const completedRow = rowIndex < route.rowIndex;
    const spacing = row.length === 1 ? 0 : 250;
    const startX = WIDTH / 2 - ((row.length - 1) * spacing) / 2;
    if (rowIndex < act.rows.length - 1) {
      ctx.save();
      ctx.strokeStyle = completedRow ? region.color : 'rgba(98, 243, 255, 0.18)';
      ctx.lineWidth = completedRow ? 4 : 2;
      ctx.setLineDash(completedRow ? [] : [8, 8]);
      ctx.beginPath();
      ctx.moveTo(WIDTH / 2, rowY[rowIndex] + 50);
      ctx.lineTo(WIDTH / 2, rowY[rowIndex + 1] - 42);
      ctx.stroke();
      ctx.restore();
    }
    row.forEach((node, column) => {
      const type = ROUTE_NODE_TYPES[node.type];
      const x = startX + column * spacing - 90;
      const y = rowY[rowIndex] - 40;
      const accent = node.completed ? COLORS.green : available ? type.color : COLORS.border;
      panel(ctx, x, y, 180, 82, accent, available ? 'rgba(13, 20, 42, 0.98)' : 'rgba(8, 12, 27, 0.8)', available ? 12 : 3);
      label(ctx, type.icon, x + 90, y + 31, 24, accent, 900);
      label(ctx, node.completed ? 'مكتمل' : type.name, x + 90, y + 62, 15, node.completed ? COLORS.green : available ? COLORS.text : COLORS.dim, 800);
      if (available) game.addUiRegion(x, y, 180, 82, () => selectProtocolNode(game, node));
    });
  }

  panel(ctx, 40, 130, 260, 430, region.color, 'rgba(8, 13, 29, 0.92)', 6);
  label(ctx, 'مسار الجولة', 170, 172, 22, region.color, 900);
  label(ctx, 'اختر عقدة واحدة من الصف الحالي.', 170, 207, 13, COLORS.muted, 600);
  label(ctx, 'القتال', 270, 255, 14, COLORS.cyan, 800, 'right');
  label(ctx, 'يمنح طاقة وترقية بعد الفوز.', 270, 279, 12, COLORS.muted, 500, 'right');
  label(ctx, 'النخبة والتحدي', 270, 327, 14, COLORS.red, 800, 'right');
  label(ctx, 'مخاطرة أعلى ومكافأة أكبر.', 270, 351, 12, COLORS.muted, 500, 'right');
  label(ctx, 'الخدمات والأحداث', 270, 399, 14, COLORS.yellow, 800, 'right');
  label(ctx, 'استخدم الطاقة لتعديل Build الجولة.', 270, 423, 12, COLORS.muted, 500, 'right');
  label(ctx, 'الحارس', 270, 471, 14, region.color, 800, 'right');
  label(ctx, 'اهزمه للانتقال إلى المنطقة التالية.', 270, 495, 12, COLORS.muted, 500, 'right');

  game.drawButton('إنهاء الجولة', 50, 625, 220, 46, () => {
    game.protocolRun = false;
    game.protocolRoute = null;
    game.goToMenu();
  }, false);
}

function drawProtocolReward(game) {
  const ctx = game.ctx;
  const result = game.protocolLastNodeResult;
  const type = ROUTE_NODE_TYPES[result?.node?.type] || ROUTE_NODE_TYPES.combat;
  ctx.fillStyle = 'rgba(2, 4, 12, 0.94)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  label(ctx, 'تم حسم العقدة', WIDTH / 2, 78, 40, type.color, 900);
  label(ctx, `${type.name} • +${result?.reward || 0} طاقة مكسورة`, WIDTH / 2, 116, 16, COLORS.muted, 700);
  if (result?.challenge) {
    label(ctx, result.challengeCompleted ? 'اكتمل التحدي الإضافي' : 'لم يكتمل التحدي الإضافي', WIDTH / 2, 150, 14, result.challengeCompleted ? COLORS.green : COLORS.red, 800);
  }
  label(ctx, 'اختر ترقية مؤقتة للجولة', WIDTH / 2, 196, 21, COLORS.text, 900);

  const choices = game.protocolRewardChoices || [];
  choices.forEach((upgrade, index) => {
    const x = 120 + index * 360;
    panel(ctx, x, 235, 320, 260, index === 1 ? COLORS.purple : COLORS.cyan, 'rgba(11, 16, 34, 0.98)', 9);
    label(ctx, upgrade.name, x + 160, 290, 22, COLORS.text, 900);
    label(ctx, upgrade.description, x + 160, 340, 14, COLORS.muted, 500);
    label(ctx, `المستوى الحالي: ${game.upgradeStacks[upgrade.id] || 0}`, x + 160, 405, 13, COLORS.yellow, 700);
    game.drawButton('اختيار', x + 50, 435, 220, 46, () => {
      game.upgradeStacks[upgrade.id] = (game.upgradeStacks[upgrade.id] || 0) + 1;
      game.stats.upgrades += 1;
      game.protocolRewardChoices = [];
      game.state = 'routeMap';
      game.audio.play('upgrade');
    }, index === 1);
  });
  if (choices.length === 0) {
    game.drawButton('متابعة', WIDTH / 2 - 150, 430, 300, 52, () => { game.state = 'routeMap'; }, true);
  }
  drawEnergy(game, WIDTH / 2 - 125, 555);
}

function drawRecoveryService(game, node) {
  const ctx = game.ctx;
  label(ctx, 'استراحة آمنة', WIDTH / 2, 160, 34, COLORS.green, 900);
  label(ctx, 'اختر فائدة واحدة قبل متابعة الطريق.', WIDTH / 2, 196, 15, COLORS.muted, 600);
  game.drawButton('استعادة قلب', 330, 280, 280, 60, () => {
    game.player.health = Math.min(game.player.maxHealth, game.player.health + 1);
    finishServiceNode(game);
  }, true);
  game.drawButton('درع للمواجهة القادمة', 670, 280, 280, 60, () => {
    game.player.shield = Math.max(1, game.player.shield || 0);
    finishServiceNode(game);
  }, false);
  game.drawButton('تفكيك الموقع: +20 طاقة', WIDTH / 2 - 180, 380, 360, 58, () => {
    game.protocolRoute.brokenEnergy += 20;
    finishServiceNode(game);
  }, false);
}

function serviceOptionsForNode(node) {
  if (node.type === 'forge') return SERVICE_OPTIONS.forge;
  if (node.type === 'shop') return SERVICE_OPTIONS.shop;
  return SERVICE_OPTIONS.mystery;
}

function drawProtocolService(game) {
  const ctx = game.ctx;
  const node = game.protocolCurrentNode;
  const type = ROUTE_NODE_TYPES[node?.type] || ROUTE_NODE_TYPES.mystery;
  ctx.fillStyle = 'rgba(2, 4, 12, 0.94)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  label(ctx, type.name, WIDTH / 2, 86, 42, type.color, 900);
  drawEnergy(game, WIDTH - 300, 34);
  if (node?.type === 'recovery') {
    drawRecoveryService(game, node);
    return;
  }
  const options = serviceOptionsForNode(node);
  options.forEach((option, index) => {
    const x = 115 + index * 360;
    panel(ctx, x, 190, 330, 300, type.color, 'rgba(11, 16, 34, 0.98)', 9);
    label(ctx, option.name, x + 165, 250, 22, COLORS.text, 900);
    label(ctx, option.description, x + 165, 310, 14, COLORS.muted, 500);
    label(ctx, option.cost > 0 ? `${option.cost} طاقة` : 'قرار مجاني', x + 165, 382, 17, option.cost > 0 ? COLORS.yellow : COLORS.green, 800);
    game.drawButton('اختيار', x + 55, 420, 220, 48, () => {
      if (applyServiceOption(game, option)) finishServiceNode(game);
    }, index === 1);
  });
  if (game.protocolNotice) label(ctx, game.protocolNotice, WIDTH / 2, 545, 14, COLORS.red, 800);
  game.drawButton('تجاوز العقدة', WIDTH / 2 - 150, 615, 300, 46, () => finishServiceNode(game), false);
}

export function installRogueliteRoute(GameClass) {
  const prototype = GameClass.prototype;
  if (prototype.__rogueliteRouteInstalled) return;
  prototype.__rogueliteRouteInstalled = true;

  prototype.startProtocolRun = function startProtocolRun() {
    this.audio.play('click');
    this.resetRun();
    this.protocolRun = true;
    this.protocolRoute = createProtocolRoute(routeSeed());
    this.protocolCurrentNode = null;
    this.protocolLastNodeResult = null;
    this.protocolRewardChoices = [];
    this.protocolNotice = '';
    this.runTime = 0;
    this.state = 'routeMap';
    this.audio.setScene('menu');
  };

  const originalResetRun = prototype.resetRun;
  prototype.resetRun = function resetProtocolFields(...args) {
    const keepRoute = this.protocolRun && this.protocolRoute;
    const route = this.protocolRoute;
    const result = originalResetRun.apply(this, args);
    if (keepRoute) {
      this.protocolRun = true;
      this.protocolRoute = route;
    }
    return result;
  };

  const originalOpenUpgrade = prototype.openUpgradeSelection;
  prototype.openUpgradeSelection = function openProtocolReward(nextStage) {
    if (this.protocolRun && this.protocolCurrentNode && ['combat', 'elite', 'challenge'].includes(this.protocolCurrentNode.type)) {
      completeCombatNode(this);
      return;
    }
    return originalOpenUpgrade.call(this, nextStage);
  };

  const originalFinishRun = prototype.finishRun;
  prototype.finishRun = function finishProtocolBoss(victory) {
    if (this.protocolRun && victory && this.protocolCurrentNode?.type === 'boss') {
      const node = this.protocolCurrentNode;
      completeRouteNode(this.protocolRoute, node.id);
      this.protocolCurrentNode = null;
      this.victoryTimer = 0;
      this.boss = null;
      this.enemyShots = [];
      this.enemies = [];
      this.player.health = Math.min(this.player.maxHealth, this.player.health + 1);
      resetBulletToPlayer(this);
      if (!protocolComplete(this.protocolRoute)) {
        this.state = 'routeMap';
        this.audio.setScene('menu');
        return;
      }
      this.protocolCompleted = true;
      this.protocolRun = false;
      this.score += 12000 + this.protocolRoute.brokenEnergy * 10;
      return originalFinishRun.call(this, true);
    }
    if (this.protocolRun && !victory) this.protocolRun = false;
    return originalFinishRun.call(this, victory);
  };

  const originalDrawMenu = prototype.drawMenu;
  prototype.drawMenu = function drawProtocolEntry(...args) {
    originalDrawMenu.apply(this, args);
    this.drawButton('بروتوكول الكسر', 1018, 566, 220, 46, () => this.startProtocolRun(), true);
  };

  const originalHandleEscape = prototype.handleEscape;
  prototype.handleEscape = function handleProtocolEscape() {
    if (['routeMap', 'protocolReward', 'protocolService'].includes(this.state)) {
      this.audio.play('click');
      this.state = 'routeMap';
      if (!this.protocolRun) this.state = 'menu';
      return;
    }
    return originalHandleEscape.call(this);
  };

  const originalDraw = prototype.draw;
  prototype.draw = function drawProtocolStates(...args) {
    if (['routeMap', 'protocolReward', 'protocolService'].includes(this.state)) {
      this.uiRegions = [];
      this.ctx.save();
      this.drawArena();
      if (this.state === 'routeMap') drawRouteMap(this);
      else if (this.state === 'protocolReward') drawProtocolReward(this);
      else drawProtocolService(this);
      this.ctx.restore();
      return undefined;
    }
    return originalDraw.apply(this, args);
  };
}
