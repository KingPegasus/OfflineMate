# Building OfflineMate

This guide covers local Android builds and EAS cloud builds for OfflineMate.

## 1) Prerequisites (Windows)

Install:

- Node.js 20+
- JDK 17
- Android Studio (with SDK + Platform Tools + Command-line Tools)

Set environment variables:

- `JAVA_HOME` -> your JDK 17 path
- `ANDROID_HOME` (or `ANDROID_SDK_ROOT`) -> your Android SDK path

Add to `Path`:

- `%JAVA_HOME%\bin`
- `%ANDROID_HOME%\platform-tools`
- `%ANDROID_HOME%\cmdline-tools\latest\bin`

Verify:

```powershell
java -version
adb version
```

Expected: both commands should print versions and not show "not recognized".

## 2) Install Dependencies

From project root:

```powershell
npm ci
```

## 3) Project Health Checks

```powershell
npx expo-doctor
npm run typecheck
npm run lint
```

Expected:

- Expo doctor: `17/17 checks passed`
- Typecheck/lint: no errors

## 4) Local Android Release Build

```powershell
npx expo prebuild --platform android
cd android
.\gradlew.bat :app:assembleRelease
```

If successful, APK/AAB artifacts are generated under Android build outputs.

## 5) EAS Preview Build (Cloud)

From project root:

```powershell
npx eas-cli login
npx eas-cli project:init --non-interactive --force
npx eas-cli credentials:configure-build -p android -e preview
npx eas-cli build --platform android --profile preview --non-interactive
```

If prompted for keystore, create one (first time only).

## 6) Common Errors and Fixes

### `JAVA_HOME is not set`

- JDK is missing or env var not configured.
- Install JDK 17 and set `JAVA_HOME`.

### `adb is not recognized`

- Android Platform Tools not on `Path`.
- Add `%ANDROID_HOME%\platform-tools`.

### `npm ci` ERESOLVE in EAS

- `package-lock.json` and `package.json` out of sync, or incompatible peer versions.
- Run `npm install`, commit lockfile, and ensure React peer versions are aligned.

### Reanimated version compatibility failure

- Ensure Expo-compatible versions:
  - `react-native` pinned to Expo SDK expected version
  - `react-native-reanimated` and `react-native-worklets` in compatible range
- Re-run `npx expo-doctor`.

### Deprecated warnings (`glob@7`, `inflight`, `rimraf@3`)

- These are currently transitive warnings from upstream Expo/RN tooling.
- They are not immediate blockers when builds and audits are clean.

## 7) Recommended Build Order

1. `npm ci`
2. `npx expo-doctor`
3. `npm run typecheck && npm run lint`
4. Local Gradle build
5. EAS preview build

