/* ==========================================================================
   SCORE: a generative, Nolan-style sound design built with the Web Audio API.
   Nothing is pre-recorded:
     · tick     : a pocket-watch tick (Dunkirk). Tempo rises as history accelerates.
     · pad      : a pipe-organ pad (Interstellar). One chord per act.
     · ostinato : a pulsing arpeggio locked to the clock.
     · shepard  : a Shepard–Risset glissando: a pitch that rises forever.
     · braam / boom / riser / rewind / heartbeat / typing: one-shots.
   ========================================================================== */
const Score = (() => {
  let ctx = null, master, bus, verbIn, noiseBuf, comp;
  let muted = false, ready = false;

  // Continuous layers
  let state = { tick: 0, pad: null, padLevel: 0, ost: 0, shep: 0, beat: 0 };
  let padSet = null;               // {voices:[], gain}
  let shepVoices = [], shepGain, shepPos = 0;
  let nextTick = 0, tickN = 0, nextOst = 0, ostN = 0, nextBeat = 0;
  let schedTimer = null, shepTimer = null;
  let tickLevel = 1, idleNodes = null, idleTimer = null;

  const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);       // MIDI → Hz
  // Chords as MIDI notes (voiced low, organ-like)
  const CHORDS = {
    Dm:   [38, 50, 53, 57, 62],
    Am:   [33, 45, 52, 57, 60, 64],
    F:    [29, 41, 48, 53, 57, 60],
    C:    [36, 48, 55, 60, 64],
    G:    [31, 43, 50, 55, 59, 62],
    Em:   [28, 40, 47, 52, 55, 59],
    Fmaj7:[29, 41, 48, 52, 57, 64],
    Csus: [36, 48, 55, 60, 62, 67],
    Bbmaj:[34, 46, 53, 58, 62, 65],
    E:    [28, 40, 47, 52, 56, 59],
    Shadow:[25, 37, 38, 44, 50],
    Open: [24, 36, 43, 48, 55, 62],
    D:    [26, 38, 45, 50, 54, 57, 62],
  };
  // Arpeggio shapes per chord (upper register)
  const ARP = {
    Dm: [62, 65, 69, 74, 69, 65], Am: [57, 60, 64, 69, 64, 60], F: [53, 57, 60, 65, 60, 57],
    C: [60, 64, 67, 72, 67, 64], G: [55, 59, 62, 67, 62, 59], Em: [52, 55, 59, 64, 59, 55],
    Fmaj7: [57, 60, 64, 65, 64, 60], Csus: [60, 62, 67, 72, 67, 62], Bbmaj: [58, 62, 65, 70, 65, 62],
    E: [56, 59, 64, 68, 64, 59], D: [62, 66, 69, 74, 69, 66],
  };

  function init() {
    if (ctx) { ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.85;
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4;
    comp.attack.value = 0.01; comp.release.value = 0.4;
    master.connect(comp).connect(ctx.destination);

    bus = ctx.createGain(); bus.gain.value = 1; bus.connect(master);

    // Generated cathedral reverb
    const conv = ctx.createConvolver();
    conv.buffer = impulse(4.2, 2.6);
    verbIn = ctx.createGain(); verbIn.gain.value = 0.9;
    const verbOut = ctx.createGain(); verbOut.gain.value = 0.55;
    verbIn.connect(conv).connect(verbOut).connect(master);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    buildShepard();
    schedTimer = setInterval(schedule, 25);
    shepTimer = setInterval(updateShepard, 60);
    ready = true;
  }

  function impulse(seconds, decay) {
    const rate = ctx.sampleRate, len = rate * seconds;
    const buf = ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const ch = buf.getChannelData(c);
      for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  function send(node, wet = 0.3, dry = 1) {
    if (dry) { const g = ctx.createGain(); g.gain.value = dry; node.connect(g).connect(bus); }
    if (wet) { const g = ctx.createGain(); g.gain.value = wet; node.connect(g).connect(verbIn); }
  }

  /* ---------------- Tick ---------------- */
  function tick(t, accent) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
    bp.frequency.value = accent ? 3600 : 2900; bp.Q.value = 2.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime((accent ? 1.5 : 1.15) * tickLevel, t + 0.0015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    src.connect(bp).connect(g);
    send(g, 0.22, 1);
    src.start(t, Math.random(), 0.06);

    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(accent ? 2100 : 1700, t);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.22 * tickLevel, t + 0.001);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    o.connect(og); send(og, 0.1, 0.5);
    o.start(t); o.stop(t + 0.05);
  }

  /* ---------------- Organ pad ---------------- */
  function setPad(name, level, fade = 3) {
    if (!ctx) return;
    const now = ctx.currentTime;
    if (padSet && padSet.name === name) {
      padSet.gain.gain.cancelScheduledValues(now);
      padSet.gain.gain.setTargetAtTime(level * 0.3, now, fade / 3);
      return;
    }
    if (padSet) {
      const old = padSet;
      old.gain.gain.cancelScheduledValues(now);
      old.gain.gain.setTargetAtTime(0.0001, now, fade / 4);
      setTimeout(() => old.voices.forEach(v => { try { v.stop(); } catch (e) {} }), fade * 1500 + 500);
    }
    padSet = null;
    if (!name || !CHORDS[name] || level <= 0) return;

    const gain = ctx.createGain(); gain.gain.value = 0.0001;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = 0.4;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 420;
    lfo.connect(lfoAmt).connect(lp.frequency);
    gain.connect(lp); send(lp, 0.55, 0.7);
    const voices = [lfo];
    const partials = [[1, 1], [2, .45], [3, .22], [4, .16], [6, .06], [8, .05]];
    CHORDS[name].forEach((n, i) => {
      const f = NOTE(n);
      partials.forEach(([h, a]) => {
        if (f * h > 5000) return;
        const o = ctx.createOscillator(); o.type = 'sine';
        o.frequency.value = f * h;
        o.detune.value = (Math.random() - .5) * 6;
        const g = ctx.createGain(); g.gain.value = a * (i === 0 ? 1.2 : 0.75) / CHORDS[name].length;
        o.connect(g).connect(gain);
        o.start(); voices.push(o);
      });
    });
    lfo.start();
    gain.gain.setTargetAtTime(level * 0.3, now, fade / 3);
    padSet = { name, voices, gain };
  }

  /* ---------------- Ostinato pluck ---------------- */
  function pluck(t, n, level) {
    const f = NOTE(n);
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.35);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.15 * level, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    const g2 = ctx.createGain(); g2.gain.value = 0.25;
    o.connect(lp); o2.connect(g2).connect(lp); lp.connect(g);
    send(g, 0.45, 0.6);
    o.start(t); o2.start(t); o.stop(t + 0.6); o2.stop(t + 0.6);
  }

  /* ---------------- Shepard–Risset glissando ---------------- */
  const SHEP_N = 9, SHEP_F0 = 27.5, SHEP_PERIOD = 26; // seconds per octave
  function buildShepard() {
    shepGain = ctx.createGain(); shepGain.gain.value = 0.0001;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    shepGain.connect(lp); send(lp, 0.6, 0.6);
    for (let i = 0; i < SHEP_N; i++) {
      const o = ctx.createOscillator(); o.type = 'sine';
      const g = ctx.createGain(); g.gain.value = 0;
      o.connect(g).connect(shepGain); o.start();
      shepVoices.push({ o, g, i });
    }
  }
  function updateShepard() {
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    shepPos = (shepPos + 0.06 / SHEP_PERIOD) % 1;
    const centre = Math.log2(330), sigma = 1.25;
    shepVoices.forEach(v => {
      const oct = (v.i + shepPos) % SHEP_N;
      const f = SHEP_F0 * Math.pow(2, oct);
      const amp = Math.exp(-Math.pow(Math.log2(f) - centre, 2) / (2 * sigma * sigma));
      // A wrapped voice jumps an octave while silent: schedule instantly
      if (Math.abs(v.o.frequency.value - f) > f * 0.4) v.o.frequency.setValueAtTime(f, now);
      else v.o.frequency.linearRampToValueAtTime(f, now + 0.06);
      v.g.gain.setTargetAtTime(amp * 0.16, now, 0.05);
    });
  }

  /* ---------------- One-shots ---------------- */
  function braam(t = ctx.currentTime, size = 1) {
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 5;
    lp.frequency.setValueAtTime(110, t);
    lp.frequency.exponentialRampToValueAtTime(1500, t + 0.22);
    lp.frequency.exponentialRampToValueAtTime(180, t + 4);
    const ws = ctx.createWaveShaper(); ws.curve = drive(3.2); ws.oversample = '2x';
    [41.2, 55, 55.3, 82.4, 110.2, 109.7].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(f * 1.012, t);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.4);
      const og = ctx.createGain(); og.gain.value = i < 2 ? 0.35 : 0.22;
      o.connect(og).connect(ws);
      o.start(t); o.stop(t + 5.5);
    });
    ws.connect(lp).connect(g);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.55 * size, t + 0.07);
    g.gain.setTargetAtTime(0.0001, t + 0.9, 1.1);
    send(g, 0.8, 0.8);
    sub(t, 0.9 * size);
  }
  function sub(t, level = 0.8, from = 70, to = 32, len = 3) {
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + len * 0.6);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); send(g, 0.25, 1);
    o.start(t); o.stop(t + len + 0.1);
  }
  function boom(t = ctx.currentTime) {
    sub(t, 0.75, 90, 36, 3.6);
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    src.connect(lp).connect(g); send(g, 0.9, 0.5);
    src.start(t, 0, 1.8);
  }
  function riser(len = 2.5, t = ctx.currentTime) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2.2;
    bp.frequency.setValueAtTime(220, t); bp.frequency.exponentialRampToValueAtTime(6000, t + len);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.32, t + len * 0.97);
    g.gain.linearRampToValueAtTime(0.0001, t + len + 0.02);
    src.connect(bp).connect(g); send(g, 0.5, 0.7);
    src.start(t); src.stop(t + len + 0.1);
  }
  function rewind(len = 4, t = ctx.currentTime) {
    // Tape-rewind chatter + a falling tone
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 6;
    bp.frequency.setValueAtTime(5200, t); bp.frequency.exponentialRampToValueAtTime(400, t + len);
    const trem = ctx.createGain(); trem.gain.value = 0.5;
    const lfo = ctx.createOscillator(); lfo.frequency.setValueAtTime(18, t); lfo.frequency.linearRampToValueAtTime(42, t + len);
    const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 0.5;
    lfo.connect(lfoAmt).connect(trem.gain);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.3);
    g.gain.setValueAtTime(0.35, t + len - 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(bp).connect(trem).connect(g); send(g, 0.4, 0.8);
    src.start(t); src.stop(t + len + 0.1); lfo.start(t); lfo.stop(t + len + 0.1);

    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(1400, t); o.frequency.exponentialRampToValueAtTime(48, t + len);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.06, t + 0.5);
    og.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(lp).connect(og); send(og, 0.6, 0.6);
    o.start(t); o.stop(t + len + 0.1);
  }
  function heartbeat(t) {
    const thump = (tt, lvl) => {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(68, tt); o.frequency.exponentialRampToValueAtTime(38, tt + 0.14);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, tt);
      g.gain.exponentialRampToValueAtTime(lvl, tt + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.26);
      o.connect(g); send(g, 0.15, 1);
      o.start(tt); o.stop(tt + 0.3);
    };
    thump(t, 0.5); thump(t + 0.24, 0.3);
  }
  let lastType = 0;
  function type() {
    if (!ready || muted || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    if (t - lastType < 0.035) return;
    lastType = t;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800 + Math.random() * 1500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    src.connect(hp).connect(g); send(g, 0.08, 0.6);
    src.start(t, Math.random() * 1.5, 0.04);
  }
  /* The original machine: relay clunk, a transformer hum rising to mains, valves warming */
  function powerOn(t = ctx.currentTime) {
    // relay clunk
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    src.connect(lp).connect(g); send(g, 0.5, 1); src.start(t, 0.3, 0.2);
    sub(t, 0.6, 80, 40, 0.5);
    // hum: 50/60 Hz family rising from silence
    const hum = ctx.createGain(); hum.gain.setValueAtTime(0.0001, t + 0.05);
    hum.gain.exponentialRampToValueAtTime(0.16, t + 1.6);
    hum.gain.setValueAtTime(0.16, t + 2.6);
    hum.gain.exponentialRampToValueAtTime(0.0001, t + 4.2);
    const hlp = ctx.createBiquadFilter(); hlp.type = 'lowpass'; hlp.frequency.setValueAtTime(200, t); hlp.frequency.exponentialRampToValueAtTime(1600, t + 1.8);
    hum.connect(hlp); send(hlp, 0.35, 0.9);
    [[60, 1], [120, .55], [180, .3], [240, .18], [360, .08]].forEach(([f, a]) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(f * 0.55, t); o.frequency.exponentialRampToValueAtTime(f, t + 1.4);
      const og = ctx.createGain(); og.gain.value = a * 0.3;
      o.connect(og).connect(hum); o.start(t); o.stop(t + 4.4);
    });
    // valve whine
    const w = ctx.createOscillator(); w.type = 'sine';
    w.frequency.setValueAtTime(3000, t + 0.2); w.frequency.exponentialRampToValueAtTime(8200, t + 2.2);
    const wg = ctx.createGain(); wg.gain.setValueAtTime(0.0001, t + 0.2);
    wg.gain.exponentialRampToValueAtTime(0.012, t + 1.8); wg.gain.exponentialRampToValueAtTime(0.0001, t + 4);
    w.connect(wg); send(wg, 0.3, 0.6); w.start(t + 0.2); w.stop(t + 4.1);
    // a scatter of relay clicks
    for (let i = 0; i < 9; i++) tick(t + 0.5 + i * 0.13 + Math.random() * 0.05, i % 3 === 0);
  }
  /* The machine switches off: the hum falls away */
  function powerDown(t = ctx.currentTime) {
    const hum = ctx.createGain(); hum.gain.setValueAtTime(0.14, t); hum.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(1400, t); lp.frequency.exponentialRampToValueAtTime(120, t + 1.4);
    hum.connect(lp); send(lp, 0.4, 0.9);
    [[60, 1], [120, .5], [180, .25]].forEach(([f, a]) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.3, t + 1.5);
      const og = ctx.createGain(); og.gain.value = a * 0.3;
      o.connect(og).connect(hum); o.start(t); o.stop(t + 1.7);
    });
    const w = ctx.createOscillator(); w.type = 'sine';
    w.frequency.setValueAtTime(7000, t); w.frequency.exponentialRampToValueAtTime(400, t + 0.5);
    const wg = ctx.createGain(); wg.gain.setValueAtTime(0.03, t); wg.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    w.connect(wg); send(wg, 0.4, 0.6); w.start(t); w.stop(t + 0.6);
  }
  /* Popcorn: sparse, then a storm, then the last few kernels */
  function popcorn(len = 1.4, t = ctx.currentTime) {
    const N = 46;
    for (let i = 0; i < N; i++) {
      const u = Math.random();
      const x = Math.pow(u, .9);                       // density peaks in the middle
      const at = t + len * (0.5 + 0.5 * Math.sin((x - .5) * Math.PI)) + Math.random() * .03;
      const src = ctx.createBufferSource(); src.buffer = noiseBuf;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900 + Math.random() * 1900; bp.Q.value = 3;
      const g = ctx.createGain(); const lvl = 0.35 + Math.random() * 0.5;
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(lvl, at + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.035 + Math.random() * 0.03);
      src.connect(bp).connect(g); send(g, 0.2, 0.9);
      src.start(at, Math.random() * 1.5, 0.08);
      if (Math.random() < .5) sub(at, 0.12, 180, 90, 0.06);
    }
  }
  /* A microwave: a hum, and a bell when it is done */
  function hum(len = 1.2, t = ctx.currentTime) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.1, t + 0.15);
    g.gain.setValueAtTime(0.1, t + len - 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
    g.connect(lp); send(lp, 0.2, 0.9);
    [[120, 1], [240, .4], [360, .15]].forEach(([f, a]) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      const og = ctx.createGain(); og.gain.value = a * .3; o.connect(og).connect(g); o.start(t); o.stop(t + len + .05);
    });
  }
  function ding(t = ctx.currentTime) {
    [[2093, .22], [4186, .06], [3136, .05]].forEach(([f, a]) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(a, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      o.connect(g); send(g, 0.5, 0.8); o.start(t); o.stop(t + 1.7);
    });
  }
  /* Waiting for Begin: a projector loaded and running, an unresolved chord, the clock,
     and a soft breath with every pulse of the ring around the button */
  function breath(t) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 1;
    lp.frequency.setValueAtTime(260, t); lp.frequency.exponentialRampToValueAtTime(1500, t + .7); lp.frequency.exponentialRampToValueAtTime(240, t + 1.9);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + .7); g.gain.exponentialRampToValueAtTime(0.0001, t + 2);
    src.connect(lp).connect(g); send(g, .6, .5);
    src.start(t, Math.random(), 2.1);
  }
  function idle(on) {
    if (!ctx) return;
    const now = ctx.currentTime;
    if (on) {
      if (idleNodes) return;
      const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = .7;
      const shutter = ctx.createGain(); shutter.gain.value = .55;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 24;
      const depth = ctx.createGain(); depth.gain.value = .45; lfo.connect(depth).connect(shutter.gain);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.05, now + 2.5);
      src.connect(bp).connect(shutter).connect(g);
      const motor = ctx.createOscillator(); motor.type = 'sine'; motor.frequency.value = 50;
      const mg = ctx.createGain(); mg.gain.value = .6; motor.connect(mg).connect(g);
      send(g, .2, .9);
      src.start(); lfo.start(); motor.start();
      idleNodes = { g, parts: [src, lfo, motor] };
      setPad('Csus', .32, 3); state.pad = 'Csus'; state.padLevel = .32;
      state.ost = 0; tickLevel = .4;
      if (!state.tick) { state.tick = 60; nextTick = now + .4; }
      let k = 0;
      const pulse = () => {
        if (ctx.state !== 'running') return;
        const t = ctx.currentTime; breath(t);
        if (k++ % 2 === 0) { pluck(t + .05, 79, .55); pluck(t + .25, 86, .4); }
      };
      idleTimer = setTimeout(() => { pulse(); idleTimer = setInterval(pulse, 2800); }, 1000);
    } else {
      clearTimeout(idleTimer); clearInterval(idleTimer); idleTimer = null;
      tickLevel = 1;
      if (idleNodes) {
        const n = idleNodes; idleNodes = null;
        n.g.gain.cancelScheduledValues(now); n.g.gain.setTargetAtTime(0.0001, now, .25);
        setTimeout(() => n.parts.forEach(x => { try { x.stop(); } catch (e) {} }), 1500);
      }
    }
  }
  /* A single sustained organ note */
  function organNote(n, len = 4, level = 1, t = ctx.currentTime) {
    const f = NOTE(n);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09 * level, t + 0.8);
    g.gain.setValueAtTime(0.09 * level, t + len - 1.2); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    g.connect(lp); send(lp, 0.7, 0.7);
    [[1, 1], [2, .5], [3, .25], [4, .15], [8, .05]].forEach(([h, a]) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * h;
      const og = ctx.createGain(); og.gain.value = a;
      o.connect(og).connect(g); o.start(t); o.stop(t + len + 0.1);
    });
  }
  /* A heavier key strike for the title typewriter */
  function key() {
    if (!ready || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500 + Math.random() * 900; bp.Q.value = 1.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(bp).connect(g); send(g, 0.25, 0.9);
    src.start(t, Math.random() * 1.5, 0.07);
    sub(t, 0.12, 140, 70, 0.08);
  }
  function chime(t = ctx.currentTime, notes = [72, 79, 84]) {
    notes.forEach((n, i) => pluck(t + i * 0.18, n, 1.4));
  }
  function drive(k) {
    const n = 1024, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); }
    return c;
  }

  /* ---------------- Scheduler ---------------- */
  function schedule() {
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime, ahead = now + 0.12;
    if (state.tick > 0) {
      const step = 60 / state.tick;
      if (nextTick < now) nextTick = now + 0.02;
      while (nextTick < ahead) { tick(nextTick, tickN % 2 === 0); tickN++; nextTick += step; }
    }
    if (state.ost > 0 && state.pad && ARP[state.pad]) {
      const step = 60 / Math.max(state.tick || 72, 60) / 2;
      if (nextOst < now) nextOst = now + 0.02;
      const arp = ARP[state.pad];
      while (nextOst < ahead) { pluck(nextOst, arp[ostN % arp.length], state.ost); ostN++; nextOst += step; }
    }
    if (state.beat > 0) {
      const step = 60 / state.beat;
      if (nextBeat < now) nextBeat = now + 0.02;
      while (nextBeat < ahead) { heartbeat(nextBeat); nextBeat += step; }
    }
  }

  /* ---------------- Public API ---------------- */
  // Apply a (cumulative) cue: { tick, pad, padLevel, ost, shep, beat }
  function cue(c, oneShots = {}) {
    if (!ctx) return;
    const now = ctx.currentTime;
    if ('tick' in c) {
      if (c.tick !== state.tick) {
        if (!state.tick && c.tick) nextTick = now + 0.25;
        state.tick = c.tick;
      }
    }
    if ('pad' in c || 'padLevel' in c) {
      const name = c.pad ?? state.pad, level = c.padLevel ?? state.padLevel;
      if (name !== state.pad || level !== state.padLevel) setPad(name, level, c.padFade ?? 3);
      state.pad = name; state.padLevel = level;
    }
    if ('ost' in c) state.ost = c.ost;
    if ('beat' in c) { if (!state.beat && c.beat) nextBeat = now + 0.3; state.beat = c.beat; }
    if ('shep' in c && c.shep !== state.shep) {
      state.shep = c.shep;
      shepGain.gain.cancelScheduledValues(now);
      shepGain.gain.setTargetAtTime(Math.max(0.0001, c.shep * 0.9), now, c.shep > 0 ? 2.5 : 0.6);
    }
    if (oneShots.hit === 'braam') braam(now + (oneShots.at || 0));
    if (oneShots.hit === 'braam-soft') braam(now + (oneShots.at || 0), 0.55);
    if (oneShots.hit === 'boom') boom(now + (oneShots.at || 0));
    if (oneShots.hit === 'sub') sub(now + (oneShots.at || 0), 0.6);
    if (oneShots.hit === 'chime') chime(now + (oneShots.at || 0));
    if (oneShots.hit === 'poweron') powerOn(now + (oneShots.at || 0));
    if (oneShots.riser) riser(oneShots.riser);
    if (oneShots.rewind) rewind(oneShots.rewind);
  }
  // The clock stops. Everything cuts to silence.
  function stopAll() {
    if (!ctx) return;
    const now = ctx.currentTime;
    state.tick = 0; state.ost = 0; state.beat = 0;
    if (padSet) { padSet.gain.gain.cancelScheduledValues(now); padSet.gain.gain.setTargetAtTime(0.0001, now, 0.04); }
    setTimeout(() => setPad(null, 0, 0.1), 300);
    state.pad = null; state.padLevel = 0;
    state.shep = 0;
    shepGain.gain.cancelScheduledValues(now); shepGain.gain.setTargetAtTime(0.0001, now, 0.04);
  }
  // The mixed output as a MediaStream (used to record the trailer's soundtrack)
  function stream() { if (!ctx) return null; const d = ctx.createMediaStreamDestination(); comp.connect(d); return d.stream; }
  function tickAt(delay = 0, accent = false) { if (ctx && ctx.state === 'running') tick(ctx.currentTime + delay, accent); }
  function at(name, delay = 0, ...args) {
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + delay;
    ({ braam: () => braam(t, args[0] ?? 1), boom: () => boom(t), sub: () => sub(t, args[0] ?? .6), riser: () => riser(args[0] ?? 2.5, t),
       poweron: () => powerOn(t), powerdown: () => powerDown(t), rewind: () => rewind(args[0] ?? 2, t), note: () => organNote(args[0], args[1], args[2], t),
       chime: () => chime(t, args[0]), popcorn: () => popcorn(args[0] ?? 1.4, t), hum: () => hum(args[0] ?? 1.2, t), ding: () => ding(t) })[name]?.();
  }
  function pause() { if (ctx && ctx.state === 'running') ctx.suspend(); }
  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }
  function setMuted(m) {
    muted = m;
    if (master) master.gain.setTargetAtTime(m ? 0 : 0.85, ctx.currentTime, 0.08);
  }

  // Review hook: an analyser on the master bus (used by automated level checks)
  function tap() {
    if (!ctx) return null;
    const an = ctx.createAnalyser(); an.fftSize = 2048; master.connect(an);
    const buf = new Float32Array(an.fftSize);
    return () => { an.getFloatTimeDomainData(buf); let pk = 0, sum = 0; for (const v of buf) { pk = Math.max(pk, Math.abs(v)); sum += v * v; } return { peak: pk, rms: Math.sqrt(sum / buf.length), state: ctx.state }; };
  }

  return {
    init, cue, stopAll, pause, resume, setMuted, type, tap, key, tickAt, at, idle, stream,
    get muted() { return muted; },
    get ready() { return ready; },
  };
})();
