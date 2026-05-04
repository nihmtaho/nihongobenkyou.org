---
alwaysApply: true
description: Offline-first architecture rules for data flow and sync.
---

# Offline-First Rules

- Dexie is the primary read source — Supabase is background-only, never blocking a render
- `staleTime: Infinity` for `vocabulary`/`lessons`/`kanji`; `staleTime: 0` for `user_cards`
- Every SRS write: Dexie first (`pending_sync=true`) → fire-and-forget Supabase sync; never reverse the order
- Classify errors in `src/api/` only — `NetworkError` → silent Dexie fallback; `AuthError` → re-throw; `SyncError` → keep `pending_sync=true`; `SeedError` → re-throw
- `flushPendingSync()` lives only in `src/db/sync.ts`, triggered on `window.online` — never called from a component
- Dataset update: show toast first, re-seed atomically in a transaction, preserve `user_cards`
- Never cache Supabase REST responses in the Service Worker
