import type { FSRSResult, SRSCard, SRSRating } from '../types/srs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { sampleVocabulary } from '../__fixtures__/vocabulary'
import { writeReviewLog } from './review-log'
import { db } from './schema'

const USER_ID = 'test-review-log-user'

function makeSRSCard(overrides: Partial<SRSCard> = {}): SRSCard {
  return {
    userId: USER_ID,
    cardId: sampleVocabulary[0].vocab_id,
    cardType: 'vocab',
    deckId: null,
    state: 'review',
    stability: 4.0,
    difficulty: 5.0,
    elapsed_days: 2,
    scheduled_days: 4,
    reps: 2,
    lapses: 0,
    last_review: '2026-06-01',
    due: '2026-06-05',
    last_rating: null,
    is_known: false,
    consecutive_correct: 0,
    pending_sync: false,
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

function makeResult(): FSRSResult {
  return {
    due: '2026-06-10',
    due_datetime: '2026-06-10T00:00:00.000Z',
    state: 'review',
    stability: 8.0,
    difficulty: 5.0,
    elapsed_days: 4,
    scheduled_days: 5,
    reps: 3,
    lapses: 0,
    last_review: '2026-06-05',
  }
}

beforeEach(async () => {
  await db.delete()
  await db.open()
  await db.vocabulary.bulkPut(sampleVocabulary)
})

afterEach(async () => {
  await db.delete()
})

describe('writeReviewLog', () => {
  it('returns a numeric id after inserting the log entry', async () => {
    const srsCard = makeSRSCard()
    const result = makeResult()
    const id = await writeReviewLog({
      userId: USER_ID,
      srsCard,
      rating: 3 as SRSRating,
      result,
      isKnown: false,
    })
    expect(typeof id).toBe('number')
    expect(id).toBeGreaterThan(0)
  })

  it('reads book_source from vocabulary table for cardType="vocab"', async () => {
    const vocabCard = sampleVocabulary[0]
    const srsCard = makeSRSCard({ cardId: vocabCard.vocab_id, cardType: 'vocab' })
    const result = makeResult()

    await writeReviewLog({
      userId: USER_ID,
      srsCard,
      rating: 3 as SRSRating,
      result,
      isKnown: false,
    })

    const entries = await db.review_log.toArray()
    expect(entries).toHaveLength(1)
    expect(entries[0].bookSource).toBe(vocabCard.book_source)
  })

  it('uses "kanji" as bookSource for cardType="kanji"', async () => {
    const srsCard = makeSRSCard({ cardId: '山', cardType: 'kanji' })
    const result = makeResult()

    await writeReviewLog({
      userId: USER_ID,
      srsCard,
      rating: 2 as SRSRating,
      result,
      isKnown: false,
    })

    const entries = await db.review_log.toArray()
    expect(entries).toHaveLength(1)
    expect(entries[0].bookSource).toBe('kanji')
    expect(entries[0].cardType).toBe('kanji')
  })

  it('uses "custom_vocab" as bookSource for cardType="custom_vocab"', async () => {
    const srsCard = makeSRSCard({ cardId: 'custom-uuid-123', cardType: 'custom_vocab', deckId: 'deck-1' })
    const result = makeResult()

    await writeReviewLog({
      userId: USER_ID,
      srsCard,
      rating: 4 as SRSRating,
      result,
      isKnown: true,
    })

    const entries = await db.review_log.toArray()
    expect(entries).toHaveLength(1)
    expect(entries[0].bookSource).toBe('custom_vocab')
    expect(entries[0].cardType).toBe('custom_vocab')
    expect(entries[0].isKnown).toBe(true)
  })

  it('falls back to "minna_shokyuu_1" when vocab record is missing', async () => {
    // Card with vocab cardType but no matching vocabulary entry
    const srsCard = makeSRSCard({ cardId: 'nonexistent-vocab-id', cardType: 'vocab' })
    const result = makeResult()

    await writeReviewLog({
      userId: USER_ID,
      srsCard,
      rating: 1 as SRSRating,
      result,
      isKnown: false,
    })

    const entries = await db.review_log.toArray()
    expect(entries).toHaveLength(1)
    expect(entries[0].bookSource).toBe('minna_shokyuu_1')
  })

  it('stores all required fields in the review log entry', async () => {
    const vocabCard = sampleVocabulary[2]
    const srsCard = makeSRSCard({ cardId: vocabCard.vocab_id, cardType: 'vocab' })
    const result = makeResult()
    const rating: SRSRating = 3

    const id = await writeReviewLog({
      userId: USER_ID,
      srsCard,
      rating,
      result,
      isKnown: false,
    })

    const entry = await db.review_log.get(id)
    expect(entry).toBeDefined()
    expect(entry!.userId).toBe(USER_ID)
    expect(entry!.vocabId).toBe(vocabCard.vocab_id)
    expect(entry!.rating).toBe(rating)
    expect(entry!.scheduledDays).toBe(result.scheduled_days)
    expect(entry!.stability).toBe(result.stability)
    expect(entry!.difficulty).toBe(result.difficulty)
    expect(entry!.dueDate).toBe(result.due)
    expect(entry!.reviewCount).toBe(result.reps)
    expect(entry!.pendingSync).toBe(true)
    expect(entry!.remoteId).toBeNull()
  })
})
