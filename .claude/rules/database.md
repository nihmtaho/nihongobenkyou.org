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
- `vocab_id` is **frozen** — never use UUID/auto-increment; never change the algorithm after user data exists
- `vocabulary` in Dexie is read-only — seed once, update only on dataset version change
- No JOINs in IndexedDB — merge in hooks: `vocabulary + srs_cards → VocabWithSRS`
- All review writes: Dexie first (`pending_sync=true`) → background Supabase UPSERT
- New device onboarding: login → fetch `srs_cards` snapshot → seed Dexie

## `srs_cards` — unified SRS table (Dexie v14+)

All SRS state lives in one table. The old `user_cards`, `kanji_cards`, and `custom_deck_srs` tables are **deleted**.

- Primary key: `[userId+cardId]`
- `cardType`: `'vocab' | 'kanji' | 'custom_vocab'`
- `deckId`: non-null only for `custom_vocab` cards
- Use compound indexes: `[userId+cardType]` for type queries, `[userId+deckId+due]` for deck queries
- Never query `db.srs_cards` directly — use helpers in `src/db/srs-cards.ts`

See `.claude/rules/srs.md` for FSRS field names, rating values, and scheduling rules.
