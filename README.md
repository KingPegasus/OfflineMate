# OfflineMate

![Android 7.0+](https://img.shields.io/badge/Android-7.0%2B%20(API%2024)-3DDC84?logo=android&logoColor=white)
![Target SDK 36](https://img.shields.io/badge/Target%20SDK-36-blue)
![Expo SDK 55](https://img.shields.io/badge/Expo%20SDK-55-000020)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

<p align="center">
  <img src="website/offlinemate.png" alt="OfflineMate logo" width="168" />
</p>

<p align="center">
  <strong>On-device AI assistant for Android</strong> — private by default, capable on the go.
</p>

<p align="center">
  <a href="https://offlinemate.com">Website</a>
  ·
  <a href="https://github.com/KingPegasus/OfflineMate">Source</a>
  ·
  <a href="LICENSE.md">MIT License</a>
</p>

---

## Why OfflineMate

**Your chat, memory, and tools stay on the phone.** Network use is explicit—model downloads and optional web search when you allow it—so everyday use does not depend on sending prompts to a cloud assistant.

**Tiered on-device models** (Lite → Standard → Full) let you trade speed for quality on anything from budget devices to flagships.

**Semantic memory (RAG)** over your notes on supported tiers, plus **voice** in and out, **calendar**, **reminders**, **notes**, **contacts**, and more through a validated tool path—only with the permissions you grant.

---

## Product site

**[offlinemate.com](https://offlinemate.com)** — overview, privacy summary, and links into this repo.  
The static site lives in [`website/`](website/); production build and Pages deploy are described in [`website/README.md`](website/README.md).

---

## Building, testing, and release

All runbooks live in the repo—nothing heavy duplicated here:

| Topic | Where |
|--------|--------|
| Local dev, native builds, EAS | [`BUILDING.md`](BUILDING.md) |
| Expo / cloud build & release | [`docs/deployment/expo-build-and-release.md`](docs/deployment/expo-build-and-release.md) |
| Play Store checklist | [`docs/deployment/android-release-playstore.md`](docs/deployment/android-release-playstore.md) |
| OTA updates | [`docs/deployment/ota-updates.md`](docs/deployment/ota-updates.md) |
| CI (typecheck, lint, tests) | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) |

**Contributing:** [`CONTRIBUTING.md`](CONTRIBUTING.md) · **Pre-commit / validate:** [`docs/pre-commit.md`](docs/pre-commit.md)

---

## Documentation

Full index: **[`docs/README.md`](docs/README.md)** — architecture, model tiers, RAG, speech, stack, and deep technical notes.

---

## Governance

| | |
|--|--|
| **Security** | [`SECURITY.md`](SECURITY.md) |
| **Privacy & terms** | [`docs/legal/README.md`](docs/legal/README.md) (store-ready markdown in [`docs/legal/`](docs/legal/)) |
