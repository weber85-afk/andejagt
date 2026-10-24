// Lydeffekter, lavet direkte i browseren (ingen lydfiler nødvendige).
export function createSound() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let volume = 0.6;
  let musicTimer = null;
  const loops = {};

  function noiseBuffer(seconds) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  function envelope(gainNode, volume, attack, decay) {
    const t = ctx.currentTime;
    gainNode.gain.setValueAtTime(0.0001, t);
    gainNode.gain.exponentialRampToValueAtTime(volume, t + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  function noise({ seconds, volume, type, freq, q = 1, attack = 0.005 }) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(seconds);
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = ctx.createGain();
    envelope(gain, volume, attack, seconds);
    src.connect(filter).connect(gain).connect(master);
    src.start();
    src.stop(ctx.currentTime + seconds + attack + 0.05);
  }

  function tone({ type = 'sine', from, to = from, seconds, volume, delay = 0, filter }) {
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + seconds);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    let node = osc;
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = filter;
      f.Q.value = 3;
      node = osc.connect(f);
    }
    node.connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + seconds + 0.05);
  }

  const play = (fn) => (...args) => {
    if (ctx) fn(...args);
  };

  // En lyd der kører i ring (å, hav, vind). Lydstyrken styres med setLevel.
  function makeLoop(type) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(4);
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    const settings = { river: ['bandpass', 1400, 0.6], sea: ['lowpass', 500, 0.5], wind: ['lowpass', 300, 0.7] }[type];
    filter.type = settings[0];
    filter.frequency.value = settings[1];
    filter.Q.value = settings[2];
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(filter).connect(gain).connect(master);
    src.start();
    return {
      setLevel(level) {
        gain.gain.setTargetAtTime(level, ctx.currentTime, 0.5);
      },
    };
  }

  // Lille melodi der bliver ved (pentatonisk, så den altid lyder pæn)
  const SCALE = [262, 294, 330, 392, 440, 523, 587, 659];
  function musicNote(step, style) {
    const t = ctx.currentTime;
    const note = SCALE[(step * 3 + Math.floor(Math.random() * 3)) % SCALE.length] * (style === 'radio' ? 1 : 0.5);
    const osc = ctx.createOscillator();
    osc.type = style === 'radio' ? 'square' : 'triangle';
    osc.frequency.value = note;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(style === 'radio' ? 0.05 : 0.12, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    osc.connect(g).connect(musicGain);
    osc.start(t);
    osc.stop(t + 0.6);
    if (step % 4 === 0) {
      const bass = ctx.createOscillator();
      bass.type = 'sine';
      bass.frequency.value = SCALE[(step / 4) % 4] / 2;
      const bg = ctx.createGain();
      bg.gain.setValueAtTime(0.0001, t);
      bg.gain.exponentialRampToValueAtTime(0.15, t + 0.03);
      bg.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      bass.connect(bg).connect(musicGain);
      bass.start(t);
      bass.stop(t + 1.3);
    }
  }

  return {
    // Skal kaldes efter et klik, ellers må browseren ikke spille lyd
    unlock() {
      if (!ctx) {
        ctx = new AudioContext();
        master = ctx.createGain();
        master.gain.value = volume;
        master.connect(ctx.destination);
        musicGain = ctx.createGain();
        musicGain.connect(master);
      }
      ctx.resume();
    },

    // 0 = ingen lyd, 1 = fuld lyd
    setVolume(v) {
      volume = v;
      if (master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
    },

    // style: 'menu' (rolig) eller 'radio' (bilradio)
    startMusic(style = 'menu') {
      if (!ctx) return;
      this.stopMusic();
      let step = 0;
      musicTimer = setInterval(() => musicNote(step++, style), style === 'radio' ? 220 : 420);
    },
    stopMusic() {
      clearInterval(musicTimer);
      musicTimer = null;
    },
    get musicPlaying() { return !!musicTimer; },

    // Baggrundslyde: setLoop('river', 0.3)
    setLoop(type, level) {
      if (!ctx) return;
      loops[type] ??= makeLoop(type);
      loops[type].setLevel(level);
    },

    chirp: play((v = 0.15) => {
      const base = 2400 + Math.random() * 1200;
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) tone({ from: base, to: base * 1.4, seconds: 0.09, volume: v, delay: i * 0.13 });
    }),

    cricket: play((v = 0.05) => {
      for (let i = 0; i < 3; i++) tone({ type: 'square', from: 4400, seconds: 0.03, volume: v, delay: i * 0.06 });
    }),

    step: play((surface = 'grass', v = 0.12) => {
      const s = { grass: ['lowpass', 700, 0.07], water: ['bandpass', 1200, 0.14], snow: ['highpass', 1800, 0.09], wood: ['lowpass', 400, 0.06] }[surface];
      noise({ seconds: s[2], volume: v, type: s[0], freq: s[1] });
    }),

    horn: play(() => {
      tone({ type: 'square', from: 392, seconds: 0.6, volume: 0.12, filter: 800 });
      tone({ type: 'square', from: 494, seconds: 0.6, volume: 0.12, filter: 900 });
    }),

    eat: play(() => {
      for (let i = 0; i < 3; i++) noise({ seconds: 0.08, volume: 0.25, type: 'bandpass', freq: 900 + i * 300, attack: 0.01 + i * 0.15 });
    }),

    happy: play(() => {
      tone({ type: 'sawtooth', from: 500, to: 700, seconds: 0.12, volume: 0.25, filter: 1000 });
      tone({ from: 880, to: 1320, seconds: 0.25, volume: 0.15, delay: 0.15 });
    }),

    medal: play(() => {
      [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'triangle', from: f, seconds: 0.3, volume: 0.2, delay: i * 0.12 }));
    }),

    shot: play(() => {
      noise({ seconds: 0.35, volume: 0.9, type: 'lowpass', freq: 1400 });
      tone({ type: 'triangle', from: 150, to: 40, seconds: 0.2, volume: 0.7 });
    }),

    quack: play((volume = 0.5) => {
      if (volume < 0.03) return;
      const pitch = 0.85 + Math.random() * 0.3;
      tone({ type: 'sawtooth', from: 520 * pitch, to: 300 * pitch, seconds: 0.14, volume, filter: 1100 });
      tone({ type: 'sawtooth', from: 500 * pitch, to: 280 * pitch, seconds: 0.16, volume, filter: 1100, delay: 0.2 });
    }),

    hitQuack: play(() => {
      tone({ type: 'sawtooth', from: 700, to: 250, seconds: 0.3, volume: 0.5, filter: 1200 });
    }),

    pickup: play(() => {
      tone({ type: 'square', from: 520, to: 1040, seconds: 0.12, volume: 0.15 });
    }),

    sizzle: play(() => {
      noise({ seconds: 1.2, volume: 0.25, type: 'highpass', freq: 3500, attack: 0.05 });
    }),

    ding: play(() => {
      tone({ from: 880, seconds: 0.5, volume: 0.35 });
      tone({ from: 1320, seconds: 0.7, volume: 0.3, delay: 0.12 });
    }),

    buy: play(() => {
      tone({ type: 'square', from: 1200, seconds: 0.08, volume: 0.15 });
      tone({ type: 'square', from: 1600, seconds: 0.3, volume: 0.15, delay: 0.09 });
    }),

    bark: play((volume = 0.5) => {
      if (volume < 0.03) return;
      tone({ type: 'sawtooth', from: 420, to: 220, seconds: 0.12, volume, filter: 900 });
      tone({ type: 'sawtooth', from: 400, to: 210, seconds: 0.12, volume, filter: 900, delay: 0.18 });
    }),

    alarm: play(() => {
      for (let i = 0; i < 3; i++) tone({ type: 'square', from: 1500, seconds: 0.1, volume: 0.15, delay: i * 0.18 });
    }),

    reload: play(() => {
      tone({ type: 'square', from: 300, to: 200, seconds: 0.05, volume: 0.15 });
      tone({ type: 'square', from: 500, to: 350, seconds: 0.06, volume: 0.15, delay: 0.25 });
    }),

    empty: play(() => {
      tone({ type: 'square', from: 900, to: 700, seconds: 0.04, volume: 0.12 });
    }),

    whistle: play(() => {
      tone({ type: 'sine', from: 1800, to: 2600, seconds: 0.35, volume: 0.25 });
      tone({ type: 'sine', from: 2600, to: 1700, seconds: 0.5, volume: 0.25, delay: 0.4 });
    }),

    shotgun: play(() => {
      noise({ seconds: 0.5, volume: 1, type: 'lowpass', freq: 900 });
      tone({ type: 'triangle', from: 110, to: 30, seconds: 0.3, volume: 0.9 });
    }),

    honk: play(() => {
      for (let i = 0; i < 3; i++) tone({ type: 'square', from: 330, to: 280, seconds: 0.18, volume: 0.12, filter: 700, delay: i * 0.3 });
    }),

    flutter: play(() => {
      noise({ seconds: 0.5, volume: 0.3, type: 'bandpass', freq: 600, q: 0.8 });
    }),

    roar: play((volume = 0.8) => {
      noise({ seconds: 1.2, volume: volume * 0.6, type: 'lowpass', freq: 400, attack: 0.1 });
      tone({ type: 'sawtooth', from: 110, to: 70, seconds: 1.2, volume: volume * 0.5, filter: 300 });
    }),

    splashSound: play(() => {
      noise({ seconds: 0.4, volume: 0.3, type: 'highpass', freq: 1500 });
    }),

    thunder: play((volume = 0.8) => {
      noise({ seconds: 2.8, volume, type: 'lowpass', freq: 160, attack: 0.15 });
      noise({ seconds: 0.6, volume: volume * 0.6, type: 'lowpass', freq: 600, attack: 0.02 });
    }),

    beep: play((closeness = 0) => {
      tone({ type: 'square', from: 600 + closeness * 900, seconds: 0.06, volume: 0.1 });
    }),

    call: play(() => {
      tone({ type: 'sawtooth', from: 300, to: 700, seconds: 0.6, volume: 0.2, filter: 900 });
      tone({ type: 'sawtooth', from: 700, to: 250, seconds: 0.8, volume: 0.2, filter: 900, delay: 0.6 });
    }),

    puff: play(() => {
      noise({ seconds: 0.6, volume: 0.5, type: 'lowpass', freq: 500 });
      tone({ type: 'sawtooth', from: 200, to: 80, seconds: 0.5, volume: 0.15 });
    }),
  };
}
