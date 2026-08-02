const STORAGE_KEY = 'one-bullet-arena-audio-settings';
const DEFAULTS = { music: 0.34, sfx: 0.72, muted: false };

function safeLoad() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; }
  catch { return { ...DEFAULTS }; }
}

export class AudioEngine {
  constructor() {
    this.settings = safeLoad();
    this.context = null;
    this.master = null;
    this.musicTimer = null;
    this.musicStep = 0;
    this.scene = 'menu';
  }

  ensure() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume();
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    if (this.master) this.master.gain.value = this.settings.muted ? 0 : 1;
  }

  setMusic(value) { this.settings.music = Math.max(0, Math.min(1, value)); this.save(); }
  setSfx(value) { this.settings.sfx = Math.max(0, Math.min(1, value)); this.save(); }
  toggleMute() { this.settings.muted = !this.settings.muted; this.save(); return this.settings.muted; }
  setScene(scene) { this.scene = scene; }

  tone({ frequency = 440, duration = 0.1, type = 'sine', volume = 0.12, slide = 0 }) {
    const context = this.ensure();
    if (!context || this.settings.muted || this.settings.sfx <= 0) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (slide !== 0) oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency + slide), now + duration);
    gain.gain.setValueAtTime(Math.max(0.0001, volume * this.settings.sfx), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  noise(duration = 0.08, volume = 0.08) {
    const context = this.ensure();
    if (!context || this.settings.muted || this.settings.sfx <= 0) return;
    const length = Math.floor(context.sampleRate * duration);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) channel[index] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(volume * this.settings.sfx, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    source.connect(gain);
    gain.connect(this.master);
    source.start();
  }

  play(name) {
    const map = {
      click: () => this.tone({ frequency: 520, duration: 0.05, type: 'square', volume: 0.055, slide: 90 }),
      shoot: () => { this.tone({ frequency: 180, duration: 0.1, type: 'sawtooth', volume: 0.13, slide: 380 }); this.noise(0.045, 0.05); },
      ricochet: () => this.tone({ frequency: 760, duration: 0.07, type: 'triangle', volume: 0.09, slide: -220 }),
      hit: () => { this.tone({ frequency: 120, duration: 0.085, type: 'square', volume: 0.12, slide: -45 }); this.noise(0.055, 0.055); },
      kill: () => this.tone({ frequency: 260, duration: 0.18, type: 'sawtooth', volume: 0.12, slide: 520 }),
      recover: () => this.tone({ frequency: 420, duration: 0.16, type: 'triangle', volume: 0.12, slide: 520 }),
      dash: () => { this.tone({ frequency: 210, duration: 0.11, type: 'sine', volume: 0.1, slide: 300 }); this.noise(0.07, 0.045); },
      damage: () => { this.tone({ frequency: 95, duration: 0.24, type: 'sawtooth', volume: 0.17, slide: -35 }); this.noise(0.13, 0.08); },
      explosion: () => { this.tone({ frequency: 75, duration: 0.34, type: 'square', volume: 0.17, slide: -30 }); this.noise(0.24, 0.13); },
      upgrade: () => { this.tone({ frequency: 330, duration: 0.13, type: 'triangle', volume: 0.11, slide: 250 }); setTimeout(() => this.tone({ frequency: 590, duration: 0.17, type: 'triangle', volume: 0.1, slide: 240 }), 90); },
      boss: () => { this.tone({ frequency: 65, duration: 0.7, type: 'sawtooth', volume: 0.2, slide: 25 }); this.noise(0.45, 0.09); },
      victory: () => [392, 523, 659, 784].forEach((frequency, index) => setTimeout(() => this.tone({ frequency, duration: 0.25, type: 'triangle', volume: 0.11, slide: 30 }), index * 130)),
    };
    map[name]?.();
  }

  startMusic() {
    if (this.musicTimer) return;
    this.musicTimer = window.setInterval(() => this.musicTick(), 460);
  }

  musicTick() {
    const context = this.ensure();
    if (!context || this.settings.muted || this.settings.music <= 0) return;
    const sequences = {
      menu: [110, 0, 165, 0, 147, 0, 196, 0],
      combat: [82, 123, 82, 147, 92, 138, 92, 165],
      boss: [65, 98, 73, 110, 65, 123, 73, 131],
    };
    const sequence = sequences[this.scene] || sequences.menu;
    const frequency = sequence[this.musicStep % sequence.length];
    this.musicStep += 1;
    if (!frequency) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = this.scene === 'boss' ? 'sawtooth' : 'triangle';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, this.settings.music * 0.045), now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + 0.42);
  }
}
