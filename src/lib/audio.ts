'use client';
import { create } from 'zustand';

/**
 * Procedural sound engine (Web Audio). Everything is synthesised at runtime, so there
 * are no licensing issues and no audio downloads. Silent until the visitor enables it.
 *
 * Buses: master -> [ambience(duckable), music(duckable), effects]
 */

export type SfxName =
  | 'click' | 'tab' | 'pickup' | 'place' | 'tap' | 'swipe' | 'expand' | 'back' | 'hover' | 'test' | 'sip' | 'cup' | 'page';
export type Mood = 'evening' | 'rain' | 'focus';

type Levels = { master: number; ambience: number; music: number; effects: number; rain: boolean };

const DEFAULTS: Levels = { master: 0.8, ambience: 0.5, music: 0.5, effects: 0.8, rain: false };

function loadLevels(): Levels {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('ameils-desk:audio') || '{}') };
  } catch {
    return DEFAULTS;
  }
}

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

class Engine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  amb!: GainNode;
  mus!: GainNode;
  sfx!: GainNode;
  duckGain!: GainNode;
  rainGain!: GainNode;
  murmur!: GainNode;
  private timers: number[] = [];
  private nextBar = 0;
  private bar = 0;
  mood: Mood = 'evening';
  private started = false;

  private noise(seconds: number, color: 'white' | 'pink' | 'brown') {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        if (color === 'white') d[i] = w;
        else if (color === 'pink') {
          b0 = 0.99765 * b0 + w * 0.099046;
          b1 = 0.963 * b1 + w * 0.2965164;
          b2 = 0.57 * b2 + w * 1.0526913;
          d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
        } else {
          last = (last + 0.02 * w) / 1.02;
          d[i] = last * 3.5;
        }
      }
      // crossfade the loop seam
      const fade = Math.floor(ctx.sampleRate * 0.05);
      for (let i = 0; i < fade; i++) {
        const t = i / fade;
        d[i] = d[i] * t + d[len - fade + i] * (1 - t);
      }
    }
    return buf;
  }

  private loop(buf: AudioBuffer) {
    const s = this.ctx!.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.loopEnd = buf.duration - 0.05;
    return s;
  }

  /** Must be called from a user gesture (click/keydown) for Chrome, Edge and Safari. */
  unlock(): AudioContext {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC({ latencyHint: 'interactive' });
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = 0;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 3;
      this.master.connect(comp).connect(ctx.destination);
      this.duckGain = ctx.createGain();
      this.duckGain.connect(this.master);
      this.amb = ctx.createGain();
      this.mus = ctx.createGain();
      this.sfx = ctx.createGain();
      this.amb.connect(this.duckGain);
      this.mus.connect(this.duckGain);
      this.sfx.connect(this.master);
      // Safari: play a 1-sample silent buffer inside the gesture to fully unlock output.
      const b = ctx.createBuffer(1, 1, 22050);
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.connect(ctx.destination);
      s.start(0);
    }
    if (this.ctx.state !== 'running') void this.ctx.resume();
    return this.ctx;
  }

  start(levels: Levels) {
    const ctx = this.unlock();
    if (!this.started) {
      this.started = true;
      this.buildAmbience();
      this.nextBar = ctx.currentTime + 0.3;
      this.timers.push(window.setInterval(() => this.scheduleMusic(), 250));
      this.scheduleClink();
    }
    this.apply(levels);
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setTargetAtTime(levels.master, ctx.currentTime, 0.25);
  }

  stop() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(0, t, 0.12);
  }

  apply(l: Levels) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.amb.gain.setTargetAtTime(l.ambience, t, 0.1);
    this.mus.gain.setTargetAtTime(l.music * 0.9, t, 0.1);
    this.sfx.gain.setTargetAtTime(l.effects, t, 0.05);
    this.rainOn = l.rain;
    this.rainGain?.gain.setTargetAtTime(l.rain ? 0.9 : 0, t, 0.8);
  }

  setMaster(v: number, enabled: boolean) {
    if (!this.ctx || !enabled) return;
    this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.08);
  }

  /** Fade ambience + music when a case study is open. */
  duck(on: boolean) {
    if (!this.ctx) return;
    this.duckGain.gain.setTargetAtTime(on ? 0.12 : 1, this.ctx.currentTime, on ? 0.5 : 0.8);
  }

  setMood(m: Mood) {
    this.mood = m;
  }

  private white: AudioBuffer | null = null;
  private rainOn = false;

  /** One shared second of white noise; short bursts read random slices of it. */
  private whiteBuf() {
    if (!this.white) this.white = this.noise(1, 'white');
    return this.white;
  }

  private buildAmbience() {
    const ctx = this.ctx!;
    // 1) very soft room tone: just enough "air" so silence never feels dead
    const room = this.loop(this.noise(6, 'brown'));
    const roomLp = ctx.createBiquadFilter();
    roomLp.type = 'lowpass';
    roomLp.frequency.value = 240;
    const roomG = ctx.createGain();
    roomG.gain.value = 0.1;
    room.connect(roomLp).connect(roomG).connect(this.amb);
    room.start();

    // 2) distant conversation: synthetic voices speaking in syllables and phrases, heavily muffled
    this.murmur = ctx.createGain();
    this.murmur.gain.value = 1.6;
    const muffle = ctx.createBiquadFilter();
    muffle.type = 'lowpass';
    muffle.frequency.value = 1100;
    this.murmur.connect(muffle).connect(this.amb);
    for (let v = 0; v < 3; v++) this.voice(v);

    // 3) rain: a gentle filtered bed plus individual droplets (scheduled only while rain is on)
    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = 0;
    this.rainGain.connect(this.amb);
    const bed = this.loop(this.noise(5, 'pink'));
    const bedHp = ctx.createBiquadFilter();
    bedHp.type = 'highpass';
    bedHp.frequency.value = 220;
    const bedLp = ctx.createBiquadFilter();
    bedLp.type = 'lowpass';
    bedLp.frequency.value = 1700;
    const bedG = ctx.createGain();
    bedG.gain.value = 0.32;
    bed.connect(bedHp).connect(bedLp).connect(bedG).connect(this.rainGain);
    bed.start();
    this.timers.push(window.setInterval(() => this.scheduleDrops(), 100));

    // 4) occasional café moments
    this.scheduleClink();
    this.scheduleSteam();
  }

  /** A muffled voice: vowel formants on a buzzing source, phrased like speech, far away. */
  private voice(i: number) {
    const ctx = this.ctx!;
    const src = ctx.createOscillator();
    src.type = 'sawtooth';
    const base = [118, 185, 142][i % 3];
    src.frequency.value = base;
    const f1 = ctx.createBiquadFilter();
    const f2 = ctx.createBiquadFilter();
    f1.type = f2.type = 'bandpass';
    f1.Q.value = 6;
    f2.Q.value = 8;
    const g = ctx.createGain();
    g.gain.value = 0;
    const pan = ctx.createStereoPanner();
    pan.pan.value = [-0.55, 0.45, 0.1][i % 3];
    const mix = ctx.createGain();
    mix.gain.value = 0.5;
    src.connect(f1).connect(mix);
    src.connect(f2).connect(mix);
    mix.connect(g).connect(pan).connect(this.murmur);
    src.start();
    const vowels: [number, number][] = [[730, 1090], [530, 1840], [300, 870], [400, 2000], [640, 1190], [490, 1350]];
    const phrase = () => {
      if (!this.ctx) return;
      let t = ctx.currentTime + 0.05;
      const syllables = 4 + Math.floor(Math.random() * 12);
      for (let k = 0; k < syllables; k++) {
        const dur = 0.09 + Math.random() * 0.16;
        const [a, b] = vowels[Math.floor(Math.random() * vowels.length)];
        f1.frequency.setTargetAtTime(a, t, 0.02);
        f2.frequency.setTargetAtTime(b, t, 0.02);
        src.frequency.setTargetAtTime(base * (0.9 + Math.random() * 0.25), t, 0.05);
        const peak = 0.035 + Math.random() * 0.03;
        g.gain.setTargetAtTime(peak, t, 0.025);
        g.gain.setTargetAtTime(0.0, t + dur, 0.04);
        t += dur + 0.03 + Math.random() * 0.08;
      }
      const pause = (t - ctx.currentTime) * 1000 + 900 + Math.random() * 4200;
      this.timers.push(window.setTimeout(phrase, pause));
    };
    this.timers.push(window.setTimeout(phrase, 400 + i * 1300 + Math.random() * 2000));
  }

  /** Raindrops on the window and pavement: many tiny bright ticks, sparse low drips. */
  private scheduleDrops() {
    const ctx = this.ctx;
    if (!ctx || !this.rainOn) return;
    const now = ctx.currentTime;
    const buf = this.whiteBuf();
    const n = 5 + Math.floor(Math.random() * 6);
    for (let i = 0; i < n; i++) {
      const t = now + 0.1 + Math.random() * 0.1;
      const s = ctx.createBufferSource();
      s.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2200 + Math.random() * 4500;
      bp.Q.value = 1.2;
      const g = ctx.createGain();
      const amp = 0.02 + Math.random() * 0.06;
      g.gain.setValueAtTime(amp, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.006 + Math.random() * 0.012);
      const pan = ctx.createStereoPanner();
      pan.pan.value = Math.random() * 1.6 - 0.8;
      s.connect(bp).connect(g).connect(pan).connect(this.rainGain);
      s.start(t, Math.random() * 0.9, 0.03);
    }
    if (Math.random() < 0.08) {
      // a heavier drip from the window frame
      const t = now + 0.1 + Math.random() * 0.1;
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(900 + Math.random() * 600, t);
      o.frequency.exponentialRampToValueAtTime(500, t + 0.05);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.025, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      o.connect(g).connect(this.rainGain);
      o.start(t);
      o.stop(t + 0.1);
    }
  }

  private scheduleClink() {
    if (!this.ctx) return;
    const wait = 3500 + Math.random() * 9000;
    this.timers.push(window.setTimeout(() => {
      const ctx = this.ctx!;
      const t = ctx.currentTime + 0.02;
      const pan = ctx.createStereoPanner();
      pan.pan.value = Math.random() * 1.6 - 0.8;
      const g = ctx.createGain();
      g.gain.value = 0.35;
      g.connect(pan).connect(this.amb);
      const base = 1900 + Math.random() * 1400;
      const hits = Math.random() < 0.35 ? 2 : 1; // cup onto saucer: two little touches
      for (let h = 0; h < hits; h++) {
        const th = t + h * (0.09 + Math.random() * 0.05);
        [1, 1.62, 2.31].forEach((r, i) => {
          const o = ctx.createOscillator();
          o.frequency.value = base * r;
          const og = ctx.createGain();
          og.gain.setValueAtTime(0, th);
          og.gain.linearRampToValueAtTime((0.035 / (i + 1)) * (h ? 0.6 : 1), th + 0.003);
          og.gain.exponentialRampToValueAtTime(0.0001, th + 0.35 + Math.random() * 0.25);
          o.connect(og).connect(g);
          o.start(th);
          o.stop(th + 0.7);
        });
      }
      this.scheduleClink();
    }, wait));
  }

  /** The espresso machine's steam wand, now and then, far across the room. */
  private scheduleSteam() {
    if (!this.ctx) return;
    this.timers.push(window.setTimeout(() => {
      const ctx = this.ctx!;
      const t = ctx.currentTime + 0.05;
      const s = ctx.createBufferSource();
      s.buffer = this.whiteBuf();
      s.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(2600, t);
      bp.frequency.linearRampToValueAtTime(3400, t + 3);
      bp.Q.value = 0.8;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 3800;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.022, t + 0.5);
      g.gain.setValueAtTime(0.022, t + 2.6);
      g.gain.linearRampToValueAtTime(0, t + 3.6);
      const pan = ctx.createStereoPanner();
      pan.pan.value = -0.6;
      s.connect(bp).connect(lp).connect(g).connect(pan).connect(this.amb);
      s.start(t);
      s.stop(t + 3.8);
      this.scheduleSteam();
    }, 30000 + Math.random() * 40000));
  }

  private progression(): number[][] {
    if (this.mood === 'rain') return [[57, 64, 67, 72], [53, 60, 64, 69], [48, 55, 64, 67], [55, 59, 62, 67]];
    if (this.mood === 'focus') return [[50, 57, 60, 65], [55, 62, 65, 69], [48, 55, 59, 64], [53, 60, 64, 69]];
    return [[53, 57, 60, 64, 67], [52, 55, 59, 62], [50, 53, 57, 60, 64], [48, 52, 55, 59]];
  }

  private scheduleMusic() {
    const ctx = this.ctx;
    if (!ctx) return;
    const barLen = this.mood === 'focus' ? 5.2 : 4.4;
    while (this.nextBar < ctx.currentTime + 1.2) {
      const chords = this.progression();
      const chord = chords[this.bar % chords.length];
      const t0 = this.nextBar;
      chord.forEach((n, i) => this.ep(midi(n), t0 + i * 0.035, barLen * 0.95, 0.05));
      this.ep(midi(chord[0] - 12), t0, barLen * 0.9, 0.07, true);
      const scale = [0, 2, 4, 7, 9].map((x) => chord[0] + 12 + x);
      const notes = this.mood === 'focus' ? 1 : 2 + Math.floor(Math.random() * 2);
      for (let k = 0; k < notes; k++) {
        if (Math.random() < 0.25) continue;
        const n = scale[Math.floor(Math.random() * scale.length)] + (Math.random() < 0.3 ? 12 : 0);
        this.bell(midi(n), t0 + barLen * (0.25 + k * 0.25 + Math.random() * 0.05));
      }
      this.nextBar += barLen;
      this.bar++;
    }
  }

  /** Soft electric-piano voice. */
  private ep(freq: number, t: number, dur: number, gain: number, bass = false) {
    const ctx = this.ctx!;
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    o1.type = 'sine';
    o2.type = bass ? 'sine' : 'triangle';
    o1.frequency.value = freq;
    o2.frequency.value = freq * (bass ? 1 : 2.001);
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = bass ? 400 : 1800;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.04);
    g.gain.exponentialRampToValueAtTime(gain * 0.35, t + 1.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const g2 = ctx.createGain();
    g2.gain.value = bass ? 0.2 : 0.18;
    o1.connect(g);
    o2.connect(g2).connect(g);
    g.connect(lp).connect(this.mus);
    o1.start(t);
    o2.start(t);
    o1.stop(t + dur + 0.1);
    o2.stop(t + dur + 0.1);
  }

  private bell(freq: number, t: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.03, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    const d = ctx.createDelay();
    d.delayTime.value = 0.37;
    const fb = ctx.createGain();
    fb.gain.value = 0.28;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    o.connect(g).connect(this.mus);
    g.connect(d).connect(fb).connect(d);
    d.connect(wet).connect(this.mus);
    o.start(t);
    o.stop(t + 2);
  }

  play(name: SfxName, pan = 0) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + 0.005;
    const out = ctx.createStereoPanner();
    out.pan.value = Math.max(-1, Math.min(1, pan));
    out.connect(this.sfx);
    const burst = (dur: number, f: number, q: number, gain: number, type: BiquadFilterType = 'bandpass', at = t) => {
      const s = ctx.createBufferSource();
      s.buffer = this.whiteBuf();
      const bf = ctx.createBiquadFilter();
      bf.type = type;
      bf.frequency.value = f;
      bf.Q.value = q;
      const g = ctx.createGain();
      g.gain.setValueAtTime(gain, at);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      s.connect(bf).connect(g).connect(out);
      s.start(at, Math.random() * 0.3);
      s.stop(at + dur + 0.02);
      return bf;
    };
    const tone = (f: number, dur: number, gain: number, type: OscillatorType = 'sine', at = t, f2?: number) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f, at);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, at + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(gain, at + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g).connect(out);
      o.start(at);
      o.stop(at + dur + 0.02);
    };
    // UI sounds are soft, short and mostly tonal: a "tock" with a fast pitch drop and a
    // tiny lowpassed tick. Bright noise bursts read as slaps or whips, so they are avoided.
    const tock = (f: number, gain: number, at = t, dur = 0.045) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, at);
      o.frequency.exponentialRampToValueAtTime(f * 0.55, at + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(gain, at + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g).connect(out);
      o.start(at);
      o.stop(at + dur + 0.02);
    };
    switch (name) {
      case 'click': // trackpad click: low body + faint tick
        tock(320, 0.22, t, 0.05);
        burst(0.008, 1800, 1, 0.05, 'lowpass');
        break;
      case 'tab':
        tock(900, 0.08, t, 0.035);
        break;
      case 'tap': // glass tap on the phone
        tock(1250, 0.1, t, 0.04);
        tone(2500, 0.02, 0.015);
        break;
      case 'swipe': { // a soft brush, lowpassed and quiet
        const bf = burst(0.16, 500, 0.7, 0.05, 'lowpass');
        bf.frequency.setValueAtTime(500, t);
        bf.frequency.linearRampToValueAtTime(1100, t + 0.14);
        tock(700, 0.04, t + 0.1, 0.04);
        break;
      }
      case 'sip': { // two small slurps
        for (const [d, f] of [[0, 700], [0.28, 900]] as const) {
          const bf = burst(0.22, f, 2.5, 0.06, 'bandpass', t + d);
          bf.frequency.setValueAtTime(f, t + d);
          bf.frequency.linearRampToValueAtTime(f * 1.6, t + d + 0.2);
        }
        break;
      }
      case 'cup': // ceramic on ceramic
        tone(1650, 0.35, 0.05, 'sine', t);
        tone(2480, 0.22, 0.025, 'sine', t);
        tock(260, 0.12, t, 0.05);
        break;
      case 'page': { // paper turning
        const bf = burst(0.32, 1400, 0.6, 0.05, 'bandpass');
        bf.frequency.setValueAtTime(900, t);
        bf.frequency.linearRampToValueAtTime(2200, t + 0.3);
        break;
      }
      case 'pickup':
        tone(120, 0.12, 0.28, 'sine', t, 70);
        burst(0.18, 900, 0.7, 0.04, 'lowpass', t + 0.05);
        break;
      case 'place':
        tone(95, 0.16, 0.3, 'sine', t, 60);
        tock(520, 0.06, t, 0.04);
        break;
      case 'expand': {
        const bf = burst(0.5, 400, 0.6, 0.06, 'lowpass');
        bf.frequency.setValueAtTime(400, t);
        bf.frequency.exponentialRampToValueAtTime(1600, t + 0.45);
        tone(midi(72), 0.9, 0.05, 'sine', t + 0.25);
        tone(midi(79), 0.9, 0.04, 'sine', t + 0.33);
        break;
      }
      case 'back': {
        tone(midi(76), 0.35, 0.045, 'sine', t);
        tone(midi(72), 0.5, 0.04, 'sine', t + 0.09);
        break;
      }
      case 'hover':
        tone(midi(84), 0.12, 0.025);
        break;
      case 'test':
        tone(midi(72), 0.9, 0.16, 'sine', t);
        tone(midi(76), 0.9, 0.14, 'sine', t + 0.14);
        tone(midi(79), 1.2, 0.14, 'sine', t + 0.28);
        break;
    }
  }
}

export const engine = typeof window !== 'undefined' ? new Engine() : (null as unknown as Engine);

type AudioUI = Levels & {
  enabled: boolean;
  status: 'off' | 'on' | 'blocked';
  enable: () => void;
  disable: () => void;
  set: (patch: Partial<Levels>) => void;
  test: () => void;
};

export const useAudio = create<AudioUI>((set, get) => ({
  ...(typeof window !== 'undefined' ? loadLevels() : DEFAULTS),
  enabled: false,
  status: 'off',
  enable: () => {
    try {
      engine.start(get());
      set({ enabled: true, status: 'on' });
      try { localStorage.setItem('ameils-desk:sound', 'on'); } catch {}
      window.setTimeout(() => {
        if (engine.ctx && engine.ctx.state !== 'running') set({ status: 'blocked' });
      }, 600);
    } catch {
      set({ status: 'blocked' });
    }
  },
  disable: () => {
    engine.stop();
    set({ enabled: false, status: 'off' });
    try { localStorage.setItem('ameils-desk:sound', 'off'); } catch {}
  },
  set: (patch) => {
    set(patch);
    const s = get();
    try {
      localStorage.setItem('ameils-desk:audio', JSON.stringify({
        master: s.master, ambience: s.ambience, music: s.music, effects: s.effects, rain: s.rain,
      }));
    } catch {}
    if (s.enabled) {
      engine.apply(s);
      if (patch.master !== undefined) engine.setMaster(s.master, true);
    }
  },
  test: () => {
    if (!get().enabled) get().enable();
    engine.unlock();
    window.setTimeout(() => engine.play('test'), 60);
  },
}));

/** Fire-and-forget sound effect. No-op while sound is disabled. */
export function sfx(name: SfxName, pan = 0) {
  if (typeof window === 'undefined') return;
  if (!useAudio.getState().enabled) return;
  engine.play(name, pan);
}

// Sound is on by default. Browsers only allow audio after a gesture, so it starts on the
// visitor's first tap, click or key press, unless they turned it off on an earlier visit.
if (typeof window !== 'undefined') {
  let pref: string | null = null;
  try { pref = localStorage.getItem('ameils-desk:sound'); } catch {}
  if (pref !== 'off') {
    const events = ['pointerdown', 'keydown', 'touchend'] as const;
    const start = (e: Event) => {
      events.forEach((n) => window.removeEventListener(n, start, true));
      // let the sound button handle its own click
      if ((e.target as HTMLElement | null)?.closest?.('.sound')) return;
      if (!useAudio.getState().enabled) useAudio.getState().enable();
    };
    events.forEach((n) => window.addEventListener(n, start, { capture: true, passive: true }));
  }
}

// diagnostics hook for automated checks (no effect on behaviour)
if (typeof window !== 'undefined') (window as unknown as { __audio?: Engine }).__audio = engine;
