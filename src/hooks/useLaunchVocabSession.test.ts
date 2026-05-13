import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { createElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '../db/schema'
import { generateVocabId } from '../lib/vocab-id'
import { useLaunchVocabSession } from './useLaunchVocabSession'

const mockNavigate = vi.fn()
const mockInitSession = vi.fn()

/* eslint-disable react/component-hook-factories */
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => mockNavigate }))
vi.mock('../stores/studySessionStore', () => ({
  useStudySessionStore: (sel: (s: { initSession: typeof mockInitSession }) => unknown) =>
    sel({ initSession: mockInitSession }),
}))
/* eslint-enable react/component-hook-factories */

const TEST_USER = 'test-launch-session-user'
const BOOK_SOURCE = 'minna_shokyuu_1'
const LESSON_NUMBER = 1
const PREFIX = 'mnn1'

// Computed via the frozen generateVocabId algorithm — never hardcoded strings.
const VOCAB_ID_1 = generateVocabId(PREFIX, BOOK_SOURCE, LESSON_NUMBER, null, 'てすと1')
const VOCAB_ID_2 = generateVocabId(PREFIX, BOOK_SOURCE, LESSON_NUMBER, null, 'てすと2')
const VOCAB_ID_3 = generateVocabId(PREFIX, BOOK_SOURCE, LESSON_NUMBER, null, 'てすと3')
const VOCAB_ID_4 = generateVocabId(PREFIX, BOOK_SOURCE, LESSON_NUMBER, null, 'てすと4')
const VOCAB_ID_5 = generateVocabId(PREFIX, BOOK_SOURCE, LESSON_NUMBER, null, 'てすと5')

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

// Minimal valid VocabItem; required fields only.
function makeVocabItem(vocab_id: string) {
  return {
    vocab_id,
    word: null,
    reading: 'てすと',
    romaji: 'tesuto',
    meaning_en: 'test',
    meaning_vi: 'kiểm tra',
    pitch_pattern: null,
    pitch_type: null,
    audio_filename: null,
    pos: [],
    jlpt_level: 5,
    book_source: BOOK_SOURCE,
    lesson_number: LESSON_NUMBER,
    examples: [],
    tags: [],
    deprecated: false,
  }
}

function makeCardState(userId: string, cardId: string, due: string) {
  return {
    userId,
    cardId,
    cardType: 'vocab' as const,
    deckId: null,
    state: 'review' as const,
    stability: 4.0,
    difficulty: 5.0,
    elapsed_days: 2,
    scheduled_days: 1,
    reps: 1,
    lapses: 0,
    last_review: due,
    due,
    last_rating: null,
    pending_sync: false,
    updated_at: new Date().toISOString(),
    is_known: false,
    consecutive_correct: 0,
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function tomorrow(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

beforeEach(async () => {
  await db.vocabulary.clear()
  await db.srs_cards.clear()
  mockNavigate.mockReset()
  mockInitSession.mockReset()
})

describe('useLaunchVocabSession', () => {
  it('does nothing when no vocabulary found for that book+lesson', async () => {
    // No vocabulary seeded.
    const { result } = renderHook(() => useLaunchVocabSession(TEST_USER), {
      wrapper: makeWrapper(),
    })

    await act(async () => {
      await result.current(BOOK_SOURCE, LESSON_NUMBER, false)
    })

    expect(mockInitSession).not.toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('launches session with all vocab when dueOnly=false and no srs_cards exist', async () => {
    await db.vocabulary.bulkAdd([
      makeVocabItem(VOCAB_ID_1),
      makeVocabItem(VOCAB_ID_2),
    ])

    const { result } = renderHook(() => useLaunchVocabSession(TEST_USER), {
      wrapper: makeWrapper(),
    })

    await act(async () => {
      await result.current(BOOK_SOURCE, LESSON_NUMBER, false)
    })

    expect(mockInitSession).toHaveBeenCalledOnce()
    const [queue] = mockInitSession.mock.calls[0]
    expect(queue).toHaveLength(2)
    // New card objects must have the correct FSRS defaults.
    for (const card of queue) {
      expect(card.kind).toBe('vocab')
      expect(card.card.userId).toBe(TEST_USER)
      expect(card.card.reps).toBe(0)
      expect(card.card.scheduled_days).toBe(0)
      expect(card.card.pending_sync).toBe(false)
      expect(card.card.is_known).toBe(false)
    }
    expect(mockNavigate).toHaveBeenCalledOnce()
  })

  it('filters to only due cards when dueOnly=true', async () => {
    const dueVocabId = VOCAB_ID_3
    const notDueVocabId = VOCAB_ID_4

    await db.vocabulary.bulkAdd([
      makeVocabItem(dueVocabId),
      makeVocabItem(notDueVocabId),
    ])
    await db.srs_cards.bulkAdd([
      makeCardState(TEST_USER, dueVocabId, today()),
      makeCardState(TEST_USER, notDueVocabId, tomorrow()),
    ])

    const { result } = renderHook(() => useLaunchVocabSession(TEST_USER), {
      wrapper: makeWrapper(),
    })

    await act(async () => {
      await result.current(BOOK_SOURCE, LESSON_NUMBER, true)
    })

    expect(mockInitSession).toHaveBeenCalledOnce()
    const [queue] = mockInitSession.mock.calls[0]
    expect(queue).toHaveLength(1)
    expect(queue[0].card.cardId).toBe(dueVocabId)
    expect(mockNavigate).toHaveBeenCalledOnce()
  })

  it('does not navigate when dueOnly=true but no cards are due', async () => {
    const vocabId = VOCAB_ID_5

    await db.vocabulary.add(makeVocabItem(vocabId))
    // Card is due tomorrow — not due today.
    await db.srs_cards.add(makeCardState(TEST_USER, vocabId, tomorrow()))

    const { result } = renderHook(() => useLaunchVocabSession(TEST_USER), {
      wrapper: makeWrapper(),
    })

    await act(async () => {
      await result.current(BOOK_SOURCE, LESSON_NUMBER, true)
    })

    expect(mockInitSession).not.toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('passes mode to initSession when mode is specified', async () => {
    await db.vocabulary.add(makeVocabItem(VOCAB_ID_1))

    const { result } = renderHook(() => useLaunchVocabSession(TEST_USER), {
      wrapper: makeWrapper(),
    })

    await act(async () => {
      await result.current(BOOK_SOURCE, LESSON_NUMBER, false, 'quiz')
    })

    expect(mockInitSession).toHaveBeenCalledOnce()
    expect(mockInitSession.mock.calls[0][1]).toBe('quiz')
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/study/review', search: { filter: 'vocab' } })
  })

  it('passes subMode to initSession when subMode is specified', async () => {
    await db.vocabulary.add(makeVocabItem(VOCAB_ID_2))

    const { result } = renderHook(() => useLaunchVocabSession(TEST_USER), {
      wrapper: makeWrapper(),
    })

    await act(async () => {
      await result.current(BOOK_SOURCE, LESSON_NUMBER, false, 'type-input', 'word→hira')
    })

    expect(mockInitSession).toHaveBeenCalledOnce()
    expect(mockInitSession.mock.calls[0][1]).toBe('type-input')
    expect(mockInitSession.mock.calls[0][2]).toBe('word→hira')
  })
})
