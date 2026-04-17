import { create } from 'zustand'

interface SettingsState {
  activeTheme: string
  language: 'vi' | 'en'
}

// NOTE: persist middleware added in spec-003
export const useSettingsStore = create<SettingsState>()(() => ({
  activeTheme: 'brutalist-mnn1',
  language: 'vi',
}))
