# CI/CD Pipeline Plan

This document defines the planned CI/CD checks and release gates for OfflineMate.

## Why This Pipeline Was Chosen

- Native + AI runtime projects fail late without early automation.
- Model-tier behavior and permission handling require repeatable checks.
- Security and dependency checks should block risky releases.

## CI Stages

1. Install dependencies
2. Lint and formatting checks
3. Type check
4. Unit tests
5. Build validation (Expo config + EAS profile lint)
6. Security checks (dependency audit, secret scan)

## CD Stages

- Build preview artifacts on merge to integration branch
- Build production artifacts on release tag
- Publish OTA updates to selected channel after smoke tests

## Quality Gates

- No high-severity vulnerabilities in production dependencies
- All required checks pass before merge
- Manual approval required for production releases

## Observability and Rollback

- Capture build metadata and artifact hashes
- Track release notes and update groups
- Support rollback to previous OTA update or prior store binary

## References

- EAS Build CI guide: [https://docs.expo.dev/build/building-on-ci/](https://docs.expo.dev/build/building-on-ci/)
- EAS Update CI guide: [https://docs.expo.dev/eas-update/github-actions/](https://docs.expo.dev/eas-update/github-actions/)
- GitHub Actions: [https://docs.github.com/actions](https://docs.github.com/actions)
