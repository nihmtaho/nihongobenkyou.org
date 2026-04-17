---
alwaysApply: true
paths:
  - "src/components/**"
  - "src/pages/**"
  - "src/routes/**"
  - "src/layouts/**"
  - "src/app.css"
---

# Error Handling

## Principles

- Catch at boundaries only: TanStack Query fetchers, Dexie operations, Supabase API calls, route loaders, user input handlers.
- Add context before re-throwing — a re-caught error with no added info is noise.
- Offline is not an error. Supabase unreachable → fall back to Dexie silently.
- Mutations fail loudly, queries fail gracefully.

---

## Error Taxonomy

| Class | Condition | Recovery |
|---|---|---|
| `NetworkError` | Supabase unreachable, timeout, 5xx | Silent Dexie fallback; queue sync |
| `AuthError` | 401, expired JWT | Re-throw → router redirects to `/auth/login` |
| `SyncError` | UPSERT flush failed | Keep `pending_sync=true`; retry on `online` |
| `SeedError` | Dexie seed from JSON failed | Re-throw → blocking error screen |
| `ValidationError` | Build pipeline rejects bad data | `process.exit(1)` with full entry + field |

Classify errors in `src/api/` before they reach hooks — never classify in components.

---

## TanStack Query

```ts
// Queries — let TanStack own error state, don't wrap queryFn unless adding context
useQuery({ queryFn: () => fetchVocabulary(bookId, lessonId), retry: 2, staleTime: Infinity })

// Offline fallback pattern
queryFn: async () => {
  try {
    const remote = await fetchUserCards(userId)
    await mergeIntoLocalCache(remote)
    return remote
  } catch (err) {
    if (err instanceof AuthError) throw err
    return readUserCardsFromDexie(userId, vocabIds)  // silent fallback
  }
}
```

- `retry: 2` for Dexie-backed queries. `retry: 0` for Supabase mutations (double-write risk).
- Expose `error` from `useQuery` to the component — never swallow it in the hook.

## Mutations — Explicit Rollback

```ts
useMutation({
  onMutate: async (variables) => {
    await queryClient.cancelQueries({ queryKey: ['srs-cards'] })
    const snapshot = queryClient.getQueryData(['srs-cards'])
    queryClient.setQueryData(['srs-cards'], applyOptimisticUpdate(variables))
    return { snapshot }  // MUST return — onError uses this
  },
  onError: (_err, _vars, context) => queryClient.setQueryData(['srs-cards'], context?.snapshot),
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['srs-cards'] }),
})
```

`onError` is not for toasts — propagate `mutation.error` to the component.

---

## Dexie / IndexedDB

- Wrap all Dexie writes in `try/catch`. Surface `QuotaExceededError` as a user-facing toast.
- Never catch `Dexie.OpenFailedError` — let it propagate to the error boundary.
- Seed is all-or-nothing: use a transaction; partial seed must throw `SeedError`.
- Migrations in `db/migrations.ts` must be idempotent.

---

## React Error Boundaries

| Location | Catches | Recovery UI |
|---|---|---|
| `routes/__root.tsx` | Dexie open failure, seed failure | Full-screen error + reload |
| `routes/srs/index.tsx`, `routes/study/$mode.tsx` | Study session errors | "Session failed — return home" |
| `components/vocabulary/VocabList.tsx` | Lesson load failures | Inline error + retry |

Use TanStack Router's `errorComponent` prop rather than class-based boundaries.

---

## Build Pipeline

Collect all errors in one pass, then `process.exit(1)` once. Log full entry + field name. Duplicate `vocab_id`: log both colliding entries side by side.

## Logging

- `console.error` at the boundary where caught — not at every re-throw.
- Production: send boundary errors to Sentry. Never log JWT, Supabase anon key, or user PII.
- `vocab_id` hashes: safe locally for sync debugging, never send to external services.
