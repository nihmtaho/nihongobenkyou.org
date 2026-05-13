import { db } from './schema'

export async function getHiddenIds(userId: string, source: 'lesson' | 'custom'): Promise<string[]> {
  const entries = await db.hidden_vocab.where('[userId+source]').equals([userId, source]).toArray()
  return entries.map(e => e.item_id)
}

export async function hideVocab(
  itemId: string,
  source: 'lesson' | 'custom',
  userId: string,
): Promise<void> {
  await db.transaction('rw', ['hidden_vocab', 'srs_cards'], async () => {
    await db.hidden_vocab.put({ userId, item_id: itemId, source, hidden_at: new Date().toISOString() })
    // Remove associated SRS card (vocab or custom_vocab cardType)
    await db.srs_cards.where('[userId+cardId]').equals([userId, itemId]).delete()
  })
}

export async function unhideVocab(userId: string, itemId: string): Promise<void> {
  await db.hidden_vocab.where('[userId+item_id]').equals([userId, itemId]).delete()
}
