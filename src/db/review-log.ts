import type { FSRSResult, SRSCard, SRSRating } from '../types/srs'
import { db } from './schema'

export interface WriteReviewLogParams {
  userId: string
  srsCard: SRSCard
  rating: SRSRating
  result: FSRSResult
  isKnown: boolean
}

async function resolveBookSource(srsCard: SRSCard): Promise<string> {
  if (srsCard.cardType === 'kanji')
    return 'kanji'
  if (srsCard.cardType === 'custom_vocab')
    return 'custom_vocab'
  // cardType === 'vocab': look up vocabulary record for its book_source
  const vocab = await db.vocabulary.get(srsCard.cardId)
  return vocab?.book_source ?? 'minna_shokyuu_1'
}

export async function writeReviewLog(params: WriteReviewLogParams): Promise<number> {
  const { userId, srsCard, rating, result, isKnown } = params
  const bookSource = await resolveBookSource(srsCard)

  return db.review_log.add({
    userId,
    vocabId: srsCard.cardId,
    bookSource,
    cardType: srsCard.cardType,
    rating,
    scheduledDays: result.scheduled_days,
    stability: result.stability,
    difficulty: result.difficulty,
    dueDate: result.due,
    reviewCount: result.reps,
    isKnown,
    reviewedAt: new Date().toISOString(),
    pendingSync: true,
    remoteId: null,
  }) as Promise<number>
}
