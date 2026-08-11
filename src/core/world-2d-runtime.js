import { clamp, normalize } from '../arena.js';
import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from '../game-data.js';
import { RELEASE_VERSION } from '../release.js';
import { UI_COLORS, polygon, roundedRect } from '../ui-renderer.js';
import { OneBulletWardenRuntime } from './warden-runtime.js';

export const WORLD_2D_RUNTIME_VERSION = '3.2.0-true-2d';

const TILE_SIZE = 54;
const ECHO_LIFETIME = 0.24;
/*
 * One accent per sector, in sector order.
 *
 * This was a three-entry table indexed with `stage % length`, so sectors 0/3/6
 * and 1/4/7 shared a palette and the world visibly reset every third sector.
 * The progression now runs cool-structural to warm-industrial and back to a
 * cold endgame, so a glance at the floor tells you roughly how deep you are.
 *
 * Cyan stays the structural/system colour throughout and gold is never used
 * here — it belongs to the bullet.
 */
const STAGE_ACCENTS = Object.freeze([
  Object.freeze({ primary: '#39d9ff', secondary: '#2a67bd', warm: '#ffd66b' }), // 0 chamber
  Object.freeze({ primary: '#4ce0e0', secondary: '#236f9e', warm: '#ffca69' }), // 1 wings
  Object.freeze({ primary: '#63f4c4', secondary: '#227ca4', warm: '#ffca69' }), // 2 corridors
  Object.freeze({ primary: '#7fe0a4', secondary: '#2f6f9c', warm: '#ffc46a' }), // 3 bowl
  Object.freeze({ primary: '#c8b972', secondary: '#4a6394', warm: '#ffb45f' }), // 4 cascade
  Object.freeze({ primary: '#ff9f6b', secondary: '#6a5590', warm: '#ffab52' }), // 5 industrial
  Object.freeze({ primary: '#a989ff', secondary: '#3e67c9', warm: '#ffb45f' }), // 6 matrix
  Object.freeze({ primary: '#7ea8ff', secondary: '#2b3f86', warm: '#ffd2a0' }), // 7 belt
]);

// Top-of-gradient floor value per sector, paired with STAGE_ACCENTS.
const FLOOR_TOPS = Object.freeze([
  '#121e35', '#141f38', '#16233c', '#18213a', '#1b2138', '#20202f', '#1d1c33', '#141a30',
]);

export function smoothVisualValue(current, target, dt, response = 14) {
  const safeCurrent = Number(current) || 0;
  const safeTarget = Number(target) || 0;
  const safeDt = Math.max(0, Number(dt) || 0);
  const safeResponse = Math.max(0, Number(response) || 0);
  const alpha = 1 - Math.exp(-safeDt * safeResponse);
  return safeCurrent + (safeTarget - safeCurrent) * alpha;
}

export function floorTileVariant(column, row, stage = 0) {
  const seed = Math.abs((Number(column) || 0) * 17 + (Number(row) || 0) * 31 + (Number(stage) || 0) * 13);
  return seed % 4;
}

export function world2DThemeTokens() {
  return Object.freeze({
    version: WORLD_2D_RUNTIME_VERSION,
    style: 'layered-top-down-2d',
    tileSize: TILE_SIZE,
    stageCount: STAGE_ACCENTS.length,
    stableHud: true,
    deterministicShake: true,
    gameplayGeometryChanged: false,
  });
}

export class OneBulletWorld2DRuntime extends OneBulletWardenRuntime {
  constructor(canvas, liveRegion = null) {
    super(canvas, liveRegion);
    this.world2DRuntimeVersion = WORLD_2D_RUNTIME_VERSION;
    this.visualMotion = 0;
    this.visualLean = 0;
    this.visualDirection = { x: 0, y: 0 };
    this.previousPlayerPosition = { x: this.player.x, y: this.player.y };
    this.playerEchoes = [];
    this.echoCooldown = 0;
    this.renderFrame = 0;
  }

  update(dt) {
    const safeDt = Math.max(0, Number(dt) || 0);
    const previousX = this.player.x;
    const previousY = this.player.y;

    super.update(safeDt);

    const dx = this.player.x - previousX;
    const dy = this.player.y - previousY;
    const travelled = Math.hypot(dx, dy);
    const targetMotion = safeDt > 0 ? clamp(travelled / (safeDt * 340), 0, 1.25) : 0;
    const direction = travelled > 0.05 ? normalize(dx, dy) : { x: 0, y: 0 };

    this.visualMotion = smoothVisualValue(
      this.visualMotion,
      targetMotion,
      safeDt,
      targetMotion > this.visualMotion ? 18 : 11,
    );
    this.visualDirection.x = smoothVisualValue(this.visualDirection.x, direction.x, safeDt, 16);
    this.visualDirection.y = smoothVisualValue(this.visualDirection.y, direction.y, safeDt, 16);
    this.visualLean = smoothVisualValue(this.visualLean, direction.x * targetMotion, safeDt, 13);

    this.echoCooldown = Math.max(0, this.echoCooldown - safeDt);
    if (
      this.state === 'playing'
      && !this.reducedMotion
      && travelled > 4
      && this.echoCooldown <= 0
    ) {
      this.playerEchoes.push({
        x: previousX,
        y: previousY,
        angle: Math.atan2(this.pointer.y - previousY, this.pointer.x - previousX),
        life: ECHO_LIFETIME,
        maxLife: ECHO_LIFETIME,
      });
      this.echoCooldown = this.player.dashRemaining > 0 ? 0.025 : 0.065;
    }

    for (const echo of this.playerEchoes) echo.life -= safeDt;
    this.playerEchoes = this.playerEchoes.filter((echo) => echo.life > 0).slice(-8);
    this.previousPlayerPosition = { x: this.player.x, y: this.player.y };
  }

  draw() {
    const ctx = this.ctx;
    this.uiRegions = [];
    this.renderFrame += 1;

    const shakeStrength = this.reducedMotion ? 0 : Math.max(0, this.shake || 0);
    const phase = this.elapsed * 71 + this.renderFrame * 0.41;
    const shakeX = Math.sin(phase) * shakeStrength * 0.34;
    const shakeY = Math.cos(phase * 1.37) * shakeStrength * 0.28;

    ctx.save();
    ctx.translate(shakeX, shakeY);
    this.drawArena();
    if (this.state !== 'menu') {
      this.drawBullet();
      this.drawEnemies();
      this.drawEnemyShots();
      this.drawPlayer();
      this.drawParticles();
      this.drawFloatingTexts();
      this.drawWorldLighting();
    }
    ctx.restore();

    if (this.state === 'menu') {
      this.drawMenu();
    } else {
      if (!this.touchMode && this.state === 'playing') this.drawTargetReticle();
      this.drawHud();
      if (this.touchMode && this.state === 'playing') this.drawTouchControls();
      if (this.banner && this.state === 'playing') this.drawBanner();
      if (this.state === 'upgrade') this.drawUpgradeSelection();
      if (this.state === 'paused') this.drawPause();
      if (this.state === 'gameover') this.drawGameOver();
    }

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255, 45, 82, ${this.flash * 0.16})`;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
  }

  drawArena() {
    const ctx = this.ctx;
    const stage = this.arenaStage?.id ?? 0;
    const accent = STAGE_ACCENTS[stage % STAGE_ACCENTS.length];
    const bounds = this.arenaStage.bounds;

    const backdrop = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    backdrop.addColorStop(0, '#081021');
    backdrop.addColorStop(0.56, '#040915');
    backdrop.addColorStop(1, '#02040b');
    ctx.fillStyle = backdrop;
    ctx.fillRect(-40, -40, WIDTH + 80, HEIGHT + 80);

    this.drawOuterDeck(accent);
    this.drawArenaDropShadow(bounds, accent);
    this.drawFloorBase(bounds, accent, stage);
    this.drawFloorTiles(bounds, accent, stage);
    this.drawCombatLanes(bounds, accent);
    this.drawCenterPlatform(bounds, accent, stage);
    this.drawFloorDetails(bounds, accent, stage);

    if (this.state !== 'menu') {
      this.drawLockedSpace2D(bounds);
      for (const obstacle of this.arenaStage.obstacles) this.drawObstacle(obstacle);
      this.drawArenaBorder();
    } else {
      this.drawMenuArenaPreview(bounds, accent);
    }

    const vignette = ctx.createRadialGradient(
      WIDTH / 2,
      HEIGHT / 2,
      220,
      WIDTH / 2,
      HEIGHT / 2,
      820,
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(0.7, 'rgba(0,0,0,0.12)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = vignette;
    ctx.fillRect(-20, -20, WIDTH + 40, HEIGHT + 40);
  }

  drawOuterDeck(accent) {
    const ctx = this.ctx;
    const parallaxX = (this.player.x - WIDTH / 2) * 0.018;
    const parallaxY = (this.player.y - HEIGHT / 2) * 0.018;

    ctx.save();
    ctx.translate(-parallaxX, -parallaxY);
    ctx.globalAlpha = 0.46;
    ctx.strokeStyle = 'rgba(74, 102, 151, 0.18)';
    ctx.lineWidth = 1;

    for (let y = -TILE_SIZE; y <= HEIGHT + TILE_SIZE; y += TILE_SIZE) {
      for (let x = -TILE_SIZE; x <= WIDTH + TILE_SIZE; x += TILE_SIZE) {
        const column = Math.floor(x / TILE_SIZE);
        const row = Math.floor(y / TILE_SIZE);
        const variant = floorTileVariant(column, row, 0);
        ctx.fillStyle = variant === 0 ? 'rgba(18, 29, 52, 0.26)' : 'rgba(7, 14, 29, 0.2)';
        ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      }
    }

    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = accent.secondary;
    ctx.lineWidth = 3;
    for (let index = -2; index <= 2; index += 1) {
      const offset = index * 148 + Math.sin(this.elapsed * 0.35 + index) * 4;
      ctx.beginPath();
      ctx.moveTo(WIDTH / 2 + offset, -30);
      ctx.lineTo(WIDTH / 2 + offset, HEIGHT + 30);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawArenaDropShadow(bounds, accent) {
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 36;
    ctx.fillStyle = 'rgba(0,0,0,0.68)';
    roundedRect(ctx, bounds.x + 9, bounds.y + 18, bounds.w, bounds.h, 18);
    ctx.fill();

    ctx.shadowColor = accent.primary;
    ctx.shadowBlur = 34;
    ctx.globalAlpha = 0.14;
    roundedRect(ctx, bounds.x, bounds.y, bounds.w, bounds.h, 18);
    ctx.strokeStyle = accent.primary;
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.restore();
  }

  drawFloorBase(bounds, accent, stage) {
    const ctx = this.ctx;
    ctx.save();
    roundedRect(ctx, bounds.x, bounds.y, bounds.w, bounds.h, 14);
    ctx.clip();

    // Floor value darkens as sectors get deeper, so later sectors read as
    // further underground rather than as the same room with a wider boundary.
    const depth = Math.min(1, Math.max(0, stage) / 7);
    const top = FLOOR_TOPS[Math.min(FLOOR_TOPS.length - 1, Math.max(0, stage))];
    const floor = ctx.createLinearGradient(bounds.x, bounds.y, bounds.x, bounds.y + bounds.h);
    floor.addColorStop(0, top);
    floor.addColorStop(0.52, depth > 0.5 ? '#091120' : '#0b1428');
    floor.addColorStop(1, depth > 0.5 ? '#050a15' : '#080f20');
    ctx.fillStyle = floor;
    ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);

    const glow = ctx.createRadialGradient(
      bounds.x + bounds.w / 2,
      bounds.y + bounds.h / 2,
      20,
      bounds.x + bounds.w / 2,
      bounds.y + bounds.h / 2,
      Math.max(bounds.w, bounds.h) * 0.65,
    );
    glow.addColorStop(0, `${accent.secondary}38`);
    glow.addColorStop(0.55, `${accent.primary}12`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
    ctx.restore();
  }

  drawFloorTiles(bounds, accent, stage) {
    const ctx = this.ctx;
    ctx.save();
    roundedRect(ctx, bounds.x, bounds.y, bounds.w, bounds.h, 14);
    ctx.clip();

    const startX = Math.floor(bounds.x / TILE_SIZE) * TILE_SIZE;
    const startY = Math.floor(bounds.y / TILE_SIZE) * TILE_SIZE;
    for (let y = startY; y < bounds.y + bounds.h + TILE_SIZE; y += TILE_SIZE) {
      for (let x = startX; x < bounds.x + bounds.w + TILE_SIZE; x += TILE_SIZE) {
        const column = Math.floor(x / TILE_SIZE);
        const row = Math.floor(y / TILE_SIZE);
        const variant = floorTileVariant(column, row, stage);
        const alpha = variant === 0 ? 0.19 : variant === 1 ? 0.11 : 0.07;
        ctx.fillStyle = variant === 3 ? `${accent.secondary}10` : `rgba(42, 60, 92, ${alpha})`;
        ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);

        ctx.strokeStyle = variant === 3 ? `${accent.primary}25` : 'rgba(115, 145, 194, 0.13)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);

        ctx.fillStyle = 'rgba(214, 237, 255, 0.08)';
        ctx.fillRect(x + 5, y + 5, TILE_SIZE - 10, 1);
      }
    }
    ctx.restore();
  }

  drawCombatLanes(bounds, accent) {
    const ctx = this.ctx;
    const centerX = bounds.x + bounds.w / 2;
    const centerY = bounds.y + bounds.h / 2;
    const laneWidth = 68;

    ctx.save();
    roundedRect(ctx, bounds.x, bounds.y, bounds.w, bounds.h, 14);
    ctx.clip();

    ctx.fillStyle = 'rgba(3, 8, 18, 0.3)';
    ctx.fillRect(bounds.x, centerY - laneWidth / 2, bounds.w, laneWidth);
    ctx.fillRect(centerX - laneWidth / 2, bounds.y, laneWidth, bounds.h);

    ctx.strokeStyle = `${accent.primary}30`;
    ctx.lineWidth = 2;
    ctx.setLineDash([18, 17]);
    const dashOffset = (this.elapsed * 18) % 35;
    ctx.lineDashOffset = -dashOffset;
    ctx.beginPath();
    ctx.moveTo(bounds.x, centerY);
    ctx.lineTo(bounds.x + bounds.w, centerY);
    ctx.moveTo(centerX, bounds.y);
    ctx.lineTo(centerX, bounds.y + bounds.h);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.globalAlpha = 0.3;
    ctx.fillStyle = accent.warm;
    const gateSize = 7;
    for (let offset = 35; offset < bounds.w / 2 - 70; offset += 72) {
      ctx.fillRect(centerX - offset - gateSize / 2, centerY - 2, gateSize, 4);
      ctx.fillRect(centerX + offset - gateSize / 2, centerY - 2, gateSize, 4);
    }
    for (let offset = 35; offset < bounds.h / 2 - 70; offset += 72) {
      ctx.fillRect(centerX - 2, centerY - offset - gateSize / 2, 4, gateSize);
      ctx.fillRect(centerX - 2, centerY + offset - gateSize / 2, 4, gateSize);
    }
    ctx.restore();
  }

  drawCenterPlatform(bounds, accent, stage) {
    const ctx = this.ctx;
    const centerX = bounds.x + bounds.w / 2;
    const centerY = bounds.y + bounds.h / 2;

    ctx.save();
    ctx.translate(centerX, centerY);

    ctx.fillStyle = 'rgba(3, 8, 18, 0.78)';
    ctx.strokeStyle = `${accent.secondary}88`;
    ctx.lineWidth = 3;
    polygon(ctx, 8, 82 + stage * 4, Math.PI / 8);
    ctx.fill();
    ctx.stroke();

    ctx.globalAlpha = 0.34;
    ctx.strokeStyle = accent.warm;
    ctx.lineWidth = 2;
    polygon(ctx, 6, 31, Math.PI / 6);
    ctx.stroke();
    ctx.restore();
  }

  drawFloorDetails(bounds, accent, stage) {
    const ctx = this.ctx;
    const centerX = bounds.x + bounds.w / 2;
    const centerY = bounds.y + bounds.h / 2;
    const corners = [
      { x: bounds.x + 46, y: bounds.y + 46, rotation: 0 },
      { x: bounds.x + bounds.w - 46, y: bounds.y + 46, rotation: Math.PI / 2 },
      { x: bounds.x + bounds.w - 46, y: bounds.y + bounds.h - 46, rotation: Math.PI },
      { x: bounds.x + 46, y: bounds.y + bounds.h - 46, rotation: -Math.PI / 2 },
    ];

    ctx.save();
    for (const corner of corners) {
      ctx.save();
      ctx.translate(corner.x, corner.y);
      ctx.rotate(corner.rotation);
      ctx.fillStyle = 'rgba(6, 13, 27, 0.82)';
      ctx.strokeStyle = `${accent.primary}68`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-26, -13);
      ctx.lineTo(18, -13);
      ctx.lineTo(26, -5);
      ctx.lineTo(26, 13);
      ctx.lineTo(-26, 13);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = accent.warm;
      ctx.globalAlpha = 0.45 + Math.sin(this.elapsed * 3 + corner.x) * 0.1;
      ctx.fillRect(-18, -2, 27, 4);
      ctx.restore();
    }

    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = accent.secondary;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX - Math.min(220, bounds.w * 0.22), centerY);
    ctx.lineTo(centerX - 88, centerY);
    ctx.moveTo(centerX + 88, centerY);
    ctx.lineTo(centerX + Math.min(220, bounds.w * 0.22), centerY);
    ctx.moveTo(centerX, centerY - Math.min(160, bounds.h * 0.2));
    ctx.lineTo(centerX, centerY - 88);
    ctx.moveTo(centerX, centerY + 88);
    ctx.lineTo(centerX, centerY + Math.min(160, bounds.h * 0.2));
    ctx.stroke();
    ctx.restore();
  }

  drawLockedSpace2D(bounds) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 2, 8, 0.72)';
    ctx.fillRect(0, 0, WIDTH, bounds.y);
    ctx.fillRect(0, bounds.y + bounds.h, WIDTH, HEIGHT - bounds.y - bounds.h);
    ctx.fillRect(0, bounds.y, bounds.x, bounds.h);
    ctx.fillRect(bounds.x + bounds.w, bounds.y, WIDTH - bounds.x - bounds.w, bounds.h);
    ctx.restore();
  }

  drawMenuArenaPreview(bounds, accent) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.38;
    ctx.strokeStyle = accent.primary;
    ctx.lineWidth = 2;
    ctx.setLineDash([18, 16]);
    roundedRect(ctx, bounds.x, bounds.y, bounds.w, bounds.h, 14);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  drawObstacle(obstacle) {
    const ctx = this.ctx;
    const depth = 11;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 16;
    roundedRect(ctx, obstacle.x + 8, obstacle.y + 12, obstacle.w, obstacle.h, 10);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#07101f';
    ctx.beginPath();
    ctx.moveTo(obstacle.x + obstacle.w, obstacle.y + 7);
    ctx.lineTo(obstacle.x + obstacle.w + depth, obstacle.y + depth + 4);
    ctx.lineTo(obstacle.x + obstacle.w + depth, obstacle.y + obstacle.h + depth);
    ctx.lineTo(obstacle.x + obstacle.w, obstacle.y + obstacle.h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#090f1d';
    ctx.beginPath();
    ctx.moveTo(obstacle.x + 7, obstacle.y + obstacle.h);
    ctx.lineTo(obstacle.x + obstacle.w, obstacle.y + obstacle.h);
    ctx.lineTo(obstacle.x + obstacle.w + depth, obstacle.y + obstacle.h + depth);
    ctx.lineTo(obstacle.x + depth, obstacle.y + obstacle.h + depth);
    ctx.closePath();
    ctx.fill();

    const top = ctx.createLinearGradient(
      obstacle.x,
      obstacle.y,
      obstacle.x + obstacle.w,
      obstacle.y + obstacle.h,
    );
    top.addColorStop(0, '#243552');
    top.addColorStop(0.55, '#14243e');
    top.addColorStop(1, '#0c172b');
    ctx.fillStyle = top;
    ctx.strokeStyle = '#6381b8';
    ctx.lineWidth = 2.5;
    roundedRect(ctx, obstacle.x, obstacle.y, obstacle.w, obstacle.h, 10);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(128, 230, 255, 0.34)';
    ctx.lineWidth = 1.5;
    roundedRect(ctx, obstacle.x + 8, obstacle.y + 8, obstacle.w - 16, obstacle.h - 16, 6);
    ctx.stroke();

    ctx.globalAlpha = 0.36;
    ctx.fillStyle = '#ffd66b';
    for (let x = obstacle.x + 12; x < obstacle.x + obstacle.w - 5; x += 22) {
      ctx.save();
      ctx.translate(x, obstacle.y + obstacle.h - 9);
      ctx.rotate(-0.6);
      ctx.fillRect(-7, -2, 14, 4);
      ctx.restore();
    }
    ctx.restore();
  }

  drawArenaBorder() {
    const ctx = this.ctx;
    const bounds = this.arenaStage.bounds;
    const stage = this.arenaStage?.id ?? 0;
    const accent = STAGE_ACCENTS[stage % STAGE_ACCENTS.length];
    const pulse = 0.62 + Math.sin(this.elapsed * 2.7) * 0.11 + this.arenaExpansionPulse * 0.24;

    ctx.save();
    ctx.fillStyle = 'rgba(3, 7, 15, 0.94)';
    ctx.strokeStyle = '#1b2c49';
    ctx.lineWidth = 14;
    roundedRect(ctx, bounds.x, bounds.y, bounds.w, bounds.h, 14);
    ctx.stroke();

    ctx.strokeStyle = `${accent.primary}${Math.round(clamp(pulse, 0, 1) * 255).toString(16).padStart(2, '0')}`;
    ctx.shadowColor = accent.primary;
    ctx.shadowBlur = 20 + this.arenaExpansionPulse * 24;
    ctx.lineWidth = 4;
    roundedRect(ctx, bounds.x, bounds.y, bounds.w, bounds.h, 14);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(226, 244, 255, 0.24)';
    ctx.lineWidth = 1;
    roundedRect(ctx, bounds.x + 7, bounds.y + 7, bounds.w - 14, bounds.h - 14, 10);
    ctx.stroke();

    const lightGap = 72;
    ctx.fillStyle = accent.warm;
    ctx.globalAlpha = 0.52;
    for (let x = bounds.x + 38; x < bounds.x + bounds.w - 28; x += lightGap) {
      ctx.fillRect(x, bounds.y - 3, 16, 5);
      ctx.fillRect(x, bounds.y + bounds.h - 2, 16, 5);
    }
    for (let y = bounds.y + 38; y < bounds.y + bounds.h - 28; y += lightGap) {
      ctx.fillRect(bounds.x - 3, y, 5, 16);
      ctx.fillRect(bounds.x + bounds.w - 2, y, 5, 16);
    }
    ctx.restore();
  }

  drawEnemies() {
    super.drawEnemies();
  }

  drawEnemyShots() {
    super.drawEnemyShots();
  }

  drawPlayer() {
    const ctx = this.ctx;
    ctx.save();
    for (const echo of this.playerEchoes) {
      const alpha = clamp(echo.life / echo.maxLife, 0, 1) * 0.1;
      ctx.save();
      ctx.translate(echo.x, echo.y);
      ctx.rotate(echo.angle);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = UI_COLORS.player;
      ctx.beginPath();
      ctx.moveTo(21, 0);
      ctx.lineTo(-13, -11);
      ctx.lineTo(-19, 0);
      ctx.lineTo(-13, 11);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();

    const motionScale = clamp(this.visualMotion, 0, 1);
    ctx.save();
    ctx.translate(this.player.x, this.player.y);
    ctx.rotate(this.visualLean * 0.025);
    ctx.scale(1 + motionScale * 0.035, 1 - motionScale * 0.022);
    ctx.translate(-this.player.x, -this.player.y);
    super.drawPlayer();
    ctx.restore();

    if (this.state === 'playing' && motionScale > 0.08) {
      ctx.save();
      ctx.globalAlpha = 0.08 + motionScale * 0.12;
      ctx.strokeStyle = UI_COLORS.player;
      ctx.lineWidth = 1.4;
      const backX = this.player.x - this.visualDirection.x * (24 + motionScale * 16);
      const backY = this.player.y - this.visualDirection.y * (24 + motionScale * 16);
      ctx.beginPath();
      ctx.moveTo(this.player.x - this.visualDirection.x * 16, this.player.y - this.visualDirection.y * 16);
      ctx.lineTo(backX, backY);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawBullet() {
    const ctx = this.ctx;
    if (!this.bullet.held) {
      const speed = Math.hypot(this.bullet.vx || 0, this.bullet.vy || 0);
      const direction = normalize(this.bullet.vx || 0, this.bullet.vy || 0);
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
      ctx.beginPath();
      ctx.ellipse(this.bullet.x + 4, this.bullet.y + 8, 11, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      const trailLength = clamp(speed / 16, 22, 62);
      const trail = ctx.createLinearGradient(
        this.bullet.x,
        this.bullet.y,
        this.bullet.x - direction.x * trailLength,
        this.bullet.y - direction.y * trailLength,
      );
      trail.addColorStop(0, 'rgba(255, 240, 145, 0.58)');
      trail.addColorStop(1, 'rgba(255, 230, 109, 0)');
      ctx.strokeStyle = trail;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(this.bullet.x, this.bullet.y);
      ctx.lineTo(this.bullet.x - direction.x * trailLength, this.bullet.y - direction.y * trailLength);
      ctx.stroke();
      ctx.restore();
    }
    super.drawBullet();
  }

  drawWorldLighting() {
    if (this.state === 'menu') return;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const playerGlow = ctx.createRadialGradient(
      this.player.x,
      this.player.y,
      8,
      this.player.x,
      this.player.y,
      130,
    );
    playerGlow.addColorStop(0, 'rgba(98, 243, 255, 0.12)');
    playerGlow.addColorStop(1, 'rgba(98, 243, 255, 0)');
    ctx.fillStyle = playerGlow;
    ctx.fillRect(this.player.x - 140, this.player.y - 140, 280, 280);

    if (!this.bullet.held) {
      const bulletGlow = ctx.createRadialGradient(
        this.bullet.x,
        this.bullet.y,
        3,
        this.bullet.x,
        this.bullet.y,
        76,
      );
      bulletGlow.addColorStop(0, 'rgba(255, 230, 109, 0.22)');
      bulletGlow.addColorStop(1, 'rgba(255, 230, 109, 0)');
      ctx.fillStyle = bulletGlow;
      ctx.fillRect(this.bullet.x - 82, this.bullet.y - 82, 164, 164);
    }
    ctx.restore();
  }

  drawTargetReticle() {
    const ctx = this.ctx;
    const x = clamp(this.pointer.x, 10, WIDTH - 10);
    const y = clamp(this.pointer.y, 10, HEIGHT - 10);
    const pulse = this.reducedMotion ? 0 : Math.sin(this.elapsed * 7) * 1.5;
    const radius = 9 + pulse;

    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = this.bullet.held ? 'rgba(255, 238, 132, 0.9)' : 'rgba(156, 194, 224, 0.62)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    const gap = 5;
    const length = 7;
    ctx.beginPath();
    ctx.moveTo(-gap - length, 0);
    ctx.lineTo(-gap, 0);
    ctx.moveTo(gap, 0);
    ctx.lineTo(gap + length, 0);
    ctx.moveTo(0, -gap - length);
    ctx.lineTo(0, -gap);
    ctx.moveTo(0, gap);
    ctx.lineTo(0, gap + length);
    ctx.stroke();

    ctx.fillStyle = this.bullet.held ? UI_COLORS.bullet : UI_COLORS.muted;
    ctx.beginPath();
    ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  getSnapshot() {
    return {
      ...super.getSnapshot(),
      releaseVersion: RELEASE_VERSION,
      world2DRuntimeVersion: WORLD_2D_RUNTIME_VERSION,
      true2DArenaActive: true,
      world2DStyle: 'layered-top-down-2d',
      layeredFloorTiles: true,
      environmentalDepth: true,
      stableHudDuringShake: true,
      deterministicCameraShake: true,
      visualMotionSmoothing: true,
      gameplayGeometryChanged: false,
    };
  }
}
