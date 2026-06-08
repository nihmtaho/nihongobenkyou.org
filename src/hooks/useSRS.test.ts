import type { VocabWithSRS } from '../types/vocabulary'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '../db/schema'
import { computeAnswerRating, useSRS } from './useSRS'

vi.mock('../db/sync', () => ({
  uploadPendingReviews: vi.fn().mockResolvedValue(undefined),
}))

const USER_ID = 'test-user'
const VOCAB_ID = 'mnn1_test0000001'

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

function makeVocabCard(overrides: Partial<VocabWithSRS> = {}): VocabWithSRS {
  return {
    vocab_id: VOCAB_ID,
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
    // FSRS fields
    state: 'review',
    stability: 4.2,
    difficulty: 5.0,
    elapsed_days: 2,
    scheduled_days: 4,
    reps: 2,
    lapses: 0,
    last_review: '2026-05-01',
    due: '2026-05-05',
    last_rating: null,
    pending_sync: false,
    updated_at: new Date().toISOString(),
    is_known: false,
    consecutive_correct: 0,
    ...overrides,
  }
}

describe('computeAnswerRating', () => {
  it('returns 1 (Again) when incorrect regardless of consecutive_correct', () => {
    expect(computeAnswerRating({ consecutive_correct: 10 }, false)).toBe(1)
  })

  it('returns 3 (Good) when correct and consecutive_correct < 3', () => {
    expect(computeAnswerRating({ consecutive_correct: 2 }, true)).toBe(3)
  })

  it('returns 3 (Good) when correct and consecutive_correct is 0', () => {
    expect(computeAnswerRating({ consecutive_correct: 0 }, true)).toBe(3)
  })

  it('returns 4 (Easy) when correct and consecutive_correct is exactly 3', () => {
    expect(computeAnswerRating({ consecutive_correct: 3 }, true)).toBe(4)
  })

  it('returns 4 (Easy) when correct and consecutive_correct > 3', () => {
    expect(computeAnswerRating({ consecutive_correct: 5 }, true)).toBe(4)
  })
})

describe('useSRS – answerTypeInput', () => {
  beforeEach(async () => {
    await db.srs_cards.clear()
    await db.review_log.clear()
  })

  it('wrong answer returns rating 1 (Again) and shouldRequeue true', () => {
    const { result } = renderHook(() => useSRS('vocab', USER_ID), { wrapper: makeWrapper() })
    const card = makeVocabCard()

    const outcome = result.current.answerTypeInput(card, false)

    expect(outcome).toEqual({ rating: 1, shouldRequeue: true })
  })

  it('correct + reps <= 1 returns rating 2 (Hard) and shouldRequeue false', () => {
    const { result } = renderHook(() => useSRS('vocab', USER_ID), { wrapper: makeWrapper() })
    const card = makeVocabCard({ reps: 1, consecutive_correct: 3 })

    const outcome = result.current.answerTypeInput(card, true)

    expect(outcome).toEqual({ rating: 2, shouldRequeue: false })
  })

  it('correct + reps >= 2 + consecutive_correct < 4 returns rating 3 (Good) and shouldRequeue false', () => {
    const { result } = renderHook(() => useSRS('vocab', USER_ID), { wrapper: makeWrapper() })
    const card = makeVocabCard({ reps: 3, consecutive_correct: 2 })

    const outcome = result.current.answerTypeInput(card, true)

    expect(outcome).toEqual({ rating: 3, shouldRequeue: false })
  })

  it('correct + consecutive_correct >= 4 + reps >= 2 returns rating 4 (Easy) and shouldRequeue false', () => {
    const { result } = renderHook(() => useSRS('vocab', USER_ID), { wrapper: makeWrapper() })
    const card = makeVocabCard({ reps: 5, consecutive_correct: 4 })

    const outcome = result.current.answerTypeInput(card, true)

    expect(outcome).toEqual({ rating: 4, shouldRequeue: false })
  })

  it('reps 0 is treated as first review → rating 2 (Hard)', () => {
    const { result } = renderHook(() => useSRS('vocab', USER_ID), { wrapper: makeWrapper() })
    const card = makeVocabCard({ reps: 0, consecutive_correct: 0 })

    const outcome = result.current.answerTypeInput(card, true)

    expect(outcome).toEqual({ rating: 2, shouldRequeue: false })
  })

  it('consecutive_correct exactly 4 with reps 2 is the Easy threshold boundary', () => {
    const { result } = renderHook(() => useSRS('vocab', USER_ID), { wrapper: makeWrapper() })
    // consecutive_correct === 3 → still Good
    const cardBelow = makeVocabCard({ reps: 2, consecutive_correct: 3 })
    expect(result.current.answerTypeInput(cardBelow, true)).toEqual({ rating: 3, shouldRequeue: false })

    // consecutive_correct === 4 → Easy
    const cardAt = makeVocabCard({ reps: 2, consecutive_correct: 4 })
    expect(result.current.answerTypeInput(cardAt, true)).toEqual({ rating: 4, shouldRequeue: false })
  })
})

describe('useSRS – rate() consecutive_correct mutation', () => {
  beforeEach(async () => {
    await db.srs_cards.clear()
    await db.review_log.clear()
  })

  it('rating 1 (Again) resets consecutive_correct to 0 in Dexie', async () => {
    const { result } = renderHook(() => useSRS('vocab', USER_ID), { wrapper: makeWrapper() })
    const card = makeVocabCard({ consecutive_correct: 3 })

    act(() => {
      result.current.rate(card, 1)
    })

    await waitFor(async () => {
      const stored = await db.srs_cards
        .where('[userId+cardId]')
        .equals([USER_ID, VOCAB_ID])
        .first()
      expect(stored).toBeDefined()
      expect(stored!.consecutive_correct).toBe(0)
    })
  })

  it('rating 3 (Good) increments consecutive_correct by 1 in Dexie', async () => {
    const { result } = renderHook(() => useSRS('vocab', USER_ID), { wrapper: makeWrapper() })
    const card = makeVocabCard({ consecutive_correct: 2 })

    act(() => {
      result.current.rate(card, 3)
    })

    await waitFor(async () => {
      const stored = await db.srs_cards
        .where('[userId+cardId]')
        .equals([USER_ID, VOCAB_ID])
        .first()
      expect(stored).toBeDefined()
      expect(stored!.consecutive_correct).toBe(3)
    })
  })

  it('rating 4 (Easy) increments consecutive_correct by 1 in Dexie', async () => {
    const { result } = renderHook(() => useSRS('vocab', USER_ID), { wrapper: makeWrapper() })
    const card = makeVocabCard({ consecutive_correct: 4 })

    act(() => {
      result.current.rate(card, 4)
    })

    await waitFor(async () => {
      const stored = await db.srs_cards
        .where('[userId+cardId]')
        .equals([USER_ID, VOCAB_ID])
        .first()
      expect(stored).toBeDefined()
      expect(stored!.consecutive_correct).toBe(5)
    })
  })

  it('answer() with consecutive_correct=3 writes last_rating=4 (Easy) to Dexie', async () => {
    await db.srs_cards.put({
      userId: USER_ID,
      cardId: VOCAB_ID,
      cardType: 'vocab',
      deckId: null,
      state: 'review',
      stability: 4.2,
      difficulty: 5.0,
      elapsed_days: 2,
      scheduled_days: 4,
      reps: 4,
      lapses: 0,
      last_review: '2026-05-01',
      due: '2026-05-05',
      last_rating: null,
      is_known: false,
      consecutive_correct: 3,
      pending_sync: false,
      updated_at: new Date().toISOString(),
    })

    const { result } = renderHook(() => useSRS('vocab', USER_ID), { wrapper: makeWrapper() })
    const card = makeVocabCard({ consecutive_correct: 3 })

    act(() => {
      result.current.answer(card, true)
    })

    await waitFor(async () => {
      const stored = await db.srs_cards
        .where('[userId+cardId]')
        .equals([USER_ID, VOCAB_ID])
        .first()
      expect(stored).toBeDefined()
      expect(stored!.last_rating).toBe(4)
    })
  })

  it('custom_vocab card writes review_log with cardType custom_vocab', async () => {
    const CUSTOM_CARD_ID = 'custom_abc123'
    const { result } = renderHook(() => useSRS('vocab', USER_ID), { wrapper: makeWrapper() })

    // Seed an srs_card so upsertSRSCard finds the record
    await db.srs_cards.put({
      userId: USER_ID,
      cardId: CUSTOM_CARD_ID,
      cardType: 'custom_vocab',
      deckId: 'deck-1',
      state: 'review',
      stability: 3.0,
      difficulty: 5.0,
      elapsed_days: 2,
      scheduled_days: 7,
      reps: 3,
      lapses: 0,
      last_review: '2026-05-01',
      due: '2026-05-05',
      last_rating: null,
      is_known: false,
      consecutive_correct: 0,
      pending_sync: false,
      updated_at: new Date().toISOString(),
    })

    const card = makeVocabCard({
      vocab_id: CUSTOM_CARD_ID,
      cardType: 'custom_vocab',
      deckId: 'deck-1',
    })

    act(() => {
      result.current.rate(card, 3)
    })

    await waitFor(async () => {
      const entries = await db.review_log.toArray()
      expect(entries).toHaveLength(1)
      expect(entries[0].cardType).toBe('custom_vocab')
      expect(entries[0].bookSource).toBe('custom_vocab')
    })
  })
})
