# SRS System — FSRS-4.5 README

> **Migration note:** Dexie v14 replaced SM-2 (ratings 0–3, `user_cards` / `kanji_cards`) with FSRS-4.5 (ratings 1–4, unified `srs_cards`). All old field names are deleted.

---

## Table of Contents

1. [Overview](#overview)
2. [Ratings](#ratings)
3. [Card States](#card-states)
4. [SRSCard Shape](#srscard-shape)
5. [SM-2 → FSRS Field Map](#sm-2--fsrs-field-map)
6. [Scheduling a Card](#scheduling-a-card)
7. [DB Helpers](#db-helpers)
8. [Due-Date Queries](#due-date-queries)
9. [Lapses Rule](#lapses-rule)
10. [is_known Flag](#is_known-flag)
11. [Sync & Supabase](#sync--supabase)
12. [cardType Preservation](#cardtype-preservation)
13. [Quick Reference](#quick-reference)

---

## Overview

The app uses **FSRS-4.5** via [`ts-fsrs@5.3.3`](https://github.com/open-spaced-repetition/ts-fsrs).

Key differences from SM-2:

| | SM-2 (removed) | FSRS-4.5 |
|---|---|---|
| Ratings | 0–3 | **1–4** |
| Tables | `user_cards`, `kanji_cards`, `custom_deck_srs` | **`srs_cards`** (unified) |
| Interval field | `interval_days` | `scheduled_days` |
| Difficulty field | `ease_factor` (1.3–2.5) | `difficulty` (1–10) |
| State field | numeric enum | **string union** `'new'\|'learning'\|'review'\|'relearning'` |

---

## Ratings

```ts
// src/types/srs.ts
export type SRSRating = 1 | 2 | 3 | 4
```

| Value | Constant | Meaning |
|---|---|---|
| `1` | `Again` | Forgot / wrong answer |
| `2` | `Hard` | Remembered with difficulty |
| `3` | `Good` | Remembered correctly |
| `4` | `Easy` | Remembered instantly |

> ⚠️ **Never use `0`** — that was SM-2's `Again`. Using `0` with ts-fsrs is a no-op and will silently corrupt card state.

---

## Card States

```ts
// src/types/srs.ts
export type CardState = 'new' | 'learning' | 'review' | 'relearning'
```

| String | ts-fsrs enum | Meaning |
|---|---|---|
| `'new'` | `State.New` | Never reviewed |
| `'learning'` | `State.Learning` | In the initial learning phase (minutes/hours) |
| `'review'` | `State.Review` | Graduated — days/months between reviews |
| `'relearning'` | `State.Relearning` | Lapsed — back in short intervals after forgetting |

Convert between string and ts-fsrs `State` enum using the exported maps in `src/lib/srs.ts`:

```ts
import { STATE_MAP, STATE_REVERSE } from '../lib/srs'

const fsrsState: State  = STATE_MAP[card.state]      // 'review' → State.Review
const cardState: CardState = STATE_REVERSE[next.state] // State.Review → 'review'
```

> ⚠️ **Never store numeric state values** in Dexie or Supabase. Always convert to/from the string union.

---

## SRSCard Shape

```ts
// src/types/srs.ts
interface SRSCard {
  // Identity
  userId:             string
  cardId:             string          // vocab_id | kanji char | custom_vocabulary.id
  cardType:           'vocab' | 'kanji' | 'custom_vocab'
  deckId:             string | null   // null = textbook card; UUID = custom deck

  // FSRS-4.5 fields
  state:              CardState       // 'new' | 'learning' | 'review' | 'relearning'
  stability:          number          // days until P(recall) drops to 90%
  difficulty:         number          // 1–10 (not ease_factor)
  elapsed_days:       number          // days since last review
  scheduled_days:     number          // days until next review (was: interval_days)
  reps:               number          // total successful reviews
  lapses:             number          // times forgotten while in 'review' state
  last_review:        string          // YYYY-MM-DD
  due:                string          // YYYY-MM-DD

  // Rating
  last_rating:        SRSRating | null

  // Carry-over
  is_known:           boolean
  consecutive_correct: number

  // Sync
  pending_sync:       boolean
  updated_at:         string          // ISO 8601 timestamp
}
```

---

## SM-2 → FSRS Field Map

| SM-2 field (deleted) | FSRS field (current) | Notes |
|---|---|---|
| `due_date` | `due` | Same meaning, same `YYYY-MM-DD` format |
| `interval_days` | `scheduled_days` | Days to next review |
| `ease_factor` (1.3–2.5) | `difficulty` (1–10) | Inverse scale: low ease → high difficulty |
| `rating` (0–3) | `last_rating` (1–4) | Old `0 (Again)` → new `1 (Again)` |
| `state` (number enum) | `state` (string) | `'new'\|'learning'\|'review'\|'relearning'` |
| table: `user_cards` | table: `srs_cards` | `cardType='vocab'` |
| table: `kanji_cards` | table: `srs_cards` | `cardType='kanji'` |
| table: `custom_deck_srs` | table: `srs_cards` | `cardType='custom_vocab'` |

Migration formula used in Dexie v14 upgrade:

```ts
stability  = interval_days || 1
difficulty = clamp(10 - (ease_factor - 1.3) * 3.86, 1, 10)
last_rating = old_rating + 1   // 0–3 → 1–4
state = STATE_REVERSE[old_state]
```

---

## Scheduling a Card

Always go through `src/lib/srs.ts` — never call `ts-fsrs` directly from hooks or components.

```ts
import { scheduleFSRS, initFSRSCard, formatIntervalPreview } from '../lib/srs'
import { upsertSRSCard } from '../db/srs-cards'

// 1. Rate an existing card
const result: FSRSResult = scheduleFSRS(card, rating)   // rating: 1|2|3|4

// 2. Persist (scheduleFSRS never saves — always call upsert after)
await upsertSRSCard({
  ...card,
  ...result,
  last_rating: rating,
  pending_sync: true,
  updated_at: new Date().toISOString(),
})

// 3. Create a brand-new card
await initSRSCard(userId, cardId, 'vocab')    // from src/db/srs-cards.ts

// 4. Preview intervals for the rating bar
const preview = formatIntervalPreview(scheduledDays)  // e.g. '3d', '2mo', '1y'
```

> `scheduleFSRS` is **pure** — it returns new values but does not touch Dexie. Always call `upsertSRSCard` afterwards.

---

## DB Helpers

All Dexie access goes through **`src/db/srs-cards.ts`**. Never query `db.srs_cards` directly from hooks or components.

```ts
// Read
getSRSCard(userId, cardId)
  // → SRSCard | undefined

getDueCards(userId, today, cardType?)
  // → SRSCard[]  (due <= today, is_known=false)

getSRSCardsForDeck(userId, deckId)
  // → SRSCard[]  (all cards in a deck, any due date)

getDueCardsForDeck(userId, deckId, today)
  // → SRSCard[]  (due <= today, for one deck)

// Write
upsertSRSCard(card)
  // → void  (full record put, sets pending_sync=true before calling)

initSRSCard(userId, cardId, cardType, deckId?)
  // → void  (no-op if card already exists)

// Cleanup
deleteSRSCardsForDeck(userId, deckId)

// Auth migration
migrateSRSCardsUserId(oldUserId, newUserId)
```

---

## Due-Date Queries

`due` is always a `YYYY-MM-DD` string — no time component.

```ts
const today = new Date().toISOString().slice(0, 10)  // '2026-05-13'

// High-level (use this)
const dueCards = await getDueCards(userId, today)

// Low-level Dexie compound index (inside srs-cards.ts only)
db.srs_cards
  .where('[userId+due]')
  .between([userId, Dexie.minKey], [userId, today], true, true)
```

Cards with `due > today` are **not** due yet — do not show them in review sessions.

---

## Lapses Rule

```
lapses++ ONLY when: card.state === 'review' AND rating === 1 (Again)
```

A card rated `Again` while still in `'new'` or `'learning'` state does **not** increment lapses. This matches standard FSRS behaviour — ts-fsrs handles it automatically, but it's important to understand when reading lapse counts.

---

## `is_known` Flag

A card can be marked "known" in two ways:

1. **Auto**: `scheduled_days >= 7 && reps >= 3` after a successful review
2. **Manual**: user toggles via the UI

Rules:
- `is_known = true` cards are **excluded** from `getDueCards` results
- Always use `db.srs_cards.modify()` (not read + upsert) to toggle `is_known` to avoid TOCTOU races

```ts
// ✅ Correct
await db.srs_cards.where('[userId+cardId]').equals([userId, cardId]).modify({ is_known: true })

// ❌ Wrong — race condition
const card = await getSRSCard(userId, cardId)
await upsertSRSCard({ ...card, is_known: true })
```

---

## Sync & Supabase

### Upload (`review_log`)

FSRS fields are sent directly:

| Dexie field | Supabase column |
|---|---|
| `last_rating` (1–4) | `rating` |
| `scheduled_days` | `scheduled_days` |
| `stability` | `stability` |
| `difficulty` | `difficulty` |

### Snapshot (`user_card_snapshots`)

The snapshot table still uses SM-2 column names for backwards compatibility. Map when writing:

```ts
interval_days: card.scheduled_days,
ease_factor:   Math.max(1.3, 3.18 - (card.difficulty - 1) * 0.188),
```

### Download fallback chain

Old rows (pre-FSRS) lack `stability`/`difficulty`. Use:

```ts
stability:      event.stability   ?? event.interval_days ?? 1
difficulty:     event.difficulty  ?? 5
scheduled_days: event.scheduled_days ?? event.interval_days ?? 1
```

### Supabase migration

`supabase/migrations/20260513000009_fsrs_columns.sql` adds:
- `scheduled_days`, `stability`, `difficulty` columns (nullable) to `review_log`
- Relaxes rating `CHECK` from `0–3` to `0–4`
- Makes SM-2 columns (`interval_days`, `ease_factor`) nullable

> Apply this migration before deploying the FSRS client to production.

---

## `cardType` Preservation

When rating a card, **always read `cardType` and `deckId` from the existing record** — never hardcode them.

```ts
// ✅ Correct
const existing = await getSRSCard(userId, cardId)
await upsertSRSCard({
  ...existing,
  ...scheduleFSRS(existing, rating),
  cardType: existing.cardType,   // preserve — could be 'custom_vocab'
  deckId:   existing.deckId,     // preserve — could be a UUID
  last_rating: rating,
  pending_sync: true,
  updated_at: new Date().toISOString(),
})

// ❌ Wrong — overwrites custom_vocab cards
await upsertSRSCard({ ...result, cardType: 'vocab', deckId: null })
```

---

## Quick Reference

```
Ratings:    1=Again  2=Hard  3=Good  4=Easy   (never 0)
States:     'new' | 'learning' | 'review' | 'relearning'   (never numeric)
Due field:  'YYYY-MM-DD'   (no time component)
Table:      srs_cards   (replaces user_cards + kanji_cards + custom_deck_srs)

Schedule:   scheduleFSRS(card, rating)  →  FSRSResult   (src/lib/srs.ts)
Init:       initFSRSCard()              →  FSRS defaults (src/lib/srs.ts)
Persist:    upsertSRSCard(card)         →  Dexie put     (src/db/srs-cards.ts)
Query due:  getDueCards(userId, today)  →  SRSCard[]     (src/db/srs-cards.ts)
```
