import type { SRSCard } from '../types/srs'
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

const baseSRSCard: Omit<SRSCard, 'userId' | 'cardId' | 'cardType' | 'due'> = {
  deckId: null,
  state: 'review',
  stability: 4.0,
  difficulty: 5.0,
  elapsed_days: 3,
  scheduled_days: 4,
  reps: 2,
  lapses: 0,
  last_review: TODAY,
  last_rating: null,
  pending_sync: false,
  updated_at: new Date().toISOString(),
  is_known: false,
  consecutive_correct: 0,
}

beforeEach(async () => {
  await db.srs_cards.clear()
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
    await db.srs_cards.bulkAdd([
      { ...baseSRSCard, userId: USER_A, cardId: 'v1', cardType: 'vocab', due: TODAY },
      { ...baseSRSCard, userId: USER_A, cardId: 'v2', cardType: 'vocab', due: TODAY },
    ])
    const { result } = renderHook(() => useReviewForecast(USER_A), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data![0].count).toBe(2)
    expect(result.current.data![0].isToday).toBe(true)
  })

  it('counts kanji cards due in future days', async () => {
    await db.srs_cards.add({ ...baseSRSCard, userId: USER_A, cardId: '日', cardType: 'kanji', due: IN_3_DAYS })
    const { result } = renderHook(() => useReviewForecast(USER_A), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data![3].count).toBe(1)
  })

  it('excludes cards beyond 6 days out', async () => {
    await db.srs_cards.add({ ...baseSRSCard, userId: USER_A, cardId: 'v1', cardType: 'vocab', due: IN_8_DAYS })
    const { result } = renderHook(() => useReviewForecast(USER_A), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data!.every((d: { count: number }) => d.count === 0)).toBe(true)
  })

  it('excludes cards belonging to another user', async () => {
    await db.srs_cards.add({ ...baseSRSCard, userId: USER_B, cardId: 'v1', cardType: 'vocab', due: TOMORROW })
    const { result } = renderHook(() => useReviewForecast(USER_A), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data!.every((d: { count: number }) => d.count === 0)).toBe(true)
  })

  it('sums vocab + kanji cards on the same day', async () => {
    await db.srs_cards.bulkAdd([
      { ...baseSRSCard, userId: USER_A, cardId: 'v1', cardType: 'vocab', due: TOMORROW },
      { ...baseSRSCard, userId: USER_A, cardId: '日', cardType: 'kanji', due: TOMORROW },
    ])
    const { result } = renderHook(() => useReviewForecast(USER_A), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data![1].count).toBe(2)
  })
})
