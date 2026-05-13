import type { SRSCard } from '../types/srs'
import Dexie from 'dexie'
import { initFSRSCard } from '../lib/srs'
import { db } from './schema'

export async function getSRSCard(userId: string, cardId: string): Promise<SRSCard | undefined> {
  return db.srs_cards.get([userId, cardId])
}

export async function upsertSRSCard(card: SRSCard): Promise<void> {
  await db.srs_cards.put(card)
}

export async function initSRSCard(
  userId: string,
  cardId: string,
  cardType: SRSCard['cardType'],
  deckId: string | null = null,
): Promise<void> {
  const existing = await getSRSCard(userId, cardId)
  if (existing)
    return

  await upsertSRSCard({
    userId,
    cardId,
    cardType,
    deckId,
    ...initFSRSCard(),
    last_rating:         null,
    is_known:            false,
    consecutive_correct: 0,
    pending_sync:        false,
    updated_at:          new Date().toISOString(),
  })
}

export async function getDueCards(
  userId: string,
  now: string,
  cardType?: SRSCard['cardType'],
): Promise<SRSCard[]> {
  const cards = await db.srs_cards
    .where('[userId+due]')
    .between([userId, Dexie.minKey], [userId, now], true, true)
    .toArray()
  if (cardType)
    return cards.filter(c => c.cardType === cardType && !c.is_known)
  return cards.filter(c => !c.is_known)
}

export async function getSRSCardsForDeck(userId: string, deckId: string): Promise<SRSCard[]> {
  return db.srs_cards
    .where('[userId+deckId+due]')
    .between([userId, deckId, Dexie.minKey], [userId, deckId, Dexie.maxKey], true, true)
    .toArray()
}

export async function getDueCardsForDeck(userId: string, deckId: string, now: string): Promise<SRSCard[]> {
  return db.srs_cards
    .where('[userId+deckId+due]')
    .between([userId, deckId, Dexie.minKey], [userId, deckId, now], true, true)
    .toArray()
}

export async function deleteSRSCardsForDeck(userId: string, deckId: string): Promise<void> {
  await db.srs_cards
    .where('[userId+deckId+due]')
    .between([userId, deckId, Dexie.minKey], [userId, deckId, Dexie.maxKey], true, true)
    .delete()
}

export async function migrateSRSCardsUserId(oldUserId: string, newUserId: string): Promise<void> {
  await db.transaction('rw', db.srs_cards, async () => {
    const rows = await db.srs_cards.filter(r => r.userId === oldUserId).toArray()
    if (rows.length === 0)
      return
    const keys = rows.map(r => [r.userId, r.cardId] as [string, string])
    await db.srs_cards.bulkDelete(keys as never[])
    await db.srs_cards.bulkPut(rows.map(r => ({ ...r, userId: newUserId })))
  })
}
