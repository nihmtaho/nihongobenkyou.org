import type { CardState } from '../types/srs'
import { describe, expect, it } from 'vitest'
import { computeTypeInputRatingForDisplay } from './srs-utils'

const base: CardState = {
  userId: 'u1',
  vocabId: 'test_abc',
  interval_days: 1,
  ease_factor: 2.5,
  due_date: '2026-01-01',
  review_count: 0,
  last_rating: null,
  pending_sync: false,
  updated_at: '2026-01-01T00:00:00Z',
  is_known: false,
  consecutive_correct: 0,
}

describe('computeTypeInputRatingForDisplay', () => {
  it('wrong → Again (0)', () => {
    expect(computeTypeInputRatingForDisplay(base, false)).toBe(0)
  })

  it('correct + review_count 0 → Hard (1)', () => {
    expect(computeTypeInputRatingForDisplay({ ...base, review_count: 0 }, true)).toBe(1)
  })

  it('correct + review_count 1 → Hard (1)', () => {
    expect(computeTypeInputRatingForDisplay({ ...base, review_count: 1 }, true)).toBe(1)
  })

  it('correct + review_count 2 + consecutive_correct 0 → Good (2)', () => {
    expect(computeTypeInputRatingForDisplay({ ...base, review_count: 2, consecutive_correct: 0 }, true)).toBe(2)
  })

  it('correct + review_count 5 + consecutive_correct 3 → Good (2) (streak not yet 5)', () => {
    expect(computeTypeInputRatingForDisplay({ ...base, review_count: 5, consecutive_correct: 3 }, true)).toBe(2)
  })

  it('correct + review_count 2 + consecutive_correct 4 → Easy (3) (5th consecutive)', () => {
    expect(computeTypeInputRatingForDisplay({ ...base, review_count: 2, consecutive_correct: 4 }, true)).toBe(3)
  })

  it('correct + review_count 10 + consecutive_correct 4 → Easy (3)', () => {
    expect(computeTypeInputRatingForDisplay({ ...base, review_count: 10, consecutive_correct: 4 }, true)).toBe(3)
  })

  it('correct + review_count 1 + consecutive_correct 10 → Hard (1) (review_count takes priority for first/second)', () => {
    expect(computeTypeInputRatingForDisplay({ ...base, review_count: 1, consecutive_correct: 10 }, true)).toBe(1)
  })
})
