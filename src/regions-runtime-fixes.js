import { GAME_WIDTH as WIDTH } from './content.js';
import { difficultyById, normalizeMission, regionById, totalWavesForMission } from './regions-data.js';

const FONT = 'Changa, "Segoe UI", Tahoma, sans-serif';
const NUMBER_FONT = 'Inter, "Segoe UI", Arial, sans-serif';

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

function panel(ctx, x, y, width, height, accent) {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 13, 29, 0.96)';
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 7;
  roundedRect(ctx, x, y, width, height, 17);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();
  ctx.restore();
}

function label(ctx, text, x, y, size, color, weight = 700, align = 'right') {
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillText(String(text), x, y);
  ctx.restore();
}

function number(ctx, text, x, y, size, color) {
  ctx.save();
  ctx.direction = 'ltr';
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.font = `800 ${size}px ${NUMBER_FONT}`;
  ctx.fillText(String(text), x, y);
  ctx.restore();
}

export function installRegionRuntimeFixes(GameClass) {
  const prototype = GameClass.prototype;
  if (prototype.__regionRuntimeFixesInstalled) return;
  prototype.__regionRuntimeFixesInstalled = true;

  const originalSpawnNextWave = prototype.spawnNextWave;
  prototype.spawnNextWave = function spawnRegionWaveWithDailyRules(...args) {
    const result = originalSpawnNextWave.apply(this, args);
    if (this.isDailyRun && this.dailyConfig?.mutator?.id === 'elite-rush') {
      this.spawnEnemy('scout', { elite: true });
    }
    if (this.isDailyRun && this.dailyConfig?.mutator?.id === 'ricochet-storm') {
      for (const enemy of this.enemies) enemy.speed *= 1.1;
    }
    return result;
  };

  const originalDrawHud = prototype.drawHud;
  prototype.drawHud = function drawMissionAwareHud(...args) {
    originalDrawHud.apply(this, args);
    if (this.boss) return;
    const mission = normalizeMission(this.activeMission);
    const region = regionById(this.arena?.regionId || mission.regionId);
    const total = this.runTargetWaves || totalWavesForMission(mission);
    const difficulty = difficultyById(mission.difficultyId);
    const ctx = this.ctx;
    panel(ctx, WIDTH - 330, 18, 312, 78, region.color);
    label(ctx, `${region.icon} ${region.shortName} • ${difficulty.name}`, WIDTH - 42, 43, 13, region.color, 800);
    number(ctx, `${this.wave} / ${total}`, WIDTH - 178, 51, 20, '#62f3ff');
    label(ctx, 'النقاط', WIDTH - 42, 72, 11, '#aeb7da', 600);
    number(ctx, Number(this.score || 0).toLocaleString('en-US'), WIDTH - 178, 77, 15, '#aeb7da');
    for (let index = 0; index < this.player.maxHealth; index += 1) {
      ctx.fillStyle = index < this.player.health ? '#ff526a' : '#252b43';
      ctx.beginPath();
      ctx.arc(WIDTH - 282 + index * 27, 73, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const originalDrawMenu = prototype.drawMenu;
  prototype.drawMenu = function drawMenuWithCurrentVersion(...args) {
    originalDrawMenu.apply(this, args);
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(5, 7, 17, 0.96)';
    ctx.fillRect(WIDTH / 2 - 180, 25, 360, 28);
    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#62f3ff';
    ctx.font = `800 12px ${NUMBER_FONT}`;
    ctx.fillText('ONE BULLET ARENA  •  v0.10.0', WIDTH / 2, 44);
    ctx.restore();
  };
}
