import type { SessionStats, StudyMode, TypeInputSubMode } from '../types/study'
import type { VocabWithSRS } from '../types/vocabulary'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const EMPTY_STATS: SessionStats = {
  correct: 0,
  total: 0,
  startTime: new Date(),
  wrongCards: [],
}

interface StudySessionState {
  queue: VocabWithSRS[]
  currentIndex: number
  mode: StudyMode | null
  typeInputSubMode: TypeInputSubMode
  stats: SessionStats
  initSession: (queue: VocabWithSRS[], mode: StudyMode, typeInputSubMode?: TypeInputSubMode) => void
  markCorrect: () => void
  markWrong: (card: VocabWithSRS) => void
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
      stats: { ...EMPTY_STATS },

      initSession: (queue, mode, typeInputSubMode = 'word→hira') =>
        set({ queue, mode, typeInputSubMode, currentIndex: 0, stats: { ...EMPTY_STATS, startTime: new Date() } }),

      markCorrect: () =>
        set(s => ({ stats: { ...s.stats, correct: s.stats.correct + 1, total: s.stats.total + 1 } })),

      markWrong: card =>
        set(s => ({
          queue: [...s.queue, card],
          stats: { ...s.stats, total: s.stats.total + 1, wrongCards: [...s.stats.wrongCards, card] },
        })),

      markAttempted: () =>
        set(s => ({ stats: { ...s.stats, total: s.stats.total + 1 } })),

      advanceCard: () => set(s => ({ currentIndex: s.currentIndex + 1 })),

      requeueWrongCards: () =>
        set(s => ({
          queue: s.stats.wrongCards as VocabWithSRS[],
          currentIndex: 0,
          stats: { ...EMPTY_STATS, startTime: new Date() },
        })),

      resetSession: () =>
        set({ queue: [], currentIndex: 0, mode: null, stats: { ...EMPTY_STATS } }),
    }),
    {
      name: 'study-session',
      // Only persist wrongCards — the active session queue/index/mode are ephemeral
      partialize: state => ({ wrongCards: state.stats.wrongCards }),
      merge: (persisted, current) => ({
        ...current,
        stats: {
          ...current.stats,
          wrongCards: (persisted as { wrongCards?: VocabWithSRS[] })?.wrongCards ?? [],
        },
      }),
    },
  ),
)
