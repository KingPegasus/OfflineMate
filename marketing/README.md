# OfflineMate marketing media

Source and build scripts for the demo video, website images and Play Store graphics. Everything is made from real emulator recordings of the release build, plus code-generated backgrounds, captions and music.

## What's here

| Path | What it is |
| --- | --- |
| `video/overlay.html` | The video's branded background, phone frame, captions and end card. Open it with `?f=vertical`, `?f=landscape` or `?f=square`, plus `&t=12` to see a moment. The screen area is transparent; the recording goes underneath. |
| `video/stills.html` | Template for store screenshots (`layout=store`, `tablet`), the feature graphic (`feature`), the social image (`og`) and framed screens (`device`). |
| `video/shots/` | Clean emulator screenshots (1080×2400) used by the stills. |
| `video/vo/` | Voiceover lines (Kokoro `af_heart`, Apache-2.0). |
| `tools/ui.sh` | adb helpers that tap the emulator by on-screen text. |
| `tools/build-screen.sh` | Cuts the 35-second screen track from the raw recordings (real speed; only idle gaps are trimmed). |
| `tools/vo.py`, `tools/audio.py` | Voiceover and soundtrack (music and effects are generated in code, no samples). |
| `tools/render.mjs` | Renders the overlay with Playwright and composites the screen track with ffmpeg. |
| `tools/build-video.sh` | Renders all three formats and adds the soundtrack. |
| `tools/stills.mjs`, `tools/stills-jobs.json` | Renders the stills listed in the jobs file. |
| `tools/web_assets.py` | Exports WebP screenshots, the OG image, and the web video, poster and captions into `website/`. |
| `out/` | The videos and captions. `out/store/` and `out/web/` are render intermediates (git-ignored) that `web_assets.py` and the copy step put into `website/` and `assets/play-store-listing/`. |
| `video/shots/tablet-*.png` | Tablet screenshots (2560×1600, Pixel Tablet emulator) used by the tablet store stills. |
| `raw/` | Recordings and intermediates (git-ignored). |

## Outputs

- `out/offlinemate-demo-1080x1920.mp4`: vertical, for Reels, Shorts and Stories.
- `out/offlinemate-demo-1920x1080.mp4`: 16:9, for YouTube and the website.
- `out/offlinemate-demo-1080x1080.mp4`: square, for LinkedIn.
- `out/offlinemate-demo.en.srt`: captions, for all three.
- `../assets/play-store-listing/`: Play Store graphics (copied from `out/store/`; see its README).
- `../website/media/`, `../website/screenshots/*.webp`, `../website/og-image.jpg`: the website copies.

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

Requirements: Node 24 with `playwright` (`npm i playwright && npx playwright install chromium`), and Python with `kokoro-onnx soundfile scipy imageio-ffmpeg pillow`. Set `PW_MODULE` to the playwright package if it isn't installed here, and `FFMPEG` to an ffmpeg binary (imageio-ffmpeg ships one).

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
