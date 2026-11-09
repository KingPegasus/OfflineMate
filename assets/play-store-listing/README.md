# Google Play listing assets

Upload these in **Play Console → Grow users → Store presence → Main store listing**. The screenshots are real screens from the release build (Android emulator) with a short headline on the OfflineMate background. They're rendered by [`marketing/`](../../marketing/README.md), so edit the headlines in `marketing/tools/stills-jobs.json` and re-render rather than editing the PNGs.

| Play Console slot | File | Size | Notes |
| --- | --- | --- | --- |
| App icon | `store-icon-512.png` | 512×512 PNG | Made by `scripts/generate-play-store-assets.ps1` from `assets/icon.png` (full-bleed tile; Play adds the rounded mask). |
| Feature graphic | `feature-graphic-1024x500.png` | 1024×500 PNG | Logo, name and tagline sit well inside the edges; the phones bleed off the bottom on purpose. |
| Phone screenshots | `screenshots/phone/01-…06-*.png` | 1080×1920 (9:16) | Upload in number order; the first three show in search results. |
| 7-inch tablet screenshots | `screenshots/tablet/tablet7/*.png` | 1920×1200 (16:10) | Captured on a Pixel Tablet emulator. |
| 10-inch tablet screenshots | `screenshots/tablet/tablet10/*.png` | 2560×1600 (16:10) | Same screens at full tablet resolution. |
| Promo video (optional) | `marketing/out/offlinemate-demo-1920x1080.mp4` | 1920×1080, 35 s | Play only takes a YouTube URL: upload this to YouTube first, then paste the link. |

## Phone screenshot order

1. `01-offline-chat.png`: "Your AI assistant, no internet needed" (chat answered on the phone)
2. `02-private-notes.png`: "Notes stay on your device"
3. `03-pick-a-tier.png`: "A tier that fits your phone" (setup screen)
4. `04-choose-a-model.png`: "Choose your model" (Lite model picker)
5. `05-built-in-tools.png`: "More than chat" (tool list)
6. `06-privacy.png`: "Clear privacy boundaries" (Settings)

Play's rules: PNG or JPEG, up to 8 MB each, sides 320–3840 px, aspect ratio no longer than 2:1. Every file here fits.
