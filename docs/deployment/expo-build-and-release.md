# Expo Build and Release Strategy

This document defines how OfflineMate is built and released using Expo and EAS.

## Why This Deployment Approach Was Chosen

- EAS Build provides managed native builds for Android and iOS.
- It fits Expo custom dev build requirements for native AI modules.
- It standardizes build environments and simplifies signing workflows.

## Build Profiles

Planned `eas.json` profiles:

- `development`: internal testing with dev client
- `preview`: QA and stakeholder validation
- `production`: store-ready binaries

## Build Requirements

- Expo custom dev client (Expo Go is insufficient for native AI modules)
- New React Native architecture enabled
- Native dependencies validated per platform build profile

## Release Process

1. Run lint, type-check, and tests
2. Build preview profile for QA
3. Validate model loading and tool permissions on devices
4. Build production artifact
5. Submit to Play Store/App Store workflows

**Google Play (AAB), store listing graphics, tablet screenshots via emulator, lockfile/Node alignment with EAS, and `npx eas-cli`:** see **[android-release-playstore.md](./android-release-playstore.md)**. Run **`npx expo-doctor`** before EAS builds when changing config or assets.

**Manual CI release:** Trigger [`.github/workflows/release-android.yml`](../../.github/workflows/release-android.yml) from the GitHub **Actions** tab; it runs checks and kicks off an EAS build (with optional `eas submit`). Versioning is safe because `eas.json` uses `appVersionSource: "remote"` + `autoIncrement` on production (details in the Play doc).

## First Android Preview Build (Command Sequence)

```bash
npm install
npm run typecheck
npm run lint
npx expo prebuild --platform android
npx eas login
npx eas build:configure
npx eas build --platform android --profile preview
```

After build finishes, install the preview artifact on at least one device per tier class
(Lite/Standard/Full) and validate model download + chat + voice + tools.

## Signing and Secrets

- Store signing keys in secure CI secrets manager
- Restrict secret access by environment and role
- Rotate credentials regularly

## References

- EAS Build overview: [https://docs.expo.dev/build/introduction/](https://docs.expo.dev/build/introduction/)
- EAS build config: [https://docs.expo.dev/build/eas-json/](https://docs.expo.dev/build/eas-json/)
- Custom builds: [https://docs.expo.dev/custom-builds/get-started](https://docs.expo.dev/custom-builds/get-started)
