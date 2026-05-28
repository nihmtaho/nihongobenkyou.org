import type { StreakData } from '../db/schema'
import type { ReviewLogEntry } from '../types/review-log'

import { db } from '../db/schema'
import { getLastNDates, getToday } from '../lib/date-utils'
import { useLiveQuery } from '../lib/use-live-query'

export interface DailyGoalHistoryEntry {
  date: string
  count: number
  achieved: boolean
}

export interface DailyGoalData {
  todayCount: number
  goal: number
  isComplete: boolean
  history: DailyGoalHistoryEntry[] // 7 entries, oldest first
}

export function useDailyGoal(
  userId: string,
  goal: number,
): { data: DailyGoalData | null, isLoading: boolean } {
  const entries = useLiveQuery<ReviewLogEntry[]>(
    () => userId
      ? db.review_log
          .filter(e => e.userId === userId)
          .toArray()
      : Promise.resolve([]),
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

  const isLoading = entries === undefined || streaks === undefined
  if (isLoading)
    return { data: null, isLoading: true }

  const today = getToday()
  const todayCount = entries.filter(e => e.reviewedAt.startsWith(today)).length

  const streakByDate = new Map(streaks.map(s => [s.date, s.cards_reviewed]))
  const last7 = getLastNDates(7)
  const history: DailyGoalHistoryEntry[] = last7.map((date) => {
    const count = streakByDate.get(date) ?? 0
    return { date, count, achieved: count >= goal }
  })

  return {
    data: {
      todayCount,
      goal,
      isComplete: todayCount >= goal,
      history,
    },
    isLoading: false,
  }
}
