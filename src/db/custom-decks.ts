import type { CustomDeck, CustomVocabItem } from '../types/custom-deck'
import { db } from './schema'

export async function cacheDecks(decks: CustomDeck[]): Promise<void> {
  await db.custom_decks.bulkPut(decks)
}

export async function getCachedDecks(userId: string): Promise<CustomDeck[]> {
  return db.custom_decks.where('user_id').equals(userId).toArray()
}

export async function cacheWords(words: CustomVocabItem[]): Promise<void> {
  await db.custom_vocabulary.bulkPut(words)
}

export async function getCachedWords(deckId: string): Promise<CustomVocabItem[]> {
  return db.custom_vocabulary.where('deck_id').equals(deckId).toArray()
}

export async function clearDeckCache(deckId: string): Promise<void> {
  await db.custom_vocabulary.where('deck_id').equals(deckId).delete()
  await db.custom_decks.delete(deckId)
}
