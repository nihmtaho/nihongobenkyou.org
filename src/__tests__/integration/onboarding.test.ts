import type { QueryClient } from '@tanstack/react-query'
import type { RemoteSnapshot } from '../../types/review-log'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NetworkError } from '../../api/auth'
import { mergeRemoteCardsIntoDexie, onboardNewDevice } from '../../db/onboarding'
import { db } from '../../db/schema'

const TEST_USER_ID = 'onboard-test-user-001'

vi.mock('../../api/user-cards', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/user-cards')>()
  return {
    ...actual,
    fetchRemoteUserCards: vi.fn().mockResolvedValue([]),
    upsertUserCardsLWW: vi.fn().mockResolvedValue(undefined),
  }
})

vi.mock('../../api/review-log', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/review-log')>()
  return {
    ...actual,
    fetchUserCardSnapshots: vi.fn().mockResolvedValue([]),
    fetchReviewEventsSince: vi.fn().mockResolvedValue([]),
    upsertUserCardSnapshots: vi.fn().mockResolvedValue(undefined),
    insertReviewEvents: vi.fn().mockResolvedValue([]),
  }
})

vi.mock('../../api/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  },
}))

vi.mock('../../db/seed', () => ({
  seedDatabase: vi.fn().mockResolvedValue('up-to-date'),
  seedKanji: vi.fn().mockResolvedValue('up-to-date'),
  SeedError: class SeedError extends Error { name = 'SeedError' },
}))

function makeSnapshot(vocabId: string, updatedAt: string, cursorId = 0): RemoteSnapshot {
  return {
    user_id: TEST_USER_ID,
    vocab_id: vocabId,
    card_type: 'vocab',
    interval_days: 7,
    ease_factor: 2.5,
    due_date: '2026-05-01',
    review_count: 3,
    last_rating: 2,
    is_known: false,
    snapshot_at: updatedAt,
    cursor_id: cursorId,
  }
}

const mockQueryClient = {
  invalidateQueries: vi.fn().mockResolvedValue(undefined),
} as unknown as QueryClient

beforeEach(async () => {
  await db.user_cards.clear()
  await db.review_log.clear()
  await db.settings.clear()
  vi.clearAllMocks()
})

afterEach(async () => {
  await db.user_cards.clear()
  await db.review_log.clear()
  await db.settings.clear()
})

describe('mergeRemoteCardsIntoDexie (legacy fallback)', () => {
  it('writes remote cards into empty Dexie with pending_sync=false', async () => {
    const { fetchRemoteUserCards } = await import('../../api/user-cards')
    const remoteCards = Array.from({ length: 5 }, (_, i) => ({
      user_id: TEST_USER_ID,
      vocab_id: `mnn1_${String(i).padStart(16, '0')}`,
      book_source: 'minna_shokyuu_1',
      interval_days: 7,
      ease_factor: 2.5,
      due_date: '2026-05-01',
      review_count: 3,
      last_rating: 2 as const,
      updated_at: '2026-04-30T10:00:00Z',
      is_known: false,
    }))
    vi.mocked(fetchRemoteUserCards).mockResolvedValue(remoteCards)

    await mergeRemoteCardsIntoDexie(TEST_USER_ID, remoteCards)

    const cards = await db.user_cards.toCollection().filter(c => c.userId === TEST_USER_ID).toArray()
    expect(cards).toHaveLength(5)
    expect(cards.every(c => c.pending_sync === false)).toBe(true)
  })

  it('does not overwrite a local card with a newer updated_at', async () => {
    const vocabId = 'mnn1_abcdef0000000000'
    await db.user_cards.put({
      userId: TEST_USER_ID,
      vocabId,
      interval_days: 30,
      ease_factor: 2.8,
      due_date: '2026-06-01',
      review_count: 10,
      last_rating: 3,
      pending_sync: false,
      updated_at: '2026-04-30T12:00:00Z',
      is_known: true,
    })

    await mergeRemoteCardsIntoDexie(TEST_USER_ID, [{
      user_id: TEST_USER_ID,
      vocab_id: vocabId,
      book_source: 'minna_shokyuu_1',
      interval_days: 1,
      ease_factor: 1.3,
      due_date: '2026-04-01',
      review_count: 1,
      last_rating: 0,
      updated_at: '2026-04-30T08:00:00Z',
      is_known: false,
    }])

    const card = await db.user_cards.get([TEST_USER_ID, vocabId])
    expect(card?.interval_days).toBe(30)
  })
})

describe('onboardNewDevice — snapshot-based flow', () => {
  it('seeds Dexie from snapshots and sets cursor', async () => {
    const { fetchUserCardSnapshots } = await import('../../api/review-log')
    const snapshots = Array.from({ length: 10 }, (_, i) =>
      makeSnapshot(`mnn1_${String(i).padStart(16, '0')}`, '2026-04-30T10:00:00Z', 500))
    vi.mocked(fetchUserCardSnapshots).mockResolvedValue(snapshots)

    await onboardNewDevice(TEST_USER_ID, mockQueryClient)

    const cards = await db.user_cards.toCollection().filter(c => c.userId === TEST_USER_ID).toArray()
    expect(cards).toHaveLength(10)
    expect(cards.every(c => c.pending_sync === false)).toBe(true)

    const cursor = await db.settings.get('review_log_cursor')
    expect(cursor?.value).toBe(500)

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['user-cards', TEST_USER_ID],
    })
  })

  it('resolves without error when Supabase is unreachable', async () => {
    const { fetchUserCardSnapshots } = await import('../../api/review-log')
    vi.mocked(fetchUserCardSnapshots).mockRejectedValue(new NetworkError('network failure'))

    const { fetchRemoteUserCards } = await import('../../api/user-cards')
    vi.mocked(fetchRemoteUserCards).mockRejectedValue(new NetworkError('network failure'))

    await expect(onboardNewDevice(TEST_USER_ID, mockQueryClient)).resolves.toBeUndefined()
  })

  it('does not overwrite local cards that are newer than snapshot', async () => {
    const vocabId = 'mnn1_abcdef0000000000'
    const { fetchUserCardSnapshots } = await import('../../api/review-log')

    await db.user_cards.put({
      userId: TEST_USER_ID,
      vocabId,
      interval_days: 60,
      ease_factor: 3.0,
      due_date: '2026-07-01',
      review_count: 20,
      last_rating: 3,
      pending_sync: false,
      updated_at: '2026-04-30T20:00:00Z',
      is_known: true,
    })

    vi.mocked(fetchUserCardSnapshots).mockResolvedValue([
      makeSnapshot(vocabId, '2026-04-29T10:00:00Z', 100),
    ])

    await onboardNewDevice(TEST_USER_ID, mockQueryClient)

    const card = await db.user_cards.get([TEST_USER_ID, vocabId])
    expect(card?.interval_days).toBe(60)
    expect(card?.is_known).toBe(true)
  })
})
