import type { UseQueryResult } from '@tanstack/react-query'
import type { CardState } from '../types/srs'
import type { VocabWithSRS } from '../types/vocabulary'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useSrsSession } from './useSrsSession'

// --- Mocks ---

vi.mock('../db/schema', () => ({
  db: {
    user_cards: {
      where: vi.fn().mockReturnValue({
        above: vi.fn().mockReturnValue({
          filter: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
        }),
      }),
      equals: vi.fn().mockReturnValue({ count: vi.fn().mockResolvedValue(0) }),
    },
    vocabulary: {
      where: vi.fn().mockReturnValue({
        anyOf: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
      }),
    },
    sessions: { add: vi.fn().mockResolvedValue(undefined) },
    streaks: {
      get: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({ first: vi.fn().mockResolvedValue(undefined) }),
      }),
    },
  },
}))

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

function makeVocabWithSRS(overrides: Partial<VocabWithSRS> = {}): VocabWithSRS {
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
    review_count: 0,
    last_rating: null,
    pending_sync: false,
    updated_at: new Date().toISOString(),
    is_known: false,
    ...overrides,
  }
}

// --- Tests ---

describe('useSrsSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStreakQuery.mockReturnValue({ data: null })
    mockMeaningLanguage.mockReturnValue('vi')
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

      const { db } = await import('../db/schema')
      vi.mocked(db.vocabulary.where).mockReturnValue({
        anyOf: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([{ vocab_id: dueCard.vocab_id }]),
        }),
      } as unknown as ReturnType<typeof db.vocabulary.where>)

      const { result } = renderHook(() => useSrsSession(), { wrapper: makeWrapper() })

      await waitFor(() => expect(result.current.phase).toBe('pre-session'))
      await waitFor(() => expect(result.current.vocabItems).toBeDefined())
      await waitFor(() => expect(result.current.isVocabReady).toBe(true))
    })
  })
})
