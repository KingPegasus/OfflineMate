# Agent Execution Notes

This file defines repository-specific behavior for AI coding agents.

## Build Intent Policy (Critical)

When the user asks to "build locally", "build the app", or similar without specifying debug/dev:

- Default to a **release-style local build**, not a dev-client/debug build.
- Use Android release commands by default:
  - `cd android`
  - `./gradlew app:assembleRelease` (Windows: `.\gradlew.bat app:assembleRelease`)
- If installation is requested, install the release artifact:
  - `adb install -r app/build/outputs/apk/release/app-release.apk`

Do **not** default to:

- `expo run:android`
- `app:assembleDebug`
- Any flow that opens Expo Dev Launcher / development client

unless the user explicitly asks for debug/dev-client behavior.

## Clarification Rule

If intent is ambiguous, ask one direct question before building:

- "Do you want a release APK that opens directly, or a dev-client build that requires Metro?"

## Response Rule After Build

After build completion, always state:

- Build type used (`release` or `debug/dev-client`)
- Output artifact path
- Whether app opens standalone or requires Metro
