import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sampleVocabulary } from '../../__fixtures__/vocabulary'
import { db } from '../../db/schema'
import { useDueCards } from '../../hooks/useDueCards'

vi.mock('../../db/sync', () => ({ uploadPendingReviews: vi.fn().mockResolvedValue(undefined), downloadNewReviews: vi.fn().mockResolvedValue(undefined) }))

const TEST_USER_ID = 'test-user-srs'
const PAST_DATE = '2020-01-01T00:00:00.000Z'
const FUTURE_DATE = new Date(Date.now() + 86400000 * 7).toISOString()

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

function makeCard(vocabIdx: number, overrides: Partial<Parameters<typeof db.user_cards.put>[0]> = {}) {
  const vocab = sampleVocabulary[vocabIdx]
  return {
    userId: TEST_USER_ID,
    vocabId: vocab.vocab_id,
    interval_days: 1,
    ease_factor: 2.5,
    due_date: PAST_DATE,
    review_count: 1,
    last_rating: null as null,
    pending_sync: false,
    updated_at: PAST_DATE,
    is_known: false,
    consecutive_correct: 0,
    ...overrides,
  }
}

beforeEach(async () => {
  await db.user_cards.clear()
  await db.vocabulary.clear()
  await db.review_log.clear()
})

afterEach(async () => {
  await db.user_cards.clear()
  await db.vocabulary.clear()
  await db.review_log.clear()
})

describe('useDueCards', () => {
  it('excludes cards with future due_date', async () => {
    await db.user_cards.put(makeCard(0, { due_date: FUTURE_DATE }))

    const { result } = renderHook(() => useDueCards(TEST_USER_ID), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(0)
  })

  it('includes cards with past due_date and is_known false', async () => {
    await db.user_cards.put(makeCard(0))
    await db.user_cards.put(makeCard(1))

    const { result } = renderHook(() => useDueCards(TEST_USER_ID), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(2)
  })

  it('excludes cards where is_known is true', async () => {
    await db.user_cards.put(makeCard(0, { is_known: true }))
    await db.user_cards.put(makeCard(1))

    const { result } = renderHook(() => useDueCards(TEST_USER_ID), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data?.[0].vocabId).toBe(sampleVocabulary[1].vocab_id)
  })

  it('returns empty array when user has no cards', async () => {
    const { result } = renderHook(() => useDueCards(TEST_USER_ID), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(0)
  })
})

