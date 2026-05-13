import type { ReviewLogEntry } from '../../types/review-log'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/schema'
import { downloadNewReviews, uploadPendingReviews } from '../../db/sync'

const TEST_USER_ID = vi.hoisted(() => 'sync-test-user-001')

vi.mock('../../api/review-log', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/review-log')>()
  return {
    ...actual,
    insertReviewEvents: vi.fn().mockResolvedValue([]),
    fetchReviewEventsSince: vi.fn().mockResolvedValue([]),
    fetchUserCardSnapshots: vi.fn().mockResolvedValue([]),
    upsertUserCardSnapshots: vi.fn().mockResolvedValue(undefined),
  }
})

vi.mock('../../api/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}))

function makePendingEntry(vocabId: string): Omit<ReviewLogEntry, 'id'> {
  return {
    userId: TEST_USER_ID,
    vocabId,
    bookSource: 'minna_shokyuu_1',
    cardType: 'vocab',
    rating: 3,
    scheduledDays: 1,
    stability: 1,
    difficulty: 5,
    dueDate: new Date().toISOString().slice(0, 10),
    reviewCount: 1,
    isKnown: false,
    reviewedAt: new Date().toISOString(),
    pendingSync: true,
    remoteId: null,
  }
}

async function seedPendingEntries(count: number): Promise<void> {
  const entries = Array.from({ length: count }, (_, i) =>
    makePendingEntry(`mnn1_${String(i).padStart(16, '0')}`))
  await db.review_log.bulkAdd(entries)
}

beforeEach(async () => {
  await db.review_log.clear()
  await db.srs_cards.clear()
  await db.sync_queue.clear()
  await db.settings.clear()
  vi.resetAllMocks()
  const { supabase } = await import('../../api/supabase')
  vi.mocked(supabase.auth.getSession).mockResolvedValue(
    { data: { session: { user: { id: TEST_USER_ID } } }, error: null } as Awaited<ReturnType<typeof supabase.auth.getSession>>,
  )
  const { insertReviewEvents, fetchReviewEventsSince, upsertUserCardSnapshots } = await import('../../api/review-log')
  vi.mocked(insertReviewEvents).mockResolvedValue([])
  vi.mocked(fetchReviewEventsSince).mockResolvedValue([])
  vi.mocked(upsertUserCardSnapshots).mockResolvedValue(undefined)
})

afterEach(async () => {
  await db.review_log.clear()
  await db.srs_cards.clear()
  await db.sync_queue.clear()
  await db.settings.clear()
})

describe('uploadPendingReviews — core lifecycle', () => {
  it('inserts pending review_log entries and marks them uploaded', async () => {
    const { insertReviewEvents } = await import('../../api/review-log')
    vi.mocked(insertReviewEvents).mockResolvedValue([1001, 1002, 1003])
    await seedPendingEntries(3)

    await uploadPendingReviews()

    expect(vi.mocked(insertReviewEvents)).toHaveBeenCalledTimes(1)
    const entries = await db.review_log.toArray()
    expect(entries.every(e => e.pendingSync === false)).toBe(true)
    expect(entries.every(e => e.remoteId !== null)).toBe(true)
  })

  it('does nothing when there are no pending entries', async () => {
    const { insertReviewEvents } = await import('../../api/review-log')
    await seedPendingEntries(3)
    await db.review_log.toCollection().modify({ pendingSync: false })

    await uploadPendingReviews()

    expect(vi.mocked(insertReviewEvents)).not.toHaveBeenCalled()
  })

  it('skips when session is null', async () => {
    const { insertReviewEvents } = await import('../../api/review-log')
    const { supabase } = await import('../../api/supabase')
    vi.mocked(supabase.auth.getSession).mockResolvedValue(
      { data: { session: null }, error: null } as Awaited<ReturnType<typeof supabase.auth.getSession>>,
    )
    await seedPendingEntries(5)

    await uploadPendingReviews()

    expect(vi.mocked(insertReviewEvents)).not.toHaveBeenCalled()
    const pending = await db.review_log.toCollection().filter(e => e.pendingSync === true).toArray()
    expect(pending).toHaveLength(5)
  })

  it('writes a sync_queue entry with status done on success', async () => {
    await seedPendingEntries(5)
    await uploadPendingReviews()

    const entries = await db.sync_queue.toArray()
    expect(entries).toHaveLength(1)
    expect(entries[0].status).toBe('done')
  })
})

describe('uploadPendingReviews — concurrency guard', () => {
  it('allows only one concurrent upload — second call returns immediately', async () => {
    const { insertReviewEvents } = await import('../../api/review-log')
    await seedPendingEntries(20)

    const p1 = uploadPendingReviews()
    const p2 = uploadPendingReviews()
    await Promise.all([p1, p2])

    expect(vi.mocked(insertReviewEvents)).toHaveBeenCalledTimes(1)
  })
})

describe('uploadPendingReviews — chunk batching', () => {
  it('splits 250 entries into 2 chunks of 200 and 50', async () => {
    const { insertReviewEvents } = await import('../../api/review-log')
    vi.mocked(insertReviewEvents).mockResolvedValue(Array.from({ length: 200 }, (_, i) => i + 1))
    await seedPendingEntries(250)

    await uploadPendingReviews()

    expect(vi.mocked(insertReviewEvents)).toHaveBeenCalledTimes(2)
    expect(vi.mocked(insertReviewEvents).mock.calls[0][0]).toHaveLength(200)
    expect(vi.mocked(insertReviewEvents).mock.calls[1][0]).toHaveLength(50)
  })
})

describe('uploadPendingReviews — resilience', () => {
  it('keeps entries pending and marks sync_queue failed when INSERT throws', async () => {
    const { insertReviewEvents } = await import('../../api/review-log')
    vi.mocked(insertReviewEvents).mockRejectedValueOnce(new Error('503'))
    await seedPendingEntries(10)

    await uploadPendingReviews()

    const pending = await db.review_log.toCollection().filter(e => e.pendingSync === true).toArray()
    expect(pending).toHaveLength(10)
    const entries = await db.sync_queue.toArray()
    expect(entries[0].status).toBe('failed')
  })

  it('retries and clears after 100 online→upload cycles (SC-003)', async () => {
    const { insertReviewEvents } = await import('../../api/review-log')
    await seedPendingEntries(5)

    for (let cycle = 0; cycle < 100; cycle++) {
      if (cycle < 50) {
        vi.mocked(insertReviewEvents).mockRejectedValueOnce(new Error('transient'))
      }
      else {
        vi.mocked(insertReviewEvents).mockResolvedValueOnce([cycle + 1, cycle + 2, cycle + 3, cycle + 4, cycle + 5])
      }
      await uploadPendingReviews()
    }

    const pending = await db.review_log.toCollection().filter(e => e.pendingSync === true).toArray()
    expect(pending).toHaveLength(0)
  })
})

describe('downloadNewReviews', () => {
  it('applies downloaded events to Dexie srs_cards', async () => {
    const { fetchReviewEventsSince } = await import('../../api/review-log')
    vi.mocked(fetchReviewEventsSince).mockResolvedValue([
      {
        id: 42,
        user_id: TEST_USER_ID,
        vocab_id: 'mnn1_abcdef0000000001',
        book_source: 'minna_shokyuu_1',
        card_type: 'vocab',
        rating: 3,
        scheduled_days: 7,
        stability: 7,
        difficulty: 5,
        due_date: '2026-06-01',
        review_count: 3,
        is_known: false,
        reviewed_at: '2026-04-30T10:00:00Z',
      },
    ])

    await downloadNewReviews(TEST_USER_ID)

    const card = await db.srs_cards.get([TEST_USER_ID, 'mnn1_abcdef0000000001'])
    expect(card?.scheduled_days).toBe(7)
    expect(card?.pending_sync).toBe(false)

    const cursor = await db.settings.get('review_log_cursor')
    expect(cursor?.value).toBe(42)
  })

  it('skips events already in local review_log (no double-apply)', async () => {
    const { fetchReviewEventsSince } = await import('../../api/review-log')
    const vocabId = 'mnn1_abcdef0000000002'

    // Local entry with remote_id=99 means it was uploaded from this device
    await db.review_log.add({
      userId: TEST_USER_ID,
      vocabId,
      bookSource: 'minna_shokyuu_1',
      cardType: 'vocab',
      rating: 3,
      scheduledDays: 21,
      stability: 21,
      difficulty: 4,
      dueDate: '2026-08-01',
      reviewCount: 8,
      isKnown: true,
      reviewedAt: '2026-04-30T09:00:00Z',
      pendingSync: false,
      remoteId: 99,
    })

    vi.mocked(fetchReviewEventsSince).mockResolvedValue([{
      id: 99,
      user_id: TEST_USER_ID,
      vocab_id: vocabId,
      book_source: 'minna_shokyuu_1',
      card_type: 'vocab',
      rating: 1,
      scheduled_days: 1,
      stability: 1,
      difficulty: 5,
      due_date: '2026-05-01',
      review_count: 1,
      is_known: false,
      reviewed_at: '2026-04-30T09:00:00Z',
    }])

    await downloadNewReviews(TEST_USER_ID)

    // srs_cards should NOT exist (event was skipped)
    const card = await db.srs_cards.get([TEST_USER_ID, vocabId])
    expect(card).toBeUndefined()
  })
})

describe('staleTime compliance (FR-009)', () => {
  it('useVocabulary source declares staleTime: Infinity', () => {
    const src = readFileSync(resolve(__dirname, '../../hooks/useVocabulary.ts'), 'utf-8')
    expect(src).toContain('staleTime: Infinity')
  })

  it('useLesson source declares staleTime: Infinity', () => {
    const src = readFileSync(resolve(__dirname, '../../hooks/useLesson.ts'), 'utf-8')
    expect(src).toContain('staleTime: Infinity')
  })
})
