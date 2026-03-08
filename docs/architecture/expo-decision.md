# Framework Decision: Expo vs Alternatives

## Decision

Use Expo (with custom dev builds and EAS Build) as the primary application framework.

## Why Expo Was Chosen

- `react-native-executorch` integrates with Expo and Expo modules.
- EAS Build simplifies native build and signing workflows across iOS and Android.
- Expo first-party modules cover needed device capabilities (`sqlite`, calendar, contacts, files).
- Fast iteration speed is valuable for AI prompt and pipeline tuning.
- The target stack is already validated in production by Private Mind.

## Caveats and Mitigations

- Expo Go is not supported for native AI modules.
  - Mitigation: use custom dev builds from day one.
- SDK upgrade windows can temporarily cause dependency friction.
  - Mitigation: pin SDK versions and upgrade deliberately after validation.
- Some native libraries may need production-build-specific path handling.
  - Mitigation: include release-profile validation in CI and QA.

## Alternatives Considered

- Bare React Native:
  - Pros: full native control
  - Cons: slower setup and maintenance; more platform-specific overhead
- Flutter:
  - Pros: strong rendering and some on-device AI integrations
  - Cons: different ecosystem; less direct reuse of React Native ExecuTorch/RAG assets
- Fully native (Swift/Kotlin):
  - Pros: maximum native control
  - Cons: dual codebases and higher delivery cost

## Decision Outcome

Expo provides the best balance of delivery velocity, ecosystem fit, and production readiness.

## References

- Expo custom builds: [https://docs.expo.dev/custom-builds/get-started](https://docs.expo.dev/custom-builds/get-started)
- Expo Prebuild: [https://docs.expo.dev/workflow/prebuild/](https://docs.expo.dev/workflow/prebuild/)
- EAS build config: [https://docs.expo.dev/build/eas-json/](https://docs.expo.dev/build/eas-json/)
- React Native ExecuTorch: [https://www.npmjs.com/package/react-native-executorch](https://www.npmjs.com/package/react-native-executorch)
- Private Mind repository: [https://github.com/software-mansion-labs/private-mind](https://github.com/software-mansion-labs/private-mind)
