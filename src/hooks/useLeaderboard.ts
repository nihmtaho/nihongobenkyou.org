import type { LeaderboardEntry } from '../types/user'
import { useQuery } from '@tanstack/react-query'
import { fetchWeeklyLeaderboard } from '../api/leaderboard'

export const PODIUM_SIZE = 3

export interface UseLeaderboardResult {
  entries: LeaderboardEntry[]
  podium: LeaderboardEntry[] // top PODIUM_SIZE entries
  rest: LeaderboardEntry[] // entries ranked beyond podium
  myEntry: LeaderboardEntry | null // current user's entry if outside podium
  isLoading: boolean
  isError: boolean
}

export function useLeaderboard(limit = 20): UseLeaderboardResult {
  const query = useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard', 'weekly', limit],
    queryFn: () => fetchWeeklyLeaderboard(limit),
    // refetchInterval keeps data fresh; staleTime: Infinity prevents isStale
    // from flickering as a false "offline" signal between 60 s refetch cycles.
    staleTime: Number.POSITIVE_INFINITY,
    refetchInterval: 60_000,
    retry: 0,
  })

  const entries = query.data ?? []
  const podium = entries.filter(e => e.rank <= PODIUM_SIZE)
  const rest = entries.filter(e => e.rank > PODIUM_SIZE && !e.is_current_user)
  const myEntryRaw = entries.find(e => e.is_current_user) ?? null
  // Only show sticky footer if the user is NOT in the podium
  const myEntry = myEntryRaw && myEntryRaw.rank > PODIUM_SIZE ? myEntryRaw : null

  return {
    entries,
    podium,
    rest,
    myEntry,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}
