import { beforeEach, describe, expect, it } from 'vitest'
import {
  deleteCustomDeckSRSForDeck,
  getCustomDeckDue,
  getCustomDeckSRS,
  getCustomDeckSRSItem,
  migrateCustomDeckSRSUserId,
  upsertCustomDeckSRS,
} from './custom-deck-srs'
import { db } from './schema'
import 'fake-indexeddb/auto'

beforeEach(async () => {
  await db.custom_deck_srs.clear()
  await db.custom_vocabulary.clear()
})

describe('upsertCustomDeckSRS', () => {
  it('inserts a new entry', async () => {
    await upsertCustomDeckSRS({
      userId: 'u1',
      itemId: 'item1',
      deckId: 'deck1',
      interval_days: 0,
      ease_factor: 2.5,
      due_date: '2026-01-01',
      review_count: 0,
      card_stage: 'learning',
      learning_step: 0,
      lapse_count: 0,
      last_rating: null,
      consecutive_correct: 0,
      pending_sync: false,
      updated_at: '2026-01-01T00:00:00.000Z',
    })
    const rows = await db.custom_deck_srs.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0].itemId).toBe('item1')
  })

  it('overwrites on re-insert', async () => {
    const base = {
      userId: 'u1',
      itemId: 'item1',
      deckId: 'deck1',
      interval_days: 0,
      ease_factor: 2.5,
      due_date: '2026-01-01',
      review_count: 0,
      card_stage: 'learning' as const,
      learning_step: 0,
      lapse_count: 0,
      last_rating: null,
      consecutive_correct: 0,
      pending_sync: false,
      updated_at: '2026-01-01T00:00:00.000Z',
    }
    await upsertCustomDeckSRS(base)
    await upsertCustomDeckSRS({ ...base, interval_days: 7, review_count: 3 })
    const rows = await db.custom_deck_srs.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0].interval_days).toBe(7)
  })
})

describe('getCustomDeckSRS', () => {
  it('returns all entries for a deck', async () => {
    const makeEntry = (itemId: string, deckId: string) => ({
      userId: 'u1',
      itemId,
      deckId,
      interval_days: 0,
      ease_factor: 2.5,
      due_date: '2026-01-01',
      review_count: 0,
      card_stage: 'learning' as const,
      learning_step: 0,
      lapse_count: 0,
      last_rating: null,
      consecutive_correct: 0,
      pending_sync: false,
      updated_at: '',
    })
    await db.custom_deck_srs.bulkAdd([
      makeEntry('a', 'deck1'),
      makeEntry('b', 'deck1'),
      makeEntry('c', 'deck2'),
    ])
    const rows = await getCustomDeckSRS('u1', 'deck1')
    expect(rows).toHaveLength(2)
  })
})

describe('getCustomDeckDue', () => {
  it('returns only due entries', async () => {
    await db.custom_deck_srs.bulkAdd([
      { userId: 'u1', itemId: 'a', deckId: 'deck1', interval_days: 1, ease_factor: 2.5, due_date: '2026-01-01T00:00:00.000Z', review_count: 1, card_stage: 'review' as const, learning_step: 0, lapse_count: 0, last_rating: 2 as const, consecutive_correct: 1, pending_sync: false, updated_at: '' },
      { userId: 'u1', itemId: 'b', deckId: 'deck1', interval_days: 7, ease_factor: 2.5, due_date: '2099-01-01T00:00:00.000Z', review_count: 3, card_stage: 'review' as const, learning_step: 0, lapse_count: 0, last_rating: 2 as const, consecutive_correct: 3, pending_sync: false, updated_at: '' },
    ])
    const due = await getCustomDeckDue('u1', 'deck1', '2026-06-01T00:00:00.000Z')
    expect(due).toHaveLength(1)
    expect(due[0].itemId).toBe('a')
  })
})

function makeEntry(itemId: string, deckId: string, userId = 'u1') {
  return {
    userId,
    itemId,
    deckId,
    interval_days: 0,
    ease_factor: 2.5,
    due_date: '2026-01-01',
    review_count: 0,
    card_stage: 'learning' as const,
    learning_step: 0,
    lapse_count: 0,
    last_rating: null,
    consecutive_correct: 0,
    pending_sync: false,
    updated_at: '',
  }
}

describe('getCustomDeckSRSItem', () => {
  it('returns the item by userId+itemId', async () => {
    await db.custom_deck_srs.add(makeEntry('item-x', 'deck1'))
    const result = await getCustomDeckSRSItem('u1', 'item-x')
    expect(result).toBeDefined()
    expect(result!.itemId).toBe('item-x')
  })
  it('returns undefined for unknown item', async () => {
    const result = await getCustomDeckSRSItem('u1', 'nonexistent')
    expect(result).toBeUndefined()
  })
})

describe('deleteCustomDeckSRSForDeck', () => {
  it('deletes only entries for the specified deck', async () => {
    await db.custom_deck_srs.bulkAdd([
      makeEntry('a', 'deck1'),
      makeEntry('b', 'deck1'),
      makeEntry('c', 'deck2'),
    ])
    await deleteCustomDeckSRSForDeck('u1', 'deck1')
    const remaining = await db.custom_deck_srs.toArray()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].deckId).toBe('deck2')
  })
})

describe('migrateCustomDeckSRSUserId', () => {
  it('moves all entries to the new userId and deletes old', async () => {
    await db.custom_deck_srs.bulkAdd([
      makeEntry('a', 'deck1', 'old-user'),
      makeEntry('b', 'deck1', 'old-user'),
    ])
    await migrateCustomDeckSRSUserId('old-user', 'new-user')
    const oldEntries = await db.custom_deck_srs.filter(r => r.userId === 'old-user').toArray()
    expect(oldEntries).toHaveLength(0)
    const newEntries = await db.custom_deck_srs.filter(r => r.userId === 'new-user').toArray()
    expect(newEntries).toHaveLength(2)
  })
  it('is a no-op when oldUserId has no entries', async () => {
    await migrateCustomDeckSRSUserId('ghost-user', 'new-user')
    expect(await db.custom_deck_srs.count()).toBe(0)
  })
})
