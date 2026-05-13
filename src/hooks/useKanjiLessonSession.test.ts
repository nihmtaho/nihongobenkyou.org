import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useKanjiLessonSession } from './useKanjiLessonSession'

const mockKanjiRate = vi.fn()

vi.mock('../stores/authStore', () => ({
  // eslint-disable-next-line react/component-hook-factories
  useAuthStore: (sel: (s: { userId: string }) => unknown) => sel({ userId: 'user-1' }),
}))

const mockSRSReturn = {
  dueCards: { data: [], isLoading: false },
  rate: mockKanjiRate,
  answerTypeInput: vi.fn(),
  resetTypeInputTracking: vi.fn(),
}

vi.mock('./useSRS', () => ({
  // eslint-disable-next-line react/component-hook-factories
  useSRS: () => mockSRSReturn,
}))

const mockKanjiItems = [
  {
    kanji: {
      char: '日',
      han_viet: 'NHẬT',
      lesson_number: 1,
      meaning_vi: ['ngày'],
      related_vocab: [],
      examples: [],
    },
    card: null,
  },
  {
    kanji: {
      char: '月',
      han_viet: 'NGUYỆT',
      lesson_number: 1,
      meaning_vi: ['tháng'],
      related_vocab: [],
      examples: [],
    },
    card: null,
  },
]

vi.mock('./useKanjiLessonData', () => ({
  // eslint-disable-next-line react/component-hook-factories
  useKanjiLessonData: () => ({
    items: mockKanjiItems,
    isLoading: false,
  }),
}))

vi.mock('./useVocabLessonData', () => ({
  // eslint-disable-next-line react/component-hook-factories
  useVocabLessonData: () => ({
    vocab: [],
    hanVietMap: new Map(),
    isLoading: false,
  }),
}))

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useKanjiLessonSession', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('phase transitions', () => {
    it('transitions from loading to pre-session when data is ready', async () => {
      const { result } = renderHook(
        () => useKanjiLessonSession(1, 'kanji'),
        { wrapper: makeWrapper() },
      )
      await waitFor(() => expect(result.current.phase).toBe('pre-session'))
    })
  })

  describe('totalItems', () => {
    it('returns item count for kanji type', async () => {
      const { result } = renderHook(
        () => useKanjiLessonSession(1, 'kanji'),
        { wrapper: makeWrapper() },
      )
      await waitFor(() => expect(result.current.phase).toBe('pre-session'))
      expect(result.current.totalItems).toBe(2)
    })
  })

  describe('handleStart', () => {
    it('transitions to active and populates kanjiQueue', async () => {
      const { result } = renderHook(
        () => useKanjiLessonSession(1, 'kanji'),
        { wrapper: makeWrapper() },
      )
      await waitFor(() => expect(result.current.phase).toBe('pre-session'))
      act(() => result.current.handleStart())
      expect(result.current.phase).toBe('active')
      expect(result.current.kanjiQueue).toHaveLength(2)
      expect(result.current.currentIndex).toBe(0)
    })

    it('resets stats on start', async () => {
      const { result } = renderHook(
        () => useKanjiLessonSession(1, 'kanji'),
        { wrapper: makeWrapper() },
      )
      await waitFor(() => expect(result.current.phase).toBe('pre-session'))
      act(() => result.current.handleStart())
      expect(result.current.stats.correct).toBe(0)
      expect(result.current.stats.total).toBe(0)
      expect(result.current.stats.ratingCounts).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0 })
    })
  })

  describe('handleKanjiRate', () => {
    it('advances currentIndex', async () => {
      const { result } = renderHook(
        () => useKanjiLessonSession(1, 'kanji'),
        { wrapper: makeWrapper() },
      )
      await waitFor(() => expect(result.current.phase).toBe('pre-session'))
      act(() => result.current.handleStart())
      act(() => result.current.handleKanjiRate(2))
      expect(result.current.currentIndex).toBe(1)
    })

    it('increments stats.total', async () => {
      const { result } = renderHook(
        () => useKanjiLessonSession(1, 'kanji'),
        { wrapper: makeWrapper() },
      )
      await waitFor(() => expect(result.current.phase).toBe('pre-session'))
      act(() => result.current.handleStart())
      act(() => result.current.handleKanjiRate(2))
      expect(result.current.stats.total).toBe(1)
    })

    it('transitions to complete when last card rated', async () => {
      const { result } = renderHook(
        () => useKanjiLessonSession(1, 'kanji'),
        { wrapper: makeWrapper() },
      )
      await waitFor(() => expect(result.current.phase).toBe('pre-session'))
      act(() => result.current.handleStart())
      act(() => result.current.handleKanjiRate(2))
      act(() => result.current.handleKanjiRate(2))
      expect(result.current.phase).toBe('complete')
    })
  })

  describe('initial stats', () => {
    it('starts with all-zero stats', () => {
      const { result } = renderHook(
        () => useKanjiLessonSession(1, 'kanji'),
        { wrapper: makeWrapper() },
      )
      expect(result.current.stats.correct).toBe(0)
      expect(result.current.stats.total).toBe(0)
    })
  })
})
