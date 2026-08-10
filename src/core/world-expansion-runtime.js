import {
  circleRectOverlap,
  clamp,
  distance,
  resolveCombatCircle,
} from '../arena.js';
import {
  GAME_HEIGHT as HEIGHT,
  GAME_WIDTH as WIDTH,
  waveEncounterForWave,
} from '../game-data.js';
import { UI_FONT } from '../ui-renderer.js';
import { OneBulletDashboardPolishRuntime } from './dashboard-polish-runtime.js';

export const WORLD_EXPANSION_RUNTIME_VERSION = '3.4.0-expanding-world';

const CAMERA_ZOOMS = Object.freeze([1, 1, 1, 0.98, 0.94, 0.9, 0.86, 0.82]);
const HUD = Object.freeze({
  surface: 'rgba(4, 17, 30, 0.9)',
  border: 'rgba(77, 164, 202, 0.38)',
  cyan: '#63cce9',
  cyanSoft: '#8dc8dc',
  gold: '#e5bd45',
  green: '#57d59a',
  red: '#db6574',
  text: '#eef6f8',
  muted: '#7698a8',
});

function smooth(current, target, dt, response = 7) {
  const alpha = 1 - Math.exp(-Math.max(0, Number(dt) || 0) * response);
  return current + (target - current) * alpha;
}

function drawText(ctx, text, x, y, size, color, weight = 700, align = 'center', direction = 'rtl') {
  ctx.save();
  ctx.direction = direction;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${weight} ${size}px ${UI_FONT}`;
  ctx.fillStyle = color;
  ctx.fillText(String(text), x, y);
  ctx.restore();
}

export function cameraZoomForStage(stageId = 0) {
  const safe = Math.max(0, Math.trunc(Number(stageId) || 0));
  return CAMERA_ZOOMS[Math.min(CAMERA_ZOOMS.length - 1, safe)];
}

export function cameraClampAxis(value, boundStart, boundSize, viewportSize) {
  const half = Math.max(0, viewportSize / 2);
  const min = boundStart + half;
  const max = boundStart + boundSize - half;
  if (min > max) return boundStart + boundSize / 2;
  return clamp(value, min, max);
}

export class OneBulletWorldExpansionRuntime extends OneBulletDashboardPolishRuntime {
  constructor(canvas, liveRegion = null) {
    super(canvas, liveRegion);
    this.worldExpansionRuntimeVersion = WORLD_EXPANSION_RUNTIME_VERSION;
    this.worldCamera = {
      x: this.player.x,
      y: this.player.y,
      zoom: 1,
      targetZoom: 1,
    };
    this.currentEncounter = waveEncounterForWave(1);
    this.explorationTrail = [{ x: this.player.x, y: this.player.y }];
    this.explorationDistance = 0;
    this.lastExplorationPoint = { x: this.player.x, y: this.player.y };
  }

  startNextWave() {
    const previousStageId = this.arenaStage?.id ?? 0;
    super.startNextWave();
    this.currentEncounter = waveEncounterForWave(this.wave);
    if (!this.worldCamera) return;

    this.worldCamera.targetZoom = cameraZoomForStage(this.arenaStage.id);
    const expanded = this.arenaStage.id > previousStageId;
    if (this.banner) {
      this.banner.subtitle = expanded
        ? `${this.arenaStage.name} — مساحة جديدة اتفتحت`
        : `${this.currentEncounter.name} — غيّر تمركزك واستغل المساحة`;
      this.banner.time = expanded ? 2.45 : Math.max(this.banner.time || 0, 1.55);
    }
  }

  screenToWorld(x, y) {
    const camera = this.worldCamera;
    if (!camera) return { x, y };
    const zoom = Math.max(0.01, camera.zoom);
    return {
      x: camera.x + (x - WIDTH / 2) / zoom,
      y: camera.y + (y - HEIGHT / 2) / zoom,
    };
  }

  viewportWorldBounds() {
    const camera = this.worldCamera;
    const zoom = Math.max(0.01, camera?.zoom || 1);
    const w = WIDTH / zoom;
    const h = HEIGHT / zoom;
    return {
      x: (camera?.x ?? WIDTH / 2) - w / 2,
      y: (camera?.y ?? HEIGHT / 2) - h / 2,
      w,
      h,
    };
  }

  fireBullet() {
    if (this.state !== 'playing' || !this.worldCamera) return super.fireBullet();
    const rawX = this.pointer.x;
    const rawY = this.pointer.y;
    const world = this.screenToWorld(rawX, rawY);
    this.pointer.x = world.x;
    this.pointer.y = world.y;
    try {
      return super.fireBullet();
    } finally {
      this.pointer.x = rawX;
      this.pointer.y = rawY;
    }
  }

  constrainCombatCircle(circle) {
    resolveCombatCircle(circle, this.arenaStage.bounds, this.arenaStage.obstacles, []);
  }

  sanitizeSpawnPoint(point, radius = 34) {
    const candidate = { x: point.x, y: point.y, radius };
    resolveCombatCircle(candidate, this.arenaStage.bounds, this.arenaStage.obstacles, []);
    return { x: candidate.x, y: candidate.y };
  }

  findSpawnPoint(seed = 0) {
    const bounds = this.arenaStage.bounds;
    const radius = 34;
    const baseAngle = ((this.wave * 0.71 + seed * 1.93) % (Math.PI * 2));
    let best = null;
    let bestScore = -Infinity;

    for (let index = 0; index < 18; index += 1) {
      const angle = baseAngle + (Math.PI * 2 * index) / 18;
      const ring = 390 + ((seed + index) % 4) * 78 + Math.min(150, this.arenaStage.id * 22);
      const raw = {
        x: this.player.x + Math.cos(angle) * ring,
        y: this.player.y + Math.sin(angle) * ring,
      };
      const point = this.sanitizeSpawnPoint(raw, radius);
      const probe = { ...point, radius };
      const playerDistance = distance(point, this.player);
      if (playerDistance < 300) continue;
      if (this.arenaStage.obstacles.some((rect) => circleRectOverlap(probe, rect))) continue;

      const nearestEnemy = this.enemies.length
        ? Math.min(...this.enemies.map((enemy) => distance(point, enemy) - enemy.radius - radius))
        : 999;
      if (nearestEnemy < 24) continue;

      const edgeMargin = Math.min(
        point.x - bounds.x,
        bounds.x + bounds.w - point.x,
        point.y - bounds.y,
        bounds.y + bounds.h - point.y,
      );
      const score = Math.min(760, playerDistance) + Math.min(260, nearestEnemy) + Math.min(120, edgeMargin) * 0.35;
      if (score > bestScore) {
        best = point;
        bestScore = score;
      }
    }

    return best || this.sanitizeSpawnPoint({ x: this.player.x + 420, y: this.player.y }, radius);
  }

  update(dt) {
    const rawX = this.pointer.x;
    const rawY = this.pointer.y;
    if (this.state === 'playing' && this.worldCamera) {
      const worldPointer = this.screenToWorld(rawX, rawY);
      this.pointer.x = worldPointer.x;
      this.pointer.y = worldPointer.y;
    }

    const beforeX = this.player.x;
    const beforeY = this.player.y;
    super.update(dt);

    this.pointer.x = rawX;
    this.pointer.y = rawY;

    if (this.state !== 'menu') this.updateWorldCamera(dt);
    if (this.state === 'playing') {
      this.explorationDistance += Math.hypot(this.player.x - beforeX, this.player.y - beforeY);
      this.recordExplorationPoint();
    }
  }

  updateWorldCamera(dt) {
    if (!this.worldCamera) return;
    const bounds = this.arenaStage.bounds;
    const camera = this.worldCamera;
    camera.targetZoom = cameraZoomForStage(this.arenaStage.id);
    camera.zoom = smooth(camera.zoom, camera.targetZoom, dt, 3.2);

    const leadScale = 80 + this.arenaStage.id * 9;
    const targetX = this.player.x + (this.visualDirection?.x || 0) * leadScale;
    const targetY = this.player.y + (this.visualDirection?.y || 0) * leadScale * 0.72;
    const viewportW = WIDTH / Math.max(0.01, camera.zoom);
    const viewportH = HEIGHT / Math.max(0.01, camera.zoom);
    const clampedX = cameraClampAxis(targetX, bounds.x, bounds.w, viewportW);
    const clampedY = cameraClampAxis(targetY, bounds.y, bounds.h, viewportH);

    camera.x = smooth(camera.x, clampedX, dt, 5.5);
    camera.y = smooth(camera.y, clampedY, dt, 5.5);
  }

  recordExplorationPoint() {
    const last = this.lastExplorationPoint;
    if (Math.hypot(this.player.x - last.x, this.player.y - last.y) < 90) return;
    const point = { x: this.player.x, y: this.player.y };
    this.explorationTrail.push(point);
    this.explorationTrail = this.explorationTrail.slice(-72);
    this.lastExplorationPoint = point;
  }

  draw() {
    if (this.state === 'menu' || !this.worldCamera) {
      super.draw();
      return;
    }

    const ctx = this.ctx;
    this.uiRegions = [];
    this.renderFrame += 1;

    ctx.fillStyle = '#020813';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const shakeStrength = this.reducedMotion ? 0 : Math.max(0, this.shake || 0);
    const phase = this.elapsed * 71 + this.renderFrame * 0.41;
    const shakeX = Math.sin(phase) * shakeStrength * 0.34;
    const shakeY = Math.cos(phase * 1.37) * shakeStrength * 0.28;

    const rawX = this.pointer.x;
    const rawY = this.pointer.y;
    const worldPointer = this.screenToWorld(rawX, rawY);
    this.pointer.x = worldPointer.x;
    this.pointer.y = worldPointer.y;

    ctx.save();
    ctx.translate(WIDTH / 2 + shakeX, HEIGHT / 2 + shakeY);
    ctx.scale(this.worldCamera.zoom, this.worldCamera.zoom);
    ctx.translate(-this.worldCamera.x, -this.worldCamera.y);
    this.drawArena();
    this.drawBullet();
    this.drawEnemies();
    this.drawEnemyShots();
    this.drawPlayer();
    this.drawParticles();
    this.drawFloatingTexts();
    this.drawWorldLighting();
    ctx.restore();

    this.pointer.x = rawX;
    this.pointer.y = rawY;

    this.drawCameraVignette();
    if (!this.touchMode && this.state === 'playing') this.drawTargetReticle();
    this.drawHud();
    if (this.touchMode && this.state === 'playing') this.drawTouchControls();
    if (this.banner && this.state === 'playing') this.drawBanner();
    if (this.state === 'upgrade') this.drawUpgradeSelection();
    if (this.state === 'paused') this.drawPause();
    if (this.state === 'gameover') this.drawGameOver();

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255, 45, 82, ${this.flash * 0.16})`;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
  }

  drawArena() {
    if (this.state === 'menu' || this.arenaStage.id <= 3) {
      super.drawArena();
      return;
    }

    const ctx = this.ctx;
    const bounds = this.arenaStage.bounds;
    const palette = this.palette();
    const accent = { primary: palette.primary, secondary: palette.secondary, warm: palette.warm };
    const margin = 520;

    const backdrop = ctx.createLinearGradient(0, bounds.y - margin, 0, bounds.y + bounds.h + margin);
    backdrop.addColorStop(0, '#07101e');
    backdrop.addColorStop(0.5, '#030914');
    backdrop.addColorStop(1, '#01050c');
    ctx.fillStyle = backdrop;
    ctx.fillRect(bounds.x - margin, bounds.y - margin, bounds.w + margin * 2, bounds.h + margin * 2);

    this.drawExpandedDeck(bounds, accent);
    this.drawArenaDropShadow(bounds, accent);
    this.drawFloorBase(bounds, accent, this.arenaStage.id);
    this.drawFloorTiles(bounds, accent, this.arenaStage.id);
    this.drawExpandedLanes(bounds, accent);
    this.drawCenterPlatform(bounds, accent, this.arenaStage.id);
    this.drawFloorDetails(bounds, accent, this.arenaStage.id);
    for (const obstacle of this.arenaStage.obstacles) this.drawObstacle(obstacle);
    this.drawArenaBorder();
    this.drawEnvironmentalReadabilityPass();
  }

  drawExpandedDeck(bounds, accent) {
    const ctx = this.ctx;
    const step = 108;
    const startX = Math.floor((bounds.x - 260) / step) * step;
    const endX = bounds.x + bounds.w + 260;
    const startY = Math.floor((bounds.y - 260) / step) * step;
    const endY = bounds.y + bounds.h + 260;

    ctx.save();
    ctx.strokeStyle = 'rgba(77, 113, 155, 0.12)';
    ctx.lineWidth = 1;
    for (let x = startX; x <= endX; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }
    for (let y = startY; y <= endY; y += step) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }

    ctx.strokeStyle = `${accent.secondary}2a`;
    ctx.lineWidth = 2;
    const sector = 432;
    for (let x = bounds.x; x <= bounds.x + bounds.w; x += sector) {
      ctx.beginPath();
      ctx.moveTo(x, bounds.y);
      ctx.lineTo(x, bounds.y + bounds.h);
      ctx.stroke();
    }
    for (let y = bounds.y; y <= bounds.y + bounds.h; y += sector) {
      ctx.beginPath();
      ctx.moveTo(bounds.x, y);
      ctx.lineTo(bounds.x + bounds.w, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawExpandedLanes(bounds, accent) {
    const ctx = this.ctx;
    const cx = bounds.x + bounds.w / 2;
    const cy = bounds.y + bounds.h / 2;
    ctx.save();
    ctx.strokeStyle = `${accent.primary}24`;
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 18]);
    ctx.beginPath();
    ctx.moveTo(bounds.x + 36, cy);
    ctx.lineTo(bounds.x + bounds.w - 36, cy);
    ctx.moveTo(cx, bounds.y + 36);
    ctx.lineTo(cx, bounds.y + bounds.h - 36);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  drawCameraVignette() {
    const ctx = this.ctx;
    const vignette = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 250, WIDTH / 2, HEIGHT / 2, 760);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(0.76, 'rgba(0,0,0,0.05)');
    vignette.addColorStop(1, 'rgba(0,4,12,0.48)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  drawBar(x, y, w, h, value, color) {
    const ctx = this.ctx;
    const ratio = clamp(Number(value) || 0, 0, 1);
    ctx.fillStyle = 'rgba(117, 166, 190, 0.14)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * ratio, h);
  }

  drawHud() {
    const ctx = this.ctx;
    const h = 72;
    const left = { x: 18, y: 14, w: 300, h };
    const center = { x: 333, y: 14, w: 614, h };
    const right = { x: 962, y: 14, w: 300, h };

    this.drawSurface(left, { fill: HUD.surface, border: HUD.border, cut: 11 });
    this.drawSurface(center, { fill: HUD.surface, border: HUD.border, cut: 11 });
    this.drawSurface(right, { fill: HUD.surface, border: HUD.border, cut: 11 });

    const bulletColor = this.bullet.held ? HUD.gold : HUD.cyan;
    const bulletTitle = this.bullet.held ? 'الطلقة جاهزة' : this.bullet.recalling ? 'الطلقة عائدة' : 'الطلقة في الميدان';
    drawText(ctx, bulletTitle, left.x + 18, left.y + 28, 12, bulletColor, 900, 'left');
    drawText(ctx, this.bullet.held ? 'FIRE' : this.bullet.recalling ? 'RETURNING' : 'Q  RECALL', left.x + 18, left.y + 47, 7.5, HUD.muted, 900, 'left', 'ltr');
    const recallMax = Math.max(0.75, 3.8 - this.stack('magnetic-recall') * 0.52);
    const recallRatio = this.bullet.held ? 1 : 1 - this.bullet.recallCooldown / recallMax;
    this.drawBar(left.x + 18, left.y + 57, left.w - 36, 4, recallRatio, bulletColor);

    drawText(ctx, `WAVE ${this.wave}`, center.x + center.w / 2, center.y + 29, 16, HUD.text, 900, 'center', 'ltr');
    drawText(ctx, this.currentEncounter?.name || 'ضغط متوازن', center.x + center.w / 2, center.y + 49, 10, HUD.gold, 800);
    drawText(
      ctx,
      `${this.enemies.length} ENEMIES   ·   ${this.score.toLocaleString('en-US')} SCORE   ·   SECTOR ${this.arenaStage.id + 1}`,
      center.x + center.w / 2,
      center.y + 65,
      7.5,
      HUD.muted,
      800,
      'center',
      'ltr',
    );

    const healthRatio = this.player.maxHealth > 0 ? this.player.health / this.player.maxHealth : 0;
    drawText(ctx, `HP ${this.player.health}/${this.player.maxHealth}`, right.x + 18, right.y + 28, 11.5, HUD.text, 900, 'left', 'ltr');
    drawText(ctx, this.player.shield > 0 ? 'SHIELD ACTIVE' : `${this.stats.upgrades} UPGRADES`, right.x + right.w - 18, right.y + 28, 7.5, this.player.shield > 0 ? HUD.cyan : HUD.muted, 900, 'right', 'ltr');
    this.drawBar(right.x + 18, right.y + 40, right.w - 36, 7, healthRatio, HUD.red);
    const dashMax = Math.max(0.36, 1.12 * Math.pow(0.86, this.stack('quick-dash')));
    this.drawBar(right.x + 18, right.y + 58, right.w - 36, 4, 1 - this.player.dashCooldown / dashMax, HUD.cyan);

    if (!this.touchMode && this.arenaStage.id >= 4) this.drawMiniMap();
    if (this.state === 'playing' && this.wave === 1 && this.tutorialStep < 3) this.drawTutorial();
  }

  drawMiniMap() {
    const ctx = this.ctx;
    const rect = { x: WIDTH - 184, y: 102, w: 158, h: 100 };
    this.drawSurface(rect, {
      fill: 'rgba(3, 15, 27, 0.78)',
      border: 'rgba(74, 156, 192, 0.28)',
      cut: 9,
    });

    const bounds = this.arenaStage.bounds;
    const inner = { x: rect.x + 10, y: rect.y + 14, w: rect.w - 20, h: rect.h - 24 };
    const scale = Math.min(inner.w / bounds.w, inner.h / bounds.h);
    const mapW = bounds.w * scale;
    const mapH = bounds.h * scale;
    const mapX = inner.x + (inner.w - mapW) / 2;
    const mapY = inner.y + (inner.h - mapH) / 2;
    const project = (point) => ({
      x: mapX + (point.x - bounds.x) * scale,
      y: mapY + (point.y - bounds.y) * scale,
    });

    ctx.strokeStyle = 'rgba(93, 177, 210, 0.36)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mapX, mapY, mapW, mapH);

    ctx.fillStyle = 'rgba(87, 201, 154, 0.24)';
    for (const point of this.explorationTrail) {
      const p = project(point);
      if (p.x < mapX || p.x > mapX + mapW || p.y < mapY || p.y > mapY + mapH) continue;
      ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
    }

    const viewport = this.viewportWorldBounds();
    const view = project(viewport);
    ctx.strokeStyle = 'rgba(229, 189, 69, 0.56)';
    ctx.strokeRect(view.x, view.y, viewport.w * scale, viewport.h * scale);

    const player = project(this.player);
    ctx.fillStyle = HUD.cyan;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 2.5, 0, Math.PI * 2);
    ctx.fill();

    drawText(ctx, `SECTOR ${this.arenaStage.id + 1}`, rect.x + 10, rect.y + 10, 6.5, HUD.muted, 900, 'left', 'ltr');
  }

  getSnapshot() {
    return {
      ...super.getSnapshot(),
      worldExpansionRuntimeVersion: WORLD_EXPANSION_RUNTIME_VERSION,
      expandingWorldActive: true,
      cameraFollowActive: true,
      cameraZoom: Number((this.worldCamera?.zoom || 1).toFixed(3)),
      arenaStageCount: 8,
      encounterMode: this.currentEncounter?.id || 'foundation',
      explorationDistance: Math.round(this.explorationDistance || 0),
      unifiedCombatHud: true,
      gameplayGeometryChanged: true,
      collisionGeometryChanged: true,
    };
  }
}
