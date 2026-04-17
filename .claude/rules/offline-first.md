---
alwaysApply: true
description: This file defines the offline-first rules for the app's architecture and data flow.
---

# Offline-First Rules

## Core Principle

The app MUST function fully after first load with no network access. Supabase being unreachable is a **runtime mode**, not an error. Components must never block on a Supabase response.

---

## Read Path — Always Serve from Dexie First

```
Component renders
      ↓
useQuery fetches from Dexie (instant, offline-capable)
      ↓ (background, non-blocking)
Supabase fetch → merge into Dexie → invalidate query
```

- Hooks MUST return Dexie data immediately; Supabase is a background refresh, not a prerequisite.
- `staleTime: Infinity` for read-only content (`vocabulary`, `lessons`, `kanji`) — never re-fetch from Supabase.
- `staleTime: 0` for SRS state (`user_cards`) — always re-validate on mount, but serve Dexie cache instantly.

---

## Write Path — Dexie First, Always

Every SRS review write MUST follow this exact sequence:

1. Write to Dexie `user_cards` (optimistic) — set `pending_sync = true`.
2. Return success to the component immediately.
3. Background sync flushes `pending_sync` records to Supabase via UPSERT.

```ts
// CORRECT — Dexie first, Supabase async
async function writeSRSResult(userId: string, result: ReviewResult) {
  await db.user_cards.put({ ...result, pending_sync: true })  // step 1 — always succeeds locally
  flushPendingSync().catch(() => {})                           // step 2 — fire-and-forget
}

// WRONG — Supabase first blocks offline users
async function writeSRSResult(userId: string, result: ReviewResult) {
  await supabase.from('user_cards').upsert(result)  // ❌ fails offline
  await db.user_cards.put(result)
}
```

---

## Error Classification at the API Boundary

Classify errors in `src/api/` before they reach hooks:

| Error class | Condition | Hook behaviour |
|---|---|---|
| `NetworkError` | Supabase unreachable, timeout, 5xx | Silent Dexie fallback |
| `AuthError` | 401, expired JWT | Re-throw — router redirects to `/auth/login` |
| `SyncError` | UPSERT failed | Keep `pending_sync=true`, retry on `online` event |
| `SeedError` | Dexie seed from JSON failed | Re-throw — show blocking error screen |

```ts
// src/api/user-cards.ts
if (error) {
  if (isAuthError(error)) throw new AuthError(error.message)
  throw new NetworkError(error.message)   // everything else → Dexie fallback in hook
}
```

---

## Hook Pattern — Offline Fallback

```ts
// hooks/useUserCards.ts
export function useUserCards(userId: string, vocabIds: string[]) {
  return useQuery({
    queryKey: ['user-cards', userId, vocabIds],
    queryFn: async () => {
      try {
        const remote = await fetchUserCards(userId)
        await mergeIntoLocalCache(remote)       // update Dexie with fresh Supabase data
        return remote
      } catch (err) {
        if (err instanceof AuthError) throw err  // let error boundary handle
        return readUserCardsFromDexie(userId, vocabIds)  // silent Dexie fallback
      }
    },
  })
}
```

---

## Sync Queue Durability Rules

- `pending_sync = true` records MUST NOT be cleared until Supabase UPSERT confirms success.
- On failure: keep `pending_sync = true`, schedule retry on the next `online` event.
- `src/db/sync.ts` `flushPendingSync()` is the sole place that sets `pending_sync = false`.
- Never call `flushPendingSync()` inside a component — only from the sync engine or on `online` event.

```ts
// Register once in main.tsx or a top-level effect
window.addEventListener('online', () => flushPendingSync())
```

---

## Service Worker Caching Strategy

| Asset | Strategy | TTL |
|---|---|---|
| App shell (HTML, JS, CSS) | Cache First | Until new deploy |
| `manifest.json` | Network First | 5 min |
| `lesson-XX.json` | Cache First | Until checksum changes |
| Audio files | Cache First | Permanent |
| Supabase API responses | Network Only | — |

Do not cache Supabase REST responses in the Service Worker — Dexie is the offline cache for data.

---

## Dataset Update Safety

`manifest.json` checksum mismatch MUST:
1. Show a user-visible update toast — never auto-reload during an active study session.
2. Re-seed Dexie inside a transaction (atomic — partial seed MUST throw `SeedError`).
3. Only clear `vocabulary` and `lessons` tables, not `user_cards` (SRS state survives dataset updates).

---

## What NOT to Do

- ❌ `await supabase...` at the top of a hook's `queryFn` without a catch for `NetworkError`
- ❌ Setting `pending_sync = false` before the Supabase UPSERT response arrives
- ❌ Blocking the study session render on a Supabase response
- ❌ Calling `flushPendingSync()` inside a React component
- ❌ Caching Supabase API responses in the Service Worker
