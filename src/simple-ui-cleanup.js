const FONT = 'Changa, "Segoe UI", Tahoma, sans-serif';

function pointInRect(point, rect) {
  return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
}

export function installSimpleUiCleanup(game) {
  const drawArena = game.drawArena.bind(game);
  game.drawArena = function drawCleanArena() {
    if (!['menu', 'howto'].includes(this.state)) return drawArena();
    const obstacles = this.arena.obstacles;
    this.arena.obstacles = [];
    try {
      return drawArena();
    } finally {
      this.arena.obstacles = obstacles;
    }
  };

  const drawUpgradeCard = game.drawUpgradeCard.bind(game);
  game.drawUpgradeCard = function drawUpgradeCardWithReadableLevel(upgrade, index, x, y, width, height) {
    drawUpgradeCard(upgrade, index, x, y, width, height);
    const hovered = pointInRect(this.pointer, { x, y, w: width, h: height });
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = hovered ? '#1b2440' : 'rgba(12, 18, 38, 0.98)';
    ctx.fillRect(x + 18, y + height - 58, width - 36, 40);
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillStyle = this.stack(upgrade.id) > 0 ? '#58a6ff' : '#aeb7da';
    ctx.font = `700 14px ${FONT}`;
    ctx.fillText(`المستوى الحالي: ${this.stack(upgrade.id)} من ${upgrade.maxStacks}`, x + width - 24, y + height - 30);
    ctx.restore();
  };
}
