# From Silicon to Machines That ~~Think~~ Act

*A journey through the history, breakthroughs and future of artificial intelligence.* A cinematic web film, 1936 to 2026, built from real archival photographs and footage. It opens with a 35-second cold open and runs about 12 minutes, plus credits.

Created by Simi Okunowo, and a beloved machine, Claude Opus 5.5.

**Watch the film:** https://rexsimiloluwah.github.io/ai-history-machines-that-act/  
**Trailer:** [16:9](https://rexsimiloluwah.github.io/ai-history-machines-that-act/promo/trailer-16x9.mp4) · [4:5 for LinkedIn](https://rexsimiloluwah.github.io/ai-history-machines-that-act/promo/trailer-linkedin-4x5.mp4)

## Watch it

```bash
python3 -m http.server 8000      # then open http://localhost:8000
```

You can also open `index.html` directly. Everything is static, with no build step and no dependencies beyond Google Fonts.

| Key | Action |
|---|---|
| `Space` / click | Play / pause |
| `←` `→` / scroll / swipe | Previous / next scene |
| `0`–`9` | Jump to an act |
| `M` | Sound on/off |
| `T` | Transcript and scene index (a text-only version of the whole film) |

## The shape of the film

1. **The trailer.** A cursor waits on a black screen. You power the machine on. Claude is asked for popcorn: it thinks, plans and acts, and the popcorn is ready. Everything freezes: "Machines that don't just answer… but act." Then the title types itself, "Think" is struck through and "Act" replaces it. A montage accelerates, cuts to silence. The title returns with **Begin**.
2. **Prologue to Act VII.** From Turing's machine on paper to the live wall of 2026.
3. **Act VIII, What Do We Do With Intelligence?** The promise, then the music turns and the screen darkens for the shadow, then six questions that stay hanging in the air after they are asked.
4. **The closing.** The original machine powers on with the same sound as the trailer. Ninety years flash past, faster and faster. Silence. *From silicon… to machines that think… to machines that act.* Then: *Where we go next is up to us.* The screen switches off like an old CRT, and the credits rise out of the dark.

## The direction

- **Time is the main character.** A ticking clock carries the score. It speeds up as history accelerates (60 → 138 bpm) and **stops dead** when we reach 2026.
- **The cold open starts in 2026 and rewinds.** Blue-tinted, Tenet-style inversion takes us back to 1936. Act III rewinds again, from 2012 to 1997, for the chess story.
- **History gains colour.** Acts I–II are black-and-white archival with grain, gate weave and projector flicker. Colour starts to bleed in during Act III and floods in on **AlexNet (2012)**.
- **The aspect ratio breathes.** History plays in a 2.39:1 letterbox. The bars open to full-frame "IMAX" for the big moments: *Can machines think?*, AlexNet, AlphaGo, ChatGPT, the Nobel Prizes and 2026.
- **The score is generated live** with the Web Audio API: a pocket-watch tick, a pipe-organ pad, a pulsing arpeggio, a Shepard tone (a pitch that seems to rise forever) and trailer hits. No audio files.
- **One idea per frame:** a year, a few words, an image.

## Files

```
index.html            the stage
css/film.css          frame, grades, letterbox, type, UI
css/fx.css            special shots
css/intro.css         the trailer
js/scenes.js          THE SCREENPLAY: every scene, its words, image, music cue
js/intro.js           the trailer (power on, typed title, montage, the Claude moment, Begin)
js/film.js            playback engine (shots, cards, odometer, transport, transcript, credits)
js/fx.js              special shots (Turing tape, ELIZA, backprop, Breakout, Move 37,
                      attention, scale, diffusion reveal, agent loop, 2026 wall, lamp panel,
                      closing montage, hanging questions, deepfake glitch, credits)
js/audio.js           the generative score
js/data.js            GENERATED: merged media manifests (do not edit)
assets/img, video     archival media (public domain / Creative Commons)
assets/data/*.json    media manifests with author + license, the 2026 wall, overrides
tools/build-data.mjs  rebuilds js/data.js after any manifest change
SHOTLIST.md           prompts + workflow for optional AI-generated b-roll (Higgsfield / Seedance)
```

**To edit the film,** change `js/scenes.js`. Each scene is a small object with its year, duration, images, words and music cue. **After changing any manifest,** run `node tools/build-data.mjs`.

## Honesty

- **Archival media:** every photograph and clip is real, used under public-domain or CC terms. Authors and licenses are in the manifests and roll in the end credits.
- **Illustrative images:** some images stand for their era rather than the exact moment.
- **Reconstructions:** the chat, terminal, Go board, Breakout and network sequences are illustrative, and the popcorn scene with Claude in the trailer is an illustration. The credits say so.
- **The 2026 wall:** 36 dated items, each with a source link, visible in the transcript (`T`). They were researched and spot-checked on 5 Oct 2026. Four items rest on company announcements rather than independent verification. Refresh `assets/data/now-2026.json` as events move.
- **Synthetic shots:** these are optional. If you add AI-generated shots (see `SHOTLIST.md`), they are labelled on screen and in the credits.

## Accessibility

- **Transcript:** the full film is available as text, opened from the start screen or with `T`.
- **Screen readers:** each scene is announced through a live region.
- **Reduced motion:** honours `prefers-reduced-motion`, which turns off Ken Burns moves, weave, flicker and fast tile swaps.
- **Flashing:** no full-screen flashes. Montage cuts and the rewind are crossfaded and dimmed to stay under the WCAG 2.3.1 flash threshold.
- **Controls:** pausable at any moment, with keyboard control throughout.

## The LinkedIn trailer

`promo/` holds a 31-second trailer, rendered from `trailer.html`. It opens on a time-lapse from 1936 that accelerates into 2026, then shows what is happening now: AlphaEvolve (49 → 48), the Navier–Stokes equations, Claude Code building a snake game and then playing it, the OpenAI incident as a swarm of agents breaching Hugging Face, concentration of power and embodied AI. Three questions follow, then "How did we get here?" rewinds to 1936 and runs forward through chess, Deep Blue, AlexNet, AlphaGo, AlphaZero, ChatGPT and the Nobel Prize. It ends on the title and an end card over the Earth at night, where a cursor clicks Watch the full film.

| File | Use |
|---|---|
| `promo/trailer-linkedin-4x5.mp4` | 1080×1350, best for the LinkedIn feed |
| `promo/trailer-16x9.mp4` | 1920×1080, for slides, YouTube, or a website |
| `promo/cover-4x5.jpg`, `promo/cover-16x9.jpg` | Custom thumbnails to upload with the post |

Both videos are H.264 at 30 fps with AAC audio normalised to −14 LUFS, and every word reads with the sound off.

To re-render after editing `js/promo.js` or `css/promo.css`:

```bash
python3 -m http.server 8642
npm i -D puppeteer-core
node tools/render-trailer.mjs 1080 1350 promo/trailer-linkedin-4x5.mp4
```

The renderer drives the page on a virtual clock, one frame per 1/30 s, so no frame is ever dropped. It then records the live score in a second, real-time pass.
