import { clamp, normalize, pointInsideRect } from './arena.js';
import { GAME_HEIGHT as HEIGHT, GAME_WIDTH as WIDTH } from './game-data.js';
import { OneBulletMovementHotfixRuntime } from './movement-hotfix-runtime.js';
import {
  TOUCH_LAYOUT,
  UI_COLORS,
  dim,
  formatRunTime,
  label,
  panel,
  polygon,
  progressBar,
  roundedRect,
  upgradeEffectText,
  wrapRtl,
} from './ui-renderer.js';
import { bulletPresentationState, upgradeVisualKind } from './polish-runtime.js';

export const VISUAL_DESIGN_VERSION = '2.6.0-visual';

const ENEMY_STYLE = Object.freeze({
  scout: Object.freeze({ icon: 'S', title: 'SCOUT', core: '#ff6b7f', secondary: '#ffb3c0' }),
  brute: Object.freeze({ icon: 'B', title: 'BRUTE', core: '#ffab4f', secondary: '#ffd08a' }),
  sniper: Object.freeze({ icon: 'N', title: 'SNIPER', core: '#b887ff', secondary: '#dfc7ff' }),
  charger: Object.freeze({ icon: 'C', title: 'CHARGER', core: '#5df2a6', secondary: '#b3ffd8' }),
  // The warden had no entry, so it fell back to the scout palette and, having no
  // shape branch either, to the splitter's pentagon — the guard enemy rendered
  // as a pink splitter.
  warden: Object.freeze({ icon: 'W', title: 'WARDEN', core: '#67ddff', secondary: '#c2f0ff' }),
  splitter: Object.freeze({ icon: 'X', title: 'SPLITTER', core: '#ff7fd3', secondary: '#ffc2eb' }),
});

/*
 * Motion character per archetype.
 *
 * `spin` is body rotation rate, `bob` is a small scale pulse, `phase` offsets
 * the pulse so a crowd never breathes in unison. All of it is presentation
 * only: it reads from enemy.phase, which the simulation already advances, and
 * writes nothing back.
 */
const ENEMY_MOTION = Object.freeze({
  scout: Object.freeze({ spin: 0.9, bob: 0.05, rate: 7.5 }),
  brute: Object.freeze({ spin: 0.12, bob: 0.03, rate: 2.1 }),
  sniper: Object.freeze({ spin: 0.05, bob: 0.015, rate: 1.4 }),
  charger: Object.freeze({ spin: 0, bob: 0.045, rate: 5.5 }),
  warden: Object.freeze({ spin: 0.22, bob: 0.02, rate: 2.6 }),
  splitter: Object.freeze({ spin: 0.4, bob: 0.085, rate: 9.5 }),
});

const UPGRADE_STYLE = Object.freeze({
  bullet: Object.freeze({ icon: '●', accent: '#ffe66d', label: 'BULLET' }),
  movement: Object.freeze({ icon: '➤', accent: '#62f3ff', label: 'MOTION' }),
  recall: Object.freeze({ icon: '↺', accent: '#58a6ff', label: 'RECALL' }),
  defense: Object.freeze({ icon: '◇', accent: '#8ed6ff', label: 'DEFENSE' }),
  health: Object.freeze({ icon: '♥', accent: '#ff6b7f', label: 'VITALITY' }),
  ricochet: Object.freeze({ icon: '⌁', accent: '#ffb45f', label: 'RICOCHET' }),
  shock: Object.freeze({ icon: 'ϟ', accent: '#a78bfa', label: 'SHOCK' }),
});

export function visualThemeTokens() {
  return {
    version: VISUAL_DESIGN_VERSION,
    background: UI_COLORS.background,
    surface: UI_COLORS.panel,
    player: UI_COLORS.player,
    bullet: UI_COLORS.bullet,
    danger: UI_COLORS.danger,
    enemyTypes: Object.keys(ENEMY_STYLE),
    upgradeKinds: Object.keys(UPGRADE_STYLE),
  };
}

export class OneBulletVisualDesignRuntime extends OneBulletMovementHotfixRuntime {
  constructor(canvas, liveRegion = null) {
    super(canvas, liveRegion);
    this.version = VISUAL_DESIGN_VERSION;
    this.visualDesignVersion = VISUAL_DESIGN_VERSION;
  }

  drawArena() {
    const ctx = this.ctx;
    const stage = this.arenaStage?.id ?? 0;
    const time = this.elapsed;

    const background = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    background.addColorStop(0, '#030611');
    background.addColorStop(0.46, '#080d22');
    background.addColorStop(1, '#03040c');
    ctx.fillStyle = background;
    ctx.fillRect(-30, -30, WIDTH + 60, HEIGHT + 60);

    this.drawAmbientStars();

    const centerGlow = ctx.createRadialGradient(
      WIDTH * 0.5,
      HEIGHT * 0.51,
      40,
      WIDTH * 0.5,
      HEIGHT * 0.51,
      690,
    );
    centerGlow.addColorStop(0, 'rgba(30, 105, 170, 0.17)');
    centerGlow.addColorStop(0.45, 'rgba(27, 50, 112, 0.10)');
    centerGlow.addColorStop(1, 'rgba(3, 5, 14, 0)');
    ctx.fillStyle = centerGlow;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    this.drawPerspectiveGrid(time, stage);
    this.drawArenaEmblem();

    if (this.state !== 'menu') {
      this.drawLockedSpace();
      this.drawStageFloor(stage);
      for (const obstacle of this.arenaStage.obstacles) this.drawObstacle(obstacle);
      this.drawArenaBorder();
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
    vignette.addColorStop(0.76, 'rgba(0,0,0,0.16)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.72)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  drawAmbientStars() {
    const ctx = this.ctx;
    ctx.save();
    for (let index = 0; index < 42; index += 1) {
      const seed = index * 97.17;
      const x = (seed * 13.7 + this.elapsed * (index % 3 + 1) * 2.2) % (WIDTH + 80) - 40;
      const y = (seed * 7.3 + index * 31) % HEIGHT;
      const pulse = 0.16 + (Math.sin(this.elapsed * 1.4 + index) + 1) * 0.08;
      ctx.fillStyle = `rgba(141, 190, 255, ${pulse})`;
      ctx.fillRect(x, y, index % 7 === 0 ? 2 : 1, index % 7 === 0 ? 2 : 1);
    }
    ctx.restore();
  }

  drawPerspectiveGrid(time, stage) {
    const ctx = this.ctx;
    ctx.save();
    ctx.lineWidth = 1;
    const gridSize = 52;
    const offsetX = (time * 8) % gridSize;
    const offsetY = (time * 4) % gridSize;
    const gridAlpha = this.state === 'menu' ? 0.12 : 0.08 + stage * 0.012;

    for (let x = -gridSize + offsetX; x <= WIDTH + gridSize; x += gridSize) {
      const distanceFromCenter = Math.abs(x - WIDTH / 2) / (WIDTH / 2);
      ctx.strokeStyle = `rgba(81, 124, 212, ${gridAlpha * (1 - distanceFromCenter * 0.34)})`;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
    }
    for (let y = -gridSize + offsetY; y <= HEIGHT + gridSize; y += gridSize) {
      const distanceFromCenter = Math.abs(y - HEIGHT / 2) / (HEIGHT / 2);
      ctx.strokeStyle = `rgba(81, 124, 212, ${gridAlpha * (1 - distanceFromCenter * 0.34)})`;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y);
      ctx.stroke();
    }

    ctx.globalAlpha = this.state === 'menu' ? 0.18 : 0.11;
    ctx.strokeStyle = UI_COLORS.player;
    ctx.lineWidth = 1.5;
    for (let radius = 115; radius <= 520; radius += 102) {
      ctx.beginPath();
      ctx.arc(WIDTH / 2, HEIGHT / 2, radius + Math.sin(time * 0.7 + radius) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawArenaEmblem() {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(WIDTH / 2, HEIGHT / 2);
    ctx.rotate(this.elapsed * 0.035);
    ctx.globalAlpha = this.state === 'menu' ? 0.18 : 0.08;
    ctx.strokeStyle = UI_COLORS.player;
    ctx.lineWidth = 2;
    for (let radius = 72; radius <= 168; radius += 48) {
      ctx.setLineDash([18, 18]);
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  drawStageFloor(stage) {
    const ctx = this.ctx;
    const bounds = this.arenaStage.bounds;
    ctx.save();

    const floor = ctx.createLinearGradient(bounds.x, bounds.y, bounds.x, bounds.y + bounds.h);
    floor.addColorStop(0, 'rgba(10, 21, 46, 0.64)');
    floor.addColorStop(0.5, 'rgba(7, 15, 34, 0.38)');
    floor.addColorStop(1, 'rgba(8, 11, 29, 0.68)');
    ctx.fillStyle = floor;
    ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);

    const stripeGap = 74;
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = stage >= 2 ? UI_COLORS.electric : UI_COLORS.player;
    ctx.lineWidth = 1.2;
    for (let x = bounds.x - bounds.h; x < bounds.x + bounds.w + bounds.h; x += stripeGap) {
      ctx.beginPath();
      ctx.moveTo(x, bounds.y + bounds.h);
      ctx.lineTo(x + bounds.h, bounds.y);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.28 + this.arenaExpansionPulse * 0.34;
    ctx.strokeStyle = UI_COLORS.bullet;
    ctx.lineWidth = 2;
    ctx.setLineDash([22, 20]);
    ctx.strokeRect(bounds.x + 16, bounds.y + 16, bounds.w - 32, bounds.h - 32);
    ctx.setLineDash([]);
    ctx.restore();
  }

  drawArenaBorder() {
    const ctx = this.ctx;
    const bounds = this.arenaStage.bounds;
    const pulse = 0.55 + Math.sin(this.elapsed * 2.8) * 0.12 + this.arenaExpansionPulse * 0.25;

    ctx.save();
    ctx.strokeStyle = `rgba(98, 243, 255, ${clamp(pulse, 0.35, 1)})`;
    ctx.shadowColor = UI_COLORS.player;
    ctx.shadowBlur = 0;
    ctx.lineWidth = 4;
    roundedRect(ctx, bounds.x, bounds.y, bounds.w, bounds.h, 8);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1;
    roundedRect(ctx, bounds.x + 6, bounds.y + 6, bounds.w - 12, bounds.h - 12, 6);
    ctx.stroke();

    this.drawBracket(bounds.x, bounds.y, 1, 1);
    this.drawBracket(bounds.x + bounds.w, bounds.y, -1, 1);
    this.drawBracket(bounds.x, bounds.y + bounds.h, 1, -1);
    this.drawBracket(bounds.x + bounds.w, bounds.y + bounds.h, -1, -1);
    ctx.restore();
  }

  drawBracket(x, y, directionX, directionY) {
    const ctx = this.ctx;
    ctx.strokeStyle = UI_COLORS.bullet;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + directionX * 8, y + directionY * 28);
    ctx.lineTo(x + directionX * 8, y + directionY * 8);
    ctx.lineTo(x + directionX * 28, y + directionY * 8);
    ctx.stroke();
  }

  drawObstacle(obstacle) {
    const ctx = this.ctx;
    ctx.save();

    const gradient = ctx.createLinearGradient(obstacle.x, obstacle.y, obstacle.x + obstacle.w, obstacle.y + obstacle.h);
    gradient.addColorStop(0, 'rgba(28, 44, 79, 0.98)');
    gradient.addColorStop(0.5, 'rgba(16, 27, 54, 0.98)');
    gradient.addColorStop(1, 'rgba(10, 17, 38, 0.98)');
    ctx.fillStyle = gradient;
    ctx.strokeStyle = '#53699f';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#405a96';
    ctx.shadowBlur = 0;
    roundedRect(ctx, obstacle.x, obstacle.y, obstacle.w, obstacle.h, 10);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = UI_COLORS.player;
    ctx.lineWidth = 1;
    for (let offset = 14; offset < obstacle.w + obstacle.h; offset += 24) {
      ctx.beginPath();
      ctx.moveTo(obstacle.x + clamp(offset, 0, obstacle.w), obstacle.y);
      ctx.lineTo(obstacle.x + clamp(offset - obstacle.h, 0, obstacle.w), obstacle.y + obstacle.h);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawPlayer() {
    if (this.player.invulnerability > 0 && Math.floor(this.elapsed * 18) % 2 === 0) return;
    const ctx = this.ctx;
    const aim = normalize(this.pointer.x - this.player.x, this.pointer.y - this.player.y);
    const rotation = Math.atan2(aim.y, aim.x);
    const dashGlow = this.player.dashRemaining > 0 ? 1 : 0;
    const pulse = 1 + Math.sin(this.elapsed * 7) * 0.035;

    ctx.save();
    ctx.translate(this.player.x, this.player.y);
    ctx.rotate(rotation);

    if (dashGlow) {
      const trail = ctx.createLinearGradient(-90, 0, 12, 0);
      trail.addColorStop(0, 'rgba(98,243,255,0)');
      trail.addColorStop(1, 'rgba(98,243,255,0.22)');
      ctx.fillStyle = trail;
      ctx.beginPath();
      ctx.moveTo(-90, -9);
      ctx.lineTo(7, -14);
      ctx.lineTo(7, 14);
      ctx.lineTo(-90, 9);
      ctx.closePath();
      ctx.fill();
    }

    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#071728';
    ctx.strokeStyle = UI_COLORS.player;
    ctx.lineWidth = 3.2;

    ctx.beginPath();
    ctx.moveTo(31, 0);
    ctx.lineTo(13, -17);
    ctx.lineTo(-11, -19);
    ctx.lineTo(-25, -9);
    ctx.lineTo(-20, 0);
    ctx.lineTo(-25, 9);
    ctx.lineTo(-11, 19);
    ctx.lineTo(13, 17);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(98,243,255,0.16)';
    ctx.beginPath();
    ctx.moveTo(10, -12);
    ctx.lineTo(-8, -10);
    ctx.lineTo(-17, -3);
    ctx.lineTo(3, -3);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(10, 12);
    ctx.lineTo(-8, 10);
    ctx.lineTo(-17, 3);
    ctx.lineTo(3, 3);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-13, -13);
    ctx.lineTo(12, 0);
    ctx.lineTo(-13, 13);
    ctx.stroke();

    ctx.fillStyle = UI_COLORS.player;
    ctx.beginPath();
    ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f4feff';
    ctx.beginPath();
    ctx.arc(2.5, 0, 3.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = UI_COLORS.bullet;
    ctx.lineWidth = 3.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(19, 0);
    ctx.lineTo(33, 0);
    ctx.stroke();
    ctx.restore();
  }

  drawBullet() {
    const ctx = this.ctx;
    const returning = this.bullet.recalling;
    const accent = returning ? UI_COLORS.electric : UI_COLORS.bullet;

    ctx.save();
    if (this.bullet.trail.length > 1) {
      ctx.lineCap = 'round';
      for (let index = this.bullet.trail.length - 1; index > 0; index -= 1) {
        const point = this.bullet.trail[index];
        const next = this.bullet.trail[index - 1];
        const strength = 1 - index / this.bullet.trail.length;
        ctx.strokeStyle = returning
          ? `rgba(88,166,255,${0.06 + strength * 0.5})`
          : `rgba(255,230,109,${0.05 + strength * 0.58})`;
        ctx.lineWidth = 1 + strength * 9;
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(next.x, next.y);
        ctx.stroke();
      }
    }

    if (returning) {
      const tether = ctx.createLinearGradient(this.player.x, this.player.y, this.bullet.x, this.bullet.y);
      tether.addColorStop(0, 'rgba(98,243,255,0.08)');
      tether.addColorStop(0.7, 'rgba(88,166,255,0.42)');
      tether.addColorStop(1, 'rgba(255,255,255,0.8)');
      ctx.strokeStyle = tether;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([14, 10]);
      ctx.lineDashOffset = -this.elapsed * 55;
      ctx.beginPath();
      ctx.moveTo(this.player.x, this.player.y);
      ctx.lineTo(this.bullet.x, this.bullet.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const pulse = 1 + Math.sin(this.elapsed * 17) * 0.12;
    ctx.translate(this.bullet.x, this.bullet.y);
    ctx.rotate(this.elapsed * 5.5);
    ctx.shadowColor = accent;
    ctx.shadowBlur = 0;
    ctx.fillStyle = accent;
    polygon(ctx, 6, this.bullet.radius * 1.22 * pulse, Math.PI / 6);

    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fffdf0';
    ctx.lineWidth = 2;
    polygon(ctx, 6, Math.max(3, this.bullet.radius * 0.53), Math.PI / 6);
    ctx.stroke();

    ctx.restore();

    if (this.muzzleFlash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.muzzleFlash * 7);
      ctx.strokeStyle = UI_COLORS.bullet;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      const direction = normalize(this.pointer.x - this.player.x, this.pointer.y - this.player.y);
      const normal = { x: -direction.y, y: direction.x };
      const originX = this.player.x + direction.x * 24;
      const originY = this.player.y + direction.y * 24;
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(originX + direction.x * 35 + normal.x * 7, originY + direction.y * 35 + normal.y * 7);
      ctx.moveTo(originX, originY);
      ctx.lineTo(originX + direction.x * 35 - normal.x * 7, originY + direction.y * 35 - normal.y * 7);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawEnemies() {
    for (const enemy of this.enemies) {
      this.drawEnemyBody(enemy);
      this.drawEnemyHealth(enemy);
      this.drawEnemyTelegraph(enemy);
    }
  }

  drawEnemyBody(enemy) {
    if (enemy.guardian) {
      this.drawGuardianBody(enemy);
      return;
    }
    const ctx = this.ctx;
    const style = ENEMY_STYLE[enemy.type] || ENEMY_STYLE.scout;
    const hit = enemy.hitFlash > 0;
    const spawnScale = Math.max(0.2, 1 - enemy.spawnTime * 0.65);
    const radius = enemy.radius;

    const motion = ENEMY_MOTION[enemy.type] || ENEMY_MOTION.scout;
    // Presentation-only breathing: scouts flutter, brutes barely move, snipers
    // hold almost still, splitters shake like they are about to come apart.
    // The pulse only ever contracts, never expands past 1, so the drawn body is
    // never larger than the collision radius it claims to have.
    const bob = this.reducedMotion
      ? 1
      : 1 - ((1 + Math.sin(enemy.phase * motion.rate)) / 2) * motion.bob;

    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.scale(spawnScale * bob, spawnScale * bob);
    ctx.rotate(enemy.phase * motion.spin);
    ctx.shadowColor = hit ? UI_COLORS.text : style.core;
    ctx.shadowBlur = 0;
    ctx.fillStyle = hit ? UI_COLORS.text : '#10172d';
    ctx.strokeStyle = hit ? UI_COLORS.text : style.core;
    ctx.lineWidth = enemy.mini ? 2 : 3;

    if (enemy.type === 'scout') {
      polygon(ctx, 4, radius + 2, Math.PI / 4);
      ctx.fill();
      ctx.stroke();
      ctx.rotate(-enemy.phase * 0.42);
      ctx.globalAlpha = 0.5;
      polygon(ctx, 4, radius * 0.62, Math.PI / 4);
      ctx.stroke();
    } else if (enemy.type === 'brute') {
      roundedRect(ctx, -radius, -radius, radius * 2, radius * 2, 7);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 0.45;
      ctx.strokeRect(-radius + 7, -radius + 7, radius * 2 - 14, radius * 2 - 14);
    } else if (enemy.type === 'sniper') {
      polygon(ctx, 6, radius + 2, 0);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 0.48;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.68, 0, Math.PI * 2);
      ctx.stroke();
    } else if (enemy.type === 'charger') {
      const toPlayer = normalize(this.player.x - enemy.x, this.player.y - enemy.y);
      ctx.rotate(Math.atan2(toPlayer.y, toPlayer.x) + Math.PI / 2);
      polygon(ctx, 3, radius + 5, 0);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 0.42;
      ctx.beginPath();
      ctx.moveTo(0, radius * 0.2);
      ctx.lineTo(0, radius * 1.65);
      ctx.stroke();
    } else if (enemy.type === 'warden') {
      // Octagonal bunker with the guard arc drawn on the facing it actually
      // blocks, so "flank it or break it" is readable from the silhouette.
      polygon(ctx, 8, radius + 2, Math.PI / 8);
      ctx.fill();
      ctx.stroke();

      const guardAngle = Number(enemy.guardAngle);
      if (Number.isFinite(guardAngle)) {
        const strength = clamp((enemy.guardStrength || 0) / Math.max(1, enemy.guardMax || 1), 0, 1);
        const broken = (enemy.guardBrokenTimer || 0) > 0;
        ctx.save();
        // Cancel the body spin so the arc stays locked to the guard direction.
        ctx.rotate(guardAngle - enemy.phase * motion.spin);
        ctx.globalAlpha = broken ? 0.22 : 0.5 + strength * 0.45;
        ctx.lineWidth = broken ? 2 : 3 + strength * 2.5;
        ctx.strokeStyle = broken ? UI_COLORS.danger : style.secondary;
        ctx.beginPath();
        ctx.arc(0, 0, radius + 8, -0.72, 0.72);
        ctx.stroke();
        ctx.restore();
      }
    } else {
      // Splitter: a divided core. The seam is the tell that it breaks in two.
      polygon(ctx, 6, radius + 2, Math.PI / 6);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 2;
      const seam = radius * (0.22 + Math.sin(enemy.phase * 9.5) * 0.12);
      ctx.beginPath();
      ctx.moveTo(-radius * 0.86, -seam);
      ctx.lineTo(radius * 0.86, -seam);
      ctx.moveTo(-radius * 0.86, seam);
      ctx.lineTo(radius * 0.86, seam);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.fillStyle = style.core;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(4, radius * 0.28), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = style.secondary;
    ctx.beginPath();
    ctx.arc(-1, -1, Math.max(1.5, radius * 0.1), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /*
   * Health readability.
   *
   * Every enemy above 1 HP used to carry a permanent bar, so a dense wave was a
   * field of floating stripes that overlapped each other and the enemies. Bars
   * now appear only once an enemy has actually been damaged — an undamaged
   * enemy tells you nothing you cannot read from its silhouette — and they are
   * drawn as a segmented arc hugging the body instead of a detached rectangle,
   * so the information sits on the thing it describes.
   *
   * Guardians are the exception and always show their state, because their
   * health is the encounter's clock.
   */
  /*
   * Guardian silhouette.
   *
   * Deliberately heavier than any regular archetype: a double hull, a phase
   * ring that closes as the telegraph completes, and a guard arc that is drawn
   * only while it is actually sealing damage. The player should be able to
   * read "can I hurt it right now" from the shape alone, without a HUD.
   */
  drawGuardianBody(enemy) {
    const ctx = this.ctx;
    const colour = enemy.color || '#67ddff';
    const hit = enemy.hitFlash > 0;
    const spawn = Math.max(0.25, 1 - enemy.spawnTime * 0.75);
    const open = enemy.phaseName === 'stalk';

    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.scale(spawn, spawn);

    // Outer hull.
    ctx.lineWidth = 4;
    ctx.strokeStyle = hit ? UI_COLORS.text : colour;
    ctx.fillStyle = 'rgba(6, 14, 28, 0.92)';
    polygon(ctx, 6, enemy.radius, enemy.phase * 0.12);
    ctx.fill();
    ctx.stroke();

    // Inner core: bright and open while vulnerable, dim while sealed.
    ctx.globalAlpha = open ? 0.95 : 0.34;
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Guard arc, shown only when it is genuinely blocking.
    if (!open) {
      ctx.save();
      ctx.rotate(enemy.guardAngle || 0);
      ctx.lineWidth = 6;
      ctx.strokeStyle = UI_COLORS.danger;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius + 9, -0.85, 0.85);
      ctx.stroke();
      ctx.restore();
    }

    // Wind-up ring: contracts onto the hull as the strike approaches, giving a
    // countdown that is readable at a glance in a crowded frame.
    if (enemy.phaseName === 'wind' && enemy.chargeTelegraph > 0) {
      const progress = 1 - Math.min(1, enemy.chargeTelegraph / 0.95);
      ctx.strokeStyle = UI_COLORS.danger;
      ctx.globalAlpha = 0.35 + progress * 0.5;
      ctx.lineWidth = 2 + progress * 3;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius + 46 - progress * 40, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  drawEnemyHealth(enemy) {
    if (enemy.maxHealth <= 1.1) return;
    const ratio = Math.max(0, Math.min(1, enemy.health / enemy.maxHealth));
    if (ratio >= 0.999 && !enemy.guardian) return;

    const ctx = this.ctx;
    const style = ENEMY_STYLE[enemy.type] || ENEMY_STYLE.scout;
    const radius = enemy.radius + (enemy.guardian ? 12 : 7);
    const span = enemy.guardian ? Math.PI * 1.5 : Math.PI * 0.9;
    const start = -Math.PI / 2 - span / 2;

    ctx.save();
    ctx.lineCap = 'butt';
    ctx.lineWidth = enemy.guardian ? 5 : 3;
    ctx.strokeStyle = 'rgba(2, 8, 16, 0.72)';
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, radius, start, start + span);
    ctx.stroke();

    ctx.strokeStyle = ratio <= 0.34 ? UI_COLORS.danger : style.core;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, radius, start, start + span * ratio);
    ctx.stroke();
    ctx.restore();
  }

  drawEnemyTelegraph(enemy) {
    const ctx = this.ctx;

    if (enemy.type === 'charger' && enemy.chargeTelegraph > 0) {
      const direction = enemy.chargeDirection?.x || enemy.chargeDirection?.y
        ? enemy.chargeDirection
        : normalize(this.player.x - enemy.x, this.player.y - enemy.y);
      const urgency = clamp(1 - enemy.chargeTelegraph / 0.62, 0, 1);
      ctx.save();
      ctx.strokeStyle = UI_COLORS.danger;
      ctx.shadowColor = UI_COLORS.danger;
      ctx.shadowBlur = 0;
      ctx.lineWidth = 3 + urgency * 2;
      ctx.setLineDash([14, 10]);
      ctx.lineDashOffset = -this.elapsed * 60;
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y);
      ctx.lineTo(enemy.x + direction.x * 220, enemy.y + direction.y * 220);
      ctx.stroke();
      ctx.restore();
    }

    if (enemy.type === 'sniper' && enemy.shotTelegraph > 0) {
      const direction = enemy.shotDirection?.x || enemy.shotDirection?.y
        ? enemy.shotDirection
        : normalize(this.player.x - enemy.x, this.player.y - enemy.y);
      const urgency = clamp(1 - enemy.shotTelegraph / 0.5, 0, 1);
      ctx.save();
      ctx.strokeStyle = `rgba(255, 82, 106, ${0.42 + urgency * 0.5})`;
      ctx.shadowColor = UI_COLORS.danger;
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1.5 + urgency * 2;
      ctx.setLineDash([10, 8]);
      ctx.lineDashOffset = -this.elapsed * 42;
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y);
      ctx.lineTo(enemy.x + direction.x * 1300, enemy.y + direction.y * 1300);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawEnemyShots() {
    const ctx = this.ctx;
    for (const shot of this.enemyShots) {
      const velocity = normalize(shot.vx, shot.vy);
      ctx.save();
      const trail = ctx.createLinearGradient(
        shot.x - velocity.x * 30,
        shot.y - velocity.y * 30,
        shot.x,
        shot.y,
      );
      trail.addColorStop(0, 'rgba(255,96,129,0)');
      trail.addColorStop(1, 'rgba(255,180,199,0.9)');
      ctx.strokeStyle = trail;
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(shot.x - velocity.x * 30, shot.y - velocity.y * 30);
      ctx.lineTo(shot.x, shot.y);
      ctx.stroke();

      ctx.fillStyle = '#ffd1dc';
      ctx.shadowColor = UI_COLORS.danger;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(shot.x, shot.y, shot.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawHud() {
    const ctx = this.ctx;
    const bulletState = bulletPresentationState(this.bullet);
    const recallMax = Math.max(0.75, 3.8 - this.stack('magnetic-recall') * 0.52);
    const dashMax = Math.max(0.36, 1.12 * Math.pow(0.86, this.stack('quick-dash')));
    const healthRatio = this.player.maxHealth > 0 ? this.player.health / this.player.maxHealth : 0;

    this.drawHudPanel(14, 12, 342, 88, bulletState.color, 'BULLET');
    this.drawStatusGlyph(42, 42, bulletState.code === 'READY' ? '●' : bulletState.code === 'RETURNING' ? '↺' : '→', bulletState.color);
    label(ctx, bulletState.code, 88, 39, 13, bulletState.color, 900, 'left');
    label(ctx, bulletState.label, 332, 42, 17, UI_COLORS.text, 900, 'right');
    label(ctx, this.bullet.held ? 'CLICK TO FIRE' : 'Q TO RECALL', 332, 64, 10, UI_COLORS.muted, 800, 'right');
    progressBar(ctx, 32, 78, 302, 7, 1 - this.bullet.recallCooldown / recallMax, UI_COLORS.electric, 'rgba(255,255,255,0.08)');

    this.drawHudPanel(WIDTH / 2 - 190, 12, 380, 88, UI_COLORS.borderBright, 'RUN');
    label(ctx, `WAVE ${String(this.wave).padStart(2, '0')}`, WIDTH / 2, 40, 22, UI_COLORS.text, 900);
    label(ctx, `${this.enemies.length} HOSTILES  ·  ${this.score.toLocaleString('en-US')} SCORE`, WIDTH / 2, 63, 12, UI_COLORS.muted, 800);
    const comboText = this.combo > 1 ? `COMBO ×${this.combo}` : `${this.stats.upgrades} UPGRADES`;
    label(
      ctx,
      `${comboText}  ·  ARENA ${this.arenaStage.id + 1}`,
      WIDTH / 2,
      84,
      11,
      this.combo > 1 ? UI_COLORS.bullet : UI_COLORS.muted,
      800,
    );

    this.drawHudPanel(WIDTH - 356, 12, 342, 88, UI_COLORS.player, 'PILOT');
    label(ctx, `HP ${this.player.health}/${this.player.maxHealth}`, WIDTH - 32, 39, 15, UI_COLORS.text, 900, 'right');
    progressBar(ctx, WIDTH - 334, 49, 302, 9, healthRatio, UI_COLORS.danger, 'rgba(255,255,255,0.08)');
    label(ctx, this.player.shield > 0 ? 'SHIELD ONLINE' : 'DASH CHARGE', WIDTH - 32, 78, 10, this.player.shield > 0 ? UI_COLORS.electric : UI_COLORS.muted, 900, 'right');
    progressBar(ctx, WIDTH - 244, 72, 212, 7, 1 - this.player.dashCooldown / dashMax, UI_COLORS.player, 'rgba(255,255,255,0.08)');

    if (this.state === 'playing' && this.wave === 1 && this.tutorialStep < 3) this.drawTutorial();
    if (this.clearBannerTimer > 0 && this.state === 'playing') this.drawWaveClearCallout();
  }

  drawHudPanel(x, y, width, height, accent, kicker) {
    const ctx = this.ctx;
    panel(ctx, x, y, width, height, accent, 'rgba(5, 10, 24, 0.92)', 8);
    ctx.save();
    ctx.fillStyle = accent;
    roundedRect(ctx, x, y, 5, height, 3);
    ctx.fill();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = accent;
    roundedRect(ctx, x + 12, y + 10, 58, 16, 8);
    ctx.fill();
    ctx.restore();
    label(ctx, kicker, x + 41, y + 22, 9, accent, 900);
  }

  drawStatusGlyph(x, y, glyph, color) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.shadowColor = color;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    label(ctx, glyph, x, y + 5, 13, color, 900);
    ctx.restore();
  }

  drawTutorial() {
    const ctx = this.ctx;
    const steps = this.touchMode
      ? [
        { key: 'MOVE', title: 'اسحب العصا للتحرك' },
        { key: 'FIRE', title: 'المس الساحة للإطلاق' },
        { key: 'RECALL', title: 'استدعِ الطلقة والتقطها' },
      ]
      : [
        { key: 'WASD', title: 'الحركة' },
        { key: 'MOUSE', title: 'التصويب والإطلاق' },
        { key: 'Q', title: 'استدعاء الطلقة' },
      ];

    panel(ctx, WIDTH / 2 - 350, 116, 700, 72, UI_COLORS.bullet, 'rgba(5,9,23,0.95)', 10);
    steps.forEach((step, index) => {
      const x = WIDTH / 2 - 310 + index * 218;
      const active = index === this.tutorialStep;
      this.drawKeycap(step.key, x, 130, active);
      label(ctx, step.title, x + 96, 171, 12, active ? UI_COLORS.text : UI_COLORS.muted, active ? 900 : 700, 'center');
    });
  }

  drawKeycap(text, x, y, active) {
    const ctx = this.ctx;
    const color = active ? UI_COLORS.bullet : UI_COLORS.borderBright;
    ctx.save();
    ctx.fillStyle = active ? 'rgba(255,230,109,0.14)' : 'rgba(255,255,255,0.04)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    roundedRect(ctx, x, y, 84, 25, 7);
    ctx.fill();
    ctx.stroke();
    label(ctx, text, x + 42, y + 17, 10, color, 900);
    ctx.restore();
  }

  drawMenu() {
    const ctx = this.ctx;
    const pulse = 1 + Math.sin(this.elapsed * 2.1) * 0.018;

    this.drawMenuOrbit();

    label(ctx, 'ONE BULLET', WIDTH / 2, 88, 14, UI_COLORS.player, 900);
    ctx.save();
    ctx.translate(WIDTH / 2, 170);
    ctx.scale(pulse, pulse);
    label(ctx, 'حلبة الطلقة', 0, 0, 65, UI_COLORS.text, 900);
    label(ctx, 'الواحدة', 0, 67, 65, UI_COLORS.bullet, 900);
    ctx.restore();

    label(ctx, 'ONE SHOT  ·  ONE RECALL  ·  NO SECOND PATH', WIDTH / 2, 278, 12, UI_COLORS.muted, 900);
    label(ctx, 'استخدم الارتداد، استعد الطلقة، واصمد أمام الموجات المتصاعدة.', WIDTH / 2, 310, 17, UI_COLORS.text, 600);

    this.drawButton('ابدأ الجولة', WIDTH / 2 - 180, 344, 360, 62, () => this.startRun(), true);

    this.drawMenuFeatureCard(122, 440, 316, '01', 'أطلق', 'طلقة واحدة ذات ارتدادات دقيقة.', UI_COLORS.bullet);
    this.drawMenuFeatureCard(482, 440, 316, '02', 'استعد', 'استدعاء مغناطيسي يعيد سلاحك.', UI_COLORS.electric);
    this.drawMenuFeatureCard(842, 440, 316, '03', 'تطوّر', 'اختر قدرة واحدة بعد كل موجة.', UI_COLORS.player);

    this.drawStatChip(372, 606, 250, 'BEST WAVE', this.highWave);
    this.drawStatChip(658, 606, 250, 'HIGH SCORE', this.highScore.toLocaleString('en-US'));

    const controls = this.touchMode
      ? 'MOVE: LEFT STICK  ·  FIRE: TAP ARENA  ·  RECALL / DASH: RIGHT'
      : 'WASD MOVE  ·  MOUSE FIRE  ·  Q RECALL  ·  SPACE DASH  ·  P PAUSE';
    label(ctx, controls, WIDTH / 2, 682, 11, UI_COLORS.muted, 800);
    label(ctx, `v${this.version}`, WIDTH - 24, 696, 10, '#63739a', 700, 'right');
  }

  drawMenuOrbit() {
    const ctx = this.ctx;
    const centerX = WIDTH / 2;
    const centerY = 180;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(this.elapsed * 0.25);
    ctx.globalAlpha = 0.38;
    ctx.strokeStyle = UI_COLORS.electric;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([12, 11]);
    ctx.beginPath();
    ctx.arc(0, 0, 142, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    const bulletX = Math.cos(this.elapsed * 0.72) * 142;
    const bulletY = Math.sin(this.elapsed * 0.72) * 142;
    ctx.fillStyle = UI_COLORS.bullet;
    ctx.shadowColor = UI_COLORS.bullet;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(bulletX, bulletY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawMenuFeatureCard(x, y, width, number, title, description, accent) {
    const ctx = this.ctx;
    panel(ctx, x, y, width, 126, accent, 'rgba(7,12,28,0.82)', 6);
    label(ctx, number, x + 28, y + 31, 11, accent, 900, 'left');
    label(ctx, title, x + width - 24, y + 44, 22, UI_COLORS.text, 900, 'right');
    wrapRtl(ctx, description, x + width - 24, y + 78, width - 48, 22, 13, UI_COLORS.muted, 600, 2);
    ctx.save();
    ctx.fillStyle = accent;
    roundedRect(ctx, x + 18, y + 18, 5, 90, 3);
    ctx.fill();
    ctx.restore();
  }

  drawStatChip(x, y, width, title, value) {
    const ctx = this.ctx;
    panel(ctx, x, y, width, 48, UI_COLORS.borderBright, 'rgba(5,10,23,0.75)', 3);
    label(ctx, title, x + 18, y + 20, 9, UI_COLORS.muted, 900, 'left');
    label(ctx, value, x + width - 18, y + 31, 18, UI_COLORS.text, 900, 'right');
  }

  drawUpgradeSelection() {
    const ctx = this.ctx;
    dim(ctx, 0.88);

    label(ctx, `WAVE ${String(this.wave).padStart(2, '0')} CLEARED`, WIDTH / 2, 42, 13, UI_COLORS.success, 900);
    label(ctx, 'اختر تطويرًا واحدًا', WIDTH / 2, 87, 34, UI_COLORS.text, 900);
    label(ctx, 'سيتم تطبيق الاختيار فورًا على الجولة الحالية', WIDTH / 2, 116, 13, UI_COLORS.muted, 600);

    const cardWidth = 338;
    const gap = 24;
    const total = this.upgradeChoices.length * cardWidth + Math.max(0, this.upgradeChoices.length - 1) * gap;
    const start = WIDTH / 2 - total / 2;
    this.upgradeChoices.forEach((upgrade, index) => {
      this.drawUpgradeCard(upgrade, index, start + index * (cardWidth + gap), 144, cardWidth, 392);
    });

    label(ctx, 'CLICK A CARD  ·  OR PRESS 1 / 2 / 3', WIDTH / 2, 575, 11, UI_COLORS.muted, 900);
  }

  drawUpgradeCard(upgrade, index, x, y, width, height) {
    const hovered = pointInsideRect(this.pointer, { x, y, w: width, h: height });
    const kind = upgradeVisualKind(upgrade);
    const style = UPGRADE_STYLE[kind] || UPGRADE_STYLE.bullet;
    const current = this.stack(upgrade.id);
    const ctx = this.ctx;

    ctx.save();
    if (hovered) {
      ctx.translate(0, -5);
      y += -5;
    }

    panel(
      ctx,
      x,
      y,
      width,
      height,
      hovered ? style.accent : UI_COLORS.borderBright,
      hovered ? 'rgba(17,27,55,0.98)' : 'rgba(7,12,28,0.97)',
      hovered ? 20 : 7,
    );

    const header = ctx.createLinearGradient(x, y, x + width, y);
    header.addColorStop(0, 'rgba(255,255,255,0)');
    header.addColorStop(1, `${style.accent}33`);
    ctx.fillStyle = header;
    roundedRect(ctx, x + 2, y + 2, width - 4, 84, 13);
    ctx.fill();

    ctx.fillStyle = style.accent;
    roundedRect(ctx, x, y, 6, height, 3);
    ctx.fill();

    this.drawUpgradeIcon(x + 52, y + 48, style.icon, style.accent);
    label(ctx, `${index + 1}`, x + width - 28, y + 29, 12, style.accent, 900, 'right');
    label(ctx, style.label, x + width - 28, y + 50, 10, UI_COLORS.muted, 900, 'right');

    wrapRtl(ctx, upgrade.name, x + width - 24, y + 119, width - 48, 31, 26, UI_COLORS.text, 900, 2);
    wrapRtl(ctx, upgrade.description, x + width - 24, y + 190, width - 48, 25, 15, UI_COLORS.muted, 600, 3);

    panel(ctx, x + 20, y + 267, width - 40, 69, style.accent, 'rgba(3,8,20,0.84)', 3);
    wrapRtl(
      ctx,
      upgradeEffectText(upgrade, current),
      x + width - 40,
      y + 294,
      width - 80,
      22,
      12,
      UI_COLORS.text,
      800,
      2,
    );

    label(ctx, `LEVEL ${current}/${upgrade.maxStacks}`, x + 24, y + height - 22, 10, current > 0 ? style.accent : UI_COLORS.muted, 900, 'left');
    this.drawStackDots(x + width - 28, y + height - 25, current, upgrade.maxStacks, style.accent);
    ctx.restore();

    this.addUiRegion(x, y, width, height, () => this.chooseUpgrade(index));
  }

  drawUpgradeIcon(x, y, icon, color) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    label(ctx, icon, x, y + 7, 20, color, 900);
    ctx.restore();
  }

  drawStackDots(rightX, y, current, max) {
    const ctx = this.ctx;
    const shown = Math.min(max, 8);
    for (let index = 0; index < shown; index += 1) {
      ctx.fillStyle = index < current ? UI_COLORS.bullet : 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.arc(rightX - index * 12, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawGameOver() {
    const ctx = this.ctx;
    dim(ctx, 0.9);

    label(ctx, 'RUN TERMINATED', WIDTH / 2, 64, 12, UI_COLORS.danger, 900);
    label(ctx, 'انتهت الجولة', WIDTH / 2, 112, 44, UI_COLORS.text, 900);
    label(ctx, `وصلت إلى الموجة ${this.wave}`, WIDTH / 2, 150, 17, UI_COLORS.muted, 700);

    const items = [
      ['SCORE', this.score.toLocaleString('en-US'), UI_COLORS.bullet],
      ['TIME', formatRunTime(this.runTime), UI_COLORS.player],
      ['KILLS', this.stats.kills, UI_COLORS.danger],
      ['BEST COMBO', this.maxCombo, UI_COLORS.success],
      ['SHOTS', this.stats.shots, UI_COLORS.electric],
      ['HITS', this.stats.hits, UI_COLORS.player],
      ['UPGRADES', this.stats.upgrades, UI_COLORS.bullet],
      ['DAMAGE', this.stats.damageTaken, UI_COLORS.danger],
    ];

    items.forEach(([title, value, accent], index) => {
      const column = index % 4;
      const row = Math.floor(index / 4);
      const x = 128 + column * 260;
      const y = 190 + row * 88;
      panel(ctx, x, y, 244, 70, accent, 'rgba(6,11,26,0.9)', 4);
      label(ctx, title, x + 18, y + 22, 9, UI_COLORS.muted, 900, 'left');
      label(ctx, value, x + 220, y + 50, 20, UI_COLORS.text, 900, 'right');
    });

    this.drawButton('العب من جديد', WIDTH / 2 - 180, 400, 360, 60, () => this.startRun(), true);
    this.drawButton('القائمة الرئيسية', WIDTH / 2 - 180, 477, 360, 56, () => this.goToMenu());
  }

  drawPause() {
    const ctx = this.ctx;
    dim(ctx, 0.88);
    label(ctx, 'SYSTEM PAUSED', WIDTH / 2, 172, 12, UI_COLORS.player, 900);
    label(ctx, 'متوقف مؤقتًا', WIDTH / 2, 220, 42, UI_COLORS.text, 900);
    this.drawButton('استكمال', WIDTH / 2 - 170, 270, 340, 56, () => this.resume(), true);
    this.drawButton('إعادة الجولة', WIDTH / 2 - 170, 342, 340, 56, () => this.startRun());
    this.drawButton('القائمة الرئيسية', WIDTH / 2 - 170, 414, 340, 56, () => this.goToMenu());
  }

  drawBanner() {
    const ctx = this.ctx;
    const alpha = clamp(this.banner.time * 1.45, 0, 1);
    const scale = 1 + clamp(this.banner.time - 0.5, 0, 1) * 0.04;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(WIDTH / 2, HEIGHT / 2);
    ctx.scale(scale, scale);
    ctx.fillStyle = 'rgba(4,8,20,0.72)';
    roundedRect(ctx, -230, -58, 460, 112, 14);
    ctx.fill();
    ctx.strokeStyle = UI_COLORS.player;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    label(ctx, this.banner.title, 0, -8, 34, UI_COLORS.text, 900);
    label(ctx, this.banner.subtitle, 0, 28, 14, UI_COLORS.bullet, 700);
    ctx.restore();
  }

  drawButton(text, x, y, width, height, action, primary = false) {
    const hovered = pointInsideRect(this.pointer, { x, y, w: width, h: height });
    const accent = primary ? UI_COLORS.bullet : hovered ? UI_COLORS.player : UI_COLORS.borderBright;
    const fill = primary
      ? hovered ? 'rgba(74,60,18,0.98)' : 'rgba(52,44,18,0.95)'
      : hovered ? 'rgba(17,31,58,0.97)' : 'rgba(8,14,31,0.94)';

    panel(this.ctx, x, y, width, height, accent, fill, primary || hovered ? 16 : 5);
    this.ctx.save();
    this.ctx.fillStyle = accent;
    roundedRect(this.ctx, x, y, 5, height, 3);
    this.ctx.fill();
    this.ctx.restore();
    label(this.ctx, text, x + width / 2, y + height / 2 + 7, 17, primary ? UI_COLORS.bullet : UI_COLORS.text, 900);
    if (hovered) label(this.ctx, 'ENTER', x + width - 18, y + height / 2 + 4, 9, accent, 900, 'right');
    this.addUiRegion(x, y, width, height, action);
  }

  drawTouchControls() {
    const ctx = this.ctx;
    const origin = TOUCH_LAYOUT.move;
    let knobX = origin.x;
    let knobY = origin.y;

    if (this.touchMove) {
      const dx = this.touchMove.x - this.touchMove.originX;
      const dy = this.touchMove.y - this.touchMove.originY;
      const length = Math.hypot(dx, dy);
      const scale = length > 47 ? 47 / length : 1;
      knobX += dx * scale;
      knobY += dy * scale;
    }

    ctx.save();
    ctx.globalAlpha = 0.78;
    ctx.fillStyle = 'rgba(5,12,30,0.55)';
    ctx.strokeStyle = UI_COLORS.player;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = UI_COLORS.player;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, origin.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(98,243,255,0.28)';
    ctx.lineWidth = 1;
    for (let index = 0; index < 4; index += 1) {
      const angle = index * Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(origin.x + Math.cos(angle) * 38, origin.y + Math.sin(angle) * 38);
      ctx.lineTo(origin.x + Math.cos(angle) * 53, origin.y + Math.sin(angle) * 53);
      ctx.stroke();
    }

    const knob = ctx.createRadialGradient(knobX - 6, knobY - 7, 2, knobX, knobY, 28);
    knob.addColorStop(0, '#dfffff');
    knob.addColorStop(0.35, UI_COLORS.player);
    knob.addColorStop(1, 'rgba(39,151,181,0.74)');
    ctx.fillStyle = knob;
    ctx.shadowColor = UI_COLORS.player;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(knobX, knobY, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    this.drawCircleButton(
      TOUCH_LAYOUT.dash.x,
      TOUCH_LAYOUT.dash.y,
      TOUCH_LAYOUT.dash.radius,
      this.player.dashCooldown <= 0 ? 'DASH' : this.player.dashCooldown.toFixed(1),
      UI_COLORS.player,
      () => { this.dashRequested = true; },
    );
    this.drawCircleButton(
      TOUCH_LAYOUT.recall.x,
      TOUCH_LAYOUT.recall.y,
      TOUCH_LAYOUT.recall.radius,
      this.bullet.held ? 'READY' : 'RECALL',
      UI_COLORS.electric,
      () => this.recallBullet(),
    );
    this.drawCircleButton(
      TOUCH_LAYOUT.pause.x,
      TOUCH_LAYOUT.pause.y,
      TOUCH_LAYOUT.pause.radius,
      'PAUSE',
      UI_COLORS.muted,
      () => this.pause(),
    );
  }

  drawCircleButton(x, y, radius, text, color, action) {
    const ctx = this.ctx;
    const hovered = pointInsideRect(this.pointer, {
      x: x - radius,
      y: y - radius,
      w: radius * 2,
      h: radius * 2,
    });
    ctx.save();
    ctx.fillStyle = hovered ? 'rgba(17,29,55,0.92)' : 'rgba(5,11,28,0.72)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.24;
    ctx.beginPath();
    ctx.arc(x, y, radius - 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    label(ctx, text, x, y + 4, 10, color, 900);
    ctx.restore();
    this.addUiRegion(x - radius, y - radius, radius * 2, radius * 2, action);
  }

  getSnapshot() {
    return {
      ...super.getSnapshot(),
      version: VISUAL_DESIGN_VERSION,
      visualDesign: this.visualDesignVersion,
      visualTheme: 'neon-tactical-arena',
      visualEnemyReadability: true,
      redesignedHud: true,
      redesignedMenu: true,
      redesignedUpgradeCards: true,
    };
  }
}
