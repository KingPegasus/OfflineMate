# Changelog

All notable changes to this project are documented in this file.

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
