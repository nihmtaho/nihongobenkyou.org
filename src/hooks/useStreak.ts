import type { StreakData } from '../db/schema'

import { db } from '../db/schema'
import { useLiveQuery } from '../lib/use-live-query'

export function useStreak(userId: string): StreakData | null | undefined {
  return useLiveQuery<StreakData | null>(
    async () => {
      if (!userId)
        return null
      const entries = await db.streaks
        .where('userId')
        .equals(userId)
        .sortBy('date')
      return entries.at(-1) ?? null
    },
    [userId],
  )
}
