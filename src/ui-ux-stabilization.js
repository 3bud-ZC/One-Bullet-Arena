import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from './content.js';
import {
  BULLET_CORES,
  PROGRESSION_STORAGE_KEY,
  coreById,
  normalizeSave,
  unlockCore,
} from './progression-data.js';
import {
  difficultyById,
  modeById,
  normalizeMission,
  regionById,
} from './regions-data.js';

const FONT = 'Changa, "Segoe UI", Tahoma, sans-serif';
const NUMBER_FONT = 'Inter, "Segoe UI", Arial, sans-serif';
const C = Object.freeze({
  bg: '#040711',
  panel: 'rgba(9, 14, 30, 0.97)',
  panelSoft: 'rgba(15, 22, 43, 0.94)',
  panelRaised: 'rgba(20, 31, 57, 0.97)',
  border: '#33406f',
  cyan: '#62f3ff',
  yellow: '#ffe66d',
  green: '#53f2a1',
  red: '#ff526a',
  purple: '#b983ff',
  orange: '#ff9f43',
  text: '#f8f9ff',
  muted: '#aeb7da',
  dim: '#69739b',
});

function roundedRect(ctx, x, y, width, height, radius = 16) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, width, height, radius);
  else ctx.rect(x, y, width, height);
}

function panel(ctx, x, y, width, height, accent = C.border, fill = C.panel, glow = 6) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.shadowColor = accent;
  ctx.shadowBlur = glow;
  roundedRect(ctx, x, y, width, height, 18);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();
  ctx.restore();
}

function label(ctx, text, x, y, size, color = C.text, weight = 700, align = 'center') {
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillText(String(text), x, y);
  ctx.restore();
}

function number(ctx, text, x, y, size, color = C.text, align = 'center') {
  ctx.save();
  ctx.direction = 'ltr';
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.font = `800 ${size}px ${NUMBER_FONT}`;
  ctx.fillText(String(text), x, y);
  ctx.restore();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3, size = 15, color = C.muted, weight = 600) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.font = `${weight} ${size}px ${FONT}`;
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
  ctx.fillStyle = color;
  lines.forEach((item, index) => ctx.fillText(item, x, y + index * lineHeight));
  ctx.restore();
}

function inside(point, rect) {
  return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
}

function actionButton(game, rect, text, action, options = {}) {
  const hovered = inside(game.pointer || { x: -1, y: -1 }, rect);
  const accent = options.accent || C.cyan;
  const disabled = Boolean(options.disabled);
  const fill = disabled
    ? 'rgba(12, 17, 31, 0.8)'
    : options.primary
      ? `${accent}${hovered ? '43' : '2b'}`
      : hovered
        ? 'rgba(25, 35, 62, 0.98)'
        : C.panelSoft;
  panel(game.ctx, rect.x, rect.y, rect.w, rect.h, disabled ? C.border : accent, fill, hovered && !disabled ? 13 : 3);
  label(game.ctx, text, rect.x + rect.w / 2, rect.y + rect.h / 2 + 7, options.size || 17, disabled ? C.dim : options.primary ? C.text : accent, 900);
  if (!disabled) game.addUiRegion(rect.x, rect.y, rect.w, rect.h, () => {
    game.audio.play('click');
    action();
  });
}

function formatCompact(value) {
  const numberValue = Math.max(0, Number(value) || 0);
  if (numberValue >= 1_000_000) return `${(numberValue / 1_000_000).toFixed(1)}M`;
  if (numberValue >= 1_000) return `${(numberValue / 1_000).toFixed(numberValue >= 10_000 ? 0 : 1)}K`;
  return Math.round(numberValue).toLocaleString('en-US');
}

function persistProgression(game) {
  game.progressionSave = normalizeSave(game.progressionSave);
  game.progressionSave.updatedAt = new Date().toISOString();
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(game.progressionSave));
  }
}

function selectedMissionSummary(game) {
  const mission = normalizeMission(game.selectedMission);
  const mode = modeById(mission.modeId);
  const difficulty = difficultyById(mission.difficultyId);
  const region = regionById(mission.regionId);
  const location = mission.modeId === 'story' ? 'المناطق الثلاث' : region.shortName;
  return `${mode.name} • ${location} • ${difficulty.name}`;
}

function drawStat(ctx, x, y, title, value, color) {
  label(ctx, title, x, y, 12, C.muted, 600, 'right');
  number(ctx, value, x - 6, y + 28, 20, color, 'right');
}

function drawMainMenu(game) {
  const ctx = game.ctx;
  const save = normalizeSave(game.progressionSave);
  const core = coreById(save.selectedCore) || BULLET_CORES[0];
  const daily = game.dailyConfig || {};
  const challenge = daily.challenge || game.runChallenge || {};
  const mutator = daily.mutator || {};

  const overlay = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  overlay.addColorStop(0, 'rgba(2, 5, 13, 0.88)');
  overlay.addColorStop(1, 'rgba(5, 10, 24, 0.95)');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  label(ctx, 'حلبة الطلقة الواحدة', 1210, 66, 42, C.text, 900, 'right');
  label(ctx, 'COREBREAK PROTOCOL  •  v1.0.1', 1210, 94, 12, C.cyan, 800, 'right');

  panel(ctx, 58, 126, 760, 522, C.cyan, 'rgba(8, 14, 31, 0.97)', 9);
  label(ctx, 'الجولة التالية', 770, 174, 17, C.muted, 700, 'right');
  label(ctx, selectedMissionSummary(game), 770, 211, 28, C.text, 900, 'right');
  label(ctx, `${core.icon} ${core.name}`, 770, 250, 17, core.color, 800, 'right');
  wrapText(ctx, 'ابدأ جولة سريعة أو ادخل بروتوكول الكسر لتبني مسارك وتجمع الـRelics وتواجه الحراس الثلاثة.', 770, 292, 660, 27, 3, 16, C.muted, 600);

  actionButton(game, { x: 104, y: 390, w: 668, h: 76 }, 'ابدأ الجولة', () => game.startRun(), { primary: true, accent: C.cyan, size: 24 });
  actionButton(game, { x: 104, y: 484, w: 322, h: 58 }, 'بروتوكول الكسر', () => game.startProtocolRun?.(), { accent: C.yellow, size: 18 });
  actionButton(game, { x: 450, y: 484, w: 322, h: 58 }, 'اختيار المهمة', () => {
    game.missionDraft = { ...normalizeMission(game.selectedMission) };
    game.state = 'missionSelect';
  }, { accent: C.purple, size: 18 });

  drawStat(ctx, 750, 591, 'أفضل نتيجة', formatCompact(game.highScore), C.yellow);
  drawStat(ctx, 582, 591, 'الانتصارات', formatCompact(save.stats?.victories), C.green);
  drawStat(ctx, 410, 591, 'شظايا النواة', formatCompact(save.shards), C.cyan);
  drawStat(ctx, 238, 591, 'الجولات', formatCompact(save.stats?.runs), C.purple);

  panel(ctx, 842, 126, 380, 248, C.yellow, C.panel, 6);
  label(ctx, 'التحدي اليومي', 1180, 170, 24, C.yellow, 900, 'right');
  label(ctx, challenge.name || 'تحدٍ جديد كل يوم', 1180, 207, 18, C.text, 800, 'right');
  label(ctx, mutator.name || 'معدل يومي متغير', 1180, 239, 14, C.purple, 700, 'right');
  wrapText(ctx, challenge.description || 'افتح تفاصيل التحدي لمعرفة الشرط والمكافأة.', 1180, 272, 300, 22, 2, 13, C.muted, 500);
  actionButton(game, { x: 882, y: 314, w: 300, h: 44 }, 'عرض التفاصيل', () => { game.state = 'dailyBrief'; }, { accent: C.yellow, size: 15 });

  panel(ctx, 842, 394, 380, 254, C.border, 'rgba(8, 13, 28, 0.97)', 3);
  label(ctx, 'الوصول السريع', 1180, 438, 20, C.text, 900, 'right');
  actionButton(game, { x: 880, y: 466, w: 304, h: 50 }, 'مركز القيادة', () => { game.state = 'releaseHub'; }, { primary: true, accent: C.cyan });
  actionButton(game, { x: 880, y: 529, w: 145, h: 48 }, 'مركز النواة', () => {
    game.uiSelectedCoreId = save.selectedCore;
    game.state = 'coreHub';
  }, { accent: C.green, size: 15 });
  actionButton(game, { x: 1039, y: 529, w: 145, h: 48 }, 'الإعدادات', () => {
    game.settingsReturnState = 'menu';
    game.state = 'settings';
  }, { accent: C.purple, size: 15 });
  actionButton(game, { x: 880, y: 590, w: 304, h: 42 }, 'طريقة اللعب والتحكم', () => { game.state = 'howto'; }, { accent: C.border, size: 14 });
}

const HUB_ITEMS = Object.freeze([
  { id: 'protocol', icon: '⌁', title: 'بروتوكول الكسر', subtitle: 'الخريطة المتفرعة والحراس', color: C.cyan },
  { id: 'modes', icon: '∞', title: 'أنماط اللعب', subtitle: 'Endless وBoss Rush والعقود', color: C.red },
  { id: 'enemies', icon: '◈', title: 'سجل الأعداء', subtitle: 'الأنواع ونقاط الضعف', color: C.yellow },
  { id: 'guardians', icon: '♜', title: 'سجل الحراس', subtitle: 'Mastery وأفضل الأوقات', color: C.purple },
  { id: 'builds', icon: '✦', title: 'موسوعة الـBuild', subtitle: 'Relics وSynergies المكتشفة', color: C.green },
  { id: 'tutorial', icon: '◎', title: 'التدريب', subtitle: 'تعليم تفاعلي داخل الحلبة', color: C.cyan },
  { id: 'gamepad', icon: '⌘', title: 'تحكم Gamepad', subtitle: 'الحساسية وربط الأزرار', color: C.orange },
  { id: 'backup', icon: '⇅', title: 'النسخة الاحتياطية', subtitle: 'تصدير واستيراد كل البيانات', color: C.green },
]);

function beginTutorial(game) {
  game.resetRun();
  game.tutorialMode = true;
  game.tutorialStep = 0;
  game.tutorialStart = { x: game.player.x, y: game.player.y };
  game.tutorialDashUsed = false;
  game.runTargetWaves = 99;
  game.state = 'playing';
  game.audio.setScene('combat');
  game.spawnEnemy('scout', { point: { x: 900, y: 360 } });
  game.banner = { title: 'غرفة التدريب', subtitle: 'تعلم قاعدة الطلقة الواحدة خطوة بخطوة', time: 2 };
}

function activateHubItem(game, id) {
  if (id === 'protocol') game.startProtocolRun?.();
  else if (id === 'modes') game.state = 'modeHub';
  else if (id === 'enemies') { game.codexRegion = 'forge'; game.state = 'enemyCodex'; }
  else if (id === 'guardians') game.state = 'bossMastery';
  else if (id === 'builds') { game.buildCodexPage = 0; game.state = 'buildCodex'; }
  else if (id === 'tutorial') beginTutorial(game);
  else if (id === 'gamepad') game.state = 'gamepadSettings';
  else if (id === 'backup') game.state = 'backupHub';
}

function drawReleaseHub(game) {
  const ctx = game.ctx;
  ctx.fillStyle = 'rgba(2, 5, 13, 0.95)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  label(ctx, 'مركز القيادة', WIDTH / 2, 66, 40, C.text, 900);
  label(ctx, 'اختر النظام الذي تريد فتحه', WIDTH / 2, 98, 15, C.muted, 600);

  HUB_ITEMS.forEach((item, index) => {
    const column = index % 4;
    const row = Math.floor(index / 4);
    const rect = { x: 45 + column * 306, y: 142 + row * 216, w: 274, h: 180 };
    const hovered = inside(game.pointer || { x: -1, y: -1 }, rect);
    panel(ctx, rect.x, rect.y, rect.w, rect.h, item.color, hovered ? C.panelRaised : C.panel, hovered ? 14 : 5);
    label(ctx, item.icon, rect.x + rect.w - 28, rect.y + 43, 25, item.color, 900, 'right');
    label(ctx, item.title, rect.x + rect.w - 28, rect.y + 80, 19, C.text, 900, 'right');
    wrapText(ctx, item.subtitle, rect.x + rect.w - 28, rect.y + 112, rect.w - 56, 21, 2, 13, C.muted, 500);
    label(ctx, 'فتح', rect.x + 28, rect.y + 154, 13, item.color, 800, 'left');
    game.addUiRegion(rect.x, rect.y, rect.w, rect.h, () => {
      game.audio.play('click');
      activateHubItem(game, item.id);
    });
  });

  actionButton(game, { x: WIDTH / 2 - 150, y: 610, w: 300, h: 52 }, 'العودة للقائمة', () => { game.state = 'menu'; }, { primary: true, accent: C.cyan });
}

function coreSelector(game, core, rect, save, selected) {
  const unlocked = save.unlockedCores.includes(core.id);
  const hovered = inside(game.pointer || { x: -1, y: -1 }, rect);
  const accent = selected ? core.color : unlocked ? C.border : C.dim;
  panel(game.ctx, rect.x, rect.y, rect.w, rect.h, accent, selected ? `${core.color}20` : hovered ? C.panelRaised : C.panelSoft, selected ? 10 : 2);
  label(game.ctx, core.icon, rect.x + rect.w - 22, rect.y + 32, 20, core.color, 900, 'right');
  label(game.ctx, core.name, rect.x + rect.w - 60, rect.y + 29, 16, selected ? core.color : C.text, 900, 'right');
  label(game.ctx, unlocked ? (save.selectedCore === core.id ? 'مجهزة' : 'مفتوحة') : `${core.cost} شظية`, rect.x + rect.w - 60, rect.y + 53, 11, unlocked ? C.green : C.muted, 600, 'right');
  game.addUiRegion(rect.x, rect.y, rect.w, rect.h, () => {
    game.audio.play('click');
    game.uiSelectedCoreId = core.id;
  });
}

function equipOrUnlockCore(game, core) {
  let save = normalizeSave(game.progressionSave);
  if (!save.unlockedCores.includes(core.id)) {
    const result = unlockCore(save, core.id);
    if (!result.unlocked) return;
    save = result.save;
  }
  save.selectedCore = core.id;
  game.progressionSave = save;
  game.activeCoreId = core.id;
  game.uiSelectedCoreId = core.id;
  persistProgression(game);
}

function drawCoreHub(game) {
  const ctx = game.ctx;
  const save = normalizeSave(game.progressionSave);
  const selectedId = game.uiSelectedCoreId || save.selectedCore;
  const core = coreById(selectedId) || BULLET_CORES[0];
  const unlocked = save.unlockedCores.includes(core.id);
  const equipped = save.selectedCore === core.id;
  const mastery = save.coreMastery?.[core.id] || { runs: 0, victories: 0 };

  ctx.fillStyle = 'rgba(2, 5, 13, 0.96)';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  label(ctx, 'مركز النواة', 1210, 60, 38, C.text, 900, 'right');
  label(ctx, 'اختر نواة ثم راجع تفاصيلها قبل التجهيز', 1210, 91, 14, C.muted, 600, 'right');
  panel(ctx, 54, 38, 260, 56, C.yellow, 'rgba(42, 35, 14, 0.8)', 4);
  label(ctx, 'شظايا النواة', 282, 71, 12, C.muted, 600, 'right');
  number(ctx, save.shards, 86, 75, 21, C.yellow, 'left');

  panel(ctx, 48, 120, 330, 500, C.border, 'rgba(7, 11, 24, 0.98)', 3);
  BULLET_CORES.forEach((item, index) => {
    coreSelector(game, item, { x: 68, y: 142 + index * 88, w: 290, h: 72 }, save, item.id === core.id);
  });

  panel(ctx, 404, 120, 828, 500, core.color, 'rgba(9, 15, 32, 0.98)', 8);
  label(ctx, core.icon, 1188, 178, 34, core.color, 900, 'right');
  label(ctx, core.name, 1138, 178, 30, C.text, 900, 'right');
  label(ctx, equipped ? 'مجهزة حاليًا' : unlocked ? 'مفتوحة وقابلة للتجهيز' : 'نواة مقفلة', 1138, 211, 14, equipped ? C.green : unlocked ? C.cyan : C.yellow, 700, 'right');
  wrapText(ctx, core.description, 1168, 258, 690, 29, 3, 17, C.muted, 600);

  label(ctx, 'خصائص النواة', 1168, 354, 16, core.color, 900, 'right');
  core.traits.forEach((trait, index) => {
    const rect = { x: 452 + index * 238, y: 379, w: 218, h: 82 };
    panel(ctx, rect.x, rect.y, rect.w, rect.h, index === 0 ? core.color : C.border, C.panelSoft, 2);
    label(ctx, trait, rect.x + rect.w - 18, rect.y + 48, 14, index === 0 ? core.color : C.text, 800, 'right');
  });

  panel(ctx, 452, 488, 382, 96, C.border, C.panelSoft, 2);
  label(ctx, 'إحصائيات الإتقان', 806, 519, 14, C.muted, 700, 'right');
  number(ctx, `${mastery.runs || 0} جولة`, 790, 557, 17, C.cyan, 'right');
  number(ctx, `${mastery.victories || 0} فوز`, 595, 557, 17, C.green, 'right');

  const canUnlock = save.shards >= core.cost;
  const actionText = equipped ? 'هذه النواة مجهزة' : unlocked ? 'تجهيز النواة' : canUnlock ? `فتح مقابل ${core.cost} شظية` : `تحتاج ${core.cost} شظية`;
  actionButton(game, { x: 862, y: 502, w: 326, h: 68 }, actionText, () => equipOrUnlockCore(game, core), {
    primary: !equipped && (unlocked || canUnlock),
    accent: equipped ? C.green : core.color,
    disabled: equipped || (!unlocked && !canUnlock),
    size: 17,
  });

  actionButton(game, { x: 48, y: 642, w: 200, h: 48 }, 'تصدير الحفظ', () => game.exportProgressionSave?.(), { accent: C.border, size: 14 });
  actionButton(game, { x: 266, y: 642, w: 200, h: 48 }, 'استيراد الحفظ', () => game.requestProgressionImport?.(), { accent: C.border, size: 14 });
  actionButton(game, { x: 830, y: 642, w: 180, h: 48 }, 'إعادة تعيين', () => game.requestProgressionReset?.(), { accent: C.red, size: 14 });
  actionButton(game, { x: 1028, y: 642, w: 204, h: 48 }, 'العودة', () => { game.state = 'menu'; }, { primary: true, accent: C.cyan, size: 16 });
}

function drawHealth(ctx, game, x, y) {
  const max = Math.max(1, Number(game.player?.maxHealth) || 1);
  const current = Math.max(0, Number(game.player?.health) || 0);
  for (let index = 0; index < max; index += 1) {
    const px = x - index * 26;
    ctx.fillStyle = index < current ? C.red : '#26304a';
    ctx.beginPath();
    ctx.arc(px, y, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  if (game.player?.shield > 0) {
    ctx.strokeStyle = C.cyan;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x - max * 26 - 2, y, 8, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawCompactHud(game) {
  if (!['playing', 'paused', 'bossIntro', 'upgrade'].includes(game.state)) return;
  const ctx = game.ctx;
  const target = Number(game.runTargetWaves) || 5;
  const waveLabel = game.boss ? 'مواجهة الحارس' : `الموجة ${game.wave} / ${target}`;
  const bulletText = game.bullet?.held ? 'الطلقة جاهزة' : game.bullet?.recalling ? 'الطلقة تعود' : `${Math.max(0, game.bullet?.bouncesRemaining || 0)} ارتدادات`;
  const dashText = game.player?.dashCooldown > 0 ? `${game.player.dashCooldown.toFixed(1)}ث` : 'جاهز';

  panel(ctx, 18, 18, 270, 76, game.bullet?.held ? C.yellow : C.cyan, 'rgba(5, 9, 21, 0.88)', 4);
  label(ctx, bulletText, 266, 48, 16, game.bullet?.held ? C.yellow : C.cyan, 900, 'right');
  label(ctx, `اندفاع: ${dashText}`, 266, 75, 12, C.muted, 600, 'right');

  panel(ctx, WIDTH - 288, 18, 270, 76, C.cyan, 'rgba(5, 9, 21, 0.88)', 4);
  label(ctx, waveLabel, WIDTH - 40, 47, 16, C.cyan, 900, 'right');
  number(ctx, formatCompact(game.score), WIDTH - 40, 76, 16, C.text, 'right');
  drawHealth(ctx, game, WIDTH - 185, 70);

  if (game.combo > 1) {
    panel(ctx, WIDTH - 180, 106, 162, 38, C.purple, 'rgba(5, 9, 21, 0.82)', 2);
    label(ctx, `Combo ×${game.combo}`, WIDTH - 99, 131, 13, C.purple, 900);
  }

  if (game.boss) {
    const maxHealth = Math.max(1, Number(game.boss.maxHealth) || Number(game.boss.hp) || 1);
    const health = Math.max(0, Number(game.boss.hp) || 0);
    const ratio = Math.max(0, Math.min(1, health / maxHealth));
    const x = WIDTH / 2 - 300;
    const y = 126;
    panel(ctx, x, y, 600, 34, C.red, 'rgba(5, 9, 21, 0.9)', 3);
    ctx.fillStyle = 'rgba(255, 82, 106, 0.28)';
    roundedRect(ctx, x + 8, y + 8, 584, 18, 9);
    ctx.fill();
    ctx.fillStyle = C.red;
    roundedRect(ctx, x + 8, y + 8, 584 * ratio, 18, 9);
    ctx.fill();
    label(ctx, game.boss.name || 'الحارس', WIDTH / 2, y + 23, 12, C.text, 900);
  }
}

function drawStandaloneState(game, renderer) {
  game.uiRegions = [];
  const ctx = game.ctx;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  game.drawArena();
  renderer(game);
  ctx.restore();
}

function runUiRegion(game, x, y) {
  for (let index = game.uiRegions.length - 1; index >= 0; index -= 1) {
    const region = game.uiRegions[index];
    if (x >= region.x && x <= region.x + region.w && y >= region.y && y <= region.y + region.h) {
      region.action();
      return true;
    }
  }
  return false;
}

export function installUiUxStabilization(GameClass) {
  const prototype = GameClass.prototype;
  if (prototype.__uiUxStabilizationInstalled) return;
  prototype.__uiUxStabilizationInstalled = true;

  prototype.drawMenu = function drawStableMainMenu() {
    drawMainMenu(this);
  };

  prototype.drawHud = function drawStableCombatHud() {
    drawCompactHud(this);
  };

  const previousDraw = prototype.draw;
  prototype.draw = function drawWithStableHubs(...args) {
    if (this.state === 'releaseHub') {
      drawStandaloneState(this, drawReleaseHub);
      return;
    }
    if (this.state === 'coreHub') {
      drawStandaloneState(this, drawCoreHub);
      return;
    }
    return previousDraw.apply(this, args);
  };

  const previousClick = prototype.handleUiClick;
  prototype.handleUiClick = function handleStableUiClick(x, y) {
    if (['menu', 'releaseHub', 'coreHub'].includes(this.state)) return runUiRegion(this, x, y);
    return previousClick.call(this, x, y);
  };

  const previousEscape = prototype.handleEscape;
  prototype.handleEscape = function handleStableUiEscape() {
    if (['releaseHub', 'coreHub'].includes(this.state)) {
      this.audio.play('click');
      this.state = 'menu';
      return;
    }
    return previousEscape.call(this);
  };
}

export const UI_STABILIZATION_VERSION = '1.0.1';
export const UI_SAFE_AREA = Object.freeze({ x: 18, y: 18, w: WIDTH - 36, h: HEIGHT - 36 });
