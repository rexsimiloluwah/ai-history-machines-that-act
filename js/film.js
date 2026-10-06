/* ==========================================================================
   PROJECTOR. The playback engine.
   Plays SCREENPLAY scene by scene: background shots (A/B crossfade), text cards,
   special-effect shots, the year odometer, letterbox changes and the score.
   ========================================================================== */
(() => {
  const $ = (s) => document.querySelector(s);
  const film = $('#film'), fxRoot = $('#fx'), textRoot = $('#text');
  const shots = [$('#shotA'), $('#shotB')];
  let front = 0;

  const DATA = window.FILM_DATA || { images: [], videos: [], now2026: [] };
  const MEDIA = {};
  DATA.images.forEach(m => { MEDIA[m.id] = { ...m, kind: 'img' }; });
  DATA.videos.forEach(m => { MEDIA[m.id] = { ...m, kind: 'video' }; });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const { acts, scenes } = SCREENPLAY;
  const PACE = 1;
  let total = 0, cum = {};
  scenes.forEach((s, i) => {
    s.i = i;
    s.dur = Math.round(s.dur * PACE);
    s.start = total; total += s.dur;
    cum = { ...cum, ...(s.cue || {}) };
    s.cueEff = { ...cum };
  });

  let cur = -1, t = 0, playing = false, started = false, last = performance.now();
  let live = { fx: null, fxEl: null, beats: [], cards: [] };
  const params = new URLSearchParams(location.search);

  /* ---------------- Helpers ---------------- */
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const strip = (s) => String(s ?? '').replace(/<[^>]+>/g, '');
  const fmtTime = (ms) => { const s = Math.floor(ms / 1000); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

  function resolveBg(s) {
    if (s.gen && MEDIA[s.gen] && !reduced) return MEDIA[s.gen];
    if (s.video && MEDIA[s.video] && !reduced) return MEDIA[s.video];
    for (const id of (s.bg || [])) if (MEDIA[id]) return MEDIA[id];
    if (s.video && MEDIA[s.video]) return MEDIA[s.video];
    return null;
  }
  const imagePool = () => DATA.images.filter(m => !m.noPool);

  /* ---------------- Odometer ---------------- */
  const odo = $('#odometer');
  const strips = [];
  for (let i = 0; i < 4; i++) {
    const col = h('span', 'col'), st = h('span', 'strip');
    for (let d = 0; d < 10; d++) st.appendChild(h('span', null, String(d)));
    col.appendChild(st); odo.appendChild(col); strips.push(st);
  }
  let shownYear = null;
  function setYear(y, instant = false) {
    if (y == null) return;
    if (y === shownYear && !instant) return;
    shownYear = y;
    odo.classList.remove('blank');
    String(y).padStart(4, '0').split('').forEach((d, i) => {
      strips[i].style.transition = instant ? 'none' : '';
      strips[i].style.transform = `translateY(${-(+d) * 1.1}em)`;
    });
  }
  function yearFor(s, tt) {
    if (Array.isArray(s.year)) { let y = s.year[0][1]; s.year.forEach(([at, yy]) => { if (tt >= at) y = yy; }); return y; }
    return s.year;
  }

  /* ---------------- Background shots ---------------- */
  function setShot(s, mode) {
    const back = shots[1 - front], fore = shots[front];
    back.querySelectorAll('video').forEach(v => v.pause());
    back.innerHTML = '';
    const m = resolveBg(s);
    if (m) {
      const wrap = h('div', 'media-wrap');
      const kb = reduced ? 'none' : 'kb-' + (s.kb || 'in');
      const make = (cls) => {
        let el;
        if (m.kind === 'video') {
          el = document.createElement('video');
          Object.assign(el, { muted: true, loop: true, playsInline: true, autoplay: true, preload: 'auto' });
          el.setAttribute('muted', ''); el.setAttribute('playsinline', '');
          if (m.poster) el.poster = m.poster;
          el.src = m.file;
        } else {
          el = new Image(); el.decoding = 'async'; el.alt = ''; el.src = m.file;
        }
        el.className = 'media ' + (cls || '');
        el.style.setProperty('--focus', s.focus || m.focus || '50% 50%');
        el.style.setProperty('--kb-name', kb);
        el.style.setProperty('--kb-dur', ((s.dur + 2400) / 1000) + 's');
        return el;
      };
      const print = m.kind === 'img' && (s.print ?? m.print);
      if (print) {
        // Archival print: the photo as an object, over a blurred enlargement of itself
        const under = make('under');
        under.style.setProperty('--media-opacity', (s.dim ?? 1) * .45);
        const frame = h('div', 'print-frame ' + print);
        frame.style.setProperty('--ar', `${m.w} / ${m.h}`);
        frame.style.setProperty('--ph', m.w > m.h * 1.1 ? '56%' : '72%');
        frame.style.setProperty('--kb-dur', ((s.dur + 2400) / 1000) + 's');
        if (s.printPos) frame.style.setProperty('--px', s.printPos);
        const img = new Image(); img.decoding = 'async'; img.alt = ''; img.src = m.file;
        img.style.setProperty('--focus', m.focus || '50% 50%');
        frame.appendChild(img);
        wrap.append(under, frame);
      } else {
        const el = make((s.invert ? 'inv ' : '') + (s.fit === 'contain' ? 'contain' : ''));
        el.style.setProperty('--media-opacity', s.dim ?? 1);
        wrap.appendChild(el);
      }
      back.appendChild(wrap);
      back.querySelectorAll('video').forEach(v => { if (playing) v.play().catch(() => {}); });
    }
    const cut = mode === 'cut' || mode === 'black' || reduced && mode !== 'fade';
    back.classList.toggle('cut', cut);
    fore.classList.toggle('cut', cut);
    back.classList.add('on');
    fore.classList.remove('on');
    front = 1 - front;
    const old = fore;
    setTimeout(() => {
      if (!old.classList.contains('on')) { old.querySelectorAll('video').forEach(v => v.pause()); old.innerHTML = ''; }
    }, cut ? 50 : 1700);
  }

  /* ---------------- Text cards ---------------- */
  const D = (x) => `style="--d:${x.toFixed(2)}s"`;
  function cardHTML(c, s) {
    const L = c.layout || 'low';
    const d0 = c.d ?? .5;
    let inner = '';
    if (L === 'act') {
      const a = acts[s.act];
      inner = `<div class="act-n rv rv-fade" ${D(d0)}>${a.cardLabel || 'Act ' + a.roman}</div><h2 class="act-t rv rv-track" ${D(d0 + .4)}>${c.t}</h2>`;
    } else if (L === 'quote') {
      inner = `<p class="q rv rv-slow" ${D(d0)}>${c.q}</p>` + (c.by ? `<div class="by rv rv-fade" ${D(d0 + 1.8)}>${c.by}</div>` : '');
    } else if (L === 'huge') {
      inner = `<p class="n rv rv-slow" ${D(d0)}>${c.n}</p>` + (c.l ? `<p class="l rv" ${D(d0 + 1.1)}>${c.l}</p>` : '') + (c.src ? `<div class="src rv rv-fade" ${D(d0 + 1.8)}>${c.src}</div>` : '');
    } else if (L === 'title') {
      inner = `<h1 class="tt"><span class="a rv rv-track" ${D(d0)}>${c.a}</span><span class="b rv rv-track" ${D(d0 + .6)}>${c.b}</span></h1>` +
        (c.sub ? `<p class="sub rv rv-fade" ${D(d0 + 2.6)}>${c.sub}</p>` : '');
    } else if (L === 'question') {
      inner = (c.num ? `<div class="qn rv rv-fade" ${D(d0)}>${c.num}</div>` : '') +
        (c.q ? `<h2 class="qq rv rv-slow" ${D(d0 + .3)}>${c.q}</h2>` : '') +
        (c.sub ? `<p class="qs rv" ${D(d0 + (c.q ? 1.6 : .2))}>${c.sub}</p>` : '');
    } else if (L === 'qsub') {
      inner = `<p class="qs rv" ${D(d0)}>${c.sub}</p>`;
    } else if (L === 'tag') {
      inner = `<div class="tg rv rv-track" ${D(d0)}>${c.tg}</div>`;
    } else {
      let d = d0;
      if (c.k) { inner += `<p class="k rv rv-fade" ${D(d)}>${c.k}</p>`; d += .45; }
      if (c.t) { inner += `<h2 class="t rv" ${D(d)}>${c.t}</h2>`; d += .75; }
      if (c.l) { inner += `<p class="l rv" ${D(d)}>${c.l}</p>`; d += .8; }
      if (c.stamp) { inner += `<div class="stamp rv rv-fade" ${D(d + .4)}><b>${c.stamp[0]}</b><span>${c.stamp[1]}</span></div>`; }
      if (c.src) { inner += `<div class="src rv rv-fade" ${D(d + .4)}>${c.src}</div>`; }
    }
    return `<div class="card L-${L} ${c.cls || ''}">${inner}</div>`;
  }

  function sceneBeats(s) {
    const list = s.beats ? s.beats.map(b => ({ ...b })) : (s.card ? [{ at: 0, ...s.card }] : []);
    list.forEach((b, i) => {
      if (b.until == null) {
        const nxt = list.slice(i + 1).find(x => x.at > b.at && x.layout === b.layout);
        b.until = nxt ? nxt.at : Infinity;
      }
    });
    return list.map(b => ({ b, el: null, gone: false }));
  }

  /* ---------------- Scene lifecycle ---------------- */
  function teardown(fast) {
    if (live.fx && live.fx.destroy) try { live.fx.destroy(); } catch (e) {}
    const oldFx = live.fxEl;
    if (oldFx) { oldFx.classList.add('out'); setTimeout(() => oldFx.remove(), fast ? 0 : 900); }
    live.beats.forEach(x => { if (x.el) { const e = x.el; e.classList.add('out'); setTimeout(() => e.remove(), fast ? 0 : 800); } });
    live = { fx: null, fxEl: null, beats: [] };
  }

  const keepClasses = ['paused', 'muted', 'ui', 'hide-cursor'];
  function applyLook(s) {
    const keep = keepClasses.filter(c => film.classList.contains(c));
    const grade = s.grade || 'color';
    const cls = ['grade-' + grade, 'frame-' + (s.frame || 'scope')];
    if (grade === 'bw' || grade === 'silver') cls.push('archival');
    if (s.shade) cls.push('shade-' + s.shade);
    film.className = cls.concat(keep).join(' ');
  }

  const api = {
    media: (id) => MEDIA[id] || null,
    pool: imagePool,
    type: () => Score.type(),
    reduced,
    now2026: DATA.now2026 || [],
    setYear,
    creditsHTML,
  };

  function go(i, { jump = false } = {}) {
    i = Math.max(0, Math.min(scenes.length - 1, i));
    const s = scenes[i];
    const prevScene = scenes[cur];
    const keepFx = !jump && prevScene && s.fxPersist && prevScene.fx === s.fx && live.fx && live.fx.next;
    const kept = keepFx ? { fx: live.fx, fxEl: live.fxEl } : null;
    if (kept) { live.fx = null; live.fxEl = null; }
    teardown(jump);
    film.classList.remove('crt-off');
    cur = i; t = 0;

    const curtain = $('#curtain');
    if (s.trans === 'black' && !jump) {
      curtain.classList.add('down', 'snap');
      requestAnimationFrame(() => requestAnimationFrame(() => { curtain.classList.remove('snap'); curtain.classList.remove('down'); }));
    } else {
      curtain.classList.add('snap'); curtain.classList.remove('down');
      requestAnimationFrame(() => curtain.classList.remove('snap'));
    }

    applyLook(s);
    setShot(s, jump ? 'cut' : (s.trans || 'fade'));

    live.beats = sceneBeats(s);
    live.sfx = {};

    if (kept) {
      live.fx = kept.fx; live.fxEl = kept.fxEl;
      try { live.fx.next(s); } catch (e) { console.error(e); }
    } else if (s.fx && FX[s.fx]) {
      const el = h('div', 'fx-scene fxs-' + s.fx);
      fxRoot.appendChild(el);
      s.fxOpts = s.fxOpts || {};
      try { live.fx = FX[s.fx](el, s, api); } catch (e) { console.error('fx', s.fx, e); live.fx = null; }
      live.fxEl = el;
    }

    // Score
    if (Score.ready) {
      if (s.stop && !jump) Score.stopAll();
      Score.cue(s.cueEff, jump ? {} : { hit: s.hit, at: s.hitAt, riser: s.riser, rewind: s.rewindSnd });
    }

    // Slate
    const a = acts[s.act];
    $('#actLabel').innerHTML = a.roman ? `<b>Act ${a.roman}</b>${esc(a.name)}` : esc(a.name);
    const bgm = resolveBg(s);
    $('#sceneLabel').innerHTML = bgm && bgm.synthetic ? '<span class="synth">◇ AI-generated shot</span>' : esc(s.label || '');
    const y = yearFor(s, 0);
    if (y === 'blank' || s.i === 0) odo.classList.add('blank');
    else if (y != null && s.fx !== 'rewind') setYear(y);

    // Screen readers: one concise line per scene
    $('#sr').textContent = sceneText(s);

    document.querySelectorAll('.ix-row').forEach(r => r.classList.toggle('current', +r.dataset.i === i));
    preload(i);
    if (params.has('debug')) console.log('scene', i, s.id);
  }

  function preload(i) {
    for (let k = 1; k <= 3; k++) {
      const s = scenes[i + k]; if (!s) break;
      const m = resolveBg(s);
      if (m && m.kind === 'img') { const im = new Image(); im.src = m.file; }
      if (m && m.kind === 'video' && m.poster) { const im = new Image(); im.src = m.poster; }
      (s.fxOpts?.images || []).forEach(id => { if (MEDIA[id]) { const im = new Image(); im.src = MEDIA[id].file; } });
      if (s.fxOpts?.image && MEDIA[s.fxOpts.image]) { const im = new Image(); im.src = MEDIA[s.fxOpts.image].file; }
    }
  }

  function updateBeats() {
    const s = scenes[cur];
    live.beats.forEach(x => {
      if (!x.el && !x.gone && t >= x.b.at && t < x.b.until) {
        const wrap = h('div'); wrap.innerHTML = cardHTML(x.b, s);
        x.el = wrap.firstElementChild; textRoot.appendChild(x.el);
      }
      const end = Math.min(x.b.until, s.dur - 750);
      if (x.el && !x.gone && t >= end) {
        x.gone = true; const e = x.el; e.classList.add('out');
        setTimeout(() => e.remove(), 800);
      }
    });
    if (live.fxEl && t > s.dur - 900 && !live.fxEl.classList.contains('out') && s.fx !== 'credits') {
      const nxt = scenes[cur + 1];
      if (!nxt || nxt.fx !== s.fx || !nxt.fxPersist) live.fxEl.classList.add('out');
    }
    // Fade to black ahead of a 'black' transition
    const nxt = scenes[cur + 1];
    if (nxt && nxt.trans === 'black' && t > s.dur - 750) $('#curtain').classList.add('down');
  }

  /* ---------------- Main loop ---------------- */
  function loop(now) {
    const dt = Math.min(80, now - last); last = now;
    if (playing && cur >= 0) {
      t += dt;
      const s = scenes[cur];
      updateBeats();
      if (Array.isArray(s.year)) setYear(yearFor(s, t));
      if (s.powerOff && !s._off && t > s.dur - 1500) { s._off = true; film.classList.add('crt-off'); Score.stopAll(); Score.at('powerdown'); }
      if (s.sfx) s.sfx.forEach((x, k) => { if (t >= x[0] && !live.sfx[k]) { live.sfx[k] = true; Score.at(x[1], 0, ...x.slice(2)); } });
      if (s.powerOff && t < s.dur - 1500) s._off = false;
      if (live.fx && live.fx.update) { try { live.fx.update(t, dt); } catch (e) { console.error(e); live.fx.update = null; } }
      if (t >= s.dur) {
        if (cur < scenes.length - 1) go(cur + 1);
        else finish();
      }
      paintProgress();
    }
    requestAnimationFrame(loop);
  }

  function paintProgress() {
    const s = scenes[cur]; if (!s) return;
    const el = s.start + Math.min(t, s.dur);
    const p = el / total;
    $('#progressFill').style.width = (p * 100).toFixed(3) + '%';
    $('#progress').setAttribute('aria-valuenow', Math.round(p * 100));
    $('#timecode').textContent = fmtTime(el) + ' / ' + fmtTime(total);
  }

  /* ---------------- Transport ---------------- */
  function play() {
    playing = true; film.classList.remove('paused');
    $('#btnPlay').setAttribute('aria-label', 'Pause');
    shots.forEach(sh => sh.querySelectorAll('video').forEach(v => v.play().catch(() => {})));
    Score.resume();
  }
  function pause() {
    playing = false; film.classList.add('paused');
    $('#btnPlay').setAttribute('aria-label', 'Play');
    shots.forEach(sh => sh.querySelectorAll('video').forEach(v => v.pause()));
    Score.pause();
    showUI();
  }
  const toggle = () => (playing ? pause() : play());
  function jumpTo(i) { go(i, { jump: true }); play(); }
  function next() { if (cur < scenes.length - 1) jumpTo(cur + 1); }
  function prev() { jumpTo(t > 2000 ? cur : cur - 1); }
  function finish() {
    playing = false;
    Intro.showEnd({ again: true });
    $('#start').classList.remove('gone');
    started = false;
  }

  function begin() {
    Score.init();
    Score.idle(false);
    Score.setMuted(film.classList.contains('muted'));
    $('#start').classList.add('gone');
    started = true;
    go(0, { jump: false });
    play();
    film.focus?.();
  }

  /* ---------------- UI chrome ---------------- */
  let uiTimer = null;
  function showUI() {
    film.classList.add('ui'); film.classList.remove('hide-cursor');
    clearTimeout(uiTimer);
    uiTimer = setTimeout(() => { if (playing) { film.classList.remove('ui'); film.classList.add('hide-cursor'); } }, 2600);
  }
  film.addEventListener('mousemove', showUI);
  film.addEventListener('touchstart', showUI, { passive: true });

  $('#btnPlay').addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
  $('#btnNext').addEventListener('click', (e) => { e.stopPropagation(); next(); });
  $('#btnPrev').addEventListener('click', (e) => { e.stopPropagation(); prev(); });
  $('#btnMute').addEventListener('click', (e) => { e.stopPropagation(); setMuted(!film.classList.contains('muted')); });
  $('#btnIndex').addEventListener('click', (e) => { e.stopPropagation(); openIndex(); });
  $('#btnStart').addEventListener('click', begin);
  $('#btnReadFirst').addEventListener('click', openIndex);
  $('#btnCloseIndex').addEventListener('click', closeIndex);

  function setMuted(m) {
    film.classList.toggle('muted', m);
    $('#btnMute').setAttribute('aria-label', m ? 'Unmute sound' : 'Mute sound');
    Score.setMuted(m);
  }

  // Click the picture to pause (desktop); tap shows controls (touch)
  let touched = false;
  $('#stage').addEventListener('touchend', () => { touched = true; setTimeout(() => (touched = false), 500); }, { passive: true });
  $('#stage').addEventListener('click', () => { if (!started || touched) return; toggle(); });

  // Progress scrubbing
  const prog = $('#progress');
  function seekFrac(f) {
    const target = f * total;
    let i = scenes.findIndex(s => s.start + s.dur > target);
    if (i < 0) i = scenes.length - 1;
    jumpTo(i);
  }
  prog.addEventListener('click', (e) => { e.stopPropagation(); const r = prog.getBoundingClientRect(); seekFrac((e.clientX - r.left) / r.width); });
  prog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); next(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); prev(); }
  });
  // Act markers on the reel
  const actStarts = {};
  scenes.forEach(s => { if (!(s.act in actStarts)) actStarts[s.act] = s.start; });
  Object.entries(actStarts).forEach(([a, st]) => {
    if (+a === 0) return;
    const i = h('i'); i.style.left = (st / total * 100) + '%';
    const A = acts[a];
    i.innerHTML = `<span>${A.roman || A.name}</span>`;
    $('#progressActs').appendChild(i);
  });

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const idx = !$('#index').hidden;
    if (e.key === 'Escape' && idx) { closeIndex(); return; }
    if (idx) return;
    if (!started) {
      const r = Intro.key(e);
      if (r === 'transcript') openIndex();
      else if (!r && Intro.state === 'end' && (e.key === 'Enter' || e.key === ' ') && document.activeElement === document.body) { e.preventDefault(); begin(); }
      return;
    }
    switch (e.key) {
      case ' ': case 'k': case 'K':
        if (document.activeElement && document.activeElement.tagName === 'BUTTON' && e.key === ' ') return;
        e.preventDefault(); toggle(); break;
      case 'ArrowRight': case 'l': case 'L': e.preventDefault(); next(); break;
      case 'ArrowLeft': case 'j': case 'J': e.preventDefault(); prev(); break;
      case 'm': case 'M': setMuted(!film.classList.contains('muted')); break;
      case 't': case 'T': case 'i': case 'I': openIndex(); break;
      default:
        if (/^[0-9]$/.test(e.key)) { const st = scenes.find(s => s.act === +e.key); if (st) jumpTo(st.i); }
    }
    showUI();
  });

  // Wheel / swipe = skip scenes
  let wheelLock = 0;
  window.addEventListener('wheel', (e) => {
    if (!started || !$('#index').hidden) return;
    const now = Date.now();
    if (now < wheelLock || Math.abs(e.deltaY) < 24) return;
    wheelLock = now + 1100;
    e.deltaY > 0 ? next() : prev();
  }, { passive: true });
  let tx = 0, ty = 0;
  window.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchend', (e) => {
    if (!started || !$('#index').hidden) return;
    const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 60) return;
    const dir = Math.abs(dx) > Math.abs(dy) ? -dx : -dy;
    dir > 0 ? next() : prev();
  }, { passive: true });

  document.addEventListener('visibilitychange', () => { if (document.hidden && playing) pause(); });
  window.addEventListener('resize', () => { if (live.fx && live.fx.resize) live.fx.resize(); });

  /* ---------------- Transcript / index ---------------- */
  function sceneText(s) {
    if (s.say) return s.say;
    const parts = [];
    const list = s.beats || (s.card ? [s.card] : []);
    list.forEach(c => {
      if (c.layout === 'act') parts.push(`Act ${acts[s.act].roman}: ${c.t}.`);
      ['num', 'k', 't', 'l', 'q', 'n', 'a', 'b', 'sub', 'by', 'tg'].forEach(f => { if (c[f]) parts.push(strip(c[f])); });
      if (c.stamp) parts.push(strip(c.stamp.join(' · ')));
    });
    return parts.join(' · ');
  }
  function buildIndex() {
    const list = $('#indexList');
    let html = '', lastAct = -1;
    scenes.forEach(s => {
      if (s.act !== lastAct) {
        lastAct = s.act;
        const a = acts[s.act];
        html += `<div class="ix-act">${a.roman ? 'Act ' + a.roman : ''}<span>${esc(a.name)}</span></div>`;
      }
      if (s.id.startsWith('act-')) return;
      const y = Array.isArray(s.year) ? s.year[0][1] + '–' + s.year[s.year.length - 1][1] : (s.year || '');
      let extra = '';
      if (s.fx === 'wall' && DATA.now2026.length) {
        extra = DATA.now2026.map(it => `<small>${esc(it.date)} · ${esc(it.category)} · ${esc(it.headline)}${it.url ? ` · <a href="${esc(it.url)}" target="_blank" rel="noopener">${esc(it.source || 'source')}</a>` : ''}</small>`).join('');
      }
      html += `<button class="ix-row" data-i="${s.i}"><span class="y">${y}</span><span class="x"><b>${esc(s.label || '')}</b>${esc(sceneText(s))}${extra}</span></button>`;
    });
    list.innerHTML = html;
    list.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      const row = e.target.closest('.ix-row'); if (!row) return;
      closeIndex();
      if (!started) { begin(); }
      jumpTo(+row.dataset.i);
    });
  }
  let wasPlaying = false;
  function openIndex() {
    wasPlaying = playing;
    if (playing) pause();
    $('#index').hidden = false;
    $('#btnCloseIndex').focus();
    const curRow = document.querySelector('.ix-row.current');
    if (curRow) curRow.scrollIntoView({ block: 'center' });
  }
  function closeIndex() {
    $('#index').hidden = true;
    if (wasPlaying) play();
  }

  /* ---------------- Credits ---------------- */
  function creditsHTML() {
    const row = (a, b) => `<div class="cr-row"><div>${a}</div><div>${b}</div></div>`;
    const lic = (m) => `${esc(m.author || 'Unknown')} · ${m.license_url ? `${esc(m.license)}` : esc(m.license || '')}`;
    let html = `<div class="cr-open">
        <div class="cr-title rv rv-track" style="--d:.4s">From Silicon to Machines That <span class="cr-think">Think<i></i></span> <span class="cr-act">Act</span></div>
        <div class="cr-sub rv rv-fade" style="--d:2.2s">A journey through the history, breakthroughs and future of artificial intelligence.</div>
        <div class="cr-by rv" style="--d:4.4s"><small>Created by</small>Simi Okunowo</div>
        <div class="cr-machine rv" style="--d:6.8s">and a beloved machine, <b>Claude Opus 5.5</b></div>
      </div>`;
    const shown = new Set(scenes.map(s => resolveBg(s)).filter(Boolean).map(m => m.id));
    const real = DATA.videos.filter(m => !m.synthetic && shown.has(m.id)), synth = DATA.videos.filter(m => m.synthetic && shown.has(m.id));
    if (real.length) {
      html += `<div class="cr-h">Archival footage</div>`;
      real.forEach(m => { html += row(esc(m.title), lic(m)); });
    }
    if (synth.length) {
      html += `<div class="cr-h">AI-generated shots</div>`;
      synth.forEach(m => { html += row(esc(m.title), esc(m.tool || m.author || 'AI-generated')); });
    }
    html += `<div class="cr-h">Photographs &amp; images</div>`;
    DATA.images.forEach(m => { html += row(esc(m.title), lic(m)); });
    if (DATA.now2026.length) {
      const srcs = [...new Set(DATA.now2026.map(n => n.source).filter(Boolean))];
      html += `<div class="cr-h">2026 · Sources</div><div class="cr-note">${srcs.map(esc).join(' · ')}</div>`;
    }
    html += `<div class="cr-h">A note on what you saw</div>
      <div class="cr-note">Every photograph and clip is real archival or documentary material, used under public-domain or Creative Commons terms. Some images stand for their era rather than the exact moment. The chat, terminal, Go board, Breakout and network sequences are illustrative reconstructions, not recordings. The popcorn scene with Claude in the opening is an illustration of a machine that acts, not a recording.</div>`;
    html += `<div class="cr-end">Where we go next is up to us</div>`;
    return html;
  }

  /* ---------------- Boot ---------------- */
  // Film grain texture
  (() => {
    const c = document.createElement('canvas'); c.width = c.height = 220;
    const g = c.getContext('2d'); const id = g.createImageData(220, 220);
    for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    g.putImageData(id, 0, 0);
    $('#grain').style.backgroundImage = `url(${c.toDataURL()})`;
  })();

  buildIndex();
  paintProgress();
  odo.classList.add('blank');
  requestAnimationFrame(loop);

  // Dev / review hooks: ?scene=<id>&at=<ms>  (skips the opening screen, no sound)
  if (params.has('scene')) {
    const id = params.get('scene');
    const i = /^\d+$/.test(id) ? +id : scenes.findIndex(s => s.id === id);
    $('#start').classList.add('gone'); started = true;
    go(Math.max(0, i), { jump: true }); play();
    if (params.has('at')) t = +params.get('at');
  }
  window.FILM = { go: jumpTo, scenes, play, pause, get t() { return t; }, get cur() { return cur; } };
})();
