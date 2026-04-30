import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { createElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '../db/schema'
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

function makeCardState(userId: string, vocabId: string, due_date: string) {
  return {
    userId,
    vocabId,
    interval_days: 1,
    ease_factor: 2.5,
    due_date,
    review_count: 1,
    last_rating: null,
    pending_sync: false,
    updated_at: new Date().toISOString(),
    is_known: false,
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
  await db.user_cards.clear()
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

  it('launches session with all vocab when dueOnly=false and no user_cards exist', async () => {
    await db.vocabulary.bulkAdd([
      makeVocabItem('mnn1_aaa000000001'),
      makeVocabItem('mnn1_aaa000000002'),
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
    // New card objects must have the correct defaults.
    for (const card of queue) {
      expect(card.userId).toBe(TEST_USER)
      expect(card.interval_days).toBe(0)
      expect(card.ease_factor).toBe(2.5)
      expect(card.review_count).toBe(0)
      expect(card.pending_sync).toBe(false)
      expect(card.is_known).toBe(false)
    }
    expect(mockNavigate).toHaveBeenCalledOnce()
  })

  it('filters to only due cards when dueOnly=true', async () => {
    const dueVocabId = 'mnn1_aaa000000003'
    const notDueVocabId = 'mnn1_aaa000000004'

    await db.vocabulary.bulkAdd([
      makeVocabItem(dueVocabId),
      makeVocabItem(notDueVocabId),
    ])
    await db.user_cards.bulkAdd([
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
    expect(queue[0].vocabId).toBe(dueVocabId)
    expect(mockNavigate).toHaveBeenCalledOnce()
  })

  it('does not navigate when dueOnly=true but no cards are due', async () => {
    const vocabId = 'mnn1_aaa000000005'

    await db.vocabulary.add(makeVocabItem(vocabId))
    // Card is due tomorrow — not due today.
    await db.user_cards.add(makeCardState(TEST_USER, vocabId, tomorrow()))

    const { result } = renderHook(() => useLaunchVocabSession(TEST_USER), {
      wrapper: makeWrapper(),
    })

    await act(async () => {
      await result.current(BOOK_SOURCE, LESSON_NUMBER, true)
    })

    expect(mockInitSession).not.toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
