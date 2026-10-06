/* ==========================================================================
   THE TRAILER. The opening sequence, about 32 seconds.
   Black screen and a waiting cursor. The viewer powers the machine on.
   Claude is asked for popcorn. It thinks, plans, and does it: answer → reason → act.
   Everything freezes. "Machines that don't just answer… but act."
   The title types itself: "Think" is struck through and "Act" replaces it.
   A montage accelerates, cuts to silence, and the title returns with Begin.
   ========================================================================== */
const Intro = (() => {
  const $ = (s) => document.querySelector(s);
  const root = $('#start');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MEDIA = {};
  const D = window.FILM_DATA || { images: [], videos: [] };
  D.images.forEach(m => { MEDIA[m.id] = { ...m, kind: 'img' }; });
  D.videos.forEach(m => { MEDIA[m.id] = { ...m, kind: 'video' }; });

  let state = 'gate';          // gate → playing → end
  let t0 = 0, raf = 0, cues = [], typers = [], shotTimer = null;

  const el = {
    gate: $('#powerOn'), crt: $('.intro-crt'), block: $('.intro-titleblock'),
    a: $('.it-a .ty'), b: $('.it-b .ty'), think: $('.it-c .think .ty'), thinkWrap: $('.it-c .think'),
    act: $('.it-c .act'), caret: $('.intro-title .caret'), sub: $('.intro-sub'),
    montage: $('.intro-montage'), label: $('.intro-label'),
    claude: $('.intro-claude'), you: $('.ic-you span'), ai: $('.ic-ai span'), status: $('.ic-status'),
    thinking: $('.ic-think'), thinkText: $('.ic-think span'), spin: $('.ic-think .spin'), plan: $('.ic-plan'),
    steps: [...document.querySelectorAll('.pl-step')], kernels: $('.pl-kernels'), done: $('.ic-done'), recipe: $('.ic-recipe'),
    line: $('.intro-line'),
    begin: $('.intro-begin'), skip: $('#btnSkip'), sr: $('#introSr'),
  };

  /* ---------- Helpers ---------- */
  const at = (ms, fn) => cues.push({ ms, fn, done: false });
  function type(node, text, start, msPerChar, sound = 'key', caretAfter = true) {
    typers.push({ node, text, start, msPerChar, sound, caretAfter, shown: -1 });
  }
  function moveCaret(node) { if (node && el.caret.previousSibling !== node) node.after(el.caret); }

  /* ---------- Montage shots ---------- */
  const shots = [
    { kind: 'media', id: 'v-chess', fallback: 'maniac-chess', label: 'Chess' },
    { kind: 'media', id: 'chess-board', label: 'AlphaZero · 2017' },
    { kind: 'media', id: 'v-protein', fallback: 'protein-1', label: 'AlphaFold · 2020' },
    { kind: 'panel', panel: 'equation', label: 'Mathematics · 2026' },
    { kind: 'media', id: 'v-robot-modern', fallback: 'valkyrie', label: 'Robotics · 2026' },
    { kind: 'panel', panel: 'evolve', label: 'AlphaEvolve · 2025' },
    { kind: 'panel', panel: 'incident', label: 'Incident · 2026' },
  ];
  const durations = [950, 880, 820, 760, 720, 680, 640];

  function buildShot(s) {
    const f = document.createElement('div');
    f.className = 'im-shot';
    if (s.kind === 'media') {
      const m = MEDIA[s.id] && !(reduced && MEDIA[s.id].kind === 'video') ? MEDIA[s.id] : MEDIA[s.fallback];
      if (!m) return f;
      let node;
      if (m.kind === 'video') {
        node = document.createElement('video');
        Object.assign(node, { muted: true, loop: true, playsInline: true, autoplay: true, preload: 'auto', src: m.file });
        node.setAttribute('muted', ''); node.setAttribute('playsinline', '');
        if (m.poster) node.poster = m.poster;
      } else { node = new Image(); node.src = m.file; node.alt = ''; }
      node.style.objectPosition = m.focus || '50% 50%';
      f.appendChild(node);
    } else {
      f.classList.add('pn', 'pn-' + s.panel);
      f.innerHTML = PANELS[s.panel]();
    }
    return f;
  }
  const PANELS = {
    equation: () => `<canvas class="flow"></canvas>
      <div class="eq"><i>∂u</i>/<i>∂t</i> + (<i>u</i>·∇)<i>u</i> = −∇<i>p</i> + <i>ν</i>∇²<i>u</i></div>
      <div class="eq2">∇·<i>u</i> = 0</div>`,
    agent: () => `<div class="ag">
      <div style="--d:.05s">thinking…  the goal needs three steps</div>
      <div style="--d:.25s">→ tool  search("protein binders")</div>
      <div style="--d:.45s">→ tool  run(simulation_04)</div>
      <div class="ok" style="--d:.65s">✓ action complete</div></div>`,
    evolve: () => `<pre class="ev-code"></pre><div class="ev-score">generation <b>1,204</b> · score <b class="sc">0.912</b></div>`,
    incident: () => {
      const m = MEDIA['server-racks'];
      return (m ? `<img src="${m.file}" alt="">` : '') + `<div class="glitch"></div><div class="alert">anomaly detected</div>`;
    },
  };
  const CODE = ['def multiply(A, B):', '    m = [[0] * 4 for _ in range(4)]', '    for i in range(4):', '        for k in range(4):',
    '            a = A[i][k]', '            for j in range(4):', '                m[i][j] += a * B[k][j]', '    return m'];
  function animatePanel(f, k) {
    if (f.classList.contains('pn-equation')) {
      const c = f.querySelector('canvas'); const g = c.getContext('2d');
      const W = c.width = f.clientWidth || innerWidth, H = c.height = f.clientHeight || innerHeight;
      const pts = Array.from({ length: 260 }, () => [Math.random() * W, Math.random() * H]);
      let n = 0;
      const step = () => {
        if (!f.isConnected || n++ > 120) return;
        g.fillStyle = 'rgba(5,5,5,.08)'; g.fillRect(0, 0, W, H);
        g.strokeStyle = 'rgba(240,162,75,.55)'; g.lineWidth = 1;
        pts.forEach(p => {
          const a = Math.sin(p[1] / 90 + n / 30) + Math.cos(p[0] / 130);
          const nx = p[0] + Math.cos(a) * 3.2, ny = p[1] + Math.sin(a) * 3.2;
          g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(nx, ny); g.stroke();
          p[0] = nx > W ? 0 : nx < 0 ? W : nx; p[1] = ny > H ? 0 : ny < 0 ? H : ny;
        });
        requestAnimationFrame(step);
      };
      step();
    }
    if (f.classList.contains('pn-evolve')) {
      const pre = f.querySelector('.ev-code'), sc = f.querySelector('.sc');
      const glyphs = 'abcdefghijklmnopqrstuvwxyz[]()+*=_0123456789';
      let n = 0;
      const step = () => {
        if (!f.isConnected || n++ > 60) return;
        pre.textContent = CODE.map(line => line.replace(/[a-z0-9]/g, ch => Math.random() < .06 ? glyphs[Math.floor(Math.random() * glyphs.length)] : ch)).join('\n');
        sc.textContent = (0.912 + n * 0.0011).toFixed(3);
        setTimeout(step, 50);
      };
      step();
    }
  }

  function playMontage(start) {
    let t = start;
    shots.forEach((s, i) => {
      at(t, () => {
        const f = buildShot(s);
        el.montage.appendChild(f);
        requestAnimationFrame(() => f.classList.add('on'));
        const prev = [...el.montage.children].slice(0, -1);
        prev.forEach(p => { p.classList.remove('on'); setTimeout(() => p.remove(), 500); });
        animatePanel(f, i);
        el.label.textContent = s.label;
        el.label.classList.remove('in'); void el.label.offsetWidth; el.label.classList.add('in');
        Score.tickAt(0, true); Score.tickAt(0.012);
        if (i === shots.length - 1) Score.at('sub', 0, .5);
      });
      t += durations[i];
    });
    return t;
  }

  /* ---------- The Claude moment: make me some popcorn ---------- */
  const SPIN = ['·', '✢', '✳', '✶', '✻', '✽'];
  let spinT = null;
  function spinner(on) {
    clearInterval(spinT);
    if (on) { let k = 0; spinT = setInterval(() => { el.spin.textContent = SPIN[k++ % SPIN.length]; }, 120); }
  }
  function pop() {
    const n = reduced ? 10 : 56;
    for (let i = 0; i < n; i++) {
      const k = document.createElement('i');
      const a = -Math.PI / 2 + (Math.random() - .5) * Math.PI * 1.6, d = 50 + Math.random() * 150;
      k.style.setProperty('--dx', (Math.cos(a) * d).toFixed(0) + 'px');
      k.style.setProperty('--dy', (Math.sin(a) * d - 40).toFixed(0) + 'px');
      k.style.setProperty('--dl', (Math.random() * 1.1).toFixed(2) + 's');
      k.style.setProperty('--sz', (5 + Math.random() * 6).toFixed(1) + 'px');
      el.kernels.appendChild(k);
    }
  }

  /* ---------- The sequence ---------- */
  function schedule() {
    cues = []; typers = [];
    at(0, () => { Score.at('poweron'); el.crt.classList.add('on'); root.classList.add('powered'); });

    // 1. A request
    at(1300, () => { el.claude.classList.add('show'); });
    type(el.you, 'Make me some popcorn.', 1700, 50, 'type', false);
    // 2. Reasoning
    at(2900, () => { el.thinking.classList.add('show'); el.status.textContent = 'thinking'; spinner(true); });
    at(3900, () => { el.thinkText.textContent = 'Planning…'; el.status.textContent = 'planning'; });
    at(4300, () => { el.plan.classList.add('show'); });
    el.steps.forEach((st, i) => at(4400 + i * 110, () => st.classList.add('in')));
    // 3. Acting
    const run = [5300, 6700, 7100, 7500, 7900, 8900, 10300];
    const last = run.length - 1;
    run.forEach((ms, i) => at(ms, () => {
      el.steps.forEach((st, j) => { st.classList.toggle('now', j === i); if (j < i) st.classList.add('ok'); });
      el.plan.style.setProperty('--prog', (i / last).toFixed(3));
      el.status.textContent = i === 0 ? 'searching the web' : 'acting';
      el.thinkText.textContent = ['Searching the web for a recipe…', 'Checking the kitchen…', 'Finding the popcorn…', 'Preparing a bowl…', 'Heating…', 'Popping…', 'Serving…'][i];
      Score.tickAt(0, true);
      if (i === 0) { [0.12, 0.2, 0.26, 0.5, 0.58, 0.9].forEach(d => Score.tickAt(d)); }
      if (i === 4) Score.at('hum', 0, 1.0);
      if (i === 5) { Score.at('popcorn', 0, 1.3); pop(); }
      if (i === 6) Score.at('ding');
    }));
    at(6200, () => { el.recipe.classList.add('show'); });
    const X = 1350;                                  // everything after the run shifts by the recipe step
    at(9500 + X, () => {
      el.steps.forEach(st => { st.classList.remove('now'); st.classList.add('ok'); });
      el.plan.style.setProperty('--prog', 1);
      spinner(false); el.thinking.classList.remove('show');
      el.done.classList.add('show'); el.status.textContent = 'done';
    });
    type(el.ai, 'Your popcorn is ready.', 10000 + X, 46, null, false);
    at(10000 + X, () => { el.sr.textContent = 'Make me some popcorn. Claude thinks, plans and acts: search the web for a recipe, check the kitchen, find the popcorn, prepare a bowl, heat, pop, serve. Your popcorn is ready.'; });
    // 4. Freeze
    at(11500 + X, () => { root.classList.add('freeze'); Score.stopAll(); });
    at(12200 + X, () => { el.claude.classList.remove('show'); el.line.classList.add('a'); });
    at(14000 + X, () => { el.line.classList.add('dim-ans'); });
    at(14700 + X, () => { el.line.classList.add('b'); Score.at('boom'); el.sr.textContent = 'Machines that don’t just answer… but act.'; });
    at(16600 + X, () => { el.line.classList.add('out'); root.classList.remove('freeze'); });

    // 5. The title types itself
    const O = 17200 + X;
    at(O, () => { el.block.classList.add('show'); moveCaret(el.a); });
    type(el.a, 'From Silicon', O + 200, 85);
    type(el.b, 'to Machines That', O + 1400, 78);
    type(el.think, 'Think', O + 2850, 115);
    at(O + 4300, () => { el.thinkWrap.classList.add('struck'); Score.at('sub', 0, .75); });
    type(el.act, 'Act', O + 4800, 170);
    at(O + 5350, () => { Score.at('boom'); el.act.classList.add('lit'); });
    at(O + 5900, () => { el.sub.classList.add('show'); el.sr.textContent = 'From Silicon to Machines That Act. A journey through the history, breakthroughs and future of artificial intelligence.'; });

    // 6. Montage, then silence, then the title returns
    at(O + 7600, () => { root.classList.add('montage'); Score.at('riser', 0, 5.6); });
    const end = playMontage(O + 7800);
    at(end, () => {
      root.classList.remove('montage'); root.classList.add('cut');
      [...el.montage.children].forEach(p => p.remove());
      el.label.classList.remove('in');
    });
    at(end + 900, () => { root.classList.remove('cut'); root.classList.add('final'); Score.at('braam'); });
    at(end + 3200, () => showEnd());
  }

  function loop(now) {
    if (state !== 'playing') return;
    const t = now - t0;
    cues.forEach(c => { if (!c.done && t >= c.ms) { c.done = true; c.fn(); } });
    typers.forEach(ty => {
      const n = Math.max(0, Math.min(ty.text.length, Math.floor((t - ty.start) / ty.msPerChar)));
      if (t >= ty.start && n !== ty.shown) {
        if (n > ty.shown && n > 0 && ty.text[n - 1] !== ' ') {
          if (ty.sound === 'key') Score.key(); else if (ty.sound === 'type') Score.type();
        }
        ty.shown = n;
        ty.node.textContent = ty.text.slice(0, n);
        if (ty.caretAfter) moveCaret(ty.node);
      }
    });
    raf = requestAnimationFrame(loop);
  }

  /* ---------- Public ---------- */
  function powerOn() {
    if (state !== 'gate') return;
    Score.init();
    state = 'playing';
    el.gate.hidden = true;
    el.skip.hidden = false;
    schedule();
    t0 = performance.now();
    raf = requestAnimationFrame(loop);
  }
  function showEnd(opts = {}) {
    state = 'end';
    cancelAnimationFrame(raf);
    el.gate.hidden = true; el.skip.hidden = true;
    root.classList.remove('montage', 'cut', 'gone');
    root.classList.add('powered', 'final', 'ended');
    el.montage.innerHTML = ''; el.claude.classList.remove('show'); spinner(false);
    root.classList.remove('freeze'); el.line.classList.add('out');
    el.a.textContent = 'From Silicon'; el.b.textContent = 'to Machines That';
    el.think.textContent = 'Think'; el.thinkWrap.classList.add('struck');
    el.act.textContent = 'Act'; el.act.classList.add('lit');
    el.act.after(el.caret);
    el.block.classList.add('show'); el.sub.classList.add('show');
    el.begin.classList.add('show');
    const ring = el.begin.querySelector('.ring');             // restart the ring so its pulse lines up with the sound
    ring.style.animation = 'none'; void ring.offsetWidth; ring.style.animation = '';
    Score.idle(true);
    const label = el.begin.querySelector('.begin-label');
    if (opts.again) { label.textContent = 'Watch again'; $('#btnStart').setAttribute('aria-label', 'Watch the film again'); }
    setTimeout(() => $('#btnStart').focus({ preventScroll: true }), 50);
  }
  function key(e) {
    if (e.key === 't' || e.key === 'T') return 'transcript';
    if (state === 'gate') { e.preventDefault(); powerOn(); return 'handled'; }
    if (state === 'playing' && ['Escape', 'Enter', ' '].includes(e.key)) { e.preventDefault(); showEnd(); return 'handled'; }
    return null;
  }

  el.gate.addEventListener('click', powerOn);
  el.skip.addEventListener('click', () => showEnd());
  root.addEventListener('click', (e) => { if (state === 'gate' && !e.target.closest('button')) powerOn(); });

  return { powerOn, showEnd, key, get state() { return state; } };
})();
