# Changelog

All notable changes to this project are documented in this file.

## [0.5.1] - 2026-10-29

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
