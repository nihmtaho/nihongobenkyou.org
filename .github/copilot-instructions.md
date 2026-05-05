# Copilot Instructions

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Primary Rule Always to apply

**Always** follow the [karpathy-guidelines](.claude/rules/karpathy-guidelines.md) before working.

## Project Overview

Japanese vocabulary learning PWA for Vietnamese learners. Phase 1: Minna no Nihongo (Shokyuu I & II). **Offline-first**:

- **Content** (vocabulary, pitch, audio) — client-side only, IndexedDB (Dexie.js), seeded from YAML→JSON
- **Index** (SRS state) — Supabase PostgreSQL, cached in IndexedDB, background-synced

See `STRUCTURE.md` for directory layout. Detailed rules in `.claude/rules/` — read before writing code.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TanStack Router v1, TanStack Query v5, Zustand v5 |
| UI | shadcn/ui (Lyra) on Tailwind CSS v4 — "Raw Brutalist Editorial" theme |
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
pnpm dlx vitest run src/lib/srs.test.ts  # single test file
```

## Architecture

### Dependency Direction (enforced)

```
routes / components → hooks/ → db/ | api/ → lib/
```

`hooks/` is the only public interface for data — never skip this layer.

### Data Flow

```
YAML → build:dataset → public/data/{book_id}/lesson-XX.json
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

No JOINs in IndexedDB — merge in hooks: `vocabulary` + `user_cards` → `VocabWithSRS`.

### Zustand Stores

| Store | Responsibility |
|---|---|
| `studySessionStore` | Active study queue, current card index, mode, session stats |
| `settingsStore` | Theme, language, SRS config — persisted to `localStorage` |
| `authStore` | Supabase session mirror — `userId`, `isAuthenticated` |

## Key Constraints

- **SRS (SM-2)** — `src/lib/srs.ts`: ratings 0=Again/1=Hard/2=Good/3=Easy; ease min 1.3, default 2.5; interval max 180d
- **UI** — all styling in `src/app.css`; theme `data-theme="brutalist-{dataset}"`; use `--br-jp-font` for Japanese, never `--br-heading-font`
- **Auth guard** — protected routes under `src/routes/_authenticated.tsx`
- **Errors** — classify in `src/api/` only; see `.claude/rules/offline-first.md`
- **Testing** — see `.claude/rules/testing.md`

## Dataset Pipeline

`parse-yaml → enrich-pitch → generate-vocab-id → map-audio → validate → split-lessons → write-manifest`

Add dataset: create `datasets/<name>.yaml`, add to `src/lib/datasets.config.ts`, run `pnpm run build:dataset`.

## Git Workflow

- Always use `/create-pr` to open PRs — full rules in `.claude/rules/git-workflow.md`
- **Never push** `docs/**`, `specs/**`, `datasets/**`, `public/data/**`, or `*.local.*` to remote
- **Never add** `Co-Authored-By` trailers for any AI model to commits

## Documentation

All project documentation: `/Users/nihmtaho/Documents/Obsidian Vault/nihongobenkyo.org/`
