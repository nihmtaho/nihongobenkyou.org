## Summary

<!-- 1-3 bullet points describing what this PR does and why -->

-
-

## Type of Change

<!-- Check all that apply -->

- [ ] Feature (new functionality)
- [ ] Bug fix (non-breaking)
- [ ] Refactor (no behavior change)
- [ ] Test (adding or fixing tests)
- [ ] Chore (build, config, deps)
- [ ] Breaking change (requires migration or version bump)

## Related

<!-- Link to spec, issue, or feature branch spec directory -->

- Spec: `specs/<feature-id>/`
- Issue: #

## Pre-PR Checklist

<!-- All boxes must be checked before requesting review -->

### Code Quality
- [ ] `pnpm run lint` passes with no errors
- [ ] `pnpm run test:run` passes — all unit and integration tests green
- [ ] No `test.only` or `it.only` left in test files
- [ ] No `console.log` left in production code

### Architecture
- [ ] Dependency direction respected: `routes/components → hooks → db/api → lib`
- [ ] No Supabase calls skipping the hooks layer
- [ ] No vocabulary content stored in Supabase tables

### Offline-First (if touching data layer)
- [ ] Dexie write happens before Supabase write
- [ ] `pending_sync = true` set on every SRS write
- [ ] `NetworkError` handled silently with Dexie fallback
- [ ] `flushPendingSync()` not called inside a React component

### Database (if touching schema)
- [ ] `vocab_id` algorithm unchanged (`src/lib/vocab-id.ts`)
- [ ] Dexie migration version bumped if schema changed
- [ ] RLS policies added for any new Supabase tables

### UI (if touching components)
- [ ] All styles in `src/app.css` — no per-component CSS
- [ ] Japanese text uses `--br-jp-font` (Noto Sans JP), not `--br-heading-font`
- [ ] Tested on mobile viewport (375px)
- [ ] No FOUC for theme loading

### Files
- [ ] No `specs/**`, `docs/**`, `datasets/**`, `public/data/**` committed
- [ ] No `*.local.*` or secret files committed
- [ ] No dead code or commented-out blocks

## Test Plan

<!-- What was manually tested. Be specific about the flow. -->

- [ ]
- [ ]

## Screenshots

<!-- For UI changes. Before/after if relevant. Delete section if not applicable. -->

## Notes for Reviewer

<!-- Anything non-obvious, constraints, or known limitations -->
