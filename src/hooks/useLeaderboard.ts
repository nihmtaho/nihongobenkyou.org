import type { LeaderboardPeriod } from '../api/leaderboard'
import type { LeaderboardEntry } from '../types/user'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { fetchLeaderboard, subscribeToLeaderboardChanges } from '../api/leaderboard'

export type { LeaderboardPeriod }

export const PODIUM_SIZE = 3

// Safety-net polling in case Realtime misses events (e.g. reconnect gaps)
const FALLBACK_POLL_MS = 300_000

export interface UseLeaderboardResult {
  entries: LeaderboardEntry[]
  podium: LeaderboardEntry[] // top PODIUM_SIZE entries
  rest: LeaderboardEntry[] // entries ranked beyond podium
  myEntry: LeaderboardEntry | null // current user's entry if outside podium
  isLoading: boolean
  isError: boolean
}

export function useLeaderboard(period: LeaderboardPeriod = 'weekly', limit = 20): UseLeaderboardResult {
  const queryClient = useQueryClient()

  const query = useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard', period, limit],
    queryFn: () => fetchLeaderboard(period, limit),
    staleTime: 0,
    refetchInterval: FALLBACK_POLL_MS,
    retry: 0,
  })

  useEffect(() => {
    // Invalidate all leaderboard query variants on any score change so every
    // open period tab refreshes, not just the currently selected one.
    return subscribeToLeaderboardChanges(() => {
      void queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
    })
  }, [queryClient])

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
