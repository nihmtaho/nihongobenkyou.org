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
  getTodayUTC: () => FIXED_TODAY,
  getLastNDates: (n: number) => {
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(FIXED_TODAY)
      d.setDate(d.getDate() - (n - 1 - i))
      return d.toISOString().slice(0, 10)
    })
  },
}))

// Allow per-test goal overrides; default matches store initial value
let mockGoal = 20
vi.mock('../stores/settingsStore', () => ({
  // eslint-disable-next-line react/component-hook-factories
  useSettingsStore: (selector: (s: { dailyReviewGoal: number }) => unknown) =>
    selector({ dailyReviewGoal: mockGoal }),
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
  mockGoal = 20
  await db.review_log.clear()
  await db.streaks.clear()
})

describe('useDailyGoal', () => {
  it('returns todayCount=0 and isComplete=false when review_log is empty', async () => {
    const { result } = renderHook(() => useDailyGoal('u1'))
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
    const { result } = renderHook(() => useDailyGoal('u1'))
    await waitFor(() => expect(result.current.data).not.toBeNull())
    expect(result.current.data!.todayCount).toBe(2)
  })

  it('isComplete=true when todayCount >= goal', async () => {
    mockGoal = 5
    const entries = Array.from({ length: 5 }, (_, i) =>
      makeLogEntry({ vocabId: `v${i}`, reviewedAt: `${FIXED_TODAY}T09:0${i}:00.000Z` }))
    await db.review_log.bulkAdd(entries)
    const { result } = renderHook(() => useDailyGoal('u1'))
    await waitFor(() => expect(result.current.data).not.toBeNull())
    expect(result.current.data!.isComplete).toBe(true)
  })

  it('streak7 uses streaks table, handles gaps as 0', async () => {
    mockGoal = 10
    // Seed only 2 of the 7 days; the rest should be 0
    await db.streaks.bulkAdd([
      makeStreak('2026-05-26', 10),
      makeStreak('2026-05-28', 3), // today (partial)
    ])
    const { result } = renderHook(() => useDailyGoal('u1'))
    await waitFor(() => expect(result.current.data).not.toBeNull())
    const { streak7 } = result.current.data!
    // 7 days: 2026-05-22 … 2026-05-28
    expect(streak7).toHaveLength(7)
    expect(streak7[0]).toBe(0) // 2026-05-22
    expect(streak7[1]).toBe(0) // 2026-05-23 (gap)
    expect(streak7[4]).toBe(10) // 2026-05-26
    expect(streak7[6]).toBe(3) // 2026-05-28 (today)
  })
})
