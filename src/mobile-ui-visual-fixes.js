import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from './content.js';
import { mobileTechniqueLayout } from './v12-expansion-data.js';

const FONT = 'Changa, "Segoe UI", Tahoma, sans-serif';

function near(value, target, tolerance = 10) {
  return Math.abs(Number(value) - Number(target)) <= tolerance;
}

function roundedRect(ctx, x, y, width, height, radius = 12) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
  ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
  ctx.arcTo(x, y + height, x, y, safeRadius);
  ctx.arcTo(x, y, x + width, y, safeRadius);
  ctx.closePath();
}

function drawTechniqueNotice(game, notice) {
  if (!notice?.technique || notice.time <= 0) return;
  const { technique } = notice;
  const ctx = game.ctx;
  ctx.save();
  ctx.fillStyle = 'rgba(3, 8, 18, 0.94)';
  ctx.strokeStyle = technique.color;
  ctx.lineWidth = 2;
  ctx.shadowColor = technique.color;
  ctx.shadowBlur = 7;
  roundedRect(ctx, WIDTH / 2 - 120, 78, 240, 34, 11);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillStyle = technique.color;
  ctx.font = `900 11px ${FONT}`;
  ctx.fillText(`${technique.icon} ${technique.name}`, WIDTH / 2, 100);
  ctx.restore();
}

function isLegacyTechniqueArc(arc, controls) {
  if (!arc) return false;
  return [controls.pulse, controls.phase].some((control) => (
    near(arc.x, control.x, 2)
    && near(arc.y, control.y, 2)
    && arc.radius >= control.radius + 7
  ));
}

function isLegacyTechniqueLabel(text, x, y, controls) {
  const supportedText = text === 'نبض' || text === 'طور' || /^\d+$/.test(String(text));
  if (!supportedText) return false;
  return [controls.pulse, controls.phase].some((control) => near(x, control.x, 6) && near(y, control.y + 5, 8));
}

export function installMobileUiVisualFixes(GameClass) {
  const prototype = GameClass.prototype;
  if (prototype.__mobileUiVisualFixesInstalled) return;
  prototype.__mobileUiVisualFixesInstalled = true;

  const previousDraw = prototype.draw;
  prototype.draw = function drawWithoutLegacyMobileArtifacts(...args) {
    const touch = Boolean(this.touchMode);
    const settings = this.mobileSettings || {};
    const controls = mobileTechniqueLayout({
      leftHanded: Boolean(settings.leftHanded),
      scale: Number(settings.controlScale) || 1,
    });
    const originalOpacity = settings.opacity;
    const originalNotice = this.v12TechniqueNotice;
    const ctx = this.ctx;
    const originalArc = ctx.arc;
    const originalFill = ctx.fill;
    const originalFillText = ctx.fillText;
    let lastArc = null;

    if (touch) {
      settings.opacity = 0;
      this.v12TechniqueNotice = null;
      ctx.arc = function trackedArc(x, y, radius, startAngle, endAngle, counterclockwise) {
        lastArc = { x, y, radius };
        return originalArc.call(this, x, y, radius, startAngle, endAngle, counterclockwise);
      };
      ctx.fill = function filteredFill(...fillArgs) {
        if (isLegacyTechniqueArc(lastArc, controls)) {
          lastArc = null;
          return undefined;
        }
        lastArc = null;
        return originalFill.apply(this, fillArgs);
      };
      ctx.fillText = function filteredFillText(text, x, y, maxWidth) {
        if (isLegacyTechniqueLabel(text, x, y, controls)) return undefined;
        return maxWidth === undefined
          ? originalFillText.call(this, text, x, y)
          : originalFillText.call(this, text, x, y, maxWidth);
      };
    }

    let result;
    try {
      result = previousDraw.apply(this, args);
    } finally {
      if (touch) {
        settings.opacity = originalOpacity;
        this.v12TechniqueNotice = originalNotice;
        ctx.arc = originalArc;
        ctx.fill = originalFill;
        ctx.fillText = originalFillText;
      }
    }

    if (this.state === 'gameover' || this.state === 'victory') {
      this.uiRegions = [];
      ctx.save();
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.restore();
      this.drawResult(this.state === 'victory');
    } else if (touch && ['playing', 'bossIntro'].includes(this.state)) {
      drawTechniqueNotice(this, originalNotice);
    }

    return result;
  };
}
