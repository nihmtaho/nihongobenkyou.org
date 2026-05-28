import { describe, expect, it, vi } from 'vitest'

import { getLastNDates, getToday, getTodayUTC, getWeekBounds } from './date-utils'

describe('getToday()', () => {
  it('returns a string matching YYYY-MM-DD format', () => {
    const today = getToday()
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns the correct local date', () => {
    const today = getToday()
    const expected = new Date().toLocaleDateString('en-CA')
    expect(today).toBe(expected)
  })
})

describe('getTodayUTC', () => {
  it('returns current UTC date as YYYY-MM-DD', () => {
    const result = getTodayUTC()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    // Must match the UTC date from toISOString
    expect(result).toBe(new Date().toISOString().slice(0, 10))
  })
})

describe('getLastNDates()', () => {
  it('getLastNDates(1) returns array of length 1', () => {
    const dates = getLastNDates(1)
    expect(dates).toHaveLength(1)
  })

  it('getLastNDates(1) single entry equals getToday()', () => {
    const dates = getLastNDates(1)
    expect(dates[0]).toBe(getToday())
  })

  it('getLastNDates(7) returns array of length 7', () => {
    const dates = getLastNDates(7)
    expect(dates).toHaveLength(7)
  })

  it('getLastNDates(7) oldest first: index 0 < index 6', () => {
    const dates = getLastNDates(7)
    expect(dates[0] < dates[6]).toBe(true)
  })

  it('getLastNDates(7) last entry equals getToday()', () => {
    const dates = getLastNDates(7)
    expect(dates[6]).toBe(getToday())
  })

  it('getLastNDates(3) each consecutive entry is exactly 1 day apart', () => {
    const dates = getLastNDates(3)
    expect(dates).toHaveLength(3)

    for (let i = 0; i < dates.length - 1; i++) {
      const current = new Date(dates[i])
      const next = new Date(dates[i + 1])
      const diffMs = next.getTime() - current.getTime()
      const diffDays = diffMs / (1000 * 60 * 60 * 24)

      expect(diffDays).toBe(1)
    }
  })

  it('getLastNDates(7) all dates follow YYYY-MM-DD format', () => {
    const dates = getLastNDates(7)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/

    dates.forEach((date) => {
      expect(date).toMatch(dateRegex)
    })
  })

  it('getLastNDates(0) returns empty array', () => {
    const dates = getLastNDates(0)
    expect(dates).toHaveLength(0)
  })
})

describe('getWeekBounds()', () => {
  it('returns weekStart as Monday and weekEnd as Sunday', () => {
    // Mock a Wednesday UTC+7 (2026-05-27 is a Wednesday)
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-27T10:00:00+07:00'))

    const { weekStart, weekEnd } = getWeekBounds()

    expect(weekStart).toBe('2026-05-25') // Monday
    expect(weekEnd).toBe('2026-05-31') // Sunday

    vi.useRealTimers()
  })

  it('returns weekStart as today when called on a Monday', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-25T00:01:00+07:00'))

    const { weekStart } = getWeekBounds()

    expect(weekStart).toBe('2026-05-25')

    vi.useRealTimers()
  })

  it('returns weekEnd as today when called on a Sunday', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-31T23:59:00+07:00'))

    const { weekEnd, daysUntilReset } = getWeekBounds()

    expect(weekEnd).toBe('2026-05-31')
    expect(daysUntilReset).toBe(1)

    vi.useRealTimers()
  })

  it('daysUntilReset is 7 on a Monday', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-25T08:00:00+07:00'))

    const { daysUntilReset } = getWeekBounds()

    expect(daysUntilReset).toBe(7)

    vi.useRealTimers()
  })
})
