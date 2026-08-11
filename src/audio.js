const STORAGE_KEY = 'one-bullet-clean-audio';
const DEFAULTS = Object.freeze({ music: 0.3, sfx: 0.68, muted: false });
const MAX_CONCURRENT_VOICES = 14;

/*
 * Minimum seconds between repeats of the same cue.
 *
 * The hierarchy is deliberate: the bullet's own events (fire, ricochet, catch)
 * are never throttled hard because they are the game's identity and happen at
 * most a few times a second. Enemy hits are the ones that machine-gun in dense
 * waves, so they are spaced enough to stay legible as individual impacts.
 * Milestone cues are effectively unthrottled but cannot double-trigger.
 */
const RATE_LIMITS = Object.freeze({
  shoot: 0.03,
  ricochet: 0.045,
  hit: 0.05,
  kill: 0.06,
  'enemy-shot': 0.05,
  damage: 0.12,
  dash: 0.08,
  catch: 0.05,
  'perfect-catch': 0.08,
  precision: 0.08,
  overdrive: 0.4,
  'guardian-spawn': 1,
  'guardian-phase': 0.5,
  'guardian-down': 1,
  milestone: 0.5,
});

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      music: clamp(saved.music ?? DEFAULTS.music),
      sfx: clamp(saved.sfx ?? DEFAULTS.sfx),
      muted: Boolean(saved.muted ?? DEFAULTS.muted),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export class AudioEngine {
  constructor() {
    this.settings = loadSettings();
    this.context = null;
    this.master = null;
    this.musicTimer = null;
    this.musicStep = 0;
    this.scene = 'menu';
  }

  ensure() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      return this.context;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    this.context = new AudioContextClass();
    this.master = this.context.createGain();
    this.master.gain.value = this.settings.muted ? 0 : 1;
    // Dense combat can stack a dozen voices in the same few milliseconds.
    // A compressor keeps that from clipping without lowering quiet moments.
    if (this.context.createDynamicsCompressor) {
      this.limiter = this.context.createDynamicsCompressor();
      this.limiter.threshold.value = -14;
      this.limiter.knee.value = 12;
      this.limiter.ratio.value = 8;
      this.limiter.attack.value = 0.003;
      this.limiter.release.value = 0.18;
      this.master.connect(this.limiter);
      this.limiter.connect(this.context.destination);
    } else {
      this.master.connect(this.context.destination);
    }
    this.startMusic();
    return this.context;
  }

  // Per-event rate limiting. Combat fires the same cue many times per second
  // (18 enemies, ricochet chains), which both clips and stops communicating.
  allow(name, minimumGap) {
    const context = this.context;
    if (!context) return false;
    this.lastPlayed = this.lastPlayed || Object.create(null);
    const now = context.currentTime;
    if (now - (this.lastPlayed[name] ?? -Infinity) < minimumGap) return false;
    this.lastPlayed[name] = now;
    return true;
  }

  // Hard ceiling on simultaneous voices so a burst cannot spawn unbounded nodes.
  reserveVoice() {
    const context = this.context;
    if (!context) return false;
    const now = context.currentTime;
    this.voices = (this.voices || []).filter((expiry) => expiry > now);
    if (this.voices.length >= MAX_CONCURRENT_VOICES) return false;
    return true;
  }

  trackVoice(duration) {
    if (!this.context) return;
    this.voices = this.voices || [];
    this.voices.push(this.context.currentTime + Math.max(0.02, duration));
  }

  save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings)); }
    catch { /* Audio remains usable when storage is unavailable. */ }
    if (this.master) this.master.gain.value = this.settings.muted ? 0 : 1;
  }

  toggleMute() {
    this.settings.muted = !this.settings.muted;
    this.save();
    return this.settings.muted;
  }

  setScene(scene) {
    this.scene = scene === 'combat' ? 'combat' : 'menu';
  }

  tone({ frequency = 440, duration = 0.1, type = 'sine', volume = 0.1, slide = 0 }) {
    const context = this.ensure();
    if (!context || this.settings.muted || this.settings.sfx <= 0) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(30, frequency), now);
    if (slide !== 0) oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency + slide), now + duration);
    gain.gain.setValueAtTime(Math.max(0.0001, volume * this.settings.sfx), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
    this.trackVoice(duration);
  }

  noise(duration = 0.07, volume = 0.06) {
    const context = this.ensure();
    if (!context || this.settings.muted || this.settings.sfx <= 0) return;
    const length = Math.floor(context.sampleRate * duration);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) channel[index] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(Math.max(0.0001, volume * this.settings.sfx), context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    source.connect(gain);
    gain.connect(this.master);
    source.start();
  }

  /*
   * Sound design notes.
   *
   * The vocabulary is built so that pitch direction carries meaning: the bullet
   * leaving the player rises, the bullet returning to the player falls and then
   * resolves upward on the catch. Enemy events sit lower and drier than bullet
   * events so the single bullet stays the most audible object in a dense wave.
   * `chord` layers a few detuned partials for the moments that should feel
   * larger than a single blip.
   */
  play(name) {
    const sounds = {
      click: () => this.tone({ frequency: 520, duration: 0.05, type: 'square', volume: 0.05, slide: 90 }),

      // --- the bullet -------------------------------------------------
      shoot: () => {
        this.tone({ frequency: 190, duration: 0.09, type: 'sawtooth', volume: 0.11, slide: 420 });
        this.tone({ frequency: 640, duration: 0.05, type: 'square', volume: 0.04, slide: 260 });
        this.noise(0.035, 0.05);
      },
      ricochet: () => {
        this.tone({ frequency: 880, duration: 0.06, type: 'triangle', volume: 0.08, slide: -300 });
        this.noise(0.02, 0.028);
      },
      recall: () => this.tone({ frequency: 700, duration: 0.16, type: 'sine', volume: 0.075, slide: -380 }),
      catch: () => this.tone({ frequency: 380, duration: 0.09, type: 'triangle', volume: 0.085, slide: 220 }),
      'perfect-catch': () => this.chord([520, 780, 1040], 0.2, 'triangle', 0.075, 180),
      precision: () => {
        this.tone({ frequency: 1180, duration: 0.09, type: 'square', volume: 0.06, slide: 420 });
        this.tone({ frequency: 590, duration: 0.12, type: 'triangle', volume: 0.05, slide: 260 });
      },

      // --- enemies ----------------------------------------------------
      'enemy-shot': () => this.tone({ frequency: 320, duration: 0.08, type: 'square', volume: 0.04, slide: -80 }),
      hit: () => {
        this.tone({ frequency: 150, duration: 0.06, type: 'square', volume: 0.085, slide: -60 });
        this.noise(0.035, 0.04);
      },
      kill: () => {
        this.tone({ frequency: 240, duration: 0.14, type: 'sawtooth', volume: 0.095, slide: 380 });
        this.noise(0.06, 0.035);
      },

      // --- the player -------------------------------------------------
      recover: () => this.tone({ frequency: 420, duration: 0.15, type: 'triangle', volume: 0.1, slide: 460 }),
      dash: () => { this.tone({ frequency: 210, duration: 0.09, type: 'sine', volume: 0.08, slide: 300 }); this.noise(0.05, 0.035); },
      shield: () => this.tone({ frequency: 520, duration: 0.16, type: 'triangle', volume: 0.1, slide: -170 }),
      damage: () => { this.tone({ frequency: 95, duration: 0.22, type: 'sawtooth', volume: 0.14, slide: -30 }); this.noise(0.12, 0.06); },

      // --- progression and milestones ---------------------------------
      upgrade: () => this.chord([330, 495, 660], 0.22, 'triangle', 0.07, 200),
      overdrive: () => this.chord([160, 240, 320, 480], 0.5, 'sawtooth', 0.07, 150),
      milestone: () => this.chord([262, 392, 523], 0.36, 'triangle', 0.065, 120),
      'guardian-spawn': () => {
        // Descending and heavy: something large has arrived.
        this.chord([190, 96, 64], 0.72, 'sawtooth', 0.085, -40);
        this.noise(0.42, 0.05);
      },
      'guardian-phase': () => this.chord([300, 450], 0.3, 'square', 0.06, -120),
      'guardian-down': () => {
        this.chord([120, 180, 240, 360], 0.85, 'sawtooth', 0.085, 90);
        this.noise(0.5, 0.055);
      },
    };

    if (!sounds[name]) return;
    if (!this.ensure()) return;
    if (!this.allow(name, RATE_LIMITS[name] ?? 0.04)) return;
    if (!this.reserveVoice()) return;
    sounds[name]();
  }

  // Layered partials for the handful of events that should feel bigger than a
  // single tone. Detune is small so it reads as weight, not as an out-of-tune
  // stack, and each partial counts toward the voice budget.
  chord(frequencies, duration, type, volume, slide = 0) {
    frequencies.forEach((frequency, index) => {
      this.tone({
        frequency,
        duration: duration * (1 - index * 0.08),
        type,
        volume: volume / (1 + index * 0.55),
        slide,
      });
    });
  }

  startMusic() {
    if (this.musicTimer) return;
    this.musicTimer = window.setInterval(() => this.musicTick(), 470);
  }

  musicTick() {
    const context = this.context;
    if (!context || this.settings.muted || this.settings.music <= 0) return;
    const sequences = {
      menu: [110, 0, 165, 0, 147, 0, 196, 0],
      combat: [82, 123, 82, 147, 92, 138, 92, 165],
    };
    const sequence = sequences[this.scene];
    const frequency = sequence[this.musicStep % sequence.length];
    this.musicStep += 1;
    if (!frequency) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, this.settings.music * 0.042), now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + 0.42);
  }
}

function clamp(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}
