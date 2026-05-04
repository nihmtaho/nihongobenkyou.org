import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/schema'
import { useKanjiSRS } from '../../hooks/useKanjiSRS'

vi.mock('../../db/sync', () => ({ uploadPendingReviews: vi.fn().mockResolvedValue(undefined), downloadNewReviews: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../../api/kanji-cards', () => ({
  flushKanjiCards: vi.fn().mockResolvedValue(undefined),
}))

const TEST_USER = 'test-kanji-user'
const TODAY = new Date().toISOString().slice(0, 10)
const PAST = '2020-01-01'

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

beforeEach(async () => {
  await db.kanji_cards.clear()
  await db.review_log.clear()
})

afterEach(async () => {
  await db.kanji_cards.clear()
  await db.review_log.clear()
})

describe('useKanjiSRS', () => {
  it('returns due kanji cards', async () => {
    await db.kanji_cards.bulkPut([
      { userId: TEST_USER, char: '日', interval_days: 1, ease_factor: 2.5, due_date: PAST, review_count: 1, last_rating: 2, pending_sync: false, updated_at: PAST, consecutive_correct: 0 },
      { userId: TEST_USER, char: '月', interval_days: 1, ease_factor: 2.5, due_date: PAST, review_count: 0, last_rating: null, pending_sync: false, updated_at: PAST, consecutive_correct: 0 },
      { userId: TEST_USER, char: '山', interval_days: 7, ease_factor: 2.5, due_date: PAST, review_count: 2, last_rating: 3, pending_sync: false, updated_at: PAST, consecutive_correct: 0 },
    ])

    const { result } = renderHook(() => useKanjiSRS(TEST_USER), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.dueCards.isSuccess).toBe(true))
    expect(result.current.dueCards.data).toHaveLength(3)
  })

  it('excludes cards due in the future', async () => {
    const future = new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10)
    await db.kanji_cards.put({
      userId: TEST_USER,
      char: '火',
      interval_days: 7,
      ease_factor: 2.5,
      due_date: future,
      review_count: 1,
      last_rating: 2,
      pending_sync: false,
      updated_at: PAST,
      consecutive_correct: 0,
    })

    const { result } = renderHook(() => useKanjiSRS(TEST_USER), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.dueCards.isSuccess).toBe(true))
    expect(result.current.dueCards.data).toHaveLength(0)
  })

  it('sets pending_sync=false and creates review_log entry after Good rating', async () => {
    await db.kanji_cards.put({
      userId: TEST_USER,
      char: '水',
      interval_days: 1,
      ease_factor: 2.5,
      due_date: PAST,
      review_count: 1,
      last_rating: 2,
      pending_sync: false,
      updated_at: PAST,
      consecutive_correct: 0,
    })

    const { result } = renderHook(() => useKanjiSRS(TEST_USER), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.dueCards.isSuccess).toBe(true))
    const card = result.current.dueCards.data![0]

    result.current.reviewMutation.mutate({ card, rating: 2 })
    await waitFor(() => expect(result.current.reviewMutation.isSuccess).toBe(true))

    const updated = await db.kanji_cards.get([TEST_USER, '水'])
    expect(updated?.pending_sync).toBe(false)
    expect(updated?.due_date).not.toBe(PAST)
    expect((updated?.due_date ?? '') > TODAY).toBe(true)
    expect(updated?.review_count).toBe(2)
  })
})
