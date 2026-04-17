# Copilot Instructions — nihongobenkyou.org

Japanese vocabulary learning PWA for Vietnamese learners (Minna no Nihongo, Shokyuu I & II). Offline-first architecture with a strict content/index split.

## Commands

```bash
pnpm run dev              # Dev server
pnpm run build:dataset    # YAML → JSON pipeline — MUST run before build
pnpm run build            # Production build
pnpm run lint             # ESLint
pnpm run test             # Vitest watch mode
pnpm run test:run         # Vitest single run (CI)
pnpm run test:coverage    # Coverage report
pnpm run test:e2e         # Playwright E2E

# Run a single test file
pnpm dlx vitest run src/lib/srs.test.ts
```

## Architecture

### Dependency Direction (strictly enforced — no skipping layers)

```
routes / components
        ↓
      hooks/          ← sole public interface for all data access
       ↓   ↓
    db/   api/        ← Dexie (IndexedDB) and Supabase implementations
        ↓
      lib/            ← pure functions only (no side effects)
```

Components and routes **never** import from `db/` or `api/` directly.

### Content-Index Split (non-negotiable)

| Layer | Storage | What lives here |
|---|---|---|
| **Content** | IndexedDB (Dexie.js) only | Vocabulary, pitch, audio, lessons — seeded from YAML→JSON pipeline, read-only |
| **Index** | Supabase PostgreSQL + IndexedDB cache | `vocab_id` + SRS state per user |

Supabase **never** stores vocabulary content. The only link between layers is `vocab_id`.

### Data Flow

```
YAML source → pnpm run build:dataset → public/data/{book_id}/lesson-XX.json
                                             ↓ (app start)
                                       Dexie `vocabulary` (seeded once)
                                             ↓ (review)
                                       Dexie `user_cards` (optimistic write, pending_sync=true)
                                             ↓ (background sync)
                                       Supabase `user_cards` (UPSERT, last-write-wins on updated_at)
```

## Key Conventions

### `vocab_id` — FROZEN ALGORITHM

```ts
// src/lib/vocab-id.ts — shared by build pipeline and client seed
const input = `${bookSource}:${lessonNumber}:${kanji ?? kana}:${kana}`
const vocabId = `${bookCodePrefix}_${sha256(input).slice(0, 16)}`
// e.g. 'minna_shokyuu_1:3:食べる:たべる' → 'mnn1_a3f9c12e8b4d7f91'
```

**Never change this algorithm after user data exists in Supabase** — it destroys all SRS state. Deprecated words get `deprecated: true`, never deleted.

### Hooks: Application-Level Joins

IndexedDB has no JOINs. Merge tables in hooks, not components:
1. Query `vocabulary` → `VocabItem[]`
2. Query `user_cards` → `Map<vocab_id, CardState>`
3. Merge in the hook → `VocabWithSRS`

### SRS Algorithm (SM-2)

`src/lib/srs.ts` — `calculateNextReview(card, rating)`. Ratings: `0`=Again, `1`=Hard, `2`=Good, `3`=Easy. Ease factor: min 1.3, default 2.5. Interval max: 180 days.

### Offline Handling

Supabase unreachable is a runtime mode, not an error. `NetworkError` → fall back to Dexie silently. Only `AuthError` (401/expired JWT) interrupts the user. All SRS writes go to Dexie first (`pending_sync=true`), flushed to Supabase by `src/db/sync.ts` on reconnect.

### Testing Rules

- **Never mock Dexie** — use `fake-indexeddb` for real in-memory operations
- **Never mock SM-2 or `vocab_id`** — test with real inputs/expected outputs
- **Use MSW** to intercept Supabase REST calls — not manual `fetch` mocks
- Test fixtures live in `src/__tests__/fixtures/vocabulary.ts` — real MinnaNoDS entries with `vocab_id` values computed by the real hash function

### Theming

All visual styling lives in `src/app.css` (custom DaisyUI theme) — no per-component CSS. Apply dataset theme via `data-theme="brutalist-{dataset}"` on `<html>`; state in `settingsStore`, persisted to `localStorage`, loaded before first render (avoids FOUC).

**Never use `--br-heading-font` (Barlow Condensed) for Japanese text** — it has no kana/kanji glyphs. Always use `--br-jp-font` (Noto Sans JP) for Japanese content.

### Adding a New Dataset

1. Create `datasets/<name>.yaml`
2. Add one entry to `src/lib/datasets.config.ts`
3. Run `pnpm run build:dataset`

No route, hook, component, or store changes required.

### Zustand Stores

| Store | Scope |
|---|---|
| `studySessionStore` | Active study queue, current card, mode, session stats |
| `settingsStore` | Theme, language, SRS config — persisted to `localStorage` |
| `authStore` | Supabase session mirror — `userId`, `isAuthenticated` |

### Git Workflow

- `main` — protected, deploy target; never force-push
- `develop` — protected; all features merge here via PR
- Feature branches: base off `develop`
- **Never push**: `datasets/**`, `docs/**`, `specs/**`, `public/data/**`, `*.local.*`
