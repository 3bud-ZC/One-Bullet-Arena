const FONT = 'Changa, "Segoe UI", Tahoma, sans-serif';
const CHALLENGE_TITLES = new Set(['تحدي الجولة', 'التحدي اليومي']);
const HUB_COPY = Object.freeze([
  ['بروتوكول الكسر', 'الخريطة المتفرعة والحراس'],
  ['أنماط اللعب', 'اللانهائي، اندفاع الزعماء، والعقود'],
  ['سجل الأعداء', 'الأنواع ونقاط الضعف'],
  ['سجل الحراس', 'الإتقان وأفضل الأوقات'],
  ['موسوعة البناء', 'الآثار والتركيبات المكتشفة'],
  ['التدريب', 'تعليم تفاعلي داخل الحلبة'],
  ['يد التحكم', 'الحساسية وتعيين الأزرار'],
  ['النسخة الاحتياطية', 'تصدير واستيراد كل البيانات'],
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
  ctx.fillStyle = 'rgba(21, 29, 52, 0.98)';
  ctx.strokeStyle = '#aeb7da';
  ctx.lineWidth = 2;
  roundedRect(ctx, x, y, width, height, 15);
  ctx.fill();
  ctx.stroke();
  label(ctx, text, x + width / 2, y + height / 2 + 6, 14, '#f8f9ff', 800);
  ctx.restore();
}

function redrawHubCopy(game) {
  const ctx = game.ctx;
  const pointer = game.pointer || { x: -1, y: -1 };
  HUB_COPY.forEach(([title, subtitle], index) => {
    const column = index % 4;
    const row = Math.floor(index / 4);
    const x = 45 + column * 306;
    const y = 142 + row * 216;
    const hovered = pointer.x >= x && pointer.x <= x + 274 && pointer.y >= y && pointer.y <= y + 180;
    ctx.save();
    ctx.fillStyle = hovered ? 'rgba(20, 31, 57, 0.97)' : 'rgba(9, 14, 30, 0.97)';
    ctx.fillRect(x + 13, y + 48, 248, 89);
    label(ctx, title, x + 246, y + 80, 19, '#f8f9ff', 900, 'right');
    label(ctx, subtitle, x + 246, y + 113, 12, '#aeb7da', 500, 'right');
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
    if (this.state === 'releaseHub') redrawHubCopy(this);
    if (this.state === 'menu') redrawSecondaryButton(this.ctx, 880, 590, 304, 42, 'طريقة اللعب والتحكم');
    if (this.state === 'coreHub') {
      redrawSecondaryButton(this.ctx, 48, 642, 200, 48, 'تصدير الحفظ');
      redrawSecondaryButton(this.ctx, 266, 642, 200, 48, 'استيراد الحفظ');
    }
    return result;
  };
}
