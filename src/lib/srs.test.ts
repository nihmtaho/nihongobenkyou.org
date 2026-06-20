import type { FSRS } from 'ts-fsrs'
import type { SRSCard } from '../types/srs'
import { describe, expect, it } from 'vitest'
import { createFSRS, formatIntervalPreview, initFSRSCard, scheduleFSRS } from './srs'

const baseCard: SRSCard = {
  userId: 'u1',
  cardId: 'test_abc',
  cardType: 'vocab',
  deckId: null,
  state: 'review',
  stability: 4,
  difficulty: 5,
  elapsed_days: 4,
  scheduled_days: 4,
  reps: 3,
  lapses: 0,
  last_review: '2026-01-01',
  due: '2026-01-05',
  last_rating: null,
  is_known: false,
  consecutive_correct: 0,
  pending_sync: false,
  updated_at: '2026-01-01T00:00:00Z',
}

const newCard: SRSCard = {
  ...baseCard,
  state: 'new',
  stability: 0,
  difficulty: 0,
  elapsed_days: 0,
  scheduled_days: 0,
  reps: 0,
}

describe('scheduleFSRS — new card', () => {
  it('again (1) sets state to learning', () => {
    const result = scheduleFSRS(newCard, 1)
    expect(result.state).toBe('learning')
    expect(result.reps).toBe(1)
    // FSRS does not count lapses for new cards — only review cards that fail
    expect(result.lapses).toBe(0)
  })

  it('good (3) on new card moves to learning', () => {
    const result = scheduleFSRS(newCard, 3)
    expect(result.state).toBe('learning')
    expect(result.reps).toBe(1)
    expect(result.stability).toBeGreaterThan(0)
  })

  it('easy (4) on new card can graduate directly to review', () => {
    const result = scheduleFSRS(newCard, 4)
    expect(['review', 'learning']).toContain(result.state)
    expect(result.reps).toBe(1)
    expect(result.scheduled_days).toBeGreaterThan(0)
  })
})

describe('scheduleFSRS — review card', () => {
  it('again (1) sends card to relearning', () => {
    const result = scheduleFSRS(baseCard, 1)
    expect(result.state).toBe('relearning')
    expect(result.lapses).toBe(1)
  })

  it('hard (2) increases interval less than Good', () => {
    const hard = scheduleFSRS(baseCard, 2)
    const good = scheduleFSRS(baseCard, 3)
    expect(hard.scheduled_days).toBeLessThan(good.scheduled_days)
  })

  it('easy (4) produces larger interval than Good', () => {
    const good = scheduleFSRS(baseCard, 3)
    const easy = scheduleFSRS(baseCard, 4)
    expect(easy.scheduled_days).toBeGreaterThan(good.scheduled_days)
  })

  it('good (3) increases stability', () => {
    const result = scheduleFSRS(baseCard, 3)
    expect(result.stability).toBeGreaterThan(baseCard.stability)
  })

  it('sets due to future YYYY-MM-DD string', () => {
    const result = scheduleFSRS(baseCard, 3)
    expect(result.due).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    // String comparison works for ISO dates: lexicographic order == chronological order
    expect(result.due > '2026-01-05').toBe(true)
  })

  it('sets last_review to today', () => {
    const result = scheduleFSRS(baseCard, 3)
    const today = new Date().toISOString().slice(0, 10)
    expect(result.last_review).toBe(today)
  })
})

describe('initFSRSCard', () => {
  it('returns a zeroed-out new card', () => {
    const card = initFSRSCard()
    expect(card.state).toBe('new')
    expect(card.stability).toBe(0)
    expect(card.difficulty).toBe(0)
    expect(card.reps).toBe(0)
    expect(card.lapses).toBe(0)
  })

  it('due and last_review are today', () => {
    const today = new Date().toISOString().slice(0, 10)
    const card = initFSRSCard()
    expect(card.due).toBe(today)
    expect(card.last_review).toBe(today)
  })
})

describe('createFSRS', () => {
  it('returns an FSRS instance with the given retention', () => {
    const instance = createFSRS(0.8)
    expect(instance).toBeDefined()
    expect(typeof instance.repeat).toBe('function')
  })

  it('uses different retention values — instances are distinct objects', () => {
    const a = createFSRS(0.8)
    const b = createFSRS(0.9)
    // Both are valid FSRS instances; they should not be the same object reference
    expect(a).not.toBe(b)
  })

  it('enable_fuzz is true — parameters reflect it', () => {
    const instance: FSRS = createFSRS(0.85)
    // ts-fsrs exposes parameters getter on FSRS instance
    expect(instance.parameters.enable_fuzz).toBe(true)
  })
})

describe('formatIntervalPreview', () => {
  it('returns < 1d for 0 days', () => expect(formatIntervalPreview(0)).toBe('< 1d'))
  it('returns Nd for days < 30', () => expect(formatIntervalPreview(14)).toBe('14d'))
  it('returns Nmo for 30–364', () => expect(formatIntervalPreview(60)).toBe('2mo'))
  it('returns Ny for 365+', () => expect(formatIntervalPreview(365)).toBe('1y'))
})
