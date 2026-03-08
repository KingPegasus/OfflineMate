# OfflineMate

OfflineMate is a privacy-first, context-aware mobile assistant built with Expo and React Native.
The app is designed to run fully on-device (LLM, retrieval, speech, and tools) and support a wide
range of phones from low-end to flagship devices through adaptive model tiers.

## Project Status

Planning and documentation phase. The repository currently contains architecture, technical,
deployment, and governance documentation to guide implementation.

## Documentation Map

- Product and architecture:
  - `BUILDING.md`
  - `docs/README.md`
  - `docs/architecture/overview.md`
  - `docs/architecture/expo-decision.md`
  - `docs/architecture/model-and-capability-tiers.md`
  - `docs/architecture/input-and-tooling-flow.md`
  - `docs/architecture/rag-memory-and-vector-store.md`
- Deployment:
  - `docs/deployment/expo-build-and-release.md`
  - `docs/deployment/android-release-playstore.md`
  - `docs/deployment/ota-updates.md`
  - `docs/deployment/ci-cd-pipeline.md`
- Technical references:
  - `docs/tech/stack.md`
  - `docs/tech/models.md`
  - `docs/tech/rag.md`
  - `docs/tech/speech.md`
  - `docs/tech/vector-store.md`

## Planned Core Capabilities

- Offline on-device assistant chat
- Tier-based model selection (Lite, Standard, Full)
- Retrieval-augmented context from local data
- Tool execution (calendar, contacts, notes, reminders)
- Speech-to-text and text-to-speech
- Android production release and OTA JS updates

## Development Workflow (Planned)

- Package manager: `npm` (can switch to `pnpm` later)
- App framework: Expo (custom dev builds, not Expo Go)
- Type checking: TypeScript
- Linting: ESLint + Prettier
- CI: GitHub Actions for lint/test/build checks
- Mobile builds: EAS Build

## Quickstart

```bash
npm install
npm run typecheck
npm run lint
npm run start
```

For native runtime testing, use custom dev builds:

```bash
npm run android
# or
npm run ios
```

## Governance

- Contribution guide: `CONTRIBUTING.md`
- Security policy: `SECURITY.md`
- License: `LICENSE.md` (Proprietary / All rights reserved)

## Domain

- [offlinemate.com](https://offlinemate.com)
