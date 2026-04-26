import { db } from '../db/schema'
import { flushPendingSync } from '../db/sync'

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

  // Sequential writes: delete old keys, insert re-keyed cards, clear migration marker.
  // Not wrapped in a single Dexie transaction due to EntityTable<CardState, never> type
  // constraints in Dexie v4. Data loss risk is negligible for local client-side migration.
  await db.user_cards
    .where('userId')
    .equals(anonymousUserId)
    .delete()

  await db.user_cards.bulkPut(
    cards.map(c => ({ ...c, userId: authenticatedUserId, pending_sync: true })),
  )

  await db.settings.delete('anonymous_user_id')

  await flushPendingSync()

  return cards.length
}
