# Android Release and Play Store Deployment

This document covers Android release mechanics for OfflineMate.

## Why Android-First Hardening Matters

- Android has the broadest device variability (RAM, chipsets, OEM behavior).
- Offline AI model behavior must be validated across device tiers.
- Store compliance and permission declarations must match runtime behavior.

## Release Checklist

- Verify Android package/app ID consistency
- Validate permission prompts and in-app rationale text
- Confirm model download, storage, and fallback behavior
- Validate low-storage and low-memory error handling
- Validate background/foreground transitions with loaded models

## Play Store Artifacts

- AAB built from EAS production profile
- Signed with production keystore
- Version code and version name incremented

## Build and Submit Commands

```bash
# Production Android build (AAB)
npx eas build --platform android --profile production

# Optional: submit directly after build
npx eas submit --platform android --profile production
```

If you need an APK for device QA, use an internal preview profile and set `gradleCommand` to
`assembleRelease` in `eas.json`.

## Data Safety and Privacy Declarations

Given local-first design, declare data handling accurately:

- What data is processed on-device
- Whether any telemetry is collected
- Whether any data leaves the device (if future sync is added)

## Post-Release Monitoring

- Crash and ANR monitoring
- Memory pressure and model load failure metrics
- Tier distribution analytics (without storing prompt content)

## References

- Expo Android app config: [https://docs.expo.dev/build-reference/apk/](https://docs.expo.dev/build-reference/apk/)
- Google Play release docs: [https://support.google.com/googleplay/android-developer/answer/9859152](https://support.google.com/googleplay/android-developer/answer/9859152)
- Android app signing: [https://developer.android.com/studio/publish/app-signing](https://developer.android.com/studio/publish/app-signing)
