# OfflineMate

![Android 7.0+](https://img.shields.io/badge/Android-7.0%2B%20(API%2024)-3DDC84?logo=android&logoColor=white)
![Target SDK 36](https://img.shields.io/badge/Target%20SDK-36-blue)
![Expo SDK 55](https://img.shields.io/badge/Expo%20SDK-55-000020)

OfflineMate is a privacy-first, context-aware mobile assistant built with Expo and React Native.
It is designed to run on-device (LLM, retrieval, speech, and tools) with adaptive model tiers for
low-end to flagship phones.

## Status

Active implementation with local and cloud Android build flows documented and working.

## Android Support

- Minimum supported Android: **7.0 (API 24)** (`minSdk 24`)
- Target Android SDK: **36** (`targetSdk 36`)

## Current Capabilities

- Offline-first assistant chat architecture
- Tier-based model strategy (Lite, Standard, Full)
- Semantic RAG with ExecuTorch embeddings and sqlite-vec KNN search (with fallback)
- LLM-driven planner with schema validation and deterministic tool execution
- Device tools integration path (calendar, contacts, notes, reminders)
- STT/TTS integration path for voice interactions

## Quickstart

```bash
npm ci
npx expo-doctor
npm run typecheck
npm run lint
npm run test
npm run test:perf
npm run start
```

For native runtime testing (custom dev build):

```bash
npm run android
# or
npm run ios
```

## Website (offlinemate.com)

Static site source: `website/`. **Production** deploy minifies HTML/CSS into `website-dist/` (`npm run website:build`). GitHub Actions runs that before Pages upload. Setup: `website/README.md`.

## Build and Release

- Full local + EAS build runbook: `BUILDING.md`
- EAS build/release process: `docs/deployment/expo-build-and-release.md`
- Play Store release notes: `docs/deployment/android-release-playstore.md`
- OTA update workflow: `docs/deployment/ota-updates.md`

## Project Docs

- Pre-commit hook (Husky, same checks as CI): `docs/pre-commit.md`
- Docs index: `docs/README.md`
- Architecture: `docs/architecture/overview.md`
- Model tiers: `docs/architecture/model-and-capability-tiers.md`
- Input/tooling flow: `docs/architecture/input-and-tooling-flow.md`
- RAG/memory/vector store: `docs/architecture/rag-memory-and-vector-store.md`
- Technical references:
  - `docs/tech/stack.md`
  - `docs/tech/models.md`
  - `docs/tech/rag.md`
  - `docs/tech/speech.md`
  - `docs/tech/vector-store.md`
  - `docs/tech/embeddings-and-indexing.md`
  - `docs/tech/agent-planning-and-execution.md`

## Project Governance

- Contribution guide: `CONTRIBUTING.md`
- Security policy: `SECURITY.md`
- **Privacy & terms (public / store listings):** `docs/legal/privacy-policy.md`, `docs/legal/terms-of-use.md` — index: `docs/legal/README.md`
- License: `LICENSE.md` (Proprietary / All rights reserved)

## Repository

- [github.com/KingPegasus/OfflineMate](https://github.com/KingPegasus/OfflineMate)

## Domain

- [offlinemate.com](https://offlinemate.com)
