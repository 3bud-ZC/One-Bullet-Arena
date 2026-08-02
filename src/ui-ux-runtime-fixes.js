const FONT = 'Changa, "Segoe UI", Tahoma, sans-serif';
const CHALLENGE_TITLES = new Set(['تحدي الجولة', 'التحدي اليومي']);
const HUB_ITEMS = Object.freeze([
  { icon: '⌁', title: 'بروتوكول الكسر', subtitle: 'الخريطة المتفرعة والحراس', color: '#62f3ff' },
  { icon: '∞', title: 'أنماط اللعب', subtitle: 'اللانهائي، اندفاع الزعماء، والعقود', color: '#ff526a' },
  { icon: '◇', title: 'سجل الأعداء', subtitle: 'الأنواع ونقاط الضعف', color: '#ffe66d' },
  { icon: '♜', title: 'سجل الحراس', subtitle: 'الإتقان وأفضل الأوقات', color: '#b983ff' },
  { icon: '✦', title: 'موسوعة البناء', subtitle: 'الآثار والتركيبات المكتشفة', color: '#53f2a1' },
  { icon: '◎', title: 'التدريب', subtitle: 'تعليم تفاعلي داخل الحلبة', color: '#62f3ff' },
  { icon: '⌘', title: 'يد التحكم', subtitle: 'الحساسية وتعيين الأزرار', color: '#ff9f43' },
  { icon: '⇅', title: 'النسخة الاحتياطية', subtitle: 'تصدير واستيراد كل البيانات', color: '#53f2a1' },
]);

function roundedRect(ctx, x, y, width, height, radius = 14) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, width, height, radius);
  else ctx.rect(x, y, width, height);
}

function label(ctx, text, x, y, size, color, weight = 700, align = 'center') {
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillText(String(text), x, y);
  ctx.restore();
}

function redrawSecondaryButton(ctx, x, y, width, height, text) {
  ctx.save();
  ctx.fillStyle = '#151d34';
  ctx.strokeStyle = '#aeb7da';
  ctx.lineWidth = 2;
  roundedRect(ctx, x, y, width, height, 15);
  ctx.fill();
  ctx.stroke();
  label(ctx, text, x + width / 2, y + height / 2 + 6, 14, '#f8f9ff', 800);
  ctx.restore();
}

function redrawHubCards(game) {
  const ctx = game.ctx;
  const pointer = game.pointer || { x: -1, y: -1 };
  HUB_ITEMS.forEach((item, index) => {
    const column = index % 4;
    const row = Math.floor(index / 4);
    const x = 45 + column * 306;
    const y = 142 + row * 216;
    const width = 274;
    const height = 180;
    const hovered = pointer.x >= x && pointer.x <= x + width && pointer.y >= y && pointer.y <= y + height;
    ctx.save();
    ctx.fillStyle = hovered ? '#142039' : '#0c1425';
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 2;
    ctx.shadowColor = item.color;
    ctx.shadowBlur = hovered ? 14 : 6;
    roundedRect(ctx, x, y, width, height, 18);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();
    label(ctx, item.icon, x + width - 28, y + 43, 25, item.color, 900, 'right');
    label(ctx, item.title, x + width - 28, y + 80, 19, '#f8f9ff', 900, 'right');
    label(ctx, item.subtitle, x + width - 28, y + 113, 12, '#aeb7da', 500, 'right');
    label(ctx, 'فتح', x + 28, y + 154, 13, item.color, 800, 'left');
    ctx.restore();
  });
}

function queueChallengeBanner(game) {
  const banner = game.banner;
  if (!banner || !CHALLENGE_TITLES.has(banner.title)) return;
  game.pendingChallengeBanner = { ...banner, time: Math.min(2.6, Number(banner.time) || 2.6) };
  game.pendingChallengeDelay = Math.max(1.6, Number(game.releaseTransition?.time) || 0);
  game.banner = null;
}

export function installUiUxRuntimeFixes(GameClass) {
  const prototype = GameClass.prototype;
  if (prototype.__uiUxRuntimeFixesInstalled) return;
  prototype.__uiUxRuntimeFixesInstalled = true;

  const previousStartRun = prototype.startRun;
  prototype.startRun = function startRunWithSequencedAnnouncements(...args) {
    this.pendingChallengeBanner = null;
    this.pendingChallengeDelay = 0;
    const result = previousStartRun.apply(this, args);
    queueChallengeBanner(this);
    return result;
  };

  const previousUpdate = prototype.update;
  prototype.update = function updateSequencedAnnouncements(dt, ...args) {
    const result = previousUpdate.call(this, dt, ...args);
    if (!this.pendingChallengeBanner) return result;
    if (!['playing', 'bossIntro'].includes(this.state)) {
      this.pendingChallengeBanner = null;
      this.pendingChallengeDelay = 0;
      return result;
    }
    this.pendingChallengeDelay = Math.max(0, (this.pendingChallengeDelay || 0) - dt);
    const transitionActive = Number(this.releaseTransition?.time) > 0;
    const bannerActive = Number(this.banner?.time) > 0;
    if (this.pendingChallengeDelay <= 0 && !transitionActive && !bannerActive) {
      this.banner = this.pendingChallengeBanner;
      this.pendingChallengeBanner = null;
      this.pendingChallengeDelay = 0;
    }
    return result;
  };

  const previousDraw = prototype.draw;
  prototype.draw = function drawWithFinalUiRefinements(...args) {
    const result = previousDraw.apply(this, args);
    if (this.state === 'releaseHub') redrawHubCards(this);
    if (this.state === 'menu') redrawSecondaryButton(this.ctx, 880, 590, 304, 42, 'طريقة اللعب والتحكم');
    if (this.state === 'coreHub') {
      redrawSecondaryButton(this.ctx, 48, 642, 200, 48, 'تصدير الحفظ');
      redrawSecondaryButton(this.ctx, 266, 642, 200, 48, 'استيراد الحفظ');
    }
    return result;
  };
}
