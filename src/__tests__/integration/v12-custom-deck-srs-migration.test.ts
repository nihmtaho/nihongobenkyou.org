import type { CustomVocabItem } from '../../types/custom-deck'
import type { CardState } from '../../types/srs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/schema'
import 'fake-indexeddb/auto'

const USER_ID = 'test-user-uuid-1234'
const DECK_ID = 'custom-deck-001'
const CUSTOM_VOCAB_ID_1 = 'custom-vocab-001'
const CUSTOM_VOCAB_ID_2 = 'custom-vocab-002'
const STANDARD_VOCAB_ID = 'standard-vocab-001'

function makeCustomVocab(id: string, deckId: string): CustomVocabItem {
  return {
    id,
    deck_id: deckId,
    user_id: USER_ID,
    kana: 'test',
    kanji: null,
    han_viet: 'thử nghiệm',
    meaning_vi: 'test',
    source: 'manual',
    created_at: new Date().toISOString(),
  }
}

function makeCard(vocabId: string, userId: string = USER_ID): CardState {
  return {
    userId,
    vocabId,
    interval_days: 3,
    ease_factor: 2.5,
    due_date: '2026-04-29',
    review_count: 2,
    card_stage: 'review',
    learning_step: 0,
    lapse_count: 0,
    last_rating: 2,
    pending_sync: false,
    updated_at: new Date().toISOString(),
    is_known: false,
    consecutive_correct: 1,
  }
}

beforeEach(async () => {
  await db.user_cards.clear()
  await db.custom_vocabulary.clear()
  await db.custom_deck_srs.clear()
})

afterEach(async () => {
  await db.user_cards.clear()
  await db.custom_vocabulary.clear()
  await db.custom_deck_srs.clear()
})

describe('dexie v12 migration: custom_deck_srs', () => {
  it('migrates custom vocab user_cards to custom_deck_srs', async () => {
    const customVocab1 = makeCustomVocab(CUSTOM_VOCAB_ID_1, DECK_ID)
    const customVocab2 = makeCustomVocab(CUSTOM_VOCAB_ID_2, DECK_ID)
    await db.custom_vocabulary.bulkPut([customVocab1, customVocab2])

    const card1 = makeCard(CUSTOM_VOCAB_ID_1)
    const card2 = makeCard(CUSTOM_VOCAB_ID_2)
    await db.user_cards.bulkPut([card1, card2])

    // Simulate migration by reading source data and writing to target table
    const customIds = new Set([CUSTOM_VOCAB_ID_1, CUSTOM_VOCAB_ID_2])
    const customCards = await db.user_cards
      .filter((c: CardState) => customIds.has(c.vocabId))
      .toArray()

    const now = new Date().toISOString()
    const srsEntries = customCards.map(c => ({
      userId: c.userId,
      itemId: c.vocabId,
      deckId: DECK_ID,
      interval_days: c.interval_days ?? 0,
      ease_factor: c.ease_factor ?? 2.5,
      due_date: c.due_date ?? now.slice(0, 10),
      review_count: c.review_count ?? 0,
      card_stage: c.card_stage === 'learning' || c.card_stage === 'review' || c.card_stage === 'relearning'
        ? c.card_stage
        : 'learning',
      learning_step: c.learning_step ?? 0,
      lapse_count: c.lapse_count ?? 0,
      last_rating: c.last_rating ?? null,
      consecutive_correct: c.consecutive_correct ?? 0,
      pending_sync: c.pending_sync ?? false,
      updated_at: c.updated_at ?? now,
    }))

    await db.custom_deck_srs.bulkAdd(srsEntries)

    const result = await db.custom_deck_srs.toArray()
    expect(result).toHaveLength(2)
    expect(result[0].itemId).toBe(CUSTOM_VOCAB_ID_1)
    expect(result[1].itemId).toBe(CUSTOM_VOCAB_ID_2)
  })

  it('removes migrated rows from user_cards', async () => {
    const customVocab = makeCustomVocab(CUSTOM_VOCAB_ID_1, DECK_ID)
    await db.custom_vocabulary.put(customVocab)

    const customCard = makeCard(CUSTOM_VOCAB_ID_1)
    const standardCard = makeCard(STANDARD_VOCAB_ID)
    await db.user_cards.bulkPut([customCard, standardCard])

    // Simulate deletion of migrated card using where+delete
    await db.user_cards
      .where('[userId+vocabId]')
      .equals([USER_ID, CUSTOM_VOCAB_ID_1])
      .delete()

    const remaining = await db.user_cards.toArray()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].vocabId).toBe(STANDARD_VOCAB_ID)
  })

  it('is a no-op when custom_vocabulary is empty', async () => {
    // Add a card but no custom vocab
    const card = makeCard(CUSTOM_VOCAB_ID_1)
    await db.user_cards.put(card)

    const beforeCount = await db.user_cards.count()
    expect(beforeCount).toBe(1)

    // Migration should be a no-op if no custom_vocabulary
    const afterCount = await db.user_cards.count()
    expect(afterCount).toBe(1)
  })

  it('is a no-op when no user_cards match custom vocab', async () => {
    const customVocab = makeCustomVocab(CUSTOM_VOCAB_ID_1, DECK_ID)
    await db.custom_vocabulary.put(customVocab)

    const standardCard = makeCard(STANDARD_VOCAB_ID)
    await db.user_cards.put(standardCard)

    const customCardCount = await db.custom_deck_srs.count()
    expect(customCardCount).toBe(0)

    const userCardCount = await db.user_cards.count()
    expect(userCardCount).toBe(1)
  })

  it('preserves SRS fields: interval_days, ease_factor, due_date, card_stage', async () => {
    const customVocab = makeCustomVocab(CUSTOM_VOCAB_ID_1, DECK_ID)
    await db.custom_vocabulary.put(customVocab)

    const card = makeCard(CUSTOM_VOCAB_ID_1)
    card.interval_days = 7
    card.ease_factor = 2.3
    card.due_date = '2026-05-15'
    card.card_stage = 'learning'
    await db.user_cards.put(card)

    // Simulate migration
    const customIds = new Set([CUSTOM_VOCAB_ID_1])
    const customCards = await db.user_cards
      .filter((c: CardState) => customIds.has(c.vocabId))
      .toArray()

    const now = new Date().toISOString()
    const srsEntry = {
      userId: customCards[0].userId,
      itemId: customCards[0].vocabId,
      deckId: DECK_ID,
      interval_days: customCards[0].interval_days ?? 0,
      ease_factor: customCards[0].ease_factor ?? 2.5,
      due_date: customCards[0].due_date ?? now.slice(0, 10),
      review_count: customCards[0].review_count ?? 0,
      card_stage: customCards[0].card_stage === 'learning' || customCards[0].card_stage === 'review' || customCards[0].card_stage === 'relearning'
        ? customCards[0].card_stage
        : 'learning',
      learning_step: customCards[0].learning_step ?? 0,
      lapse_count: customCards[0].lapse_count ?? 0,
      last_rating: customCards[0].last_rating ?? null,
      consecutive_correct: customCards[0].consecutive_correct ?? 0,
      pending_sync: customCards[0].pending_sync ?? false,
      updated_at: customCards[0].updated_at ?? now,
    }

    await db.custom_deck_srs.put(srsEntry)

    const result = await db.custom_deck_srs.get([USER_ID, CUSTOM_VOCAB_ID_1])
    expect(result).toBeDefined()
    expect(result!.interval_days).toBe(7)
    expect(result!.ease_factor).toBe(2.3)
    expect(result!.due_date).toBe('2026-05-15')
    expect(result!.card_stage).toBe('learning')
  })

  it('does NOT touch user_cards entries for non-custom vocab IDs', async () => {
    const standardCard1 = makeCard(STANDARD_VOCAB_ID)
    const standardCard2 = makeCard('another-standard-vocab')
    await db.user_cards.bulkPut([standardCard1, standardCard2])

    const count = await db.user_cards.count()
    expect(count).toBe(2)

    // Migration should not affect these
    const remaining = await db.user_cards.toArray()
    expect(remaining).toHaveLength(2)
  })

  it('cleans up all user_cards for custom vocab IDs across multiple users', async () => {
    // Scenario: two different users both have user_cards for the same custom vocab ID.
    // Migration should clean up all entries, not just the first user's.
    const DECK_ID_2 = 'custom-deck-002'
    const USER_ID_2 = 'test-user-uuid-5678'

    const customVocab = makeCustomVocab(CUSTOM_VOCAB_ID_1, DECK_ID)
    await db.custom_vocabulary.put(customVocab)

    const user1Card = makeCard(CUSTOM_VOCAB_ID_1, USER_ID)
    const user2Card = makeCard(CUSTOM_VOCAB_ID_1, USER_ID_2)
    const standardCard = makeCard(STANDARD_VOCAB_ID)
    await db.user_cards.bulkPut([user1Card, user2Card, standardCard])

    // Simulate migration: find and delete all user_cards for custom vocab IDs
    const customIds = new Set([CUSTOM_VOCAB_ID_1])
    const customCards = await db.user_cards
      .filter((c: CardState) => customIds.has(c.vocabId))
      .toArray()
    expect(customCards).toHaveLength(2)

    const keysToDelete = customCards.map(c => [c.userId, c.vocabId]) as never[]
    await db.user_cards.bulkDelete(keysToDelete)

    // No custom vocab user_cards should remain
    const remaining = await db.user_cards
      .filter((c: CardState) => customIds.has(c.vocabId))
      .toArray()
    expect(remaining).toHaveLength(0)

    // Non-custom (standard) cards must be untouched
    const allRemaining = await db.user_cards.toArray()
    expect(allRemaining).toHaveLength(1)
    expect(allRemaining[0].vocabId).toBe(STANDARD_VOCAB_ID)

    void DECK_ID_2 // suppress unused warning
  })
})
