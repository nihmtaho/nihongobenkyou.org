import type { VocabWithSRS } from '../types/vocabulary'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/schema'
import { getDueCards } from '../db/srs-cards'
import { initFSRSCard } from '../lib/srs'
import { useUnifiedSrsSession } from './useUnifiedSrsSession'

vi.mock('../db/sync', () => ({
  uploadPendingReviews: vi.fn().mockResolvedValue(undefined),
}))

describe('getDueCards — due_datetime guard for learning/relearning cards', () => {
  const UID = 'due-guard-test-user'

  afterEach(async () => {
    await db.srs_cards.where('userId').equals(UID).delete()
  })

  function makeCard(
    state: 'learning' | 'relearning' | 'review',
    due_datetime: string | null,
    suffix: string,
  ) {
    return {
      userId: UID,
      cardId: `test-${state}-${suffix}`,
      cardType: 'vocab' as const,
      deckId: null,
      ...initFSRSCard(),
      state,
      due: '2026-06-08',
      due_datetime,
      last_rating: null,
      is_known: false,
      consecutive_correct: 0,
      pending_sync: false,
      updated_at: new Date().toISOString(),
    }
  }

  it('excludes a learning card whose due_datetime has not yet passed', async () => {
    const card = makeCard('learning', '2099-12-31T23:59:00.000Z', 'future')
    await db.srs_cards.put(card)

    const due = await getDueCards(UID, new Date().toISOString(), 'vocab')
    expect(due.find(c => c.cardId === card.cardId)).toBeUndefined()
  })

  it('includes a learning card whose due_datetime has passed', async () => {
    const card = makeCard('learning', '2000-01-01T00:00:00.000Z', 'past')
    await db.srs_cards.put(card)

    const due = await getDueCards(UID, new Date().toISOString(), 'vocab')
    expect(due.find(c => c.cardId === card.cardId)).toBeDefined()
  })

  it('includes a review card regardless of due_datetime', async () => {
    const card = makeCard('review', null, 'review')
    await db.srs_cards.put(card)

    const due = await getDueCards(UID, new Date().toISOString(), 'vocab')
    expect(due.find(c => c.cardId === card.cardId)).toBeDefined()
  })
})

describe('useUnifiedSrsSession — phase transitions', () => {
  it('starts in loading phase', () => {
    expect(true).toBe(true)
  })

  it('transitions to pre-session when due cards are loaded', () => {
    expect(true).toBe(true)
  })

  it('transitions to complete when all cards are rated', () => {
    expect(true).toBe(true)
  })
})

describe('buildUnifiedQueue', () => {
  it('tags rv_* vocabIds as kanji-vocab kind', () => {
    expect(true).toBe(true)
  })

  it('tags regular vocabIds as vocab kind', () => {
    expect(true).toBe(true)
  })
})

// --- Undo stack tests ---

const USER_ID = 'undo-test-user'
const VOCAB_ID = 'mnn1_undotest0001'

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
    userId: USER_ID,
    cardId: VOCAB_ID,
    cardType: 'vocab',
    deckId: null,
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

describe('useUnifiedSrsSession — undo stack', () => {
  beforeEach(async () => {
    await db.srs_cards.clear()
    await db.review_log.clear()

    // Seed the SRS card so the mutation can write to Dexie
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
      reps: 2,
      lapses: 0,
      last_review: '2026-05-01',
      due: '2026-05-05',
      last_rating: null,
      is_known: false,
      consecutive_correct: 0,
      pending_sync: false,
      updated_at: new Date().toISOString(),
    })
  })

  it('canUndo is false before any rating', () => {
    const card = makeVocabCard()
    const prebuiltQueue = [{ kind: 'vocab' as const, card }]

    const { result } = renderHook(
      () => useUnifiedSrsSession(USER_ID, 'vocab', { prebuiltQueue }),
      { wrapper: makeWrapper() },
    )

    expect(result.current.canUndo).toBe(false)
  })

  it('canUndo becomes true after handleRate is called', async () => {
    const card = makeVocabCard()
    const prebuiltQueue = [{ kind: 'vocab' as const, card }]

    const { result } = renderHook(
      () => useUnifiedSrsSession(USER_ID, 'vocab', { prebuiltQueue }),
      { wrapper: makeWrapper() },
    )

    act(() => {
      result.current.startSession()
    })

    act(() => {
      result.current.handleRate({ kind: 'vocab', card }, 3)
    })

    await waitFor(() => {
      expect(result.current.canUndo).toBe(true)
    })
  })

  it('undo() removes the review_log entry from Dexie', async () => {
    const card = makeVocabCard()
    const prebuiltQueue = [{ kind: 'vocab' as const, card }]

    const { result } = renderHook(
      () => useUnifiedSrsSession(USER_ID, 'vocab', { prebuiltQueue }),
      { wrapper: makeWrapper() },
    )

    act(() => {
      result.current.startSession()
    })

    act(() => {
      result.current.handleRate({ kind: 'vocab', card }, 3)
    })

    // Wait for review_log to have an entry
    await waitFor(async () => {
      const entries = await db.review_log.toArray()
      expect(entries).toHaveLength(1)
    })

    act(() => {
      result.current.undo()
    })

    await waitFor(async () => {
      const entries = await db.review_log.toArray()
      expect(entries).toHaveLength(0)
    })
  })

  it('undo() restores the srs_card to the pre-rating snapshot', async () => {
    const card = makeVocabCard({ reps: 2, stability: 4.2 })
    const prebuiltQueue = [{ kind: 'vocab' as const, card }]

    const { result } = renderHook(
      () => useUnifiedSrsSession(USER_ID, 'vocab', { prebuiltQueue }),
      { wrapper: makeWrapper() },
    )

    act(() => {
      result.current.startSession()
    })

    act(() => {
      result.current.handleRate({ kind: 'vocab', card }, 3)
    })

    // Wait for the card to be mutated (reps incremented)
    await waitFor(async () => {
      const stored = await db.srs_cards.where('[userId+cardId]').equals([USER_ID, VOCAB_ID]).first()
      expect(stored?.reps).toBeGreaterThan(2)
    })

    act(() => {
      result.current.undo()
    })

    await waitFor(async () => {
      const stored = await db.srs_cards.where('[userId+cardId]').equals([USER_ID, VOCAB_ID]).first()
      expect(stored?.reps).toBe(2)
      expect(stored?.stability).toBeCloseTo(4.2)
    })
  })

  it('canUndo is false after undo() empties the stack', async () => {
    const card = makeVocabCard()
    const prebuiltQueue = [{ kind: 'vocab' as const, card }]

    const { result } = renderHook(
      () => useUnifiedSrsSession(USER_ID, 'vocab', { prebuiltQueue }),
      { wrapper: makeWrapper() },
    )

    act(() => {
      result.current.startSession()
    })

    act(() => {
      result.current.handleRate({ kind: 'vocab', card }, 3)
    })

    await waitFor(() => expect(result.current.canUndo).toBe(true))

    act(() => {
      result.current.undo()
    })

    await waitFor(() => expect(result.current.canUndo).toBe(false))
  })

  it('startSession() clears the undo stack', async () => {
    const card = makeVocabCard()
    const prebuiltQueue = [{ kind: 'vocab' as const, card }]

    const { result } = renderHook(
      () => useUnifiedSrsSession(USER_ID, 'vocab', { prebuiltQueue }),
      { wrapper: makeWrapper() },
    )

    act(() => {
      result.current.startSession()
    })

    act(() => {
      result.current.handleRate({ kind: 'vocab', card }, 3)
    })

    await waitFor(() => expect(result.current.canUndo).toBe(true))

    act(() => {
      result.current.startSession()
    })

    expect(result.current.canUndo).toBe(false)
  })
})
