# Changelog

All notable changes to this project are documented in this file.

## [0.13.0] - 2026-11-20

Foldable phones: the app switches between the phone and tablet layouts as you fold and unfold, without losing what you were doing, and keeps content off the fold when the phone is half-open. Also fixes the keyboard closing by itself while typing when the microphone is denied, and the app closing on Chromebooks.

### Added
- Book posture (half-open, fold running top to bottom): Chat and Notes show two panes split at the fold, the chat list or notes list on one side and the conversation or note on the other, instead of a single pane or a split that runs under the fold. It turns on for any wide window in book posture, so foldables whose inner screen is only medium width (under 840 dp) get two panes too (`useHingeSplit` in `src/hooks/useBreakpoint.ts`, `app/(tabs)/chat.tsx`, `app/(tabs)/notes.tsx`).
- Tabletop posture (half-open, fold across the middle, bottom half on a table): Chat keeps messages on the top half and the message box on the bottom half, below the fold.
- A local Expo module, `modules/window-posture` (Android, Jetpack WindowManager `androidx.window` 1.5.1), reports the fold's position and whether it's flat or half-open; `src/native/window-posture.ts` shares one subscription between screens. On iOS, phones, tablets and folded or fully open foldables it reports nothing and the layouts are unchanged. Pure helpers `getSeparatingHinge` and `splitAroundHinge` in `src/utils/layout.ts` decide the split (`tests/unit/layout.test.ts`).
- `plugins/with-foldable-activity.js` pins the main activity's `configChanges` (`orientation|screenSize|smallestScreenSize|screenLayout`, merged with Expo's) and `resizeableActivity="true"`, so folding never recreates the activity, which would remount the screens and drop typed text and an attached photo. Expo's template lists these today; the plugin keeps it that way (`tests/unit/foldable-activity-plugin.test.ts`). There's still no manifest orientation lock.
- `docs/foldable/`: emulator screenshots of the folded, unfolded, book and tabletop layouts.

### Fixed
- With the microphone denied, the keyboard kept closing and reopening on its own while you typed in Chat (reported from a Redmi Note 14 Pro+). Opening Chat pre-warms the speech model, and that also asked for the microphone. The permission screen pauses the app, which voice input treated as leaving the app: it stopped the session, which pre-warmed a new one, which asked again. Once the mic was denied for good, the permission screen opened and closed instantly, so this repeated dozens of times a second (73 requests in 15 seconds on the emulator). Each round took focus away and dropped the keyboard, and the app kept starting and stopping speech sessions in the background. Now:
  - Pre-warming only loads the speech model. The microphone is asked for when you press the mic button, so Chat no longer shows a microphone prompt as soon as it opens.
  - Leaving the app stops voice input only while it's actually recording.
  - The press that shows the permission prompt doesn't record, because the prompt ends the press. After allowing the mic, "Microphone on" says to hold the button again. Denying shows the existing "Microphone permission needed" message.

  (`src/voice/stt-engine.ts`, `src/hooks/useVoice.ts`, `src/components/VoiceButton.tsx`, `tests/unit/stt-mic-permission.test.ts`)
- A reminder or contact lookup that asked for a permission failed with "Tool reminders.set timed out" if you took more than 15 seconds to answer the system prompt, even when you then allowed it. Tool calls get 15 seconds of time with the app on screen; time in a permission dialog, or in another app, doesn't count. On iOS, a permission alert pauses the clock the same way (`src/utils/foreground-timeout.ts`, `src/hooks/useLLMChat.ts`, `tests/unit/foreground-timeout.test.ts`).
- "Save a note called Groceries: milk, eggs and bread" went to the contacts tool, because the contacts keyword "call" matched inside "called" and "save a note" wasn't a notes phrase. Notes now recognise "save / take / make / create / write a note" and "new note". A note "called", "titled" or "named" something gets that title, with the text after a colon as its content (title "Groceries", content "milk, eggs and bread."). "Remind me … to call the bank" still goes to reminders (`src/tools/notes-tool.ts`, `tests/unit/search-tool-routing.test.ts`, `tests/unit/notes-tool.test.ts`).
- A reminder ending in a full stop was confirmed with two: "Reminder set to go off in 10 minutes: stretch.." (`src/tools/reminders-tool.ts`).
- iOS never asked for the microphone, so voice input with the mic denied said "No speech detected" every time instead of pointing to Settings. The audio stream library opens the microphone without asking, and the permission check above only covered Android. A new iOS-only local module, `modules/mic-permission` (`AVAudioApplication`), reads and asks for record permission, and iOS now follows the same flow as Android: one prompt on the first press, "Microphone on" after allowing, "Microphone permission needed" when denied (`src/native/ios-mic-permission.ts`, `tests/unit/stt-mic-permission-ios.test.ts`). Checked on the iOS 27.2 simulator (release build): no prompt when Chat opens, one prompt on the first press, then no more prompts.
- The app closed with no error on Chromebooks (Play crash report: Intel Jasper Lake Chromebook, Android 13, 0.12.0). Android apps there run in a virtual machine whose virtual CPU reports an unusual layout. When ExecuTorch's native library loaded, the OpenMP runtime bundled in it (`libRnExecutorch.so`) failed an internal check while reading that layout (`kmp_topology_t::_set_globals`) and aborted the app. A new Android-only local module, `modules/openmp-env`, sets `KMP_TOPOLOGY_METHOD=flat` when the app process starts, before the library can load, so OpenMP skips reading the CPU layout. That layout only matters for pinning threads to cores, which OpenMP doesn't do by default, so model speed is unchanged (`tests/unit/openmp-env-module.test.ts`).

### Changed
- `react-native-executorch` 0.11.1, which adds Reverb text-to-speech and opt-in Qualcomm NPU support (OfflineMate uses neither) and switches to new native library builds (`v0.11.1-libs`). It's approved in `allowScripts` and pulls in one new indirect dependency, `verbalis`. Also `@tanstack/react-query` 5.108.1. Expo reports every SDK 58 package as current. Still held back: ESLint 10, TypeScript 7 and `@types/node` 26 (major versions), and `react-native-reanimated` 4.8, `react-native-worklets` 0.14, `react-native-gesture-handler` 3.5, `react-native-keyboard-controller` 1.23 and React 19.3.1, which Expo SDK 58 pins.
- `.gitignore` ignores only the root `android/` folder (generated by `expo prebuild`), so local modules' `modules/*/android` sources are tracked, as `modules/*/ios` already were.
- `tests/unit/store-listing.test.ts` and `tests/unit/website-content.test.ts` normalise line endings before matching, so they pass on a Windows checkout with `core.autocrlf` (CRLF files) as well as on CI.
- `useBreakpoint()` also returns `hinge` (the half-open fold, or null), and `isTwoPane` is true in book posture as well as on expanded windows. Layouts already followed `useWindowDimensions`, so unfolding switched to the tablet layout live; this is now checked on a foldable emulator.

### Verified
- On the Android Emulator's 7.6" Pixel Fold (API 36, release build), folding and unfolding with `cmd device_state` switches between the phone layout (outer screen, bottom tab bar) and the tablet layout (inner screen, navigation rail, two panes) on the spot. Through every fold the app kept the same process and activity and kept: a model download in progress (it carried on from 2% to done), typed chat text, an attached photo with its question, a reply being generated (sent folded, unfolded while the vision model answered "A latte costs $4.20."), and an unsaved note's title and text. Half-open in landscape moved the chat and notes splits onto the fold; half-open in portrait put the message box below the fold. Screenshots are in `docs/foldable/`.

### Known issues
- Only Chat and Notes adapt to the fold's position. Settings, Tools, Chats and onboarding are single centred columns that can cross the fold in book posture; on a flat open screen that's fine, and they're scrolling lists, so nothing is hidden for long.
- Tabletop posture splits Chat only when the window is tall enough for both halves (at least 240 dp of messages above the fold and 120 dp below it).
- The Chromebook fix can't be tested here: the Android Emulator's virtual CPU doesn't hit the OpenMP check. It's confirmed that the variable is set at start-up and that chat and photo questions still work. Whether Chromebooks stop crashing will show in Play's crash reports once 0.13.0 is out.
- A tester's Redmi Note 14 Pro+ (Android 16, 0.11.0) closed after about a minute of switching tabs. It didn't happen in about 1,100 tab switches on an emulator set up like that phone (12 GB, 1220×2712, Android 16), on 0.11.0 or 0.13.0, and memory stayed flat. Those runs had the microphone undecided, not denied. The microphone loop fixed above (dozens of permission-screen launches a second) may have been behind it, but Play has no crash report for that phone, so this isn't confirmed.
- Tested on the Android Emulator's 7.6" Pixel Fold (API 36) only, not on a physical foldable or Samsung's Flex mode. iOS has no foldables, so the module isn't built there.

## [0.12.0] - 2026-11-17

Ask about a photo: pick an image from the gallery and send it with a prompt to an on-device vision model. Model downloads explain themselves, and the Play listing, store screenshots and website are updated for both.

### Added
- Vision models: **LFM 2.5 VL 450M** (Lite, ~619 MB), **LFM 2.5 VL 1.6B** (Standard and Full, ~2.3 GB) and **Gemma 4 E2B multimodal** (Full, ~4.2 GB) from react-native-executorch 0.11, selectable in Settings and onboarding, where an image icon marks them (`src/components/VisionBadge.tsx`). The Standard default Gemma 4 E2B is the text-only export; the multimodal export is a separate, larger file with vision and audio encoders, so it's offered on Full. Models load with their encoders on (`LLMModule.fromModelName` with `capabilities` and, for Gemma, `audioConfig`, replacing `fromCustomModel`); LFM 2.5 VL uses its model card's sampling (temperature 0.1, min-p 0.15, repetition penalty 1.05) on top of the tier settings (`capabilities`, `audioConfig`, `generationOverrides`, `modelSupportsVision`, `visionUnsupportedMessage` in `src/ai/model-registry.ts`; `src/ai/llm-engine.ts`).
- Chat: an image button left of the message box opens the phone's photo picker. The picked photo shows above the box with a remove button; send it with a question, or on its own for "Describe this image." It appears in your message bubble. Image questions go straight to the model (no tools, notes or web search). Only the newest image in the chat is sent to the model, so follow-up questions about it work without older images filling the context. With a text-only model active, the button explains which vision model to pick and opens Settings (`src/components/ChatComposer.tsx`, `src/components/ChatBubble.tsx`, `app/(tabs)/chat.tsx`, `sendMessage(content, { imageUri })` in `src/hooks/useLLMChat.ts`).
- Photos are handled privately: the system photo picker (Android Photo Picker / iOS PHPicker) gives the app only the chosen image, so no permission prompt is shown. The copy is scaled to at most 1024 px, re-encoded as JPEG (dropping EXIF metadata such as GPS location) and kept in app storage (`chat-images/`); deleting a chat or **Clear chats and memories** deletes it. When the app starts and the saved chats have loaded, copies no message points to are deleted too: a photo attached but never sent because the app was closed, or chats that weren't kept because "Persist chat history" is off. If the saved chats fail to load, nothing is deleted (`pruneUnreferencedChatImages` in `src/utils/chat-images.ts`, `onRehydrateStorage` in `src/stores/chat-store.ts`, `tests/unit/vision-images.test.ts`).

- Model downloads, rethought for multi-GB files (`src/hooks/useModelDownload.ts`, `src/components/DownloadProgressCard.tsx`, `src/utils/download-format.ts`, `src/ai/model-manager.ts`):
  - Progress is weighted by bytes. Each file used to count the same, so a 2.3 GB model and a 3 KB tokenizer config were a third each: the bar sat at 1% with 132 MB of 2.4 GB done and would jump from 33% to 100% at the end.
  - The card shows "59 MB of 624 MB · 4.8 MB/s · about 2 min left" and which part is downloading in plain words ("Chat model", "Voice model", "Notes search") instead of asset IDs like `lfm2.5-vl-1.6b-model`.
  - **Cancel download** stops it and deletes the partial file. **Hide (keeps downloading)** closes the model list; the card then shows at the top of Settings.
  - Before starting: offline gets "You're offline"; too little storage (the download plus 10% and 200 MB) gets "Not enough storage" with the free space; mobile data asks "Download on mobile data?" for anything over 50 MB (`expo-network`).
  - Only missing files count: with the voice model already on the phone, LFM 2.5 VL 450M asks for 624 MB, not 697.
  - Settings downloads the chat and voice models as one download with one bar (it used to reset to 0% for the voice model). Onboarding's box says "Not downloaded yet. About 2.6 GB…" with one button, instead of "Assets ready: 3/7" and a file ID.
  - Chat's first-load popup shows MB, speed and time left instead of the `.pte` file name.
  - Sizes read the same everywhere: 1000 MB shows as 1 GB, as on the website and the Play listing.
- Play listing text in `assets/play-store-listing/listing.md`: title `OfflineMate: Offline AI Chat`, short and full description, What's new, and the keyword research behind them (the "ai assistant" search is held by Gemini, ChatGPT, DeepSeek, Copilot and Meta AI; the "offline ai" search is about 30 chat-only apps, so the listing leads with what they don't do: photos, reminders, alarms, calendar, contacts, notes, voice). `tests/unit/store-listing.test.ts` checks Play's length limits, that every vision model and the largest download size are named, and that no competitor app is.
- Website: an "Ask about a photo" feature card, an "Ask about any photo, offline" showcase with the new screenshot, the download checks under "How it works", two FAQ entries (photos, and the photo permission), storage sizes up to 4.2 GB, "15 models … 3 that read photos", and photo questions in the meta and structured data (`website/index.html`, `website/styles.css`). The models page says which models read photos and why the Gemma 4 default doesn't; the Settings guide covers the image icon and the download card.

### Fixed
- Google Play refused to send the first 0.12.0 upload (version code 16) for review: "Required hardware feature declarations are restricting your app's availability" for `android.hardware.wifi`. The `ACCESS_WIFI_STATE` permission from `expo-network` (new in 0.12.0) and `react-native-blob-util` makes Play treat Wi-Fi as required, which hides the app from devices without it. A config plugin now declares Wi-Fi as not required, and the microphone too: `RECORD_AUDIO` implied it the same way, and voice input is optional. `aapt dump badging` on the release APK now lists both under `uses-feature-not-required` (`plugins/with-optional-hardware.js`, `app.json`, `tests/unit/optional-hardware-plugin.test.ts`).
- The tok/s line on a reply counted the time spent reading the prompt, which on a vision model is mostly reading the image, so a photo answer showed 0.3 tok/s. It's now measured from the first token batch (the generation speed): the same answer shows 6.1 tok/s on the emulator. Text replies change little (`src/hooks/useLLMChat.ts`).
- Re-downloading a damaged model counted its files as already downloaded, so the mobile-data prompt and the storage check were skipped for a multi-GB download. The files being replaced now count toward both (`src/ai/model-manager.ts`, `src/hooks/useModelDownload.ts`, `app/(tabs)/settings.tsx`).
- "Clear chats and memories" deleted a photo that was attached but not sent yet, so sending it failed. Only photos in chats are deleted now (`src/stores/chat-store.ts`).
- A short reply streamed in two quick batches could show a speed like 4000 tok/s. When the reply is too short to time on its own (under 0.3 s after the first batch), the speed uses the whole call (`src/hooks/useLLMChat.ts`).
- Cancel download stopped every running download, including a voice model the mic was fetching. It now stops only the files that screen started (`src/ai/model-manager.ts`, `src/hooks/useModelDownload.ts`).
- "Find Sara in my contacts" and "Search my contacts for Ali" went to the model, which replied that it had no way to search contacts: only "contact …" with a following word and "Ali's number" counted as contact questions. "In my contacts", "from contacts" and "search my contacts" now go to the contacts tool; "I lost my contacts" still doesn't (`wantsContactLookupIntent` in `src/ai/intent-router.ts`, `src/tools/contacts-tool.ts`).
- "Find my note about milk" got a general answer about milk, because only "find note" and "search note" counted as note searches. Once routed, it matched the bare "note" keyword and saved a new note called "Find my note about milk". "Find / search / show / open my (or the) note(s)" now searches notes (`wantsNoteSearchIntent` in `src/ai/intent-router.ts`, `src/tools/notes-tool.ts`, `tests/unit/search-tool-routing.test.ts`). Both found testing this release on the Android emulator.
- Settings' "Download now" size counted the voice model even when it was already on the phone, so it disagreed with the progress card (697 MB vs 624 MB). It now shows only what's missing (`app/(tabs)/settings.tsx`).

### Changed
- Phone store screenshots (`assets/play-store-listing/screenshots/phone/`): seven instead of six, with "Ask about any photo, offline" second so it shows in search results. It's a real answer in airplane mode: a café menu photo, "Which drink is cheapest, and how much is a latte?", "The cheapest drink is the espresso at $2.50. A latte costs $4.20." The model picker shows the image icon and the setup screen shows the new sizes; notes, tier, model and privacy moved to 04–07. Website copies: `photo-chat.webp`, `picker-lite.webp`, `onboarding.webp`.
- Every store and website image of the chat screen is retaken so it shows the image button next to the message box: the phone chat (now Gemma 4 E2B on Standard), the four-tool chat, and the 7- and 10-inch tablet chats (`marketing/video/shots/chat.png`, `tools-chat.png`, `tablet-chat.png`, `tablet7-chat.png`; `website/screenshots/chat.webp`, `tools-chat.webp`, `tablet-chat.webp`).
- Tablet store screenshots (7- and 10-inch): six instead of five, with "Ask about any photo, offline" second. It's a real answer from LFM 2.5 VL 450M on Lite in airplane mode: "What drinks are on this menu, and how much is a latte?", "The menu lists Espresso, Cappuccino, Latte, Chai tea, and Hot chocolate. A latte costs $4.20." The setup and model picker shots are retaken with the image icon and sizes in GB, and the files are renumbered 01–06 (`assets/play-store-listing/screenshots/tablet/`, `marketing/video/shots/tablet*-photo-chat.png`, `tablet*-onboarding.png`, `tablet*-picker-lite.png`, `marketing/tools/stills-jobs.json`). The homepage's "Made for tablets too" block adds the tablet photo shot (`website/screenshots/tablet-photo-chat.webp`, `marketing/tools/web_assets.py`).
- Store screenshot files now start with the device they're for, so they can't be mixed up once uploaded: `phone-01-…` to `phone-07-…`, `tab7-01-…` to `tab7-06-…` and `tab10-01-…` to `tab10-06-…` (`assets/play-store-listing/screenshots/`, `marketing/tools/stills-jobs.json`, `assets/play-store-listing/README.md`, `listing.md`).
- Onboarding: model sizes in GB, one status instead of three, and a line saying models with the image icon can answer about photos (`app/onboarding.tsx`).
- Expo SDK 58 patch updates (`expo` 58.0.26, `expo-calendar` 58.0.8, `expo-dev-client` 58.0.21, `expo-file-system` 58.0.14, `expo-router` 58.0.32, `expo-sqlite` 58.0.18, `babel-preset-expo` 58.0.26), `@tanstack/react-query` 5.108.0, `prettier` 3.10.1, `vitest` and `@vitest/coverage-v8` 5.1.1, and in-range updates of indirect dependencies (`typescript-eslint` 8.73, Babel 7.29.14, Metro 0.87.3). New: `expo-network` 58.0.5. `react-native-blob-util`, which react-native-executorch uses for downloads and chat sessions, is held at 0.25.3 with an `overrides` entry in `package.json`: `npm update` would take it to 1.1.1, a major version executorch 0.11 isn't built against (its own dev dependency is `^0.25.0`).
- Permissions: `expo-image-picker` is configured with the camera off, and `CAMERA`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO` and `READ_MEDIA_VISUAL_USER_SELECTED` are blocked in `app.json`, so the Android manifest declares no photo, media or storage permission (Google Play's photo and video permissions policy). iOS gets an `NSPhotoLibraryUsageDescription`.
- Privacy policy (effective November 17, 2026) and the website privacy page describe attached photos. The website lists the three vision models (`website/index.html`, `website/models.html`).
- New dependencies: `expo-image-picker` 58.0.10, `expo-image-manipulator` 58.0.16.
- App version updated to `0.12.0` in `app.json`. This is a minor release: image input.
- A photo is sent to the model with its own question and the next one ("and the cappuccino?"), then dropped, instead of on every later turn: re-reading it costs most of each reply's time, and unrelated questions drifted toward it (`src/ai/llm-engine.ts`).

### Known issues
- Checked on the emulator (release build, Standard, LFM 2.5 VL 1.6B): the system photo picker opens with no permission prompt, the copy is a 1024 × 537 JPEG, and "What app is this and what does the headline say?" about the website banner got "This is the OfflineMate app. The headline says "Private AI that works offline"…" in 54 s. Gemma 4 E2B multimodal has not been run on a device.
- An interrupted download starts over: Expo's downloader can't resume after a network error, and partial files are deleted at the next start. The card says so, and Wi-Fi is recommended.
- `audit-ci` allowlists GHSA-fc5q-39xc-vjpf (picomatch ReDoS, high). Every picomatch release up to the latest, 4.0.7, is affected; it's used only by build tools (Metro, ESLint, Vitest, Expo config plugins), not the app.
- Held back: ESLint 10, TypeScript 7 and `@types/node` 26 (major versions), and `react-native-reanimated` 4.7.2, `react-native-worklets` 0.13.1, `react-native-gesture-handler` 3.5, `react-native-keyboard-controller` 1.23 (patched in `patches/`) and React 19.3.1, which Expo SDK 58 pins.
- Checked after the package updates on the Android phone and tablet emulators and the iOS 27.2 simulator (release builds): chat, reminders, calendar, weather, alarms, notes, contacts and a photo question with one follow-up. A second follow-up about the same photo no longer sees it, so the model answers from the earlier text replies and can guess wrong ("And a cappuccino?" asked again got $4.20 instead of $3.80); attaching the photo again fixes it.
- On Standard, LFM 2.5 VL 1.6B sometimes starts a general answer with "I don't have a specific tool to provide…" before answering ("…but I can tell you that it is Tokyo."). The prompt doesn't mention tools; it's the model's own habit.
- The demo and use-case videos still show the chat screen without the image button; they weren't re-recorded.

## [0.11.0] - 2026-11-12

Weather, contact lookup, every example on the website checked end to end on the Lite tier, tool replies checked on Standard, and use-case videos.

### Added
- Weather: "What's the current weather in London?", "Will it rain tomorrow in Lahore?" and "london weather" now get real conditions from Open-Meteo, for example "London, United Kingdom: 14°C (58°F), partly cloudy. Feels like 12°C, wind 18 km/h. Today 9–15°C, 20% chance of rain." Web search (DuckDuckGo) only returned page titles and snippets, so the model said it had no weather data. Only the place name is sent (to find it), then its coordinates; device location isn't used. It shares the web search switch, now labelled "Web search and weather" in Settings, and replies show the tool's own sentence on every tier. New `weather.current` tool (`src/tools/weather.ts`, `src/tools/weather-tool.ts`, `tests/unit/weather.test.ts`); weather phrases moved from `search.web` to it (`src/tools/search-tool.ts`, `src/ai/intent-router.ts`, `docs/intent-routing.md`). The privacy policy, the website's privacy page and web search card, and the Settings privacy text name Open-Meteo.
- Privacy policy (`docs/legal/privacy-policy.md`, effective November 13, 2026) rewritten to match the app and the Play Data safety answers: web search and weather are on by default behind one Settings switch; a search query can be the whole typed message (DuckDuckGo); a weather place name can reveal approximate location (Open-Meteo); queries and place names aren't stored off the device; no account, server, selling, ads or profiling; HTTPS; chat history and spoken replies off by default; "remember…" memories kept on the device; how to delete chats (Open chats, Settings → Clear chats and memories), notes and memories; the Google Play rating prompt; a data retention section and a store disclosures section. The website privacy summary and the Settings privacy text say the same.
- Settings: **Clear chats and memories** replaces "Clear current chat". It deletes every chat and every memory saved from "remember…" messages, which deleting a chat left behind and nothing else could remove; the row shows how many memories are saved. Every Settings option (Open Onboarding, Speak responses, Web search and weather, Persist chat history, Clear chats and memories, Rate OfflineMate) has an ⓘ button that explains it (`app/(tabs)/settings.tsx`, `clearAllConversations` in `src/stores/chat-store.ts`, `countImportantMemories`/`clearImportantMemories` in `src/context/long-term-memory.ts`, `tests/unit/clear-data.test.ts`).

### Fixed
- Asking for a contact's number found no one. "What is Ali's phone number?" was passed whole to the phone's contact search as the name, which matches nothing, so the reply was "Found 0 contacts." (always on Lite, and on Standard and Full whenever the planner fell back). The name is now taken out of the question first ("Ali" from "What is Ali's phone number?", "Sara Khan" from "find contact Sara Khan", "mom" from "call mom"), and if the full name finds no one, each word is tried ("Sara Malik" still finds "Sara Ahmed") (`extractContactName` in `src/tools/contact-query.ts`, `src/tools/contacts-tool.ts`, `tests/unit/contacts-tool.test.ts`).
- The contact reply now includes the phone numbers. The tool read them and then dropped them, so it could only list names. Each contact is listed as "Ali Khan: +92 300 1234567", the same number saved twice in different formats is shown once, and a contact without a number says "no phone number saved". Standard and Full get the numbers too, in the tool output the model answers from (`src/tools/contacts-tool.ts`, `src/ai/tool-reply.ts`, `tests/unit/tool-reply.test.ts`).
- "What's Ali's number?" went to the model, which could make up a number, because only "phone …" and "contact …" phrases counted as contact questions. A possessive before "number" ("Ali's number", "Sara's mobile number") and "contact number" now go to the contacts tool; "the number of planets" still goes to the model (`wantsContactLookupIntent` in `src/ai/intent-router.ts`, `tests/unit/intent-router.test.ts`, `docs/intent-routing.md`).
- "What did I save about the dentist?" (a website example) got a made-up answer on Lite. Lite skips semantic note search, so the 135M model got no notes and copied the previous reply ("Reminder set for in 20 minutes: saved about the dentist."). Lite now searches the notes by keyword ("dentist") and replies without the model: `1 saved note mentions "dentist":` with the matching notes, or that no note mentions it. Questions with no keyword ("What did I save?") still go to the model. Standard and Full keep semantic search (`src/context/keyword-notes.ts`, `src/hooks/useLLMChat.ts`, `tests/unit/keyword-notes.test.ts`).
- `notes.search` looked for the whole sentence ("find my note about the dentist") as one piece of text, so it found nothing. It now uses the same keyword search, with notes matching more words first, and says "Found 1 note." instead of "Found 1 notes." (`src/tools/notes-tool.ts`).
- Reminders replied "Reminder set for in 20 minutes: stretch." (a website example). Relative times now read "Reminder set to go off in 20 minutes: stretch."; "Reminder set for tomorrow at 9:00 AM" is unchanged (`src/tools/reminders-tool.ts`, `tests/unit/tool-wording.test.ts`).
- "What's on my calendar tomorrow?" with nothing on it replied "No events found for What's on my calendar tomorrow?." It now says "No events tomorrow." Events are listed as "1 event tomorrow:" and "- Dentist appointment, 3:00 PM – 4:00 PM" instead of "Found 1 event(s):" and full date-and-time stamps; the day is added only for ranges longer than a day (`describeDateRange`, `describeEvent` in `src/tools/calendar-tool.ts`).
- Permission messages: "Notification permission denied." didn't say how to fix it, and the calendar's "Please enable it in Settings" could be read as OfflineMate's Settings tab, which has no permission switches. Calendar, contacts and notifications now all say "… access is off for OfflineMate. To turn it on, open your phone's Settings app (not the Settings tab in OfflineMate), go to Apps > OfflineMate and allow …, then ask again." The web search message, which does mean the app's tab, now says "OfflineMate's Settings tab" (`src/tools/permission-message.ts`, `src/tools/search-tool.ts`).
- No match now replies `No contact named "Bilal" found.` instead of "Found 0 contacts.", a question with no name ("show my contacts") asks whose number to look up, and a denied Contacts permission says where to allow it. These don't count as clean replies for the review prompt.
- On Standard and Full, replies to on-device tools were written by the model, which could drop the facts: Gemma 4 E2B answered "What's Ali's number?" with "Searching for Ali's contact now." and no number. Contacts, notes, alarms, reminders and calendar replies now show the tool's own sentences on every tier, as Lite already did; only web search results still go to the model to summarize (`usesDeterministicToolReplies` in `src/ai/tool-reply.ts`, `src/hooks/useLLMChat.ts`, `tests/unit/tool-reply.test.ts`).
- "Add dentist appointment tomorrow at 3pm" (found testing on iOS) wasn't recognised as a calendar request, so the model echoed it back. Everyday phrasings (add, book, schedule, put or make + appointment, meeting, event, lunch, dinner or interview + a day or time) now go to `calendar.createEvent`, and the title is taken from your words ("Dentist appointment", not "Add dentist appointment" or the planner's "The bank"). The time cue keeps "How do I add an event listener?" a normal question (`wantsCalendarAddIntent` in `src/ai/intent-router.ts`, a `matches` hook in `src/tools/tool-registry.ts`, `src/tools/calendar-tool.ts`, `tests/unit/calendar-add.test.ts`).
- New events were confirmed as "Created "lunch with Sara" on 11/13/2026 at 1:00:00 PM." They now read "Added "Lunch with Sara" tomorrow, 1:00 PM – 2:00 PM." An end time the planner set equal to the start falls back to an hour, so the event no longer shows without an end.
- On Standard, "Book a meeting with the bank on Friday at 10am" added the event twice: Gemma planned two `calendar.createEvent` steps. A plan now runs each write tool (calendar, notes, alarms, reminders) once (`dropRepeatedWriteSteps`, applied in `src/ai/agent-planner.ts`).
- Checked on the iOS simulator (iPhone 18 Pro, iOS 27.2, Lite): contact numbers, weather with and without a city, today's date, saving and finding a note, adding and reading calendar events, a reminder and an alarm.
- Turning off "Persist chat history" promised to clear saved chats but only cleared the open one. It now deletes all of them.

### Changed
- Website: a "One chat, four tools" block under the feature cards shows one real Lite chat that sets a reminder, reads tomorrow's calendar, saves a note and finds a saved note, next to the four prompts it shows. The screenshot is device-framed like the gallery (`website/screenshots/tools-chat.webp`, 25 KB) and listed in the app's structured data. The notes card now says Lite matches keywords in your notes instead of "skips retrieval" (`website/index.html`, `website/styles.css`, `tests/unit/website-content.test.ts`).
- Website: a plain-English note under the home page's tier cards (`.tier-note` in `website/styles.css`) and a paragraph in "What the sizes mean" on `website/models.html`. Both explain why ~1 GB models like Llama 3.2 1B and SmolLM2 1.7B are in Standard rather than Lite: the parameter count and phone RAM decide the tier, not the download size.
- Marketing: the new shot and frame (`marketing/video/shots/tools-chat.png`, a `frame-tools-chat` job in `marketing/tools/stills-jobs.json`, `tools-chat` in `web_assets.py`), with how it was captured in `marketing/README.md`. `stills.mjs` takes an optional `PW_EXECUTABLE` for a Chrome or Chromium binary when the playwright package's own browser isn't downloaded.
- App version updated to `0.11.0` in `app.json`. This is a minor release: the weather tool, plus contact lookup and tool reply fixes.
- Use-case videos (`marketing/out/usecases/`): seven 14–18 s shorts (alarm, save a note, find a note, calendar, contacts, "What is RAG?", and weather) in vertical and square, a 92 s compilation (16:9, square and vertical), a 16 s flashy reel, a captions file for each, and thumbnails and covers. Recorded on the emulator's release build, Standard tier (Gemma 4 E2B), with airplane mode on (weather online, so it's a short only). New tooling: `video/usecases.html`, `video/thumb.html`, `tools/uc-record.sh`, `tools/uc_timelines.py`, `tools/uc_screen.py`, `tools/uc_audio.py`, `tools/render-uc.mjs`, `tools/uc-build.sh` and `tools/uc-thumbs.json`; `stills.mjs` jobs can name their page. See `marketing/README.md`.
- Expo patch updates so `expo-doctor` passes in CI: `expo` 58.0.25, `expo-calendar` 58.0.7, `expo-contacts` 58.0.11, `expo-dev-client` 58.0.20, `expo-sqlite` 58.0.17.
- Website: a **Settings explained** page (`website/settings.html`) describes every option in the Settings tab, with the same wording as the in-app info buttons, plus the model tiers and the privacy panel. It's linked from the home page's Settings screenshot, the footer and the privacy page, and listed in `sitemap.xml` (`tests/unit/website-content.test.ts` checks it covers every option).
- New Settings screenshots for phone, 10-inch and 7-inch tablets (`marketing/video/shots/settings.png`, `tablet-settings.png`, `tablet7-settings.png`): the website's `settings.webp` and new `tablet-settings.webp`, the Play phone image `06-privacy.png`, and new Play tablet images `tablet7/05-privacy.png` and `tablet10/05-privacy.png` (`marketing/tools/stills-jobs.json`, `web_assets.py`).

### Known issues
- Contacts are found by name only, not by nickname, company or number, and at most 5 are listed.
- Lite's note search matches words, not meaning: "What did I save about my teeth?" won't find a note that only says "dentist". Standard and Full search by meaning.
- "Search for population of Tokyo" on Lite lists the result titles (one has the number) rather than a one-line answer.
- Carried over from 0.10.0: the review sheet never appears in sideloaded builds; the Google Play listing isn't public yet, so "Rate OfflineMate" opens a "not found" page until it goes live; iOS has only been run on the simulator.

## [0.10.0] - 2026-11-11

Ratings: OfflineMate now asks for a Google Play rating at a good moment, and Settings has a "Rate OfflineMate" row.

### Added
- In-app review prompt. After a reply that went cleanly, the app may show Google Play's own rating sheet (Apple's on iOS), inside the app. It's shown only when all of these hold: at least 3 days since the app was first opened, at least 5 clean replies, not in a version where it was already shown, at least 90 days since the last time, and at most 3 times ever. A reply counts as clean only if nothing went wrong: no error, no failed, timed-out or missing tool (such as a denied permission or a web search that failed or found nothing), no planner timeout, no switch to a smaller tier, no "could not generate a reply" fallback, and you didn't tap Stop. Every tool call goes through one helper that records a failure, so new tool paths are covered automatically. The sheet waits 1.5 s after the reply appears, and isn't shown if the app is in the background or busy with another message by then. The platforms never tell an app whether the sheet appeared or what rating was given, so the app can't stop after a 4 or 5 star rating; instead it stops for good once you tap "Rate OfflineMate" in Settings and the store opens (if it can't open, prompts stay on), and Play and the App Store also limit how often the sheet appears. The app doesn't ask "Do you like OfflineMate?" first, which Play's policy forbids. Replies that finish before the saved counters have loaded on a cold start still count. The counters stay on the device in secure storage and nothing is sent anywhere (new dependency `expo-store-review`, `src/utils/review-prompt.ts`, `src/stores/review-store.ts`, `src/hooks/useLLMChat.ts`, `tests/unit/review-prompt.test.ts`, `tests/unit/review-store.test.ts`).
- Settings → "Rate OfflineMate" opens the app's Google Play page. The URL comes from the new `android.playStoreUrl` in `app.json`. The row is hidden on iOS until the app has an App Store listing (`app/(tabs)/settings.tsx`).
- Release builds include native debug symbols (`debugSymbolLevel 'SYMBOL_TABLE'`), so crashes in native code (ExecuTorch, whisper, Hermes) show function names in Play Console's Android vitals instead of bare addresses. The symbols go into the app bundle's metadata, which Play reads on upload; the libraries installed on phones stay stripped. APK builds write `app/build/outputs/native-debug-symbols/release/native-debug-symbols.zip`. It only skips when the release block already sets a level. It's a config plugin because `android/` is generated by prebuild (`plugins/with-native-debug-symbols.js`, `app.json`).

### Fixed
- Alarms for a relative time ("set an alarm for 2min", "in 5 minutes") rang up to a minute early. The time was cut to the whole minute, so "2min" sent at 00:12:51 became 00:14, about 1 minute away; iOS even replied "Alarm set to ring in 1 minute". On iOS the alarm now rings at the exact moment (AlarmKit takes seconds), and the reply says "in 2 minutes". Android's Clock app takes only hour and minute, so it's now rounded up to the next minute (00:15) and is never early, at most a minute late. The relative time in the message wins over hour and minutes guessed by the assistant (`exact` on `AlarmTime` in `src/tools/alarm-parser.ts`, `src/tools/alarm-tool.ts`, `tests/unit/alarm-parser.test.ts`, `tests/unit/alarm-tool-platform.test.ts`).
- "What is today’s date?" typed on an iPhone got a model reply (on Lite, often a copy of the previous answer) instead of the date. iPhone keyboards type a curly apostrophe (’). The router straightened it and saw a date question, but the code that writes the date reply didn't, so it found no date phrase and handed the message to the model. Both date replies (chat and web search) now clean the text the same way as the router, so "today’s date" and "what’s the time" work with either apostrophe. Android too, with keyboards that type curly apostrophes. Chat's date reply moved to its own file (`normalizeIntentInput` in `src/ai/intent-router.ts`, `src/utils/local-datetime.ts`, `src/hooks/useLLMChat.ts`, `src/tools/web-search-pipeline.ts`, `tests/unit/local-datetime.test.ts`).

### Changed
- Play Store phone screenshots: "More than chat" (the tools) is now third instead of fifth, since only the first three show in search results. The tier and model setup screens moved to fourth and fifth. The images are unchanged; only the file numbers moved (`03-built-in-tools.png`, `04-pick-a-tier.png`, `05-choose-a-model.png` in `assets/play-store-listing/screenshots/phone/`, `marketing/tools/stills-jobs.json`, `assets/play-store-listing/README.md`). Tablet screenshots are unchanged.
- The Play listing README records the promo video's YouTube link (https://youtu.be/_3OGRtLmc1U) for Play Console's video field.
- App version updated to `0.10.0` in `app.json`. This is a minor release: the review prompt.

### Known issues
- Google's review sheet never appears in sideloaded builds, including a locally built release APK. It can only be checked from a Play testing track or internal app sharing, and even then Google may choose not to show it.
- Some prebuilt native libraries ship already stripped, so their crashes still show addresses even with debug symbols on.
- Carried over from 0.9.0: the Google Play listing isn't public yet, so "Rate OfflineMate" and the website's Play links open a "not found" page until it goes live. The `allowScripts` approval is pinned to `react-native-executorch@0.11.0`. iOS has only been run on the simulator. `npx expo-doctor` crashes on this Windows machine but runs in CI.

## [0.9.0] - 2026-11-11

iOS release: the app now builds, launches and runs on iPhone, and can set real alarms there.

### Added
- Alarms on iPhone (iOS 26 and newer). "Set an alarm for 7am" schedules a system alarm with Apple's AlarmKit. It rings even in silent mode or Focus and shows on the Lock Screen with a Stop button. The first alarm asks for permission. If alarms are turned off, the reply says where to turn them on (the iPhone Settings app, not OfflineMate's Settings tab: Apps > OfflineMate > Alarms) and offers a reminder instead. On iOS 17–25, where AlarmKit doesn't exist, the reply suggests a reminder instead. Alarms are one-time, as on Android, and ring on the day you asked for: a date more than a week out ("November 20 at 7am") keeps that date, a weekday alarm set on a Friday evening rings on Monday, and "tomorrow at 9pm" stays tomorrow even when the assistant passes the time separately. If the permission check itself fails, the reply says so instead of sending you to Settings. The reply says when the alarm rings ("Alarm set for tomorrow at 7:00 AM: go running", "Alarm set to ring in 5 minutes: stretch"). It's a small local Expo module (`modules/alarmkit/`), so the app keeps its iOS 17.0 minimum (the AlarmKit packages on npm require iOS 26.1). JavaScript loads it with `requireOptionalNativeModule`, so Android and older iPhones never touch it (`src/native/ios-alarms.ts`, `src/tools/alarm-tool.ts`, `nextAlarmDate` in `src/tools/alarm-parser.ts`, `NSAlarmKitUsageDescription` in `app.json`, `tests/unit/alarm-tool-platform.test.ts`, `tests/unit/alarm-parser.test.ts`).

### Fixed
- Replies that didn't run the model (Lite tool replies such as "Reminder set…", fallbacks) no longer show "(n/a tok/s)". The speed line now appears only when there's a real measured speed (`hasMeasuredTokPerSec` in `src/utils/tok-per-sec.ts`, `src/components/ChatBubble.tsx`, `tests/unit/tok-per-sec.test.ts`). Android too.
- One-time alarms no longer say "(Recurring not yet supported…)". "Set an alarm for 7am" after 7am, or "tomorrow at 8", resolve to a single day, which was mistaken for a repeating alarm. Only "every …", "daily" and weekday phrases count as recurring now (`recurring` on `AlarmTime`). Android too.
- Alarm labels: "set an alarm for 7am" no longer uses "7am" as the label (it's now "Alarm"), and "set an alarm in 5 minutes to stretch" now picks up "stretch" (`extractAlarmMessage`). Android too.
- iOS: the app quit as soon as Chat opened (after "Continue to Chat", or on any launch after setup) with `Cannot find native module 'ExpoAlarm'`. `expo-alarm` is Android-only and looks up its native module when it is imported, and the alarm tool imported it at the top of the file, so loading the tool registry crashed iOS. The alarm tool now loads `expo-alarm` only when an alarm is set on Android (`src/tools/alarm-tool.ts`).
- iOS builds: `pod install` failed because `react-native-executorch` needs iOS 17.0 and the generated project targeted 16.4. The minimum is now set to 17.0 through `expo-build-properties` in `app.json`, so `expo prebuild` and EAS iOS builds get it automatically (new dependency `expo-build-properties`).
- A clean `npm ci` with npm 11 skipped `react-native-executorch`'s install script, so the ExecuTorch native libraries (iOS xcframeworks and Android `.so` files) were never downloaded. The script is now approved in `package.json` (`allowScripts`).
- The app no longer spins forever on launch when the saved settings can't be read. If the Keychain or Keystore read fails (seen on iOS as `-34018`, missing keychain entitlement), the app starts with default settings and logs a warning instead of waiting for hydration that never finishes. For the rest of that session it doesn't save settings, so the defaults can never overwrite the real saved ones (for example after a background launch while the phone is locked, when the Keychain can't be read); they load normally on the next launch. Failed saves are logged rather than thrown (`src/stores/settings-store.ts`, `tests/unit/settings-store.test.ts`).
- Setup screen on iOS: the "Setup" header was black on the dark screen and drawn over "Welcome to OfflineMate", and the status bar text was dark on dark. The header now has the screen's dark background with light text, the content starts right below it (the screen no longer adds its own top safe-area padding under the header), and the setup screen uses light status bar text. iOS sets the status bar per screen (`UIViewControllerBasedStatusBarAppearance`), so the style is now a `statusBarStyle` screen option: light for setup, dark for the tab screens, which keep their white header (`app/_layout.tsx`, `app/onboarding.tsx`). This also gives the Android setup screen a dark header.
- Website: Search Console flagged the demo video's structured data ("Datetime property 'uploadDate' is missing a time zone", "Invalid datetime value for 'uploadDate'"). `uploadDate` was a bare date (`2026-11-09`); it's now a date and time with a time zone (`2026-11-09T12:00:00+05:00`), and a test checks the format (`website/index.html`, `tests/unit/website-content.test.ts`). After deploying, use "Validate fix" in Search Console.

### Changed
- Website: "iOS coming soon". The home page headline now says "your phone" instead of "your Android phone", the hero has an "iOS coming soon" badge and says "Available now for Android 7.0 and later… iOS is coming soon", the iPhone FAQ answers "Coming soon", and the meta description, site description and footer say the same. Page titles stay "for Android", since that's what you can install today. The README has an "iOS coming soon" badge, the same availability line, a Google Play link and the social links.
- Website: the footer lives in one file, `website/_partials/footer.html`, instead of a copy in every page. Pages have an `<!--#include footer.html -->` marker that `npm run website:build` fills in (`scripts/website-includes.mjs`, `scripts/minify-website.mjs`). Privacy and Terms now get the same full footer as the other pages instead of a shorter "Legal" one. A test checks that every page uses the shared footer.
- Website: every page footer has a "Follow us" column with Rhyme Solutions on YouTube, LinkedIn and Instagram, each with a small inline SVG icon that takes the link color (`.footer-social` in `website/styles.css`). The install section, the "Run AI offline on Android" setup step and the home and guide footers link to the Google Play listing (`com.offlinemate.app`), with "Build it from source" kept as a second option. The app's structured data gets a Play `downloadUrl`/`installUrl`, and Rhyme Solutions gets the social profiles as `sameAs` (`website/*.html`, `tests/unit/website-content.test.ts`).
- Expo patch updates within SDK 58: `expo` 58.0.24, `expo-asset` 58.0.21, `expo-constants` 58.0.16, `expo-dev-client` 58.0.19, `expo-font` 58.0.12, `expo-keep-awake` 58.0.4, `expo-linking` 58.0.17, `expo-notifications` 58.1.9, `expo-router` 58.0.31, `expo-secure-store` 58.0.3, `expo-speech` 58.0.4, `expo-splash-screen` 58.0.14, `expo-sqlite` 58.0.16, `expo-status-bar` 58.0.5. CI's `expo-doctor` and `expo install --check` report everything matches SDK 58. `react-native-gesture-handler`, `react-native-keyboard-controller` and `react-native-worklets` stay at the versions SDK 58 pins.
- `BUILDING.md` has a new "Local iOS Simulator Build (macOS)" section.
- Vitest ignores `.claude/`, so leftover Claude Code worktrees (`.claude/worktrees/`, each with its own `tests/`) no longer make `npm run validate` and the pre-commit hook fail (`vitest.config.ts`).
- `.gitignore` ignores only the root `/ios/` folder (generated by prebuild), so a local module's `modules/*/ios/` sources are tracked.
- App version updated to `0.9.0` in `app.json`. This is a minor release: iOS support and alarms on iPhone.

### Known issues
- The `allowScripts` approval is pinned to `react-native-executorch@0.11.0`. After upgrading the package, approve the new version (`npx npm@11 install-scripts approve react-native-executorch`), or `npm ci` will skip the native-library download again. A unit test (`tests/unit/install-scripts.test.ts`) fails with that command if the approval and the installed version don't match.
- iOS has only been run on the simulator (iPhone 18 Pro, iOS 27.2): setup, Lite model download, Chat, a reminder and an alarm. Voice, notes search and on-device performance haven't been tested on iOS, and a real iPhone needs an Apple Developer signing team.
- The Google Play listing isn't public yet (expected within days), so the website's Play links return "not found" until it goes live.
- On this Windows machine, `npx expo-doctor` crashes on startup with a missing-module error inside the tool; it runs fine in CI.
- iPhone alarms have no snooze button. Snooze in AlarmKit needs a Live Activity widget extension, which the app doesn't have yet. Alarms are not listed or cancelable inside OfflineMate.
- On the simulator, setup recommends the Full tier because it reports the Mac's RAM.
- In the iOS 27 simulator, the alarm permission prompt never appears: AlarmKit reports "denied" straight away (an Apple simulator bug, Apple developer forums thread 849449). Turning on Alarms for OfflineMate in the simulator's Settings works. The prompt still needs checking on a real iPhone.

## [0.8.1] - 2026-11-10

### Fixed
- Play's warning "Remove resizability and orientation restrictions": the manifest no longer locks the app to portrait (`"orientation": "default"` in `app.json`). Phones are still kept in portrait, now at runtime. When the screen's shortest side is under 600 dp the app locks to portrait, and tablets and unfolded foldables rotate freely. It uses the physical screen size, so split screen on a tablet doesn't lock it, and it checks again when a foldable is unfolded (`src/hooks/usePhonePortraitLock.ts`, `src/utils/layout.ts`, `app/_layout.tsx`, new dependency `expo-screen-orientation`).
- Play's warning "Recompile your app with 16 KB native library alignment": the only unaligned library was `vec.so`, the sqlite-vec extension bundled with `expo-sqlite` 58.0.15 (the latest). It is no longer included (`withSQLiteVecExtension` removed from `app.json`). Notes search keeps working: every embedding was already saved to a plain table, and the app compares them in JavaScript when sqlite-vec isn't loaded, which is fast enough for a personal notes collection (`src/context/vector-store.ts`, unchanged). All other native libraries (ExecuTorch, Whisper, OpenCV and the rest) were already 16 KB-aligned.

### Changed
- Unit tests for the portrait lock (`tests/unit/layout.test.ts`).
- App version updated to `0.8.1` in `app.json`. This is a patch release with Play compatibility fixes only.

### Known issues
- Play's warning "Your app uses deprecated APIs or parameters for edge-to-edge" remains. The deprecated calls (`Window.setStatusBarColor` / `setNavigationBarColor` and the matching theme attributes) are in React Native, the Expo Android template, `react-native-screens` and `react-native-keyboard-controller`, not in OfflineMate's code. It should clear with later Expo SDK and library updates.
- Devices that ran an earlier version keep an unused `vectors_idx` table (sqlite-vec) in their database. It is no longer read or written. If sqlite-vec is turned back on once `expo-sqlite` ships an aligned `vec.so`, rebuild that index from the `vectors` table first, since it misses notes changed in the meantime.
- On a 4 GB tablet, setup says "Recommended tier: Lite (3-4 GB RAM)" but highlights Standard (`app/onboarding.tsx`).

## [0.8.0] - 2026-11-10

### Added
- Tablet layout. Screens 600 dp and wider (tablets, large foldables, split-screen windows) get a navigation rail on the left instead of the bottom tab bar, and their content is capped at a readable width instead of stretching across the screen. Phones (under 600 dp) keep the same layout as before (`app/(tabs)/_layout.tsx`).
- Chat on a wide screen (840 dp and up, such as a tablet in landscape) shows two panes: your chats on the left, the conversation on the right. Tap a chat to open it, or start one with + New chat. The message column and composer are capped at 760 dp and centred. Between 600 and 840 dp (a tablet in portrait), chat stays one column with the same width cap (`app/(tabs)/chat.tsx`, `src/components/ChatListPane.tsx`, `src/components/ChatComposer.tsx`).
- Notes on a wide screen show the list beside the selected note. The newest note opens first, and a note you save opens right away (`app/(tabs)/notes.tsx`).
- One shared breakpoint helper, so screens don't compare widths themselves: compact under 600 dp, medium 600–839 dp, expanded 840 dp and up, plus the max widths for reading content, chat and dialogs (`src/utils/layout.ts`, `src/hooks/useBreakpoint.ts`, `tests/unit/layout.test.ts`).
- New 7-inch (1920×1200) and 10-inch (2560×1600) Play Store tablet screenshots of the tablet layout. The 7-inch set is captured at a 7-inch tablet's size (960×600 dp) and the 10-inch set on the Pixel Tablet emulator (1280×800 dp) (`assets/play-store-listing/screenshots/tablet/`, `marketing/video/shots/tablet*-*.png`, `marketing/tools/stills-jobs.json`).

- The homepage shows the tablet layout. The hero's app icon is replaced by a framed tablet (chat) with a phone (notes) in front. A "Made for tablets too" block under the phone gallery shows chat, notes and the model picker on a tablet. The framed tablet images are WebP (33–45 KB each), rendered by a new `tablet-device` layout in `marketing/video/stills.html` (`website/index.html`, `website/styles.css`, `website/screenshots/tablet-*.webp`, `marketing/tools/web_assets.py`, `marketing/tools/stills-jobs.json`).
- An "at a glance" row under the hero: on device, 12 models, 3 tiers, no account (`website/index.html`, `website/styles.css`).

### Changed
- The homepage hero fades in, which is turned off for people who prefer reduced motion. The availability note now says it runs on phones and tablets (`website/index.html`, `website/styles.css`).
- Settings, the model picker, Tools, Chats and setup are capped at a readable width on wide screens. The model picker is a centred dialog up to 560 dp wide (`app/(tabs)/settings.tsx`, `app/(tabs)/tools.tsx`, `app/(tabs)/chats.tsx`, `app/onboarding.tsx`).
- App version updated to `0.8.0` in `app.json`. This is a minor release: a new tablet layout.

### Known issues
- The app stays portrait-only on phones (`"orientation": "portrait"`). Tablets rotate because Android 16 ignores orientation locks on large screens. On older Android versions a tablet stays in portrait and gets the one-column tablet layout.
- On a 4 GB tablet, setup says "Recommended tier: Lite (3-4 GB RAM)" but highlights Standard (`app/onboarding.tsx`).
- The demo video still has no reminder flow. It was recorded before the 0.7.1 and 0.7.2 fixes.

## [0.7.2] - 2026-11-10

### Fixed
- On the Lite tier, replies after a tool call are now the tool's own sentences, such as "Reminder set for tomorrow at 9:00 AM: call the bank." or "Note saved: pack passport". Lite models (SmolLM2 135M/360M, LFM 2.5 350M) are too small to write a reply from tool output: they repeated the tool name or payload JSON, or LFM 2.5 350M printed `<|endoftext|>` and then unrelated text. 0.7.1 only caught the tool-name and payload echoes. Lite now skips the model for tool replies and drops the tool name, payload JSON and plan line. Note and contact searches list the titles or names they found, and web search results (for example "pharmacy near Lahore") are shown as the list the search returned. Standard and Full still word their own replies (`src/ai/tool-reply.ts`, `src/hooks/useLLMChat.ts`).
- "Remind me today at 5 PM" after 5 PM now says that time has already passed today. Before, it said it couldn't figure out when (`src/tools/reminder-parser.ts`, `src/tools/reminders-tool.ts`).

### Changed
- Unit tests for reminder times: "tomorrow at 9 AM" (09:00 tomorrow, not 24 hours from now), "today at 5 PM", "in 2 hours", a clock time that already passed today (moves to tomorrow), and "today at 5 PM" after 5 PM (not scheduled) (`tests/unit/reminder-parser.test.ts`).
- Unit tests for the Lite tool replies (`tests/unit/tool-reply.test.ts`).
- Checked every model size in `src/ai/model-registry.ts` against the file the app downloads (Content-Length from Hugging Face). All 12 match, so the picker, onboarding and website sizes from 0.7.1 stay. Gemma 4 E2B is 2451 MB because Android downloads its Vulkan export (2.57 GB). The XNNPACK export, which some Hugging Face pages list first, is larger.
- App version updated to `0.7.2` in `app.json`. This is a patch release with bug fixes only.

### Known issues
- OfflineMate has no directions or maps tool. A directions request with "near me" or a place goes to web search, and other directions questions are answered by the model without a tool.
- The demo video still has no reminder flow. It was recorded before these fixes.
- On a tablet, the app shows the phone layout stretched to full width (no tablet layout yet).
- On a 4 GB tablet, setup says "Recommended tier: Lite (3-4 GB RAM)" but highlights Standard (`app/onboarding.tsx`).

## [0.7.1] - 2026-11-09

### Fixed
- "Remind me tomorrow at 9 AM to call the bank" now fires tomorrow at 9:00 AM. Before, any "tomorrow" or "tonight" meant a flat 24 or 12 hours from now, and the clock time was ignored. Reminders with a clock time ("at 9", "9:30pm", "21:30", "noon") are read with chrono first. The reminder text is now just the action ("call the bank") when the time comes before it, and "call 911" keeps its number (`src/tools/reminder-parser.ts`).
- Reminder and note confirmations are full sentences, such as "Reminder set for tomorrow at 9:00 AM: call the bank." and "Note saved: pack passport and charger". When the model repeats the tool name or its payload instead of replying (small models such as LFM 2.5 350M do this), chat shows that sentence. Before, the reply was "reminders.set" or a raw payload (`src/tools/reminders-tool.ts`, `src/tools/notes-tool.ts`, `src/ai/output-guard.ts`, `src/hooks/useLLMChat.ts`).
- The download sizes in the model picker, onboarding and website now match the files on Hugging Face. Eight were too low, for example SmolLM2 360M (200 MB, really 1.3 GB), Gemma 4 E2B (900 MB, really 2.5 GB) and Qwen 3.5 2B (1.1 GB, really 2.9 GB). The tier totals are now about 430 MB–1.3 GB for Lite, 2.5 GB for Standard and 2.6 GB for Full (`src/ai/model-registry.ts`, `website/index.html`, `website/models.html`, `website/run-ai-offline-on-android.html`, `docs/architecture/model-comparison-and-selection.md`).

### Added
- A 35-second demo video recorded on the release build: airplane mode on, an on-device answer at real speed, a private note, and the model tiers. It comes in vertical 1080×1920, 16:9 1920×1080 and square 1080×1080, with an `.srt` caption file. Captions and voiceover say only what the recording shows (`marketing/out/`).
- `marketing/`: the scripts and templates that make the video and stills. The emulator is driven over adb, the screen track is cut at real speed, the voiceover is Kokoro `af_heart` (Apache-2.0), and the music is generated in code (`marketing/README.md`).
- New Play Store graphics: six 1080×1920 phone screenshots with headlines, a new 1024×500 feature graphic, and a README that maps each file to its Play Console slot (`assets/play-store-listing/`).

### Changed
- The homepage's preview section now has the demo video. It is self-hosted (WebM and H.264 MP4 with faststart), muted, loads nothing until played, and has a poster and WebVTT captions. The five old JPEG screenshots are replaced by six framed WebP screens (`website/index.html`, `website/styles.css`, `website/media/`, `website/screenshots/`).
- `og-image.jpg` now shows the app's chat and notes screens beside the logo, and the alt text on every page describes it (`website/*.html`).
- `scripts/generate-website-images.cjs` no longer writes `og-image.jpg`, since `marketing/` makes it now.
- `scripts/generate-play-store-assets.ps1` makes the 512×512 icon from the inner tile (Play adds its own rounded mask) and writes its plain feature graphic only with `-FeatureGraphic`.
- App version updated to `0.7.1` in `app.json`. This is a patch release: bug fixes plus the website and listing assets.

### Known issues
- The demo video was recorded before the reminder and size fixes, so it shows chat, notes and tiers but no reminder flow.
- On a tablet (Pixel Tablet emulator, 2560×1600), the app shows the phone layout stretched to full width, with small text and long lines. There is no tablet layout yet, and the tablet screenshots show that stretched layout.
- On a 4 GB tablet, setup says "Recommended tier: Lite (3-4 GB RAM)" but highlights Standard (`app/onboarding.tsx`).

## [0.7.0] - 2026-11-09

### Fixed
- Model downloads now go to a temporary `.part` file and are moved into place only after they finish. Before, an interrupted or still-running download left a short file that counted as downloaded, so chat failed with ExecuTorch error 35 ("File size is too small") and Settings offered no way to fetch it again. Two screens asking for the same file now share one download, and each of them sees its progress (`src/ai/model-manager.ts`).
- Downloads that fail with HTTP 408, 429 or a 5xx error are retried like network errors. A 404 still fails at once (`src/ai/model-manager.ts`).
- Partial `.part` files left by a download that was interrupted (for example, the app was closed) are deleted when the app starts (`src/ai/model-manager.ts`, `app/_layout.tsx`).
- When a model fails to load, the app compares its file with the server's size. A shorter file, such as one truncated by an earlier version, is deleted and the error asks you to download it again, so Settings no longer shows it as Downloaded. This needs a connection; offline, use Re-download (`src/ai/model-manager.ts`, `src/hooks/useLLMChat.ts`).
- When the model files are not downloaded at all, chat now says so instead of "Could not load the model" (`src/hooks/useLLMChat.ts`).
- Replies no longer show two speed lines such as "(18.3 tok/s)" and "(10.1 tok/s)". The speed was saved inside each reply's text, so it went back to the model with the chat history and small models copied it. The speed is now stored separately and shown under the reply, so it is not sent to the model, read aloud, or copied with the Copy button. Speed lines in chats saved by earlier versions are removed before history is sent to the model (`src/utils/tok-per-sec.ts`, `src/types/assistant.ts`, `src/components/ChatBubble.tsx`, `src/ai/prompt-builder.ts`, `src/hooks/useLLMChat.ts`, `app/(tabs)/chat.tsx`).
- The model picker in Settings has a "Re-download (fixes a damaged download)" action for models that show Downloaded but will not load, such as a truncated file from an earlier version (`app/(tabs)/settings.tsx`, `src/ai/model-manager.ts`).

### Changed
- When chat cannot load a model, the error card now has an "Open <Tier> in Settings" button. It opens Settings with that tier's model picker already open, every time you tap it, so you can pick a model and tap Download now. The error text gives the same steps instead of pointing to Onboarding (`src/hooks/useLLMChat.ts`, `src/components/ErrorBanner.tsx`, `src/stores/chat-store.ts`, `app/(tabs)/chat.tsx`, `app/(tabs)/settings.tsx`).
- Download now in Settings also fetches the tier's Whisper voice model. Before, it was only fetched when "Speak responses (TTS)" was on, which is off by default, so the mic had no model. If only the voice download fails, the chat model still counts as downloaded and the mic offers to retry (`app/(tabs)/settings.tsx`).
- SmolLM2 135M (Lite default) now shows its real download size, 535 MB instead of 90 MB, in the app and on the website (`src/ai/model-registry.ts`, `website/index.html`, `website/models.html`).
- Bumped `@tanstack/react-query` to 5.107.1, `zustand` to 5.1.0 and `react-native-nitro-modules` to 0.37.2 (`package.json`, `package-lock.json`).
- Upgraded `vitest` and `@vitest/coverage-v8` from 4 to 5.1.0. Its Node requirement is met now that the project pins Node 24 (`package.json`, `package-lock.json`).
- App version updated to `0.7.0` in `app.json`. This is a minor release because it adds user-facing features (the error-card button, Re-download, and Whisper downloaded with the chat model).

### Known issues
- **Held back:** TypeScript 7 (`typescript-eslint` 8.72 supports TypeScript `<6.1`), ESLint 10 (`eslint-plugin-import`, used by `eslint-config-expo`, supports ESLint up to 9), and `@types/node` 26 (the project runs on Node 24).
- Expo-managed packages (`react`, `react-native-gesture-handler`, `react-native-keyboard-controller`, `react-native-worklets` and the `expo-*` modules) stay at the versions Expo SDK 58 expects, although newer releases exist.
- The 16 KB page-size warning for expo-sqlite's prebuilt `vec.so` is still open.

## [0.6.2] - 2026-11-05

### Changed
- Removed the `WRITE_CONTACTS` and `SYSTEM_ALERT_WINDOW` Android permissions with `android.blockedPermissions`. The `expo-contacts` plugin added `WRITE_CONTACTS` although the contacts tool only searches, and Google Play's October 29, 2026 policy update restricts the Manage Contacts permission to apps that need it. `SYSTEM_ALERT_WINDOW` (draw over other apps) was never used (`app.json`).
- App version updated to `0.6.2` in `app.json`.

### Known issues
- `READ_CONTACTS` is still requested for contact search. If Play classes reading contacts under the same restriction, the contacts tool will need a Play Console declaration or a switch to the system contact picker.
- The 16 KB page-size warning for expo-sqlite's prebuilt `vec.so` is still open.

## [0.6.1] - 2026-11-05

### Added
- Website footer credit "Built by Rhyme Solutions" on every page, linking to https://rhymesolutions.com/ (`website/`).
- Rhyme Solutions listed as `creator` and `publisher` of the homepage `WebSite` and `MobileApplication` structured data (`website/index.html`).
- README line saying OfflineMate is built and maintained by Rhyme Solutions (`README.md`).

### Changed
- Bumped `expo` to 58.0.23, `expo-linking` to 58.0.16, `expo-notifications` to 58.1.8, `expo-router` to 58.0.30, `expo-splash-screen` to 58.0.13, and `react-native-safe-area-context` to 5.11.1 (with `expo-asset` 58.0.20 and `expo-constants` 58.0.15 in the lockfile), because `expo-doctor` in CI fails on newer SDK 58 releases (`package.json`, `package-lock.json`).
- App version updated to `0.6.1` in `app.json`. The app has no feature changes in this release.

## [0.6.0] - 2026-11-02

### Added
- Website pages for search: a guide to running AI offline on Android and a model comparison (`website/run-ai-offline-on-android.html`, `website/models.html`).
- Homepage sections for setup steps, tier requirements, getting the app, and an FAQ with matching structured data (`website/index.html`).
- Every downloadable model listed by tier, with each name linking to its Hugging Face page (`website/index.html`, `website/models.html`).
- Google Search Console verification file, a custom 404 page, and a web manifest (`website/`).

### Changed
- Rewrote website titles, descriptions, and headings around what people search for, such as "offline AI assistant for Android" (`website/`).
- Replaced the social image with a 1200x630 card and the 38px favicon with 48px and 192px icons. Compressed the logos and the largest screenshot, and gave screenshots descriptive filenames and fixed dimensions (`website/`).
- Removed unused font weights, and the website build now minifies every HTML page and clears old output first (`website/`, `scripts/minify-website.mjs`).
- Moved the Terms link from the main nav to the footer, except on the Terms page itself (`website/`).
- Added `scripts/generate-website-images.cjs` to regenerate the website icons and social image.
- Added a unit test that checks the website's model lists against the model registry and its FAQ structured data against the visible answers (`tests/unit/website-content.test.ts`).
- Bumped `expo` to 58.0.22, `expo-dev-client` to 58.0.18, `expo-router` to 58.0.29, and `expo-sqlite` to 58.0.15, because `expo-doctor` in CI fails on newer patch releases (`package.json`).
- Removed the `zod` advisory GHSA-mrhx-c7xc-m3w5 from the audit allowlist, because `@expo/cli` 58.1.18 no longer installs the vulnerable zod 3.x copy (`audit-ci.jsonc`).
- App version updated to `0.6.0` in `app.json`. The app has no feature changes in this release.

### Fixed
- Website copy said web search runs only when you allow it, but the setting is on by default. The site now says so and explains how to turn it off (`website/index.html`).
- The social image tags declared 1024x1024 for a 379x382 image (`website/`).

### Known issues
- The website has no install link because the app isn't publicly available on Google Play yet. It points visitors to build from source until then.

## [0.5.1] - 2026-10-29

### Added
- Onboarding now lets you pick the chat model for the selected tier (with download sizes) and downloads that model together with the speech and search files. Before, it always downloaded the tier default, and other models could only be chosen in Settings afterwards. Tier and model are locked while files download (`app/onboarding.tsx`, `src/components/ModelDownloader.tsx`, `src/ai/model-manager.ts`).

### Fixed
- Voice input no longer fails silently when the tier's Whisper model is missing. Switching tiers in Settings only downloaded the chat model, so on Standard/Full the mic found no `whisper-base.en.bin`, skipped the microphone permission prompt, and did nothing. Now:
  - The mic offers a one-time download of the tier's speech model (with progress on the button) instead of doing nothing (`src/components/VoiceButton.tsx`, `src/hooks/useVoice.ts`).
  - Downloading a model in Settings also fetches that tier's Whisper model when voice is enabled (`app/(tabs)/settings.tsx`, `src/ai/model-manager.ts`).
  - STT falls back to whichever Whisper size is on disk (e.g. tiny from a Lite onboarding) instead of requiring the tier's size (`src/voice/stt-engine.ts`).
- Unit tests alias `whisper.rn` to a stub, since the package exports no Node entry point (`vitest.config.ts`, `tests/stubs/whisper-rn.ts`).

### Changed
- Node.js 24 everywhere: `.nvmrc` is now `24.22.2` (read by CI, the release workflow, Pages, and EAS Build), and `engines.node` is `>=24.0.0`. EAS workers previously ran Node 20.20.2 / npm 10.8, which warned `EBADENGINE` for pnpm 11 (requires Node ≥22.13) (`.nvmrc`, `package.json`).
- GitHub Actions bumped to the latest majors: `actions/checkout@v7`, `actions/setup-node@v7`, and `actions/upload-pages-artifact@v5`. Pages keeps `.nojekyll` with `include-hidden-files: true` (`.github/workflows/`).
- Updated CI/CD and Play Store release docs for Node 24 (`docs/deployment/`).
- App version updated to `0.5.1` in `app.json`.

### Known issues
- **Vitest 5 is still held back:** its Node ≥22.12 requirement is now met, but the major upgrade has not been done yet.

## [0.5.0] - 2026-10-29

### Added
- New on-device model alternates from `react-native-executorch` 0.11.0: MiniCPM5 2B (Standard) and LFM 2.5 2.6B (Full), plus LFM 2.5 350M (Lite) (`src/ai/model-registry.ts`).

### Fixed
- Model tokenizer files are now stored per model (`models/<model-id>-tokenizer.json`, `-tokenizer-config.json`) instead of a shared `tokenizer.json`. Before, a downloaded alternate reused the previous model's tokenizer and produced garbage output. Installs that already have model weights fetch only the small tokenizer files on the next chat (`src/ai/model-manager.ts`, `src/hooks/useLLMChat.ts`).
- "Open chats" works again on SDK 58: the hidden Chats tab hides only its tab button, since `href: null` now redirects away from the route (`app/(tabs)/_layout.tsx`).
- The chat "Active model" badge shows the model selected for the tier instead of always showing the tier primary (`app/(tabs)/chat.tsx`).

### Changed
- Upgraded to Expo SDK 58 (React Native 0.88.1, React 19.3) and aligned Expo/React Native native deps: reanimated 4.7, worklets 0.13, gesture-handler 3.3, screens 4.30, safe-area-context 5.10, keyboard-controller 1.22 (`package.json`, `eas.json` build image `sdk-58`).
- Bumped `react-native-executorch` and `react-native-executorch-expo-resource-fetcher` to 0.11.0, still through the `legacy` entry point (`package.json`).
- Bumped `whisper.rn` to 0.7.4 (RN 0.87+ fix) and switched the PCM adapter import to its exported subpath; TypeScript now resolves `whisper.rn` to its shipped `.d.ts` files (`src/voice/stt-engine.ts`, `src/types/whisper-rn.d.ts`, `tsconfig.json`).
- Bumped `react-native-nitro-modules` to 0.37.
- Tabs initial route moved to expo-router's `unstable_settings`, since SDK 58 removed the `initialRouteName` prop from `<Tabs>` (`app/(tabs)/_layout.tsx`).
- Regenerated `package-lock.json` from scratch; this also picks up a patched `vite` (GHSA-587h-7wmj-h5pm).
- Rebased the `react-native-keyboard-controller` patch onto 1.22.7 (`patches/`).
- Added an Expo config plugin that caps `CMAKE_OBJECT_PATH_MAX` at 250. Without it, Windows Android builds fail with "Filename longer than 260 characters" on gesture-handler 3 codegen objects (`plugins/with-cmake-object-path-max.js`, `app.json`).
- Refreshed model research for October 2026 (LFM3, MiniCPM5, Gemma 4 E4B, Qwen 3.5–3.8 status) and updated tier docs and roadmap (`docs/tech/qwen35-compatibility-research.md`, `docs/tech/models.md`, `docs/architecture/model-comparison-and-selection.md`, `docs/architecture/model-and-capability-tiers.md`, `docs/ROADMAP_AND_GAPS.md`).
- App version updated to `0.5.0` in `app.json`.

### Known issues
- **MiniCPM5 2B and LFM 2.5 2.6B are not yet validated on a device:** they are only published for the new `react-native-executorch` API and are loaded through the legacy `LLMModule` via their v0.11.0 asset URLs.
- **`react-native-executorch/legacy` is deprecated** and will be removed in a future release (1.0.0 nightlies exist); the LLM and embeddings code needs to move to the new API before then.
- **Qwen 3.5 0.8B not added to Lite:** its 8da4w export is ~1.4 GB. Qwen 3.5 4B is still not exported.
- **Allowlisted build-tooling advisory (no patched release yet):** `zod` <4.6.6 ([GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)) via `@expo/cli`, which still depends on zod 3.x. It is CLI-only and not bundled into the app. The previous `braces` and `node-forge` allowlist entries no longer match and were removed (`audit-ci.jsonc`).
- **npm 10.8 crashes resolving the SDK 58 tree** (`Cannot read properties of null (reading 'edgesOut')`). Use npm 11 (bundled with Node 24, as in CI) to install or update dependencies.
- **Held back:** TypeScript 7, ESLint 10, `@types/node` 26, and Vitest/`@vitest/coverage-v8` 5. Vitest 5 requires Node ≥22.12, but the project's `engines` and `.nvmrc` target Node 20.
- **LFM 2.5 350M (Lite alternate) handles plain chat but gives poor tool-call follow-ups:** on the emulator it answered direct questions correctly, but after a reminder tool call it emitted a raw `<|endoftext|>` token followed by unrelated text. SmolLM2 135M handled the same request cleanly. Keep it as an opt-in alternate.
- **Existing installs re-download a selected alternate once:** with the per-model tokenizer names, the first chat on a previously downloaded alternate falls back to ExecuTorch's downloader for all of that model's files. Tier primaries fetch only the tokenizer files.
- **Tool timeouts include time spent on OS permission prompts** (pre-existing): the first reminder request timed out while the notification prompt was open, then scheduled after permission was granted.
- **`whisper.rn` 0.7.4 source does not type-check against RN 0.88 typings** (`ResolvedAssetSource.uri`), so `tsconfig.json` maps it to the package's prebuilt `.d.ts` files instead.

## [0.4.0] - 2026-10-17

### Changed
- Upgraded to Expo SDK 57 (React Native 0.86.3) and aligned Expo/React Native native deps (reanimated 4.5, worklets 0.10, gesture-handler 2.32, screens, safe-area-context) (`package.json`, `eas.json`).
- Migrated `react-native-executorch` to 0.10.x through its `legacy` entry point; bumped to 0.10.5 along with the latest SDK 57 patch releases of `expo` and `expo-*` modules (`src/ai/`, `src/context/embeddings.ts`).
- Dependency audit gate now uses `audit-ci` with an allowlist (`audit-ci.jsonc`) instead of `npm audit --audit-level=high`, in the pre-commit hook (`npm run validate`) and CI workflows (`npm run audit:ci`).
- App version updated to `0.4.0` in `app.json`.

### Known issues
- **Expo SDK 58 / React Native 0.88 upgrade blocked:** `react-native-executorch` 0.10.5 (latest stable) requires `react-native-worklets` `<0.13`, while SDK 58 bundles worklets 0.13.0. Executorch 0.11 nightlies widen this to `<0.14`; revisit once 0.11 is stable.
- **Allowlisted build-tooling advisories (no patched release yet):** `braces` ≤3.0.3 ([GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), via Metro/`micromatch`) and `node-forge` ≤1.4.0 ([GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv), via `@expo/cli` code signing). Both are build-time only and not bundled into the app; remove them from `audit-ci.jsonc` once fixed upstream.
- **Moderate advisories remain** in transitive tooling deps (`decode-uri-component` via `expo-router`/`query-string`, `uuid` <11.1.1); below the high-severity gate and not fixable without breaking upgrades.
- **Node.js ≥20.19 required for install/tests:** on older Node (e.g. 20.11), npm skips the `rolldown` native binding (engine mismatch) and Vitest fails on `util.styleText`. Use the version in `.nvmrc` (20.20.2).

## [0.3.0] - 2026-06-21

### Added
- Per-tier model selection: choose a specific on-device model per tier (Lite/Standard/Full) in Settings, with the choice persisted per tier (`app/(tabs)/settings.tsx`, `src/stores/settings-store.ts`, `src/ai/model-registry.ts`).
- Standard-tier model variants for side-by-side testing: Gemma 4 E2B (new Standard primary) and Qwen 3.5 2B, alongside existing Qwen 1.7B, SmolLM2 1.7B, and Llama 1B alternates (`src/ai/model-registry.ts`).
- Website Terms page (`website/terms.html`) plus sitemap and privacy updates.

### Changed
- Upgraded to Expo SDK 56 and bumped React Native and native AI dependencies (including `react-native-executorch`); resolved related app and tooling changes (`package.json`, `app.json`, `eas.json`).
- Reworked voice input: speech-to-text now captures the full utterance and runs a single `whisper.rn` transcription at stop (instead of realtime VAD slices), using the Android `VOICE_RECOGNITION` audio source for more accurate short voice commands (`src/voice/stt-engine.ts`).
- Model registry now resolves and labels the active selected model per tier (not just the tier primary), with safe fallback to the primary (`src/ai/model-registry.ts`, `src/hooks/useLLMChat.ts`, `src/ai/model-manager.ts`).
- Settings persistence migrated to support per-tier model ids (`tierModelIds`), migrating any legacy single Standard selection forward.
- App version updated to `0.3.0` in `app.json`.

### Tests
- Added/updated unit tests for model registry and settings store covering per-tier model selection, normalization, and migration (`tests/unit/model-registry.test.ts`, `tests/unit/settings-store.test.ts`).

### Docs
- Added per-tier model selection plan and updated model comparison/selection, models, speech, stack, and pipeline docs (`docs/`).

## [0.2.0] - 2026-05-16

### Added
- `Chats` screen with multi-conversation list and quick new-chat flow (`app/(tabs)/chats.tsx`).
- Conversation controls: rename and delete per chat, with swipe + confirm UX (`app/(tabs)/chats.tsx`, `src/stores/chat-store.ts`).
- Optional on-device chat history retention toggle in settings (`app/(tabs)/settings.tsx`, `src/stores/settings-store.ts`).
- Play Store app screenshots and listing image assets for Android release (`assets/play-store-listing/`).

### Changed
- Chat state now persists per conversation when history retention is enabled, while preserving privacy-first default-off behavior.
- Active conversation switching and current-chat clearing now align with multi-chat management.
- App version updated to `0.2.0` in `app.json`.

### Roadmap Progress (from `docs/FUNCTIONALITY_IMPROVEMENT_ROADMAP.md`)
- Completed: optional persisted chat history with manual clear controls.
- Completed: chat UX improvements via multiple chats + per-chat deletion.
- In progress / pending: model readiness preflight, deeper Tools/Notes UX upgrades, retrieval quality improvements, and release/CI parity additions.

### Tests
- Updated tests for chat/settings persistence and related assistant flows.
