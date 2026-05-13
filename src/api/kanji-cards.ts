import type { SRSCard } from '../types/srs'
import { db } from '../db/schema'
import { supabase } from './supabase'

export class KanjiSyncError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'KanjiSyncError'
  }
}

export async function flushKanjiCards(userId: string): Promise<void> {
  const pending = await db.srs_cards
    .where('[userId+cardType]')
    .equals([userId, 'kanji'])
    .filter(c => c.pending_sync === true)
    .toArray()

  if (pending.length === 0)
    return

  const rows = pending.map(card => ({
    user_id: card.userId,
    char: card.cardId,
    interval_days: card.scheduled_days,
    ease_factor: 2.5,
    due_date: card.due,
    review_count: card.reps,
    last_rating: card.last_rating,
    updated_at: card.updated_at,
  }))

  const { error } = await supabase
    .from('kanji_cards')
    .upsert(rows, { onConflict: 'user_id,char' })

  if (error)
    throw new KanjiSyncError(error.message)

  const uploadedKeys = pending.map(c => [c.userId, c.cardId] as [string, string])
  await db.srs_cards
    .where('[userId+cardId]')
    .anyOf(uploadedKeys as never[])
    .modify({ pending_sync: false } as Partial<SRSCard>)
}
