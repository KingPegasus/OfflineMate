# Changelog

All notable changes to this project are documented in this file.

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
