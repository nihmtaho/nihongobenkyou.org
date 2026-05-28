import type { LeaderboardEntry } from '../types/user'
import { AuthError, NetworkError } from './auth'
import { supabase } from './supabase'

export class LeaderboardError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LeaderboardError'
  }
}

function classifyError(error: { status?: number, message: string }): never {
  if (error.status === 401)
    throw new AuthError(error.message)
  if (!error.status || error.status >= 500)
    throw new NetworkError(error.message)
  throw new LeaderboardError(error.message)
}

/**
 * Fetches the weekly leaderboard via Supabase RPC.
 * Returns top `limit` entries plus the calling user's entry (always included).
 * Requires the user to be authenticated (RPC uses auth.uid()).
 */
export async function fetchWeeklyLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('get_weekly_leaderboard', {
    p_limit: limit,
  })

  if (error)
    classifyError(error)

  return (data ?? []) as LeaderboardEntry[]
}
