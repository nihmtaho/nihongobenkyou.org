import { db } from '../db/schema'
import { uploadPendingReviews } from '../db/sync'

// NOTE: Only vocab (cardType='vocab') cards are migrated from anonymous sessions.
// Kanji and custom_vocab cards practiced before sign-in are intentionally not migrated
// (pre-existing behavior from the user_cards era).
export async function migrateAnonymousData(
  anonymousUserId: string,
  authenticatedUserId: string,
): Promise<number> {
  const cards = await db.srs_cards
    .where('[userId+cardType]')
    .equals([anonymousUserId, 'vocab'])
    .toArray()

  if (cards.length === 0) {
    await db.settings.delete('anonymous_user_id')
    return 0
  }

  const vocabIds = cards.map(c => c.cardId)
  const vocabItems = await db.vocabulary.where('vocab_id').anyOf(vocabIds).toArray()
  const bookSourceMap = new Map(vocabItems.map(v => [v.vocab_id, v.book_source]))
  const now = new Date().toISOString()

  // Re-key srs_cards to authenticated user. pending_sync=false: review_log drives sync now.
  await db.srs_cards
    .where('[userId+cardType]')
    .equals([anonymousUserId, 'vocab'])
    .delete()
  await db.srs_cards.bulkPut(
    cards.map(c => ({ ...c, userId: authenticatedUserId, pending_sync: false })),
  )

  // Create review_log entries so the migrated SRS state reaches Supabase
  await db.review_log.bulkAdd(
    cards.map(c => ({
      userId: authenticatedUserId,
      vocabId: c.cardId,
      bookSource: bookSourceMap.get(c.cardId) ?? 'minna_shokyuu_1',
      cardType: 'vocab' as const,
      rating: (c.last_rating ?? 2) as 1 | 2 | 3 | 4,
      scheduledDays: c.scheduled_days,
      stability: c.stability,
      difficulty: c.difficulty,
      dueDate: c.due,
      reviewCount: c.reps,
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
