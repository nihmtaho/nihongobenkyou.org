---
alwaysApply: true
paths:
  - "src/lib/srs.ts"
  - "src/lib/srs-utils.ts"
  - "src/db/srs-cards.ts"
  - "src/db/sync.ts"
  - "src/hooks/useSRS.ts"
  - "src/hooks/useReviewForecast.ts"
  - "src/types/srs.ts"
---

# SRS — FSRS-4.5 Guidelines

## Algorithm

The app uses **FSRS-4.5** via `ts-fsrs@5.3.3`. SM-2 was removed in Dexie v14.

```ts
import { fsrs, generatorParameters, Rating, State } from 'ts-fsrs'
const f = fsrs(generatorParameters({ enable_fuzz: false, request_retention: 0.9 }))
const result = f.repeat(card, now)          // returns Record<Rating, RecordLog>
const next   = result[Rating.Good]          // pick the chosen rating's outcome
```

## Ratings — always 1–4

| Constant | Value | Meaning |
|---|---|---|
| `SRSRating.Again` | `1` | Forgot / wrong |
| `SRSRating.Hard`  | `2` | Remembered with difficulty |
| `SRSRating.Good`  | `3` | Remembered correctly |
| `SRSRating.Easy`  | `4` | Remembered instantly |

**Never use `0` for Again.** Old SM-2 used 0–3; FSRS uses 1–4.

## Card States — string union

```ts
type CardState = 'new' | 'learning' | 'review' | 'relearning'
```

**Never use numeric enum values.** Convert ts-fsrs `State` enum ↔ `CardState` via `STATE_MAP` / `STATE_REVERSE` in `src/lib/srs.ts`.

## SRSCard shape (Dexie `srs_cards`)

```ts
interface SRSCard {
  userId:        string
  cardId:        string          // vocabId, kanji char, or custom vocab id
  cardType:      'vocab' | 'kanji' | 'custom_vocab'
  deckId:        string | null   // non-null for custom_vocab
  due:           string          // YYYY-MM-DD (date-only, no time)
  stability:     number
  difficulty:    number          // 1–10 scale (not ease factor)
  scheduled_days: number
  reps:          number
  lapses:        number
  state:         CardState
  last_rating:   SRSRating | null
  pending_sync:  boolean
  updated_at:    string          // ISO timestamp
  is_known:      boolean
}
```

### Field mapping (SM-2 → FSRS)

| SM-2 (deleted) | FSRS (current) | Notes |
|---|---|---|
| `due_date`     | `due`           | Date-only string |
| `interval_days`| `scheduled_days`| Days until next review |
| `ease_factor`  | `difficulty`    | Different scale: 1–10 |
| `rating` 0–3   | `last_rating` 1–4 | +1 offset |
| `state` enum   | `state` string  | `'new'|'learning'|'review'|'relearning'` |
| `user_cards`   | `srs_cards`     | Unified table for all card types |
| `kanji_cards`  | `srs_cards`     | cardType='kanji' |
| `custom_deck_srs` | `srs_cards` | cardType='custom_vocab' |

**Never use old field names in new code.**

## DB helpers — always use `src/db/srs-cards.ts`

```ts
getSRSCard(userId, cardId)                  // → SRSCard | undefined
upsertSRSCard(card)                         // write with pending_sync=true
initSRSCard(userId, cardId, cardType, deckId?)  // new card with FSRS defaults
getDueCards(userId, asOf?)                  // due today or overdue
getSRSCardsForDeck(userId, deckId)          // all cards in a deck
getDueCardsForDeck(userId, deckId, asOf?)
deleteSRSCardsForDeck(userId, deckId)
migrateSRSCardsUserId(oldUserId, newUserId)
```

Never query `db.srs_cards` directly from hooks or components — use these helpers.

## Scheduling

```ts
import { scheduleFSRS, initFSRSCard, formatIntervalPreview } from '../lib/srs'

// Rate a card
const result: FSRSResult = scheduleFSRS(existingCard, rating)
// result = { due, stability, difficulty, scheduled_days, reps, lapses, state, last_rating }

// Init new card
const fsrsFields = initFSRSCard()
// Merge into SRSCard with userId, cardId, cardType, deckId, pending_sync=true

// Preview intervals for rating bar
const preview = formatIntervalPreview(card)
// preview = { [1]: '10 min', [2]: '1 day', [3]: '3 days', [4]: '7 days' }
```

`scheduleFSRS` **never** persists — always call `upsertSRSCard` after scheduling.

## Due-date format

`due` is always `YYYY-MM-DD` (date string, no time component). Use:
```ts
const today = new Date().toISOString().slice(0, 10)
getDueCards(userId, today)   // cards where due <= today
```

For Dexie `between()` queries:
```ts
db.srs_cards.where('[userId+due]')
  .between([userId, '0000-00-00'], [userId, today], true, true)
```

## Lapses rule

Lapses are only incremented on `Review → Relearning` transitions (the card was in `state='review'` and rated `Again`). A new card rated `Again` does NOT increment lapses.

## `is_known` flag

Cards are auto-marked known when `scheduled_days >= 60 && reps >= 8`. The `is_known` flag is also togglable manually. Use `modify()` (not read+upsert) to update `is_known` to avoid TOCTOU races.

## Sync field mapping

Upload to `review_log` sends FSRS fields directly (`scheduled_days`, `stability`, `difficulty`, rating 1–4). The Supabase schema has been updated (migration `20260513000009_fsrs_columns.sql`) to accept both SM-2 (legacy) and FSRS fields.

Snapshot upload to `user_card_snapshots` still uses legacy SM-2 column names for backward compatibility:
- `interval_days: card.scheduled_days`
- `ease_factor:   Math.max(1.3, 3.18 - (card.difficulty - 1) * 0.188)`

Download fallback chain: `event.stability ?? event.interval_days ?? 1` (handles old rows that predate FSRS migration).

## `cardType` preservation

When rating a card via `useSRS`, always preserve the existing `cardType` and `deckId` from the source record. Never hardcode `cardType: 'vocab'` — custom_vocab cards must keep `cardType: 'custom_vocab'` and their `deckId`.
