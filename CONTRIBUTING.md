# Contributing to OfflineMate

This repository is currently maintained as a private-team project.

## Contribution Model

- Internal contributions only (for now)
- Work is tracked by architecture and implementation milestones
- Every significant change should include docs updates

## Branching and PR Rules

- Create feature branches from `main`
- Use small, focused pull requests
- Require at least one reviewer
- Require CI checks to pass before merge

Recommended branch names:

- `feat/<area>-<summary>`
- `fix/<area>-<summary>`
- `docs/<area>-<summary>`

## Commit Style

Use clear commit messages with intent:

- `feat: add model tier registry`
- `fix: handle model OOM fallback`
- `docs: add android release guide`

## Code Quality Standards (Planned)

- TypeScript strict mode enabled
- ESLint and Prettier enforced
- No secrets in source control
- Avoid platform-specific assumptions without guards

## Testing Expectations (Planned)

- Unit tests for core logic (intent routing, prompt builder, model tier selection)
- Integration tests for local pipelines (RAG retrieval, tool invocation)
- Device tests for Lite/Standard/Full tiers

## Documentation Requirements

When changing architecture or infra behavior, update:

- `docs/architecture/*` for design changes
- `docs/deployment/*` for release/deploy changes
- `docs/tech/*` for runtime/model/algorithm details

## Security and Privacy

- Follow `SECURITY.md`
- Treat all user data as sensitive by default
- Keep assistant data local unless explicitly implementing opt-in sync
