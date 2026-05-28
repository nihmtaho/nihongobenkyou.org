import type { FontSize, MeaningLanguage } from '../types/study'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  activeTheme: string
  language: 'vi' | 'en'
  meaningLanguage: MeaningLanguage
  fontSize: FontSize
  darkMode: boolean
  syncEnabled: boolean
  newCardsPerDay: number
  dailyReviewGoal: number
  lastConfettiDate: string | null
  setNewCardsPerDay: (n: number) => void
  setDailyReviewGoal: (n: number) => void
  setLastConfettiDate: (date: string | null) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set): SettingsState => ({
      activeTheme: 'brutalist-mnn1',
      language: 'vi',
      meaningLanguage: 'vi',
      fontSize: 'md',
      darkMode: false,
      syncEnabled: true,
      newCardsPerDay: 20,
      dailyReviewGoal: 20,
      lastConfettiDate: null,
      setNewCardsPerDay: newCardsPerDay => set({ newCardsPerDay }),
      setDailyReviewGoal: dailyReviewGoal => set({ dailyReviewGoal }),
      setLastConfettiDate: lastConfettiDate => set({ lastConfettiDate }),
    }),
    { name: 'nihongo-settings' },
  ),
)
