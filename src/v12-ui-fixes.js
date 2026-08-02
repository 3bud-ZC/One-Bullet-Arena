const FONT = 'Changa, "Segoe UI", Tahoma, sans-serif';

function drawReleaseVersion(game) {
  if (game.state !== 'menu') return;
  const ctx = game.ctx;
  ctx.save();
  ctx.fillStyle = 'rgba(3, 7, 17, 0.98)';
  ctx.fillRect(930, 74, 292, 28);
  ctx.direction = 'ltr';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#62f3ff';
  ctx.font = `800 12px ${FONT}`;
  ctx.fillText('COREBREAK PROTOCOL  •  v1.2.0', 1210, 94);
  ctx.restore();
}

export function installV12UiFixes(GameClass) {
  const prototype = GameClass.prototype;
  if (prototype.__v12UiFixesInstalled) return;
  prototype.__v12UiFixesInstalled = true;

  const previousUpdate = prototype.update;
  prototype.update = function updateV12UiFixes(dt, ...args) {
    const result = previousUpdate.call(this, dt, ...args);
    if (this.banner?.time > 0 && this.v12TechniqueNotice) this.v12TechniqueNotice = null;
    return result;
  };

  const previousDraw = prototype.draw;
  prototype.draw = function drawV12UiFixes(...args) {
    const result = previousDraw.apply(this, args);
    drawReleaseVersion(this);
    return result;
  };
}
