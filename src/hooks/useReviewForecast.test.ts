import type { KanjiCardState } from '../types/kanji'
import type { CardState } from '../types/srs'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/schema'
import { useReviewForecast } from './useReviewForecast'
import 'fake-indexeddb/auto'

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

function makeDate(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

const TODAY = makeDate(0)
const TOMORROW = makeDate(1)
const IN_3_DAYS = makeDate(3)
const IN_8_DAYS = makeDate(8)

const USER_A = 'user-a'
const USER_B = 'user-b'

const baseCard: Omit<CardState, 'userId' | 'vocabId' | 'due_date'> = {
  interval_days: 1,
  ease_factor: 2.5,
  review_count: 0,
  last_rating: null,
  pending_sync: false,
  updated_at: TODAY,
  is_known: false,
  consecutive_correct: 0,
}

const baseKanjiCard: Omit<KanjiCardState, 'userId' | 'char' | 'due_date'> = {
  interval_days: 1,
  ease_factor: 2.5,
  review_count: 0,
  last_rating: null,
  pending_sync: false,
  updated_at: TODAY,
  consecutive_correct: 0,
}

beforeEach(async () => {
  await db.user_cards.clear()
  await db.kanji_cards.clear()
})

describe('useReviewForecast', () => {
  it('returns 7 days starting from today', async () => {
    const { result } = renderHook(() => useReviewForecast(USER_A), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data).toHaveLength(7)
    expect(result.current.data![0].date).toBe(TODAY)
    expect(result.current.data![6].date).toBe(makeDate(6))
  })

  it('counts vocab cards due today', async () => {
    await db.user_cards.bulkAdd([
      { ...baseCard, userId: USER_A, vocabId: 'v1', due_date: TODAY },
      { ...baseCard, userId: USER_A, vocabId: 'v2', due_date: TODAY },
    ])
    const { result } = renderHook(() => useReviewForecast(USER_A), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data![0].count).toBe(2)
    expect(result.current.data![0].isToday).toBe(true)
  })

  it('counts kanji cards due in future days', async () => {
    await db.kanji_cards.add({ ...baseKanjiCard, userId: USER_A, char: '日', due_date: IN_3_DAYS })
    const { result } = renderHook(() => useReviewForecast(USER_A), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data![3].count).toBe(1)
  })

  it('excludes cards beyond 6 days out', async () => {
    await db.user_cards.add({ ...baseCard, userId: USER_A, vocabId: 'v1', due_date: IN_8_DAYS })
    const { result } = renderHook(() => useReviewForecast(USER_A), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data!.every((d: { count: number }) => d.count === 0)).toBe(true)
  })

  it('excludes cards belonging to another user', async () => {
    await db.user_cards.add({ ...baseCard, userId: USER_B, vocabId: 'v1', due_date: TOMORROW })
    const { result } = renderHook(() => useReviewForecast(USER_A), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data!.every((d: { count: number }) => d.count === 0)).toBe(true)
  })

  it('sums vocab + kanji cards on the same day', async () => {
    await db.user_cards.add({ ...baseCard, userId: USER_A, vocabId: 'v1', due_date: TOMORROW })
    await db.kanji_cards.add({ ...baseKanjiCard, userId: USER_A, char: '日', due_date: TOMORROW })
    const { result } = renderHook(() => useReviewForecast(USER_A), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data![1].count).toBe(2)
  })
})
