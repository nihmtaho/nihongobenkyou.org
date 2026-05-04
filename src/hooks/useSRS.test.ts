import type { VocabWithSRS } from '../types/vocabulary'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '../db/schema'
import { useSRS } from './useSRS'

vi.mock('../db/sync', () => ({
  uploadPendingReviews: vi.fn().mockResolvedValue(undefined),
}))

const USER_ID = 'test-user'

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

function makeVocabCard(overrides: Partial<VocabWithSRS> = {}): VocabWithSRS {
  return {
    vocab_id: 'mnn1_test0000001',
    word: '食べる',
    reading: 'たべる',
    romaji: 'taberu',
    meaning_en: 'to eat',
    meaning_vi: 'ăn',
    pitch_pattern: null,
    pitch_type: null,
    audio_filename: null,
    pos: ['v1'],
    jlpt_level: 5,
    book_source: 'minna_shokyuu_1',
    lesson_number: 3,
    examples: [],
    tags: [],
    deprecated: false,
    interval_days: 1,
    ease_factor: 2.5,
    due_date: '2026-05-01',
    review_count: 2,
    last_rating: null,
    pending_sync: false,
    updated_at: new Date().toISOString(),
    is_known: false,
    consecutive_correct: 0,
    ...overrides,
  }
}

describe('useSRS – answerTypeInput', () => {
  beforeEach(async () => {
    await db.user_cards.clear()
    await db.review_log.clear()
  })

  it('wrong answer returns rating 0 and shouldRequeue true', () => {
    const { result } = renderHook(() => useSRS('vocab', USER_ID), { wrapper: makeWrapper() })
    const card = makeVocabCard()

    const outcome = result.current.answerTypeInput(card, false)

    expect(outcome).toEqual({ rating: 0, shouldRequeue: true })
  })

  it('correct + review_count <= 1 returns rating 1 (Hard) and shouldRequeue false', () => {
    const { result } = renderHook(() => useSRS('vocab', USER_ID), { wrapper: makeWrapper() })
    const card = makeVocabCard({ review_count: 1, consecutive_correct: 3 })

    const outcome = result.current.answerTypeInput(card, true)

    expect(outcome).toEqual({ rating: 1, shouldRequeue: false })
  })

  it('correct + review_count >= 2 + consecutive_correct < 4 returns rating 2 (Good) and shouldRequeue false', () => {
    const { result } = renderHook(() => useSRS('vocab', USER_ID), { wrapper: makeWrapper() })
    const card = makeVocabCard({ review_count: 3, consecutive_correct: 2 })

    const outcome = result.current.answerTypeInput(card, true)

    expect(outcome).toEqual({ rating: 2, shouldRequeue: false })
  })

  it('correct + consecutive_correct >= 4 + review_count >= 2 returns rating 3 (Easy) and shouldRequeue false', () => {
    const { result } = renderHook(() => useSRS('vocab', USER_ID), { wrapper: makeWrapper() })
    const card = makeVocabCard({ review_count: 5, consecutive_correct: 4 })

    const outcome = result.current.answerTypeInput(card, true)

    expect(outcome).toEqual({ rating: 3, shouldRequeue: false })
  })

  it('review_count 0 is treated as first review → rating 1 (Hard)', () => {
    const { result } = renderHook(() => useSRS('vocab', USER_ID), { wrapper: makeWrapper() })
    const card = makeVocabCard({ review_count: 0, consecutive_correct: 0 })

    const outcome = result.current.answerTypeInput(card, true)

    expect(outcome).toEqual({ rating: 1, shouldRequeue: false })
  })

  it('consecutive_correct exactly 4 with review_count 2 is the Easy threshold boundary', () => {
    const { result } = renderHook(() => useSRS('vocab', USER_ID), { wrapper: makeWrapper() })
    // consecutive_correct === 3 → still Good
    const cardBelow = makeVocabCard({ review_count: 2, consecutive_correct: 3 })
    expect(result.current.answerTypeInput(cardBelow, true)).toEqual({ rating: 2, shouldRequeue: false })

    // consecutive_correct === 4 → Easy
    const cardAt = makeVocabCard({ review_count: 2, consecutive_correct: 4 })
    expect(result.current.answerTypeInput(cardAt, true)).toEqual({ rating: 3, shouldRequeue: false })
  })
})

describe('useSRS – rate() consecutive_correct mutation', () => {
  beforeEach(async () => {
    await db.user_cards.clear()
    await db.review_log.clear()
  })

  it('rating 0 resets consecutive_correct to 0 in Dexie', async () => {
    const { result } = renderHook(() => useSRS('vocab', USER_ID), { wrapper: makeWrapper() })
    const card = makeVocabCard({ consecutive_correct: 3 })

    act(() => {
      result.current.rate(card, 0)
    })

    await waitFor(async () => {
      const stored = await db.user_cards
        .where({ userId: USER_ID, vocabId: 'mnn1_test0000001' })
        .first()
      expect(stored).toBeDefined()
      expect(stored!.consecutive_correct).toBe(0)
    })
  })

  it('rating 2 increments consecutive_correct by 1 in Dexie', async () => {
    const { result } = renderHook(() => useSRS('vocab', USER_ID), { wrapper: makeWrapper() })
    const card = makeVocabCard({ consecutive_correct: 2 })

    act(() => {
      result.current.rate(card, 2)
    })

    await waitFor(async () => {
      const stored = await db.user_cards
        .where({ userId: USER_ID, vocabId: 'mnn1_test0000001' })
        .first()
      expect(stored).toBeDefined()
      expect(stored!.consecutive_correct).toBe(3)
    })
  })

  it('rating 3 increments consecutive_correct by 1 in Dexie', async () => {
    const { result } = renderHook(() => useSRS('vocab', USER_ID), { wrapper: makeWrapper() })
    const card = makeVocabCard({ consecutive_correct: 4 })

    act(() => {
      result.current.rate(card, 3)
    })

    await waitFor(async () => {
      const stored = await db.user_cards
        .where({ userId: USER_ID, vocabId: 'mnn1_test0000001' })
        .first()
      expect(stored).toBeDefined()
      expect(stored!.consecutive_correct).toBe(5)
    })
  })
})
