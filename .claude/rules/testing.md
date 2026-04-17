# Testing Rules

## Stack

| Tool | Purpose |
|---|---|
| **Vitest** | Unit and integration test runner |
| **@testing-library/react** | Component testing — user-event driven |
| **@testing-library/user-event** | Simulates real user interactions |
| **MSW (Mock Service Worker)** | Intercepts network requests in tests — do not mock `fetch` manually |
| **Dexie.js fake-indexeddb** | In-memory IndexedDB for Dexie tests (`fake-indexeddb` package) |
| **Playwright** | E2E tests for critical user flows |

---

## What to Test

### Unit Tests

- Pure functions: SM-2 algorithm (`calculateNextReview`), `vocab_id` hash generation, pitch pattern utilities.
- YAML/JSON data transformers: pipeline parse logic, field mapping, checksum generation.
- Zustand stores: state transitions (study session queue, current card index, mode).

### Integration Tests

- TanStack Query hooks: `useVocabulary`, `useDueCards`, `useSRSMutation` — use MSW to intercept Supabase calls.
- Dexie read/write operations: seed, query by index, `pending_sync` flag lifecycle.
- Offline fallback: simulate network failure → verify Dexie serves data without Supabase.
- Sync queue: verify `pending_sync=true` records flush correctly on reconnect.

### E2E Tests (Playwright)

- Flashcard review flow: open SRS page → review card → submit rating → verify due date updated.
- Auth flow: register → login → verify profile loaded.
- Offline flow: disable network → verify app still renders vocabulary and accepts reviews.
- Dataset update flow: manifest checksum mismatch → toast appears → user confirms → Dexie re-seeded.

---

## Rules

### Do Not Mock

- **Do not mock Dexie.** Use `fake-indexeddb` to run real Dexie operations in memory. Mocking Dexie hides schema and index errors.
- **Do not mock the SM-2 algorithm.** Test it directly with known inputs and expected outputs — it is pure and fast.
- **Do not mock `vocab_id` generation.** It must be deterministic — test with real inputs to catch any drift.

### Boundaries to Mock

- Supabase client: use MSW handlers to intercept `fetch` calls to the Supabase REST API.
- Audio playback (`howler`): mock the module — audio is not testable in jsdom.
- Service Worker: stub in unit/integration tests; test in Playwright with real SW registration.

### Test Data

- Use a fixed subset of real MinnaNoDS data (3–5 vocabulary entries) as test fixtures — not invented words.
- Store fixtures under `src/__fixtures__/vocabulary.ts`.
- All `vocab_id` values in fixtures must be computed by the real hash function, not hardcoded strings.

### File Naming

- Unit tests: co-located with source — `src/lib/srs.test.ts` alongside `src/lib/srs.ts`.
- Integration tests: `src/__tests__/integration/` directory.
- E2E tests: `e2e/` directory at project root.
- Test files: `*.test.ts` / `*.test.tsx` / `*.spec.ts` for Playwright.

### Coverage Priorities (in order)

1. SM-2 algorithm — correctness is critical; wrong intervals break the learning experience.
2. `vocab_id` hash — must stay stable; any change destroys Supabase SRS state.
3. Sync queue flush — data loss risk if offline writes are not replayed correctly.
4. Dexie seed and migration — wrong seed corrupts local content.
5. Auth guard routes — unauthenticated access to protected pages must be blocked.

### Component Testing

- Test behavior, not implementation. Query by role, label, or visible text — not by class or test-id unless unavoidable.
- For flashcard components, simulate swipe/click and assert the next card renders — do not inspect internal state.
- Do not test Tailwind class names or CSS custom properties — test rendered output and user-visible behavior.

### Async

- Use `waitFor` from `@testing-library/react` for async state updates.
- Do not use arbitrary `setTimeout` delays in tests. If a test requires timing, use `vi.useFakeTimers()` and advance explicitly.

### SRS-Specific

- Test SM-2 with boundary values: `rating=0` (Again), `rating=3` (Easy), `ease_factor` clamped at 1.3 minimum.
- Test that `due_date` is always set to a future date after a Good/Easy rating, never the past.
- Test that `pending_sync` is set to `true` immediately after any review write to Dexie.

---

## Running Tests

```bash
npm run test          # Vitest watch mode
npm run test:run      # Vitest single run (CI)
npm run test:e2e      # Playwright E2E
npm run test:coverage # Vitest with coverage report
```

---

## CI Requirements

- All unit and integration tests must pass before merging to `develop`.
- E2E smoke tests (auth + flashcard review flow) run on every PR to `main`.
- No `test.only` or `it.only` committed — these block other tests silently in CI.
- No `console.log` or `console.error` suppression in test setup unless explicitly justified with a comment.
