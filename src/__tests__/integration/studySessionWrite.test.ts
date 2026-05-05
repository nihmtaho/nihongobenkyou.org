import type { SRSRating } from '../../types/srs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sampleVocabulary } from '../../__fixtures__/vocabulary'
import { db } from '../../db/schema'
import { calculateNextReview } from '../../lib/srs'
import { toCardState } from '../../lib/srs-utils'

vi.mock('../../db/sync', () => ({ uploadPendingReviews: vi.fn().mockResolvedValue(undefined), downloadNewReviews: vi.fn().mockResolvedValue(undefined) }))

const TEST_USER_ID = 'test-user-001'

beforeEach(async () => {
  await db.sessions.clear()
})

afterEach(async () => {
  await db.sessions.clear()
})

describe('db.sessions — Dexie write', () => {
  it('writes a session record and reads it back', async () => {
    const studiedAt = new Date()
    await db.sessions.add({
      user_id: TEST_USER_ID,
      mode: 'flashcard',
      lesson_ids: ['minna_shokyuu_1:1', 'minna_shokyuu_1:2'],
      cards_reviewed: 10,
      correct_count: 8,
      duration_sec: 120,
      studied_at: studiedAt,
    })

    const records = await db.sessions.where('user_id').equals(TEST_USER_ID).toArray()
    expect(records).toHaveLength(1)
    expect(records[0].mode).toBe('flashcard')
    expect(records[0].cards_reviewed).toBe(10)
    expect(records[0].correct_count).toBe(8)
    expect(records[0].duration_sec).toBe(120)
    expect(records[0].lesson_ids).toEqual(['minna_shokyuu_1:1', 'minna_shokyuu_1:2'])
  })

  it('assigns an auto-incremented id', async () => {
    const id1 = await db.sessions.add({
      user_id: TEST_USER_ID,
      mode: 'quiz',
      lesson_ids: ['minna_shokyuu_1:3'],
      cards_reviewed: 5,
      correct_count: 5,
      duration_sec: 60,
      studied_at: new Date(),
    })

    const id2 = await db.sessions.add({
      user_id: TEST_USER_ID,
      mode: 'type-input',
      lesson_ids: ['minna_shokyuu_1:4'],
      cards_reviewed: 3,
      correct_count: 2,
      duration_sec: 45,
      studied_at: new Date(),
    })

    expect(typeof id1).toBe('number')
    expect(typeof id2).toBe('number')
    expect(id2).toBeGreaterThan(id1 as number)
  })

  it('supports querying by [user_id+studied_at] compound index', async () => {
    const date1 = new Date('2024-01-01T10:00:00Z')
    const date2 = new Date('2024-01-02T10:00:00Z')

    await db.sessions.add({
      user_id: TEST_USER_ID,
      mode: 'flashcard',
      lesson_ids: ['minna_shokyuu_1:1'],
      cards_reviewed: 10,
      correct_count: 9,
      duration_sec: 100,
      studied_at: date1,
    })

    await db.sessions.add({
      user_id: 'other-user',
      mode: 'flashcard',
      lesson_ids: ['minna_shokyuu_1:1'],
      cards_reviewed: 5,
      correct_count: 3,
      duration_sec: 50,
      studied_at: date2,
    })

    const records = await db.sessions.where('user_id').equals(TEST_USER_ID).toArray()
    expect(records).toHaveLength(1)
    expect(records[0].user_id).toBe(TEST_USER_ID)
  })

  it('stores session for all three study modes', async () => {
    const modes = ['flashcard', 'quiz', 'type-input'] as const
    for (const mode of modes) {
      await db.sessions.add({
        user_id: TEST_USER_ID,
        mode,
        lesson_ids: ['minna_shokyuu_1:1'],
        cards_reviewed: 10,
        correct_count: 8,
        duration_sec: 90,
        studied_at: new Date(),
      })
    }

    const records = await db.sessions.where('user_id').equals(TEST_USER_ID).toArray()
    expect(records).toHaveLength(3)
    const storedModes = records.map(r => r.mode)
    expect(storedModes).toContain('flashcard')
    expect(storedModes).toContain('quiz')
    expect(storedModes).toContain('type-input')
  })
})

// T031 — per-rating ratingCounts coverage (FR-011)
// Verifies all 4 SRS ratings write the correct last_rating and interval_days to Dexie.
describe('per-rating Dexie writes — ratingCounts data coverage (T031)', () => {
  const PAST_DATE = '2020-01-01T00:00:00.000Z'
  const TEST_USER = 'test-rating-counts'

  async function seedCard(vocabIdx: number) {
    const vocab = sampleVocabulary[vocabIdx]
    await db.vocabulary.put(vocab)
    const card = {
      userId: TEST_USER,
      vocabId: vocab.vocab_id,
      interval_days: 6,
      ease_factor: 2.5,
      due_date: PAST_DATE,
      review_count: 2,
      last_rating: null as null,
      pending_sync: false,
      updated_at: PAST_DATE,
      is_known: false,
      consecutive_correct: 0,
      card_stage: 'review' as const,
      learning_step: 0,
      lapse_count: 0,
    }
    await db.user_cards.put(card)
    return { vocab, card }
  }

  async function applyRating(card: Parameters<typeof db.user_cards.put>[0], rating: SRSRating) {
    const state = toCardState({ ...card, vocab_id: card.vocabId } as unknown as Parameters<typeof toCardState>[0], card.userId)
    const result = calculateNextReview(state, rating)
    const now = new Date().toISOString()
    const dueDate = new Date(Date.now() + result.new_interval * 86400000).toISOString().slice(0, 10)
    await db.user_cards.put({
      ...card,
      interval_days: result.new_interval,
      ease_factor: result.new_ease,
      due_date: dueDate,
      review_count: card.review_count + 1,
      last_rating: rating,
      pending_sync: false,
      updated_at: now,
      card_stage: result.new_card_stage,
      learning_step: result.new_learning_step,
      lapse_count: result.new_lapse_count,
    })
  }

  beforeEach(async () => {
    await db.user_cards.clear()
    await db.vocabulary.clear()
    await db.review_log.clear()
  })

  afterEach(async () => {
    await db.user_cards.clear()
    await db.vocabulary.clear()
    await db.review_log.clear()
  })

  const ratingCases: Array<{ rating: SRSRating, label: string }> = [
    { rating: 0, label: 'Again' },
    { rating: 1, label: 'Hard' },
    { rating: 2, label: 'Good' },
    { rating: 3, label: 'Easy' },
  ]

  for (const { rating, label } of ratingCases) {
    it(`${label} (rating=${rating}): writes last_rating=${rating}`, async () => {
      const { vocab, card } = await seedCard(rating)
      await applyRating(card, rating)
      const stored = await db.user_cards.get([TEST_USER, vocab.vocab_id])
      expect(stored).toBeDefined()
      expect(stored!.last_rating).toBe(rating)
    })
  }

  it('again (0): lapse → relearning stage, interval resets to 1', async () => {
    const { vocab, card } = await seedCard(0)
    await applyRating(card, 0)
    const stored = await db.user_cards.get([TEST_USER, vocab.vocab_id])
    expect(stored!.interval_days).toBe(1)
    expect(stored!.card_stage).toBe('relearning')
  })

  it('hard (1): applies floor(6 × 1.2) = 7 interval', async () => {
    const { vocab, card } = await seedCard(1)
    await applyRating(card, 1)
    const stored = await db.user_cards.get([TEST_USER, vocab.vocab_id])
    expect(stored!.interval_days).toBe(7)
    expect(stored!.ease_factor).toBe(2.35)
  })

  it('good (2): applies round(6 × 2.5) = 15 interval, ease unchanged', async () => {
    const { vocab, card } = await seedCard(2)
    await applyRating(card, 2)
    const stored = await db.user_cards.get([TEST_USER, vocab.vocab_id])
    expect(stored!.interval_days).toBe(15)
    expect(stored!.ease_factor).toBe(2.5)
  })

  it('easy (3): applies round(6 × 2.5 × 1.3) = 20 interval, ease increases', async () => {
    const { vocab, card } = await seedCard(3)
    await applyRating(card, 3)
    const stored = await db.user_cards.get([TEST_USER, vocab.vocab_id])
    expect(stored!.interval_days).toBe(20)
    expect(stored!.ease_factor).toBeCloseTo(2.65, 5)
  })
})
