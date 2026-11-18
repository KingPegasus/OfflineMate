# Google Play listing assets

Upload these in **Play Console → Grow users → Store presence → Main store listing**. The screenshots are real screens from the release build (Android emulator) with a short headline on the OfflineMate background. They're rendered by [`marketing/`](../../marketing/README.md), so edit the headlines in `marketing/tools/stills-jobs.json` and re-render rather than editing the PNGs.

| Play Console slot | File | Size | Notes |
| --- | --- | --- | --- |
| App icon | `store-icon-512.png` | 512×512 PNG | Made by `scripts/generate-play-store-assets.ps1` from `assets/icon.png` (full-bleed tile; Play adds the rounded mask). |
| Feature graphic | `feature-graphic-1024x500.png` | 1024×500 PNG | Logo, name and tagline sit well inside the edges; the phones bleed off the bottom on purpose. |
| Phone screenshots | `screenshots/phone/phone-01-…phone-07-*.png` | 1080×1920 (9:16) | Upload in number order; the first three show in search results. Delete the old 0.11.0 set in Play Console first (its file names changed). |
| 7-inch tablet screenshots | `screenshots/tablet/tablet7/*.png` | 1920×1200 (16:10) | The tablet layout at a 7-inch tablet's size (960×600 dp), captured on the Pixel Tablet emulator with `wm size 1920x1200` and `wm density 320`. |
| 10-inch tablet screenshots | `screenshots/tablet/tablet10/*.png` | 2560×1600 (16:10) | The tablet layout on the Pixel Tablet emulator (1280×800 dp): navigation rail, chat list beside the conversation, notes list beside the note. |
| Promo video | https://youtu.be/_3OGRtLmc1U | 1920×1080, 35 s | `marketing/out/offlinemate-demo-1920x1080.mp4` on YouTube. Play only takes a YouTube URL; paste this one. Keep the video public or unlisted, with ads off. |

## Phone screenshot order

1. `phone-01-offline-chat.png`: "Your AI assistant, no internet needed" (chat answered on the phone)
2. `phone-02-ask-about-a-photo.png`: "Ask about any photo, offline" (0.12.0: a café menu photo answered by LFM 2.5 VL 1.6B in airplane mode)
3. `phone-03-built-in-tools.png`: "More than chat" (tool list)
4. `phone-04-private-notes.png`: "Notes stay on your device"
5. `phone-05-pick-a-tier.png`: "A tier that fits your phone" (setup screen; retaken for 0.12.0 with sizes in GB and the image icon)
6. `phone-06-choose-a-model.png`: "Choose your model" (Lite model picker, with the image icon on LFM 2.5 VL 450M; 0.12.0)
7. `phone-07-privacy.png`: "Clear privacy boundaries" (Settings, with the info buttons)

Tablet screenshots (`screenshots/tablet/tablet7/` and `tablet10/`): `tab7-01-offline-chat` … `tab7-06-privacy` and `tab10-01-offline-chat` … `tab10-06-privacy` (`01-offline-chat`, `02-ask-about-a-photo`, `03-private-notes`, `04-pick-a-tier`, `05-choose-a-model`, `06-privacy`). The chat, photo, setup and model picker shots were retaken for 0.12.0 (image button, image icon, sizes in GB). The tablet photo shot uses LFM 2.5 VL 450M on Lite and asks "What drinks are on this menu, and how much is a latte?"; the phone's harder question ("Which drink is cheapest…") got a wrong answer from the 450M model, so it isn't used on tablets.

The first three show in search results, so they carry the pitch: offline chat, the new photo feature and the tools. The setup screens come after. The listing text (title, descriptions, What's new) and the keyword research are in [`listing.md`](listing.md).

Play's rules: PNG or JPEG, up to 8 MB each, sides 320–3840 px, aspect ratio no longer than 2:1. Every file here fits.
