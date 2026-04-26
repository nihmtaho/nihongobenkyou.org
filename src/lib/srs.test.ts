import type { CardState } from '../types/srs'
import { describe, expect, it } from 'vitest'
import { calculateNextReview } from './srs'

const baseCard: CardState = {
  userId: 'u1',
  vocabId: 'test_abc',
  interval_days: 1,
  ease_factor: 2.5,
  due_date: '2026-01-01',
  review_count: 1,
  last_rating: null,
  pending_sync: false,
  updated_at: '2026-01-01T00:00:00Z',
  is_known: false,
}

describe('calculateNextReview', () => {
  describe('first review (review_count = 0)', () => {
    const firstCard = { ...baseCard, review_count: 0 }

    it('again → interval 1', () => {
      expect(calculateNextReview(firstCard, 0).new_interval).toBe(1)
    })
    it('hard → interval 1', () => {
      expect(calculateNextReview(firstCard, 1).new_interval).toBe(1)
    })
    it('good → interval 1', () => {
      expect(calculateNextReview(firstCard, 2).new_interval).toBe(1)
    })
    it('easy → interval 4', () => {
      expect(calculateNextReview(firstCard, 3).new_interval).toBe(4)
    })
  })

  describe('again (rating 0)', () => {
    it('resets interval to 1', () => {
      expect(calculateNextReview({ ...baseCard, interval_days: 20 }, 0).new_interval).toBe(1)
    })
    it('reduces ease by 0.2', () => {
      expect(calculateNextReview({ ...baseCard, ease_factor: 2.5 }, 0).new_ease).toBeCloseTo(2.3)
    })
    it('clamps ease at 1.3', () => {
      expect(calculateNextReview({ ...baseCard, ease_factor: 1.4 }, 0).new_ease).toBe(1.3)
    })
  })

  describe('hard (rating 1)', () => {
    it('uses floor(interval × 1.2) — interval=6 gives 7 not 8', () => {
      expect(calculateNextReview({ ...baseCard, interval_days: 6 }, 1).new_interval).toBe(7)
    })
    it('multiplies interval by 1.2 (exact result)', () => {
      expect(calculateNextReview({ ...baseCard, interval_days: 10 }, 1).new_interval).toBe(12)
    })
    it('reduces ease by 0.15', () => {
      expect(calculateNextReview({ ...baseCard, ease_factor: 2.5 }, 1).new_ease).toBeCloseTo(2.35)
    })
    it('clamps ease at 1.3', () => {
      expect(calculateNextReview({ ...baseCard, ease_factor: 1.3 }, 1).new_ease).toBe(1.3)
    })
    it('clamps ease when ease_factor=1.35 → 1.3 minimum', () => {
      expect(calculateNextReview({ ...baseCard, ease_factor: 1.35 }, 1).new_ease).toBe(1.3)
    })
  })

  describe('good (rating 2)', () => {
    it('multiplies interval by ease', () => {
      const result = calculateNextReview({ ...baseCard, interval_days: 4, ease_factor: 2.5 }, 2)
      expect(result.new_interval).toBe(10)
    })
    it('interval=6, ease=2.5 gives 15 (round(6×2.5)=15, not 16)', () => {
      expect(calculateNextReview({ ...baseCard, interval_days: 6, ease_factor: 2.5 }, 2).new_interval).toBe(15)
    })
    it('does not change ease', () => {
      expect(calculateNextReview({ ...baseCard, ease_factor: 2.5 }, 2).new_ease).toBe(2.5)
    })
  })

  describe('easy (rating 3)', () => {
    it('multiplies interval by ease * 1.3', () => {
      const result = calculateNextReview({ ...baseCard, interval_days: 4, ease_factor: 2.5 }, 3)
      expect(result.new_interval).toBe(Math.ceil(4 * 2.5 * 1.3))
    })
    it('increases ease by 0.15', () => {
      expect(calculateNextReview({ ...baseCard, ease_factor: 2.5 }, 3).new_ease).toBeCloseTo(2.65)
    })
  })

  describe('max interval cap', () => {
    it('caps interval at 180 days', () => {
      const result = calculateNextReview({ ...baseCard, interval_days: 150, ease_factor: 2.5 }, 2)
      expect(result.new_interval).toBe(180)
    })
  })

  describe('due_date', () => {
    it('returns a future date string in YYYY-MM-DD format', () => {
      const result = calculateNextReview(baseCard, 2)
      expect(result.due_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(new Date(result.due_date).getTime()).toBeGreaterThan(Date.now())
    })
  })
})
