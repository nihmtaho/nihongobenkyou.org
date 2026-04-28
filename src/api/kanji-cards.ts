import type { KanjiCardState } from '../types/kanji'
import { db } from '../db/schema'
import { supabase } from './supabase'

export class KanjiSyncError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'KanjiSyncError'
  }
}

export async function flushKanjiCards(userId: string): Promise<void> {
  const pending = await db.kanji_cards
    .where('pending_sync')
    .equals(1)
    .filter(c => c.userId === userId)
    .toArray()

  if (pending.length === 0)
    return

  const rows = pending.map(card => ({
    user_id: card.userId,
    char: card.char,
    interval_days: card.interval_days,
    ease_factor: card.ease_factor,
    due_date: card.due_date,
    review_count: card.review_count,
    last_rating: card.last_rating,
    updated_at: card.updated_at,
  }))

  const { error } = await supabase
    .from('kanji_cards')
    .upsert(rows, { onConflict: 'user_id,char' })

  if (error)
    throw new KanjiSyncError(error.message)

  await db.kanji_cards
    .where('[userId+char]')
    .anyOf(pending.map(c => [c.userId, c.char]))
    .modify({ pending_sync: false } as Partial<KanjiCardState>)
}
