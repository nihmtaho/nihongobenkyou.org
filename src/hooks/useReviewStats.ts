import type { ReviewLogEntry } from '../types/review-log'

import { useQuery } from '@tanstack/react-query'
import { db } from '../db/schema'

export interface DayActivity {
  date: string // 'YYYY-MM-DD'
  label: string // 'CN','T2','T3','T4','T5','T6','T7'
  count: number // total reviews that day
}

export interface ReviewStats {
  streak: number
  todayCount: number
  weekCount: number
  avgPerDay: number
  totalCount: number
  monthCount: number
  last7Days: DayActivity[]
  ratingDistribution: Array<{
    label: string
    count: number
    pct: number
    color: string
  }>
  maxDayCount: number
}

// Vietnamese weekday labels: JS getDay() returns 0=Sunday...6=Saturday
const WEEKDAY_LABELS: readonly string[] = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

const RATING_CONFIG = [
  { label: 'Quên', color: 'text-error' },
  { label: 'Khó', color: 'text-warning' },
  { label: 'Ôn', color: 'text-success' },
  { label: 'Dễ', color: 'text-info' },
] as const

const STALE_TIME = 60_000

function getToday(): string {
  return new Date().toISOString().slice(0, 10)
}

// Compute ISO date string for the Monday of the current week.
// getDay() returns 0 for Sunday; treat Sunday as day 7 so Monday is always day 1.
function getMondayOfCurrentWeek(today: string): string {
  const d = new Date(today)
  const dayOfWeek = d.getDay() || 7 // 1=Mon … 7=Sun
  const daysToSubtract = dayOfWeek - 1 // 0 on Monday, 6 on Sunday
  d.setDate(d.getDate() - daysToSubtract)
  return d.toISOString().slice(0, 10)
}

function buildLast7Dates(today: string): string[] {
  const dates: string[] = []
  const base = new Date(today)
  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date(base)
    d.setDate(base.getDate() - offset)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

function computeStats(entries: ReviewLogEntry[], streak: number): ReviewStats {
  const today = getToday()
  const monday = getMondayOfCurrentWeek(today)
  const currentMonth = today.slice(0, 7) // 'YYYY-MM'
  const last7Dates = buildLast7Dates(today)
  const cutoff7Days = last7Dates[0] // oldest of the 7 dates

  // Aggregate counts in a single pass over all entries.
  let todayCount = 0
  let weekCount = 0
  let monthCount = 0
  const countPerDay: Record<string, number> = {}
  const ratingCounts: [number, number, number, number] = [0, 0, 0, 0]

  for (const entry of entries) {
    const date = entry.reviewedAt.slice(0, 10)

    if (date === today)
      todayCount++
    if (date >= monday)
      weekCount++
    if (date.startsWith(currentMonth))
      monthCount++

    if (date >= cutoff7Days) {
      countPerDay[date] = (countPerDay[date] ?? 0) + 1

      // Rating distribution is scoped to the last 7 days only.
      const r = entry.rating as 0 | 1 | 2 | 3
      if (r >= 0 && r <= 3)
        ratingCounts[r]++
    }
  }

  const last7Days: DayActivity[] = last7Dates.map((date) => {
    const jsDay = new Date(date).getDay() // 0=Sun…6=Sat
    return {
      date,
      label: WEEKDAY_LABELS[jsDay],
      count: countPerDay[date] ?? 0,
    }
  })

  const maxDayCount = Math.max(0, ...last7Days.map(d => d.count))

  const activeDays = last7Days.filter(d => d.count > 0).length
  const avgPerDay = activeDays === 0
    ? 0
    : Math.round((last7Days.reduce((sum, d) => sum + d.count, 0) / 7) * 10) / 10

  const totalRatingsIn7Days = ratingCounts.reduce((a, b) => a + b, 0)
  const ratingDistribution = RATING_CONFIG.map(({ label, color }, i) => {
    const count = ratingCounts[i]
    const pct = totalRatingsIn7Days === 0
      ? 0
      : Math.round((count / totalRatingsIn7Days) * 100)
    return { label, count, pct, color }
  })

  return {
    streak,
    todayCount,
    weekCount,
    avgPerDay,
    totalCount: entries.length,
    monthCount,
    last7Days,
    ratingDistribution,
    maxDayCount,
  }
}

async function fetchReviewStats(userId: string): Promise<ReviewStats> {
  const [entries, latestStreak] = await Promise.all([
    // review_log has no standalone userId index — compound index is [userId+vocabId+cardType].
    // A full-table filter is acceptable here; review logs are per-device and bounded in size.
    db.review_log.filter(e => e.userId === userId).toArray(),
    // Sort ascending by date; the last element is the most recent streak record.
    db.streaks
      .where('userId')
      .equals(userId)
      .sortBy('date')
      .then(rows => rows.at(-1) ?? null),
  ])

  const streak = latestStreak?.current_streak ?? 0
  return computeStats(entries, streak)
}

export function useReviewStats(userId: string): { data: ReviewStats | null, isLoading: boolean } {
  const { data = null, isLoading } = useQuery({
    queryKey: ['review-stats', userId],
    queryFn: () => fetchReviewStats(userId),
    staleTime: STALE_TIME,
    enabled: !!userId,
    retry: 2,
  })

  return { data, isLoading }
}
