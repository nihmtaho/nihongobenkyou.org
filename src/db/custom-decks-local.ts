import type { CustomDeck, CustomVocabItem, ParsedVocabItem } from '../types/custom-deck'
import { db } from './schema'
import { getSRSCardsForDeck, initSRSCard, migrateSRSCardsUserId } from './srs-cards'

export async function createDeck(
  userId: string,
  input: { title: string, description?: string },
): Promise<CustomDeck> {
  const now = new Date().toISOString()
  const deck: CustomDeck = {
    id: crypto.randomUUID(),
    user_id: userId,
    title: input.title,
    description: input.description ?? null,
    is_active: false,
    word_count: 0,
    created_at: now,
    updated_at: now,
  }
  await db.custom_decks.add(deck)
  return deck
}

export async function getDeck(deckId: string): Promise<CustomDeck | undefined> {
  return db.custom_decks.get(deckId)
}

export async function getDecks(userId: string): Promise<CustomDeck[]> {
  return db.custom_decks
    .where('user_id')
    .equals(userId)
    .reverse()
    .sortBy('created_at')
}

export async function updateDeck(
  deckId: string,
  updates: Partial<Pick<CustomDeck, 'title' | 'description' | 'is_active'>>,
): Promise<void> {
  await db.custom_decks.update(deckId, {
    ...updates,
    updated_at: new Date().toISOString(),
  })
}

export async function deleteDeck(deckId: string): Promise<void> {
  await db.transaction('rw', [db.custom_decks, db.custom_vocabulary], async () => {
    await db.custom_vocabulary.where('deck_id').equals(deckId).delete()
    await db.custom_decks.delete(deckId)
  })
  // Delete associated SRS cards by deckId (indexed separately from userId+cardId)
  await db.srs_cards.where('deckId').equals(deckId).delete()
}

export async function getDeckWords(deckId: string): Promise<CustomVocabItem[]> {
  return db.custom_vocabulary
    .where('deck_id')
    .equals(deckId)
    .sortBy('created_at')
}

export async function addWords(
  deckId: string,
  userId: string,
  items: ParsedVocabItem[],
  source: 'manual' | 'json' | 'csv' = 'json',
): Promise<void> {
  const now = new Date().toISOString()
  const words: CustomVocabItem[] = items.map(item => ({
    id: crypto.randomUUID(),
    deck_id: deckId,
    user_id: userId,
    kana: item.kana,
    kanji: item.word ?? null,
    han_viet: item.han_viet ?? null,
    meaning_vi: item.meaning_vi,
    source,
    created_at: now,
  }))

  await db.transaction('rw', [db.custom_decks, db.custom_vocabulary], async () => {
    await db.custom_vocabulary.bulkAdd(words)
    const deck = await db.custom_decks.get(deckId)
    if (deck) {
      await db.custom_decks.update(deckId, {
        word_count: deck.word_count + words.length,
        updated_at: now,
      })
    }
  })

  // If the deck has already been started, create SRS entries immediately so
  // useCustomDeckProgress.started stays in sync with word_count.
  const existingSRS = await getSRSCardsForDeck(userId, deckId)
  if (existingSRS.length > 0) {
    await Promise.all(words.map(w => initSRSCard(userId, w.id, 'custom_vocab', deckId)))
  }
}

export async function deleteWord(wordId: string, deckId: string, userId: string): Promise<void> {
  await db.transaction('rw', [db.custom_decks, db.custom_vocabulary], async () => {
    await db.custom_vocabulary.delete(wordId)
    const deck = await db.custom_decks.get(deckId)
    if (deck) {
      await db.custom_decks.update(deckId, {
        word_count: Math.max(0, deck.word_count - 1),
        updated_at: new Date().toISOString(),
      })
    }
  })
  // Delete associated SRS card outside transaction (different table family)
  await db.srs_cards.where('[userId+cardId]').equals([userId, wordId]).delete()
}

export async function updateWord(
  wordId: string,
  updates: Partial<Pick<CustomVocabItem, 'kana' | 'kanji' | 'han_viet' | 'meaning_vi'>>,
): Promise<void> {
  await db.custom_vocabulary.update(wordId, updates)
}

export async function migrateGuestDecks(realUserId: string): Promise<void> {
  const guestDecks = await db.custom_decks.where('user_id').equals('guest').toArray()
  if (guestDecks.length === 0)
    return

  await db.transaction('rw', [db.custom_decks, db.custom_vocabulary], async () => {
    for (const deck of guestDecks) {
      await db.custom_decks.update(deck.id, { user_id: realUserId })
    }
    await db.custom_vocabulary
      .where('user_id')
      .equals('guest')
      .modify({ user_id: realUserId })
  })

  await migrateSRSCardsUserId('guest', realUserId)
}
