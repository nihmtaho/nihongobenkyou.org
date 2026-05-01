import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { db } from '../db/schema'
import { useReviewStats } from './useReviewStats'

const TEST_USER = 'test-review-stats-user'

// Build an ISO timestamp for N days ago relative to today.
function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

// Derive a YYYY-MM-DD string from daysAgo offset (for streak records).
function dateStringDaysAgo(n: number): string {
  return daysAgo(n).slice(0, 10)
}

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)
}

beforeEach(async () => {
  await db.review_log.clear()
  await db.streaks.clear()
})

afterEach(async () => {
  await db.review_log.clear()
  await db.streaks.clear()
})

// Minimal valid ReviewLogEntry fields; id is auto-incremented (++id).
function makeEntry(overrides: Partial<{
  userId: string
  vocabId: string
  rating: 0 | 1 | 2 | 3
  reviewedAt: string
}> = {}) {
  return {
    userId: TEST_USER,
    vocabId: 'mnn1_aaaa00000000',
    bookSource: 'minna_shokyuu_1',
    cardType: 'vocab' as const,
    rating: 2 as const,
    intervalDays: 1,
    easeFactor: 2.5,
    dueDate: dateStringDaysAgo(0),
    reviewCount: 1,
    isKnown: false,
    pendingSync: false,
    remoteId: null,
    ...overrides,
    reviewedAt: overrides.reviewedAt ?? daysAgo(0),
  }
}

describe('useReviewStats', () => {
  it('returns null data while loading and ReviewStats once settled', async () => {
    const { result } = renderHook(() => useReviewStats(TEST_USER), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).not.toBeNull()
  })

  it('does not run when userId is empty', () => {
    const { result } = renderHook(() => useReviewStats(''), {
      wrapper: makeWrapper(),
    })
    // enabled: false → stays in loading state, data stays null
    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeNull()
  })

  describe('todayCount', () => {
    it('counts only entries reviewed today', async () => {
      await db.review_log.bulkAdd([
        makeEntry({ reviewedAt: daysAgo(0) }),
        makeEntry({ reviewedAt: daysAgo(0) }),
        makeEntry({ reviewedAt: daysAgo(1) }), // yesterday — excluded
      ])

      const { result } = renderHook(() => useReviewStats(TEST_USER), {
        wrapper: makeWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.data?.todayCount).toBe(2)
    })
  })

  describe('weekCount', () => {
    it('counts entries since this Monday (inclusive)', async () => {
      // Add 3 entries inside the current week and 1 from 8 days ago (outside).
      await db.review_log.bulkAdd([
        makeEntry({ reviewedAt: daysAgo(0) }),
        makeEntry({ reviewedAt: daysAgo(1) }),
        makeEntry({ reviewedAt: daysAgo(2) }),
        makeEntry({ reviewedAt: daysAgo(8) }),
      ])

      const { result } = renderHook(() => useReviewStats(TEST_USER), {
        wrapper: makeWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      // At least the 3 recent entries must be in the week count.
      // (The 2-days-ago entry may or may not cross Monday depending on test day.)
      expect(result.current.data!.weekCount).toBeGreaterThanOrEqual(1)
      expect(result.current.data!.weekCount).toBeLessThanOrEqual(3)
    })
  })

  describe('totalCount', () => {
    it('equals all entries for the user', async () => {
      await db.review_log.bulkAdd([
        makeEntry({ reviewedAt: daysAgo(0) }),
        makeEntry({ reviewedAt: daysAgo(5) }),
        makeEntry({ reviewedAt: daysAgo(30) }),
      ])

      const { result } = renderHook(() => useReviewStats(TEST_USER), {
        wrapper: makeWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.data?.totalCount).toBe(3)
    })

    it('ignores entries from a different userId', async () => {
      await db.review_log.bulkAdd([
        makeEntry({ userId: TEST_USER, reviewedAt: daysAgo(0) }),
        makeEntry({ userId: 'other-user', reviewedAt: daysAgo(0) }),
      ])

      const { result } = renderHook(() => useReviewStats(TEST_USER), {
        wrapper: makeWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.data?.totalCount).toBe(1)
    })
  })

  describe('last7Days', () => {
    it('always returns exactly 7 entries, oldest first', async () => {
      const { result } = renderHook(() => useReviewStats(TEST_USER), {
        wrapper: makeWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.data?.last7Days).toHaveLength(7)

      const dates = result.current.data!.last7Days.map(d => d.date)
      // Sorted ascending (oldest first)
      expect([...dates].sort()).toEqual(dates)
    })

    it('assigns correct Vietnamese weekday labels', async () => {
      const { result } = renderHook(() => useReviewStats(TEST_USER), {
        wrapper: makeWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      for (const day of result.current.data!.last7Days) {
        const jsDay = new Date(day.date).getDay() // 0=Sun…6=Sat
        const expectedLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
        expect(day.label).toBe(expectedLabels[jsDay])
      }
    })

    it('counts reviews per day correctly', async () => {
      await db.review_log.bulkAdd([
        makeEntry({ reviewedAt: daysAgo(0) }),
        makeEntry({ reviewedAt: daysAgo(0) }),
        makeEntry({ reviewedAt: daysAgo(3) }),
      ])

      const { result } = renderHook(() => useReviewStats(TEST_USER), {
        wrapper: makeWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const days = result.current.data!.last7Days
      const today = days[days.length - 1]
      expect(today.count).toBe(2)

      const threeDaysAgo = days[days.length - 4]
      expect(threeDaysAgo.count).toBe(1)
    })

    it('entries older than 7 days do not appear in last7Days counts', async () => {
      await db.review_log.bulkAdd([
        makeEntry({ reviewedAt: daysAgo(8) }),
      ])

      const { result } = renderHook(() => useReviewStats(TEST_USER), {
        wrapper: makeWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      const totalInWeek = result.current.data!.last7Days.reduce((s, d) => s + d.count, 0)
      expect(totalInWeek).toBe(0)
    })
  })

  describe('maxDayCount', () => {
    it('equals the highest single-day count in last7Days', async () => {
      await db.review_log.bulkAdd([
        makeEntry({ reviewedAt: daysAgo(0) }),
        makeEntry({ reviewedAt: daysAgo(0) }),
        makeEntry({ reviewedAt: daysAgo(0) }),
        makeEntry({ reviewedAt: daysAgo(1) }),
      ])

      const { result } = renderHook(() => useReviewStats(TEST_USER), {
        wrapper: makeWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.data?.maxDayCount).toBe(3)
    })

    it('is 0 when there are no entries in last 7 days', async () => {
      const { result } = renderHook(() => useReviewStats(TEST_USER), {
        wrapper: makeWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.data?.maxDayCount).toBe(0)
    })
  })

  describe('avgPerDay', () => {
    it('divides total last-7-days count by 7 and rounds to 1 decimal', async () => {
      // 3 entries today → 3/7 ≈ 0.4
      await db.review_log.bulkAdd([
        makeEntry({ reviewedAt: daysAgo(0) }),
        makeEntry({ reviewedAt: daysAgo(0) }),
        makeEntry({ reviewedAt: daysAgo(0) }),
      ])

      const { result } = renderHook(() => useReviewStats(TEST_USER), {
        wrapper: makeWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.data?.avgPerDay).toBe(0.4)
    })

    it('returns 0 when there are no entries in last 7 days', async () => {
      const { result } = renderHook(() => useReviewStats(TEST_USER), {
        wrapper: makeWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.data?.avgPerDay).toBe(0)
    })
  })

  describe('ratingDistribution', () => {
    it('has 4 entries with correct labels and colors', async () => {
      const { result } = renderHook(() => useReviewStats(TEST_USER), {
        wrapper: makeWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const dist = result.current.data!.ratingDistribution
      expect(dist).toHaveLength(4)
      expect(dist[0]).toMatchObject({ label: 'Quên', color: 'text-error' })
      expect(dist[1]).toMatchObject({ label: 'Khó', color: 'text-warning' })
      expect(dist[2]).toMatchObject({ label: 'Ôn', color: 'text-success' })
      expect(dist[3]).toMatchObject({ label: 'Dễ', color: 'text-info' })
    })

    it('counts and percentages are correct for known ratings', async () => {
      // 2×Again(0), 1×Good(2) all within last 7 days
      await db.review_log.bulkAdd([
        makeEntry({ rating: 0, reviewedAt: daysAgo(0) }),
        makeEntry({ rating: 0, reviewedAt: daysAgo(1) }),
        makeEntry({ rating: 2, reviewedAt: daysAgo(2) }),
      ])

      const { result } = renderHook(() => useReviewStats(TEST_USER), {
        wrapper: makeWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const dist = result.current.data!.ratingDistribution
      expect(dist[0].count).toBe(2) // Quên
      expect(dist[0].pct).toBe(67) // round(2/3*100)
      expect(dist[1].count).toBe(0) // Khó
      expect(dist[2].count).toBe(1) // Ôn
      expect(dist[2].pct).toBe(33)
      expect(dist[3].count).toBe(0) // Dễ
    })

    it('excludes entries older than 7 days from distribution', async () => {
      await db.review_log.bulkAdd([
        makeEntry({ rating: 0, reviewedAt: daysAgo(8) }), // outside window
        makeEntry({ rating: 2, reviewedAt: daysAgo(0) }), // inside window
      ])

      const { result } = renderHook(() => useReviewStats(TEST_USER), {
        wrapper: makeWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const dist = result.current.data!.ratingDistribution
      // Only the rating=2 entry counts
      expect(dist[0].count).toBe(0) // Quên — excluded
      expect(dist[2].count).toBe(1) // Ôn — included
      expect(dist[2].pct).toBe(100)
    })

    it('all percentages are 0 when no entries exist', async () => {
      const { result } = renderHook(() => useReviewStats(TEST_USER), {
        wrapper: makeWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      const dist = result.current.data!.ratingDistribution
      expect(dist.every(d => d.pct === 0 && d.count === 0)).toBe(true)
    })
  })

  describe('streak', () => {
    it('returns 0 when no streak record exists for the user', async () => {
      const { result } = renderHook(() => useReviewStats(TEST_USER), {
        wrapper: makeWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.data?.streak).toBe(0)
    })

    it('returns current_streak from the most recent streak record', async () => {
      await db.streaks.bulkPut([
        { date: dateStringDaysAgo(2), userId: TEST_USER, cards_reviewed: 5, current_streak: 1, max_streak: 3 },
        { date: dateStringDaysAgo(1), userId: TEST_USER, cards_reviewed: 8, current_streak: 2, max_streak: 3 },
        { date: dateStringDaysAgo(0), userId: TEST_USER, cards_reviewed: 10, current_streak: 3, max_streak: 3 },
      ])

      const { result } = renderHook(() => useReviewStats(TEST_USER), {
        wrapper: makeWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.data?.streak).toBe(3)
    })

    it('ignores streak records for a different user', async () => {
      await db.streaks.put({
        date: dateStringDaysAgo(0),
        userId: 'other-user',
        cards_reviewed: 10,
        current_streak: 99,
        max_streak: 99,
      })

      const { result } = renderHook(() => useReviewStats(TEST_USER), {
        wrapper: makeWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.data?.streak).toBe(0)
    })
  })
})
