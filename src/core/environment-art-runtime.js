import { clamp } from '../arena.js';
import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from '../game-data.js';
import { UI_COLORS, roundedRect } from '../ui-renderer.js';
import { OneBulletGraphicsRefinementRuntime } from './graphics-refinement-runtime.js';

export const ENVIRONMENT_ART_RUNTIME_VERSION = '3.5.0-environment-art';

function chamferPath(ctx, x, y, w, h, cut = 10) {
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

function deterministicVariant(index, stage = 0) {
  return (Math.abs(Math.trunc(index)) * 17 + Math.abs(Math.trunc(stage)) * 13) % 7;
}

export class OneBulletEnvironmentArtRuntime extends OneBulletGraphicsRefinementRuntime {
  constructor(canvas, liveRegion = null) {
    super(canvas, liveRegion);
    this.environmentArtRuntimeVersion = ENVIRONMENT_ART_RUNTIME_VERSION;
  }

  drawFloorDetails(bounds, accent, stage) {
    super.drawFloorDetails(bounds, accent, stage);
    this.drawDeckPlating(bounds, accent, stage);
    this.drawStageLandmark(bounds, accent, stage);
    this.drawFloorConduits(bounds, accent, stage);
  }

  drawLockedSpace2D(bounds) {
    super.drawLockedSpace2D(bounds);
    if ((this.arenaStage?.id ?? 0) >= 3) return;
    this.drawLockedMachinery(bounds);
  }

  drawArenaBorder() {
    super.drawArenaBorder();
    this.drawPerimeterRails();
  }

  drawObstacle(obstacle) {
    super.drawObstacle(obstacle);
    this.drawObstacleMaterialDetail(obstacle);
  }

  drawDeckPlating(bounds, accent, stage) {
    const ctx = this.ctx;
    const tile = stage >= 3 ? 92 : stage >= 2 ? 86 : 78;
    const gap = 6;

    ctx.save();
    roundedRect(ctx, bounds.x, bounds.y, bounds.w, bounds.h, 14);
    ctx.clip();

    for (let row = 0, y = bounds.y + 18; y < bounds.y + bounds.h - 18; row += 1, y += tile) {
      for (let col = 0, x = bounds.x + 18; x < bounds.x + bounds.w - 18; col += 1, x += tile) {
        const w = Math.min(tile - gap, bounds.x + bounds.w - 18 - x);
        const h = Math.min(tile - gap, bounds.y + bounds.h - 18 - y);
        if (w < 18 || h < 18) continue;
        const variant = deterministicVariant(row * 23 + col, stage);
        const alpha = 0.035 + variant * 0.007;

        chamferPath(ctx, x, y, w, h, 7);
        ctx.fillStyle = `rgba(33, 61, 94, ${alpha})`;
        ctx.fill();
        ctx.strokeStyle = variant === 6
          ? `rgba(255, 216, 107, ${0.12 + stage * 0.015})`
          : `rgba(95, 175, 220, ${0.075 + stage * 0.012})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        if (variant === 2 || variant === 5) {
          ctx.globalAlpha = 0.16;
          ctx.strokeStyle = accent.primary;
          ctx.beginPath();
          ctx.moveTo(x + 10, y + h - 10);
          ctx.lineTo(x + Math.min(w * 0.46, 38), y + h - 10);
          ctx.lineTo(x + Math.min(w * 0.56, 48), y + h - 18);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }

    ctx.restore();
  }

  drawStageLandmark(bounds, accent, stage) {
    const ctx = this.ctx;
    const cx = bounds.x + bounds.w / 2;
    const cy = bounds.y + bounds.h / 2;
    const pulse = 0.52 + Math.sin(this.elapsed * 2.2) * 0.12;

    ctx.save();
    roundedRect(ctx, bounds.x, bounds.y, bounds.w, bounds.h, 14);
    ctx.clip();

    if (stage === 0) {
      this.drawReactorHub(cx, cy, 86, accent.primary, accent.warm, pulse);
      this.drawDeckLabel(cx - 118, cy + 126, 236, 'CORE // REACTOR DECK', accent.primary);
    } else if (stage === 1) {
      this.drawRelayNode(bounds.x + 102, cy, 42, accent.primary, 'L-WING');
      this.drawRelayNode(bounds.x + bounds.w - 102, cy, 42, accent.primary, 'R-WING');
      this.drawBridgeRail(bounds.x + 190, cy - 22, bounds.w - 380, accent.secondary);
      this.drawDeckLabel(cx - 118, cy + 144, 236, 'WING RELAY NETWORK', accent.primary);
    } else if (stage === 2) {
      this.drawCorridorGate(cx, bounds.y + 62, 210, accent.secondary, false);
      this.drawCorridorGate(cx, bounds.y + bounds.h - 62, 210, accent.secondary, true);
      this.drawRelayNode(bounds.x + 72, cy, 34, accent.primary, 'WEST');
      this.drawRelayNode(bounds.x + bounds.w - 72, cy, 34, accent.primary, 'EAST');
      this.drawDeckLabel(cx - 130, cy + 154, 260, 'CORRIDOR GRID ONLINE', accent.primary);
    } else {
      const insetX = 92;
      const insetY = 82;
      this.drawRelayNode(bounds.x + insetX, bounds.y + insetY, 34, accent.warm, 'A1');
      this.drawRelayNode(bounds.x + bounds.w - insetX, bounds.y + insetY, 34, accent.primary, 'A2');
      this.drawRelayNode(bounds.x + insetX, bounds.y + bounds.h - insetY, 34, accent.primary, 'B1');
      this.drawRelayNode(bounds.x + bounds.w - insetX, bounds.y + bounds.h - insetY, 34, accent.warm, 'B2');
      this.drawReactorHub(cx, cy, 72, accent.primary, accent.warm, pulse * 0.8);
      this.drawDeckLabel(cx - 124, bounds.y + bounds.h - 42, 248, 'FULL ARENA // OPEN', accent.warm);
    }

    ctx.restore();
  }

  drawReactorHub(cx, cy, radius, primary, warm, pulse) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.reducedMotion ? 0 : this.elapsed * 0.055);
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = primary;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([14, 11]);
    for (const scale of [1, 0.72, 0.48]) {
      ctx.beginPath();
      ctx.arc(0, 0, radius * scale, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.globalAlpha = 0.24 + pulse * 0.12;
    ctx.fillStyle = primary;
    ctx.beginPath();
    ctx.arc(0, 0, 13 + pulse * 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.5;
    ctx.fillStyle = warm;
    for (let index = 0; index < 4; index += 1) {
      const angle = index * Math.PI / 2;
      const x = Math.cos(angle) * radius * 0.84;
      const y = Math.sin(angle) * radius * 0.84;
      ctx.fillRect(x - 7, y - 2, 14, 4);
    }
    ctx.restore();
  }

  drawRelayNode(x, y, radius, accent, code) {
    const ctx = this.ctx;
    const pulse = 0.55 + Math.sin(this.elapsed * 2.8 + x * 0.01 + y * 0.01) * 0.12;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([8, 7]);
    ctx.beginPath();
    ctx.arc(0, 0, radius + 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.globalAlpha = 0.18;
    ctx.fillStyle = accent;
    chamferPath(ctx, -radius * 0.7, -radius * 0.7, radius * 1.4, radius * 1.4, 8);
    ctx.fill();

    ctx.globalAlpha = 0.7 * pulse;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 10;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#b8c8df';
    ctx.font = '800 7px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(code, 0, radius + 24);
    ctx.restore();
  }

  drawBridgeRail(x, y, width, accent) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.moveTo(x, y + 44);
    ctx.lineTo(x + width, y + 44);
    ctx.stroke();
    for (let px = x + 18; px < x + width - 12; px += 48) {
      ctx.fillStyle = accent;
      ctx.fillRect(px, y - 2, 14, 3);
      ctx.fillRect(px + 16, y + 43, 8, 3);
    }
    ctx.restore();
  }

  drawCorridorGate(cx, y, width, accent, flip) {
    const ctx = this.ctx;
    const h = 28;
    const x = cx - width / 2;
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y + (flip ? -h : h));
    ctx.lineTo(x + 26, y);
    ctx.lineTo(x + width - 26, y);
    ctx.lineTo(x + width, y + (flip ? -h : h));
    ctx.stroke();
    ctx.globalAlpha = 0.38;
    for (let i = 0; i < 5; i += 1) {
      ctx.fillStyle = i % 2 ? accent : UI_COLORS.bullet;
      ctx.fillRect(cx - 54 + i * 27, y - 2, 14, 4);
    }
    ctx.restore();
  }

  drawFloorConduits(bounds, accent, stage) {
    const ctx = this.ctx;
    const centerY = bounds.y + bounds.h / 2;
    const centerX = bounds.x + bounds.w / 2;
    const conduitAlpha = 0.12 + stage * 0.018;

    ctx.save();
    roundedRect(ctx, bounds.x, bounds.y, bounds.w, bounds.h, 14);
    ctx.clip();
    ctx.globalAlpha = conduitAlpha;
    ctx.strokeStyle = accent.primary;
    ctx.lineWidth = 1.3;

    const lines = stage >= 2
      ? [
          [bounds.x + 26, centerY, centerX - 150, centerY],
          [centerX + 150, centerY, bounds.x + bounds.w - 26, centerY],
          [centerX, bounds.y + 26, centerX, centerY - 120],
          [centerX, centerY + 120, centerX, bounds.y + bounds.h - 26],
        ]
      : [
          [bounds.x + 28, centerY, centerX - 120, centerY],
          [centerX + 120, centerY, bounds.x + bounds.w - 28, centerY],
        ];

    for (const [x1, y1, x2, y2] of lines) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    ctx.globalAlpha = conduitAlpha * 2.2;
    ctx.fillStyle = accent.warm;
    const flow = this.reducedMotion ? 0 : (this.elapsed * 54) % 84;
    for (const [x1, y1, x2, y2] of lines) {
      const horizontal = Math.abs(x2 - x1) >= Math.abs(y2 - y1);
      if (horizontal) {
        const direction = Math.sign(x2 - x1) || 1;
        const length = Math.abs(x2 - x1);
        const x = x1 + direction * (flow % Math.max(1, length));
        ctx.fillRect(x - 4, y1 - 1.5, 8, 3);
      } else {
        const direction = Math.sign(y2 - y1) || 1;
        const length = Math.abs(y2 - y1);
        const y = y1 + direction * (flow % Math.max(1, length));
        ctx.fillRect(x1 - 1.5, y - 4, 3, 8);
      }
    }
    ctx.restore();
  }

  drawLockedMachinery(bounds) {
    const ctx = this.ctx;
    const stage = this.arenaStage?.id ?? 0;
    const palette = this.palette();
    const right = bounds.x + bounds.w;
    const bottom = bounds.y + bounds.h;
    const zones = [
      { x: 0, y: bounds.y, w: bounds.x, h: bounds.h, axis: 'vertical' },
      { x: right, y: bounds.y, w: WIDTH - right, h: bounds.h, axis: 'vertical' },
      { x: 0, y: 0, w: WIDTH, h: bounds.y, axis: 'horizontal' },
      { x: 0, y: bottom, w: WIDTH, h: HEIGHT - bottom, axis: 'horizontal' },
    ];

    ctx.save();
    for (const zone of zones) {
      if (zone.w < 42 || zone.h < 42) continue;
      ctx.beginPath();
      ctx.rect(zone.x, zone.y, zone.w, zone.h);
      ctx.clip();
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = palette.secondary;
      ctx.fillStyle = 'rgba(8, 18, 34, 0.74)';

      const spacing = zone.axis === 'vertical' ? 78 : 116;
      const count = Math.max(1, Math.ceil((zone.axis === 'vertical' ? zone.h : zone.w) / spacing));
      for (let index = 0; index < count; index += 1) {
        const variant = deterministicVariant(index, stage);
        const moduleW = zone.axis === 'vertical' ? Math.min(76, zone.w - 24) : 82 + variant * 4;
        const moduleH = zone.axis === 'vertical' ? 46 + variant * 3 : Math.min(54, zone.h - 18);
        const x = zone.axis === 'vertical'
          ? zone.x + Math.max(12, (zone.w - moduleW) / 2)
          : zone.x + 22 + index * spacing;
        const y = zone.axis === 'vertical'
          ? zone.y + 20 + index * spacing
          : zone.y + Math.max(9, (zone.h - moduleH) / 2);
        if (x + moduleW > zone.x + zone.w - 8 || y + moduleH > zone.y + zone.h - 8) continue;

        chamferPath(ctx, x, y, moduleW, moduleH, 7);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = variant === 6 ? palette.warm : palette.primary;
        ctx.fillRect(x + 10, y + 9, 14 + variant * 2, 2);
        ctx.fillStyle = 'rgba(8, 18, 34, 0.74)';
      }
      ctx.restore();
      ctx.save();
    }
    ctx.restore();
  }

  drawPerimeterRails() {
    const ctx = this.ctx;
    const bounds = this.arenaStage.bounds;
    const palette = this.palette();
    const stage = this.arenaStage?.id ?? 0;
    const segments = Math.max(4, 5 + stage * 2);

    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.strokeStyle = palette.secondary;
    ctx.lineWidth = 1;
    const inset = 9;
    roundedRect(ctx, bounds.x + inset, bounds.y + inset, bounds.w - inset * 2, bounds.h - inset * 2, 10);
    ctx.stroke();

    ctx.fillStyle = palette.primary;
    for (let index = 0; index < segments; index += 1) {
      const t = (index + 0.5) / segments;
      const topX = bounds.x + 34 + t * Math.max(1, bounds.w - 68);
      ctx.fillRect(topX - 9, bounds.y + 8, 18, 2);
      ctx.fillRect(topX - 5, bounds.y + bounds.h - 10, 10, 2);
    }

    ctx.fillStyle = palette.warm;
    const indicator = clamp(stage + 1, 1, 4);
    for (let i = 0; i < indicator; i += 1) {
      ctx.fillRect(bounds.x + 18 + i * 11, bounds.y + bounds.h - 12, 7, 2);
    }
    ctx.restore();
  }

  drawObstacleMaterialDetail(obstacle) {
    const ctx = this.ctx;
    const palette = this.palette();
    const horizontal = obstacle.w >= obstacle.h;

    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = palette.primary;
    ctx.lineWidth = 1;
    chamferPath(ctx, obstacle.x + 8, obstacle.y + 8, obstacle.w - 16, obstacle.h - 16, 6);
    ctx.stroke();

    ctx.globalAlpha = 0.42;
    ctx.fillStyle = palette.warm;
    if (horizontal) {
      for (let x = obstacle.x + 16; x < obstacle.x + obstacle.w - 18; x += 34) {
        ctx.fillRect(x, obstacle.y + obstacle.h / 2 - 1, 12, 2);
      }
    } else {
      for (let y = obstacle.y + 16; y < obstacle.y + obstacle.h - 18; y += 34) {
        ctx.fillRect(obstacle.x + obstacle.w / 2 - 1, y, 2, 12);
      }
    }
    ctx.restore();
  }

  drawDeckLabel(x, y, width, text, accent) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = 'rgba(4, 10, 22, 0.72)';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    chamferPath(ctx, x, y - 13, width, 26, 7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#b3c4dd';
    ctx.font = '800 8px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, x + width / 2, y + 3);
    ctx.restore();
  }

  getSnapshot() {
    return {
      ...super.getSnapshot(),
      environmentArtRuntimeVersion: this.environmentArtRuntimeVersion,
      environmentArtActive: true,
      environmentArtStyle: 'modular-industrial-deck-v1',
      stageLandmarksActive: true,
      floorModuleDetailActive: true,
      lockedMachineryActive: true,
      perimeterRailDetailActive: true,
      gameplayGeometryChanged: false,
      collisionGeometryChanged: false,
    };
  }
}
