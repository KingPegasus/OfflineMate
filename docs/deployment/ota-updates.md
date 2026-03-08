# OTA Updates Strategy (Expo Updates)

OfflineMate will use OTA updates for JavaScript/TypeScript and asset-level changes that do not
require native binary changes.

## Why OTA Was Chosen

- Faster delivery of prompt/routing/policy updates
- Reduced release overhead for non-native changes
- Better experimentation loop for assistant behavior tuning

## What Can Be Updated OTA

- Prompt templates
- Routing heuristics
- UI logic and copy
- Non-native configuration and feature flags

## What Requires Store Release

- New native modules
- Native dependency version changes
- Changes to Android/iOS permissions in native manifests
- Major runtime engine changes

## Release Channels

Recommended channels:

- `dev`
- `staging`
- `production`

Use branch-channel mapping to prevent accidental production rollout.

## Safety Controls

- Roll out progressively
- Monitor crash and startup health
- Provide rollback path to previous update group

## References

- Expo Updates overview: [https://docs.expo.dev/eas-update/introduction/](https://docs.expo.dev/eas-update/introduction/)
- Deploy updates: [https://docs.expo.dev/eas-update/deployment/](https://docs.expo.dev/eas-update/deployment/)
