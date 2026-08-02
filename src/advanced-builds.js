import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from './content.js';
import { coreById } from './progression-data.js';
import {
  ADVANCED_SYNERGIES,
  BUILD_CODEX_STORAGE_KEY,
  RELICS,
  createDefaultBuildCodex,
  createRelicChoices,
  normalizeBuildCodex,
  overdriveByCore,
  recordRelicDiscovery,
  recordSynergyDiscovery,
  relicById,
  resolveAdvancedSynergies,
} from './advanced-builds-data.js';

const FONT = 'Changa, "Segoe UI", Tahoma, sans-serif';
const NUMBER_FONT = 'Inter, "Segoe UI", Arial, sans-serif';
const COLORS = Object.freeze({
  text: '#f8f9ff', muted: '#aeb7da', dim: '#69739b', cyan: '#62f3ff', yellow: '#ffe66d', red: '#ff526a',
  orange: '#ff9f43', purple: '#b983ff', green: '#53f2a1', panel: 'rgba(8, 13, 29, 0.96)', border: '#33406f',
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

function loadCodex() {
  if (typeof localStorage === 'undefined') return createDefaultBuildCodex();
  try {
    return normalizeBuildCodex(JSON.parse(localStorage.getItem(BUILD_CODEX_STORAGE_KEY) || 'null'));
  } catch {
    return createDefaultBuildCodex();
  }
}

function persistCodex(codex) {
  const normalized = normalizeBuildCodex(codex);
  if (typeof localStorage !== 'undefined') localStorage.setItem(BUILD_CODEX_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

function activeCoreId(game) {
  return game.activeCoreId || game.progressionSave?.selectedCore || 'standard';
}

function relicCount(game, effect) {
  return (game.runRelics || []).reduce((count, id) => count + (relicById(id)?.effect === effect ? 1 : 0), 0);
}

function relicValue(game, effect) {
  return (game.runRelics || []).reduce((sum, id) => {
    const relic = relicById(id);
    return sum + (relic?.effect === effect ? Number(relic.value) || 0 : 0);
  }, 0);
}

function chargeOverdrive(game, amount, reason = '') {
  if (game.overdriveActive > 0) return;
  const before = game.overdriveCharge || 0;
  game.overdriveCharge = Math.min(100, before + Math.max(0, Number(amount) || 0));
  if (before < 100 && game.overdriveCharge >= 100) {
    const config = overdriveByCore(activeCoreId(game));
    game.addFloatingText(game.player.x, game.player.y - 50, `${config.name} جاهزة`, config.color);
    game.audio.play('upgrade');
  } else if (reason && amount >= 15) {
    game.overdriveNotice = { text: reason, time: 0.9 };
  }
}

function activateOverdrive(game) {
  if (game.state !== 'playing' || game.overdriveCharge < 100 || game.overdriveActive > 0) return false;
  const config = overdriveByCore(activeCoreId(game));
  game.overdriveCharge = 0;
  game.overdriveActive = config.duration + relicValue(game, 'overdrive-duration');
  game.buildCodex.overdriveActivations += 1;
  game.buildCodex.updatedAt = new Date().toISOString();
  game.buildCodex = persistCodex(game.buildCodex);
  game.banner = { title: config.name, subtitle: config.description, time: 1.45 };
  game.createRing(game.player.x, game.player.y, config.color, 180);
  game.createBurst(game.player.x, game.player.y, config.color, 38, 360);
  game.shake = Math.max(game.shake, 12);
  game.audio.play('boss');
  return true;
}

function refreshSynergies(game) {
  const synergies = resolveAdvancedSynergies(activeCoreId(game), game.runRelics || []);
  const previous = new Set((game.activeAdvancedSynergies || []).map((item) => item.id));
  game.activeAdvancedSynergies = synergies;
  const newlyActive = synergies.filter((item) => !previous.has(item.id));
  if (newlyActive.length) {
    game.buildCodex = recordSynergyDiscovery(game.buildCodex, newlyActive.map((item) => item.id));
    game.buildCodex = persistCodex(game.buildCodex);
    game.banner = { title: newlyActive[0].name, subtitle: newlyActive[0].description, time: 1.8 };
  }
}

function acquireRelic(game, relic, source = 'مكافأة') {
  if (!relic || game.runRelics.includes(relic.id)) return false;
  game.runRelics.push(relic.id);
  game.buildCodex = persistCodex(recordRelicDiscovery(game.buildCodex, relic.id));
  refreshSynergies(game);
  game.relicNotice = { relic, source, time: 2.2 };
  game.audio.play('upgrade');
  return true;
}

function grantRandomRelic(game, source) {
  const choices = createRelicChoices(`${game.protocolRoute?.seed || Date.now()}:${source}:${game.runRelics.length}`, game.runRelics, 1);
  return choices[0] ? acquireRelic(game, choices[0], source) : false;
}

function applyAreaDamage(game, origin, radius, damage, excludeId) {
  for (const enemy of [...game.enemies]) {
    if (enemy.id === excludeId) continue;
    const distance = Math.hypot(enemy.x - origin.x, enemy.y - origin.y);
    if (distance > radius) continue;
    enemy.hp -= damage;
    enemy.hitFlash = 0.12;
    game.createBurst(enemy.x, enemy.y, COLORS.orange, 7, 150);
    if (enemy.hp <= 0) game.killEnemy(enemy);
  }
}

function applyRelicDropFromProtocol(game, nodeType) {
  if (!game.protocolRun || !['elite', 'challenge'].includes(nodeType)) return;
  grantRandomRelic(game, nodeType === 'elite' ? 'غنيمة نخبة' : 'مكافأة تحدٍ');
}

function drawOverdriveHud(game) {
  if (!['playing', 'paused', 'bossIntro'].includes(game.state)) return;
  const ctx = game.ctx;
  const config = overdriveByCore(activeCoreId(game));
  const x = WIDTH / 2 - 170;
  const y = game.boss ? 98 : 76;
  panel(ctx, x, y, 340, 38, config.color, 'rgba(5, 8, 20, 0.9)', 5);
  const ratio = game.overdriveActive > 0 ? 1 : Math.max(0, Math.min(1, (game.overdriveCharge || 0) / 100));
  ctx.fillStyle = `${config.color}33`;
  roundedRect(ctx, x + 8, y + 8, 324, 22, 10);
  ctx.fill();
  ctx.fillStyle = config.color;
  roundedRect(ctx, x + 8, y + 8, 324 * ratio, 22, 10);
  ctx.fill();
  label(ctx, game.overdriveActive > 0 ? `${config.name} ${game.overdriveActive.toFixed(1)}ث` : `Overdrive ${Math.floor(game.overdriveCharge || 0)}% • E`, WIDTH / 2, y + 25, 12, game.overdriveActive > 0 ? '#07111a' : COLORS.text, 900);
}

function rarityColor(rarity) {
  return { common: COLORS.cyan, rare: COLORS.green, epic: COLORS.purple, legendary: COLORS.yellow }[rarity] || COLORS.border;
}

function drawRelicNotice(game) {
  const notice = game.relicNotice;
  if (!notice || notice.time <= 0) return;
  const relic = notice.relic;
  panel(game.ctx, WIDTH / 2 - 270, 138, 540, 92, rarityColor(relic.rarity), 'rgba(8, 13, 29, 0.97)', 14);
  label(game.ctx, `${notice.source}: ${relic.name}`, WIDTH / 2, 174, 20, rarityColor(relic.rarity), 900);
  label(game.ctx, relic.description, WIDTH / 2, 207, 13, COLORS.muted, 600);
}

function drawBuildCodex(game) {
  const ctx = game.ctx;
  const codex = normalizeBuildCodex(game.buildCodex);
  const pageSize = 8;
  const maxPage = Math.max(0, Math.ceil(RELICS.length / pageSize) - 1);
  game.buildCodexPage = Math.max(0, Math.min(maxPage, game.buildCodexPage || 0));
  const items = RELICS.slice(game.buildCodexPage * pageSize, game.buildCodexPage * pageSize + pageSize);
  ctx.fillStyle = 'rgba(2, 4, 12, 0.93)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  label(ctx, 'موسوعة الـBuild', WIDTH / 2, 66, 40, COLORS.text, 900);
  label(ctx, `${codex.discoveredRelics.length} / ${RELICS.length} Relic • ${codex.discoveredSynergies.length} / ${ADVANCED_SYNERGIES.length} Synergy`, WIDTH / 2, 100, 14, COLORS.muted, 600);

  items.forEach((relic, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 85 + column * 570;
    const y = 135 + row * 115;
    const discovered = codex.discoveredRelics.includes(relic.id);
    const color = discovered ? rarityColor(relic.rarity) : COLORS.border;
    panel(ctx, x, y, 540, 94, color, discovered ? 'rgba(11, 16, 34, 0.97)' : 'rgba(8, 11, 24, 0.88)', 5);
    label(ctx, discovered ? relic.name : 'Relic غير مكتشفة', x + 510, y + 30, 17, discovered ? color : COLORS.dim, 900, 'right');
    label(ctx, discovered ? relic.description : 'اعثر عليها داخل بروتوكول الكسر لكشف بياناتها.', x + 510, y + 58, 12, COLORS.muted, 500, 'right');
    if (discovered) label(ctx, `مرات الاختيار: ${codex.relicPickCounts[relic.id] || 0}`, x + 510, y + 82, 11, COLORS.dim, 600, 'right');
  });

  label(ctx, `الصفحة ${game.buildCodexPage + 1} / ${maxPage + 1}`, WIDTH / 2, 625, 13, COLORS.muted, 700);
  game.drawButton('السابق', 330, 642, 180, 46, () => { game.buildCodexPage = Math.max(0, game.buildCodexPage - 1); }, false);
  game.drawButton('العودة', 550, 642, 180, 46, () => { game.state = 'menu'; }, true);
  game.drawButton('التالي', 770, 642, 180, 46, () => { game.buildCodexPage = Math.min(maxPage, game.buildCodexPage + 1); }, false);
}

function drawRunBuildPanel(game) {
  const ctx = game.ctx;
  const core = coreById(activeCoreId(game));
  label(ctx, 'Build الجولة', WIDTH / 2, 75, 38, COLORS.text, 900);
  label(ctx, `${core?.icon || '◆'} ${core?.name || 'النواة القياسية'}`, WIDTH / 2, 112, 17, core?.color || COLORS.cyan, 800);
  const relics = (game.runRelics || []).map(relicById).filter(Boolean);
  relics.slice(0, 12).forEach((relic, index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const x = 80 + column * 405;
    const y = 155 + row * 105;
    panel(ctx, x, y, 365, 85, rarityColor(relic.rarity), 'rgba(11, 16, 34, 0.96)', 4);
    label(ctx, relic.name, x + 340, y + 29, 16, rarityColor(relic.rarity), 900, 'right');
    label(ctx, relic.description, x + 340, y + 58, 11, COLORS.muted, 500, 'right');
  });
  const synergies = game.activeAdvancedSynergies || [];
  label(ctx, synergies.length ? `Synergies: ${synergies.map((item) => item.name).join(' • ')}` : 'لا توجد Synergy مكتملة بعد', WIDTH / 2, 607, 14, synergies.length ? COLORS.yellow : COLORS.dim, 800);
  game.drawButton('العودة', WIDTH / 2 - 150, 642, 300, 46, () => { game.state = game.buildReturnState || 'paused'; }, true);
}

export function installAdvancedBuilds(GameClass) {
  const prototype = GameClass.prototype;
  if (prototype.__advancedBuildsInstalled) return;
  prototype.__advancedBuildsInstalled = true;

  const originalResetRun = prototype.resetRun;
  prototype.resetRun = function resetAdvancedBuilds(...args) {
    const result = originalResetRun.apply(this, args);
    this.buildCodex = this.buildCodex || loadCodex();
    this.runRelics = [];
    this.activeAdvancedSynergies = [];
    this.overdriveCharge = 0;
    this.overdriveActive = 0;
    this.overdriveNotice = null;
    this.relicNotice = null;
    this.relicSlowTimer = 0;
    this.relicKillCounter = 0;
    this.firstShotPending = true;
    return result;
  };

  prototype.activateOverdrive = function activateCurrentOverdrive() {
    return activateOverdrive(this);
  };

  const originalSpawnNextWave = prototype.spawnNextWave;
  prototype.spawnNextWave = function spawnWaveWithRelicState(...args) {
    const result = originalSpawnNextWave.apply(this, args);
    this.firstShotPending = true;
    return result;
  };

  const originalFireBullet = prototype.fireBullet;
  prototype.fireBullet = function fireRelicBullet(...args) {
    const heldBefore = this.bullet.held;
    const result = originalFireBullet.apply(this, args);
    if (heldBefore && !this.bullet.held) {
      this.bullet.relicFirstShot = this.firstShotPending;
      this.firstShotPending = false;
      if (relicCount(this, 'power-slow')) this.relicSlowTimer = 0.75;
      if (this.overdriveActive > 0 && activeCoreId(this) === 'standard') {
        this.bullet.vx *= 1.28;
        this.bullet.vy *= 1.28;
      }
    }
    return result;
  };

  const originalMovement = prototype.getMovementDirection;
  prototype.getMovementDirection = function getRelicAdjustedMovement(...args) {
    const direction = originalMovement.apply(this, args);
    const multiplier = this.relicSlowTimer > 0 ? 0.68 : 1;
    return { x: direction.x * multiplier, y: direction.y * multiplier };
  };

  const originalDamage = prototype.currentBulletDamage;
  prototype.currentBulletDamage = function currentRelicDamage(...args) {
    let damage = originalDamage.apply(this, args);
    damage *= 1 + this.bullet.bounceCount * relicValue(this, 'bounce-damage');
    if (relicCount(this, 'distance-damage')) {
      const distance = Math.hypot(this.bullet.x - this.player.x, this.bullet.y - this.player.y);
      damage *= 1 + Math.min(1, distance / 700) * relicValue(this, 'distance-damage');
    }
    if (this.player.health === 1) damage *= 1 + relicValue(this, 'low-health-damage');
    if (this.boss) damage *= 1 + relicValue(this, 'boss-damage');
    if (this.bullet.relicFirstShot) damage *= 1 + relicValue(this, 'first-shot-damage');
    if (this.bullet.bounceCount > 0) damage *= 1 + relicValue(this, 'reflected-damage');
    if (relicCount(this, 'power-slow')) damage *= 1 + relicValue(this, 'power-slow');
    if (this.overdriveActive > 0) {
      const coreId = activeCoreId(this);
      if (coreId === 'standard') damage *= 1.5;
      else if (coreId === 'ricochet') damage *= 1 + this.bullet.bounceCount * 0.35;
      else if (coreId === 'heavy') damage *= 1.45;
      else if (coreId === 'shock') damage *= 1.25;
      else if (coreId === 'recall' && this.bullet.recalling) damage *= 2;
    }
    return damage;
  };

  const originalRicochet = prototype.onRicochet;
  prototype.onRicochet = function onRelicRicochet(...args) {
    const result = originalRicochet.apply(this, args);
    chargeOverdrive(this, 7 + relicValue(this, 'ricochet-charge'), 'شحن الارتداد');
    if (relicCount(this, 'first-bounce-aim') && this.bullet.bounceCount === 1 && this.enemies.length) {
      const target = this.enemies.reduce((closest, enemy) => {
        const distance = Math.hypot(enemy.x - this.bullet.x, enemy.y - this.bullet.y);
        return !closest || distance < closest.distance ? { enemy, distance } : closest;
      }, null)?.enemy;
      if (target) {
        const direction = { x: target.x - this.bullet.x, y: target.y - this.bullet.y };
        const length = Math.hypot(direction.x, direction.y) || 1;
        const speed = Math.max(500, Math.hypot(this.bullet.vx, this.bullet.vy));
        this.bullet.vx = direction.x / length * speed;
        this.bullet.vy = direction.y / length * speed;
      }
    }
    return result;
  };

  const originalCatch = prototype.catchBullet;
  prototype.catchBullet = function catchRelicBullet(...args) {
    const before = Number(this.stats.perfectCatches) || 0;
    const result = originalCatch.apply(this, args);
    if ((Number(this.stats.perfectCatches) || 0) > before) {
      chargeOverdrive(this, 18, 'التقاط مثالي');
      if (relicCount(this, 'perfect-shield')) this.player.shield = Math.max(this.player.shield, 2);
    }
    return result;
  };

  const originalDash = prototype.tryDash;
  prototype.tryDash = function dashWithRelicCharge(...args) {
    const before = this.player.dashRemaining;
    const result = originalDash.apply(this, args);
    if (before <= 0 && this.player.dashRemaining > 0) chargeOverdrive(this, relicValue(this, 'dash-charge'));
    return result;
  };

  const originalKill = prototype.killEnemy;
  prototype.killEnemy = function killWithAdvancedBuilds(enemy) {
    const existed = this.enemies.some((candidate) => candidate.id === enemy?.id);
    const wasElite = Boolean(enemy?.elite);
    const result = originalKill.call(this, enemy);
    if (existed) {
      const comboBonus = Math.min(10, Math.max(0, Number(this.combo) || 0));
      chargeOverdrive(this, 8 + comboBonus + relicValue(this, 'multi-kill-charge'));
      if (wasElite && relicCount(this, 'elite-overdrive')) this.overdriveCharge = 100;
      this.relicKillCounter += 1;
      const healThreshold = Math.max(5, Math.round(relicValue(this, 'kill-heal')) || 999);
      if (this.relicKillCounter >= healThreshold && relicCount(this, 'kill-heal')) {
        this.relicKillCounter = 0;
        this.player.health = Math.min(this.player.maxHealth, this.player.health + 1);
        this.addFloatingText(this.player.x, this.player.y - 40, 'إصلاح +1', COLORS.green);
      }
      if (this.overdriveActive > 0 && relicCount(this, 'overdrive-chain')) this.overdriveActive += 0.35;
    }
    return result;
  };

  const originalDamageEnemy = prototype.damageEnemy;
  prototype.damageEnemy = function damageWithRelicEffects(enemy, damage, forceX, forceY, fromBullet) {
    const hpBefore = Number(enemy?.hp) || 0;
    const result = originalDamageEnemy.call(this, enemy, damage, forceX, forceY, fromBullet);
    if (fromBullet && hpBefore > (Number(enemy?.hp) || 0)) {
      const heavy = relicCount(this, 'heavy-explosion') || (this.overdriveActive > 0 && activeCoreId(this) === 'heavy');
      if (heavy) applyAreaDamage(this, enemy, 85, Math.max(0.35, damage * 0.3), enemy.id);
      if (this.overdriveActive > 0 && activeCoreId(this) === 'shock') applyAreaDamage(this, enemy, 155 + relicValue(this, 'shock-range'), Math.max(0.3, damage * 0.28), enemy.id);
    }
    return result;
  };

  const originalUpdateBullet = prototype.updateBullet;
  prototype.updateBullet = function updateRelicBullet(dt) {
    const result = originalUpdateBullet.call(this, dt);
    if (this.bullet.recalling) {
      const multiplier = 1 + relicValue(this, 'recall-speed') / 1000 + (this.overdriveActive > 0 && activeCoreId(this) === 'recall' ? 0.35 : 0);
      this.bullet.vx *= multiplier;
      this.bullet.vy *= multiplier;
      if (relicCount(this, 'recall-pull')) {
        for (const enemy of this.enemies) {
          if (Math.hypot(enemy.x - this.bullet.x, enemy.y - this.bullet.y) > relicValue(this, 'recall-pull')) continue;
          enemy.x += (this.bullet.x - enemy.x) * dt * 1.5;
          enemy.y += (this.bullet.y - enemy.y) * dt * 1.5;
        }
      }
    }
    return result;
  };

  const originalEnemyShots = prototype.updateEnemyShots;
  prototype.updateEnemyShots = function updateSlowerEnemyShots(dt) {
    const slow = Math.min(0.25, relicValue(this, 'enemy-shot-slow'));
    return originalEnemyShots.call(this, dt * (1 - slow));
  };

  const originalOpenUpgrade = prototype.openUpgradeSelection;
  prototype.openUpgradeSelection = function openUpgradeWithRelicDrop(nextStage) {
    const nodeType = this.protocolCurrentNode?.type;
    const energyBefore = this.protocolRoute?.brokenEnergy || 0;
    const damageBefore = this.protocolEncounterBaseline?.damageTaken || 0;
    const result = originalOpenUpgrade.call(this, nextStage);
    if (this.protocolRun && nodeType) {
      applyRelicDropFromProtocol(this, nodeType);
      if (this.protocolRoute) {
        const gained = Math.max(0, this.protocolRoute.brokenEnergy - energyBefore);
        this.protocolRoute.brokenEnergy += Math.round(gained * relicValue(this, 'energy-gain'));
        if ((Number(this.stats.damageTaken) || 0) === damageBefore) this.protocolRoute.brokenEnergy += relicValue(this, 'no-damage-energy');
      }
    }
    return result;
  };

  const originalFinishRun = prototype.finishRun;
  prototype.finishRun = function finishBossWithRelicDrop(victory) {
    const wasProtocolBoss = this.protocolRun && victory && this.protocolCurrentNode?.type === 'boss';
    const result = originalFinishRun.call(this, victory);
    if (wasProtocolBoss) grantRandomRelic(this, 'غنيمة حارس');
    return result;
  };

  const originalUpdate = prototype.update;
  prototype.update = function updateAdvancedBuilds(dt) {
    const result = originalUpdate.call(this, dt);
    this.relicSlowTimer = Math.max(0, this.relicSlowTimer - dt);
    this.overdriveActive = Math.max(0, this.overdriveActive - dt);
    if (this.relicNotice) this.relicNotice.time -= dt;
    if (this.overdriveNotice) this.overdriveNotice.time -= dt;
    return result;
  };

  const originalDrawHud = prototype.drawHud;
  prototype.drawHud = function drawAdvancedBuildHud(...args) {
    originalDrawHud.apply(this, args);
    drawOverdriveHud(this);
    drawRelicNotice(this);
  };

  const originalDrawTouch = prototype.drawTouchControls;
  prototype.drawTouchControls = function drawOverdriveTouch(...args) {
    originalDrawTouch.apply(this, args);
    const config = overdriveByCore(activeCoreId(this));
    const ready = this.overdriveCharge >= 100;
    const x = WIDTH / 2;
    const y = HEIGHT - 58;
    this.ctx.save();
    this.ctx.fillStyle = ready ? `${config.color}55` : 'rgba(8,13,29,0.72)';
    this.ctx.strokeStyle = ready ? config.color : COLORS.border;
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 38, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();
    label(this.ctx, 'فورة', x, y + 5, 13, ready ? config.color : COLORS.muted, 900);
    this.ctx.restore();
    this.addUiRegion(x - 45, y - 45, 90, 90, () => activateOverdrive(this));
  };

  const originalDrawMenu = prototype.drawMenu;
  prototype.drawMenu = function drawBuildCodexEntry(...args) {
    originalDrawMenu.apply(this, args);
    this.drawButton('موسوعة الـBuild', 1018, 516, 220, 42, () => {
      this.audio.play('click');
      this.buildCodexPage = 0;
      this.state = 'buildCodex';
    }, false);
  };

  const originalHandleEscape = prototype.handleEscape;
  prototype.handleEscape = function handleBuildStatesEscape() {
    if (this.state === 'buildCodex') { this.state = 'menu'; return; }
    if (this.state === 'runBuild') { this.state = this.buildReturnState || 'paused'; return; }
    return originalHandleEscape.call(this);
  };

  const originalDraw = prototype.draw;
  prototype.draw = function drawAdvancedBuildStates(...args) {
    if (this.state === 'buildCodex' || this.state === 'runBuild') {
      this.uiRegions = [];
      this.ctx.save();
      this.drawArena();
      if (this.state === 'buildCodex') drawBuildCodex(this); else drawRunBuildPanel(this);
      this.ctx.restore();
      return undefined;
    }
    const result = originalDraw.apply(this, args);
    if (this.state === 'protocolService' && this.protocolCurrentNode?.type === 'shop') {
      this.drawButton('شراء Relic عشوائي • 60', 930, 615, 300, 46, () => {
        if ((this.protocolRoute?.brokenEnergy || 0) < 60) {
          this.protocolNotice = 'لا توجد طاقة مكسورة كافية.';
          return;
        }
        this.protocolRoute.brokenEnergy -= 60;
        grantRandomRelic(this, 'شراء من المتجر');
      }, false);
    }
    return result;
  };
}

export function attachAdvancedBuildControls(game) {
  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyE') {
      event.preventDefault();
      activateOverdrive(game);
    }
    if (event.code === 'KeyV' && ['playing', 'paused'].includes(game.state)) {
      event.preventDefault();
      game.buildReturnState = game.state;
      if (game.state === 'playing') game.pauseGame();
      game.state = 'runBuild';
    }
  });
}
