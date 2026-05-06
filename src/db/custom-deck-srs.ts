import type { CustomDeckSRS } from '../types/custom-deck'
import { db } from './schema'

export async function getCustomDeckSRS(userId: string, deckId: string): Promise<CustomDeckSRS[]> {
  return db.custom_deck_srs
    .where('[userId+deckId]')
    .equals([userId, deckId])
    .toArray()
}

export async function getCustomDeckSRSItem(userId: string, itemId: string): Promise<CustomDeckSRS | undefined> {
  return db.custom_deck_srs.get([userId, itemId])
}

export async function upsertCustomDeckSRS(entry: CustomDeckSRS): Promise<void> {
  await db.custom_deck_srs.put(entry)
}

export async function bulkUpsertCustomDeckSRS(entries: CustomDeckSRS[]): Promise<void> {
  if (entries.length === 0)
    return
  await db.custom_deck_srs.bulkPut(entries)
}

export async function getCustomDeckDue(
  userId: string,
  deckId: string,
  nowISO: string,
): Promise<CustomDeckSRS[]> {
  return db.custom_deck_srs
    .where('[userId+deckId+due_date]')
    .between([userId, deckId, ''], [userId, deckId, nowISO], true, true)
    .toArray()
}

export async function deleteCustomDeckSRSForDeck(userId: string, deckId: string): Promise<void> {
  await db.custom_deck_srs
    .where('[userId+deckId]')
    .equals([userId, deckId])
    .delete()
}

export async function migrateCustomDeckSRSUserId(
  oldUserId: string,
  newUserId: string,
): Promise<void> {
  const rows = await db.custom_deck_srs.filter(r => r.userId === oldUserId).toArray()
  if (rows.length === 0)
    return
  await db.transaction('rw', 'custom_deck_srs', async () => {
    const keys = rows.map(r => [r.userId, r.itemId] as [string, string])
    await db.custom_deck_srs.bulkDelete(keys as never[])
    await db.custom_deck_srs.bulkAdd(rows.map(r => ({ ...r, userId: newUserId })))
  })
}
