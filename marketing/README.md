# OfflineMate marketing media

Source and build scripts for the demo video, website images and Play Store graphics. Everything is made from real emulator recordings of the release build, plus code-generated backgrounds, captions and music.

## What's here

| Path | What it is |
| --- | --- |
| `video/overlay.html` | The video's branded background, phone frame, captions and end card. Open it with `?f=vertical`, `?f=landscape` or `?f=square`, plus `&t=12` to see a moment. The screen area is transparent; the recording goes underneath. |
| `video/stills.html` | Template for store screenshots (`layout=store`, `tablet`), the feature graphic (`feature`), the social image (`og`), framed phone screens (`device`) and framed tablet screens (`tablet-device`). |
| `video/shots/` | Clean emulator screenshots (1080×2400) used by the stills. |
| `video/shots/tools-chat.png` | One Lite chat using four tools (reminder, calendar, note, note search), for the website's "One chat, four tools" block. Captured with the emulator's display size reduced (`adb shell wm density 360`; undo with `wm density reset`) so all four exchanges fit, and status bar demo mode (9:41, battery only). It needs a calendar event tomorrow and a saved note that mentions "dentist". |
| `video/vo/` | Voiceover lines (Kokoro `af_heart`, Apache-2.0). |
| `tools/ui.sh` | adb helpers that tap the emulator by on-screen text. |
| `tools/build-screen.sh` | Cuts the 35-second screen track from the raw recordings (real speed; only idle gaps are trimmed). |
| `tools/vo.py`, `tools/audio.py` | Voiceover and soundtrack (music and effects are generated in code, no samples). |
| `tools/render.mjs` | Renders the overlay with Playwright and composites the screen track with ffmpeg. |
| `tools/build-video.sh` | Renders all three formats and adds the soundtrack. |
| `tools/stills.mjs`, `tools/stills-jobs.json` | Renders the stills listed in the jobs file. |
| `tools/web_assets.py` | Exports WebP screenshots, the OG image, and the web video, poster and captions into `website/`. |
| `out/` | The videos and captions. `out/store/` and `out/web/` are render intermediates (git-ignored) that `web_assets.py` and the copy step put into `website/` and `assets/play-store-listing/`. |
| `video/shots/tablet-*.png`, `video/shots/tablet7-*.png` | Tablet screenshots used by the 10-inch and 7-inch store stills: 2560×1600 on the Pixel Tablet emulator, and 1920×1200 on the same emulator set to a 7-inch size (`adb shell wm size 1920x1200` and `wm density 320`; undo with `wm size reset` and `wm density reset`). |
| `raw/` | Recordings and intermediates (git-ignored). |

## Outputs

- `out/offlinemate-demo-1080x1920.mp4`: vertical, for Reels, Shorts and Stories.
- `out/offlinemate-demo-1920x1080.mp4`: 16:9, for YouTube and the website.
- `out/offlinemate-demo-1080x1080.mp4`: square, for LinkedIn.
- `out/offlinemate-demo.en.srt`: captions, for all three.
- `../assets/play-store-listing/`: Play Store graphics (copied from `out/store/`; see its README).
- `../website/media/`, `../website/screenshots/*.webp` (phone and `tablet-*`), `../website/og-image.jpg`: the website copies.

## Script (35 s)

| Time | Caption | Voiceover | Screen |
| --- | --- | --- | --- |
| 0–4.6 | Your AI assistant, on your phone | "Meet OfflineMate. An AI assistant that runs right on your phone." | Chat screen |
| 4.6–9 | 01 Works in airplane mode | "Turn on airplane mode. It keeps working." | Quick settings, Airplane mode on |
| 9–17.5 | 02 Ask anything | "Ask anything. The answer is written on your device, not in the cloud." | "Give me 3 tips to beat jet lag", answered at real speed by LFM 2.5 350M |
| 17.5–23 | 03 Notes stay private | "Save a note, and it stays on your phone." | Notes tab, a trip checklist saved |
| 23–29 | 04 A model for every phone | "Pick the model that fits your phone. Lite, Standard, or Full." | Settings tiers and the Lite model picker |
| 29–35 | End card | "OfflineMate. Private A.I. that works offline. By Rhyme Solutions." | offlinemate.com, "Coming soon to Google Play" |

Every claim matches the app: the answer and the note were made with airplane mode on, on the Lite tier. When the app goes live on Google Play, change "Coming soon to Google Play" in `video/overlay.html` and re-render.

## Rebuild

Requirements: Node 24 with `playwright` (`npm i playwright && npx playwright install chromium`), and Python with `kokoro-onnx soundfile scipy imageio-ffmpeg pillow`. Set `PW_MODULE` to the playwright package if it isn't installed here, `PW_EXECUTABLE` to a Chrome or Chromium binary if that package's own browser isn't downloaded, and `FFMPEG` to an ffmpeg binary (imageio-ffmpeg ships one).

```bash
python tools/vo.py <kokoro-models-dir> video/vo     # kokoro-v1.0.onnx + voices-v1.0.bin
tools/build-screen.sh                               # needs raw/c1.mp4, c2.mp4, c3.mp4
python tools/audio.py video/vo raw/soundtrack.wav
tools/build-video.sh
cd tools && node stills.mjs stills-jobs.json && cd ..
cp out/store/feature-graphic-1024x500.png ../assets/play-store-listing/
cp out/store/phone/*.png ../assets/play-store-listing/screenshots/phone/
cp out/store/tablet7/*.png ../assets/play-store-listing/screenshots/tablet/tablet7/
cp out/store/tablet10/*.png ../assets/play-store-listing/screenshots/tablet/tablet10/
python tools/web_assets.py all
```

## Recording notes

- Emulator: AVD `ops_pixel` (Pixel 7 profile, 1080×2400, 8 GB RAM) with the release APK, app data cleared and the Lite model files restored.
- Status bar: demo mode (`settings put global sysui_demo_allowed 1`, then `com.android.systemui.demo` broadcasts for a 9:41 clock, full battery, Wi-Fi and hidden notifications).
- Gboard's floating toolbar covers the chat on the emulator, so the Gboard package was disabled during recording (`pm disable-user com.google.android.inputmethod.latin`) and text was typed with `adb shell input text`. Re-enable it with `pm enable`.
- Clips: `adb shell screenrecord --bit-rate 16000000`. screenrecord writes variable-frame-rate video, so `build-screen.sh` converts each clip to 30 fps before cutting.

## Use-case videos

Short videos that each show one real request from start to finish: the prompt typed on the phone, the real reply, and the result (the alarm in the Clock app, the note in the Notes tab). They're for Instagram Reels, YouTube (Shorts and the main channel) and LinkedIn. Big captions repeat the prompt and the reply word for word, because the phone screen is too small to read on a phone feed.

| Output (`out/usecases/`) | Size | For |
| --- | --- | --- |
| `offlinemate-<id>-1080x1920.mp4`, seven shorts (14–18 s) | vertical | Reels, Shorts, Stories |
| `offlinemate-<id>-1080x1080.mp4` | square | LinkedIn feed |
| `offlinemate-compilation-1920x1080.mp4` (92 s) | 16:9 | YouTube, website |
| `offlinemate-compilation-1080x1080.mp4`, `-1080x1920.mp4` | square, vertical | LinkedIn, Instagram |
| `offlinemate-reel-1080x1920.mp4`, `-1080x1080.mp4` (16 s) | vertical, square | The fast "No internet? No problem." hook cut |
| `offlinemate-<id>.en.srt` | | Captions (the voiceover), one per video |
| `thumbs/` | 1280×720, 1200×627, 1080×1920, 1080×1080 | YouTube thumbnail, LinkedIn image, Reels/Shorts covers, square covers |

`<id>` is `alarm`, `note-add`, `note-recall`, `calendar`, `contact`, `tech` or `weather` (what each one says is in `video/usecases/cases.json`). Weather was recorded online (Wi-Fi on) because it needs the internet, so it isn't in the compilation, whose outro says everything was recorded in airplane mode.

How it's put together:

- `tools/uc-record.sh <id> "<prompt>" <wait> [return|notes|clock]` records one clip: a new chat, the prompt typed word by word, the reply, then the result. It writes `raw/uc/<id>.mp4` and an `.events` file of timestamps. The video runs about 1.2 s ahead of the events (screenrecord starts before the first mark).
- `video/usecases/cases.json` has each use case's text: hook, prompt, the reply as it appears on screen, the "after" line and the two voiceover lines.
- `tools/uc_timelines.py` holds the cut points for each clip and writes the timelines (`video/usecases/<id>.json`, `compilation.json`, `reel.json`). Clips play at real speed. Only the idle wait while the model works is shortened, to about 1.7 s.
- `tools/uc_screen.py` cuts each timeline's screen track (all-intra H.264, so any frame can be sought).
- `video/usecases.html` is the template: the phone plays the screen track in a `<video>`, and the captions, kinetic words, flashes and end card are driven by the timeline. `tools/render-uc.mjs` seeks it frame by frame in Chrome and pipes the frames to ffmpeg.
- `tools/uc_audio.py vo` makes the voiceover lines (Kokoro `af_heart`, cached in `video/vo-uc/` by text). `uc_audio.py mix` makes the soundtrack and writes the SRT: calm pads at 100 bpm, or a 124 bpm kick-and-clap mix for the reel.
- `video/thumb.html` and `tools/uc-thumbs.json` make the thumbnails from frames in `video/usecases/shots/`.

```bash
PY=python KOKORO=<kokoro-models-dir> tools/uc-build.sh alarm "vertical square"
PY=python tools/uc-build.sh compilation "landscape square vertical"
cd tools && node stills.mjs uc-thumbs.json
```

Recording setup (0.11.0): release build on `ops_pixel`, Standard tier with Gemma 4 E2B, **airplane mode on** (`cmd connectivity airplane-mode enable`), location off (it hides the satellite icon), status bar demo mode, Gboard disabled. Seed data: contacts Ali Khan (+92 300 1234567) and Sara Ahmed, a local calendar with "Dentist appointment" tomorrow 3–4 PM, and one note, "dentist appointment is Friday at 3pm". Delete leftover alarms in the Clock app first, because the alarm tool opens the Clock app on the new alarm, and the script scrolls that list to the top. Gemma ran at about 26 tokens/s on the emulator (host CPU). A phone is usually slower.
