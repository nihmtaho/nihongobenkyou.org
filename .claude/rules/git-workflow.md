---
alwaysApply: true
---

# Git workflow

## Branches:

- The main branch is protected is `main`. Never use force-push to this main branch.
- The development branch protected is `develop`. Every feature want to merge to the develop branch is always create pull request and waiting for approve by the owner repo.
- **Every feature** branches must to create with base is `develop` branch.
- The branch name for feature need to following the rule name from `speckit (.specify/)` extension.
- The release branch is `release/**`. Create from development branch.
- Every release always need a github tag `vX.Y.Z`. Create from the release branch.

## Pull Requests

- **Always** use the `/create-pr` skill when creating a PR — it runs mandatory pre-flight checks before opening.
- PR template is at `.github/PULL_REQUEST_TEMPLATE.md` — GitHub applies it automatically; fill every section.
- PRs from feature branches always target `develop`.
- PRs from `release/**` branches always target `main`.
- Every PR must have owner approval before merging.
- Never merge without all pre-flight checks passing (lint, test:run, tsc --noEmit).

### Pre-PR Checklist (enforced by `/create-pr`)

1. `pnpm run lint` — zero errors
2. `pnpm run test:run` — all tests green, no `test.only`/`it.only`
3. `pnpm exec tsc --noEmit` — no type errors
4. No forbidden files staged: `specs/**`, `docs/**`, `.docs/**`, `datasets/**`, `public/data/**`, `*.local.*`, `.env*`
5. Feature tasks verified complete (or user explicitly acknowledges incomplete tasks)

## Best Practices

- **Never** upload the `specs/**`, `docs/**`, `.docs/**` into remote.
- **Never** upload any config or local file only use for local into remote.
- **Never** add `Co-Authored-By` trailers for any AI model (Claude, GitHub Copilot, ChatGPT, etc.) to commits pushed to remote. AI assistance is an implementation detail, not a co-author.
