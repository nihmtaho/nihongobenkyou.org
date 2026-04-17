import { create } from 'zustand'

interface StudySessionState {
  queue: unknown[]
  currentIndex: number
  mode: 'flashcard' | 'quiz' | 'type-input' | null
}

export const useStudySessionStore = create<StudySessionState>()(() => ({
  queue: [],
  currentIndex: 0,
  mode: null,
}))
