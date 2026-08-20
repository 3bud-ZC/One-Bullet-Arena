import { clamp } from '../arena.js';
import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from '../game-data.js';
import { RELEASE_VERSION } from '../release.js';
import { roundedRect } from '../ui-renderer.js';
import { OneBulletWorld2DRuntime } from './world-2d-runtime.js';

export const VISUAL_OVERHAUL_RUNTIME_VERSION = '3.3.0-visual-overhaul';
export const ARENA_ART_POLISH_VERSION = '3.15.0-arena-polish';

const VISUAL_PALETTES = Object.freeze([
  Object.freeze({ primary: '#65f7ff', secondary: '#467cff', warm: '#ffd86b', danger: '#ff587d', floor: '#16304c' }),
  Object.freeze({ primary: '#6dffd1', secondary: '#3b9cff', warm: '#ffce73', danger: '#ff647f', floor: '#183f42' }),
  Object.freeze({ primary: '#b094ff', secondary: '#527cff', warm: '#ffbc69', danger: '#ff638f', floor: '#2a244f' }),
]);

export function visualOverhaulTokens() {
  return Object.freeze({
    version: VISUAL_OVERHAUL_RUNTIME_VERSION,
    style: 'cinematic-industrial-2d',
    hudStyle: 'combat-glass',
    environmentPasses: 4,
    gameplayGeometryChanged: false,
    collisionGeometryChanged: false,
    renderOnly: true,
    arenaArtPolishVersion: ARENA_ART_POLISH_VERSION,
    sectorAtmosphere: true,
    obstacleDressing: true,
    animatedMapMaterials: true,
    mapGeometryChanged: false,
    mapCollisionGeometryChanged: false,
  });
}

export function ambientNodeVariant(index, stage = 0) {
  const safeIndex = Math.abs(Math.trunc(Number(index) || 0));
  const safeStage = Math.abs(Math.trunc(Number(stage) || 0));
  return (safeIndex * 11 + safeStage * 7) % 5;
}

export function obstacleMaterialVariant(obstacle, stage = 0) {
  const safeStage = Math.abs(Math.trunc(Number(stage) || 0));
  const x = Math.round(Number(obstacle?.x) || 0);
  const y = Math.round(Number(obstacle?.y) || 0);
  const w = Math.round(Number(obstacle?.w) || 0);
  const h = Math.round(Number(obstacle?.h) || 0);
  return Math.abs(x * 3 + y * 5 + w * 7 + h * 11 + safeStage * 13) % 6;
}

function alphaHex(alpha) {
  return Math.round(clamp(alpha, 0, 1) * 255).toString(16).padStart(2, '0');
}

export class OneBulletVisualOverhaulRuntime extends OneBulletWorld2DRuntime {
  constructor(canvas, liveRegion = null) {
    super(canvas, liveRegion);
    this.visualOverhaulRuntimeVersion = VISUAL_OVERHAUL_RUNTIME_VERSION;
    this.arenaArtPolishVersion = ARENA_ART_POLISH_VERSION;
    this.visualPulse = 0;
  }

  update(dt) {
    super.update(dt);
    const safeDt = Math.max(0, Number(dt) || 0);
    this.visualPulse = (this.visualPulse + safeDt) % 1000;
  }

  palette() {
    const stage = this.arenaStage?.id ?? 0;
    return VISUAL_PALETTES[stage % VISUAL_PALETTES.length];
  }

  drawArena() {
    super.drawArena();
    this.drawCinematicArenaAtmosphere();
    this.drawEnvironmentalReadabilityPass();
  }

  drawOuterDeck(accent) {
    super.drawOuterDeck(accent);
    const ctx = this.ctx;
    const palette = this.palette();
    const stage = this.arenaStage?.id ?? 0;
    const drift = this.reducedMotion ? 0 : this.elapsed * 4.5;

    ctx.save();
    ctx.globalAlpha = 0.42;
    for (let index = 0; index < 18; index += 1) {
      const variant = ambientNodeVariant(index, stage);
      const x = ((index * 179 + stage * 61 + drift * (variant % 2 ? 0.8 : -0.55)) % (WIDTH + 160)) - 80;
      const y = 32 + ((index * 97 + stage * 43) % (HEIGHT - 64));
      const radius = 1.1 + variant * 0.42;
      ctx.fillStyle = variant === 4 ? palette.warm : palette.primary;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = palette.secondary;
    ctx.lineWidth = 1;
    for (let index = 0; index < 5; index += 1) {
      const y = 92 + index * 132;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(140, y - 32);
      ctx.moveTo(WIDTH, y + 12);
      ctx.lineTo(WIDTH - 150, y - 24);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawFloorDetails(bounds, accent, stage) {
    super.drawFloorDetails(bounds, accent, stage);
    const ctx = this.ctx;
    const palette = this.palette();
    const pulse = 0.48 + Math.sin(this.elapsed * 2.4) * 0.12;

    ctx.save();
    roundedRect(ctx, bounds.x, bounds.y, bounds.w, bounds.h, 14);
    ctx.clip();

    ctx.strokeStyle = `${palette.primary}${alphaHex(0.13)}`;
    ctx.lineWidth = 1;
    const inset = 24;
    roundedRect(ctx, bounds.x + inset, bounds.y + inset, bounds.w - inset * 2, bounds.h - inset * 2, 10);
    ctx.stroke();

    const cornerSize = 68;
    ctx.strokeStyle = `${palette.warm}${alphaHex(0.2 + pulse * 0.12)}`;
    ctx.lineWidth = 2;
    for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const cx = sx > 0 ? bounds.x + 34 : bounds.x + bounds.w - 34;
      const cy = sy > 0 ? bounds.y + 34 : bounds.y + bounds.h - 34;
      ctx.beginPath();
      ctx.moveTo(cx, cy + sy * cornerSize * 0.2);
      ctx.lineTo(cx, cy + sy * cornerSize);
      ctx.lineTo(cx + sx * cornerSize, cy + sy * cornerSize);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.22;
    const scanX = bounds.x + ((this.elapsed * 82) % Math.max(1, bounds.w));
    const scan = ctx.createLinearGradient(scanX - 70, 0, scanX + 70, 0);
    scan.addColorStop(0, 'rgba(0,0,0,0)');
    scan.addColorStop(0.5, palette.primary);
    scan.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = scan;
    ctx.fillRect(scanX - 70, bounds.y + 6, 140, bounds.h - 12);

    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.14;
    ctx.strokeStyle = palette.warm;
    ctx.lineWidth = 1.15;
    ctx.lineCap = 'round';
    const strandCount = 5 + Math.min(4, stage);
    for (let index = 0; index < strandCount; index += 1) {
      const baseY = bounds.y + 58 + ((index * 91 + stage * 37) % Math.max(1, bounds.h - 116));
      const sway = this.reducedMotion ? 0 : Math.sin(this.elapsed * 0.9 + index) * 8;
      ctx.beginPath();
      ctx.moveTo(bounds.x + 30, baseY);
      ctx.bezierCurveTo(
        bounds.x + bounds.w * 0.28,
        baseY - 38 + sway,
        bounds.x + bounds.w * 0.64,
        baseY + 44 - sway,
        bounds.x + bounds.w - 34,
        baseY + ((index % 2) * 36 - 18),
      );
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';
    for (let index = 0; index < 9; index += 1) {
      const x = bounds.x + 70 + ((index * 211 + stage * 89) % Math.max(1, bounds.w - 140));
      const y = bounds.y + 62 + ((index * 127 + stage * 53) % Math.max(1, bounds.h - 124));
      const rot = ((index * 37 + stage * 11) % 90) * Math.PI / 180;
      const scale = 0.72 + (index % 4) * 0.18;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.scale(scale, scale * (0.72 + (index % 2) * 0.24));
      ctx.globalAlpha = 0.08 + (index % 3) * 0.025;
      ctx.fillStyle = index % 2 ? 'rgba(255, 188, 105, 0.24)' : 'rgba(1, 6, 16, 0.72)';
      ctx.beginPath();
      ctx.moveTo(-58, -7);
      ctx.bezierCurveTo(-36, -25, -4, -19, 22, -14);
      ctx.bezierCurveTo(61, -7, 73, 16, 31, 21);
      ctx.bezierCurveTo(-4, 28, -48, 18, -58, -7);
      ctx.fill();
      ctx.restore();
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = `${palette.primary}${alphaHex(0.42)}`;
    for (let index = 0; index < 18; index += 1) {
      const seedX = bounds.x + 30 + ((index * 157 + stage * 43) % Math.max(1, bounds.w - 60));
      const seedY = bounds.y + 36 + ((index * 83 + stage * 79) % Math.max(1, bounds.h - 72));
      const twinkle = this.reducedMotion ? 0.5 : 0.5 + Math.sin(this.elapsed * 1.7 + index * 1.9) * 0.5;
      ctx.globalAlpha = 0.08 + twinkle * 0.13;
      ctx.beginPath();
      ctx.ellipse(seedX, seedY, 1.4 + (index % 3) * 0.45, 0.8 + (index % 2) * 0.35, index, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawArenaBorder() {
    super.drawArenaBorder();
    const ctx = this.ctx;
    const bounds = this.arenaStage.bounds;
    const palette = this.palette();
    const stage = this.arenaStage?.id ?? 0;
    const corner = 26;

    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = `${palette.primary}${alphaHex(0.72)}`;
    ctx.shadowColor = palette.primary;
    ctx.shadowBlur = 0;
    const points = [
      [bounds.x, bounds.y, 1, 1],
      [bounds.x + bounds.w, bounds.y, -1, 1],
      [bounds.x, bounds.y + bounds.h, 1, -1],
      [bounds.x + bounds.w, bounds.y + bounds.h, -1, -1],
    ];
    for (const [x, y, sx, sy] of points) {
      ctx.beginPath();
      ctx.moveTo(x + sx * 5, y + sy * corner);
      ctx.lineTo(x + sx * 5, y + sy * 5);
      ctx.lineTo(x + sx * corner, y + sy * 5);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = palette.warm;
    const bars = 3 + stage * 2;
    for (let index = 0; index < bars; index += 1) {
      ctx.fillRect(bounds.x + 22 + index * 15, bounds.y + 11, 9, 2);
    }
    ctx.restore();
  }

  drawObstacle(obstacle) {
    super.drawObstacle(obstacle);
    const ctx = this.ctx;
    const palette = this.palette();
    const stage = this.arenaStage?.id ?? 0;
    const variant = obstacleMaterialVariant(obstacle, stage);
    const pulse = this.reducedMotion ? 0.5 : 0.5 + Math.sin(this.elapsed * 3.4 + variant) * 0.5;

    ctx.save();
    ctx.fillStyle = 'rgba(230, 248, 255, 0.34)';
    for (const [x, y] of [
      [obstacle.x + 11, obstacle.y + 11],
      [obstacle.x + obstacle.w - 11, obstacle.y + 11],
      [obstacle.x + 11, obstacle.y + obstacle.h - 11],
      [obstacle.x + obstacle.w - 11, obstacle.y + obstacle.h - 11],
    ]) {
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = palette.primary;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(obstacle.x + 16, obstacle.y + obstacle.h / 2);
    ctx.lineTo(obstacle.x + obstacle.w - 16, obstacle.y + obstacle.h / 2);
    ctx.stroke();

    ctx.globalAlpha = 0.32;
    ctx.strokeStyle = variant % 2 ? palette.warm : palette.secondary;
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    const inset = 17;
    const ventCount = Math.max(2, Math.floor(Math.min(obstacle.w, obstacle.h) / 22));
    for (let index = 0; index < ventCount; index += 1) {
      const t = (index + 1) / (ventCount + 1);
      const x = obstacle.x + inset + (obstacle.w - inset * 2) * t;
      ctx.beginPath();
      ctx.moveTo(x - 7, obstacle.y + 15);
      ctx.quadraticCurveTo(x, obstacle.y + 11 + (variant % 3) * 1.5, x + 7, obstacle.y + 15);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.16 + pulse * 0.16;
    const glow = ctx.createLinearGradient(obstacle.x, obstacle.y, obstacle.x + obstacle.w, obstacle.y + obstacle.h);
    glow.addColorStop(0, `${palette.primary}${alphaHex(0.0)}`);
    glow.addColorStop(0.48, `${palette.primary}${alphaHex(0.4)}`);
    glow.addColorStop(1, `${palette.warm}${alphaHex(0.12)}`);
    ctx.strokeStyle = glow;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(obstacle.x + 18, obstacle.y + obstacle.h - 18);
    ctx.bezierCurveTo(
      obstacle.x + obstacle.w * 0.32,
      obstacle.y + obstacle.h - 32,
      obstacle.x + obstacle.w * 0.62,
      obstacle.y + 24,
      obstacle.x + obstacle.w - 18,
      obstacle.y + 17,
    );
    ctx.stroke();

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = 'rgba(5, 10, 20, 0.72)';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    for (let index = 0; index < 3; index += 1) {
      const sideY = obstacle.y + 18 + ((variant * 19 + index * 29) % Math.max(1, obstacle.h - 36));
      const startX = obstacle.x + 20 + index * 12;
      ctx.beginPath();
      ctx.moveTo(startX, sideY);
      ctx.bezierCurveTo(
        obstacle.x + obstacle.w * 0.36,
        sideY + (index % 2 ? 18 : -14),
        obstacle.x + obstacle.w * 0.68,
        sideY + (index % 2 ? -16 : 20),
        obstacle.x + obstacle.w - 22,
        sideY + (index - 1) * 8,
      );
      ctx.stroke();
      ctx.globalAlpha = 0.2;
      ctx.strokeStyle = variant % 2 ? palette.warm : palette.primary;
      ctx.lineWidth = 1.35;
      ctx.stroke();
      ctx.globalAlpha = 0.42;
      ctx.strokeStyle = 'rgba(5, 10, 20, 0.72)';
      ctx.lineWidth = 4.5;
    }

    ctx.globalAlpha = 0.48;
    ctx.fillStyle = variant % 2 ? palette.warm : palette.primary;
    const portY = obstacle.y + obstacle.h - 17;
    for (let index = 0; index < 4; index += 1) {
      const x = obstacle.x + obstacle.w - 27 - index * 18;
      ctx.beginPath();
      ctx.ellipse(x, portY, 3.4, 1.8, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawCinematicArenaAtmosphere() {
    if (this.state === 'menu') return;
    const ctx = this.ctx;
    const palette = this.palette();
    const bounds = this.arenaStage.bounds;
    const stage = this.arenaStage?.id ?? 0;
    const drift = this.reducedMotion ? 0 : this.elapsed;

    ctx.save();
    roundedRect(ctx, bounds.x, bounds.y, bounds.w, bounds.h, 14);
    ctx.clip();

    ctx.globalCompositeOperation = 'screen';
    for (let index = 0; index < 3; index += 1) {
      const offset = ((stage * 71 + index * 193 + drift * (18 + index * 5)) % (bounds.w + 260)) - 130;
      const beam = ctx.createLinearGradient(bounds.x + offset - 120, bounds.y, bounds.x + offset + 140, bounds.y + bounds.h);
      beam.addColorStop(0, 'rgba(0,0,0,0)');
      beam.addColorStop(0.48, `${index === 1 ? palette.warm : palette.primary}${alphaHex(0.12 + index * 0.025)}`);
      beam.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = beam;
      ctx.globalAlpha = 0.58;
      ctx.beginPath();
      ctx.moveTo(bounds.x + offset - 110, bounds.y);
      ctx.lineTo(bounds.x + offset + 40, bounds.y);
      ctx.lineTo(bounds.x + offset + 210, bounds.y + bounds.h);
      ctx.lineTo(bounds.x + offset + 52, bounds.y + bounds.h);
      ctx.closePath();
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = `${palette.floor}${alphaHex(0.78)}`;
    ctx.lineWidth = 7;
    for (let index = 0; index < 4; index += 1) {
      const y = bounds.y + 74 + ((index * 137 + stage * 47) % Math.max(1, bounds.h - 148));
      const depth = 34 + (index % 3) * 18;
      ctx.beginPath();
      ctx.moveTo(bounds.x + 18, y);
      ctx.bezierCurveTo(bounds.x + depth, y - 26, bounds.x + bounds.w - depth, y + 20, bounds.x + bounds.w - 18, y - 10);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = palette.primary;
    for (let index = 0; index < 24; index += 1) {
      const variant = ambientNodeVariant(index, stage);
      const x = bounds.x + 24 + ((index * 149 + stage * 61 + drift * (variant + 1) * 5) % Math.max(1, bounds.w - 48));
      const y = bounds.y + 24 + ((index * 89 + stage * 73) % Math.max(1, bounds.h - 48));
      ctx.globalAlpha = 0.035 + variant * 0.011;
      ctx.beginPath();
      ctx.ellipse(x, y, 2.2 + variant * 0.35, 1.1 + variant * 0.2, drift + index, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawEnvironmentalReadabilityPass() {
    if (this.state === 'menu') return;
    const ctx = this.ctx;
    const palette = this.palette();
    const bounds = this.arenaStage.bounds;

    ctx.save();
    roundedRect(ctx, bounds.x, bounds.y, bounds.w, bounds.h, 14);
    ctx.clip();

    const edgeShade = ctx.createLinearGradient(bounds.x, 0, bounds.x + 120, 0);
    edgeShade.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
    edgeShade.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = edgeShade;
    ctx.fillRect(bounds.x, bounds.y, 130, bounds.h);

    const rightShade = ctx.createLinearGradient(bounds.x + bounds.w, 0, bounds.x + bounds.w - 120, 0);
    rightShade.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
    rightShade.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = rightShade;
    ctx.fillRect(bounds.x + bounds.w - 130, bounds.y, 130, bounds.h);

    ctx.globalAlpha = 0.06;
    ctx.fillStyle = palette.primary;
    for (let y = bounds.y + 8; y < bounds.y + bounds.h; y += 6) {
      ctx.fillRect(bounds.x + 8, y, bounds.w - 16, 1);
    }
    ctx.restore();
  }

  drawEnemies() {
    super.drawEnemies();
  }

  drawEnemyShots() {
    super.drawEnemyShots();
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const shot of this.enemyShots) {
      const glow = ctx.createRadialGradient(shot.x, shot.y, 1, shot.x, shot.y, Math.max(16, shot.radius * 4));
      glow.addColorStop(0, 'rgba(255, 82, 116, 0.3)');
      glow.addColorStop(1, 'rgba(255, 82, 116, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(shot.x - 28, shot.y - 28, 56, 56);
    }
    ctx.restore();
  }

  drawPlayer() {
    super.drawPlayer();
    const ctx = this.ctx;
    const palette = this.palette();
    const dashPulse = clamp(Number(this.dashVisual) || 0, 0, 1);

    if (dashPulse > 0.01) {
      ctx.save();
      ctx.globalAlpha = 0.12 + dashPulse * 0.24;
      ctx.strokeStyle = palette.primary;
      ctx.lineWidth = 1.5 + dashPulse * 0.8;
      ctx.lineCap = 'round';
      const direction = this.player.dashDirection || { x: 1, y: 0 };
      const normal = { x: -direction.y, y: direction.x };
      const tail = 30 + dashPulse * 18;
      ctx.beginPath();
      ctx.moveTo(this.player.x - direction.x * 15 + normal.x * 9, this.player.y - direction.y * 15 + normal.y * 9);
      ctx.lineTo(this.player.x - direction.x * tail + normal.x * 13, this.player.y - direction.y * tail + normal.y * 13);
      ctx.moveTo(this.player.x - direction.x * 15 - normal.x * 9, this.player.y - direction.y * 15 - normal.y * 9);
      ctx.lineTo(this.player.x - direction.x * tail - normal.x * 13, this.player.y - direction.y * tail - normal.y * 13);
      ctx.stroke();
      ctx.restore();
    }

  }

  drawBullet() {
    const ctx = this.ctx;
    const palette = this.palette();
    if (!this.bullet.held && this.bullet.recalling) {
      ctx.save();
      const gradient = ctx.createLinearGradient(this.bullet.x, this.bullet.y, this.player.x, this.player.y);
      gradient.addColorStop(0, `${palette.warm}${alphaHex(0.54)}`);
      gradient.addColorStop(1, `${palette.primary}${alphaHex(0.15)}`);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 8]);
      ctx.lineDashOffset = this.reducedMotion ? 0 : -this.elapsed * 30;
      ctx.beginPath();
      ctx.moveTo(this.bullet.x, this.bullet.y);
      ctx.lineTo(this.player.x, this.player.y);
      ctx.stroke();
      ctx.restore();
    }

    super.drawBullet();

    if (!this.bullet.held) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = palette.warm;
      ctx.beginPath();
      ctx.arc(this.bullet.x, this.bullet.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawWorldLighting() {
    super.drawWorldLighting();
    if (this.state === 'menu') return;
    const ctx = this.ctx;
    const palette = this.palette();
    const bounds = this.arenaStage.bounds;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.12;
    const beam = ctx.createLinearGradient(bounds.x, bounds.y, bounds.x + bounds.w, bounds.y + bounds.h);
    beam.addColorStop(0, 'rgba(0,0,0,0)');
    beam.addColorStop(0.48, `${palette.primary}${alphaHex(0.22)}`);
    beam.addColorStop(0.52, `${palette.secondary}${alphaHex(0.14)}`);
    beam.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = beam;
    ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
    ctx.restore();
  }

  drawTargetReticle() {
    super.drawTargetReticle();
    const ctx = this.ctx;
    const palette = this.palette();
    const x = clamp(this.pointer.x, 18, WIDTH - 18);
    const y = clamp(this.pointer.y, 18, HEIGHT - 18);
    const ready = this.bullet.held;
    const radius = ready ? 17 : 14;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.reducedMotion ? 0 : this.elapsed * (ready ? 0.7 : -0.35));
    ctx.globalAlpha = ready ? 0.55 : 0.3;
    ctx.strokeStyle = ready ? palette.warm : palette.primary;
    ctx.lineWidth = 1;
    for (let quarter = 0; quarter < 4; quarter += 1) {
      const angle = quarter * Math.PI / 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius, angle + 0.12, angle + 0.54);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawMenu() {
    const ctx = this.ctx;
    const palette = this.palette();
    const pulse = this.reducedMotion ? 0 : Math.sin(this.elapsed * 2.2) * 0.03;

    ctx.save();
    const panelGradient = ctx.createLinearGradient(250, 90, 1030, 650);
    panelGradient.addColorStop(0, 'rgba(8, 17, 36, 0.88)');
    panelGradient.addColorStop(0.56, 'rgba(5, 10, 24, 0.8)');
    panelGradient.addColorStop(1, 'rgba(3, 7, 18, 0.9)');
    ctx.fillStyle = panelGradient;
    ctx.strokeStyle = `${palette.primary}${alphaHex(0.26)}`;
    ctx.lineWidth = 1.5;
    roundedRect(ctx, 248, 84, 784, 574, 28);
    ctx.fill();
    ctx.stroke();

    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = palette.primary;
    ctx.lineWidth = 2;
    const bracket = 52;
    for (const [x, y, sx, sy] of [[274, 110, 1, 1], [1006, 110, -1, 1], [274, 632, 1, -1], [1006, 632, -1, -1]]) {
      ctx.beginPath();
      ctx.moveTo(x, y + sy * bracket);
      ctx.lineTo(x, y);
      ctx.lineTo(x + sx * bracket, y);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.62 + pulse;
    ctx.fillStyle = palette.warm;
    ctx.fillRect(WIDTH / 2 - 34, 108, 68, 2);
    ctx.restore();

    super.drawMenu();

    ctx.save();
    ctx.font = '700 12px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(176, 220, 255, 0.76)';
    ctx.fillText('SINGLE ROUND // ZERO WASTE', WIDTH / 2, 116);
    ctx.restore();
  }

  drawHud() {
    const ctx = this.ctx;
    const palette = this.palette();

    ctx.save();
    ctx.fillStyle = 'rgba(3, 8, 20, 0.36)';
    ctx.strokeStyle = `${palette.primary}${alphaHex(0.12)}`;
    ctx.lineWidth = 1;
    roundedRect(ctx, 12, 10, WIDTH - 24, 96, 16);
    ctx.fill();
    ctx.stroke();

    ctx.globalAlpha = 0.32;
    ctx.fillStyle = palette.primary;
    ctx.fillRect(28, 104, WIDTH - 56, 1);
    ctx.restore();

    super.drawHud();

    ctx.save();
    const held = this.bullet.held;
    const status = held ? 'ROUND READY' : this.bullet.recalling ? 'RECALLING' : 'ROUND ACTIVE';
    const statusColor = held ? palette.warm : palette.primary;
    ctx.font = '800 10px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = statusColor;
    ctx.globalAlpha = 0.84;
    ctx.fillText(status, WIDTH / 2, 92);
    ctx.restore();
  }

  drawUpgradeSelection() {
    const ctx = this.ctx;
    const palette = this.palette();
    ctx.save();
    const shade = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 80, WIDTH / 2, HEIGHT / 2, 540);
    shade.addColorStop(0, 'rgba(11, 24, 50, 0.22)');
    shade.addColorStop(1, 'rgba(0, 3, 10, 0.56)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.strokeStyle = `${palette.primary}${alphaHex(0.18)}`;
    ctx.lineWidth = 1;
    ctx.strokeRect(82, 118, WIDTH - 164, HEIGHT - 210);
    ctx.restore();
    super.drawUpgradeSelection();
  }

  drawPause() {
    this.drawOverlayFrame('TACTICAL PAUSE');
    super.drawPause();
  }

  drawGameOver() {
    this.drawOverlayFrame('RUN TERMINATED', true);
    super.drawGameOver();
  }

  drawBanner() {
    super.drawBanner();
    if (!this.banner) return;
    const ctx = this.ctx;
    const palette = this.palette();
    ctx.save();
    ctx.globalAlpha = clamp((this.banner.time || 0) * 0.25, 0, 0.45);
    ctx.strokeStyle = palette.primary;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2 - 180, 185);
    ctx.lineTo(WIDTH / 2 - 80, 185);
    ctx.moveTo(WIDTH / 2 + 80, 185);
    ctx.lineTo(WIDTH / 2 + 180, 185);
    ctx.stroke();
    ctx.restore();
  }

  drawTouchControls() {
    super.drawTouchControls();
    const ctx = this.ctx;
    const palette = this.palette();
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = palette.primary;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.arc(138, HEIGHT - 122, 92, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  drawOverlayFrame(labelText, danger = false) {
    const ctx = this.ctx;
    const palette = this.palette();
    const color = danger ? palette.danger : palette.primary;

    ctx.save();
    ctx.fillStyle = 'rgba(1, 4, 12, 0.22)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.strokeStyle = `${color}${alphaHex(0.24)}`;
    ctx.lineWidth = 1.5;
    roundedRect(ctx, 332, 124, 616, 472, 24);
    ctx.stroke();
    ctx.font = '800 11px "Segoe UI", Tahoma, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = `${color}${alphaHex(0.72)}`;
    ctx.fillText(labelText, WIDTH / 2, 148);
    ctx.restore();
  }

  getSnapshot() {
    return {
      ...super.getSnapshot(),
      releaseVersion: RELEASE_VERSION,
      visualOverhaulRuntimeVersion: VISUAL_OVERHAUL_RUNTIME_VERSION,
      arenaArtPolishVersion: ARENA_ART_POLISH_VERSION,
      visualOverhaulActive: true,
      visualOverhaulStyle: 'cinematic-industrial-2d',
      enhancedArenaDepth: true,
      cinematicArenaArtActive: true,
      sectorAtmosphereActive: true,
      obstacleDressingActive: true,
      animatedMapMaterials: true,
      mapGeometryChanged: false,
      mapCollisionGeometryChanged: false,
      enhancedHudChrome: true,
      enemyReadabilityPass: true,
      bulletRecallTether: true,
      gameplayGeometryChanged: false,
      collisionGeometryChanged: false,
    };
  }
}
