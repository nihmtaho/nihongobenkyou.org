# Testing Rules

- Do not mock Dexie — use `fake-indexeddb` for real operations in memory
- Do not mock SM-2 or `vocab_id` — test with real inputs
- Mock Supabase via MSW; mock `howler` audio module; stub Service Worker
- Fixtures: 3–5 real MinnaNoDS entries in `src/__fixtures__/vocabulary.ts`; `vocab_id` computed by real hash function, never hardcoded
- Unit tests co-located with source; integration in `src/__tests__/integration/`; E2E in `e2e/`
- Coverage priority: SM-2 → `vocab_id` → sync flush → Dexie seed → auth guard
- Test behavior not implementation — no CSS class or test-id assertions unless unavoidable
- Async: use `waitFor`; no `setTimeout` delays; use `vi.useFakeTimers()` for timing-sensitive tests
- SRS boundaries: rating 0 (Again) and 3 (Easy), `ease_factor` clamped ≥ 1.3, `due_date` always future after Good/Easy, `pending_sync=true` immediately after any Dexie write
- No `test.only` / `it.only` committed; no `console` suppression without a justifying comment
