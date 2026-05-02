# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Primary Rule Always to apply

**Alway** following the [karpathy-guidelines](.claude/rules/karpathy-guidelines.md) before to work.

## Project Overview

Japanese vocabulary learning PWA targeting Vietnamese learners. Phase 1 focuses on Minna no Nihongo (Shokyuu I & II). **Offline-first architecture** with a strict content/index split:

- **Content** (vocabulary, pitch, audio) — client-side only in IndexedDB (Dexie.js), seeded from YAML→JSON pipeline
- **Index** (SRS state per user) — Supabase PostgreSQL, cached in IndexedDB, synced in background

See `STRUCTURE.md` for full directory layout. Detailed rules are in `.claude/rules/` — read them before writing code.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TanStack Router v1, TanStack Query v5, Zustand v5 |
| UI | DaisyUI v5 on Tailwind CSS v4 — "Raw Brutalist Editorial" theme |
| Local DB | Dexie.js v4 (IndexedDB) |
| Remote DB | Supabase (Auth, PostgreSQL, Realtime) |
| Testing | Vitest, @testing-library/react, MSW, fake-indexeddb, Playwright |
| Deploy | AWS S3 + CloudFront + Route 53 |

Full version list: `.claude/rules/tech-stack.md`

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
| `vocabulary` | `vocab_id` | `book_source`, `lesson_number`, `[book_source+lesson_number]` |
| `lessons` | `lesson_id` | `book_source`, `lesson_number` |
| `user_cards` | `[userId+vocabId]` | `due_date`, `pending_sync`, `[userId+dueDate]` |
| `kanji_cards` | `[userId+char]` | `due_date`, `pending_sync` |
| `kanji` | `char` | `jlpt_level`, `radical`, `stroke_count` |
| `sync_queue` | `id` | `created_at`, `status` |
| `streaks` | `date` | `userId` |
| `settings` | `key` | — |

No JOINs in IndexedDB — merge in hooks: `vocabulary` + `user_cards` → `VocabWithSRS`. On new device: login → `db/onboarding.ts` fetches `user_cards` → extracts `book_source` → seeds Dexie.

### Zustand Stores

| Store | Responsibility |
|---|---|
| `studySessionStore` | Active study queue, current card index, mode, session stats |
| `settingsStore` | Theme, language, SRS config — persisted to `localStorage` |
| `authStore` | Supabase session mirror — `userId`, `isAuthenticated` |

### Error Classification

Classify in `src/api/` before errors reach hooks. Never classify in components.

| Class | Condition | Hook behaviour |
|---|---|---|
| `NetworkError` | Supabase unreachable, timeout, 5xx | Silent Dexie fallback |
| `AuthError` | 401, expired JWT | Re-throw → router redirects to `/auth/login` |
| `SyncError` | UPSERT flush failed | Keep `pending_sync=true`; retry on `online` |
| `SeedError` | Dexie seed from JSON failed | Re-throw → blocking error screen |

`retry: 2` for Dexie-backed queries. `retry: 0` for Supabase mutations (double-write risk).

## Key Constraints

**SRS (SM-2)** — `src/lib/srs.ts` → `calculateNextReview(card, rating)`. Ratings: 0=Again, 1=Hard, 2=Good, 3=Easy. Ease factor min 1.3, default 2.5. Interval max 180 days.

**Testing** — do not mock Dexie (use `fake-indexeddb`); do not mock SM-2; use MSW for Supabase REST interception. Fixtures in `src/__fixtures__/vocabulary.ts` use real `vocab_id` hashes — never hardcoded strings.

**UI** — all visual styling in `src/app.css` — no per-component CSS. Theme: `data-theme="brutalist-{dataset}"` on `<html>`. Never use `--br-heading-font` (Barlow Condensed) for Japanese — use `--br-jp-font` (Noto Sans JP).

**Auth guard** — protected routes live under `src/routes/_authenticated.tsx`. Unauthenticated users are redirected to `/auth/login`.

## Dataset Pipeline

```
parse-yaml → enrich-pitch → generate-vocab-id → map-audio → validate → split-lessons → write-manifest
```

To add a new dataset: create `datasets/<name>.yaml`, add entry to `src/lib/datasets.config.ts`, run `pnpm run build:dataset`. No other code changes required.

## Git Workflow

- `main` protected; `develop` protected — all features merge here via PR with owner approval
- Feature branches base off `develop`; naming from `.specify/` speckit extension
- **Always use `/create-pr`** to open PRs — enforces lint + test:run + tsc + forbidden-file checks
- **Never push** `docs/**`, `specs/**`, `datasets/**`, `public/data/**`, or `*.local.*` to remote
- **Never add** `Co-Authored-By` trailers for any AI model to commits

## Documentation

All project documentation: `/Users/nihmtaho/Documents/Obsidian Vault/nihongobenkyo.org/`
