import type { RemoteReviewEvent, RemoteSnapshot } from '../types/review-log'
import { AuthError, NetworkError } from './auth'
import { supabase } from './supabase'

const DOWNLOAD_PAGE_SIZE = 500

function classifyError(error: { status?: number, message: string }): never {
  if (error.status === 401)
    throw new AuthError(error.message)
  if (!error.status || error.status >= 500)
    throw new NetworkError(error.message)
  throw new NetworkError(error.message)
}

export async function insertReviewEvents(
  events: Omit<RemoteReviewEvent, 'id'>[],
): Promise<number[]> {
  if (events.length === 0)
    return []

  const { data, error } = await supabase
    .from('review_log')
    .insert(events)
    .select('id')

  if (error)
    classifyError(error)

  return (data ?? []).map((row: { id: number }) => row.id)
}

export async function fetchReviewEventsSince(
  userId: string,
  cursor: number,
): Promise<RemoteReviewEvent[]> {
  const allEvents: RemoteReviewEvent[] = []
  let currentCursor = cursor

  while (true) {
    const { data, error } = await supabase
      .from('review_log')
      .select('id,user_id,vocab_id,book_source,card_type,rating,interval_days,ease_factor,due_date,review_count,is_known,reviewed_at')
      .eq('user_id', userId)
      .gt('id', currentCursor)
      .order('id', { ascending: true })
      .limit(DOWNLOAD_PAGE_SIZE)

    if (error)
      classifyError(error)

    const page = (data ?? []) as RemoteReviewEvent[]
    allEvents.push(...page)

    if (page.length < DOWNLOAD_PAGE_SIZE)
      break

    currentCursor = page[page.length - 1].id
  }

  return allEvents
}

export async function fetchUserCardSnapshots(userId: string): Promise<RemoteSnapshot[]> {
  const { data, error } = await supabase
    .from('user_card_snapshots')
    .select('user_id,vocab_id,card_type,interval_days,ease_factor,due_date,review_count,last_rating,is_known,snapshot_at,cursor_id')
    .eq('user_id', userId)

  if (error)
    classifyError(error)

  return (data ?? []) as RemoteSnapshot[]
}

export async function upsertUserCardSnapshots(snapshots: RemoteSnapshot[]): Promise<void> {
  if (snapshots.length === 0)
    return

  const { error } = await supabase
    .from('user_card_snapshots')
    .upsert(snapshots, { onConflict: 'user_id,vocab_id,card_type' })

  if (error)
    classifyError(error)
}
