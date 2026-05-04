import type { UseQueryResult } from '@tanstack/react-query'
import type { CardState } from '../types/srs'
import type { VocabWithSRS } from '../types/vocabulary'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/schema'

import { useSrsSession } from './useSrsSession'

const mockDueCardsQuery = vi.fn()
const mockResetTypeInputTracking = vi.fn()
const mockRate = vi.fn()
const mockAnswerTypeInput = vi.fn()

// Named non-hook factory to avoid react/component-hook-factories lint rule.
function buildSrsMock() {
  return {
    dueCards: mockDueCardsQuery(),
    rate: mockRate,
    answer: vi.fn(),
    answerTypeInput: mockAnswerTypeInput,
    resetTypeInputTracking: mockResetTypeInputTracking,
    isPending: false,
  }
}

vi.mock('./useSRS', () => ({
  useSRS: buildSrsMock,
}))

const mockStreakQuery = vi.fn()

function buildStreakMock() {
  return mockStreakQuery()
}

vi.mock('./useStreak', () => ({
  useStreak: buildStreakMock,
}))

function selectAuthState(selector: (s: { userId: string | null }) => unknown) {
  return selector({ userId: 'test-user-id' })
}

vi.mock('../stores/authStore', () => ({
  useAuthStore: selectAuthState,
}))

const mockMeaningLanguage = vi.fn().mockReturnValue('vi')

function selectSettingsState(selector: (s: { meaningLanguage: string }) => unknown) {
  return selector({ meaningLanguage: mockMeaningLanguage() })
}

vi.mock('../stores/settingsStore', () => ({
  useSettingsStore: selectSettingsState,
}))

// --- Helpers ---

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

type PartialQueryResult = Partial<Omit<UseQueryResult<CardState[]>, 'refetch' | 'promise'>>

function makeDueCardsResult(overrides: PartialQueryResult): UseQueryResult<CardState[]> {
  return {
    data: undefined,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    status: 'success',
    fetchStatus: 'idle',
    isSuccess: true,
    isPending: false,
    isStale: false,
    isRefetching: false,
    isLoadingError: false,
    isRefetchError: false,
    isPlaceholderData: false,
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isFetchedAfterMount: false,
    isFetched: true,
    isInitialLoading: false,
    refetch: vi.fn() as UseQueryResult<CardState[]>['refetch'],
    promise: Promise.resolve([] as CardState[]) as UseQueryResult<CardState[]>['promise'],
    ...overrides,
  } as UseQueryResult<CardState[]>
}

function makeLoadingResult(): UseQueryResult<CardState[]> {
  return makeDueCardsResult({
    data: undefined,
    isLoading: true,
    status: 'pending',
    isPending: true,
    isSuccess: false,
  })
}

// VocabWithSRS extends VocabItem (vocab_id), but useSrsSession reads vocabId (CardState)
// when extracting ids for the vocab prefetch query. The cast in tests must include vocabId.
type VocabWithSRSAndCardId = VocabWithSRS & { vocabId: string }

function makeVocabWithSRS(overrides: Partial<VocabWithSRS> = {}): VocabWithSRSAndCardId {
  return {
    vocab_id: 'mnn1_test0000001',
    vocabId: 'mnn1_test0000001',
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
    review_count: 0,
    last_rating: null,
    pending_sync: false,
    updated_at: new Date().toISOString(),
    is_known: false,
    ...overrides,
    consecutive_correct: overrides.consecutive_correct ?? 0,
  }
}

// --- Tests ---

describe('useSrsSession', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockStreakQuery.mockReturnValue({ data: null })
    mockMeaningLanguage.mockReturnValue('vi')
    await db.vocabulary.clear()
    await db.user_cards.clear()
    await db.sessions.clear()
    await db.streaks.clear()
  })

  describe('phase transitions', () => {
    it('transitions loading → pre-session when dueCards arrive', async () => {
      const dueCard = makeVocabWithSRS()
      mockDueCardsQuery.mockReturnValue(
        makeDueCardsResult({ data: [dueCard] as unknown as CardState[], isLoading: false }),
      )

      const { result } = renderHook(() => useSrsSession(), { wrapper: makeWrapper() })

      await waitFor(() => expect(result.current.phase).toBe('pre-session'))
    })

    it('transitions loading → empty when dueCards is empty', async () => {
      mockDueCardsQuery.mockReturnValue(
        makeDueCardsResult({ data: [], isLoading: false }),
      )

      const { result } = renderHook(() => useSrsSession(), { wrapper: makeWrapper() })

      await waitFor(() => expect(result.current.phase).toBe('empty'))
    })

    it('stays in loading while isLoading is true', () => {
      mockDueCardsQuery.mockReturnValue(makeLoadingResult())

      const { result } = renderHook(() => useSrsSession(), { wrapper: makeWrapper() })

      expect(result.current.phase).toBe('loading')
    })
  })

  describe('initial state', () => {
    beforeEach(() => {
      mockDueCardsQuery.mockReturnValue(makeLoadingResult())
    })

    it('srsMode defaults to flashcard', () => {
      const { result } = renderHook(() => useSrsSession(), { wrapper: makeWrapper() })
      expect(result.current.srsMode).toBe('flashcard')
    })

    it('typeInputSubMode defaults to word→hira', () => {
      const { result } = renderHook(() => useSrsSession(), { wrapper: makeWrapper() })
      expect(result.current.typeInputSubMode).toBe('word→hira')
    })

    it('stats start at zero', () => {
      const { result } = renderHook(() => useSrsSession(), { wrapper: makeWrapper() })
      expect(result.current.stats.correct).toBe(0)
      expect(result.current.stats.total).toBe(0)
      expect(result.current.stats.ratingCounts).toEqual({ 0: 0, 1: 0, 2: 0, 3: 0 })
    })

    it('elapsed starts at zero', () => {
      const { result } = renderHook(() => useSrsSession(), { wrapper: makeWrapper() })
      expect(result.current.elapsed).toBe(0)
    })

    it('startError is null', () => {
      const { result } = renderHook(() => useSrsSession(), { wrapper: makeWrapper() })
      expect(result.current.startError).toBeNull()
    })
  })

  describe('setSrsMode', () => {
    it('switches srsMode to type-input', () => {
      mockDueCardsQuery.mockReturnValue(makeLoadingResult())

      const { result } = renderHook(() => useSrsSession(), { wrapper: makeWrapper() })

      act(() => {
        result.current.setSrsMode('type-input')
      })

      expect(result.current.srsMode).toBe('type-input')
    })

    it('switches srsMode back to flashcard', () => {
      mockDueCardsQuery.mockReturnValue(makeLoadingResult())

      const { result } = renderHook(() => useSrsSession(), { wrapper: makeWrapper() })

      act(() => {
        result.current.setSrsMode('type-input')
      })
      act(() => {
        result.current.setSrsMode('flashcard')
      })

      expect(result.current.srsMode).toBe('flashcard')
    })
  })

  describe('setTypeInputSubMode', () => {
    it('switches typeInputSubMode to vi→hira', () => {
      mockDueCardsQuery.mockReturnValue(makeLoadingResult())

      const { result } = renderHook(() => useSrsSession(), { wrapper: makeWrapper() })

      act(() => {
        result.current.setTypeInputSubMode('vi→hira')
      })

      expect(result.current.typeInputSubMode).toBe('vi→hira')
    })

    it('switches typeInputSubMode to word→vi', () => {
      mockDueCardsQuery.mockReturnValue(makeLoadingResult())

      const { result } = renderHook(() => useSrsSession(), { wrapper: makeWrapper() })

      act(() => {
        result.current.setTypeInputSubMode('word→vi')
      })

      expect(result.current.typeInputSubMode).toBe('word→vi')
    })
  })

  describe('streak', () => {
    it('exposes current_streak from useStreak', () => {
      mockDueCardsQuery.mockReturnValue(makeLoadingResult())
      mockStreakQuery.mockReturnValue({
        data: {
          date: '2026-05-01',
          userId: 'test-user-id',
          cards_reviewed: 10,
          current_streak: 7,
          max_streak: 7,
        },
      })

      const { result } = renderHook(() => useSrsSession(), { wrapper: makeWrapper() })

      expect(result.current.streak).toBe(7)
    })

    it('exposes undefined streak when useStreak returns null', () => {
      mockDueCardsQuery.mockReturnValue(makeLoadingResult())
      mockStreakQuery.mockReturnValue({ data: null })

      const { result } = renderHook(() => useSrsSession(), { wrapper: makeWrapper() })

      expect(result.current.streak).toBeUndefined()
    })
  })

  describe('meaningLanguage', () => {
    it('exposes meaningLanguage from settingsStore', () => {
      mockDueCardsQuery.mockReturnValue(makeLoadingResult())
      mockMeaningLanguage.mockReturnValue('en')

      const { result } = renderHook(() => useSrsSession(), { wrapper: makeWrapper() })

      expect(result.current.meaningLanguage).toBe('en')
    })
  })

  describe('isVocabReady', () => {
    it('is false when vocabItems is undefined (query not yet settled)', async () => {
      const dueCard = makeVocabWithSRS()
      mockDueCardsQuery.mockReturnValue(
        makeDueCardsResult({ data: [dueCard] as unknown as CardState[], isLoading: false }),
      )

      const { result } = renderHook(() => useSrsSession(), { wrapper: makeWrapper() })

      await waitFor(() => expect(result.current.phase).toBe('pre-session'))
      // vocabItems comes from a separate query — empty array → isVocabReady false
      expect(result.current.isVocabReady).toBe(false)
    })

    it('is true when vocabItems has items', async () => {
      const dueCard = makeVocabWithSRS()
      mockDueCardsQuery.mockReturnValue(
        makeDueCardsResult({ data: [dueCard] as unknown as CardState[], isLoading: false }),
      )

      await db.vocabulary.put({
        vocab_id: dueCard.vocab_id,
        word: dueCard.word,
        reading: dueCard.reading,
        romaji: dueCard.romaji,
        meaning_en: dueCard.meaning_en,
        meaning_vi: dueCard.meaning_vi,
        pitch_pattern: dueCard.pitch_pattern,
        pitch_type: dueCard.pitch_type,
        audio_filename: dueCard.audio_filename,
        pos: dueCard.pos,
        jlpt_level: dueCard.jlpt_level,
        book_source: dueCard.book_source,
        lesson_number: dueCard.lesson_number,
        examples: dueCard.examples,
        tags: dueCard.tags,
        deprecated: dueCard.deprecated,
      })

      const { result } = renderHook(() => useSrsSession(), { wrapper: makeWrapper() })

      await waitFor(() => expect(result.current.phase).toBe('pre-session'))
      await waitFor(() => expect(result.current.vocabItems).toBeDefined())
      await waitFor(() => expect(result.current.isVocabReady).toBe(true))
    })
  })

  describe('handleRate — deferred Again queue', () => {
    async function seedVocab(card: ReturnType<typeof makeVocabWithSRS>) {
      await db.vocabulary.put({
        vocab_id: card.vocab_id,
        word: card.word,
        reading: card.reading,
        romaji: card.romaji,
        meaning_en: card.meaning_en,
        meaning_vi: card.meaning_vi,
        pitch_pattern: card.pitch_pattern,
        pitch_type: card.pitch_type,
        audio_filename: card.audio_filename,
        pos: card.pos,
        jlpt_level: card.jlpt_level,
        book_source: card.book_source,
        lesson_number: card.lesson_number,
        examples: card.examples,
        tags: card.tags,
        deprecated: card.deprecated,
      })
    }

    it('again within MAX_AGAIN_REQUEUES adds card to deferred, not queue', async () => {
      const card1 = makeVocabWithSRS()
      mockDueCardsQuery.mockReturnValue(
        makeDueCardsResult({ data: [card1] as unknown as CardState[], isLoading: false }),
      )
      await seedVocab(card1)

      const { result } = renderHook(() => useSrsSession(), { wrapper: makeWrapper() })
      await waitFor(() => expect(result.current.isVocabReady).toBe(true))
      act(() => result.current.startSession())
      await waitFor(() => expect(result.current.phase).toBe('active'))

      const initialQueueLength = result.current.queue.length

      act(() => result.current.handleRate(0))

      await waitFor(() => expect(result.current.deferred.length).toBe(1))
      expect(result.current.queue.length).toBe(initialQueueLength)
      expect(mockRate).not.toHaveBeenCalled()
    })

    it('session does not complete when deferred is non-empty', async () => {
      const card = makeVocabWithSRS()
      mockDueCardsQuery.mockReturnValue(
        makeDueCardsResult({ data: [card] as unknown as CardState[], isLoading: false }),
      )
      await seedVocab(card)

      const { result } = renderHook(() => useSrsSession(), { wrapper: makeWrapper() })
      await waitFor(() => expect(result.current.isVocabReady).toBe(true))
      act(() => result.current.startSession())
      await waitFor(() => expect(result.current.phase).toBe('active'))

      // Rate the only card as Again — it goes to deferred, not end of queue
      act(() => result.current.handleRate(0))

      await waitFor(() => expect(result.current.deferred.length).toBe(1))
      expect(result.current.phase).not.toBe('complete')
    })

    it('poll timer splices deferred cards back at currentIndex + 1 after delay', async () => {
      const cardA = makeVocabWithSRS()
      const cardB = makeVocabWithSRS({
        vocab_id: 'mnn1_test0000002',
        word: '飲む',
        reading: 'のむ',
        romaji: 'nomu',
      })
      cardB.vocabId = 'mnn1_test0000002'
      mockDueCardsQuery.mockReturnValue(
        makeDueCardsResult({ data: [cardA, cardB] as unknown as CardState[], isLoading: false }),
      )
      await seedVocab(cardA)
      await seedVocab(cardB)

      const { result } = renderHook(() => useSrsSession(), { wrapper: makeWrapper() })
      await waitFor(() => expect(result.current.isVocabReady).toBe(true))
      act(() => result.current.startSession())
      await waitFor(() => expect(result.current.phase).toBe('active'))

      // Switch to fake timers AFTER reaching 'active'. handleRate(0) triggers
      // the [phase, currentIndex] effect to re-run, re-registering the poll
      // setInterval with the fake timer system.
      vi.useFakeTimers()
      try {
        // Rate cardA as Again → deferred, currentIndex advances to 1 (pointing at cardB)
        act(() => result.current.handleRate(0))
        expect(result.current.deferred).toHaveLength(1)

        // Advance past max again delay (10 min) + one poll tick (30 s)
        await act(async () => vi.advanceTimersByTime(10 * 60 * 1000 + 30_000))

        expect(result.current.deferred).toHaveLength(0)
        expect(result.current.queue).toHaveLength(3) // [A, B, A] — A re-inserted at index 2
        expect(result.current.currentIndex).toBe(1)
      }
      finally {
        vi.useRealTimers()
      }
    })

    it('mAX_AGAIN_REQUEUES exceeded — card does not go to deferred on final Again', async () => {
      const card = makeVocabWithSRS()
      mockDueCardsQuery.mockReturnValue(
        makeDueCardsResult({ data: [card] as unknown as CardState[], isLoading: false }),
      )
      await seedVocab(card)

      const { result } = renderHook(() => useSrsSession(), { wrapper: makeWrapper() })
      await waitFor(() => expect(result.current.isVocabReady).toBe(true))
      act(() => result.current.startSession())
      await waitFor(() => expect(result.current.phase).toBe('active'))

      vi.useFakeTimers()
      try {
        // Cycle the card through deferred 3 times (MAX_AGAIN_REQUEUES = 3).
        // Each handleRate(0) re-registers the poll effect with fake setInterval.
        for (let i = 0; i < 3; i++) {
          act(() => result.current.handleRate(0))
          expect(result.current.deferred).toHaveLength(1)
          await act(async () => vi.advanceTimersByTime(10 * 60 * 1000 + 30_000))
          expect(result.current.deferred).toHaveLength(0)
        }

        // 4th Again: count (3) >= MAX (3) → falls through to srs.rate, NOT deferred
        act(() => result.current.handleRate(0))

        expect(result.current.deferred).toHaveLength(0)
        expect(mockRate).toHaveBeenCalledWith(
          expect.objectContaining({ vocab_id: card.vocab_id }),
          0,
        )
      }
      finally {
        vi.useRealTimers()
      }
    })
  })

  describe('handleAnswer — deferred Again queue', () => {
    async function seedVocab(card: ReturnType<typeof makeVocabWithSRS>) {
      await db.vocabulary.put({
        vocab_id: card.vocab_id,
        word: card.word,
        reading: card.reading,
        romaji: card.romaji,
        meaning_en: card.meaning_en,
        meaning_vi: card.meaning_vi,
        pitch_pattern: card.pitch_pattern,
        pitch_type: card.pitch_type,
        audio_filename: card.audio_filename,
        pos: card.pos,
        jlpt_level: card.jlpt_level,
        book_source: card.book_source,
        lesson_number: card.lesson_number,
        examples: card.examples,
        tags: card.tags,
        deprecated: card.deprecated,
      })
    }

    it('wrong answer goes to deferred when shouldRequeue is true', async () => {
      const card = makeVocabWithSRS()
      mockDueCardsQuery.mockReturnValue(
        makeDueCardsResult({ data: [card] as unknown as CardState[], isLoading: false }),
      )
      await seedVocab(card)
      mockAnswerTypeInput.mockReturnValue({ rating: 0, shouldRequeue: true })

      const { result } = renderHook(() => useSrsSession(), { wrapper: makeWrapper() })
      await waitFor(() => expect(result.current.isVocabReady).toBe(true))
      act(() => result.current.startSession())
      await waitFor(() => expect(result.current.phase).toBe('active'))

      act(() => result.current.handleAnswer(false))

      await waitFor(() => expect(result.current.deferred).toHaveLength(1))
      expect(mockRate).not.toHaveBeenCalled()
    })
  })
})
