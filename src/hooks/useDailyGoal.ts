import type { StreakData } from '../db/schema'

import { db } from '../db/schema'
import { getLastNDates, getToday } from '../lib/date-utils'
import { useLiveQuery } from '../lib/use-live-query'
import { useSettingsStore } from '../stores/settingsStore'

export interface DailyGoalData {
  todayCount: number
  goal: number
  isComplete: boolean
  streak7: number[] // 7 counts, oldest (index 0) to today (index 6)
}

export function useDailyGoal(
  userId: string,
): { data: DailyGoalData | null, isLoading: boolean } {
  const goal = useSettingsStore(s => s.dailyReviewGoal)
  const today = getToday()

  // Use the reviewedAt index to avoid a full table scan; filter userId in JS
  // (no standalone userId index on review_log — compound [userId+vocabId+cardType] only)
  const todayCount = useLiveQuery<number>(
    () => userId
      ? db.review_log
          .where('reviewedAt')
          .startsWith(today)
          .filter(e => e.userId === userId)
          .count()
      : Promise.resolve(0),
    [userId],
  )

  const streaks = useLiveQuery<StreakData[]>(
    () => userId
      ? db.streaks.where('userId').equals(userId).toArray()
      : Promise.resolve([]),
    [userId],
  )

  if (!userId)
    return { data: null, isLoading: false }

  const isLoading = todayCount === undefined || streaks === undefined
  if (isLoading)
    return { data: null, isLoading: true }

  const streakByDate = new Map(streaks.map(s => [s.date, s.cards_reviewed]))
  const streak7 = getLastNDates(7).map(date => streakByDate.get(date) ?? 0)

  return {
    data: {
      todayCount,
      goal,
      isComplete: todayCount >= goal,
      streak7,
    },
    isLoading: false,
  }
}
