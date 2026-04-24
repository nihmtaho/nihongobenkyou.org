# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Japanese vocabulary learning PWA targeting Vietnamese learners. Phase 1 focuses on Minna no Nihongo (Shokyuu I & II). **Offline-first architecture** with a strict content/index split:

- **Content** (vocabulary, pitch, audio) — client-side only in IndexedDB (Dexie.js), seeded from YAML→JSON pipeline
- **Index** (SRS state per user) — Supabase PostgreSQL, cached in IndexedDB, synced in background

See `STRUCTURE.md` for full directory layout. Detailed rules are in `.claude/rules/` (offline-first, error-handling, testing, database, yaml-database, frontend-design, code-quality, git-workflow, speckit-provider).

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TanStack Router v1, TanStack Query v5 |
| UI | DaisyUI v5 on Tailwind CSS v4 — "Raw Brutalist Editorial" theme |
| UI State | Zustand v5 |
| Local DB | Dexie.js (IndexedDB) |
| Remote DB | Supabase (Auth, PostgreSQL, Realtime) |
| Testing | Vitest, @testing-library/react, MSW, fake-indexeddb, Playwright |
| Deploy | AWS S3 + CloudFront + Route 53 |

## Commands

```bash
pnpm run dev              # Dev server
pnpm run build            # Production build (run build:dataset first)
pnpm run build:dataset    # YAML → JSON pipeline
pnpm run lint
pnpm run test             # Vitest watch mode
pnpm run test:run         # Vitest single run (CI)
pnpm run test:e2e         # Playwright E2E
pnpm run test:coverage
pnpm dlx vitest run src/lib/srs.test.ts  # single test file
```

## Architecture

### Dependency Direction (enforced)

```
routes / components
        ↓
      hooks/          ← only public interface for data; never skip this layer
       ↓   ↓
    db/   api/        ← Dexie and Supabase implementations
        ↓
      lib/            ← pure functions (vocab-id, srs, pitch)
```

### Data Flow

```
YAML → build:dataset → public/data/{book_id}/lesson-XX.json + manifest.json
                              ↓ (app start)
                        Dexie `vocabulary` (seeded once, read-only)
                              ↓ (review)
                        Dexie `user_cards` (optimistic write, pending_sync=true)
                              ↓ (background sync)
                        Supabase `user_cards` (UPSERT, last-write-wins on updated_at)
```

### `vocab_id` — CRITICAL, FROZEN ALGORITHM

```ts
// src/lib/vocab-id.ts — shared between build pipeline and client seed
const input = `${bookSource}:${lessonNumber}:${kanji ?? kana}:${kana}`
const vocabId = `${bookCodePrefix}_${sha256(input).slice(0, 16)}`
// Example: 'minna_shokyuu_1:3:食べる:たべる' → 'mnn1_a3f9c12e8b4d7f91'
```

**Never change this algorithm after user data exists in Supabase.** It destroys all SRS state.

### Dexie Tables

| Table | Primary Key | Key Indexes |
|---|---|---|
| `vocabulary` | `vocab_id` | `book_source`, `lesson_number`, `[book_source+lesson_number]`, `jlpt_level` |
| `lessons` | `lesson_id` | `book_source`, `lesson_number` |
| `user_cards` | `[userId+vocabId]` | `due_date`, `pending_sync`, `[userId+dueDate]` |
| `sync_queue` | `id` | `created_at`, `status` |
| `streaks` | `date` | `userId` |
| `settings` | `key` | — |
| `kanji` | `char` | `jlpt_level`, `radical`, `stroke_count` |
| `kanji_cards` | `[userId+char]` | `due_date`, `pending_sync` |

No JOINs in IndexedDB. Merge in hooks: `vocabulary` + `user_cards` → `VocabWithSRS`. On new device: login → fetch `user_cards` → extract `book_source` → download dataset JSON → seed Dexie.

### Zustand Stores

| Store | Responsibility |
|---|---|
| `studySessionStore` | Active study queue, current card index, mode, session stats |
| `settingsStore` | Theme, language, SRS config — persisted to `localStorage` |
| `authStore` | Supabase session mirror — `userId`, `isAuthenticated` |

### Dataset Build Pipeline

```
parse-yaml → enrich-pitch → generate-vocab-id → map-audio → validate → split-lessons → write-manifest
```

Validation rejects: missing `kana`/`meaning.en`/`meaning.vi`, duplicate `vocab_id`, incomplete `examples` blocks.

### Adding a New Dataset

1. Create `datasets/<name>.yaml` following the schema in `.claude/rules/yaml-database.md`
2. Add one entry to `src/lib/datasets.config.ts`
3. Run `pnpm run build:dataset`

No route, hook, component, or store changes required — the registry drives everything.

### Error Classification

Classify errors in `src/api/` before they reach hooks. Never classify in components.

| Class | Condition | Hook behaviour |
|---|---|---|
| `NetworkError` | Supabase unreachable, timeout, 5xx | Silent Dexie fallback |
| `AuthError` | 401, expired JWT | Re-throw → router redirects to `/auth/login` |
| `SyncError` | UPSERT flush failed | Keep `pending_sync=true`; retry on `online` |
| `SeedError` | Dexie seed from JSON failed | Re-throw → blocking error screen |

`retry: 2` for Dexie-backed queries. `retry: 0` for Supabase mutations (double-write risk).

## Key Constraints

**Supabase `user_cards`** — no vocabulary content, only `vocab_id` + SRS columns. UNIQUE on `(user_id, vocab_id)`. RLS on all tables (`user_id = auth.uid()`).

**SRS (SM-2)** — `src/lib/srs.ts` → `calculateNextReview(card, rating)`. Ratings: 0=Again, 1=Hard, 2=Good, 3=Easy. Ease factor min 1.3, default 2.5. Interval max 180 days.

**Testing** — do not mock Dexie (use `fake-indexeddb`); do not mock SM-2; use MSW for Supabase REST interception. Test fixtures in `src/__fixtures__/vocabulary.ts` use real `vocab_id` hashes computed by the real hash function — never hardcoded strings.

**UI** — all visual styling in `src/app.css` (custom DaisyUI theme) — no per-component CSS. Per-dataset theme: `data-theme="brutalist-{dataset}"` on `<html>`, state in `settingsStore`, persisted to `localStorage`, loaded before first render to avoid FOUC. Never use `--br-heading-font` (Barlow Condensed) for Japanese text — it has no kana/kanji glyphs. Always use `--br-jp-font` (Noto Sans JP) for Japanese content.

## Git Workflow

- `main` — protected, never force-push
- `develop` — protected; all features merge here via PR with owner approval
- Feature branches: base off `develop`; naming from `.specify/` speckit extension
- `release/**` — created from `develop`; every release tagged `vX.Y.Z`
- **Never push** `docs/**`, `specs/**`, `datasets/**`, `public/data/**`, or `*.local.*` to remote
- **Never add** `Co-Authored-By` trailers for any AI model to commits pushed to remote

### Creating a Pull Request

**Always use `/create-pr` skill** when opening a PR. It enforces mandatory pre-flight checks in order:

1. Branch validation (must be feature or release branch)
2. Forbidden-file guard (`specs/**`, `docs/**`, `datasets/**`, `public/data/**`, `*.local.*`, `.env*`)
3. Task completion check (warns if `tasks.md` has unchecked items)
4. `pnpm run lint` — must pass
5. `pnpm run test:run` — all tests green, no `test.only`/`it.only`
6. `pnpm exec tsc --noEmit` — no type errors
7. Commit any staged changes (never `--no-verify`)
8. Push + open PR using `.github/PULL_REQUEST_TEMPLATE.md`

PRs from feature branches target `develop`. PRs from `release/**` target `main`.
Never skip checks or use `--no-verify`.

## Documentation

All project documentation: `/Users/nihmtaho/Documents/Obsidian Vault/nihongobenkyo.org/`

## TanStack Intent Skills

Install after scaffolding to give Claude Code version-aligned guidance for TanStack Router:

```bash
npx @tanstack/intent install @tanstack/router-core    # 10 skills
npx @tanstack/intent install @tanstack/router-plugin  # 1 skill (Vite plugin)
```

TanStack Query v5 has no Intent skills yet. `@tanstack/react-start` and `@tanstack/ai` are not used in this project.

## Active Technologies
- TypeScript 5.x (strict mode), Node.js 22.x (pinned via `.nvmrc`) + React 19, Vite 6, TanStack Router v1, TanStack Query v5, Zustand v5, Tailwind CSS v4, DaisyUI v5, Dexie.js v4, Framer Motion v11, `@antfu/eslint-config` (ESLint v9 flat config), Husky v9, lint-staged, Vitest, `@testing-library/react`, `fake-indexeddb`, Playwright, `vite-plugin-pwa` (001-prd-phase1-specs)
- IndexedDB via Dexie.js v4 (schema-only in this phase; no Supabase) (001-prd-phase1-specs)
- TypeScript 5.x (strict mode), Node.js 22.x (pinned via `.nvmrc`) + Dexie.js v4 (IndexedDB), `fake-indexeddb` (testing), Vitest (testing), yaml (npm), js-yaml (002-data-pipeline)
- `public/data/{book_id}/lesson-{NN}.json` + `manifest.json` (local filesystem); Dexie IndexedDB (client runtime) (002-data-pipeline)

## Recent Changes
- 001-prd-phase1-specs: Added TypeScript 5.x (strict mode), Node.js 22.x (pinned via `.nvmrc`) + React 19, Vite 6, TanStack Router v1, TanStack Query v5, Zustand v5, Tailwind CSS v4, DaisyUI v5, Dexie.js v4, Framer Motion v11, `@antfu/eslint-config` (ESLint v9 flat config), Husky v9, lint-staged, Vitest, `@testing-library/react`, `fake-indexeddb`, Playwright, `vite-plugin-pwa`

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at `specs/004-study-modes/plan.md`.
<!-- SPECKIT END -->
