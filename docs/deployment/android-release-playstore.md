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

## Toolchain and lockfile (match EAS)

EAS Build for **Expo SDK 55** uses **Node 20.19.x** and **npm 10.x** on Linux builders ([infrastructure](https://docs.expo.dev/build-reference/infrastructure/)). If `package-lock.json` is generated with a very different Node/npm, `npm ci` can fail on EAS with missing packages (e.g. nested optional deps).

- Prefer **Node 20** when refreshing the lockfile: see **`.nvmrc`** in the repo root.
- **CI** (`.github/workflows/ci.yml`) uses `node-version-file: ".nvmrc"` so the same `npm ci` as EAS is exercised on push/PR.

## EAS CLI and Expo account

- Invoke the CLI with **`npx eas-cli`** if `eas` is not installed globally.
- **`app.json` `owner`** must match the Expo account that owns **`extra.eas.projectId`**. A mismatch fails with an error pointing at [eas-project-id](https://expo.fyi/eas-project-id).

## Expo config validation

Before cloud builds, run **`npx expo-doctor`** locally. Fix schema issues (e.g. deprecated fields in `app.json`, non-square **icon** / **adaptiveIcon** assets). The app **icon** must be **square** (Expo and Play both enforce this for listing/build).

## Play Console: listing graphics

Google Play **Main store listing** requires assets that meet their current size and format rules (check Console for updates):

| Asset | Typical requirements (verify in Console) |
|--------|-------------------------------------------|
| **App icon (listing)** | PNG or JPEG, **512×512** px, ≤ **1 MB** |
| **Feature graphic** | PNG or JPEG, **1024×500** px, ≤ **15 MB** |
| **Phone screenshots** | PNG or JPEG, ≤ **8 MB** each, **16:9 or 9:16**, sides **320–3840** px |
| **Tablet (e.g. 7-inch)** | Same screenshot rules; use **emulator** if you have no physical tablet (see below) |

### Generate listing icon and feature graphic from this repo

On **Windows**, from the repo root:

```powershell
.\scripts\generate-play-store-assets.ps1
```

Outputs (upload paths in Play Console):

- `assets/play-store-listing/store-icon-512.png`
- `assets/play-store-listing/feature-graphic-1024x500.png`

The script downscales **`assets/icon.png`** to 512×512 and composes a simple feature graphic from **`website/offlinemate.png`**. Replace the feature graphic with a designed asset from Figma/Canva if you want a stronger marketing look.

**Note:** The marketing site uses **`website/offlinemate.png`** separately; keep branding aligned manually if you change either.

## Store copy and release notes

- **Short description** (very small character limit): one clear benefit + one proof point; stay honest about **on-device** vs **optional network** (model downloads, optional web search).
- **Full description** and **Data safety** / **privacy policy** must agree (see [privacy-policy.md](../legal/privacy-policy.md)).
- **Release notes** (“What’s new”): user-facing changes; avoid absolute claims like “never uses the internet” if downloads or optional search exist.

Paste **plain text** into each language field in Play Console (no XML wrappers like `<en-GB>`).

## Tablet / phone screenshots without a physical tablet

Play may require **tablet**-class screenshots. You do **not** need a real tablet: screenshots from the **Android Emulator** are valid.

1. Create a **tablet** AVD (e.g. ~7" profile), boot it, install your app, navigate to representative screens.
2. Capture: emulator **Screenshot** control or `adb exec-out screencap -p > shot.png`.

### Emulator without Android Studio (CLI-only SDK)

This project targets **Android API 36** (see Gradle / Expo). Use an **API 36** system image for screenshots so the emulator matches your stack.

If you already have **`ANDROID_HOME`** and **`sdkmanager`** / **`avdmanager`** (typical with local Gradle builds), install the **emulator** package and a **Google Play** x86_64 image for API 36:

```powershell
$sdkm = "$env:LOCALAPPDATA\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat"
& $sdkm --install "emulator" "platforms;android-36" "system-images;android-36;google_apis_playstore;x86_64"
```

List other API 36 variants if needed (`android-36.1`, `google_apis` without Play, ARM):

```powershell
& $sdkm --list | Select-String "system-images;android-36"
```

Create and start an AVD (adjust `-k` to the exact package you installed; use `avdmanager list device` for tablet ids):

```powershell
$avd = "$env:LOCALAPPDATA\Android\Sdk\cmdline-tools\latest\bin\avdmanager.bat"
& $avd create avd -n tablet7-api36 -k "system-images;android-36;google_apis_playstore;x86_64" -d "Nexus 7"
& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd tablet7-api36
```

Enable **Windows Hypervisor Platform** / virtualization features if the emulator warns about acceleration.

## Play Console: deobfuscation file (mapping)

If **R8 / minify** is **off** (default in this project unless `android.enableMinifyInReleaseBuilds` is set in `gradle.properties`), there is **no** ProGuard **mapping.txt** to upload. Play may still show an informational prompt about deobfuscation; that applies when you enable shrinking and need to upload **`mapping`** for readable crash stacks.

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

## Manual GitHub Actions release (recommended)

The repo ships with a **manually dispatched** workflow: [`.github/workflows/release-android.yml`](../../.github/workflows/release-android.yml).

- **Trigger:** GitHub → **Actions** → **Release Android (EAS)** → **Run workflow**.
- **Inputs:**
  - `profile` — `preview` (internal testing AAB/APK) or `production` (store AAB).
  - `submit` — `true` submits the finished build to **Google Play** via `eas submit`; only honored when `profile = production`.
  - `message` — optional label shown on the EAS build.
- **Steps:** `npm ci` → `typecheck` → `lint` → unit + integration tests → `expo-doctor` → `eas build` → (optional) `eas submit`.

### Versioning without Play errors

Play rejects any AAB whose **`versionCode`** is **≤** the latest on that track.  
[`eas.json`](../../eas.json) pins this safely:

- `"appVersionSource": "remote"` — Expo/EAS stores the current **versionCode** per app.
- `"production": { "autoIncrement": true }` — every successful **production** EAS build bumps the **versionCode** server-side **before** upload, so you can’t accidentally reuse a number.

Your manual step each release:

1. Bump **`expo.version`** (e.g. `0.1.0` → `0.2.0`) in [`app.json`](../../app.json) when user-visible changes ship.
2. Commit, push to `main`.
3. Dispatch the workflow with `profile = production` (and `submit = true` if Play should receive the AAB automatically).

Internal **preview** builds (`profile = preview`) do not bump the production counter; use them for QA without burning a `versionCode`.

### Required GitHub secret

- **`EXPO_TOKEN`** — an **[Expo access token](https://docs.expo.dev/accounts/programmatic-access/)** for the Expo account that owns `extra.eas.projectId`. Add in **Settings → Secrets and variables → Actions** as a repository secret. The workflow uses it for `eas whoami`, `eas build`, and `eas submit` in non-interactive mode.

### EAS Submit credentials for Google Play

For **`eas submit`** to upload automatically you also need:

- A **Google Play service account JSON** with **API access** to your app in the **Google Play Developer API**.
- Either upload it via `eas credentials` (stored with EAS), or reference it in `eas.json` under `submit.production.android.serviceAccountKeyPath` (do **not** commit the JSON).

Until this is set up, trigger the workflow with `submit = false` and upload the resulting AAB manually in Play Console.

### Caveats

- If the first production build runs in non-interactive mode without **Android keystore** set up, EAS will fail asking for credentials. Run `npx eas credentials` (or one interactive `eas build --profile production`) locally **once** to generate/register the keystore before using this workflow for production.
- Keep the **keystore** you use forever for this app; losing it blocks future updates (unless you migrate via Play App Signing procedures).

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
