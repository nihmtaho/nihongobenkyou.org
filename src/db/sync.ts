import { supabase } from '../api/supabase'
import { useAuthStore } from '../stores/authStore'
import { db } from './schema'

export class SyncError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SyncError'
  }
}

export async function flushPendingSync(): Promise<void> {
  const { userId } = useAuthStore.getState()
  if (!userId)
    return

  const pending = await db.user_cards
    .where('pending_sync')
    .equals(1)
    .filter(card => card.userId === userId)
    .toArray()

  if (pending.length === 0)
    return

  const vocabIds = pending.map(c => c.vocabId)
  const vocabItems = await db.vocabulary.where('vocab_id').anyOf(vocabIds).toArray()
  const vocabMap = new Map(vocabItems.map(v => [v.vocab_id, v.book_source]))

  const rows = pending.map(card => ({
    user_id: card.userId,
    vocab_id: card.vocabId,
    book_source: vocabMap.get(card.vocabId) ?? 'minna_shokyuu_1',
    interval_days: card.interval_days,
    ease_factor: card.ease_factor,
    due_date: card.due_date,
    review_count: card.review_count,
    last_rating: card.last_rating,
    updated_at: card.updated_at,
    is_known: card.is_known,
  }))

  const { error } = await supabase
    .from('user_cards')
    .upsert(rows, { onConflict: 'user_id,vocab_id' })

  if (error)
    throw new SyncError(error.message)

  await db.user_cards
    .where('[userId+vocabId]')
    .anyOf(pending.map(c => [c.userId, c.vocabId]))
    .modify({ pending_sync: false })

  window.dispatchEvent(new Event('sync-complete'))
}
