import type { StreakData } from '../db/schema'
import type { ReviewLogEntry } from '../types/review-log'

import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/schema'

import { useDailyGoal } from './useDailyGoal'
import 'fake-indexeddb/auto'

// Pin "today" so tests are deterministic
const FIXED_TODAY = '2026-05-28'
vi.mock('../lib/date-utils', () => ({
  getToday: () => FIXED_TODAY,
  getLastNDates: (n: number) => {
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(FIXED_TODAY)
      d.setDate(d.getDate() - (n - 1 - i))
      return d.toISOString().slice(0, 10)
    })
  },
}))

function makeLogEntry(overrides: Partial<ReviewLogEntry> = {}): ReviewLogEntry {
  return {
    userId: 'u1',
    vocabId: 'v1',
    bookSource: 'mnn1',
    cardType: 'vocab',
    rating: 3,
    scheduledDays: 1,
    stability: 1.0,
    difficulty: 5.0,
    dueDate: FIXED_TODAY,
    reviewCount: 1,
    isKnown: false,
    reviewedAt: `${FIXED_TODAY}T08:00:00.000Z`,
    pendingSync: false,
    remoteId: null,
    ...overrides,
  }
}

function makeStreak(date: string, cards_reviewed: number): StreakData {
  return { date, userId: 'u1', cards_reviewed, current_streak: 1, max_streak: 1 }
}

beforeEach(async () => {
  await db.review_log.clear()
  await db.streaks.clear()
})

describe('useDailyGoal', () => {
  it('returns todayCount=0 and isComplete=false when review_log is empty', async () => {
    const { result } = renderHook(() => useDailyGoal('u1', 20))
    await waitFor(() => expect(result.current.data).not.toBeNull())
    expect(result.current.data!.todayCount).toBe(0)
    expect(result.current.data!.isComplete).toBe(false)
  })

  it('counts only today\'s reviews for the current user', async () => {
    await db.review_log.bulkAdd([
      makeLogEntry({ reviewedAt: `${FIXED_TODAY}T09:00:00.000Z` }),
      makeLogEntry({ reviewedAt: `${FIXED_TODAY}T10:00:00.000Z` }),
      makeLogEntry({ reviewedAt: '2026-05-27T23:59:59.000Z' }), // yesterday — excluded
      makeLogEntry({ userId: 'u2', reviewedAt: `${FIXED_TODAY}T09:00:00.000Z` }), // different user
    ])
    const { result } = renderHook(() => useDailyGoal('u1', 20))
    await waitFor(() => expect(result.current.data).not.toBeNull())
    expect(result.current.data!.todayCount).toBe(2)
  })

  it('isComplete=true when todayCount >= goal', async () => {
    const entries = Array.from({ length: 5 }, (_, i) =>
      makeLogEntry({ vocabId: `v${i}`, reviewedAt: `${FIXED_TODAY}T09:0${i}:00.000Z` }))
    await db.review_log.bulkAdd(entries)
    const { result } = renderHook(() => useDailyGoal('u1', 5))
    await waitFor(() => expect(result.current.data).not.toBeNull())
    expect(result.current.data!.isComplete).toBe(true)
  })

  it('7-day history uses streaks table, handles gaps as 0', async () => {
    // Only seed 2 of the 7 days
    await db.streaks.bulkAdd([
      makeStreak('2026-05-26', 10),
      makeStreak('2026-05-28', 3), // today (partial)
    ])
    const { result } = renderHook(() => useDailyGoal('u1', 10))
    await waitFor(() => expect(result.current.data).not.toBeNull())
    const history = result.current.data!.history
    expect(history).toHaveLength(7)
    expect(history[0].date).toBe('2026-05-22') // oldest
    expect(history[6].date).toBe(FIXED_TODAY) // newest
    // Gap days should be 0
    expect(history.find(h => h.date === '2026-05-23')!.count).toBe(0)
    // 2026-05-26: 10 reviews >= goal 10 → achieved
    expect(history.find(h => h.date === '2026-05-26')!.achieved).toBe(true)
    // today: 3 reviews < goal 10 → not achieved
    expect(history.find(h => h.date === '2026-05-28')!.achieved).toBe(false)
  })
})
