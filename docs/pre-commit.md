# Pre-commit hook (Husky)

Commits run the same **validation steps as CI** (see [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) so local failures match what GitHub Actions would report.

## What runs on every commit

The `validate` npm script executes **in order**:

| Step | Command | Purpose |
|------|---------|---------|
| 1 | `npm run typecheck` | `tsc --noEmit` |
| 2 | `npm run lint` | `eslint .` |
| 3 | `npm run test:unit` | Vitest unit tests |
| 4 | `npm run test:integration` | Vitest integration tests |
| 5 | `npm run test:e2e` | Vitest e2e tests |
| 6 | `npm run test:perf` | Vitest perf smoke tests |
| 7 | `npm audit --audit-level=high` | Fail on high+ severity advisories |

CI also runs `npm ci` on a clean checkout; the hook uses your **existing** `node_modules` (same as a normal local dev loop).

## How it is wired

1. **[Husky](https://typicode.github.io/husky/)** (`devDependency`) — Git `core.hooksPath` points at `.husky` after `npm install` via the **`prepare`** script in `package.json`.
2. **`.husky/pre-commit`** — single line: `npm run validate` (see that file for the exact hook body).
3. **`package.json` → `scripts.validate`** — chains the commands above so CI and the hook stay in sync (change one place if the pipeline changes).

## Setup for new clones

```bash
npm install
```

`prepare` runs automatically and registers the hook. No extra step unless Husky was skipped (e.g. `npm install --ignore-scripts`).

If **`npm install` fails** (for example `patch-package` cannot apply a patch), fix that first. After a successful install, if hooks still do not run, register manually:

```bash
npx husky
```

## Skip the hook (emergency only)

```bash
# Unix / Git Bash
HUSKY=0 git commit -m "message"

# PowerShell
$env:HUSKY=0; git commit -m "message"
```

Use sparingly; prefer fixing validate failures so CI stays green.

## Troubleshooting

- **Slow commits:** The full suite can take ~10–20s+ depending on machine; that is expected for “full CI parity.”
- **`npm audit` fails:** Resolve or bump vulnerable deps; CI will fail the same way on `main` / PRs.
- **Hook not running:** Run `npm install` (with scripts enabled) and check `git config core.hooksPath` is `.husky` (relative to repo root).

## Related docs

- [Intent routing](./intent-routing.md) — product routing rules (unrelated to hooks; listed for doc navigation).
