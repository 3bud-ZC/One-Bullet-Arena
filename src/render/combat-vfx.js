/*
 * Combat VFX.
 *
 * One coherent effect language for the one-bullet loop: fire -> travel ->
 * ricochet -> hit -> kill -> recall -> catch.
 *
 * Design rules this file exists to enforce:
 *
 * - Directional, not radial. Sparks and shards inherit a vector from the event
 *   that produced them, so the player reads incoming and outgoing direction
 *   instead of a symmetric puff.
 * - Geometric, not glowing. Effects are short line segments and thin triangles.
 *   There are no radial gradients and no shadowBlur anywhere in here; both are
 *   per-draw allocations that showed up as dense-combat cost previously.
 * - Bounded. Every effect class is a fixed-size pool allocated once. Emitting
 *   past capacity overwrites the oldest entry rather than growing an array, so
 *   dense combat cannot produce an allocation spike or an unbounded filter.
 * - Presentation only. Nothing here is read by gameplay. Lifetimes advance on
 *   the fixed simulation step so effects are refresh-rate independent.
 *
 * Colour: gold is the bullet and only the bullet. Cyan is player/system energy.
 * Enemy events carry the archetype colour passed in by the caller.
 */

const GOLD = '#ffd441';

// Pool sizes are the hard ceiling on simultaneous effects of each kind. Sized
// against an 18-enemy wave with a bank chain running.
const POOL = Object.freeze({ sparks: 220, streaks: 48, marks: 24, shards: 160 });

// Quality tiers scale emission counts, never lifetimes or gameplay.
const TIER_SCALE = Object.freeze({ ULTRA: 1.25, HIGH: 1, BALANCED: 0.7, PERFORMANCE: 0.45 });

function makeSpark() {
  return { life: 0, max: 1, x: 0, y: 0, vx: 0, vy: 0, len: 0, width: 1, color: GOLD, drag: 0.9 };
}

function makeStreak() {
  return { life: 0, max: 1, x: 0, y: 0, dx: 0, dy: 0, len: 0, width: 2, color: GOLD };
}

function makeMark() {
  return { life: 0, max: 1, x: 0, y: 0, nx: 0, ny: 0, size: 0, color: GOLD };
}

function makeShard() {
  return { life: 0, max: 1, x: 0, y: 0, vx: 0, vy: 0, spin: 0, angle: 0, size: 0, color: GOLD };
}

class Pool {
  constructor(size, factory) {
    this.items = Array.from({ length: size }, factory);
    this.cursor = 0;
  }

  // Never grows. When full, the oldest slot is reused, which keeps the newest
  // (most relevant) feedback and caps memory and draw cost.
  take() {
    const item = this.items[this.cursor];
    this.cursor = (this.cursor + 1) % this.items.length;
    return item;
  }
}

export class CombatVfx {
  constructor() {
    this.sparks = new Pool(POOL.sparks, makeSpark);
    this.streaks = new Pool(POOL.streaks, makeStreak);
    this.marks = new Pool(POOL.marks, makeMark);
    this.shards = new Pool(POOL.shards, makeShard);
    this.reducedMotion = false;
    this.tier = 'HIGH';
  }

  setQuality(tier) {
    this.tier = TIER_SCALE[tier] ? tier : 'HIGH';
  }

  get scale() {
    return this.reducedMotion ? 0.35 : (TIER_SCALE[this.tier] ?? 1);
  }

  count(base) {
    return Math.max(1, Math.round(base * this.scale));
  }

  // ---------------------------------------------------------------- emitters

  // Muzzle: a tight directional wedge plus a departure streak. No circle.
  fire(x, y, dx, dy) {
    this.streak(x + dx * 14, y + dy * 14, dx, dy, 46, 0.1, GOLD, 3);
    const n = this.count(5);
    for (let i = 0; i < n; i += 1) {
      const spread = (i / Math.max(1, n - 1) - 0.5) * 0.5;
      const ax = dx * Math.cos(spread) - dy * Math.sin(spread);
      const ay = dx * Math.sin(spread) + dy * Math.cos(spread);
      this.spark(x + dx * 12, y + dy * 12, ax * 320, ay * 320, 0.12, GOLD, 9, 1.6);
    }
  }

  /*
   * Ricochet. The one effect that must communicate geometry: incoming vector,
   * contact, outgoing vector. Sparks are emitted along the reflected direction
   * and rake across the surface, and a short mark is left on the wall.
   * `chain` escalates a bank run so BANK x5 does not look like BANK x1.
   */
  ricochet(x, y, inX, inY, outX, outY, chain = 0) {
    const step = Math.min(4, chain);
    this.mark(x, y, outX, outY, 7 + step * 1.6);
    this.streak(x, y, outX, outY, 22 + step * 8, 0.09 + step * 0.012, GOLD, 2 + step * 0.4);

    const n = this.count(4 + step * 2);
    for (let i = 0; i < n; i += 1) {
      // Spray between the reflected vector and the surface tangent.
      const t = (i / n) * 1.5 - 0.75;
      const sx = outX * Math.cos(t) - outY * Math.sin(t);
      const sy = outX * Math.sin(t) + outY * Math.cos(t);
      const speed = 190 + Math.abs(t) * 130 + step * 40;
      this.spark(x, y, sx * speed, sy * speed, 0.16 + step * 0.02, GOLD, 7 + step, 1.4);
    }
  }

  // Enemy hit: a directional impulse along the bullet vector, in the enemy's
  // own colour so the archetype stays identifiable at a glance.
  hit(x, y, dx, dy, color) {
    this.streak(x, y, dx, dy, 18, 0.07, color, 2.5);
    const n = this.count(4);
    for (let i = 0; i < n; i += 1) {
      const t = (i / n) * 1.1 - 0.55;
      const sx = dx * Math.cos(t) - dy * Math.sin(t);
      const sy = dx * Math.sin(t) + dy * Math.cos(t);
      this.spark(x, y, sx * 220, sy * 220, 0.14, color, 6, 1.3);
    }
  }

  /*
   * Death. Archetype-aware breakup rather than one generic burst:
   *   scout    quick sharp collapse, few fast shards
   *   brute    heavier, slower, larger fragments
   *   sniper   precise fracture along one axis
   *   splitter two opposed halves, reinforcing the split mechanic
   *   warden   guard ring fails first, then the body
   *   guardian milestone-weight breakup
   */
  kill(x, y, type, color, radius) {
    const profile = DEATH[type] || DEATH.default;
    const n = this.count(profile.shards);
    for (let i = 0; i < n; i += 1) {
      const angle = profile.axis !== null
        ? profile.axis + (i % 2 ? 0.32 : -0.32) + (i / n) * profile.spread
        : (i / n) * Math.PI * 2;
      const speed = profile.speed * (0.65 + (i % 3) * 0.22);
      this.shard(
        x, y,
        Math.cos(angle) * speed, Math.sin(angle) * speed,
        profile.life, color, radius * profile.size,
      );
    }
    if (profile.ring) {
      const rings = this.count(profile.ring);
      for (let i = 0; i < rings; i += 1) {
        const angle = (i / rings) * Math.PI * 2;
        this.spark(x, y, Math.cos(angle) * 150, Math.sin(angle) * 150, 0.2, color, 8, 1.2);
      }
    }
  }

  // Recall: the bullet has become a returning object. Short chevrons trailing
  // behind it, pointing back toward the player, tightening as it closes.
  recallPulse(x, y, dx, dy, urgency) {
    this.streak(x - dx * 10, y - dy * 10, dx, dy, 16 + urgency * 14, 0.12, '#62d5f3', 1.6 + urgency);
  }

  // Normal catch closes the loop quietly; perfect catch is a sharp, rare,
  // four-point geometric confirmation rather than a radial explosion.
  catchLoop(x, y, perfect) {
    if (!perfect) {
      const n = this.count(4);
      for (let i = 0; i < n; i += 1) {
        const angle = (i / n) * Math.PI * 2;
        this.spark(x, y, Math.cos(angle) * 90, Math.sin(angle) * 90, 0.14, '#62d5f3', 6, 1.4);
      }
      return;
    }
    for (let i = 0; i < 4; i += 1) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      this.streak(x, y, Math.cos(angle), Math.sin(angle), 30, 0.2, GOLD, 2.5);
    }
  }

  // ------------------------------------------------------------- primitives

  spark(x, y, vx, vy, life, color, len, width) {
    const s = this.sparks.take();
    s.life = life; s.max = life; s.x = x; s.y = y; s.vx = vx; s.vy = vy;
    s.len = len; s.width = width; s.color = color; s.drag = 0.88;
  }

  streak(x, y, dx, dy, len, life, color, width) {
    const s = this.streaks.take();
    s.life = life; s.max = life; s.x = x; s.y = y; s.dx = dx; s.dy = dy;
    s.len = len; s.width = width; s.color = color;
  }

  mark(x, y, nx, ny, size) {
    const m = this.marks.take();
    m.life = 0.75; m.max = 0.75; m.x = x; m.y = y; m.nx = nx; m.ny = ny; m.size = size; m.color = GOLD;
  }

  shard(x, y, vx, vy, life, color, size) {
    const s = this.shards.take();
    s.life = life; s.max = life; s.x = x; s.y = y; s.vx = vx; s.vy = vy;
    s.angle = Math.atan2(vy, vx); s.spin = (vx + vy) * 0.02; s.size = size; s.color = color;
  }

  // ------------------------------------------------------------------ frame

  // Fixed-step: iterates fixed-size pools in place, allocates nothing, and
  // never filters or reallocates an array.
  update(dt) {
    const step = Math.max(0, Number(dt) || 0);
    if (step <= 0) return;

    // Drag was recomputed with Math.pow per particle per tick. The exponent
    // only depends on the timestep, so it is computed once per update instead
    // of up to 380 times — this was the dominant cost of the whole system.
    const sparkDrag = Math.pow(0.88, step * 60);
    const shardDrag = Math.pow(0.9, step * 60);

    let live = 0;
    for (const s of this.sparks.items) {
      if (s.life <= 0) continue;
      live += 1;
      s.life -= step;
      s.x += s.vx * step;
      s.y += s.vy * step;
      s.vx *= sparkDrag;
      s.vy *= sparkDrag;
    }
    for (const s of this.streaks.items) {
      if (s.life <= 0) continue;
      live += 1;
      s.life -= step;
    }
    for (const m of this.marks.items) {
      if (m.life <= 0) continue;
      live += 1;
      m.life -= step;
    }
    for (const s of this.shards.items) {
      if (s.life <= 0) continue;
      live += 1;
      s.life -= step;
      s.x += s.vx * step;
      s.y += s.vy * step;
      s.angle += s.spin * step;
      s.vx *= shardDrag;
      s.vy *= shardDrag;
    }
    this.liveCount = live;
  }

  // One save/restore for the whole system, and no gradient or shadow work.
  draw(ctx) {
    // Skip the whole layer, including its save/restore, when nothing is live.
    // Most frames in a normal wave emit nothing at all.
    if (!this.liveCount) return;

    ctx.save();
    ctx.lineCap = 'round';

    for (const m of this.marks.items) {
      if (m.life <= 0) continue;
      const t = m.life / m.max;
      ctx.globalAlpha = t * 0.5;
      ctx.strokeStyle = m.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(m.x - m.ny * m.size, m.y + m.nx * m.size);
      ctx.lineTo(m.x + m.ny * m.size, m.y - m.nx * m.size);
      ctx.stroke();
    }

    for (const s of this.streaks.items) {
      if (s.life <= 0) continue;
      const t = s.life / s.max;
      ctx.globalAlpha = t;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width * t;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + s.dx * s.len * t, s.y + s.dy * s.len * t);
      ctx.stroke();
    }

    for (const s of this.sparks.items) {
      if (s.life <= 0) continue;
      const t = s.life / s.max;
      const speed = Math.hypot(s.vx, s.vy) || 1;
      const ux = s.vx / speed;
      const uy = s.vy / speed;
      ctx.globalAlpha = t;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = Math.max(0.6, s.width * t);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - ux * s.len * t, s.y - uy * s.len * t);
      ctx.stroke();
    }

    for (const s of this.shards.items) {
      if (s.life <= 0) continue;
      const t = s.life / s.max;
      ctx.globalAlpha = t;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 1.6;
      const size = s.size * (0.4 + t * 0.6);
      const cos = Math.cos(s.angle);
      const sin = Math.sin(s.angle);
      ctx.beginPath();
      ctx.moveTo(s.x + cos * size, s.y + sin * size);
      ctx.lineTo(s.x - sin * size * 0.5, s.y + cos * size * 0.5);
      ctx.lineTo(s.x - cos * size, s.y - sin * size);
      ctx.stroke();
    }

    ctx.restore();
  }
}

const DEATH = Object.freeze({
  scout: { shards: 5, speed: 300, life: 0.26, size: 0.42, spread: Math.PI * 2, axis: null, ring: 0 },
  brute: { shards: 9, speed: 190, life: 0.46, size: 0.62, spread: Math.PI * 2, axis: null, ring: 6 },
  sniper: { shards: 6, speed: 260, life: 0.32, size: 0.4, spread: 0.9, axis: 0, ring: 0 },
  charger: { shards: 6, speed: 330, life: 0.28, size: 0.45, spread: 1.2, axis: 0, ring: 0 },
  // Two opposed groups so the split reads before the halves even spawn.
  splitter: { shards: 8, speed: 240, life: 0.36, size: 0.5, spread: 0.5, axis: Math.PI / 2, ring: 0 },
  warden: { shards: 8, speed: 210, life: 0.42, size: 0.55, spread: Math.PI * 2, axis: null, ring: 10 },
  guardian: { shards: 16, speed: 300, life: 0.7, size: 0.7, spread: Math.PI * 2, axis: null, ring: 16 },
  default: { shards: 6, speed: 250, life: 0.3, size: 0.45, spread: Math.PI * 2, axis: null, ring: 0 },
});
