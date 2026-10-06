# Shot list: AI-generated b-roll

The film runs on **real** archival photographs and footage. Ten atmospheric scenes also have a **slot** for an AI-generated shot. These are abstract or object-only moments (no real people, no real events) where a moving image beats a still.

When a clip exists in a slot, the film uses it automatically. The top-right slate then reads **◇ AI-generated shot**, and the clip is listed under *AI-generated shots* in the credits. When a slot is empty, the scene falls back to its archival image, so the film is always complete.

## Ground rules

- **Never generate "archival footage" of real people or real events.** No fake Turing, no fake Kasparov, no fake 1956. Real history stays real.
- **No real names, film titles or brands in prompts.** Filters block them, and they create legal risk.
- **Don't animate archival portraits.** Seedance blocks real-face inputs, and you shouldn't do it anyway.
- **Keep a provenance log** for every clip: tool, model, prompt, seed and date. It goes into `generated.json` below.
- **The EU AI Act** (in force since 2 Aug 2026) requires disclosure of synthetic media that could pass as real. The on-screen label and the credits cover this.

## Recommended route

| Option | Why |
|---|---|
| **Higgsfield** (~$39–59 for one month of Plus) | 50+ camera presets (Dolly In, Crash Zoom, Bullet Time, FPV, Arc) plus Seedance, Kling and Veo from one credit pool. Fastest for a solo creator. |
| **Seedance 2.0** via Higgsfield or fal.ai | 4–15 s clips at 1080p, start/end frames. Use 2.0 for 1080p: Seedance 2.5 is 720p via API today. |
| **Veo 3.1 Fast** | The cheapest good 1080p option (~$0.12/s) if you want to batch everything. |

Sora is discontinued (API off since 24 Sep 2026). Check prices on the day you buy, because they change monthly.

**Global settings:**
- 1080p, 24 fps, 16:9.
- 5–8 s per clip.
- **No audio.** The film's score is generated live in the browser.
- Add this style suffix to every prompt:

> *shot on 65mm large-format film, deep blacks, fine natural grain, practical lighting, slow deliberate camera move, no text, no logos, no people*

## The ten shots

| Slot | Scene | Prompt | Camera | Len |
|---|---|---|---|---|
| `g-tubes` | Title card | Extreme macro of vintage vacuum tubes in total darkness. Their filaments warm up one by one, glowing amber. Dust motes drift through the light. | Dolly In (very slow) | 8 s |
| `g-tape-reader` | "Can a machine compute?" | Black-and-white close-up of punched paper tape racing through an optical reader in a dark 1940s laboratory. Motion blur on the tape, hard side light. | Static | 6 s |
| `g-snow-room` | AI Winter | A slow glide through an abandoned 1970s mainframe room with silent tape drives. Fine snow drifts down from the ceiling and settles on the consoles. Cold light through high windows, black and white. | Dolly forward | 8 s |
| `g-corridor` | "What happens when we give learning machines enormous data?" | An endless data-centre corridor. Server racks with blinking status lights recede to a vanishing point. Low camera, symmetrical, immense scale. | FPV drone, slow | 8 s |
| `g-king-falls` | Deep Blue | A black chess king tips over in extreme slow motion onto a chessboard. Single hard top light, black void. | Static macro | 6 s |
| `g-go-stone` | Move 37 | Extreme close-up: one black go stone is placed onto a wooden board between white stones. Warm low-key light, very shallow depth of field, slow motion. | Static macro | 6 s |
| `g-helix` | "From playing games… to understanding life" | A DNA double helix made of soft blue light, slowly rotating in a dark void, with particles drifting. | Arc / orbit | 8 s |
| `g-branching` | "AI discovers" | Filaments of warm light branch and multiply in darkness, like a growing tree or a neural pathway. | Dolly In | 8 s |
| `g-cursor` | "What if AI pursues a goal?" | A single blinking text cursor on a black screen, extreme close-up of the pixels. Faint screen glow on dust in the air. | Slow push-in | 6 s |
| `g-clock-stops` | **The clock stops** (start of 2026) | Extreme macro of a pocket-watch movement: gears and balance wheel ticking, then everything stops dead. A single dust particle hangs in the light. Hard side light, black background. | Static macro | 5 s |

`g-clock-stops` is the signature shot. It lands exactly when the film's ticking score cuts to silence.

**Image-to-video:** for `g-tubes` you can use `assets/img/vacuum-tubes.jpg` as the start frame. Its license is CC BY-SA 4.0, so the clip inherits attribution and share-alike: credit Rob Robinette. All the others are pure text-to-video.

## Dropping a clip in

```bash
# 1. Compress (no audio, web-friendly)
ffmpeg -i raw.mp4 -an -vf "scale=1920:-2:flags=lanczos,fps=24" -c:v libx264 -preset slow -crf 24 \
  -pix_fmt yuv420p -movflags +faststart assets/video/generated/g-clock-stops.mp4
ffmpeg -ss 1 -i assets/video/generated/g-clock-stops.mp4 -frames:v 1 -q:v 4 assets/video/generated/g-clock-stops.jpg

# 2. Register it in assets/data/generated.json
# 3. Rebuild the data file
node tools/build-data.mjs
```

`assets/data/generated.json` entry (this is your provenance log):

```json
[
  {
    "id": "g-clock-stops",
    "file": "assets/video/generated/g-clock-stops.mp4",
    "poster": "assets/video/generated/g-clock-stops.jpg",
    "title": "A watch movement stops (AI-generated)",
    "tool": "Higgsfield · Seedance 2.0 · 1080p",
    "prompt": "Extreme macro of a pocket-watch movement…",
    "seed": 123456,
    "date": "2026-10-05"
  }
]
```
