export const DEFAULT_SIMULATION_HZ = 120;
export const DEFAULT_MAX_CATCH_UP_STEPS = 8;
export const DEFAULT_MAX_FRAME_DELTA = 0.1;

function finiteNonNegative(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

export function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

export function lerp(previous, current, alpha) {
  const a = Number(previous) || 0;
  const b = Number(current) || 0;
  return a + (b - a) * clamp01(alpha);
}

export class FixedStepClock {
  constructor(options = {}) {
    this.simulationHz = Math.max(1, Number(options.simulationHz) || DEFAULT_SIMULATION_HZ);
    this.fixedDt = 1 / this.simulationHz;
    this.maxCatchUpSteps = Math.max(1, Math.trunc(Number(options.maxCatchUpSteps) || DEFAULT_MAX_CATCH_UP_STEPS));
    this.maxFrameDelta = Math.max(this.fixedDt, Number(options.maxFrameDelta) || DEFAULT_MAX_FRAME_DELTA);
    this.accumulator = 0;
    this.lastTimeMs = null;
    this.droppedSeconds = 0;
  }

  reset(timestampMs = null) {
    this.accumulator = 0;
    this.lastTimeMs = Number.isFinite(Number(timestampMs)) ? Number(timestampMs) : null;
  }

  tick(timestampMs, step) {
    const now = Number(timestampMs);
    if (!Number.isFinite(now)) return { frameDelta: 0, steps: 0, alpha: 0, dropped: 0 };

    if (this.lastTimeMs === null) {
      this.lastTimeMs = now;
      return { frameDelta: 0, steps: 0, alpha: 0, dropped: 0 };
    }

    const rawDelta = finiteNonNegative((now - this.lastTimeMs) / 1000, 0);
    this.lastTimeMs = now;
    const frameDelta = Math.min(this.maxFrameDelta, rawDelta);
    this.accumulator += frameDelta;

    let steps = 0;
    while (this.accumulator + 1e-12 >= this.fixedDt && steps < this.maxCatchUpSteps) {
      step?.(this.fixedDt, steps);
      this.accumulator -= this.fixedDt;
      steps += 1;
    }

    let dropped = 0;
    if (this.accumulator >= this.fixedDt) {
      dropped = this.accumulator - (this.accumulator % this.fixedDt);
      this.accumulator %= this.fixedDt;
      this.droppedSeconds += dropped;
    }

    return {
      rawDelta,
      frameDelta,
      steps,
      alpha: clamp01(this.accumulator / this.fixedDt),
      dropped,
    };
  }
}

function percentile(sorted, ratio) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index];
}

export class FramePacer {
  constructor(options = {}) {
    this.windowSize = Math.max(30, Math.trunc(Number(options.windowSize) || 240));
    this.longFrameMs = Math.max(12, Number(options.longFrameMs) || 25);
    this.samples = [];
    this.sampleCursor = 0;
    this.lastTimestamp = null;
    this.totalFrames = 0;
    this.longFrames = 0;
    this.lastSimulationSteps = 0;
    this.totalSimulationSteps = 0;
    this.timingResetCount = 0;
  }

  resetTiming(timestampMs = null) {
    this.lastTimestamp = Number.isFinite(Number(timestampMs)) ? Number(timestampMs) : null;
    this.lastSimulationSteps = 0;
    this.timingResetCount += 1;
  }

  reset(timestampMs = null, options = {}) {
    if (options?.clearSamples) {
      this.samples.length = 0;
      this.sampleCursor = 0;
      this.totalFrames = 0;
      this.longFrames = 0;
      this.totalSimulationSteps = 0;
    }
    this.resetTiming(timestampMs);
  }

  clear(timestampMs = null) {
    this.reset(timestampMs, { clearSamples: true });
  }

  sample(timestampMs, simulationSteps = 0) {
    const now = Number(timestampMs);
    if (!Number.isFinite(now)) return;
    if (this.lastTimestamp !== null) {
      const delta = Math.max(0, now - this.lastTimestamp);
      // Background/suspended intervals are excluded explicitly through
      // resetTiming() on visibility changes. Any positive gap that reaches this
      // visible render path is therefore real telemetry, including severe
      // long frames; silently dropping >=1s gaps can hide the exact hitch the
      // diagnostics are intended to surface.
      if (delta > 0) {
        if (this.samples.length < this.windowSize) {
          this.samples.push(delta);
        } else {
          this.samples[this.sampleCursor] = delta;
          this.sampleCursor = (this.sampleCursor + 1) % this.windowSize;
        }
        if (delta >= this.longFrameMs) this.longFrames += 1;
      }
    }
    this.lastTimestamp = now;
    this.totalFrames += 1;
    this.lastSimulationSteps = Math.max(0, Number(simulationSteps) || 0);
    this.totalSimulationSteps += this.lastSimulationSteps;
  }

  snapshot() {
    const sorted = [...this.samples].sort((a, b) => a - b);
    const average = sorted.length ? sorted.reduce((sum, value) => sum + value, 0) / sorted.length : 0;
    const median = percentile(sorted, 0.5);
    const p95 = percentile(sorted, 0.95);
    const p99 = percentile(sorted, 0.99);
    const cadence = median || average;
    const estimatedRefreshHz = cadence > 0 ? Math.max(1, Math.min(360, 1000 / cadence)) : 0;
    return {
      sampleCount: sorted.length,
      renderFps: average > 0 ? 1000 / average : 0,
      estimatedRefreshHz,
      averageFrameMs: average,
      medianFrameMs: median,
      p95FrameMs: p95,
      p99FrameMs: p99,
      longFrameCount: this.longFrames,
      simulationStepsPerFrame: this.lastSimulationSteps,
      averageSimulationStepsPerFrame: this.totalFrames > 0 ? this.totalSimulationSteps / this.totalFrames : 0,
      timingResetCount: this.timingResetCount,
    };
  }
}

export function simulateRenderSchedule({ hz, seconds = 1, clockOptions = {} } = {}) {
  const refreshHz = Math.max(1, Number(hz) || 60);
  const duration = Math.max(0, Number(seconds) || 0);
  const clock = new FixedStepClock(clockOptions);
  let simulatedSeconds = 0;
  let steps = 0;
  const frameMs = 1000 / refreshHz;
  const frameCount = Math.ceil(duration * refreshHz);
  clock.tick(0, () => {});
  for (let frame = 1; frame <= frameCount; frame += 1) {
    const timestamp = Math.min(duration * 1000, frame * frameMs);
    clock.tick(timestamp, (dt) => {
      simulatedSeconds += dt;
      steps += 1;
    });
  }
  return { simulatedSeconds, steps, alpha: clock.accumulator / clock.fixedDt, droppedSeconds: clock.droppedSeconds };
}
