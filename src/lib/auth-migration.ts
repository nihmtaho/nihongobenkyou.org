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

  const cardIds = cards.map(c => c.cardId)
  const existingAuthCards = await db.srs_cards
    .where('[userId+cardType]')
    .equals([authenticatedUserId, 'vocab'])
    .filter(c => cardIds.includes(c.cardId))
    .toArray()
  const authCardMap = new Map(existingAuthCards.map(c => [c.cardId, c]))

  // Skip cards where the remote (authenticated) version is already newer
  const cardsToMigrate = cards.filter((c) => {
    const authCard = authCardMap.get(c.cardId)
    return !authCard || c.updated_at > authCard.updated_at
  })

  const vocabIds = cardsToMigrate.map(c => c.cardId)
  const vocabItems = await db.vocabulary.where('vocab_id').anyOf(vocabIds).toArray()
  const bookSourceMap = new Map(vocabItems.map(v => [v.vocab_id, v.book_source]))
  const now = new Date().toISOString()

  // Always delete ALL anonymous cards — no orphaned anon data should remain.
  // Only re-key the subset that are actually newer than the remote version.
  await db.srs_cards
    .where('[userId+cardType]')
    .equals([anonymousUserId, 'vocab'])
    .delete()

  if (cardsToMigrate.length === 0) {
    await db.settings.delete('anonymous_user_id')
    return 0
  }

  await db.srs_cards.bulkPut(
    cardsToMigrate.map(c => ({ ...c, userId: authenticatedUserId, pending_sync: false })),
  )

  // Create review_log entries so the migrated SRS state reaches Supabase
  await db.review_log.bulkAdd(
    cardsToMigrate.map(c => ({
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

  return cardsToMigrate.length
}
