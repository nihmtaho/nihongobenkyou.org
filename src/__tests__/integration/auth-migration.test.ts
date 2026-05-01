import type { CardState } from '../../types/srs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/schema'
import { migrateAnonymousData } from '../../lib/auth-migration'

vi.mock('../../db/sync', () => ({
  uploadPendingReviews: vi.fn().mockResolvedValue(undefined),
  downloadNewReviews: vi.fn().mockResolvedValue(undefined),
}))

const ANON_ID = 'anon-user-uuid-1234'
const AUTH_ID = 'auth-user-uuid-5678'

function makeCard(vocabId: string): CardState {
  return {
    userId: ANON_ID,
    vocabId,
    interval_days: 1,
    ease_factor: 2.5,
    due_date: '2026-04-26',
    review_count: 3,
    last_rating: 2,
    pending_sync: false,
    updated_at: new Date().toISOString(),
    is_known: false,
  }
}

beforeEach(async () => {
  await db.user_cards.clear()
  await db.review_log.clear()
  await db.settings.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('migrateAnonymousData', () => {
  it('re-keys all user_cards from anonymousUserId to authenticatedUserId', async () => {
    const cards = ['vocab-001', 'vocab-002', 'vocab-003'].map(makeCard)
    await db.user_cards.bulkPut(cards)
    await db.settings.put({ key: 'anonymous_user_id', value: ANON_ID })

    await migrateAnonymousData(ANON_ID, AUTH_ID)

    const remaining = await db.user_cards.where('userId').equals(ANON_ID).toArray()
    expect(remaining).toHaveLength(0)

    const migrated = await db.user_cards.where('userId').equals(AUTH_ID).toArray()
    expect(migrated).toHaveLength(3)
  })

  it('creates review_log entries for migrated cards with pendingSync=true', async () => {
    await db.user_cards.bulkPut(['vocab-001', 'vocab-002'].map(makeCard))
    await db.settings.put({ key: 'anonymous_user_id', value: ANON_ID })

    await migrateAnonymousData(ANON_ID, AUTH_ID)

    const logEntries = await db.review_log
      .toCollection()
      .filter(e => e.userId === AUTH_ID && e.pendingSync === true)
      .toArray()
    expect(logEntries).toHaveLength(2)
    expect(logEntries.every(e => e.remoteId === null)).toBe(true)

    // user_cards should have pending_sync=false (review_log drives sync now)
    const migrated = await db.user_cards.where('userId').equals(AUTH_ID).toArray()
    expect(migrated.every(c => c.pending_sync === false)).toBe(true)
  })

  it('deletes settings[anonymous_user_id] after migration', async () => {
    await db.user_cards.bulkPut(['vocab-001'].map(makeCard))
    await db.settings.put({ key: 'anonymous_user_id', value: ANON_ID })

    await migrateAnonymousData(ANON_ID, AUTH_ID)

    const setting = await db.settings.get('anonymous_user_id')
    expect(setting).toBeUndefined()
  })

  it('returns the count of migrated cards', async () => {
    const cards = ['vocab-001', 'vocab-002', 'vocab-003', 'vocab-004', 'vocab-005'].map(makeCard)
    await db.user_cards.bulkPut(cards)
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

  it('preserves original card data (vocabId, interval_days, due_date)', async () => {
    const original = makeCard('vocab-001')
    original.interval_days = 7
    original.ease_factor = 2.3
    original.due_date = '2026-05-01'
    await db.user_cards.put(original)
    await db.settings.put({ key: 'anonymous_user_id', value: ANON_ID })

    await migrateAnonymousData(ANON_ID, AUTH_ID)

    const [migrated] = await db.user_cards.where('userId').equals(AUTH_ID).toArray()
    expect(migrated.vocabId).toBe('vocab-001')
    expect(migrated.interval_days).toBe(7)
    expect(migrated.ease_factor).toBe(2.3)
    expect(migrated.due_date).toBe('2026-05-01')
    expect(migrated.userId).toBe(AUTH_ID)
  })
})
