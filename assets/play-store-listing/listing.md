# Google Play store listing text (0.12.0)

Paste each block as plain text into **Play Console → Grow users → Store presence → Main store listing**. Character counts are checked by `tests/unit/store-listing.test.ts`, which reads this file.

## App name (30 max)

<!-- listing:title -->
OfflineMate: Offline AI Chat
<!-- /listing:title -->

## Short description (80 max)

<!-- listing:short -->
Private AI assistant, no internet needed. Chat, ask about photos, set reminders.
<!-- /listing:short -->

## Full description (4000 max)

<!-- listing:full -->
OfflineMate is a private AI assistant that works offline. A local AI model runs on your Android phone or tablet, so you can chat, ask about a photo, take notes and set reminders with no internet, no account and no cloud. Download a model once, then keep going in airplane mode.

WHAT YOU CAN DO
• Chat with an offline AI: ask questions, draft messages, brainstorm, summarize or translate. Every answer is written on your device.
• Ask about a photo: pick a picture from your gallery and ask what's in it, what a sign says or what a chart shows. Vision models read the image on your phone, and the photo is never uploaded.
• Private notes: save notes and ask about them later. On Standard and Full, OfflineMate searches your notes by meaning without sending them anywhere.
• Reminders, alarms and calendar: "Remind me tomorrow at 9 AM to call the bank", "Set an alarm for 6:30", "What's on my calendar tomorrow?", "Add dentist appointment Friday at 3pm".
• Contacts: "What's Ali's number?" finds the contact on your phone (read only).
• Voice input: hold the mic and talk. Speech is turned into text on your device.
• Optional web search and weather when you're online. One switch in Settings turns both off.

GOOD FOR
• Flights, travel, hiking and places with weak or no signal
• Questions and photos you'd rather not send to a cloud AI
• Quick notes and reminders without signing up for anything

ON-DEVICE AI MODELS FOR EVERY PHONE
OfflineMate runs open AI models (LLMs) locally. Setup recommends a tier for your phone's memory, and you can switch models at any time. Models that can read photos are marked with an image icon.
• Lite (3–4 GB RAM): SmolLM2, LFM 2.5 and LFM 2.5 VL 450M (reads photos).
• Standard (6–8 GB RAM): Gemma 4, Qwen 3, Qwen 3.5, MiniCPM5, Llama 3.2, SmolLM2 and LFM 2.5 VL 1.6B (reads photos).
• Full (10–12+ GB RAM): Qwen 3 4B, LFM 2.5 2.6B, Llama 3.2 3B, LFM 2.5 VL 1.6B and Gemma 4 E2B multimodal (reads photos).

DOWNLOADS, DONE RIGHT
Models are large, so OfflineMate checks your free storage first, asks before using mobile data, and shows the size, speed and time left, with a Cancel button.

BUILT FOR PHONES AND TABLETS
On a tablet, a side rail replaces the bottom tabs, your chats sit beside the conversation, and notes open next to the list.

PRIVACY, PLAINLY
• Chat, photos, notes, voice input and tools run on your device once the model is downloaded.
• Photos are picked one at a time in Android's photo picker, so OfflineMate needs no photo or storage permission. The copy it keeps is shrunk and stripped of location data.
• The internet is used to download models and, only if you use them, for web search and weather.
• Spoken replies (optional) use your device's text-to-speech voices, which some vendors run online.
• No account, no ads, and no analytics sent to us.
• Calendar, contacts, microphone and notifications are used only when you allow them.

FREE AND OPEN SOURCE
OfflineMate is free and MIT licensed. Source code: github.com/KingPegasus/OfflineMate
Website: offlinemate.com

Requires Android 7.0 or later. Model downloads range from about 430 MB (Lite) to 4.2 GB, so use Wi-Fi for the first download.
<!-- /listing:full -->

## What's new (500 max)

<!-- listing:whatsnew -->
New in 0.12.0:
• Ask about a photo: pick an image from your gallery and ask what's in it. Runs on your phone with LFM 2.5 VL or Gemma 4 multimodal (look for the image icon in Settings). No photo permission needed.
• Better downloads: size, speed and time left, a Cancel button, a free-space check and a warning before using mobile data.
• Unused photo copies are cleaned up automatically.
<!-- /listing:whatsnew -->

## Keyword plan

Researched on Google Play (Pakistan store, English) on 2026-11-18.

- **"ai assistant"** belongs to Gemini, Google Assistant, ChatGPT, DeepSeek, Copilot, Meta AI, Claude, Grok and Perplexity, plus dozens of cloud chatbots. A 10+ download app won't rank there, so it isn't the lead keyword. It still appears naturally ("private AI assistant").
- **"offline ai"** is the niche that fits: about 30 results, nearly all titled "Offline AI Chat: …", "Local LLM Chat" or "Private Offline AI", and nearly all chat only. OfflineMate is the one that also does reminders, alarms, calendar, contacts, notes, voice and photos, so the listing leads with that.
- **Title** `OfflineMate: Offline AI Chat`: the brand token "OfflineMate" doesn't match a search for "offline", so the title spells out the exact phrase "offline AI chat", which covers "offline ai", "ai chat" and "offline chat". "Private" moves into the short description, where it's indexed too.
- **Short description** carries the next most-searched phrases: "private AI assistant", "no internet", "photos", "reminders".
- **Full description**: the first sentence repeats the core phrases (private AI assistant, works offline, local AI model, no internet). After that the text reads naturally; each phrase appears 2–4 times. Play penalises keyword stuffing and lists of keywords.
- **Long-tail phrases worked in**: AI without internet, on-device AI, local LLM, AI chatbot offline, ask about a photo, AI image description, private notes, offline reminders, airplane mode.
- **No competitor names.** Play's metadata policy forbids other apps' trademarks ("ChatGPT alternative" etc.). The model names (Gemma, Qwen, Llama, LFM, SmolLM2, MiniCPM5) are the models the app runs, so they're factual.

## Screenshots (phone, upload in this order)

The first three show in search results, so they carry the pitch: offline chat, the new photo feature, and the tools no other offline AI app has.

1. `phone-01-offline-chat.png`: "Your AI assistant, no internet needed"
2. `phone-02-ask-about-a-photo.png`: "Ask about any photo, offline" (new in 0.12.0)
3. `phone-03-built-in-tools.png`: "More than chat"
4. `phone-04-private-notes.png`: "Notes stay on your device"
5. `phone-05-pick-a-tier.png`: "A tier that fits your phone"
6. `phone-06-choose-a-model.png`: "Choose your model" (models that read photos have an image icon)
7. `phone-07-privacy.png`: "Clear privacy boundaries"

Tablets (7- and 10-inch, same order without the tools shot; the 10-inch files start with `tab10-` instead of `tab7-`): `tab7-01-offline-chat`, `tab7-02-ask-about-a-photo`, `tab7-03-private-notes`, `tab7-04-pick-a-tier`, `tab7-05-choose-a-model`, `tab7-06-privacy`. Delete the old tablet images first; the file names changed.

## Also update in Play Console

- **Data safety**: the current listing says "Data can't be deleted". Nothing is collected by us, but users read that as a red flag. If the form allows it, answer that no data is collected or that users can delete their data (chats and memories: Settings → Clear chats and memories; models: uninstall).
- **Store listing experiment**: once installs pick up, A/B test the title against `OfflineMate: Private Offline AI` and screenshot 2 (photo) against the notes screenshot.
- **Translations**: Play auto-translates if you don't, but Urdu, Hindi, Spanish, Portuguese and Indonesian listings are worth doing by hand later; offline AI matters most where data is expensive.
