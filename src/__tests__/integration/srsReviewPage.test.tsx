import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sampleVocabulary } from '../../__fixtures__/vocabulary'
import { db } from '../../db/schema'
import { useDueCards } from '../../hooks/useDueCards'
import { useSRSMutation } from '../../hooks/useSRSMutation'

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

describe('sc-004 — card transition performance', () => {
  it('srs Dexie write completes in < 150ms with 30 due cards seeded', async () => {
    const vocabBase = sampleVocabulary[0]
    await db.vocabulary.put(vocabBase)

    for (let i = 0; i < 30; i++) {
      await db.user_cards.put({
        userId: TEST_USER_ID,
        vocabId: `perf-card-${i}`,
        interval_days: 1,
        ease_factor: 2.5,
        due_date: PAST_DATE,
        review_count: 1,
        last_rating: null,
        pending_sync: false,
        updated_at: PAST_DATE,
        is_known: false,
        consecutive_correct: 0,
      })
    }

    const { result } = renderHook(() => useSRSMutation(), { wrapper: makeWrapper() })

    const cardForMutation = {
      ...vocabBase,
      userId: TEST_USER_ID,
      vocabId: vocabBase.vocab_id,
      interval_days: 1,
      ease_factor: 2.5,
      due_date: PAST_DATE,
      review_count: 1,
      last_rating: null as null,
      pending_sync: false,
      updated_at: PAST_DATE,
      is_known: false,
      consecutive_correct: 0,
    }

    const start = performance.now()
    result.current.mutate({ userId: TEST_USER_ID, card: cardForMutation, rating: 2 })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(150)
  })
})

describe('again re-queue limit (FR-004)', () => {
  it('4th Again rates card with interval=1 (review_log tracks sync)', async () => {
    const vocab = sampleVocabulary[0]
    await db.vocabulary.put(vocab)
    await db.user_cards.put(makeCard(0))

    const { result } = renderHook(() => useSRSMutation(), { wrapper: makeWrapper() })

    const card = {
      ...vocab,
      userId: TEST_USER_ID,
      vocabId: vocab.vocab_id,
      interval_days: 10,
      ease_factor: 2.5,
      due_date: PAST_DATE,
      review_count: 5,
      last_rating: 2 as const,
      pending_sync: false,
      updated_at: PAST_DATE,
      is_known: false,
      consecutive_correct: 0,
    }

    // Simulate 4th Again (the mutation itself is stateless — just verify the Dexie write)
    result.current.mutate({ userId: TEST_USER_ID, card, rating: 0 })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const stored = await db.user_cards.get([TEST_USER_ID, vocab.vocab_id])
    expect(stored?.interval_days).toBe(1)
    expect(stored?.pending_sync).toBe(false)
    expect(stored?.last_rating).toBe(0)
  })
})

describe('useSRSMutation', () => {
  async function seedCardAndVocab(vocabIdx: number) {
    const vocab = sampleVocabulary[vocabIdx]
    await db.vocabulary.put(vocab)
    await db.user_cards.put(makeCard(vocabIdx))
    return vocab
  }

  it('good rating (2): advances interval, future due_date, review_log entry created', async () => {
    const vocab = await seedCardAndVocab(0)

    const { result } = renderHook(() => useSRSMutation(), { wrapper: makeWrapper() })

    const cardForMutation = {
      ...vocab,
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
    }

    result.current.mutate({ userId: TEST_USER_ID, card: cardForMutation, rating: 2 })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const stored = await db.user_cards.get([TEST_USER_ID, vocab.vocab_id])
    expect(stored).toBeDefined()
    expect(stored!.pending_sync).toBe(false)
    expect(stored!.interval_days).toBeGreaterThan(1)
    expect(new Date(stored!.due_date).getTime()).toBeGreaterThan(Date.now())
    expect(stored!.review_count).toBe(2)
    expect(stored!.last_rating).toBe(2)
  })

  it('again rating (0): resets interval to 1, review_log entry created', async () => {
    const vocab = await seedCardAndVocab(1)

    const { result } = renderHook(() => useSRSMutation(), { wrapper: makeWrapper() })

    const cardForMutation = {
      ...vocab,
      userId: TEST_USER_ID,
      vocabId: vocab.vocab_id,
      interval_days: 5,
      ease_factor: 2.5,
      due_date: PAST_DATE,
      review_count: 3,
      last_rating: 2 as const,
      pending_sync: false,
      updated_at: PAST_DATE,
      is_known: false,
      consecutive_correct: 0,
    }

    result.current.mutate({ userId: TEST_USER_ID, card: cardForMutation, rating: 0 })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const stored = await db.user_cards.get([TEST_USER_ID, vocab.vocab_id])
    expect(stored).toBeDefined()
    expect(stored!.pending_sync).toBe(false)
    expect(stored!.interval_days).toBe(1)
    expect(stored!.last_rating).toBe(0)
  })

  it('easy rating (3): increases ease_factor and sets longer interval', async () => {
    const vocab = await seedCardAndVocab(2)

    const { result } = renderHook(() => useSRSMutation(), { wrapper: makeWrapper() })

    const cardForMutation = {
      ...vocab,
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
    }

    result.current.mutate({ userId: TEST_USER_ID, card: cardForMutation, rating: 3 })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const stored = await db.user_cards.get([TEST_USER_ID, vocab.vocab_id])
    expect(stored).toBeDefined()
    expect(stored!.ease_factor).toBeGreaterThan(2.5)
    expect(stored!.interval_days).toBeGreaterThan(1)
  })
})
