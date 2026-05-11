import { beforeEach, describe, expect, it } from 'vitest'
import { getHiddenIds, hideVocab, unhideVocab } from './hidden-vocab'
import { db } from './schema'
import 'fake-indexeddb/auto'

const USER = 'u1'
const OTHER_USER = 'u2'

function makeUserCard(userId: string, vocabId: string) {
  return {
    userId,
    vocabId,
    interval_days: 1,
    ease_factor: 2.5,
    due_date: '2026-01-01',
    review_count: 1,
    last_rating: 2 as const,
    pending_sync: false,
    updated_at: '2026-01-01T00:00:00.000Z',
    is_known: false,
    consecutive_correct: 0,
    card_stage: 'review' as const,
    learning_step: 0,
    lapse_count: 0,
  }
}

function makeActiveVocabSRS(userId: string, vocabId: string) {
  return {
    userId,
    vocabId,
    interval_days: 1,
    ease_factor: 2.5,
    due_date: '2026-01-01',
    review_count: 1,
    card_stage: 'review' as const,
    learning_step: 0,
    lapse_count: 0,
    last_rating: 2 as const,
    consecutive_correct: 0,
    pending_sync: false,
    updated_at: '2026-01-01T00:00:00.000Z',
  }
}

function makeCustomDeckSRS(userId: string, itemId: string) {
  return {
    userId,
    itemId,
    deckId: 'deck1',
    interval_days: 1,
    ease_factor: 2.5,
    due_date: '2026-01-01',
    review_count: 1,
    card_stage: 'review' as const,
    learning_step: 0,
    lapse_count: 0,
    last_rating: 2 as const,
    consecutive_correct: 0,
    pending_sync: false,
    updated_at: '2026-01-01T00:00:00.000Z',
  }
}

beforeEach(async () => {
  await db.hidden_vocab.clear()
  await db.user_cards.clear()
  await db.active_vocab_srs.clear()
  await db.custom_deck_srs.clear()
})

describe('hideVocab — lesson', () => {
  it('adds entry with correct userId, item_id, source=lesson, hidden_at (ISO format)', async () => {
    await hideVocab('vocab-1', 'lesson', USER)
    const rows = await db.hidden_vocab.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0].userId).toBe(USER)
    expect(rows[0].item_id).toBe('vocab-1')
    expect(rows[0].source).toBe('lesson')
    expect(rows[0].hidden_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })

  it('deletes user_cards record [userId, itemId] in same transaction', async () => {
    await db.user_cards.add(makeUserCard(USER, 'vocab-1'))
    await hideVocab('vocab-1', 'lesson', USER)
    const card = await db.user_cards.get([USER, 'vocab-1'])
    expect(card).toBeUndefined()
  })

  it('deletes active_vocab_srs record [userId, itemId] in same transaction', async () => {
    await db.active_vocab_srs.add(makeActiveVocabSRS(USER, 'vocab-1'))
    await hideVocab('vocab-1', 'lesson', USER)
    const srs = await db.active_vocab_srs.get([USER, 'vocab-1'])
    expect(srs).toBeUndefined()
  })

  it('succeeds silently when no SRS records exist', async () => {
    await expect(hideVocab('vocab-nonexistent', 'lesson', USER)).resolves.not.toThrow()
    const rows = await db.hidden_vocab.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0].item_id).toBe('vocab-nonexistent')
  })
})

describe('hideVocab — custom', () => {
  it('adds entry with source=custom and deletes custom_deck_srs [userId, itemId]', async () => {
    await db.custom_deck_srs.add(makeCustomDeckSRS(USER, 'custom-1'))
    await hideVocab('custom-1', 'custom', USER)
    const rows = await db.hidden_vocab.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0].source).toBe('custom')
    const srs = await db.custom_deck_srs.get([USER, 'custom-1'])
    expect(srs).toBeUndefined()
  })
})

describe('unhideVocab', () => {
  it('removes the entry from hidden_vocab', async () => {
    await db.hidden_vocab.put({ userId: USER, item_id: 'vocab-1', source: 'lesson', hidden_at: '2026-01-01T00:00:00.000Z' })
    await unhideVocab(USER, 'vocab-1')
    const entry = await db.hidden_vocab.get([USER, 'vocab-1'])
    expect(entry).toBeUndefined()
  })

  it('does not remove another user\'s entry with the same item_id', async () => {
    await db.hidden_vocab.bulkPut([
      { userId: USER, item_id: 'vocab-1', source: 'lesson', hidden_at: '2026-01-01T00:00:00.000Z' },
      { userId: OTHER_USER, item_id: 'vocab-1', source: 'lesson', hidden_at: '2026-01-01T00:00:00.000Z' },
    ])
    await unhideVocab(USER, 'vocab-1')
    const user1Entry = await db.hidden_vocab.get([USER, 'vocab-1'])
    const user2Entry = await db.hidden_vocab.get([OTHER_USER, 'vocab-1'])
    expect(user1Entry).toBeUndefined()
    expect(user2Entry).toBeDefined()
  })
})

describe('getHiddenIds', () => {
  it('returns only ids for the given userId+source', async () => {
    await db.hidden_vocab.bulkAdd([
      { userId: USER, item_id: 'lesson-1', source: 'lesson', hidden_at: '2026-01-01T00:00:00.000Z' },
      { userId: USER, item_id: 'lesson-2', source: 'lesson', hidden_at: '2026-01-01T00:00:00.000Z' },
      { userId: USER, item_id: 'custom-1', source: 'custom', hidden_at: '2026-01-01T00:00:00.000Z' },
      { userId: OTHER_USER, item_id: 'lesson-3', source: 'lesson', hidden_at: '2026-01-01T00:00:00.000Z' },
    ])
    const ids = await getHiddenIds(USER, 'lesson')
    expect(ids).toHaveLength(2)
    expect(ids).toContain('lesson-1')
    expect(ids).toContain('lesson-2')
    expect(ids).not.toContain('custom-1')
    expect(ids).not.toContain('lesson-3')
  })

  it('returns empty array when nothing is hidden', async () => {
    const ids = await getHiddenIds(USER, 'lesson')
    expect(ids).toEqual([])
  })
})
