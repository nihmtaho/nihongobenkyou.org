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
  setNewCardsPerDay: (n: number) => void
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
      setNewCardsPerDay: newCardsPerDay => set({ newCardsPerDay }),
    }),
    { name: 'nihongo-settings' },
  ),
)
