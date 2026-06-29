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
  reminderTime: string
  dailyTarget: number
  notificationsEnabled: boolean
  requestRetention: number
  setNewCardsPerDay: (n: number) => void
  setDailyReviewGoal: (n: number) => void
  setLastConfettiDate: (date: string | null) => void
  setReminderTime: (time: string) => void
  setDailyTarget: (target: number) => void
  setDarkMode: (v: boolean) => void
  setNotificationsEnabled: (v: boolean) => void
  setRequestRetention: (retention: number) => void
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
      reminderTime: '20:00',
      dailyTarget: 20,
      notificationsEnabled: false,
      requestRetention: 0.9,
      setNewCardsPerDay: newCardsPerDay => set({ newCardsPerDay }),
      setDailyReviewGoal: dailyReviewGoal => set({ dailyReviewGoal }),
      setLastConfettiDate: lastConfettiDate => set({ lastConfettiDate }),
      setReminderTime: reminderTime => set({ reminderTime }),
      setDailyTarget: dailyTarget => set({ dailyTarget }),
      setDarkMode: darkMode => set({ darkMode }),
      setNotificationsEnabled: notificationsEnabled => set({ notificationsEnabled }),
      setRequestRetention: requestRetention => set({ requestRetention }),
    }),
    { name: 'nihongo-settings' },
  ),
)
