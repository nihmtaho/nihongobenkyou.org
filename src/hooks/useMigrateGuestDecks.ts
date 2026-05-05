import { migrateGuestDecks } from '../db/custom-decks-local'

export async function runGuestMigration(realUserId: string): Promise<void> {
  await migrateGuestDecks(realUserId)
}
