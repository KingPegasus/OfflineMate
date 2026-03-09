# Building OfflineMate

This guide is the single source of truth for Android builds (local and EAS cloud) on Windows.

## 1) One-Time Prerequisites (Windows)

Install:

- Node.js LTS (20+ recommended)
- JDK 17 (required by current Android/Gradle toolchain)
- Option A (lightweight, recommended): Android SDK Command-line Tools + Platform-Tools ZIPs only
- Option B: Android Studio (if you prefer GUI setup)

Useful download links:

- Android Studio: <https://developer.android.com/studio>
- Command-line tools (official page): <https://developer.android.com/studio#command-line-tools-only>
- Command-line tools (direct Windows ZIP): <https://dl.google.com/android/repository/commandlinetools-win-14742923_latest.zip>
- Platform tools (`adb`) page: <https://developer.android.com/tools/releases/platform-tools>
- Platform tools direct Windows ZIP: <https://dl.google.com/android/repository/platform-tools-latest-windows.zip>

### If you use ZIP-only setup (no Android Studio)

Extract to this structure:

- `C:\Users\<YOUR_USERNAME>\AppData\Local\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat`
- `C:\Users\<YOUR_USERNAME>\AppData\Local\Android\Sdk\platform-tools\adb.exe`

Then install required SDK packages:

```powershell
sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0" "ndk;27.1.12297006"
```

## 2) Configure Environment Variables

Run once in PowerShell (user-level + current session):

```powershell
$javaHome = "C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot"
$androidSdk = "$env:LOCALAPPDATA\Android\Sdk"

[Environment]::SetEnvironmentVariable("JAVA_HOME", $javaHome, "User")
[Environment]::SetEnvironmentVariable("ANDROID_HOME", $androidSdk, "User")
[Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", $androidSdk, "User")

# Also update current shell session immediately
$env:JAVA_HOME = $javaHome
$env:ANDROID_HOME = $androidSdk
$env:ANDROID_SDK_ROOT = $androidSdk

$old = [Environment]::GetEnvironmentVariable("Path","User")
$add = "$javaHome\bin;$androidSdk\platform-tools;$androidSdk\emulator;$androidSdk\cmdline-tools\latest\bin"
[Environment]::SetEnvironmentVariable("Path", "$old;$add", "User")

# Optional: apply PATH to current session now
$env:Path = "$add;$env:Path"
```

Close and reopen your terminal.

### Verify setup

```powershell
java -version
sdkmanager --version
adb version
echo $env:ANDROID_HOME
```

Expected: all commands return versions/paths and no "not recognized" errors.

If `sdkmanager`/`adb` are still not recognized in an existing terminal, restart Cursor/terminal so updated user `Path` is reloaded.

## 3) Install Dependencies and Health Checks

From repository root:

```powershell
npm ci
npx expo-doctor
npm run typecheck
npm run lint
```

Expected:

- Expo doctor passes all checks
- Typecheck/lint complete without errors

## 4) Local Android Release Build

From repository root:

```powershell
npx expo prebuild --platform android
cd android
.\gradlew.bat :app:assembleRelease
```

Notes:

- Run Gradle wrapper from `android` directory.
- In CMD use `gradlew.bat`; in PowerShell use `.\gradlew.bat`.

### Self-run command set (CMD)

Use this exact sequence if you want a local APK and manual transfer:

```cmd
cd C:\Users\Raza\dev\offline-assistant
npx expo prebuild --platform android
cd android
echo sdk.dir=C:\\Users\\Raza\\AppData\\Local\\Android\\Sdk>local.properties
java -classpath gradle/wrapper/gradle-wrapper.jar org.gradle.wrapper.GradleWrapperMain :app:assembleRelease
```

Use this when `gradlew.bat` is missing/empty/corrupted and cannot execute.

### Standard wrapper command (when wrapper is healthy)

```cmd
gradlew.bat :app:assembleRelease
```

Release APK output:

- `android\app\build\outputs\apk\release\app-release.apk`

Install to connected device (optional):

```powershell
adb install -r android\app\build\outputs\apk\release\app-release.apk
```

### Viewing debug logs (device connected via USB)

Stream app and framework logs in your terminal:

```powershell
npm run android:logs
```

This runs `adb logcat` filtered to React Native, React Native JS, and Expo tags (e.g. `console.log` from the app). To see all device log output:

```powershell
npm run android:logs:all
```

If `adb` is not on your `PATH`, use the full path:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" logcat -s ReactNativeJS:V ReactNative:V Expo:V
```

Press `Ctrl+C` to stop streaming.

### If you see "SDK location not found"

Either ensure `ANDROID_HOME` is set correctly, or create `android\local.properties` with:

```properties
sdk.dir=C:\\Users\\<YOUR_USERNAME>\\AppData\\Local\\Android\\Sdk
```

## 5) EAS Cloud Build (Android Preview)

From repository root:

```powershell
npx eas-cli login
npx eas-cli credentials:configure-build -p android -e preview
npx eas-cli build --platform android --profile preview
```

Notes:

- Keystore creation is interactive on first run.
- Avoid `--non-interactive` if credentials/keystore are not already configured.

## 6) Recommended Build Order

1. Verify Java/Android SDK tools
2. `npm ci`
3. `npx expo-doctor`
4. `npm run typecheck && npm run lint`
5. local Gradle release build
6. EAS preview build

## 7) Common Errors and Fixes

### `JAVA_HOME is not set`

- Install JDK 17 and point `JAVA_HOME` to JDK root.
- Ensure `%JAVA_HOME%\bin` (or `$env:JAVA_HOME\bin`) is on `Path`.

### `adb is not recognized`

- Add Android platform-tools to `Path`:
  - `%ANDROID_HOME%\platform-tools`

### `SDK location not found`

- Set `ANDROID_HOME` / `ANDROID_SDK_ROOT`, or add `android/local.properties` with `sdk.dir=...`.

### `npm ci` ERESOLVE in EAS/local

- `package-lock.json` may be stale vs `package.json`.
- Re-run `npm install`, ensure lockfile is updated, then commit lockfile.

### Dependency deprecation warnings (`glob@7`, `inflight`, `rimraf@3`)

- Usually transitive (upstream dependencies).
- Not a blocker if app builds/tests pass; keep dependencies updated over time.

