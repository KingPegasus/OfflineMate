# Android Release and Play Store Deployment

This document covers Android release mechanics for OfflineMate.

## Why Android-First Hardening Matters

- Android has the broadest device variability (RAM, chipsets, OEM behavior).
- Offline AI model behavior must be validated across device tiers.
- Store compliance and permission declarations must match runtime behavior.

## Pre-publish checklist

Use `- [ ]` items in your editor or copy into an issue/PR. Nothing here replaces Google Play review or your policy attestation.

### Repo, quality, and local sanity

- [ ] `npm ci` (or fresh `npm install`) succeeds.
- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.
- [ ] Unit/integration tests you rely on pass (`npm run test` or subset).
- [ ] `npx expo prebuild --platform android` completes (catches plugin/config errors before EAS).

### App identity and versioning

- [ ] Play Console app uses package **`com.offlinemate.app`** (must match [app.json](../../app.json) `android.package`; cannot change after creation).
- [ ] `expo.version` in `app.json` reflects the **version name** you want users to see.
- [ ] EAS **versionCode** strategy understood: [eas.json](../../eas.json) uses `appVersionSource: "remote"` and production `autoIncrement` — confirm behavior in [EAS app versions](https://docs.expo.dev/build-reference/app-versions/).

### Accurate product claims (policy / listing)

- [ ] Store description matches **real behavior**: on-device LLM inference vs **network** used for **model downloads** (e.g. Hugging Face / Software Mansion URLs) and optional **web search** (e.g. DuckDuckGo). Avoid implying “no data ever leaves the device” if those features are enabled.
- [ ] **Privacy policy** URL is live, readable, and consistent with Data safety answers (source: [docs/legal/privacy-policy.md](../legal/privacy-policy.md); publish same text on the web or link to the rendered file in the public repo).
- [ ] Review [Google Play Developer Policy Center](https://play.google/developer-content-policy/) (User Data, Permissions, Deceptive Behavior, AI-Generated Content, SDK Requirements, Store Listing).
- [ ] Advance notice to App Review only if a listed scenario applies: [6320428](https://support.google.com/googleplay/android-developer/answer/6320428).

### Permissions and in-app experience

- [ ] Each declared permission in `app.json` is used; rationale strings match what users see (microphone, calendar, contacts, notifications).
- [ ] Permission denial paths are handled without crashes.
- [ ] Notification channel / custom sound works on Android 8+ (resource names: no hyphens in raw sound filenames).
- [ ] Model download, storage, tier fallback, and low-storage / OOM behavior tested on real devices.

### Device QA (recommended)

- [ ] At least one device per tier class (Lite / Standard / Full): onboarding, download, chat, voice, reminders, calendar/contacts tools as applicable.
- [ ] Background/foreground and rotation (if supported) with a loaded model.
- [ ] Internal or **closed testing** track exercised before production rollout.

### EAS build and signing

- [ ] `eas login` and project access verified (`extra.eas.projectId` in `app.json`).
- [ ] Android **production credentials** (keystore) configured in EAS or created on first production build.
- [ ] Production AAB: `npx eas build --platform android --profile production`.
- [ ] AAB downloaded or submit pipeline ready.

### Play Console: listing and compliance

- [ ] **Store listing**: title, short/full description, screenshots, feature graphic (as required), contact email.
- [ ] **Content rating** questionnaire completed.
- [ ] **Target audience** and (if applicable) **News app** / **COVID-19** declarations accurate.
- [ ] **Data safety** form completed truthfully (on-device processing, optional network features, microphone, contacts, calendar, etc.).
- [ ] **App content** declarations (e.g. ads, UGC) match the app.

### Submit and release

- [ ] Upload AAB to a **testing** track first; verify install and smoke test.
- [ ] `npx eas submit --platform android --profile production` **or** manual upload with same signing key continuity.
- [ ] Release notes added; staged rollout optional.
- [ ] **Post-release**: monitor crashes/ANRs in Play Console; plan next binary vs OTA ([OTA strategy](./ota-updates.md)).

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
