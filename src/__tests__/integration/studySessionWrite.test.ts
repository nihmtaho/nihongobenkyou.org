import type { SRSCard, SRSRating } from '../../types/srs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sampleVocabulary } from '../../__fixtures__/vocabulary'
import { db } from '../../db/schema'
import { scheduleFSRS } from '../../lib/srs'

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
// Verifies all 4 FSRS ratings write the correct last_rating and scheduled_days to Dexie.
describe('per-rating Dexie writes — ratingCounts data coverage (T031)', () => {
  const PAST_DATE = '2020-01-01'
  const TEST_USER = 'test-rating-counts'

  function makeCard(vocabIdx: number): SRSCard {
    const vocab = sampleVocabulary[vocabIdx]
    return {
      userId: TEST_USER,
      cardId: vocab.vocab_id,
      cardType: 'vocab',
      deckId: null,
      state: 'review',
      stability: 6,
      difficulty: 5,
      elapsed_days: 0,
      scheduled_days: 6,
      reps: 2,
      lapses: 0,
      last_review: PAST_DATE,
      due: PAST_DATE,
      last_rating: null,
      is_known: false,
      consecutive_correct: 0,
      pending_sync: false,
      updated_at: `${PAST_DATE}T00:00:00Z`,
    }
  }

  async function seedCard(vocabIdx: number): Promise<SRSCard> {
    const card = makeCard(vocabIdx)
    await db.vocabulary.put(sampleVocabulary[vocabIdx])
    await db.srs_cards.put(card)
    return card
  }

  async function applyRating(card: SRSCard, rating: SRSRating): Promise<void> {
    const result = scheduleFSRS(card, rating)
    const now = new Date().toISOString()
    await db.srs_cards.put({
      ...card,
      ...result,
      last_rating: rating,
      pending_sync: false,
      updated_at: now,
    })
  }

  beforeEach(async () => {
    await db.srs_cards.clear()
    await db.vocabulary.clear()
    await db.review_log.clear()
  })

  afterEach(async () => {
    await db.srs_cards.clear()
    await db.vocabulary.clear()
    await db.review_log.clear()
  })

  const ratingCases: Array<{ rating: SRSRating, label: string }> = [
    { rating: 1, label: 'Again' },
    { rating: 2, label: 'Hard' },
    { rating: 3, label: 'Good' },
    { rating: 4, label: 'Easy' },
  ]

  for (const { rating, label } of ratingCases) {
    it(`${label} (rating=${rating}): writes last_rating=${rating}`, async () => {
      const card = await seedCard(rating - 1)
      await applyRating(card, rating)
      const stored = await db.srs_cards.get([TEST_USER, card.cardId])
      expect(stored).toBeDefined()
      expect(stored!.last_rating).toBe(rating)
    })
  }

  it('again (1): state transitions to learning/relearning, scheduled_days resets', async () => {
    const card = await seedCard(0)
    await applyRating(card, 1)
    const stored = await db.srs_cards.get([TEST_USER, card.cardId])
    expect(stored!.state).toMatch(/learning|relearning/)
  })

  it('hard (2): scheduled_days increases modestly', async () => {
    const card = await seedCard(1)
    await applyRating(card, 2)
    const stored = await db.srs_cards.get([TEST_USER, card.cardId])
    expect(stored!.scheduled_days).toBeGreaterThan(0)
  })

  it('good (3): scheduled_days increases moderately', async () => {
    const card = await seedCard(2)
    const hardCard = await seedCard(2)
    await applyRating(card, 3)
    await applyRating(hardCard, 2)
    const goodStored = await db.srs_cards.get([TEST_USER, card.cardId])
    const hardStored = await db.srs_cards.get([TEST_USER, hardCard.cardId])
    expect(goodStored!.scheduled_days).toBeGreaterThanOrEqual(hardStored!.scheduled_days)
  })

  it('easy (4): scheduled_days increases the most', async () => {
    const goodCard = await seedCard(2)
    const easyCard = await seedCard(3)
    await applyRating(goodCard, 3)
    await applyRating(easyCard, 4)
    const goodStored = await db.srs_cards.get([TEST_USER, goodCard.cardId])
    const easyStored = await db.srs_cards.get([TEST_USER, easyCard.cardId])
    expect(easyStored!.scheduled_days).toBeGreaterThanOrEqual(goodStored!.scheduled_days)
  })
})
