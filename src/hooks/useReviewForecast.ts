import { useMemo } from 'react'
import { db } from '../db/schema'
import { useLiveQuery } from '../lib/use-live-query'

export interface ForecastDay {
  date: string
  label: string
  count: number
  isToday: boolean
}

const WEEKDAY_LABELS: readonly string[] = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

function buildNext7Dates(today: string): string[] {
  const dates: string[] = []
  const base = new Date(today)
  for (let offset = 0; offset <= 6; offset++) {
    const d = new Date(base)
    d.setDate(base.getDate() + offset)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

export function useReviewForecast(userId: string) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const next7 = buildNext7Dates(today)
  const endDate = next7[6]

  const allCards = useLiveQuery(
    () => db.srs_cards
      .where('[userId+due]')
      .between([userId, today], [userId, endDate], true, true)
      .toArray(),
    [userId, today],
  )

  if (allCards === undefined)
    return { data: undefined, isLoading: true }

  const countPerDay: Record<string, number> = {}
  for (const card of allCards) {
    countPerDay[card.due] = (countPerDay[card.due] ?? 0) + 1
  }

  const data: ForecastDay[] = next7.map((date) => {
    const jsDay = new Date(date).getDay()
    return {
      date,
      label: WEEKDAY_LABELS[jsDay],
      count: countPerDay[date] ?? 0,
      isToday: date === today,
    }
  })

  return { data, isLoading: false }
}
