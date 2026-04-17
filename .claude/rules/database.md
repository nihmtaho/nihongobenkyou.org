---
alwaysApply: true
paths: 
  - "src/api/**"
  - "src/db/**"
  - "src/lib/vocab-id.ts"
  - "src/lib/dexie.ts"
  - "src/lib/supabase.ts"
  - "src/hooks/**"
  - "src/stores/**"
  - "src/seed/**"
---
# Database Rules

## Architecture: Content-Index Split

| Layer | Storage | Role |
|---|---|---|
| **Content** | IndexedDB (Dexie.js) only | Vocabulary, pitch, audio — read-only, never synced |
| **Index/State** | Supabase (primary) + IndexedDB (cache) | `vocab_id` + SRS state — always synced |

**Supabase never stores vocabulary content.** No `word`, `reading`, or `meaning` columns anywhere.

---

## Supabase

- All tables **must** have RLS enabled. Default policy: `user_id = auth.uid()`.
- PK default: `gen_random_uuid()`. Conflict resolution: last-write-wins on `updated_at`.
- Always use UPSERT when syncing — never raw INSERT without conflict handling.

### `user_cards` Table

| Column | Type | Constraint |
|---|---|---|
| `id` | uuid | PK, `gen_random_uuid()` |
| `user_id` | uuid | FK → `auth.users(id)` ON DELETE CASCADE |
| `vocab_id` | text | NOT NULL |
| `book_source` | text | NOT NULL |
| `interval_days` | integer | NOT NULL, default 1 |
| `ease_factor` | float4 | NOT NULL, default 2.5 |
| `due_date` | date | NOT NULL |
| `review_count` | integer | NOT NULL, default 0 |
| `last_rating` | smallint | NULL — 0=Again, 1=Hard, 2=Good, 3=Easy |
| `updated_at` | timestamptz | NOT NULL, default `now()` |

UNIQUE: `(user_id, vocab_id)`. Never add content columns to this table.

`book_source` values: `'minna_shokyuu_1'`, `'minna_shokyuu_2'`, `'tango_n5'`, etc.
`leaderboard_weekly` is a materialized view — do not write directly. Custom vocabulary (UGC) is the only exception to the no-content rule.

---

## Dexie.js (IndexedDB)

| Table | Primary Key | Key Indexes |
|---|---|---|
| `vocabulary` | `vocab_id` | `book_source`, `lesson_number`, `[book_source+lesson_number]`, `jlpt_level` |
| `lessons` | `lesson_id` | `book_source`, `lesson_number` |
| `user_cards` | `[userId+vocabId]` | `due_date`, `pending_sync`, `[userId+dueDate]` |
| `streaks` | `date` | `userId` |
| `settings` | `key` | — |
| `sync_queue` | `id` | `created_at`, `status` |
| `kanji` | `char` | `jlpt_level`, `radical`, `stroke_count` |
| `kanji_cards` | `[userId+char]` | `due_date`, `pending_sync` |

- `vocabulary` is read-only — seed once, update only on dataset version change.
- No SQL JOINs. Merge in hooks: `VocabItem + CardState → VocabWithSRS`.
- All review writes go to Dexie first (`pending_sync = true`). Background sync flushes to Supabase.

---

## `vocab_id` — CRITICAL, FROZEN ALGORITHM

```
input = `${bookSource}:${lessonNumber}:${kanji ?? kana}:${kana}`
vocabId = `${bookCodePrefix}_${sha256(input).slice(0, 16)}`
// Example: 'minna_shokyuu_1:3:食べる:たべる' → 'mnn1_a3f9c12e8b4d7f91'
```

- **Never** use auto-increment or UUID for `vocab_id`.
- **Never** change this algorithm after user data exists in Supabase — destroys all SRS state.
- Same function in build pipeline and client seed — lives in `src/lib/vocab-id.ts`.

---

## Sync Flow

1. App starts → load from Dexie (instant, offline-capable).
2. Background: fetch `user_cards` from Supabase → merge into Dexie → invalidate query.
3. On review: write Dexie optimistically (`pending_sync = true`) → return success immediately.
4. Background sync: UPSERT `pending_sync` cards to Supabase. Conflict: keep latest `updated_at`.

**New Device:** Login → fetch `user_cards` → extract `book_source` → download dataset JSON → seed Dexie.

---

## Dataset Versioning

- `vocab_id` values are immutable — never change across updates.
- Deprecated words: `deprecated = true`, never delete.
- **Patch** (1.0.x): content fixes — update changed lessons only.
- **Minor** (1.x.0): new fields — re-seed full dataset, SRS unaffected.
- **Major** (x.0.0): schema change — migration script + full Dexie re-seed required.
