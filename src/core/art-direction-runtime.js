import { clamp } from '../arena.js';
import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from '../game-data.js';
import { bulletPresentationState } from '../polish-runtime.js';
import { RELEASE_VERSION } from '../release.js';
import { UI_COLORS, label, progressBar, roundedRect } from '../ui-renderer.js';
import { OneBulletCheckpointRuntime } from './checkpoint-runtime.js';
import { OneBulletVisualOverhaulRuntime } from './visual-overhaul-runtime.js';

export const ART_DIRECTION_RUNTIME_VERSION = '3.5.0-art-direction-refinement';

function chamferPath(ctx, x, y, w, h, cut = 12) {
  const c = Math.max(0, Math.min(cut, Math.min(w, h) / 3));
  ctx.beginPath();
  ctx.moveTo(x + c, y);
  ctx.lineTo(x + w - c, y);
  ctx.lineTo(x + w, y + c);
  ctx.lineTo(x + w, y + h - c);
  ctx.lineTo(x + w - c, y + h);
  ctx.lineTo(x + c, y + h);
  ctx.lineTo(x, y + h - c);
  ctx.lineTo(x, y + c);
  ctx.closePath();
}

function drawTacticalPanel(ctx, rect, accent, fill = 'rgba(3, 9, 22, 0.94)') {
  ctx.save();
  chamferPath(ctx, rect.x, rect.y, rect.w, rect.h, 12);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = 'rgba(97, 126, 178, 0.38)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.globalAlpha = 0.82;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(rect.x + 18, rect.y + 3);
  ctx.lineTo(rect.x + Math.min(122, rect.w * 0.34), rect.y + 3);
  ctx.moveTo(rect.x + rect.w - 18, rect.y + rect.h - 3);
  ctx.lineTo(rect.x + rect.w - Math.min(122, rect.w * 0.34), rect.y + rect.h - 3);
  ctx.stroke();

  ctx.globalAlpha = 0.18;
  ctx.fillStyle = accent;
  ctx.fillRect(rect.x + 8, rect.y + 8, 3, rect.h - 16);
  ctx.restore();
}

export class OneBulletArtDirectionRuntime extends OneBulletVisualOverhaulRuntime {
  constructor(canvas, liveRegion = null) {
    super(canvas, liveRegion);
    this.artDirectionRuntimeVersion = ART_DIRECTION_RUNTIME_VERSION;
  }

  drawHud() {
    const ctx = this.ctx;
    const margin = 14;
    const gap = 12;
    const centerWidth = 416;
    const sideWidth = (WIDTH - margin * 2 - gap * 2 - centerWidth) / 2;
    const top = 10;
    const height = 82;
    const left = { x: margin, y: top, w: sideWidth, h: height };
    const center = { x: margin + sideWidth + gap, y: top, w: centerWidth, h: height };
    const right = { x: WIDTH - margin - sideWidth, y: top, w: sideWidth, h: height };
    const bulletState = bulletPresentationState(this.bullet);
    const palette = this.palette();
    const bulletAccent = this.bullet.held ? palette.warm : palette.primary;

    drawTacticalPanel(ctx, left, bulletAccent);
    drawTacticalPanel(ctx, center, palette.primary, 'rgba(2, 8, 20, 0.96)');
    drawTacticalPanel(ctx, right, palette.primary);

    this.drawBulletDashboard(left, bulletState, bulletAccent);
    this.drawRunDashboard(center);
    this.drawPilotDashboard(right);

    if (this.state === 'playing' && this.wave === 1 && this.tutorialStep < 3) this.drawTutorial();
    if (this.clearBannerTimer > 0 && this.state === 'playing') this.drawWaveClearCallout();
    this.drawComboMomentum();
    this.drawFeedbackCallout();
  }

  drawBulletDashboard(rect, bulletState, accent) {
    const ctx = this.ctx;
    const copy = bulletState.code === 'READY'
      ? ['IN HAND', 'READY TO FIRE']
      : bulletState.code === 'RETURNING'
        ? ['RETURNING', 'MOVE TO CATCH']
        : ['IN ARENA', 'Q TO RECALL'];
    const recallMax = Math.max(1.15, 3.8 - this.stack('magnetic-recall') * 0.38);
    const recallRatio = clamp(1 - this.bullet.recallCooldown / recallMax, 0, 1);

    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.2;
    roundedRect(ctx, rect.x + 14, rect.y + 14, 104, 24, 6);
    ctx.fill();
    ctx.stroke();
    label(ctx, bulletState.code, rect.x + 66, rect.y + 31, 9, accent, 900);
    label(ctx, copy[0], rect.x + rect.w - 18, rect.y + 30, 17, UI_COLORS.text, 900, 'right');
    label(ctx, copy[1], rect.x + rect.w - 18, rect.y + 51, 9, UI_COLORS.muted, 850, 'right');
    progressBar(ctx, rect.x + 16, rect.y + rect.h - 10, rect.w - 32, 5, recallRatio, accent, 'rgba(255,255,255,0.06)');
    ctx.restore();
  }

  drawRunDashboard(rect) {
    const ctx = this.ctx;
    label(ctx, 'ONE BULLET ARENA', rect.x + rect.w / 2, rect.y + 18, 9, UI_COLORS.player, 900);
    label(ctx, `WAVE ${String(this.wave).padStart(2, '0')}`, rect.x + rect.w / 2, rect.y + 47, 25, UI_COLORS.text, 900);
    label(
      ctx,
      `ENEMIES ${this.enemies.length}  ·  SCORE ${this.score.toLocaleString('en-US')}  ·  UPGRADES ${this.stats.upgrades}  ·  ARENA ${this.arenaStage.id + 1}/4`,
      rect.x + rect.w / 2,
      rect.y + 69,
      8,
      UI_COLORS.muted,
      850,
    );
  }

  drawPilotDashboard(rect) {
    const ctx = this.ctx;
    const healthRatio = clamp(this.player.health / Math.max(1, this.player.maxHealth), 0, 1);
    const dashMax = Math.max(0.36, 1.12 * Math.pow(0.86, this.stack('quick-dash')));
    const dashRatio = clamp(1 - this.player.dashCooldown / dashMax, 0, 1);
    const shieldOnline = this.player.shield > 0;

    label(ctx, `HP ${this.player.health}/${this.player.maxHealth}`, rect.x + rect.w - 18, rect.y + 28, 16, UI_COLORS.text, 900, 'right');
    progressBar(ctx, rect.x + 18, rect.y + 15, 112, 7, healthRatio, UI_COLORS.danger, 'rgba(255,255,255,0.06)');
    label(ctx, shieldOnline ? 'SHIELD' : 'DASH', rect.x + 18, rect.y + 54, 9, shieldOnline ? UI_COLORS.electric : UI_COLORS.player, 900, 'left');

    const segments = 7;
    const available = rect.w - 146;
    const segmentGap = 6;
    const segmentW = (available - segmentGap * (segments - 1)) / segments;
    const startX = rect.x + 112;
    for (let index = 0; index < segments; index += 1) {
      const threshold = (index + 1) / segments;
      const active = dashRatio >= threshold - 0.001;
      ctx.fillStyle = active ? UI_COLORS.player : 'rgba(92,120,164,0.23)';
      roundedRect(ctx, startX + index * (segmentW + segmentGap), rect.y + 50, segmentW, 7, 3);
      ctx.fill();
    }
  }

  drawFloorDetails(bounds, accent, stage) {
    const ctx = this.ctx;
    const centerX = bounds.x + bounds.w / 2;
    const centerY = bounds.y + bounds.h / 2;
    ctx.save();
    roundedRect(ctx, bounds.x, bounds.y, bounds.w, bounds.h, 14);
    ctx.clip();

    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = accent.primary;
    ctx.lineWidth = 1;
    const grid = 48;
    for (let x = bounds.x + grid; x < bounds.x + bounds.w; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x, bounds.y);
      ctx.lineTo(x, bounds.y + bounds.h);
      ctx.stroke();
    }
    for (let y = bounds.y + grid; y < bounds.y + bounds.h; y += grid) {
      ctx.beginPath();
      ctx.moveTo(bounds.x, y);
      ctx.lineTo(bounds.x + bounds.w, y);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.26;
    ctx.strokeStyle = accent.secondary;
    ctx.setLineDash([8, 12]);
    for (const radius of [Math.min(bounds.w, bounds.h) * 0.2, Math.min(bounds.w, bounds.h) * 0.34]) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.globalAlpha = 0.34;
    ctx.strokeStyle = accent.warm;
    ctx.lineWidth = 2;
    const rail = 42;
    const inset = 18;
    const corners = [
      [bounds.x + inset, bounds.y + inset, 1, 1],
      [bounds.x + bounds.w - inset, bounds.y + inset, -1, 1],
      [bounds.x + inset, bounds.y + bounds.h - inset, 1, -1],
      [bounds.x + bounds.w - inset, bounds.y + bounds.h - inset, -1, -1],
    ];
    for (const [x, y, sx, sy] of corners) {
      ctx.beginPath();
      ctx.moveTo(x, y + sy * rail);
      ctx.lineTo(x, y);
      ctx.lineTo(x + sx * rail, y);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.38;
    label(ctx, `SECTOR ${stage + 1}/4`, bounds.x + 28, bounds.y + 31, 8, accent.primary, 900, 'left');
    ctx.restore();
  }

  drawObstacle(obstacle) {
    const ctx = this.ctx;
    const palette = this.palette();
    const cut = Math.min(12, obstacle.w * 0.12, obstacle.h * 0.22);

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 14;
    chamferPath(ctx, obstacle.x + 5, obstacle.y + 8, obstacle.w, obstacle.h, cut);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fill();
    ctx.shadowBlur = 0;

    const body = ctx.createLinearGradient(obstacle.x, obstacle.y, obstacle.x + obstacle.w, obstacle.y + obstacle.h);
    body.addColorStop(0, '#152842');
    body.addColorStop(0.5, '#0c1930');
    body.addColorStop(1, '#071122');
    chamferPath(ctx, obstacle.x, obstacle.y, obstacle.w, obstacle.h, cut);
    ctx.fillStyle = body;
    ctx.fill();
    ctx.strokeStyle = 'rgba(104, 151, 211, 0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = palette.primary;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(obstacle.x + 12, obstacle.y + 8);
    ctx.lineTo(obstacle.x + obstacle.w - 18, obstacle.y + 8);
    ctx.stroke();

    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = '#d7efff';
    ctx.beginPath();
    ctx.moveTo(obstacle.x + 14, obstacle.y + obstacle.h - 10);
    ctx.lineTo(obstacle.x + obstacle.w - 14, obstacle.y + obstacle.h - 10);
    ctx.stroke();

    ctx.globalAlpha = 0.7;
    ctx.fillStyle = palette.warm;
    const markerCount = Math.max(1, Math.min(4, Math.floor(obstacle.w / 52)));
    for (let index = 0; index < markerCount; index += 1) {
      ctx.fillRect(obstacle.x + 15 + index * 18, obstacle.y + obstacle.h - 5, 9, 2);
    }
    ctx.restore();
  }

  drawArenaBorder() {
    const ctx = this.ctx;
    const bounds = this.arenaStage.bounds;
    const palette = this.palette();
    const pulse = 0.72 + Math.sin(this.elapsed * 2.2) * 0.08 + this.arenaExpansionPulse * 0.16;

    ctx.save();
    roundedRect(ctx, bounds.x, bounds.y, bounds.w, bounds.h, 14);
    ctx.strokeStyle = 'rgba(5, 11, 24, 0.96)';
    ctx.lineWidth = 10;
    ctx.stroke();

    ctx.globalAlpha = clamp(pulse, 0, 1);
    ctx.strokeStyle = palette.primary;
    ctx.lineWidth = 2;
    roundedRect(ctx, bounds.x, bounds.y, bounds.w, bounds.h, 14);
    ctx.stroke();

    ctx.globalAlpha = 0.48;
    ctx.strokeStyle = 'rgba(215, 241, 255, 0.5)';
    ctx.lineWidth = 1;
    roundedRect(ctx, bounds.x + 7, bounds.y + 7, bounds.w - 14, bounds.h - 14, 9);
    ctx.stroke();

    const corner = 34;
    ctx.strokeStyle = palette.warm;
    ctx.lineWidth = 2.2;
    ctx.globalAlpha = 0.62;
    for (const [x, y, sx, sy] of [
      [bounds.x + 3, bounds.y + 3, 1, 1],
      [bounds.x + bounds.w - 3, bounds.y + 3, -1, 1],
      [bounds.x + 3, bounds.y + bounds.h - 3, 1, -1],
      [bounds.x + bounds.w - 3, bounds.y + bounds.h - 3, -1, -1],
    ]) {
      ctx.beginPath();
      ctx.moveTo(x, y + sy * corner);
      ctx.lineTo(x, y);
      ctx.lineTo(x + sx * corner, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawMenu() {
    OneBulletCheckpointRuntime.prototype.drawMenu.call(this);
  }

  getSnapshot() {
    return {
      ...super.getSnapshot(),
      releaseVersion: RELEASE_VERSION,
      artDirectionRuntimeVersion: ART_DIRECTION_RUNTIME_VERSION,
      artDirectionRefinementActive: true,
      desktopViewportMode: 'edge-to-edge-browser-viewport',
      tacticalHudRevision: 'three-module-dashboard-v2',
      mapVisualRevision: 'sector-grid-reduced-frame-noise',
      obstacleVisualRevision: 'chamfered-tactical-blocks',
      gameplayGeometryChanged: false,
      collisionGeometryChanged: false,
    };
  }
}
