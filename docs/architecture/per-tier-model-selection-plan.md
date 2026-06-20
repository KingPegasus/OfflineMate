# Per-Tier Model Selection Plan

This document defines the implementation plan to support model selection within each tier (Lite, Standard, Full), not just tier-only selection.

Related docs:

- [model-comparison-and-selection.md](./model-comparison-and-selection.md)
- [model-and-capability-tiers.md](./model-and-capability-tiers.md)
- [../tech/models.md](../tech/models.md)

## Problem Statement

OfflineMate currently supports:

- Tier selection for all users.
- Variant selection in Standard tier only.

This creates an uneven experience:

- Lite and Full users cannot switch between alternates in-app.
- Settings and onboarding behavior are not fully aligned.
- Download behavior for alternates is less explicit.

## Goals

1. Allow users to select a model within the active tier (Lite, Standard, Full).
2. Persist model choice per tier.
3. Keep runtime loading, readiness checks, and fallback behavior consistent.
4. Make download behavior clear before users send a message.

## Non-Goals (Initial Rollout)

- Dynamic benchmark-based automatic model selection.
- Background multi-model prefetch by default.
- Replacing the tier system itself.

## Current Baseline

- Registry supports `primary` and `alternates` per tier.
- Runtime supports `resolveModelForTier(tier, modelId)`.
- Standard tier uses `standardModelId` with a Settings picker.
- Lite and Full still load primary-only.
- Onboarding downloads primary tier model only.

## Target Architecture

### 1) Settings Store

Replace Standard-only state with tier-scoped state:

```ts
tierModelIds: {
  lite: string | null;
  standard: string | null;
  full: string | null;
}
```

Rules:

- `null` means tier primary.
- Invalid model ids normalize to `null`.
- Add migration from prior versions (`standardModelId` -> `tierModelIds.standard`).

### 2) Model Resolution

Use one accessor path everywhere:

- `getActiveModelId(tier)` from settings.
- `resolveModelForTier(tier, activeModelId)` for runtime and assets.

This removes per-tier conditional logic spread across screens/hooks.

### 3) UI

In `Settings`:

- Show model variant list for selected tier, not only Standard.
- Display active model metadata (family, size, id, default marker).
- Show readiness state per model:
  - Downloaded
  - Not downloaded
  - Downloading

### 4) Download and Readiness

Keep current lazy alternate download behavior for initial release:

- Primary can still be prepared during onboarding.
- Alternates can download on first use.

Add explicit user messaging:

- Inform when selected model is not downloaded yet.
- Keep progress visible through existing initialization download state.

## Implementation Phases

### Phase 1: Core Data and Runtime Wiring

Scope:

- Add `tierModelIds` and migration.
- Replace `standardModelId` references with tier-scoped helpers.
- Ensure chat initialization passes selected model for all tiers.

Acceptance criteria:

- Changing model in any tier updates active model after reload.
- Existing users migrate without data loss or crashes.
- Invalid persisted model ids safely fall back to primary.

### Phase 2: Settings UX Expansion

Scope:

- Add picker UI for Lite and Full.
- Add selected/default markers and concise model details.
- Keep active model card accurate for all tiers.

Acceptance criteria:

- User can select model inside Lite/Standard/Full.
- UI always reflects selected model and tier.
- Switching models cancels in-flight model load safely.

### Phase 3: Readiness and Messaging

Scope:

- Improve readiness checks for selected model assets.
- Improve copy for missing assets and first-use downloads.
- Optionally add a manual "Download now" action in Settings.

Acceptance criteria:

- Errors reference selected model and tier accurately.
- First-use behavior is predictable and understandable.

### Phase 4: Optional Onboarding Alignment

Scope:

- Allow choosing model variant during onboarding.
- Download selected variant during onboarding flow.

Acceptance criteria:

- New users can finish onboarding with chosen model ready.
- Existing onboarding flow remains valid if skipped.

## Test Plan

Unit tests:

- Settings migration to tier-scoped state.
- Model id normalization per tier.
- Model resolution fallback behavior.

Integration tests:

- End-to-end selection -> load path for each tier.
- Fallback behavior after load failure.

Manual QA:

- Switch variants repeatedly while app is idle/generating.
- Confirm persistence after restart.
- Validate messaging for not-yet-downloaded model.

## Risks and Mitigations

- Risk: stale persisted ids after registry changes.
  - Mitigation: normalize ids against current tier model list.
- Risk: user confusion around lazy download.
  - Mitigation: explicit readiness labels and first-use messaging.
- Risk: race conditions during model switch/load.
  - Mitigation: keep `cancelPendingLoad` on variant switch and validate generation guards.

## Suggested Delivery Order

1. Phase 1 + Phase 2 in one PR (core functionality).
2. Phase 3 in a follow-up PR (UX polish).
3. Phase 4 only if onboarding experience is prioritized.

## Definition of Done

- Per-tier model selection works in app for all three tiers.
- Runtime and readiness paths use selected model consistently.
- Docs are updated (this plan + model selection references).
- Tests cover migration and selection behavior.
