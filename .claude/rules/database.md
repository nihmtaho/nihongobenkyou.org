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

- Supabase never stores vocabulary content — no `word`, `reading`, or `meaning` columns anywhere
- All Supabase tables must have RLS enabled with `user_id = auth.uid()`; always UPSERT, never raw INSERT; conflict resolution: last-write-wins on `updated_at`
- `user_cards` UNIQUE: `(user_id, vocab_id)`; never add content columns to this table
- `vocab_id` is **frozen** — never use UUID/auto-increment; never change the algorithm after user data exists
- `vocabulary` in Dexie is read-only — seed once, update only on dataset version change
- No JOINs in IndexedDB — merge in hooks: `VocabItem + CardState → VocabWithSRS`
- All review writes: Dexie first (`pending_sync=true`) → background Supabase UPSERT
- New device onboarding: login → fetch `user_cards` → extract `book_source` → seed Dexie
