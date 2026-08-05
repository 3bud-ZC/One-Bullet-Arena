const STORAGE_KEY = 'one-bullet-clean-audio';
const DEFAULTS = Object.freeze({ music: 0.3, sfx: 0.68, muted: false });

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
    this.master.connect(this.context.destination);
    this.startMusic();
    return this.context;
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

  play(name) {
    const sounds = {
      click: () => this.tone({ frequency: 520, duration: 0.05, type: 'square', volume: 0.05, slide: 90 }),
      shoot: () => { this.tone({ frequency: 180, duration: 0.1, type: 'sawtooth', volume: 0.12, slide: 360 }); this.noise(0.04, 0.045); },
      'enemy-shot': () => this.tone({ frequency: 320, duration: 0.08, type: 'square', volume: 0.045, slide: -80 }),
      ricochet: () => this.tone({ frequency: 760, duration: 0.07, type: 'triangle', volume: 0.085, slide: -210 }),
      hit: () => { this.tone({ frequency: 120, duration: 0.08, type: 'square', volume: 0.11, slide: -40 }); this.noise(0.05, 0.05); },
      kill: () => this.tone({ frequency: 260, duration: 0.17, type: 'sawtooth', volume: 0.11, slide: 470 }),
      recover: () => this.tone({ frequency: 420, duration: 0.15, type: 'triangle', volume: 0.1, slide: 460 }),
      dash: () => { this.tone({ frequency: 210, duration: 0.1, type: 'sine', volume: 0.09, slide: 280 }); this.noise(0.06, 0.04); },
      shield: () => this.tone({ frequency: 520, duration: 0.16, type: 'triangle', volume: 0.11, slide: -170 }),
      damage: () => { this.tone({ frequency: 95, duration: 0.22, type: 'sawtooth', volume: 0.15, slide: -30 }); this.noise(0.12, 0.07); },
      upgrade: () => {
        this.tone({ frequency: 330, duration: 0.12, type: 'triangle', volume: 0.1, slide: 230 });
        window.setTimeout(() => this.tone({ frequency: 590, duration: 0.15, type: 'triangle', volume: 0.09, slide: 210 }), 85);
      },
    };
    sounds[name]?.();
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
