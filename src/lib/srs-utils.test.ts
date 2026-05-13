import type { SRSCard } from '../types/srs'
import { describe, expect, it } from 'vitest'
import { computeTypeInputRatingForDisplay } from './srs-utils'

function makeCard(overrides: Partial<SRSCard> = {}): SRSCard {
  return {
    userId: 'u1',
    cardId: 'mnn1_test0000001',
    cardType: 'vocab',
    deckId: null,
    state: 'review',
    stability: 4,
    difficulty: 5,
    elapsed_days: 1,
    scheduled_days: 4,
    reps: 0,
    lapses: 0,
    last_review: '2026-01-01',
    due: '2026-01-05',
    last_rating: null,
    is_known: false,
    consecutive_correct: 0,
    pending_sync: false,
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('computeTypeInputRatingForDisplay', () => {
  it('wrong → Again (1)', () => {
    expect(computeTypeInputRatingForDisplay(makeCard(), false)).toBe(1)
  })

  it('correct + reps 0 → Hard (2)', () => {
    expect(computeTypeInputRatingForDisplay(makeCard({ reps: 0 }), true)).toBe(2)
  })

  it('correct + reps 1 → Hard (2)', () => {
    expect(computeTypeInputRatingForDisplay(makeCard({ reps: 1 }), true)).toBe(2)
  })

  it('correct + reps 2 + consecutive_correct 0 → Good (3)', () => {
    expect(computeTypeInputRatingForDisplay(makeCard({ reps: 2, consecutive_correct: 0 }), true)).toBe(3)
  })

  it('correct + reps 5 + consecutive_correct 3 → Good (3) (streak not yet 4)', () => {
    expect(computeTypeInputRatingForDisplay(makeCard({ reps: 5, consecutive_correct: 3 }), true)).toBe(3)
  })

  it('correct + reps 2 + consecutive_correct 4 → Easy (4) (5th consecutive)', () => {
    expect(computeTypeInputRatingForDisplay(makeCard({ reps: 2, consecutive_correct: 4 }), true)).toBe(4)
  })

  it('correct + reps 10 + consecutive_correct 4 → Easy (4)', () => {
    expect(computeTypeInputRatingForDisplay(makeCard({ reps: 10, consecutive_correct: 4 }), true)).toBe(4)
  })

  it('correct + reps 1 + consecutive_correct 10 → Hard (2) (reps takes priority for first/second)', () => {
    expect(computeTypeInputRatingForDisplay(makeCard({ reps: 1, consecutive_correct: 10 }), true)).toBe(2)
  })
})
