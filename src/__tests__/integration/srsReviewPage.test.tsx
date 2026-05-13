import type { SRSCard } from '../../types/srs'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sampleVocabulary } from '../../__fixtures__/vocabulary'
import { db } from '../../db/schema'
import { useDueCards } from '../../hooks/useDueCards'

vi.mock('../../db/sync', () => ({ uploadPendingReviews: vi.fn().mockResolvedValue(undefined), downloadNewReviews: vi.fn().mockResolvedValue(undefined) }))

const TEST_USER_ID = 'test-user-srs'
const PAST_DATE = '2020-01-01'
const FUTURE_DATE = new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10)

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

function makeCard(vocabIdx: number, overrides: Partial<SRSCard> = {}): SRSCard {
  const vocab = sampleVocabulary[vocabIdx]
  return {
    userId: TEST_USER_ID,
    cardId: vocab.vocab_id,
    cardType: 'vocab',
    deckId: null,
    state: 'review',
    stability: 1,
    difficulty: 5,
    elapsed_days: 0,
    scheduled_days: 1,
    reps: 1,
    lapses: 0,
    last_review: PAST_DATE,
    due: PAST_DATE,
    last_rating: null,
    is_known: false,
    consecutive_correct: 0,
    pending_sync: false,
    updated_at: `${PAST_DATE}T00:00:00Z`,
    ...overrides,
  }
}

beforeEach(async () => {
  await db.srs_cards.clear()
  await db.vocabulary.clear()
  await db.review_log.clear()
})

afterEach(async () => {
  await db.srs_cards.clear()
  await db.vocabulary.clear()
  await db.review_log.clear()
})

describe('useDueCards', () => {
  it('excludes cards with future due date', async () => {
    await db.srs_cards.put(makeCard(0, { due: FUTURE_DATE }))

    const { result } = renderHook(() => useDueCards(TEST_USER_ID), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(0)
  })

  it('includes cards with past due date and is_known false', async () => {
    await db.srs_cards.put(makeCard(0))
    await db.srs_cards.put(makeCard(1))

    const { result } = renderHook(() => useDueCards(TEST_USER_ID), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(2)
  })

  it('excludes cards where is_known is true', async () => {
    await db.srs_cards.put(makeCard(0, { is_known: true }))
    await db.srs_cards.put(makeCard(1))

    const { result } = renderHook(() => useDueCards(TEST_USER_ID), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data?.[0].cardId).toBe(sampleVocabulary[1].vocab_id)
  })

  it('returns empty array when user has no cards', async () => {
    const { result } = renderHook(() => useDueCards(TEST_USER_ID), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(0)
  })
})
