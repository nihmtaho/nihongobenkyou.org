import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { db } from '../db/schema'
import { useUnifiedDueStats } from './useUnifiedDueStats'

const USER = 'test-unified-user'

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

const TODAY = new Date().toISOString().slice(0, 10)
const TOMORROW = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
const IN_5_DAYS = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10)

function makeCard(overrides: {
  cardId: string
  cardType: 'vocab' | 'kanji' | 'custom_vocab'
  due: string
  scheduled_days?: number
  deckId?: string | null
}) {
  return {
    userId: USER,
    cardId: overrides.cardId,
    cardType: overrides.cardType,
    deckId: overrides.deckId ?? null,
    state: 'review' as const,
    stability: 4.0,
    difficulty: 5.0,
    elapsed_days: 1,
    scheduled_days: overrides.scheduled_days ?? 10,
    reps: 3,
    lapses: 0,
    last_review: TODAY,
    due: overrides.due,
    last_rating: 3 as const,
    is_known: false,
    consecutive_correct: 2,
    pending_sync: false,
    updated_at: new Date().toISOString(),
  }
}

beforeEach(async () => {
  await db.srs_cards.clear()
  await db.kanji.clear()
})

afterEach(async () => {
  await db.srs_cards.clear()
  await db.kanji.clear()
})

describe('useUnifiedDueStats — per-type learning/review/mature', () => {
  it('vocabLearning counts only vocab cards with scheduled_days < 8', async () => {
    await db.srs_cards.bulkPut([
      makeCard({ cardId: 'v1', cardType: 'vocab', due: TOMORROW, scheduled_days: 3 }), // learning
      makeCard({ cardId: 'v2', cardType: 'vocab', due: TOMORROW, scheduled_days: 10 }), // review
      makeCard({ cardId: 'k1', cardType: 'kanji', due: TOMORROW, scheduled_days: 3 }), // kanji learning — not counted in vocab
    ])

    const { result } = renderHook(() => useUnifiedDueStats(USER), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data?.vocabLearning).toBe(1)
    expect(result.current.data?.kanjiLearning).toBe(1)
  })

  it('customDecksLearning counts only custom_vocab cards with reps >= 1 && scheduled_days < 7', async () => {
    await db.srs_cards.bulkPut([
      makeCard({ cardId: 'c1', cardType: 'custom_vocab', deckId: 'd1', due: TOMORROW, scheduled_days: 3 }), // learning (reps=3)
      makeCard({ cardId: 'c2', cardType: 'custom_vocab', deckId: 'd1', due: TOMORROW, scheduled_days: 25 }), // mature
      makeCard({ cardId: 'v1', cardType: 'vocab', due: TOMORROW, scheduled_days: 3 }), // vocab — not counted in custom
    ])

    const { result } = renderHook(() => useUnifiedDueStats(USER), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data?.customDecksLearning).toBe(1)
    expect(result.current.data?.customDecksMature).toBe(1)
  })
})

describe('useUnifiedDueStats — per-type upcoming', () => {
  it('vocabDueTomorrow counts only vocab cards due tomorrow', async () => {
    await db.srs_cards.bulkPut([
      makeCard({ cardId: 'v1', cardType: 'vocab', due: TOMORROW }),
      makeCard({ cardId: 'v2', cardType: 'vocab', due: IN_5_DAYS }),
      makeCard({ cardId: 'k1', cardType: 'kanji', due: TOMORROW }), // not counted in vocab
    ])

    const { result } = renderHook(() => useUnifiedDueStats(USER), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data?.vocabDueTomorrow).toBe(1)
    expect(result.current.data?.vocabDueThisWeek).toBe(1) // IN_5_DAYS is in days 2–7 window (tomorrow excluded)
    expect(result.current.data?.kanjiDueTomorrow).toBe(1)
  })

  it('vocabDueTomorrow excludes today-due cards', async () => {
    await db.srs_cards.bulkPut([
      makeCard({ cardId: 'v1', cardType: 'vocab', due: TODAY }),
      makeCard({ cardId: 'v2', cardType: 'vocab', due: TOMORROW }),
    ])

    const { result } = renderHook(() => useUnifiedDueStats(USER), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data?.vocabDueTomorrow).toBe(1)
  })
})
