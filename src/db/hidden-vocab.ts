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
  await db.transaction('rw', ['hidden_vocab', 'user_cards', 'active_vocab_srs', 'custom_deck_srs'], async () => {
    await db.hidden_vocab.put({ userId, item_id: itemId, source, hidden_at: new Date().toISOString() })
    if (source === 'lesson') {
      await db.user_cards.where('[userId+vocabId]').equals([userId, itemId]).delete()
      await db.active_vocab_srs.where('[userId+vocabId]').equals([userId, itemId]).delete()
    }
    else {
      await db.custom_deck_srs.where('[userId+itemId]').equals([userId, itemId]).delete()
    }
  })
}

export async function unhideVocab(userId: string, itemId: string): Promise<void> {
  await db.hidden_vocab.where('[userId+item_id]').equals([userId, itemId]).delete()
}
