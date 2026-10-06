/* ==========================================================================
   FX. The special shots. Each effect is a factory:
       FX.name(el, scene, api) → { update(t, dt), resize(), destroy() }
   `t` is scene time in ms (it stops when the film is paused).
   Typographic sequences use CSS animation-delay so they freeze on pause too.
   ========================================================================== */
const FX = (() => {
  const h = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const ease = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
  const easeIO = (x) => { x = clamp(x, 0, 1); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };

  function canvas(el, opts = {}) {
    const cv = h('canvas', opts.cls || 'fx-canvas');
    el.appendChild(cv);
    const g = cv.getContext('2d');
    const o = { cv, g, w: 0, h: 0, dpr: 1 };
    o.size = () => {
      const r = (opts.box || el).getBoundingClientRect();
      o.dpr = opts.pixel ? 1 : Math.min(2, window.devicePixelRatio || 1);
      o.w = opts.fixedW || r.width; o.h = opts.fixedH || r.height;
      cv.width = Math.round(o.w * o.dpr); cv.height = Math.round(o.h * o.dpr);
      if (!opts.fixedW) { cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px'; }
      g.setTransform(o.dpr, 0, 0, o.dpr, 0, 0);
    };
    o.size();
    return o;
  }
  // Typewriter driven by scene time
  function typer(node, text, start, cps, api, sound = true) {
    let shown = -1;
    return (t) => {
      const n = clamp(Math.floor((t - start) / 1000 * cps), 0, text.length);
      if (n !== shown) {
        if (sound && n > shown && n > 0 && text[n - 1] !== ' ') api.type();
        shown = n;
        node.textContent = text.slice(0, n);
      }
      return n >= text.length;
    };
  }
  const seq = (items, base = 0, gap = 600) =>
    items.map((it, i) => it.replace('§', `style="--d:${(base + i * gap) / 1000}s"`));

  const fx = {};

  /* ---------- 1936: Turing's tape ---------- */
  fx.tape = (el) => {
    const wrap = h('div', 'fx-tape');
    const cells = h('div', 'tape-cells');
    const N = 64;
    const sym = [];
    for (let i = 0; i < N; i++) {
      const s = Math.random() < .35 ? '' : (Math.random() < .5 ? '0' : '1');
      sym.push(s);
      cells.appendChild(h('span', 'cell', s));
    }
    const head = h('div', 'tape-head', '<i></i><b>q<sub>1</sub></b>');
    wrap.append(cells, head);
    el.appendChild(wrap);
    let step = -1;
    return {
      update(t) {
        const s = Math.floor(t / 720);
        if (s !== step) {
          step = s;
          const idx = 24 + s;
          cells.style.transform = `translateX(calc(${-idx} * var(--cw) + 50vw - var(--cw) / 2))`;
          const c = cells.children[idx];
          if (c && s > 0) {
            c.textContent = Math.random() < .5 ? '1' : '0';
            c.classList.remove('write'); void c.offsetWidth; c.classList.add('write');
          }
          head.querySelector('b').innerHTML = `q<sub>${(s % 4) + 1}</sub>`;
        }
      },
    };
  };

  /* ---------- Cold open: 2026 montage ---------- */
  fx.montage = (el, scene, api) => {
    const ids = scene.fxOpts.images.map(id => api.media(id)).filter(Boolean);
    const words = scene.fxOpts.words;
    const frames = ids.map(m => {
      const f = h('div', 'mt-frame');
      const img = h('img'); img.src = m.file; img.alt = '';
      img.style.objectPosition = m.focus || '50% 50%';
      f.appendChild(img); el.appendChild(f);
      return f;
    });
    const word = h('div', 'mt-word'); el.appendChild(word);
    const every = scene.fxOpts.every || 900;
    let cur = -1;
    return {
      update(t) {
        const i = Math.floor(Math.max(0, t - 300) / every);
        if (i !== cur && i < words.length) {
          cur = i;
          frames.forEach((f, j) => f.classList.toggle('on', frames.length && j === i % frames.length));
          word.textContent = words[i];
          word.classList.remove('in'); void word.offsetWidth; word.classList.add('in');
        }
        if (t - 300 > every * words.length) { word.classList.add('gone'); }
      },
    };
  };

  /* ---------- The rewind: 2026 → 1936 ---------- */
  fx.rewind = (el, scene, api) => {
    const all = api.pool().slice().reverse();
    const n = Math.min(16, all.length);
    const pool = Array.from({ length: n }, (_, k) => all[Math.floor(k * all.length / n)]);
    const layer = h('div', 'rw-layer');
    const imgs = pool.map(m => {
      const i = h('img'); i.src = m.file; i.alt = ''; layer.appendChild(i); return i;
    });
    const num = h('div', 'rw-num', '2026');
    const lines = h('div', 'rw-lines');
    const tag = h('div', 'rw-tag', '◂◂ &nbsp;REWIND');
    el.append(layer, lines, num, tag);
    const from = scene.fxOpts.from, to = scene.fxOpts.to, dur = scene.fxOpts.dur;
    let last = -1;
    return {
      update(t) {
        const p = easeIO((t - 200) / dur);
        const y = Math.round(from + (to - from) * p);
        if (y !== last) { num.textContent = y; last = y; api.setYear(y, true); }
        const k = Math.floor(t / 260);
        imgs.forEach((im, j) => im.classList.toggle('on', imgs.length && j === k % imgs.length && p < 1));
        if (p >= 1) { tag.classList.add('gone'); num.classList.add('land'); }
      },
    };
  };

  /* ---------- 1956: the Dartmouth proposal ---------- */
  fx.proposal = (el, scene, api) => {
    const box = h('div', 'fx-proposal');
    const a = h('div', 'pp-line'), b = h('div', 'pp-line'), c = h('div', 'pp-line pp-ai');
    box.append(h('div', 'pp-date', 'August 31, 1955'), a, b, c);
    el.appendChild(box);
    const ta = typer(a, 'A PROPOSAL FOR THE', 400, 22, api);
    const tb = typer(b, 'DARTMOUTH SUMMER RESEARCH PROJECT ON', 1300, 26, api);
    const tc = typer(c, 'ARTIFICIAL INTELLIGENCE', 2900, 13, api);
    return {
      update(t) {
        ta(t); tb(t);
        if (tc(t)) box.classList.add('lit');
      },
    };
  };

  /* ---------- 1966: ELIZA ---------- */
  fx.eliza = (el, scene, api) => {
    const term = h('div', 'fx-term eliza');
    term.innerHTML = '<div class="term-bar"><span>ELIZA</span><span>MIT · 1966</span></div><div class="term-body"></div>';
    const body = term.querySelector('.term-body');
    el.appendChild(term);
    const convo = [
      ['you', 'Men are all alike.'],
      ['eliza', 'IN WHAT WAY'],
      ['you', 'They’re always bugging us about something or other.'],
      ['eliza', 'CAN YOU THINK OF A SPECIFIC EXAMPLE'],
      ['you', 'Well, my boyfriend made me come here.'],
      ['eliza', 'YOUR BOYFRIEND MADE YOU COME HERE'],
    ];
    let at = 500;
    const steps = convo.map(([who, text]) => {
      const line = h('div', 'term-line ' + who);
      const span = h('span');
      line.append(h('i', null, who === 'you' ? '&gt;' : ''), span);
      const cps = who === 'you' ? 24 : 60;
      const s = { line, ty: typer(span, text, at + 250, cps, api, who === 'you'), start: at };
      at += 250 + text.length / cps * 1000 + (who === 'you' ? 450 : 750);
      return s;
    });
    return {
      update(t) {
        steps.forEach(s => {
          if (t >= s.start && !s.line.parentNode) body.appendChild(s.line);
          if (s.line.parentNode) s.ty(t);
        });
      },
    };
  };

  /* ---------- Rules raining (chess / expert systems) ---------- */
  fx.rules = (el, scene) => {
    const sets = {
      chess: [
        'IF king.in_check THEN must_escape()',
        'IF piece == PAWN AND rank == 8 THEN promote(QUEEN)',
        'VALUE(queen) = 9 · VALUE(rook) = 5',
        'SEARCH depth = 2 ply',
        'IF square.attacked THEN avoid(square)',
        'PREFER moves WHERE center.control ↑',
        'IF material.lost > 3 THEN reject(move)',
        'EVAL = material + 0.1 × mobility',
      ],
      expert: [
        'RULE 037: IF stain = GRAM-NEGATIVE',
        '  AND morphology = ROD',
        '  AND aerobicity = ANAEROBIC',
        '  THEN organism = BACTEROIDES (0.6)',
        'RULE 112: IF pressure > 2.4 AND valve = CLOSED',
        '  THEN alarm = TRUE',
        'RULE 205: IF credit.history = POOR',
        '  THEN risk = HIGH (0.8)',
        'RULE 311: IF mineral = GALENA',
        '  THEN deposit = LEAD-ZINC (0.7)',
      ],
    };
    const lines = sets[scene.fxOpts.set] || sets.chess;
    const box = h('div', 'rules-box' + (scene.fxOpts.side === 'left' ? ' left' : ''));
    const col = h('div', 'fx-rules');
    for (let r = 0; r < 3; r++) lines.forEach((l, i) => col.appendChild(h('div', null, l)));
    box.appendChild(col); el.appendChild(box);
    return {};
  };

  /* ---------- AI Winter: snow + frost ---------- */
  fx.snow = (el, scene, api) => {
    const c = canvas(el);
    el.appendChild(h('div', 'fx-frost'));
    const flakes = Array.from({ length: api.reduced ? 60 : 220 }, () => ({
      x: Math.random(), y: Math.random(), r: Math.random() * 1.8 + .4,
      s: Math.random() * .04 + .02, d: Math.random() * Math.PI * 2,
    }));
    return {
      update(t, dt) {
        const { g, w, h: H } = c;
        g.clearRect(0, 0, w, H);
        g.fillStyle = 'rgba(235,240,245,.85)';
        flakes.forEach(f => {
          f.y += f.s * dt / 1000 * (api.reduced ? .3 : 1);
          f.x += Math.sin(t / 1400 + f.d) * .00025 * dt / 16;
          if (f.y > 1.02) { f.y = -.02; f.x = Math.random(); }
          g.globalAlpha = .25 + f.r / 3;
          g.beginPath(); g.arc(f.x * w, f.y * H, f.r, 0, Math.PI * 2); g.fill();
        });
        g.globalAlpha = 1;
      },
      resize: c.size,
    };
  };

  /* ---------- 1986: a network learns (forward + backprop) ---------- */
  fx.neural = (el, scene, api) => {
    const c = canvas(el);
    const layers = [4, 7, 7, 5, 2];
    let nodes = [], edges = [];
    const build = () => {
      nodes = []; edges = [];
      const { w, h: H } = c;
      const narrow = w < 700;
      const x0 = narrow ? w * .12 : w * .42, x1 = narrow ? w * .88 : w * .9;
      const y0 = H * .2, y1 = H * (narrow ? .58 : .78);
      layers.forEach((n, li) => {
        const x = x0 + (x1 - x0) * li / (layers.length - 1);
        const col = [];
        for (let i = 0; i < n; i++) col.push({ x, y: y0 + (y1 - y0) * (i + .5) / n, a: 0 });
        nodes.push(col);
      });
      for (let li = 0; li < layers.length - 1; li++)
        nodes[li].forEach(a => nodes[li + 1].forEach(b => edges.push({ a, b, li, w: Math.random() })));
    };
    build();
    const CYCLE = 2600;
    return {
      update(t) {
        const { g, w, h: H } = c;
        g.clearRect(0, 0, w, H);
        const cyc = Math.floor(t / CYCLE), p = (t % CYCLE) / CYCLE;
        const L = layers.length - 1;
        // forward pass 0 → .55, backward .55 → 1
        const fwd = clamp(p / .55, 0, 1) * L;
        const bwd = p > .55 ? L - clamp((p - .55) / .45, 0, 1) * L : -1;
        edges.forEach(e => {
          const lit = fwd >= e.li && fwd < e.li + 1;
          const back = bwd >= 0 && bwd <= e.li + 1 && bwd > e.li;
          const base = .05 + e.w * .14;
          g.strokeStyle = back ? `rgba(240,162,75,${.25 + e.w * .5})` : `rgba(243,239,230,${lit ? base + .25 : base})`;
          g.lineWidth = back ? 1.4 : .8 + e.w * .6;
          g.beginPath(); g.moveTo(e.a.x, e.a.y); g.lineTo(e.b.x, e.b.y); g.stroke();
          if (lit) {
            const q = fwd - e.li;
            g.fillStyle = 'rgba(255,255,255,.9)';
            g.beginPath(); g.arc(e.a.x + (e.b.x - e.a.x) * q, e.a.y + (e.b.y - e.a.y) * q, 1.6, 0, 7); g.fill();
          }
          if (back) {
            const q = bwd - e.li;
            g.fillStyle = 'rgba(240,162,75,1)';
            g.beginPath(); g.arc(e.a.x + (e.b.x - e.a.x) * q, e.a.y + (e.b.y - e.a.y) * q, 1.8, 0, 7); g.fill();
          }
        });
        // weights shift a little after every backward pass
        if (cyc !== this._c) { this._c = cyc; edges.forEach(e => { e.w = clamp(e.w + (Math.random() - .5) * .35, 0, 1); }); }
        nodes.forEach((col, li) => col.forEach(n => {
          const on = Math.abs(fwd - li) < .5 || Math.abs(bwd - li) < .5;
          g.fillStyle = '#050505';
          g.strokeStyle = on ? (bwd >= 0 ? '#f0a24b' : '#fff') : 'rgba(243,239,230,.45)';
          g.lineWidth = 1.2;
          g.beginPath(); g.arc(n.x, n.y, on ? 6 : 4.5, 0, 7); g.fill(); g.stroke();
        }));
        const lbl = bwd >= 0 ? 'ERROR  ◂  propagates back' : 'INPUT  ▸  prediction';
        g.font = '500 11px "IBM Plex Mono", monospace';
        g.fillStyle = bwd >= 0 ? 'rgba(240,162,75,.9)' : 'rgba(243,239,230,.55)';
        g.textAlign = 'right';
        g.fillText(lbl.toUpperCase(), nodes[L][0].x + 6, nodes[0][0].y - 34);
      },
      resize() { c.size(); build(); },
    };
  };

  /* ---------- The shift: rules → data ---------- */
  fx.shift = (el) => {
    const box = h('div', 'fx-shift');
    box.innerHTML = `
      <div class="sh-a rv" style="--d:.3s">Program the rules<i class="strike"></i></div>
      <div class="sh-arrow rv rv-fade" style="--d:2.4s">↓</div>
      <div class="sh-b rv" style="--d:2.8s">Give the machine <em>data</em></div>`;
    el.appendChild(box);
    return {};
  };

  /* ---------- 2009: ImageNet mosaic ---------- */
  fx.mosaic = (el, scene, api) => {
    const pool = api.pool();
    const grid = h('div', 'fx-mosaic');
    const cols = window.innerWidth < 700 ? 6 : 12, rows = window.innerWidth < 700 ? 10 : 7;
    grid.style.setProperty('--cols', cols);
    const tiles = [];
    for (let i = 0; i < cols * rows; i++) {
      const tile = h('div', 'tile');
      const img = h('img'); img.alt = ''; img.loading = 'eager';
      if (pool.length) img.src = pool[(i * 7) % pool.length].file;
      tile.appendChild(img); grid.appendChild(tile);
      tiles.push({ tile, img, at: 200 + Math.random() * 3800, next: 0 });
    }
    const counter = h('div', 'fx-counter', '<b>0</b><span>images at launch · 2009</span>');
    el.append(grid, counter);
    const num = counter.querySelector('b'), cap = counter.querySelector('span');
    // ImageNet launched with ~3.2M images (CVPR 2009) and grew to ~14.2M
    const phase = (tt) => tt < 3200 ? 3200000 * ease((tt - 300) / 2600) : 3200000 + (14197122 - 3200000) * ease((tt - 4200) / 3000);
    return {
      update(t) {
        tiles.forEach((s, i) => {
          if (t > s.at && !s.on) { s.on = true; s.tile.classList.add('on'); s.next = t + 600 + Math.random() * 1400; }
          if (s.on && t > s.next && pool.length && !api.reduced) {
            s.img.src = pool[Math.floor(Math.random() * pool.length)].file;
            s.next = t + 900 + Math.random() * 1800;
          }
        });
        num.textContent = Math.round(Math.max(0, phase(t))).toLocaleString('en-US');
        if (t > 4200 && !this._grew) { this._grew = true; cap.textContent = 'images · and growing'; }
      },
    };
  };

  /* ---------- 2012: AlexNet error bars ---------- */
  fx.bars = (el) => {
    const box = h('div', 'fx-bars');
    box.innerHTML = `
      <div class="bars-cap rv rv-fade" style="--d:.6s">ImageNet challenge · error rate · 2012</div>
      <div class="bar-row rival rv rv-fade" style="--d:1s"><span>Best rival</span><i style="--w:26.2"></i><b>26.2%</b></div>
      <div class="bar-row alex rv rv-fade" style="--d:2.2s"><span>AlexNet</span><i style="--w:15.3"></i><b>15.3%</b></div>`;
    el.appendChild(box);
    return {};
  };

  /* ---------- 2013: DQN plays Breakout from pixels ---------- */
  fx.breakout = (el, scene, api) => {
    const frame = h('div', 'fx-crt');
    el.appendChild(frame);
    const W = 160, H = 200;
    const c = canvas(frame, { pixel: true, fixedW: W, fixedH: H, cls: 'crt-canvas' });
    const score = h('div', 'crt-score', 'SCORE 000'); frame.appendChild(score);
    const ep = h('div', 'crt-ep', 'EPISODE 1'); frame.appendChild(ep);
    const colors = ['#c84848', '#c66c3a', '#b47a30', '#a2a22a', '#48a048', '#4248c8'];
    let bricks, ball, pad, pts, episode = 1;
    const reset = () => {
      bricks = [];
      for (let r = 0; r < 6; r++) for (let i = 0; i < 16; i++) bricks.push({ x: i * 10, y: 30 + r * 6, r, on: true });
      ball = { x: 30, y: 110, vx: 70, vy: -85 };
      pad = { x: 70, w: 22 }; pts = 0;
    };
    reset();
    return {
      update(t, dt) {
        const s = Math.min(dt, 40) / 1000 * 1.6;
        ball.x += ball.vx * s; ball.y += ball.vy * s;
        if (ball.x < 2 || ball.x > W - 2) { ball.vx *= -1; ball.x = clamp(ball.x, 2, W - 2); }
        if (ball.y < 20) { ball.vy = Math.abs(ball.vy); }
        // The agent: track the ball, aiming to send it to the left wall (the famous "tunnel")
        const aim = ball.x + (ball.vx > 0 ? 4 : -4) - 3;
        pad.x += clamp(aim - (pad.x + pad.w / 2), -3.2, 3.2) * Math.min(dt, 40) / 16;
        pad.x = clamp(pad.x, 0, W - pad.w);
        if (ball.y > 184 && ball.y < 190 && ball.x > pad.x - 2 && ball.x < pad.x + pad.w + 2 && ball.vy > 0) {
          ball.vy = -Math.abs(ball.vy);
          ball.vx = (ball.x - (pad.x + pad.w / 2)) * 7 - 18;
        }
        bricks.forEach(b => {
          if (b.on && ball.x > b.x && ball.x < b.x + 10 && ball.y > b.y && ball.y < b.y + 6) {
            b.on = false; ball.vy *= -1; pts += (6 - b.r);
          }
        });
        if (ball.y > H + 6 || bricks.every(b => !b.on)) { episode += 37; ep.textContent = 'EPISODE ' + episode; reset(); }
        const { g } = c;
        g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
        g.fillStyle = '#8e8e8e'; g.fillRect(0, 18, W, 2);
        bricks.forEach(b => { if (b.on) { g.fillStyle = colors[b.r]; g.fillRect(b.x, b.y, 10, 6); } });
        g.fillStyle = '#c84848'; g.fillRect(Math.round(pad.x), 188, pad.w, 3);
        g.fillStyle = '#e0e0e0'; g.fillRect(Math.round(ball.x) - 1, Math.round(ball.y) - 1, 2, 2);
        score.textContent = 'SCORE ' + String(pts).padStart(3, '0');
      },
    };
  };

  /* ---------- 2016: Move 37 ---------- */
  fx.go = (el) => {
    const N = 19;
    const svgNS = 'http://www.w3.org/2000/svg';
    const box = h('div', 'fx-go');
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '-1 -1 20 20');
    let lines = '';
    for (let i = 0; i < N; i++) {
      lines += `<line x1="0" y1="${i}" x2="18" y2="${i}"/><line x1="${i}" y1="0" x2="${i}" y2="18"/>`;
    }
    [3, 9, 15].forEach(x => [3, 9, 15].forEach(y => { lines += `<circle class="hoshi" cx="${x}" cy="${y}" r=".14"/>`; }));
    svg.innerHTML = `<g class="grid">${lines}</g><g class="stones"></g>`;
    box.appendChild(svg);
    el.appendChild(box);
    // A stylised opening (not a record of the real game), then a fifth-line shoulder hit.
    const moves = [[15,3],[3,15],[16,15],[2,3],[13,16],[15,10],[3,9],[15,16],[16,14],[5,2],[2,5],[13,2],[4,16],[16,8],[9,15],[10,3],[2,13],[15,5],[6,3],[16,4],[4,13],[13,14],[8,2],[16,11],[11,16],[3,6],[12,4],[14,12],[9,3],[16,12],[6,15],[5,16],[17,9],[14,9],[13,6],[12,14]];
    const g = svg.querySelector('.stones');
    const placed = [];
    moves.forEach(([x, y], i) => {
      const s = document.createElementNS(svgNS, 'circle');
      s.setAttribute('cx', x); s.setAttribute('cy', y); s.setAttribute('r', .46);
      s.setAttribute('class', 'stone ' + (i % 2 ? 'w' : 'b'));
      s.style.animationDelay = (0.4 + i * 0.07) + 's';
      g.appendChild(s); placed.push(s);
    });
    const m37 = document.createElementNS(svgNS, 'g');
    m37.setAttribute('class', 'm37');
    m37.innerHTML = `<circle class="ring" cx="14" cy="7" r=".9"/><circle class="stone b" cx="14" cy="7" r=".46"/>`;
    g.appendChild(m37);
    const label = h('div', 'go-label', '<b>37</b><span>Move</span>');
    box.appendChild(label);
    return {};
  };

  /* ---------- Search → Learn → Discover ---------- */
  fx.triptych = (el) => {
    const box = h('div', 'fx-trip');
    box.innerHTML = seq([
      '<div class="tp rv" §><b>Search</b><span>1997 · Deep Blue</span></div>',
      '<div class="tp-arrow rv rv-fade" §>→</div>',
      '<div class="tp rv" §><b>Learn</b><span>2016 · AlphaGo</span></div>',
      '<div class="tp-arrow rv rv-fade" §>→</div>',
      '<div class="tp rv lit" §><b>Discover</b><span>2017 · AlphaZero</span></div>',
    ], 300, 700).join('');
    el.appendChild(box);
    return {};
  };

  /* ---------- 2017: Attention ---------- */
  fx.attention = (el) => {
    const box = h('div', 'fx-attn');
    const words = ['The', 'animal', 'didn’t', 'cross', 'the', 'street', 'because', 'it', 'was', 'too', 'tired.'];
    const weights = [.08, 1, .1, .18, .05, .32, .12, 0, .2, .1, .4];
    const sent = h('div', 'attn-sent');
    const spans = words.map((w, i) => { const s = h('span', i === 7 ? 'q' : '', w); s.style.setProperty('--wt', weights[i]); sent.appendChild(s); return s; });
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.classList.add('attn-arcs');
    box.append(svg, sent);
    el.appendChild(box);
    const draw = () => {
      const br = box.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${br.width} ${br.height}`);
      svg.innerHTML = '';
      const q = spans[7].getBoundingClientRect();
      const qx = q.left + q.width / 2 - br.left, qy = q.top - br.top - 6;
      spans.forEach((s, i) => {
        if (i === 7) return;
        const r = s.getBoundingClientRect();
        const x = r.left + r.width / 2 - br.left, y = r.top - br.top - 6;
        const lift = Math.min(br.height * .9, 40 + Math.abs(x - qx) * .45);
        const p = document.createElementNS(svgNS, 'path');
        p.setAttribute('d', `M${qx},${qy} C${qx},${qy - lift} ${x},${y - lift} ${x},${y}`);
        p.style.setProperty('--wt', weights[i]);
        p.style.animationDelay = (1.6 + (1 - weights[i]) * .9) + 's';
        if (weights[i] === 1) p.classList.add('top');
        svg.appendChild(p);
      });
    };
    requestAnimationFrame(() => requestAnimationFrame(draw));
    if (document.fonts) document.fonts.ready.then(draw);
    return { resize: draw };
  };

  /* ---------- 2018–2020: scale ---------- */
  fx.scale = (el) => {
    const box = h('div', 'fx-scale');
    const models = [
      ['GPT', '2018', 0.117, '117M'],
      ['BERT', '2018', 0.34, '340M'],
      ['GPT-2', '2019', 1.5, '1.5B'],
      ['GPT-3', '2020', 175, '175B'],
    ];
    const maxR = 44; // vmin for the largest
    models.forEach(([name, y, p, lbl], i) => {
      const r = Math.max(.35, maxR * Math.sqrt(p / 175));
      const c = h('div', 'sc' + (i === 3 ? ' big' : ''));
      c.style.setProperty('--r', r + 'vmin');
      c.style.setProperty('--d', (0.6 + i * 1.1) + 's');
      c.innerHTML = `<i></i><span><b>${name}</b>${y} · ${lbl}${i === 3 ? ' parameters' : ''}</span>`;
      box.appendChild(c);
    });
    el.appendChild(box);
    return {};
  };

  /* ---------- 2022: words become images (a diffusion reveal) ---------- */
  fx.prompt = (el, scene, api) => {
    const m = api.media(scene.fxOpts.image);
    const box = h('div', 'fx-prompt');
    const pic = h('div', 'pr-pic');
    if (m) { const img = h('img'); img.src = m.file; img.alt = scene.fxOpts.alt || ''; pic.appendChild(img); }
    const c = canvas(pic, { cls: 'pr-noise' });
    const field = h('div', 'pr-field', '<i>›</i><span></span><b class="caret"></b>');
    box.append(pic, field);
    el.appendChild(box);
    const ty = typer(field.querySelector('span'), scene.fxOpts.text, 300, 18, api);
    const noise = document.createElement('canvas');
    noise.width = 160; noise.height = 160;
    const ng = noise.getContext('2d');
    let lastN = 0;
    return {
      update(t) {
        const done = ty(t);
        const start = 300 + scene.fxOpts.text.length / 18 * 1000 + 300;
        const p = clamp((t - start) / 3600, 0, 1);
        pic.classList.toggle('on', t > start - 200);
        pic.style.setProperty('--blur', (1 - ease(p)) * 18 + 'px');
        if (t - lastN > 70 && p < 1) {
          lastN = t;
          const id = ng.createImageData(160, 160);
          for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = v; id.data[i + 1] = v * .96; id.data[i + 2] = v * .9; id.data[i + 3] = 255; }
          ng.putImageData(id, 0, 0);
          const { g, w, h: H } = c;
          g.imageSmoothingEnabled = false;
          g.clearRect(0, 0, w, H);
          g.globalAlpha = 1 - easeIO(p);
          g.drawImage(noise, 0, 0, w, H);
          g.globalAlpha = 1;
        }
        if (p >= 1) c.cv.style.opacity = 0;
        if (done) field.classList.add('done');
      },
      resize: c.size,
    };
  };

  /* ---------- Nov 30, 2022 ---------- */
  fx.chat = (el, scene, api) => {
    const box = h('div', 'fx-chat');
    box.innerHTML = `<div class="ch-msg you"><span></span></div><div class="ch-msg ai"><span></span><b class="caret"></b></div><div class="ch-input"><span>Message</span><b class="caret"></b></div>`;
    el.appendChild(box);
    const [you, ai] = box.querySelectorAll('.ch-msg span');
    const q = scene.fxOpts.q, a = scene.fxOpts.a;
    const t1 = typer(you, q, 600, 16, api);
    const t2 = typer(ai, a, 600 + q.length / 16 * 1000 + 900, 42, api, false);
    return {
      update(t) {
        if (t > 500) box.classList.add('s1');
        if (t1(t)) box.classList.add('s2');
        if (t2(t)) box.classList.add('s3');
      },
    };
  };

  /* ---------- text · images · code · audio · video ---------- */
  fx.modalities = (el) => {
    const box = h('div', 'fx-mod');
    const words = ['text', 'images', 'code', 'audio', 'video'];
    box.innerHTML = words.map((w, i) => `<span class="rv" style="--d:${0.4 + i * 0.55}s">${w}</span>`).join('<i class="rv rv-fade" style="--d:3.2s">·</i>');
    el.appendChild(box);
    return {};
  };

  /* ---------- AlphaEvolve: 49 → 48 ---------- */
  fx.matrix = (el) => {
    const box = h('div', 'fx-matrix');
    box.innerHTML = `
      <div class="mx-col rv" style="--d:.4s"><b class="old">49<i class="strike"></i></b><span>1969 · Strassen</span></div>
      <div class="mx-arrow rv rv-fade" style="--d:2.2s">→</div>
      <div class="mx-col rv lit" style="--d:2.6s"><b>48</b><span>2025 · AlphaEvolve</span></div>
      <div class="mx-cap rv rv-fade" style="--d:3.4s">multiplications to multiply two 4×4 complex matrices</div>`;
    el.appendChild(box);
    return {};
  };

  /* ---------- From humans → experience → generates → discovers ---------- */
  fx.ladder = (el) => {
    const box = h('div', 'fx-ladder');
    const steps = ['learns from <em>us</em>', 'learns from <em>experience</em>', '<em>generates</em>', '<em>discovers</em>'];
    box.innerHTML = steps.map((s, i) =>
      `<div class="ld rv${i === 3 ? ' lit' : ''}" style="--d:${0.3 + i * 1.05}s"><small>AI</small> ${s}</div>`
    ).join('');
    el.appendChild(box);
    return {};
  };

  /* ---------- Chatbot → Assistant → Agent ---------- */
  fx.evolution = (el) => {
    const box = h('div', 'fx-evo');
    box.innerHTML = seq([
      '<div class="ev rv" §><b>Chatbot</b><span>answers</span></div>',
      '<div class="ev-arrow rv rv-fade" §>→</div>',
      '<div class="ev rv" §><b>Assistant</b><span>uses tools</span></div>',
      '<div class="ev-arrow rv rv-fade" §>→</div>',
      '<div class="ev rv lit" §><b>Agent</b><span>pursues a goal</span></div>',
    ], 300, 650).join('');
    el.appendChild(box);
    return {};
  };

  /* ---------- plan → act → observe → adapt ---------- */
  fx.loop = (el) => {
    const box = h('div', 'fx-loop');
    const labels = ['Plan', 'Act', 'Observe', 'Adapt'];
    box.innerHTML = `<svg viewBox="-120 -120 240 240" aria-hidden="true">
        <circle class="orbit" r="88"/>
        <circle class="pulse" r="4.5"/>
      </svg>
      ${labels.map((l, i) => `<div class="lp-node n${i}"><b>${l}</b></div>`).join('')}
      <div class="lp-goal">goal</div>`;
    el.appendChild(box);
    const pulse = box.querySelector('.pulse');
    const nodes = [...box.querySelectorAll('.lp-node')];
    let ang = -Math.PI / 2, speed = 1.1;
    return {
      update(t, dt) {
        speed = 1.1 + t / 2600;
        ang += speed * dt / 1000;
        pulse.setAttribute('cx', Math.cos(ang) * 88);
        pulse.setAttribute('cy', Math.sin(ang) * 88);
        const a = ((ang + Math.PI / 2) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        const k = Math.floor((a + Math.PI / 4) / (Math.PI / 2)) % 4;
        nodes.forEach((n, i) => n.classList.toggle('on', i === k));
      },
    };
  };

  /* ---------- A coding agent at work ---------- */
  fx.terminal = (el, scene, api) => {
    const term = h('div', 'fx-term agent');
    term.innerHTML = '<div class="term-bar"><span>agent</span><span>autonomous · step 1</span></div><div class="term-body"></div>';
    const body = term.querySelector('.term-body');
    const bar = term.querySelector('.term-bar span:last-child');
    el.appendChild(term);
    const script = [
      ['goal', '› goal: make the checkout tests pass'],
      ['dim', '  reading repository … 1,284 files'],
      ['dim', '  plan  1 reproduce  2 locate  3 patch  4 verify'],
      ['cmd', '  $ run tests'],
      ['bad', '  ✗ 3 failing: cart total rounds incorrectly'],
      ['dim', '  editing src/cart/total.ts'],
      ['cmd', '  $ run tests'],
      ['ok',  '  ✓ 214 passing'],
      ['goal', '  opening pull request …  done'],
    ];
    let at = 300;
    const steps = script.map(([cls, text], i) => {
      const line = h('div', 'term-line ' + cls);
      const span = h('span'); line.appendChild(span);
      const cps = cls === 'goal' && i === 0 ? 30 : 90;
      const s = { line, ty: typer(span, text, at, cps, api, cls === 'goal' || cls === 'cmd'), start: at, i };
      at += text.length / cps * 1000 + (cls === 'cmd' ? 650 : 280);
      return s;
    });
    return {
      update(t) {
        steps.forEach(s => {
          if (t >= s.start && !s.line.parentNode) { body.appendChild(s.line); bar.textContent = 'autonomous · step ' + (s.i + 1); }
          if (s.line.parentNode) s.ty(t);
        });
      },
    };
  };

  /* ---------- 2026: the live wall ---------- */
  fx.wall = (el, scene, api) => {
    const items = (api.now2026 || []).slice();
    const box = h('div', 'fx-wall');
    const today = new Date();
    const stamp = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
    box.innerHTML = `<div class="wl-head"><span class="live"><i></i>Live</span><span>Where we are now</span><span>${stamp}</span></div>
      <div class="wl-grid"></div>
      <div class="wl-ticker"><div class="wl-track"></div></div>`;
    el.appendChild(box);
    const grid = box.querySelector('.wl-grid');
    const track = box.querySelector('.wl-track');
    const slots = window.innerWidth < 700 ? 6 : (window.innerWidth < 1100 ? 9 : 12);
    const order = items.map((_, i) => i).sort(() => Math.random() - .5);
    let ptr = 0;
    const fmt = (d) => {
      const [y, m, dd] = String(d).split('-');
      const mon = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][(+m || 1) - 1];
      return (dd ? +dd + ' ' : '') + mon + ' ' + y;
    };
    const card = (it) => `
      <div class="wl-cat c-${(it.category || '').toLowerCase().replace(/[^a-z]+/g, '-')}">${it.category}</div>
      <div class="wl-h">${it.headline}</div>
      <div class="wl-meta"><span>${fmt(it.date)}</span><span>${it.source || ''}</span></div>`;
    const cells = [];
    for (let i = 0; i < slots; i++) {
      const c = h('div', 'wl-card');
      c.style.setProperty('--d', (0.2 + i * 0.09) + 's');
      grid.appendChild(c); cells.push(c);
      if (items.length) { c.innerHTML = card(items[order[ptr++ % order.length]]); }
    }
    track.innerHTML = items.map(it => `<span><b>${it.category}</b> ${it.headline}</span>`).join('') + items.map(it => `<span><b>${it.category}</b> ${it.headline}</span>`).join('');
    let next = 2600, slotPtr = 0;
    return {
      update(t) {
        if (!items.length) return;
        if (t > next) {
          next = t + (api.reduced ? 1400 : 650);
          const c = cells[(slotPtr * 5 + 3) % cells.length]; slotPtr++;
          c.classList.remove('flip'); void c.offsetWidth; c.classList.add('flip');
          setTimeout(() => { c.innerHTML = card(items[order[ptr++ % order.length]]); }, 180);
        }
      },
    };
  };

  /* ---------- Finale: every waypoint at once ---------- */
  fx.waypoints = (el) => {
    const pts = [
      [1936, 'The machine'], [1950, 'The question'], [1956, 'A name'], [1986, 'Learning'],
      [1997, 'Deep Blue'], [2012, 'AlexNet'], [2016, 'AlphaGo'], [2017, 'Attention'],
      [2020, 'AlphaFold'], [2022, 'ChatGPT'], [2024, 'Nobel'], [2025, 'Discovery'], [2026, 'Now'],
    ];
    const box = h('div', 'fx-way');
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 1000 600');
    svg.setAttribute('preserveAspectRatio', 'none');
    const pos = pts.map(([y], i) => {
      const u = i / (pts.length - 1);
      const x = 50 + u * 900;
      const yy = 500 - (Math.pow(12, u) - 1) / 11 * 420;   // the curve of acceleration
      return [x, yy];
    });
    const d = pos.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    svg.innerHTML = `<path class="way-line" d="${d}"/>`;
    box.appendChild(svg);
    pts.forEach(([y, label], i) => {
      const n = h('div', 'way-pt' + (y === 2026 ? ' now' : ''));
      n.style.left = (pos[i][0] / 10) + '%';
      n.style.top = (pos[i][1] / 6) + '%';
      n.style.setProperty('--d', (0.2 + i * 0.06) + 's');
      n.innerHTML = `<i></i><b>${y}</b><span>${label}</span>`;
      if (i % 2) n.classList.add('above');
      box.appendChild(n);
    });
    el.appendChild(box);
    return {};
  };

  /* ---------- learn · see · speak · create · discover · reason · act ---------- */
  fx.words = (el, scene) => {
    const box = h('div', 'fx-words');
    box.innerHTML = `<div class="wd-pre rv" style="--d:.2s">${scene.fxOpts.pre}</div><div class="wd-row">` +
      scene.fxOpts.words.map((w, i) => `<span style="--d:${1.4 + i * 0.5}s">${w}</span>`).join('') + '</div>';
    el.appendChild(box);
    return {};
  };

  /* ---------- Credits ---------- */
  fx.credits = (el, scene, api) => {
    const box = h('div', 'fx-credits');
    box.innerHTML = api.creditsHTML();
    el.appendChild(box);
    let H = 0;
    const measure = () => { H = box.scrollHeight; };
    requestAnimationFrame(measure);
    const HOLD = 10500;
    return {
      update(t) {
        if (!H) measure();
        const open = box.querySelector('.cr-open');
        const y0 = window.innerHeight / 2 - (open ? open.offsetHeight : 0) / 2;
        const y = t < HOLD ? y0 : y0 - (t - HOLD) * 0.05;
        box.style.transform = `translate(-50%, ${Math.max(y, -H + window.innerHeight * .45)}px)`;
      },
      resize: measure,
    };
  };

  /* ---------- The original machine: a panel of neon lamps powers on ---------- */
  fx.lamps = (el, scene, api) => {
    const c = canvas(el);
    let lamps = [];
    const build = () => {
      lamps = [];
      const { w, h: H } = c;
      const cols = w < 700 ? 14 : 30, rows = w < 700 ? 16 : 10;
      const gap = Math.min(w * .8 / cols, H * .5 / rows);
      const x0 = (w - gap * (cols - 1)) / 2, y0 = (H - gap * (rows - 1)) / 2;
      for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++)
        lamps.push({ x: x0 + k * gap, y: y0 + r * gap, r: gap * .2, on: 450 + k * 42 + r * 18 + Math.random() * 260, ph: Math.random() * 9 });
    };
    build();
    return {
      update(t) {
        const { g, w, h: H } = c;
        g.clearRect(0, 0, w, H);
        lamps.forEach((L, i) => {
          let v = t < L.on ? 0 : Math.min(1, (t - L.on) / 180);
          if (t > 2600) v *= (Math.sin(t / 90 + L.ph * 7) > -.2 ? 1 : .18);      // the machine begins to compute
          g.fillStyle = 'rgba(243,239,230,.07)';
          g.beginPath(); g.arc(L.x, L.y, L.r, 0, 7); g.fill();
          if (v > 0) {
            const gr = g.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r * 3.2);
            gr.addColorStop(0, `rgba(255,190,110,${.95 * v})`);
            gr.addColorStop(.35, `rgba(240,130,50,${.55 * v})`);
            gr.addColorStop(1, 'rgba(240,120,40,0)');
            g.fillStyle = gr; g.beginPath(); g.arc(L.x, L.y, L.r * 3.2, 0, 7); g.fill();
          }
        });
      },
      resize() { c.size(); build(); },
    };
  };

  /* ---------- The closing montage: ninety years, accelerating ---------- */
  fx.flash = (el, scene, api) => {
    const items = scene.fxOpts.items;
    const n = items.length;
    const durs = items.map((_, i) => Math.round(360 + 700 * Math.pow(1 - i / (n - 1), 1.7)));
    const starts = []; durs.reduce((a, d, i) => (starts[i] = a, a + d), 250);
    const frames = items.map(it => {
      const f = h('div', 'fl-frame' + (it.invert ? ' inv' : ''));
      if (it.panel === '48') f.innerHTML = '<div class="fl-48"><s>49</s> 48</div>';
      else if (it.panel === 'agent') f.innerHTML = '<div class="fl-agent">› goal received<br>→ plan · act · observe<br>✓ done</div>';
      else { const m = api.media(it.id); if (m) { const i = h('img'); i.src = m.file; i.alt = ''; i.style.objectPosition = m.focus || '50% 50%'; f.appendChild(i); } }
      el.appendChild(f); return f;
    });
    let cur = -1;
    return {
      update(t) {
        let k = -1;
        starts.forEach((st, i) => { if (t >= st) k = i; });
        if (k >= n - 1 && t > starts[n - 1] + durs[n - 1]) k = n;
        if (k !== cur) {
          cur = k;
          frames.forEach((f, i) => f.classList.toggle('on', i === k));
          if (k >= 0 && k < n) { Score.tickAt(0, true); if (k > n * .6) Score.tickAt(durs[k] / 2000); }
        }
      },
    };
  };

  /* ---------- Six questions: each one stays, hanging in the air ---------- */
  fx.ghosts = (el, scene) => {
    const box = h('div', 'fx-ghosts');
    el.appendChild(box);
    const spots = [[54, 34], [66, 56], [44, 62], [72, 26], [60, 74], [40, 44]];
    const list = [];
    const add = (text, instant) => {
      const i = list.length;
      const g = h('div', 'ghost' + (instant ? '' : ' arrive'), text);
      g.style.left = spots[i % 6][0] + '%'; g.style.top = spots[i % 6][1] + '%';
      box.appendChild(g); list.push(g);
    };
    (scene.fxOpts.ghosts || []).forEach(q => add(q, true));
    return {
      update() {
        const now = performance.now() / 1000;
        list.forEach((g, k) => { g.style.transform = `translate(${(Math.sin(now * .1 + k * 1.7) * 16).toFixed(1)}px, ${(Math.cos(now * .08 + k * 2.3) * 11).toFixed(1)}px)`; });
      },
      next(s) {
        (s.fxOpts.ghosts || []).forEach(q => { if (!list.some(g => g.textContent === q)) add(q, false); });
      },
    };
  };

  /* ---------- Deepfakes: the face splits and slips ---------- */
  fx.glitch = (el, scene, api) => {
    const m = (scene.bg || []).map(id => api.media(id)).find(Boolean);
    if (!m) return {};
    const box = h('div', 'fx-glitch');
    const img = (cls) => `<img class="${cls}" src="${m.file}" alt="" style="object-position:${m.focus || '50% 50%'}">`;
    box.innerHTML = img('g-r') + img('g-c') + [0, 1, 2, 3].map(i => `<div class="g-slice s${i}">${img('')}</div>`).join('');
    el.appendChild(box);
    let next = 900, until = 0;
    return {
      update(t) {
        if (t > next) { until = t + 140 + Math.random() * 200; next = t + 900 + Math.random() * 900; box.style.setProperty('--gx', (Math.random() * 30 - 15).toFixed(0) + 'px'); }
        box.classList.toggle('burst', t < until && !api.reduced);
      },
    };
  };

  /* ---------- Concentration of power: the line-up ---------- */
  fx.portraits = (el, scene, api) => {
    const box = h('div', 'fx-portraits');
    box.innerHTML = scene.fxOpts.people.map((p, i) => {
      const m = api.media(p.id);
      return `<figure class="pt" style="--d:${(0.25 + i * 0.5).toFixed(2)}s">
        ${m ? `<img src="${m.file}" alt="${p.name}" style="--fp:${m.focus || '50% 20%'}">` : ''}
        <figcaption><b>${p.name}</b><span>${p.role}</span></figcaption></figure>`;
    }).join('');
    el.appendChild(box);
    return {};
  };

  /* ---------- Misuse and accidents: the case file on a real incident ---------- */
  fx.incident = (el, scene, api) => {
    const c = canvas(el);
    const cards = h('div', 'fx-case');
    cards.innerHTML = scene.fxOpts.cards.map((k, i) => `
      <div class="case c${i}" style="--d:${(0.4 + i * 1.1).toFixed(2)}s">
        <div class="case-k">${k.k}</div>
        <div class="case-h">${k.h}</div>
        <div class="case-s">${k.s}</div>
      </div>`).join('');
    el.appendChild(cards);
    const cols = Math.ceil(c.w / 120), rows = Math.ceil(c.h / 16);
    const hex = () => Math.floor(Math.random() * 65536).toString(16).padStart(4, '0');
    const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, hex));
    let last = 0;
    return {
      update(t) {
        if (t - last < 90) return; last = t;
        const { g, w, h: H } = c;
        g.clearRect(0, 0, w, H);
        g.font = '11px "IBM Plex Mono", monospace';
        const off = (t / 40) % 16;
        for (let r = 0; r < rows; r++) {
          if (Math.random() < .08) grid[r][Math.floor(Math.random() * cols)] = hex();
          for (let k = 0; k < cols; k++) {
            g.fillStyle = `rgba(255,75,58,${(.05 + ((r * 7 + k * 3) % 9) / 90).toFixed(3)})`;
            g.fillText(grid[r][k], k * 120 + 10, r * 16 - off + 16);
          }
        }
      },
      resize: c.size,
    };
  };

  /* ---------- Navier–Stokes: a vortex spirals inward toward a singularity ---------- */
  fx.vortex = (el, scene, api) => {
    const c = canvas(el);
    const eq = h('div', 'vx-eq', '<i>∂u</i>/<i>∂t</i> + (<i>u</i>·∇)<i>u</i> = −∇<i>p</i> + <i>ν</i>∇²<i>u</i> + <i>f</i>');
    el.appendChild(eq);
    const N = api.reduced ? 220 : 900;
    const P = Array.from({ length: N }, () => ({ a: Math.random() * Math.PI * 2, r: .25 + Math.random() * .75, z: Math.random() * 2 - 1 }));
    let lastT = 0;
    return {
      update(t, dt) {
        const { g, w, h: H } = c;
        const narrow = w < 700;
        const cx = narrow ? w * .5 : w * .66, cy = narrow ? H * .36 : H * .5;
        const R = Math.min(w, H) * (narrow ? .4 : .42);
        const squeeze = Math.min(1, t / 7000);                    // the core tightens: the singularity forms
        g.fillStyle = 'rgba(5,5,5,.16)'; g.fillRect(0, 0, w, H);
        const step = Math.min(dt, 40) / 1000;
        P.forEach(p => {
          const omega = 0.55 / Math.max(.035, p.r * p.r) * (1 + squeeze * 2.2);
          const x0 = cx + Math.cos(p.a) * p.r * R, y0 = cy + Math.sin(p.a) * p.r * R * .42 + p.z * (1 - p.r) * R * .3 * (1 + squeeze * .8);
          p.a += omega * step;
          p.r -= step * (.05 + .25 * squeeze) * p.r;
          p.z *= 1 + step * .6 * squeeze;
          if (p.r < .03 || Math.abs(p.z) > 1.3) { p.r = .7 + Math.random() * .3; p.a = Math.random() * Math.PI * 2; p.z = Math.random() * 2 - 1; }
          const x1 = cx + Math.cos(p.a) * p.r * R, y1 = cy + Math.sin(p.a) * p.r * R * .42 + p.z * (1 - p.r) * R * .3 * (1 + squeeze * .8);
          const fast = Math.min(1, omega / 9);
          g.strokeStyle = `rgba(${Math.round(110 + 130 * fast)},${Math.round(200 - 40 * fast)},${Math.round(190 - 140 * fast)},${(.35 + .5 * fast).toFixed(2)})`;
          g.lineWidth = .8 + fast;
          g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
        });
        const glow = g.createRadialGradient(cx, cy, 0, cx, cy, R * (.08 + .1 * squeeze));
        glow.addColorStop(0, `rgba(255,214,160,${(.15 + .55 * squeeze).toFixed(2)})`); glow.addColorStop(1, 'rgba(255,214,160,0)');
        g.fillStyle = glow; g.beginPath(); g.arc(cx, cy, R * .2, 0, 7); g.fill();
      },
      resize: c.size,
    };
  };

  return fx;
})();
