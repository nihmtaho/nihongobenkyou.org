import { useQuery } from '@tanstack/react-query'
import { getDueCards } from '../db/srs-cards'

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

export async function getForecast(userId: string): Promise<ForecastDay[]> {
  const today = new Date().toISOString().slice(0, 10)
  const next7 = buildNext7Dates(today)
  const endDate = next7[6]

  // getDueCards returns cards where due <= endDate (includes overdue); filter to today+ for forecast
  const allCards = await getDueCards(userId, endDate)
  const futureCards = allCards.filter(c => c.due >= today)

  const countPerDay: Record<string, number> = {}
  for (const card of futureCards) {
    countPerDay[card.due] = (countPerDay[card.due] ?? 0) + 1
  }

  return next7.map((date) => {
    const jsDay = new Date(date).getDay()
    return {
      date,
      label: WEEKDAY_LABELS[jsDay],
      count: countPerDay[date] ?? 0,
      isToday: date === today,
    }
  })
}

export function useReviewForecast(userId: string) {
  return useQuery({
    queryKey: ['review-forecast', userId],
    queryFn: () => getForecast(userId),
    enabled: !!userId,
    staleTime: 0,
  })
}
