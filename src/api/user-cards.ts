import { AuthError, NetworkError } from './auth'
import { supabase } from './supabase'

export class SyncError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SyncError'
  }
}

export interface RemoteUserCard {
  user_id: string
  vocab_id: string
  book_source: string
  interval_days: number
  ease_factor: number
  due_date: string
  review_count: number
  last_rating: number | null
  updated_at: string
  is_known: boolean
}

function classifyError(error: { status?: number, message: string }): never {
  if (error.status === 401)
    throw new AuthError(error.message)
  if (!error.status || error.status >= 500)
    throw new NetworkError(error.message)
  throw new SyncError(error.message)
}

export async function fetchRemoteUserCards(userId: string): Promise<RemoteUserCard[]> {
  const { data, error } = await supabase
    .from('user_cards')
    .select('user_id,vocab_id,book_source,interval_days,ease_factor,due_date,review_count,last_rating,updated_at,is_known')
    .eq('user_id', userId)

  if (error)
    classifyError(error)

  return (data ?? []) as RemoteUserCard[]
}

export async function upsertUserCardsLWW(rows: RemoteUserCard[]): Promise<void> {
  if (rows.length === 0)
    return

  const { error } = await supabase.rpc('upsert_user_cards_lww', { p_rows: rows })

  if (error)
    classifyError(error)
}
