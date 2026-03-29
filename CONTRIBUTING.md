# Contributing to OfflineMate

This project is open source under the [MIT License](LICENSE.md).

## Contribution Model

- Pull requests welcome; keep changes focused and documented
- Work is tracked by architecture and implementation milestones
- Every significant change should include docs updates where it affects behavior or setup

## Branching and PR Rules

- Create feature branches from `main`
- Use small, focused pull requests
- Require at least one reviewer
- Require CI checks to pass before merge

A **Husky pre-commit** hook runs the same validation as CI locally (`npm run validate`). See **`docs/pre-commit.md`** for what runs, setup, and how to skip in emergencies.

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
