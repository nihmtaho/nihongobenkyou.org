import type { SRSCard } from '../types/srs'
import { beforeEach, describe, expect, it } from 'vitest'
import { getHiddenIds, hideVocab, unhideVocab } from './hidden-vocab'
import { db } from './schema'
import 'fake-indexeddb/auto'

const USER = 'u1'
const OTHER_USER = 'u2'

function makeSRSCard(userId: string, cardId: string): SRSCard {
  return {
    userId,
    cardId,
    cardType: 'vocab',
    deckId: null,
    state: 'review',
    stability: 1,
    difficulty: 5,
    elapsed_days: 0,
    scheduled_days: 1,
    reps: 1,
    lapses: 0,
    last_review: '2026-01-01',
    due: '2026-01-02',
    last_rating: 3,
    is_known: false,
    consecutive_correct: 0,
    pending_sync: false,
    updated_at: '2026-01-01T00:00:00.000Z',
  }
}

beforeEach(async () => {
  await db.hidden_vocab.clear()
  await db.srs_cards.clear()
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

  it('deletes srs_cards record [userId, itemId] in same transaction', async () => {
    await db.srs_cards.put(makeSRSCard(USER, 'vocab-1'))
    await hideVocab('vocab-1', 'lesson', USER)
    const card = await db.srs_cards.get([USER, 'vocab-1'])
    expect(card).toBeUndefined()
  })

  it('succeeds silently when no SRS records exist', async () => {
    await expect(hideVocab('vocab-nonexistent', 'lesson', USER)).resolves.not.toThrow()
    const rows = await db.hidden_vocab.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0].item_id).toBe('vocab-nonexistent')
  })
})

describe('hideVocab — custom', () => {
  it('adds entry with source=custom and deletes srs_cards [userId, itemId]', async () => {
    await db.srs_cards.put(makeSRSCard(USER, 'custom-1'))
    await hideVocab('custom-1', 'custom', USER)
    const rows = await db.hidden_vocab.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0].source).toBe('custom')
    const card = await db.srs_cards.get([USER, 'custom-1'])
    expect(card).toBeUndefined()
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
