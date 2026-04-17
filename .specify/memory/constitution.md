# NihongoBenkyou.org Constitution

## Core Principles

### I. Content-Index Split (NON-NEGOTIABLE)

Vocabulary content (word forms, readings, meanings, pitch accent, audio) MUST live
client-side only in IndexedDB (Dexie.js), seeded from the YAML→JSON build pipeline.
Supabase MUST NOT store vocabulary content — only `vocab_id` + SRS state columns.

The only exception is `custom_vocabulary`: user-generated content (UGC) is not
copyrighted textbook data and MAY be stored in Supabase.

Rationale: copyright compliance for textbook content, minimal sync payload (~50 bytes/card),
and natural offline support — all three collapse if content moves to the cloud.

### II. Offline-First

The app MUST function fully after first load without any network access. This means:

- Dexie is the primary read store; components MUST NOT block on Supabase responses.
- All SRS review writes go to Dexie first (optimistic), with `pending_sync = true`.
- Supabase is a sync target, not a prerequisite. `NetworkError` → fall back to Dexie silently.
- `AuthError` (401 / expired JWT) is the only Supabase error that MUST interrupt the user.

Service Worker MUST cache: app shell, `manifest.json` (Network First, 5 min TTL),
all `lesson-XX.json` files (Cache First), and audio files (Cache First).

### III. Immutable `vocab_id` Algorithm

The hash function in `src/lib/vocab-id.ts` is FROZEN:

```
vocab_id = bookCodePrefix + "_" + sha256(bookSource + ":" + lesson + ":" + (kanji ?? kana) + ":" + kana).slice(0, 16)
```

This algorithm MUST NOT be changed after any user data exists in Supabase.
Any change destroys all SRS state for every user.

The same function MUST run at build time (pipeline) and at client seed time.
They MUST stay in sync — the shared file is the single source of truth.

Deprecated vocabulary entries MUST be marked `deprecated: true`, never deleted,
to preserve `vocab_id` stability across dataset versions.

### IV. Dependency Inversion — No Layer Skipping

The import dependency direction is strictly enforced:

```
routes / components  →  hooks/  →  db/ | api/  →  lib/
```

- Components and routes MUST import data only through `hooks/`.
- Hooks MAY import from `db/` and `api/`.
- `lib/` MUST contain only pure functions with no side effects.
- No layer MAY skip downward (e.g., a component importing directly from `db/`).

Each directory has one responsibility (SRP). New datasets require only an entry in
`src/lib/datasets.config.ts` — no route, hook, component, or store changes (OCP).

### V. Test Fidelity — Never Mock Core Invariants

Three things MUST NEVER be mocked in tests:

- **Dexie** — use `fake-indexeddb` for real in-memory IndexedDB operations.
  Mocking Dexie hides schema and index errors.
- **SM-2 algorithm** (`src/lib/srs.ts`) — test with real inputs and expected outputs.
- **`vocab_id` generation** (`src/lib/vocab-id.ts`) — must be deterministic;
  test with real inputs to catch any drift.

Supabase REST API calls MUST be intercepted via MSW — not manual `fetch` mocks.
Test fixtures MUST use real MinnaNoDS vocabulary entries (stored in
`src/__fixtures__/vocabulary.ts`); all `vocab_id` values MUST be computed
by the real hash function, not hardcoded strings.

### VI. Brutalist Design System — DaisyUI Semantic Only

All visual styling MUST be expressed through the custom DaisyUI theme in `src/app.css`.
Per-component CSS MUST NOT be written. DaisyUI semantic classes (`btn`, `card`, `badge`,
`stats`, `dock`, etc.) are the base layer.

Per-dataset theme is applied via `data-theme="brutalist-{dataset}"` on `<html>`.
Theme state lives in `settingsStore`, persisted to `localStorage`, loaded before
first render to prevent FOUC.

The heading font (`--br-heading-font`: Barlow Condensed) MUST NEVER be applied to
Japanese text — it has no kana/kanji glyphs. All Japanese content MUST use
`--br-jp-font` (Noto Sans JP).

## Data Safety Constraints

These constraints enforce the integrity of user SRS data across dataset updates and
multi-device sync:

- **Last-write-wins on `updated_at`**: Supabase `user_cards` conflict resolution uses
  `UPSERT ON CONFLICT (user_id, vocab_id) DO UPDATE SET ... WHERE excluded.updated_at > user_cards.updated_at`.
- **Seed is atomic**: `seedDatabase()` MUST run inside a Dexie transaction. A partial seed
  MUST throw `SeedError` and abort — partial seeds corrupt local content state.
- **Dataset versioning**: Patch bump → update changed lessons only. Minor bump → re-seed
  full dataset (SRS unaffected). Major bump → migration script + full Dexie re-seed required.
- **`manifest.json` checksum**: Client MUST compare the fetched checksum against the value
  stored in Dexie `settings`. Mismatches trigger a user-visible update toast — never an
  automatic silent reload during a study session.
- **Sync queue durability**: `pending_sync = true` records MUST NOT be cleared until
  the Supabase UPSERT confirms success. On failure, keep `pending_sync = true` and
  retry on the next `online` event.

## Development Workflow

- **Package manager**: `pnpm` MUST be used for all dependency installation and script
  execution. `npm` and `npx` are FORBIDDEN — use `pnpm` and `pnpm dlx` respectively.
  Rationale: consistent lockfile (`pnpm-lock.yaml`), disk-efficient store, and deterministic
  installs across developer machines and CI.
- **Branch strategy**: `main` (protected, deploy target) ← `develop` (protected, integration)
  ← `feature/*` (base off `develop`, named via `.specify/` speckit extension).
- **Release**: `release/**` branches cut from `develop`; every release tagged `vX.Y.Z`.
- **PR gate**: All unit and integration tests MUST pass before merging to `develop`.
  E2E smoke tests (auth + flashcard review + offline flow) run on every PR to `main`.
- **Build order**: `pnpm run build:dataset` MUST run before `pnpm run build`.
  CI MUST enforce this order.
- **Never push to remote**: `datasets/**` (YAML source), `docs/**`, `specs/**`,
  `public/data/**` (generated), `*.local.*` files.
- **Performance targets** (enforced in CI on PRs to `main`):
  Lighthouse PWA ≥ 90 | Performance ≥ 85 | Accessibility ≥ 90 | SEO ≥ 90.
  Bundle ≤ 500 KB gzip. LCP ≤ 2.5 s. CLS ≤ 0.1.

## Governance

This constitution supersedes all other practices. Where a `.claude/rules/` file conflicts
with a principle here, the constitution takes precedence.

**Amendment procedure**:
1. Propose the change with rationale in a PR description targeting `develop`.
2. Owner approval required before merge.
3. Bump `CONSTITUTION_VERSION` per semver (MAJOR: governance/principle removal or redefinition;
   MINOR: new principle or material expansion; PATCH: clarification or wording).
4. Update `LAST_AMENDED_DATE` to the merge date (ISO format).
5. Run consistency propagation: check `.specify/templates/plan-template.md` Constitution Check
   gates, `spec-template.md`, and `tasks-template.md` for alignment.

**Compliance**: Every PR to `develop` MUST include a Constitution Check section in the
plan confirming all six principles are satisfied or explicitly justified if deviated.

**Runtime guidance**: `.claude/rules/` files provide implementation-level detail.
`CLAUDE.md` provides command reference and architecture overview.
`STRUCTURE.md` provides the canonical directory layout.

**Version**: 1.1.1 | **Ratified**: 2026-04-13 | **Last Amended**: 2026-04-16
