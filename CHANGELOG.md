# Changelog

All notable changes to this project are documented in this file.

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
