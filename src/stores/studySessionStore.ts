import type { SessionStats, StudyMode, TypeInputSubMode } from '../types/study'
import type { CardTypeFilter, UnifiedCard } from '../types/unified-card'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const EMPTY_STATS: SessionStats = {
  correct: 0,
  total: 0,
  startTime: new Date(),
  wrongCards: [],
}

interface StudySessionState {
  queue: UnifiedCard[]
  currentIndex: number
  mode: StudyMode | null
  typeInputSubMode: TypeInputSubMode
  deckSource: 'lesson' | 'active-vocab-deck' | 'active-kanji-deck'
  filter: CardTypeFilter
  stats: SessionStats
  initSession: (
    queue: UnifiedCard[],
    mode: StudyMode,
    typeInputSubMode?: TypeInputSubMode,
    deckSource?: 'lesson' | 'active-vocab-deck' | 'active-kanji-deck',
    filter?: CardTypeFilter,
  ) => void
  markCorrect: () => void
  markWrong: (card: UnifiedCard) => void
  markNeedsReview: (card: UnifiedCard) => void
  markAttempted: () => void
  advanceCard: () => void
  requeueWrongCards: () => void
  resetSession: () => void
}

export const useStudySessionStore = create<StudySessionState>()(
  persist(
    set => ({
      queue: [],
      currentIndex: 0,
      mode: null,
      typeInputSubMode: 'word→hira',
      deckSource: 'lesson',
      filter: 'all',
      stats: { ...EMPTY_STATS },

      initSession: (queue, mode, typeInputSubMode = 'word→hira', deckSource = 'lesson', filter = 'all') =>
        set({ queue, mode, typeInputSubMode, deckSource, filter, currentIndex: 0, stats: { ...EMPTY_STATS, startTime: new Date() } }),

      markCorrect: () =>
        set(s => ({ stats: { ...s.stats, correct: s.stats.correct + 1, total: s.stats.total + 1 } })),

      markWrong: card =>
        set(s => ({
          queue: [...s.queue, card],
          stats: { ...s.stats, total: s.stats.total + 1, wrongCards: [...s.stats.wrongCards, card as never] },
        })),

      markNeedsReview: card =>
        set(s => ({
          stats: { ...s.stats, total: s.stats.total + 1, wrongCards: [...s.stats.wrongCards, card as never] },
        })),

      markAttempted: () =>
        set(s => ({ stats: { ...s.stats, total: s.stats.total + 1 } })),

      advanceCard: () => set(s => ({ currentIndex: s.currentIndex + 1 })),

      requeueWrongCards: () =>
        set(s => ({
          queue: s.stats.wrongCards as UnifiedCard[],
          currentIndex: 0,
          stats: { ...EMPTY_STATS, startTime: new Date() },
        })),

      resetSession: () =>
        set({ queue: [], currentIndex: 0, mode: null, deckSource: 'lesson', filter: 'all', stats: { ...EMPTY_STATS } }),
    }),
    {
      name: 'study-session',
      partialize: state => ({ wrongCards: state.stats.wrongCards }),
      merge: (persisted, current) => ({
        ...current,
        stats: {
          ...current.stats,
          wrongCards: (persisted as { wrongCards?: UnifiedCard[] })?.wrongCards ?? [],
        },
      }),
    },
  ),
)
