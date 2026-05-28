import { describe, expect, it } from 'vitest'

import { getLastNDates, getToday } from './date-utils'

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
