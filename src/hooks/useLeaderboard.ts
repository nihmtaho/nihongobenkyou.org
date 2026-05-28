import type { LeaderboardEntry } from '../types/user'
import { useQuery } from '@tanstack/react-query'
import { fetchWeeklyLeaderboard } from '../api/leaderboard'

export interface UseLeaderboardResult {
  entries: LeaderboardEntry[]
  podium: LeaderboardEntry[] // top 3 (for podium component)
  rest: LeaderboardEntry[] // rank 4+ (for list component)
  myEntry: LeaderboardEntry | null // current user's entry if outside top 3
  isLoading: boolean
  isError: boolean
  isStale: boolean
}

export function useLeaderboard(limit = 20): UseLeaderboardResult {
  const query = useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard', 'weekly', limit],
    queryFn: () => fetchWeeklyLeaderboard(limit),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const entries = query.data ?? []
  const podium = entries.filter(e => e.rank <= 3)
  const rest = entries.filter(e => e.rank > 3 && !e.is_current_user)
  const myEntryRaw = entries.find(e => e.is_current_user) ?? null
  // Only show sticky footer if the user is NOT in the podium
  const myEntry = myEntryRaw && myEntryRaw.rank > 3 ? myEntryRaw : null

  return {
    entries,
    podium,
    rest,
    myEntry,
    isLoading: query.isLoading,
    isError: query.isError,
    isStale: query.isStale,
  }
}
