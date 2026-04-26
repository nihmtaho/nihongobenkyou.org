import type { StreakData } from '../db/schema'

import { useQuery } from '@tanstack/react-query'

import { db } from '../db/schema'

export function useStreak(userId: string) {
  return useQuery<StreakData | null>({
    queryKey: ['streak', userId],
    queryFn: async () => {
      const entries = await db.streaks
        .where('userId')
        .equals(userId)
        .sortBy('date')
      return entries.at(-1) ?? null
    },
    enabled: !!userId,
    staleTime: 0,
  })
}
