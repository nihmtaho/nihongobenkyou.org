---
name: create-pr
description: Create a pull request with pre-flight checks — lint, tests, forbidden-file guard, task completion verification, then open PR using the project template.
user-invocable: true
---

# Create Pull Request

Run all mandatory pre-flight checks, then push and open a pull request targeting `develop` (or `main` for release branches) using the project PR template at `.github/PULL_REQUEST_TEMPLATE.md`.

---

## Step 1 — Verify Branch

```bash
git rev-parse --abbrev-ref HEAD
```

- If on `main` or `develop`: **stop** and tell the user to switch to a feature branch.
- Feature branch pattern: `^[0-9]{3,}-` (e.g., `001-feature-name`).
- Release branch pattern: `^release/` → PR target is `main`.
- All other branches → PR target is `develop`.

---

## Step 2 — Check for Forbidden Files

Run:

```bash
git diff --cached --name-only
git diff --name-only
git ls-files --others --exclude-standard
```

**Fail immediately** (do not proceed) if any staged, unstaged, or untracked files match:

- `specs/**`
- `docs/**`
- `datasets/**`
- `public/data/**`
- `*.local.*`
- `.env*` (any `.env` file)

List the offending files and tell the user to remove them before continuing.

---

## Step 3 — Verify Task Completion

Check if `.specify/feature.json` or `specs/<feature-id>/tasks.md` exists for the current feature.

If `tasks.md` exists:
- Read it and check for any unchecked tasks (`- [ ]`).
- If unchecked tasks remain: list them and **warn** the user. Ask: "There are incomplete tasks. Continue creating the PR anyway? (yes/no)"
- If user says no: stop.

---

## Step 4 — Run Pre-flight Checks (in order)

Run each check. On any failure: show the full error output, **stop**, and tell the user to fix before re-running `/create-pr`.

### 4a. Lint

```bash
pnpm run lint
```

### 4b. Unit & Integration Tests

```bash
pnpm run test:run
```

Verify:
- Exit code 0.
- No `test.only` or `it.only` in any test file:

```bash
grep -r "test\.only\|it\.only\|describe\.only" src/ --include="*.ts" --include="*.tsx" -l
```

If matches found: list the files and stop.

### 4c. TypeScript Build Check

```bash
pnpm exec tsc --noEmit
```

---

## Step 5 — Stage and Commit (if uncommitted changes)

If there are uncommitted changes after the checks pass:

1. Show the user a `git status` summary.
2. Ask for a commit message (or suggest one based on the branch name and changed files).
3. Stage and commit using the project convention:

```bash
git add <specific files — never git add -A blindly>
git commit -m "<message>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

Never stage forbidden files. Never use `--no-verify`.

---

## Step 6 — Push to Remote

```bash
git push -u origin <branch-name>
```

If push is rejected: diagnose the cause. Do **not** force-push to `main` or `develop`. For feature branches, explain the conflict and ask the user how to proceed.

---

## Step 7 — Gather PR Context

Collect context for the PR body:

```bash
git log develop..HEAD --oneline          # or main..HEAD for release branches
git diff develop..HEAD --stat
```

From this, derive:
- **Summary bullets** (what changed and why)
- **Type of change** (feature / bugfix / refactor / test / chore / breaking)
- **Related spec** (from `.specify/feature.json` if present: `feature.id`, `feature.name`)
- **Test plan** (what was verified in Steps 4a–4c + any manual steps)

---

## Step 8 — Create the Pull Request

Use `gh pr create` with the template filled in. Populate every section — do not leave placeholder text. Use a HEREDOC to pass the body:

```bash
gh pr create \
  --title "<concise title under 70 chars>" \
  --base <target-branch> \
  --body "$(cat <<'EOF'
## Summary

- <bullet 1>
- <bullet 2>

## Type of Change

- [x] <checked type>

## Related

- Spec: `specs/<feature-id>/`
- Issue: #

## Pre-PR Checklist

### Code Quality
- [x] `pnpm run lint` passes with no errors
- [x] `pnpm run test:run` passes — all unit and integration tests green
- [x] No `test.only` or `it.only` left in test files
- [x] No `console.log` left in production code

### Architecture
- [x] Dependency direction respected: `routes/components → hooks → db/api → lib`
...

## Test Plan

- [x] <step 1>
- [x] <step 2>

## Notes for Reviewer

<non-obvious context or known limitations>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Only pre-check the items that were actually verified in Steps 4a–4c. Leave UI/database/offline-first items unchecked if they are not applicable to this PR. Never fabricate checked items.

---

## Step 9 — Report

After the PR is created, output:

- PR URL
- Target branch
- Which pre-flight checks passed
- Any warnings (e.g., incomplete tasks that the user chose to ignore)

---

## Failure Recovery

If any step fails, output:

```
[create-pr] FAILED at Step <N> — <reason>
Fix the issue and re-run /create-pr to resume from the beginning.
```

Do not attempt to skip failed checks or use `--no-verify`.
