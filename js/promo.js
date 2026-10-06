/* ==========================================================================
   THE LINKEDIN TRAILER. A fixed 30-second cut, built to be rendered to video.
     0.0  a time-lapse: 1936 accelerates to 2026
     3.6  what is happening: AlphaEvolve, Navier–Stokes, Claude Code building a film,
          the OpenAI incident, concentration of power, embodied AI
    12.1  three questions
    15.1  "How did we get here?" Rewind to 1936, then forward through history
    21.9  the title types itself: Think is struck, Act replaces it
    25.2  end card over the Earth at night; a cursor clicks Watch the full film
   Opened normally it plays with sound after a click. tools/render-trailer.mjs
   drives it on a virtual clock (?capture=1) and records the score (?audio=1).
   ========================================================================== */
(() => {
  const $ = (s) => document.querySelector(s);
  const root = $('#start');
  const params = new URLSearchParams(location.search);
  const D = window.FILM_DATA || { images: [], videos: [], now2026: [] };
  const MEDIA = {};
  D.images.forEach(m => { MEDIA[m.id] = { ...m, kind: 'img' }; });
  D.videos.forEach(m => { MEDIA[m.id] = { ...m, kind: 'video' }; });
  const api = {
    media: (id) => MEDIA[id] || null, pool: () => D.images.filter(m => !m.noPool),
    type: () => {}, reduced: false, now2026: D.now2026 || [], setYear: () => {}, creditsHTML: () => '',
  };
  const el = {
    block: $('.intro-titleblock'), a: $('.it-a .ty'), b: $('.it-b .ty'), think: $('.it-c .think .ty'),
    thinkWrap: $('.it-c .think'), act: $('.it-c .act'), caret: $('.intro-title .caret'), sub: $('.intro-sub'),
    montage: $('.intro-montage'), year: $('.promo-year'), yearN: $('.promo-year b'), yearL: $('.promo-year span'),
    cap: $('.pm-cap'), capK: $('.pm-cap .k'), capL: $('.pm-cap .l'), q: $('.pm-q'), end: $('.promo-end'),
    earth: $('.pe-earth'), cursor: $('.pm-cursor'), cta: $('.pe-cta'),
  };
  const S = (name, ...a) => { try { Score.at(name, 0, ...a); } catch (e) {} };
  const cue = (c) => { try { Score.cue(c); } catch (e) {} };
  const tick = (acc, d = 0) => { try { Score.tickAt(d, acc); } catch (e) {} };

  let cues = [], typers = [], live = [], t0 = 0, running = false;
  const at = (ms, fn) => cues.push({ ms, fn, done: false });
  const type = (node, text, start, mpc, sound) => typers.push({ node, text, start, mpc, sound, shown: -1 });
  const moveCaret = (n) => { if (el.caret.previousSibling !== n) n.after(el.caret); };

  /* ---------- Shots ---------- */
  function show(build, cap, fxName, fxOpts, offset = 0) {
    const f = document.createElement('div'); f.className = 'im-shot pm-shot';
    el.montage.appendChild(f);
    if (build) build(f);
    let inst = null;
    if (fxName && typeof fxName === 'object' && fxName.make) inst = fxName.make(f);
    else if (fxName && typeof FX !== 'undefined' && FX[fxName]) {
      const scene = { fxOpts: fxOpts || {}, bg: [] };
      try { inst = FX[fxName](f, scene, api); } catch (e) { console.error(e); }
    }
    requestAnimationFrame(() => f.classList.add('on'));
    const old = live.slice(); live = [{ f, inst, start: performance.now() - t0, offset }];
    old.forEach(x => { x.f.classList.remove('on'); setTimeout(() => x.f.remove(), 400); });
    if (cap) { el.capK.textContent = cap[0]; el.capL.textContent = cap[1]; el.cap.classList.remove('in'); void el.cap.offsetWidth; el.cap.classList.add('in'); }
    else el.cap.classList.remove('in');
    return f;
  }
  const img = (id, cls = '') => (f) => {
    const m = MEDIA[id]; if (!m) return;
    const i = new Image(); i.src = m.file; i.alt = ''; i.className = cls; i.style.objectPosition = m.focus || '50% 50%';
    f.appendChild(i);
  };
  const clearShots = () => { live.forEach(x => x.f.remove()); live = []; el.cap.classList.remove('in'); };

  // A shot's own clock: fx-style objects with update(t) get shot-local time
  const vid = (src, cls = '', pos = '50% 50%') => (f) => {
    const v = document.createElement('video');
    Object.assign(v, { src, muted: true, playsInline: true, preload: 'auto' }); v.className = cls; v.style.objectPosition = pos;
    v.setAttribute('muted', ''); v.dataset.play = '1';
    f.appendChild(v); v.play().catch(() => {});
  };

  /* AlphaEvolve: 49 multiplications light up, then one disappears */
  const AE = {
    build(f) {
      f.classList.add('pn', 'ae');
      f.innerHTML = `<canvas class="ae-code"></canvas>
        <div class="ae-grid">${'<i></i>'.repeat(49)}</div>
        <div class="ae-meta"><b class="ae-num">0</b><span class="ae-lbl">Strassen · 1969</span></div>
        <div class="ae-unit">multiplications · two 4×4 complex matrices</div>`;
    },
    make(f) {
      const cv = f.querySelector('.ae-code'), g = cv.getContext('2d');
      cv.width = f.clientWidth; cv.height = f.clientHeight;
      const cells = [...f.querySelectorAll('.ae-grid i')], num = f.querySelector('.ae-num'), lbl = f.querySelector('.ae-lbl');
      const LINES = ['def multiply(A, B):', 'm = [[0]*4 for _ in range(4)]', 'for i in range(4):', 'for k in range(4):', 'a = A[i][k]', 'for j in range(4):', 'm[i][j] += a * B[k][j]', 'return m', 'score = evaluate(program)', 'population.evolve()'];
      const glyph = 'abcdefghijklmnopqrstuvwxyz[]()+*=_0123456789';
      let done = false;
      return { update(t) {
        g.clearRect(0, 0, cv.width, cv.height);
        g.font = `${Math.round(cv.height / 46)}px "IBM Plex Mono", monospace`;
        const cols = Math.ceil(cv.width / 360), rows = Math.ceil(cv.height / (cv.height / 30));
        for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
          const line = LINES[(r + c * 3) % LINES.length].replace(/[a-z0-9]/g, ch => Math.random() < .05 ? glyph[(Math.random() * glyph.length) | 0] : ch);
          g.fillStyle = `rgba(143,227,165,${(.05 + ((r * 5 + c * 7) % 7) / 80).toFixed(3)})`;
          g.fillText(line, 24 + c * 360, (r + 1) * cv.height / 30 - (t / 30) % (cv.height / 30));
        }
        const lit = Math.min(49, Math.floor(49 * Math.min(1, t / 620)));
        cells.forEach((cl, k) => cl.classList.toggle('on', k < lit));
        if (t < 860) { num.textContent = lit; }
        else if (!done) { done = true; cells[48].classList.add('gone'); num.textContent = '48'; num.classList.add('lit'); lbl.textContent = 'AlphaEvolve · 2025'; S('sub', .55); }
      } };
    },
  };

  /* Navier–Stokes: the equations, written over calm, smooth flow */
  const NS = {
    build(f) {
      f.classList.add('pn', 'ns');
      f.innerHTML = `<canvas class="ns-flow"></canvas>
        <div class="ns-eq">
          <div class="ns-l1"><span class="frac"><span>∂<i>u</i></span><span>∂<i>t</i></span></span> + (<i>u</i> · ∇)<i>u</i> = −∇<i>p</i> + <i>ν</i>Δ<i>u</i> + <i>f</i></div>
          <div class="ns-l2">∇ · <i>u</i> = 0</div>
        </div>`;
    },
    make(f) {
      const cv = f.querySelector('.ns-flow'), g = cv.getContext('2d');
      cv.width = f.clientWidth; cv.height = f.clientHeight;
      return { update(t) {
        const W = cv.width, H = cv.height;
        g.clearRect(0, 0, W, H);
        for (let k = 0; k < 26; k++) {
          const y0 = H * (k + .5) / 26, amp = H * .018 * (1 + Math.sin(k * 1.7)), ph = k * .9 + t / 900;
          g.strokeStyle = k % 3 === 0 ? 'rgba(240,162,75,.22)' : 'rgba(127,200,190,.13)';
          g.lineWidth = 1.2; g.beginPath();
          for (let x = 0; x <= W; x += 16) { const y = y0 + amp * Math.sin(x / (W / 2.6) + ph) + amp * .4 * Math.sin(x / (W / 7) - ph * 1.3); x ? g.lineTo(x, y) : g.moveTo(x, y); }
          g.stroke();
        }
      } };
    },
  };

  /* Claude Code: "Build a snake game…", the work, then the game running */
  const CC = {
    build(f) {
      f.classList.add('pn', 'ccb');
      f.innerHTML = `<div class="cc">
          <div class="cc-bar"><span>✻ Claude Code</span><span>~/snake</span></div>
          <div class="cc-body">
            <div class="cc-you">› <span class="cc-type">Build a snake game I can play in the browser</span></div>
            <div class="cc-l" style="--d:.5s"><b>●</b> Plan<i>⎿ grid · snake · food · score</i></div>
            <div class="cc-l" style="--d:.66s"><b>●</b> Write<span>(index.html)</span></div>
            <div class="cc-l" style="--d:.8s"><b>●</b> Write<span>(game.js)</span><i>⎿ 142 lines</i></div>
            <div class="cc-l ok" style="--d:.96s"><b>●</b> Bash<span>(open index.html)</span><i>⎿ ✓ running</i></div>
          </div></div>
        <div class="br">
          <div class="br-bar"><b></b><b></b><b></b><span>localhost:3000</span></div>
          <div class="br-page game">
            <div class="sn-head"><span>SNAKE</span><span class="sn-score">SCORE 0</span></div>
            <canvas class="sn"></canvas>
          </div>
        </div>`;
    },
    make(f) {
      const page = f.querySelector('.br-page'), cv = f.querySelector('.sn'), g = cv.getContext('2d'), sc = f.querySelector('.sn-score');
      const C = 24, R = 14;
      cv.width = page.clientWidth - 32; cv.height = Math.round(cv.width * R / C);
      const cell = cv.width / C;
      let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      let snake = [[6, 7], [5, 7], [4, 7], [3, 7]], food = [15, 4], dir = [1, 0], steps = 0, score = 0;
      const free = (x, y) => x >= 0 && y >= 0 && x < C && y < R && !snake.some(([a, b]) => a === x && b === y);
      function step() {
        const [hx, hy] = snake[0];
        const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => free(hx + dx, hy + dy));
        opts.sort((p, q) => (Math.abs(hx + p[0] - food[0]) + Math.abs(hy + p[1] - food[1])) - (Math.abs(hx + q[0] - food[0]) + Math.abs(hy + q[1] - food[1])));
        if (opts.length) dir = opts[0];
        const nh = [hx + dir[0], hy + dir[1]];
        snake.unshift(nh);
        if (nh[0] === food[0] && nh[1] === food[1]) { score += 10; do { food = [(rnd() * C) | 0, (rnd() * R) | 0]; } while (!free(...food)); }
        else snake.pop();
      }
      return { update(t) {
        page.classList.toggle('live', t > 1000);
        if (t < 1000) return;
        const want = Math.floor((t - 1000) / 55);
        while (steps < want) { step(); steps++; }
        sc.textContent = 'SCORE ' + score;
        g.fillStyle = '#050505'; g.fillRect(0, 0, cv.width, cv.height);
        g.strokeStyle = 'rgba(243,239,230,.05)'; g.lineWidth = 1;
        for (let x = 0; x <= C; x++) { g.beginPath(); g.moveTo(x * cell, 0); g.lineTo(x * cell, cv.height); g.stroke(); }
        for (let y = 0; y <= R; y++) { g.beginPath(); g.moveTo(0, y * cell); g.lineTo(cv.width, y * cell); g.stroke(); }
        g.shadowColor = 'rgba(240,162,75,.9)'; g.shadowBlur = 14; g.fillStyle = '#f0a24b';
        g.beginPath(); g.arc((food[0] + .5) * cell, (food[1] + .5) * cell, cell * .32, 0, 7); g.fill();
        g.shadowColor = 'rgba(143,227,165,.8)'; g.shadowBlur = 10;
        snake.forEach(([x, y], k) => { g.fillStyle = k ? 'rgba(143,227,165,.85)' : '#d8ffe3'; g.fillRect(x * cell + 1.5, y * cell + 1.5, cell - 3, cell - 3); });
        g.shadowBlur = 0;
      } };
    },
  };

  /* The OpenAI incident: a swarm of agents wires itself together and breaches Hugging Face */
  const HF = {
    build(f) {
      f.classList.add('pn', 'hf');
      f.innerHTML = `<canvas class="hf-net"></canvas>
        <div class="hf-core"><img src="promo/media/hf-logo.svg" alt="Hugging Face"><i class="hf-ring"></i></div>
        <div class="hf-stats"><span><b class="hf-a">0</b>AI agents</span><span><b class="hf-m">0</b>messages</span></div>
        <div class="hf-src">Sources: Bloomberg, 21 July 2026 · METR, 26 August 2026</div>`;
    },
    make(f) {
      const cv = f.querySelector('.hf-net'), g = cv.getContext('2d'), core = f.querySelector('.hf-core');
      const na = f.querySelector('.hf-a'), nm = f.querySelector('.hf-m');
      cv.width = f.clientWidth; cv.height = f.clientHeight;
      const W = cv.width, H = cv.height, cx = W / 2, cy = H * .44, M = Math.min(W, H);
      let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const N = 170;
      const A = Array.from({ length: N }, (_, i) => ({ a: rnd() * Math.PI * 2, r: .3 + rnd() * .22, born: rnd() * 500, ph: rnd() * 6 }));
      const E = [];
      A.forEach((p, i) => { for (let k = 0; k < 2; k++) E.push([i, (i + 1 + ((rnd() * 9) | 0)) % N]); });
      const pulses = Array.from({ length: 60 }, () => ({ e: (rnd() * E.length) | 0, o: rnd() }));
      let breached = false;
      const pos = (p, t) => {
        const pull = Math.min(1, Math.max(0, (t - 550) / 750));
        const r = (p.r - (p.r - .13) * pull * pull) * M;
        const a = p.a + t / 2600 + Math.sin(t / 300 + p.ph) * .02;
        return [cx + Math.cos(a) * r * 1.25, cy + Math.sin(a) * r];
      };
      return { update(t) {
        g.clearRect(0, 0, W, H);
        const red = Math.min(1, Math.max(0, (t - 500) / 700));
        const P = A.map(p => pos(p, t));
        g.lineWidth = 1;
        E.forEach(([i, j]) => {
          if (t < A[i].born || t < A[j].born) return;
          g.strokeStyle = `rgba(${Math.round(243 + (255 - 243) * red)},${Math.round(239 - 170 * red)},${Math.round(230 - 180 * red)},${(.07 + .12 * red).toFixed(3)})`;
          g.beginPath(); g.moveTo(P[i][0], P[i][1]); g.lineTo(P[j][0], P[j][1]); g.stroke();
        });
        pulses.forEach(q => {
          const [i, j] = E[q.e]; if (t < A[i].born || t < A[j].born) return;
          const u = (q.o + t / 420) % 1;
          g.fillStyle = `rgba(255,${Math.round(200 - 120 * red)},${Math.round(150 - 110 * red)},.95)`;
          g.beginPath(); g.arc(P[i][0] + (P[j][0] - P[i][0]) * u, P[i][1] + (P[j][1] - P[i][1]) * u, 2.2, 0, 7); g.fill();
        });
        A.forEach((p, k) => {
          if (t < p.born) return;
          g.fillStyle = `rgba(255,${Math.round(235 - 160 * red)},${Math.round(225 - 175 * red)},.95)`;
          g.beginPath(); g.arc(P[k][0], P[k][1], 3.2, 0, 7); g.fill();
        });
        na.textContent = Math.round(700 * Math.min(1, t / 900)).toLocaleString('en-US');
        nm.textContent = Math.round(70000 * Math.min(1, t / 1500)).toLocaleString('en-US') + (t > 1500 ? '+' : '');
        if (t > 1250 && !breached) { breached = true; core.classList.add('breach'); S('sub', .7); tick(true); }
      } };
    },
  };

  const HAPPENINGS = [
    [AE.build, ['AlphaEvolve · Google DeepMind', 'AI beats a matrix algorithm that stood since 1969.'], AE, 1500],
    [NS.build, ['Navier–Stokes · OpenAI', 'OpenAI says its AI agents solved a Millennium Prize Problem.'], NS, 1500],
    [CC.build, ['Claude Code', 'Ask for a game. Watch it get built. Play it.'], CC, 2200],
    [HF.build, ['When AI goes wrong · July 2026', 'OpenAI test models broke out of an evaluation and breached Hugging Face.'], HF, 1800],
    [null, ['Concentration of power', 'Who controls the most capable models?'], 'portraits', 1000, { people: [
      { id: 'power-trump', name: 'Donald Trump', role: 'United States' }, { id: 'power-xi', name: 'Xi Jinping', role: 'China' },
      { id: 'power-altman', name: 'Sam Altman', role: 'OpenAI' }, { id: 'power-amodei', name: 'Dario Amodei', role: 'Anthropic' }] }],
    [vid('promo/media/robot-intra.mp4', 'pm-vid', '50% 8%'), ['Embodied AI', 'Intelligence with a body.'], null, 1000],
  ];
  const QUESTIONS = ['Can we keep it safe?', 'Who gets to decide?', 'What happens when AI acts on its own?'];
  const LAPSE = [[1936, 'turing'], [1944, 'colossus'], [1946, 'eniac'], [1956, 'maniac'], [1958, 'perceptron'], [1966, 'teletype'],
    [1974, 'punch-cards'], [1980, 'lisp-machine'], [1989, 'mnist'], [1997, 'kasparov'], [2009, 'fei-fei-li'], [2012, 'gpu'],
    [2016, 'go-board'], [2020, 'protein-1'], [2022, 'smartphone'], [2024, 'nobel-medal']];
  const HISTORY = [
    ['turing', 1936, 'A machine on paper'], ['chess', 1956, 'Chess'], ['kasparov', 1997, 'Deep Blue'],
    ['gpu', 2012, 'AlexNet'], ['go-board', 2016, 'AlphaGo'], ['chess-board', 2017, 'AlphaZero'],
    ['smartphone', 2022, 'ChatGPT'], ['nobel-medal', 2024, 'The Nobel Prize'],
  ];

  let lapse = null;
  function schedule() {
    cues = []; typers = [];
    // 1. A time-lapse: ninety years, accelerating
    at(0, () => {
      S('sub', .55); root.classList.add('history', 'lapse');
      el.yearN.textContent = '1936'; el.yearL.textContent = 'A machine on paper';
      el.year.classList.add('in', 'solo'); show(img('turing', 'pm-kb'), null);
      lapse = { idx: 0 };
    });
    at(700, () => { el.yearL.textContent = ''; S('riser', 2.3); });
    at(3000, () => {
      lapse = null; clearShots(); root.classList.remove('history');
      el.yearN.textContent = '2026'; el.yearL.textContent = 'Where we are now';
      el.year.classList.remove('in'); void el.year.offsetWidth; el.year.classList.add('in', 'land');
      S('braam');
    });
    at(3500, () => el.year.classList.remove('in', 'land', 'solo'));
    // 2. What is happening
    let t = 3600;
    at(t, () => { cue({ tick: 104, pad: 'Dm', padLevel: .36, ost: .3, shep: .3 }); root.classList.add('history'); });
    HAPPENINGS.forEach(([build, cap, fx, dur, opts], i) => {
      at(t, () => {
        const f = show(build, cap, fx, opts, 0);
        if (fx === 'portraits') f.querySelectorAll('.pt').forEach((p, k) => p.style.setProperty('--d', (k * .12).toFixed(2) + 's'));
        tick(true); if (fx === 'incident') S('sub', .5);
      });
      t += dur;
    });
    const X = t - 12000;                         // the happenings' total length moves everything after them
    // 3. Questions
    at(X + 12000, () => { clearShots(); root.classList.remove('history'); cue({ tick: 0, ost: 0, shep: 0, padLevel: .26 }); });
    QUESTIONS.forEach((q, i) => at(X + 12100 + i * 950, () => {
      el.q.innerHTML = q + '<b class="caret"></b>'; el.q.classList.remove('in'); void el.q.offsetWidth; el.q.classList.add('in'); S('sub', .45);
    }));
    at(X + 14950, () => el.q.classList.remove('in'));
    // 4. How did we get here?
    at(X + 15050, () => { el.q.innerHTML = '<i>How did we get here?</i><b class="caret"></b>'; el.q.classList.add('in', 'how'); cue({ padLevel: .18 }); });
    at(X + 16250, () => el.q.classList.remove('in'));
    at(X + 16350, () => { show(null, null, 'rewind', { from: 2026, to: 1936, dur: 1100 }); S('rewind', 1.25); cue({ padLevel: 0 }); });
    at(X + 17650, () => { root.classList.add('history'); S('riser', 4.0); cue({ tick: 120, pad: 'Am', padLevel: .3 }); });
    HISTORY.forEach(([id, y, label], i) => at(X + 17650 + i * 500, () => {
      show(id === 'chess' ? vid('promo/media/chess-intra.mp4', 'pm-vid') : img(id, 'pm-kb'), null);
      el.yearN.textContent = y; el.yearL.textContent = label;
      el.year.classList.remove('in', 'solo'); void el.year.offsetWidth; el.year.classList.add('in');
      tick(true);
    }));
    // 5. Silence, then the title
    at(X + 21650, () => { clearShots(); root.classList.remove('history'); el.year.classList.remove('in'); el.year.classList.add('gone'); cue({ tick: 0, padLevel: 0, ost: 0 }); });
    at(X + 21900, () => { el.block.classList.add('show'); moveCaret(el.a); });
    type(el.a, 'From Silicon', X + 22000, 40, 'key');
    type(el.b, 'to Machines That', X + 22550, 34, 'key');
    type(el.think, 'Think', X + 23150, 58, 'key');
    at(X + 23700, () => { el.thinkWrap.classList.add('struck'); S('sub', .75); });
    type(el.act, 'Act', X + 23950, 90, 'key');
    at(X + 24250, () => { el.act.classList.add('lit'); S('braam'); });
    at(X + 24600, () => el.sub.classList.add('show'));
    // 6. End card: the Earth at night, and a click
    at(X + 25200, () => {
      root.classList.add('ended'); el.end.classList.add('show');
      el.earth.dataset.play = '1'; el.earth.classList.add('on'); el.earth.play().catch(() => {});
      cue({ pad: 'C', padLevel: .45, padFade: 2 });
    });
    at(X + 26300, () => el.cursor.classList.add('in'));
    at(X + 27150, () => { el.cta.classList.add('clicked'); S('chime', [79, 84, 91]); try { Score.key(); } catch (e) {} });
    at(X + 27500, () => el.cta.classList.remove('clicked'));
    at(X + 27900, () => el.cta.classList.add('glow'));
    at(X + 29400, () => root.classList.add('fadeout'));
    at(X + 30000, () => { running = false; window.__promoDone = true; });
  }

  // The time-lapse runs per frame: the year accelerates, the photographs follow it
  function runLapse(t) {
    if (!lapse || t < 700) return;
    const p = Math.min(1, (t - 700) / 2300);
    const y = Math.min(2026, 1936 + Math.round(90 * Math.pow(p, 2.1)));
    el.yearN.textContent = y;
    let k = 0; LAPSE.forEach(([yy], i) => { if (y >= yy) k = i; });
    if (k !== lapse.idx) { lapse.idx = k; show(img(LAPSE[k][1], 'pm-kb'), null); tick(true); }
  }

  let lastNow = 0;
  function frame(now) {
    if (!running) return;
    const t = now - t0, dt = Math.min(80, now - (lastNow || now)); lastNow = now;
    cues.forEach(c => { if (!c.done && t >= c.ms) { c.done = true; c.fn(); } });
    typers.forEach(ty => {
      const n = Math.max(0, Math.min(ty.text.length, Math.floor((t - ty.start) / ty.mpc)));
      if (t >= ty.start && n !== ty.shown) {
        if (n > ty.shown && n > 0 && ty.text[n - 1] !== ' ') { try { Score.key(); } catch (e) {} }
        ty.shown = n; ty.node.textContent = ty.text.slice(0, n); moveCaret(ty.node);
      }
    });
    runLapse(t);
    live.forEach(x => { if (x.inst && x.inst.update) { try { x.inst.update(t - x.start + x.offset, dt || 16); } catch (e) {} } });
    requestAnimationFrame(frame);
  }

  async function ready() {
    await (document.fonts ? document.fonts.ready : Promise.resolve());
    const ids = ['power-trump', 'power-xi', 'power-altman', 'power-amodei', 'eniac', 'protein-1', ...LAPSE.map(l => l[1]), ...HISTORY.map(h => h[0])];
    await Promise.all(ids.map(id => MEDIA[id] && new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = MEDIA[id].file; })));
    await new Promise(r => { if (el.earth.readyState >= 2) r(); else { el.earth.addEventListener('loadeddata', r, { once: true }); el.earth.load(); } });
  }
  function start() {
    schedule();
    running = true; t0 = performance.now(); lastNow = 0;
    requestAnimationFrame(frame);
  }
  window.__promo = { ready, start };

  if (!params.has('capture') && !params.has('audio')) {
    const hint = document.createElement('button');
    hint.className = 'promo-play'; hint.textContent = 'Click to play the trailer, with sound';
    root.appendChild(hint);
    hint.addEventListener('click', async () => { hint.remove(); Score.init(); await ready(); start(); });
  }
})();
