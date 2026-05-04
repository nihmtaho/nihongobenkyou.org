---
alwaysApply: true
paths:
  - "src/components/**"
  - "src/pages/**"
  - "src/routes/**"
  - "src/layouts/**"
  - "src/app.css"
---

# Error Handling Rules

- Catch at boundaries only: TanStack Query fetchers, Dexie operations, Supabase calls, route loaders, user input
- Classify errors in `src/api/` — never in components or hooks
- `NetworkError` → silent Dexie fallback; `AuthError` → re-throw (router redirects); `SyncError` → keep `pending_sync=true`; `SeedError` → re-throw (blocking error screen)
- `retry: 2` for Dexie-backed queries; `retry: 0` for Supabase mutations (double-write risk)
- Mutations require optimistic rollback: `onMutate` snapshot → `onError` restore; propagate `mutation.error` to component, not toasts
- Dexie: catch `QuotaExceededError` as a user-facing toast; never catch `OpenFailedError`; seed is all-or-nothing in a transaction
- Error boundaries: root (Dexie/seed failures), study routes (session errors), vocab list (lesson load) — use TanStack Router `errorComponent`
- `console.error` at the catch boundary only; never log JWT, Supabase anon key, or PII
