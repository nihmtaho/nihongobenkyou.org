import type { SRSCard } from '../../types/srs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/schema'
import { migrateAnonymousData } from '../../lib/auth-migration'

vi.mock('../../db/sync', () => ({
  uploadPendingReviews: vi.fn().mockResolvedValue(undefined),
  downloadNewReviews: vi.fn().mockResolvedValue(undefined),
}))

const ANON_ID = 'anon-user-uuid-1234'
const AUTH_ID = 'auth-user-uuid-5678'

function makeCard(cardId: string): SRSCard {
  return {
    userId: ANON_ID,
    cardId,
    cardType: 'vocab',
    deckId: null,
    state: 'review',
    stability: 4,
    difficulty: 5,
    elapsed_days: 0,
    scheduled_days: 4,
    reps: 3,
    lapses: 0,
    last_review: '2026-04-26',
    due: '2026-04-26',
    last_rating: 3,
    is_known: false,
    consecutive_correct: 0,
    pending_sync: false,
    updated_at: new Date().toISOString(),
  }
}

beforeEach(async () => {
  await db.srs_cards.clear()
  await db.review_log.clear()
  await db.settings.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('migrateAnonymousData', () => {
  it('re-keys all srs_cards from anonymousUserId to authenticatedUserId', async () => {
    const cards = ['vocab-001', 'vocab-002', 'vocab-003'].map(makeCard)
    await db.srs_cards.bulkPut(cards)
    await db.settings.put({ key: 'anonymous_user_id', value: ANON_ID })

    await migrateAnonymousData(ANON_ID, AUTH_ID)

    const remaining = await db.srs_cards.where('[userId+cardType]').equals([ANON_ID, 'vocab']).toArray()
    expect(remaining).toHaveLength(0)

    const migrated = await db.srs_cards.where('[userId+cardType]').equals([AUTH_ID, 'vocab']).toArray()
    expect(migrated).toHaveLength(3)
  })

  it('creates review_log entries for migrated cards with pendingSync=true', async () => {
    await db.srs_cards.bulkPut(['vocab-001', 'vocab-002'].map(makeCard))
    await db.settings.put({ key: 'anonymous_user_id', value: ANON_ID })

    await migrateAnonymousData(ANON_ID, AUTH_ID)

    const logEntries = await db.review_log
      .toCollection()
      .filter(e => e.userId === AUTH_ID && e.pendingSync === true)
      .toArray()
    expect(logEntries).toHaveLength(2)
    expect(logEntries.every(e => e.remoteId === null)).toBe(true)

    // srs_cards should have pending_sync=false (review_log drives sync now)
    const migrated = await db.srs_cards.where('[userId+cardType]').equals([AUTH_ID, 'vocab']).toArray()
    expect(migrated.every(c => c.pending_sync === false)).toBe(true)
  })

  it('deletes settings[anonymous_user_id] after migration', async () => {
    await db.srs_cards.bulkPut(['vocab-001'].map(makeCard))
    await db.settings.put({ key: 'anonymous_user_id', value: ANON_ID })

    await migrateAnonymousData(ANON_ID, AUTH_ID)

    const setting = await db.settings.get('anonymous_user_id')
    expect(setting).toBeUndefined()
  })

  it('returns the count of migrated cards', async () => {
    const cards = ['vocab-001', 'vocab-002', 'vocab-003', 'vocab-004', 'vocab-005'].map(makeCard)
    await db.srs_cards.bulkPut(cards)
    await db.settings.put({ key: 'anonymous_user_id', value: ANON_ID })

    const count = await migrateAnonymousData(ANON_ID, AUTH_ID)

    expect(count).toBe(5)
  })

  it('is a no-op and returns 0 when no anonymous cards exist', async () => {
    await db.settings.put({ key: 'anonymous_user_id', value: ANON_ID })

    const count = await migrateAnonymousData(ANON_ID, AUTH_ID)

    expect(count).toBe(0)
    const setting = await db.settings.get('anonymous_user_id')
    expect(setting).toBeUndefined()
  })

  it('preserves original card data (cardId, scheduled_days, due)', async () => {
    const original = makeCard('vocab-001')
    original.scheduled_days = 7
    original.difficulty = 6
    original.due = '2026-05-01'
    await db.srs_cards.put(original)
    await db.settings.put({ key: 'anonymous_user_id', value: ANON_ID })

    await migrateAnonymousData(ANON_ID, AUTH_ID)

    const [migrated] = await db.srs_cards.where('[userId+cardType]').equals([AUTH_ID, 'vocab']).toArray()
    expect(migrated.cardId).toBe('vocab-001')
    expect(migrated.scheduled_days).toBe(7)
    expect(migrated.difficulty).toBe(6)
    expect(migrated.due).toBe('2026-05-01')
    expect(migrated.userId).toBe(AUTH_ID)
  })
})
