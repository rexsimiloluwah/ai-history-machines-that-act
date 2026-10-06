// Renders trailer.html to an MP4 for LinkedIn: frame-perfect video plus the live-generated score.
//
//   python3 -m http.server 8642            (from the project root)
//   npm i -D puppeteer-core                (once)
//   node tools/render-trailer.mjs [width] [height] [out.mp4]
//
// Video: the page runs on a virtual clock that this script advances exactly 1/30 s per frame
// (timers, requestAnimationFrame, and every CSS animation and transition follow it), so no frame
// is ever dropped. Audio: a second, real-time run records the Web Audio score through MediaRecorder.
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const W = +(process.argv[2] || 1920), H = +(process.argv[3] || 1080);
const OUT = process.argv[4] || `trailer-${W}x${H}.mp4`;
const URL = process.env.TRAILER_URL || 'http://127.0.0.1:8642/trailer.html';
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FPS = 30, SECONDS = +(process.env.SECS || 30.8);
const work = join(process.env.TMPDIR || '/tmp', `trailer-${W}x${H}`);
rmSync(work, { recursive: true, force: true }); mkdirSync(join(work, 'f'), { recursive: true });

const VIRTUAL_CLOCK = `(() => {
  if (!location.search.includes('capture=1')) return;
  let vt = 0, rafs = [], rid = 0, timers = [], tid = 0;
  const startDate = Date.now();
  performance.now = () => vt;
  Date.now = () => startDate + vt;
  window.requestAnimationFrame = (cb) => { rafs.push({ id: ++rid, cb }); return rid; };
  window.cancelAnimationFrame = (id) => { rafs = rafs.filter(r => r.id !== id); };
  window.setTimeout = (cb, ms = 0, ...a) => { timers.push({ id: ++tid, at: vt + Math.max(0, +ms || 0), cb, a }); return tid; };
  window.setInterval = (cb, ms = 0, ...a) => { const id = ++tid; timers.push({ id, at: vt + Math.max(1, +ms || 1), cb, a, every: Math.max(1, +ms || 1) }); return id; };
  window.clearTimeout = window.clearInterval = (id) => { timers = timers.filter(t => t.id !== id); };
  const born = new WeakMap();
  window.__advance = async (ms) => {
    const target = vt + ms;
    for (;;) {
      timers.sort((x, y) => x.at - y.at);
      const t = timers[0];
      if (!t || t.at > target) break;
      vt = t.at;
      if (t.every) t.at += t.every; else timers.shift();
      try { typeof t.cb === 'function' ? t.cb(...t.a) : 0; } catch (e) { console.error(e); }
    }
    vt = target;
    const list = rafs; rafs = [];
    list.forEach(r => { try { r.cb(vt); } catch (e) { console.error(e); } });
    document.getAnimations().forEach(a => {
      if (!born.has(a)) born.set(a, vt);
      a.pause();
      a.currentTime = vt - born.get(a);
    });
    await Promise.all([...document.images].filter(i => !i.complete).map(i => i.decode().catch(() => {})));
    // Videos follow the virtual clock too: pause them and seek to the exact frame
    await Promise.all([...document.querySelectorAll('video')].filter(v => v.dataset.play === '1').map(v => {
      if (v.__vt0 == null) { v.__vt0 = vt; v.pause(); }
      const target = ((vt - v.__vt0) / 1000) % (v.duration || 1e9);
      if (Math.abs(v.currentTime - target) < 0.0005) return null;
      return new Promise(res => { v.addEventListener('seeked', res, { once: true }); v.currentTime = target; });
    }));
  };
})();`;

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--autoplay-policy=no-user-gesture-required', '--hide-scrollbars', '--force-color-profile=srgb'],
});

/* ---------- 1. Frames, on the virtual clock ---------- */
{
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.evaluateOnNewDocument(VIRTUAL_CLOCK);
  await page.goto(URL + '?capture=1', { waitUntil: 'load', timeout: 120000 });
  await page.evaluate(() => window.__promo.ready());
  await page.evaluate(() => window.__promo.start());
  const N = Math.round(SECONDS * FPS);
  for (let f = 0; f < N; f++) {
    await page.evaluate((ms) => window.__advance(ms), 1000 / FPS);
    await page.screenshot({ path: join(work, 'f', String(f).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 95 });
    if (f % 60 === 0) process.stdout.write(`frames ${f}/${N}\r`);
  }
  console.log(`frames ${N}/${N}`);
  await page.close();
}

/* ---------- 2. The score, recorded in real time ---------- */
{
  const page = await browser.newPage();
  await page.setViewport({ width: 640, height: 360 });
  await page.goto(URL + '?audio=1', { waitUntil: 'load', timeout: 120000 });
  const b64 = await page.evaluate(async (secs) => {
    Score.init();
    await window.__promo.ready();
    const rec = new MediaRecorder(Score.stream(), { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 256000 });
    const chunks = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    const done = new Promise(r => { rec.onstop = r; });
    rec.start(); window.__promo.start();
    await new Promise(r => setTimeout(r, secs * 1000 + 400));
    rec.stop(); await done;
    const buf = await new Blob(chunks, { type: 'audio/webm' }).arrayBuffer();
    let s = ''; const u = new Uint8Array(buf);
    for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
    return btoa(s);
  }, SECONDS);
  writeFileSync(join(work, 'score.webm'), Buffer.from(b64, 'base64'));
  console.log('score recorded');
  await page.close();
}
await browser.close();

/* ---------- 3. Encode ---------- */
execFileSync('ffmpeg', ['-y', '-loglevel', 'error',
  '-framerate', String(FPS), '-i', join(work, 'f', '%05d.jpg'),
  '-i', join(work, 'score.webm'),
  '-map', '0:v', '-map', '1:a',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-tune', 'film', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
  '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
  '-af', 'afade=t=out:st=' + (SECONDS - 0.8) + ':d=0.8',
  '-t', String(SECONDS), '-movflags', '+faststart', OUT], { stdio: 'inherit' });
console.log('wrote', OUT);
