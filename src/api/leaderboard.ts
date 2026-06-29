import type { LeaderboardEntry } from '../types/user'
import { AuthError, NetworkError } from './auth'
import { supabase } from './supabase'

export type LeaderboardPeriod = 'weekly' | 'monthly' | 'all_time'

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

/** ISO date string for the first day of the current month in Vietnam time (UTC+7). */
function getVnMonthStart(): string {
  const vnDateStr = new Date().toLocaleString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
  const [datePart] = vnDateStr.split(',')
  const [year, month] = datePart.trim().split('-')
  return `${year}-${month}-01`
}

/**
 * Fetches the leaderboard for the given period.
 * - weekly: uses the get_weekly_leaderboard RPC (handles auth.uid() and ranking server-side)
 * - monthly / all_time: queries leaderboard_scores directly and aggregates client-side.
 *   display_name falls back to 'Người dùng' because profiles RLS restricts cross-user reads.
 */
export async function fetchLeaderboard(period: LeaderboardPeriod = 'weekly', limit = 20): Promise<LeaderboardEntry[]> {
  if (period === 'weekly') {
    const { data, error } = await supabase.rpc('get_weekly_leaderboard', { p_limit: limit })
    if (error)
      classifyError(error)
    return (data ?? []) as LeaderboardEntry[]
  }

  // monthly / all_time: public SELECT on leaderboard_scores (RLS: `USING (true)`)
  const baseQuery = supabase
    .from('leaderboard_scores')
    .select('user_id, cards_reviewed')

  const { data, error } = await (
    period === 'monthly'
      ? baseQuery.gte('week_start', getVnMonthStart())
      : baseQuery
  )

  if (error)
    classifyError(error)

  const { data: userData } = await supabase.auth.getUser()
  const currentUserId = userData?.user?.id

  // Aggregate cards_reviewed across weeks per user
  const totals = new Map<string, number>()
  for (const row of (data ?? [])) {
    totals.set(row.user_id as string, (totals.get(row.user_id as string) ?? 0) + (row.cards_reviewed as number))
  }

  const sorted = Array.from(totals.entries()).sort((a, b) => b[1] - a[1])

  const entries: LeaderboardEntry[] = sorted.map(([user_id, cards_reviewed], i) => ({
    rank: i + 1,
    user_id,
    display_name: 'Người dùng',
    avatar_url: null,
    cards_reviewed,
    is_current_user: user_id === currentUserId,
  }))

  // Return top N + current user's entry if outside top N (mirrors RPC behaviour)
  const topN = entries.slice(0, limit)
  const myEntry = entries.find(e => e.is_current_user)
  if (myEntry && !topN.some(e => e.is_current_user))
    return [...topN, myEntry]

  return topN
}

/**
 * Subscribes to leaderboard_scores changes via Supabase Realtime.
 * Returns an unsubscribe function to be called on cleanup.
 */
export function subscribeToLeaderboardChanges(callback: () => void): () => void {
  const channel = supabase
    .channel('leaderboard-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'leaderboard_scores' }, callback)
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}

/** @deprecated Use fetchLeaderboard('weekly', limit) */
export async function fetchWeeklyLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  return fetchLeaderboard('weekly', limit)
}
