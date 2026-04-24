import type { SessionStats, StudyMode } from '../types/study'
import type { VocabWithSRS } from '../types/vocabulary'
import { create } from 'zustand'

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
  stats: SessionStats
  initSession: (queue: VocabWithSRS[], mode: StudyMode) => void
  markCorrect: () => void
  markWrong: (card: VocabWithSRS) => void
  advanceCard: () => void
  requeueWrongCards: () => void
  resetSession: () => void
}

export const useStudySessionStore = create<StudySessionState>()(set => ({
  queue: [],
  currentIndex: 0,
  mode: null,
  stats: { ...EMPTY_STATS },

  initSession: (queue, mode) =>
    set({ queue, mode, currentIndex: 0, stats: { ...EMPTY_STATS, startTime: new Date() } }),

  markCorrect: () =>
    set(s => ({ stats: { ...s.stats, correct: s.stats.correct + 1, total: s.stats.total + 1 } })),

  markWrong: card =>
    set(s => ({
      queue: [...s.queue, card],
      stats: { ...s.stats, total: s.stats.total + 1, wrongCards: [...s.stats.wrongCards, card] },
    })),

  advanceCard: () => set(s => ({ currentIndex: s.currentIndex + 1 })),

  requeueWrongCards: () =>
    set(s => ({
      queue: s.stats.wrongCards as VocabWithSRS[],
      currentIndex: 0,
      stats: { ...EMPTY_STATS, startTime: new Date() },
    })),

  resetSession: () =>
    set({ queue: [], currentIndex: 0, mode: null, stats: { ...EMPTY_STATS } }),
}))
