import type { KanjiCardState } from '../types/kanji'
import type { CardStage, CardState } from '../types/srs'
import type { VocabWithSRS } from '../types/vocabulary'
import { describe, expect, it } from 'vitest'
import { computeTypeInputRatingForDisplay, toCardState } from './srs-utils'

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
  card_stage: 'review',
  learning_step: 0,
  lapse_count: 0,
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

const NOW = '2026-01-01T00:00:00Z'

function makeVocabCard(overrides: Partial<VocabWithSRS> = {}): VocabWithSRS {
  return {
    vocab_id: 'mnn1_test0000001',
    word: '食べる',
    reading: 'たべる',
    romaji: 'taberu',
    meaning_en: 'to eat',
    meaning_vi: 'ăn',
    pitch_pattern: null,
    pitch_type: null,
    audio_filename: null,
    pos: [],
    jlpt_level: 5,
    book_source: 'minna_shokyuu_1',
    lesson_number: 3,
    examples: [],
    tags: [],
    deprecated: false,
    interval_days: 4,
    ease_factor: 2.5,
    due_date: '2026-01-05',
    review_count: 3,
    last_rating: 2,
    pending_sync: false,
    updated_at: NOW,
    is_known: false,
    consecutive_correct: 2,
    card_stage: 'review' as CardStage,
    learning_step: 0,
    lapse_count: 0,
    ...overrides,
  }
}

function makeKanjiCard(overrides: Partial<KanjiCardState> = {}): KanjiCardState {
  return {
    userId: 'kanji-owner',
    char: '食',
    interval_days: 7,
    ease_factor: 2.6,
    due_date: '2026-01-08',
    review_count: 4,
    last_rating: 3,
    pending_sync: false,
    updated_at: NOW,
    consecutive_correct: 4,
    card_stage: 'review' as CardStage,
    learning_step: 0,
    lapse_count: 0,
    ...overrides,
  }
}

describe('toCardState', () => {
  describe('vocabWithSRS path', () => {
    it('maps vocab_id to vocabId', () => {
      const card = makeVocabCard({ vocab_id: 'mnn1_abc0000042' })
      const state = toCardState(card, 'u1')
      expect(state.vocabId).toBe('mnn1_abc0000042')
    })

    it('uses the userId argument, not a field on the card', () => {
      const card = makeVocabCard()
      const state = toCardState(card, 'caller-user')
      expect(state.userId).toBe('caller-user')
    })

    it('preserves is_known from the card', () => {
      const state = toCardState(makeVocabCard({ is_known: true }), 'u1')
      expect(state.is_known).toBe(true)

      const state2 = toCardState(makeVocabCard({ is_known: false }), 'u1')
      expect(state2.is_known).toBe(false)
    })

    it('defaults is_known to false when undefined (pre-migration row)', () => {
      const card = makeVocabCard({ is_known: undefined as unknown as boolean })
      const state = toCardState(card, 'u1')
      expect(state.is_known).toBe(false)
    })

    it('preserves consecutive_correct from the card', () => {
      const state = toCardState(makeVocabCard({ consecutive_correct: 5 }), 'u1')
      expect(state.consecutive_correct).toBe(5)
    })

    it('defaults consecutive_correct to 0 when undefined (pre-migration row)', () => {
      const card = makeVocabCard({ consecutive_correct: undefined as unknown as number })
      const state = toCardState(card, 'u1')
      expect(state.consecutive_correct).toBe(0)
    })

    it('preserves card_stage from the card', () => {
      const state = toCardState(makeVocabCard({ card_stage: 'relearning' }), 'u1')
      expect(state.card_stage).toBe('relearning')
    })

    it('defaults card_stage to "review" when undefined (pre-migration row)', () => {
      const card = makeVocabCard({ card_stage: undefined as unknown as CardStage })
      const state = toCardState(card, 'u1')
      expect(state.card_stage).toBe('review')
    })

    it('preserves learning_step from the card', () => {
      const state = toCardState(makeVocabCard({ learning_step: 2 }), 'u1')
      expect(state.learning_step).toBe(2)
    })

    it('defaults learning_step to 0 when undefined', () => {
      const card = makeVocabCard({ learning_step: undefined as unknown as number })
      const state = toCardState(card, 'u1')
      expect(state.learning_step).toBe(0)
    })

    it('preserves lapse_count from the card', () => {
      const state = toCardState(makeVocabCard({ lapse_count: 3 }), 'u1')
      expect(state.lapse_count).toBe(3)
    })

    it('defaults lapse_count to 0 when undefined', () => {
      const card = makeVocabCard({ lapse_count: undefined as unknown as number })
      const state = toCardState(card, 'u1')
      expect(state.lapse_count).toBe(0)
    })

    it('passes through all SRS fields unchanged', () => {
      const card = makeVocabCard()
      const state = toCardState(card, 'u1')
      expect(state.interval_days).toBe(card.interval_days)
      expect(state.ease_factor).toBe(card.ease_factor)
      expect(state.due_date).toBe(card.due_date)
      expect(state.review_count).toBe(card.review_count)
      expect(state.last_rating).toBe(card.last_rating)
    })
  })

  describe('kanjiCardState path', () => {
    it('maps char to vocabId', () => {
      const card = makeKanjiCard({ char: '水' })
      const state = toCardState(card, 'ignored-user')
      expect(state.vocabId).toBe('水')
    })

    it('uses card.userId, NOT the userId argument', () => {
      const card = makeKanjiCard({ userId: 'kanji-owner' })
      const state = toCardState(card, 'ignored-user')
      expect(state.userId).toBe('kanji-owner')
    })

    it('hardcodes is_known to false regardless of any card field', () => {
      const state = toCardState(makeKanjiCard(), 'u1')
      expect(state.is_known).toBe(false)
    })

    it('preserves consecutive_correct from the card', () => {
      const state = toCardState(makeKanjiCard({ consecutive_correct: 6 }), 'u1')
      expect(state.consecutive_correct).toBe(6)
    })

    it('defaults consecutive_correct to 0 when undefined (pre-migration row)', () => {
      const card = makeKanjiCard({ consecutive_correct: undefined as unknown as number })
      const state = toCardState(card, 'u1')
      expect(state.consecutive_correct).toBe(0)
    })

    it('defaults card_stage to "review" when undefined (pre-migration row)', () => {
      const card = makeKanjiCard({ card_stage: undefined as unknown as CardStage })
      const state = toCardState(card, 'u1')
      expect(state.card_stage).toBe('review')
    })

    it('preserves learning_step from the card', () => {
      const state = toCardState(makeKanjiCard({ learning_step: 1 }), 'u1')
      expect(state.learning_step).toBe(1)
    })

    it('defaults lapse_count to 0 when undefined', () => {
      const card = makeKanjiCard({ lapse_count: undefined as unknown as number })
      const state = toCardState(card, 'u1')
      expect(state.lapse_count).toBe(0)
    })
  })
})
