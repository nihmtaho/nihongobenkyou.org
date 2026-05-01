import { db } from '../db/schema'
import { uploadPendingReviews } from '../db/sync'

export async function migrateAnonymousData(
  anonymousUserId: string,
  authenticatedUserId: string,
): Promise<number> {
  const cards = await db.user_cards
    .where('userId')
    .equals(anonymousUserId)
    .toArray()

  if (cards.length === 0) {
    await db.settings.delete('anonymous_user_id')
    return 0
  }

  const vocabIds = cards.map(c => c.vocabId)
  const vocabItems = await db.vocabulary.where('vocab_id').anyOf(vocabIds).toArray()
  const bookSourceMap = new Map(vocabItems.map(v => [v.vocab_id, v.book_source]))
  const now = new Date().toISOString()

  // Re-key user_cards to authenticated user. pending_sync=false: review_log drives sync now.
  await db.user_cards.where('userId').equals(anonymousUserId).delete()
  await db.user_cards.bulkPut(
    cards.map(c => ({ ...c, userId: authenticatedUserId, pending_sync: false })),
  )

  // Create review_log entries so the migrated SRS state reaches Supabase
  await db.review_log.bulkAdd(
    cards.map(c => ({
      userId: authenticatedUserId,
      vocabId: c.vocabId,
      bookSource: bookSourceMap.get(c.vocabId) ?? 'minna_shokyuu_1',
      cardType: 'vocab' as const,
      rating: (c.last_rating ?? 2) as 0 | 1 | 2 | 3,
      intervalDays: c.interval_days,
      easeFactor: c.ease_factor,
      dueDate: c.due_date,
      reviewCount: c.review_count,
      isKnown: c.is_known ?? false,
      reviewedAt: c.updated_at || now,
      pendingSync: true,
      remoteId: null,
    })),
  )

  await db.settings.delete('anonymous_user_id')

  uploadPendingReviews().catch(() => {})

  return cards.length
}
