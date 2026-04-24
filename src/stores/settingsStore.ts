import type { MeaningLanguage } from '../types/study'
import { create } from 'zustand'

interface SettingsState {
  activeTheme: string
  language: 'vi' | 'en'
  meaningLanguage: MeaningLanguage
}

// NOTE: persist middleware added in spec-003
export const useSettingsStore = create<SettingsState>()(() => ({
  activeTheme: 'brutalist-mnn1',
  language: 'vi',
  meaningLanguage: 'vi',
}))
