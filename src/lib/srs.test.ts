import type { CardStage, CardState } from '../types/srs'
import { describe, expect, it } from 'vitest'
import { AGAIN_DELAY_MAX_MS, AGAIN_DELAY_MIN_MS, calculateNextReview, formatIntervalPreview, randomAgainDelay } from './srs'

// Base card in review stage (represents a card that has graduated)
const baseCard: CardState = {
  userId: 'u1',
  vocabId: 'test_abc',
  interval_days: 4,
  ease_factor: 2.5,
  due_date: '2026-01-01',
  review_count: 3,
  last_rating: null,
  pending_sync: false,
  updated_at: '2026-01-01T00:00:00Z',
  is_known: false,
  consecutive_correct: 0,
  card_stage: 'review',
  learning_step: 0,
  lapse_count: 0,
}

function learningCard(step: number, stage: CardStage = 'learning'): CardState {
  return {
    ...baseCard,
    interval_days: 1,
    review_count: step,
    card_stage: stage,
    learning_step: step,
    lapse_count: 0,
  }
}

describe('calculateNextReview — learning stage', () => {
  describe('step 0 (1 min)', () => {
    it('again → stays step 0, due ~1 min ahead', () => {
      const before = Date.now()
      const r = calculateNextReview(learningCard(0), 0)
      expect(r.new_card_stage).toBe('learning')
      expect(r.new_learning_step).toBe(0)
      expect(new Date(r.due_date).getTime()).toBeGreaterThanOrEqual(before + 55_000)
      expect(new Date(r.due_date).getTime()).toBeLessThanOrEqual(before + 65_000)
    })

    it('hard → stays step 0, due ~1 min ahead', () => {
      const before = Date.now()
      const r = calculateNextReview(learningCard(0), 1)
      expect(r.new_card_stage).toBe('learning')
      expect(r.new_learning_step).toBe(0)
      expect(new Date(r.due_date).getTime()).toBeGreaterThanOrEqual(before + 55_000)
    })

    it('good → advances to step 1, due ~10 min ahead', () => {
      const before = Date.now()
      const r = calculateNextReview(learningCard(0), 2)
      expect(r.new_card_stage).toBe('learning')
      expect(r.new_learning_step).toBe(1)
      expect(new Date(r.due_date).getTime()).toBeGreaterThanOrEqual(before + 9 * 60_000)
      expect(new Date(r.due_date).getTime()).toBeLessThanOrEqual(before + 11 * 60_000)
    })

    it('easy → graduates, interval 4, stage review', () => {
      const r = calculateNextReview(learningCard(0), 3)
      expect(r.new_card_stage).toBe('review')
      expect(r.new_interval).toBe(4)
      expect(r.new_learning_step).toBe(0)
    })
  })

  describe('step 1 (10 min)', () => {
    it('again → back to step 0', () => {
      const r = calculateNextReview(learningCard(1), 0)
      expect(r.new_learning_step).toBe(0)
    })

    it('hard → stays step 1', () => {
      const r = calculateNextReview(learningCard(1), 1)
      expect(r.new_learning_step).toBe(1)
    })

    it('good → advances to step 2, due ~1 day ahead', () => {
      const before = Date.now()
      const r = calculateNextReview(learningCard(1), 2)
      expect(r.new_learning_step).toBe(2)
      expect(new Date(r.due_date).getTime()).toBeGreaterThanOrEqual(before + 23 * 3600_000)
      expect(new Date(r.due_date).getTime()).toBeLessThanOrEqual(before + 25 * 3600_000)
    })

    it('easy → graduates, interval 4', () => {
      const r = calculateNextReview(learningCard(1), 3)
      expect(r.new_card_stage).toBe('review')
      expect(r.new_interval).toBe(4)
    })
  })

  describe('step 2 (1 day)', () => {
    it('again → back to step 0', () => {
      const r = calculateNextReview(learningCard(2), 0)
      expect(r.new_learning_step).toBe(0)
    })

    it('hard → stays step 2', () => {
      const r = calculateNextReview(learningCard(2), 1)
      expect(r.new_learning_step).toBe(2)
    })

    it('good → graduates, interval 1', () => {
      const r = calculateNextReview(learningCard(2), 2)
      expect(r.new_card_stage).toBe('review')
      expect(r.new_interval).toBe(1)
    })

    it('easy → graduates, interval 4', () => {
      const r = calculateNextReview(learningCard(2), 3)
      expect(r.new_card_stage).toBe('review')
      expect(r.new_interval).toBe(4)
    })
  })
})

describe('calculateNextReview — relearning stage', () => {
  it('step 0 Good → advances to step 1 (same as learning)', () => {
    const r = calculateNextReview(learningCard(0, 'relearning'), 2)
    expect(r.new_card_stage).toBe('relearning')
    expect(r.new_learning_step).toBe(1)
  })

  it('step 2 Good → graduates back to review, interval 1', () => {
    const r = calculateNextReview(learningCard(2, 'relearning'), 2)
    expect(r.new_card_stage).toBe('review')
    expect(r.new_interval).toBe(1)
  })

  it('lapse_count is preserved through relearning steps', () => {
    const card = { ...learningCard(0, 'relearning'), lapse_count: 2 }
    const r = calculateNextReview(card, 2)
    expect(r.new_lapse_count).toBe(2)
  })
})

describe('calculateNextReview — review stage lapse (Again)', () => {
  it('stage becomes relearning', () => {
    expect(calculateNextReview(baseCard, 0).new_card_stage).toBe('relearning')
  })

  it('learning_step resets to 0', () => {
    expect(calculateNextReview(baseCard, 0).new_learning_step).toBe(0)
  })

  it('lapse_count increments by 1', () => {
    const card = { ...baseCard, lapse_count: 1 }
    expect(calculateNextReview(card, 0).new_lapse_count).toBe(2)
  })

  it('interval resets to 1', () => {
    expect(calculateNextReview({ ...baseCard, interval_days: 30 }, 0).new_interval).toBe(1)
  })

  it('due_date is ISO timestamp 6-10 min ahead', () => {
    const before = Date.now()
    const { due_date } = calculateNextReview(baseCard, 0)
    const dueMs = new Date(due_date).getTime()
    expect(dueMs).toBeGreaterThanOrEqual(before + 6 * 60_000)
    expect(dueMs).toBeLessThanOrEqual(before + 10 * 60_000 + 200)
  })

  it('reduces ease by 0.2', () => {
    expect(calculateNextReview({ ...baseCard, ease_factor: 2.5 }, 0).new_ease).toBeCloseTo(2.3)
  })

  it('clamps ease at 1.3', () => {
    expect(calculateNextReview({ ...baseCard, ease_factor: 1.4 }, 0).new_ease).toBe(1.3)
  })
})

describe('calculateNextReview — review stage Hard', () => {
  it('uses floor(interval × 1.2) — interval=6 gives 7', () => {
    expect(calculateNextReview({ ...baseCard, interval_days: 6 }, 1).new_interval).toBe(7)
  })

  it('multiplies interval by 1.2 (exact)', () => {
    expect(calculateNextReview({ ...baseCard, interval_days: 10 }, 1).new_interval).toBe(12)
  })

  it('reduces ease by 0.15', () => {
    expect(calculateNextReview({ ...baseCard, ease_factor: 2.5 }, 1).new_ease).toBeCloseTo(2.35)
  })

  it('clamps ease at 1.3', () => {
    expect(calculateNextReview({ ...baseCard, ease_factor: 1.3 }, 1).new_ease).toBe(1.3)
  })

  it('stays in review stage', () => {
    expect(calculateNextReview(baseCard, 1).new_card_stage).toBe('review')
  })

  it('lapse_count unchanged', () => {
    const card = { ...baseCard, lapse_count: 2 }
    expect(calculateNextReview(card, 1).new_lapse_count).toBe(2)
  })
})

describe('calculateNextReview — review stage Good', () => {
  it('multiplies interval by ease', () => {
    expect(calculateNextReview({ ...baseCard, interval_days: 4, ease_factor: 2.5 }, 2).new_interval).toBe(10)
  })

  it('does not change ease', () => {
    expect(calculateNextReview({ ...baseCard, ease_factor: 2.5 }, 2).new_ease).toBe(2.5)
  })

  it('stays in review stage', () => {
    expect(calculateNextReview(baseCard, 2).new_card_stage).toBe('review')
  })
})

describe('calculateNextReview — review stage Easy', () => {
  it('multiplies interval by ease * 1.3', () => {
    const r = calculateNextReview({ ...baseCard, interval_days: 4, ease_factor: 2.5 }, 3)
    expect(r.new_interval).toBe(Math.ceil(4 * 2.5 * 1.3))
  })

  it('increases ease by 0.15', () => {
    expect(calculateNextReview({ ...baseCard, ease_factor: 2.5 }, 3).new_ease).toBeCloseTo(2.65)
  })
})

describe('max interval cap', () => {
  it('caps interval at 180 days (review stage Good)', () => {
    expect(calculateNextReview({ ...baseCard, interval_days: 150, ease_factor: 2.5 }, 2).new_interval).toBe(180)
  })
})

describe('formatIntervalPreview', () => {
  it('negative/zero → < 1d', () => {
    expect(formatIntervalPreview(0)).toBe('< 1d')
    expect(formatIntervalPreview(-5)).toBe('< 1d')
  })
  it('1 day → 1d', () => {
    expect(formatIntervalPreview(1)).toBe('1d')
  })
  it('14 days → 14d', () => {
    expect(formatIntervalPreview(14)).toBe('14d')
  })
  it('30 days → 1mo', () => {
    expect(formatIntervalPreview(30)).toBe('1mo')
  })
  it('365 days → 1y', () => {
    expect(formatIntervalPreview(365)).toBe('1y')
  })
})

describe('randomAgainDelay', () => {
  it('returns value in [6 min, 10 min] range', () => {
    for (let i = 0; i < 100; i++) {
      const delay = randomAgainDelay()
      expect(delay).toBeGreaterThanOrEqual(AGAIN_DELAY_MIN_MS)
      expect(delay).toBeLessThanOrEqual(AGAIN_DELAY_MAX_MS)
    }
  })
})
