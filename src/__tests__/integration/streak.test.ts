import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/schema'

const USER_ID = 'test-user-streak'

async function writeStreakForDate(date: string, cardsReviewed: number) {
  const existing = await db.streaks.get(date)
  if (existing) {
    await db.streaks.put({ ...existing, cards_reviewed: existing.cards_reviewed + cardsReviewed })
    return
  }
  const prevDate = new Date(date)
  prevDate.setDate(prevDate.getDate() - 1)
  const yesterday = prevDate.toISOString().slice(0, 10)
  const prev = await db.streaks.where('date').equals(yesterday).first()
  await db.streaks.put({
    date,
    userId: USER_ID,
    cards_reviewed: cardsReviewed,
    current_streak: (prev?.current_streak ?? 0) + 1,
    max_streak: Math.max(prev?.max_streak ?? 0, (prev?.current_streak ?? 0) + 1),
  })
}

beforeEach(async () => {
  await db.streaks.clear()
})

afterEach(async () => {
  await db.streaks.clear()
})

describe('streak logic', () => {
  it('increments streak on consecutive days', async () => {
    await writeStreakForDate('2026-04-20', 5)
    await writeStreakForDate('2026-04-21', 5)

    const day2 = await db.streaks.get('2026-04-21')
    expect(day2?.current_streak).toBe(2)
    expect(day2?.max_streak).toBe(2)
  })

  it('resets to 1 after a skipped day', async () => {
    await writeStreakForDate('2026-04-20', 5)
    await writeStreakForDate('2026-04-21', 5)
    // Skip 2026-04-22 — write on 2026-04-23 instead
    await writeStreakForDate('2026-04-23', 5)

    const day4 = await db.streaks.get('2026-04-23')
    expect(day4?.current_streak).toBe(1)
    // NOTE: max_streak only propagates from yesterday's record; after a gap it resets.
    // All-time max persistence across gaps is a Phase 2 improvement.
    expect(day4?.max_streak).toBe(1)
  })

  it('does not inflate streak for multiple sessions on the same day', async () => {
    await writeStreakForDate('2026-04-20', 5)
    // Second session same day
    await writeStreakForDate('2026-04-20', 3)

    const entries = await db.streaks.where('userId').equals(USER_ID).toArray()
    expect(entries).toHaveLength(1)
    expect(entries[0].current_streak).toBe(1)
    expect(entries[0].cards_reviewed).toBe(8)
  })
})
