import type { KanjiCardState } from '../types/kanji'
import type { CardState, SRSRating } from '../types/srs'
import type { VocabWithSRS } from '../types/vocabulary'

type AnyCard = VocabWithSRS | KanjiCardState

export function toCardState(card: AnyCard, userId: string): CardState {
  if ('vocab_id' in card) {
    return {
      userId,
      vocabId: card.vocab_id,
      interval_days: card.interval_days,
      ease_factor: card.ease_factor,
      due_date: card.due_date,
      review_count: card.review_count,
      last_rating: card.last_rating,
      pending_sync: card.pending_sync,
      updated_at: card.updated_at,
      is_known: card.is_known ?? false,
      // VocabWithSRS doesn't carry consecutive_correct yet — default to 0 for migration safety
      consecutive_correct: (card as VocabWithSRS & { consecutive_correct?: number }).consecutive_correct ?? 0,
    }
  }
  return {
    userId: card.userId,
    vocabId: card.char,
    interval_days: card.interval_days,
    ease_factor: card.ease_factor,
    due_date: card.due_date,
    review_count: card.review_count,
    last_rating: card.last_rating,
    pending_sync: card.pending_sync,
    updated_at: card.updated_at,
    is_known: false,
    consecutive_correct: card.consecutive_correct ?? 0,
  }
}

export function computeTypeInputRatingForDisplay(card: CardState, isCorrect: boolean): SRSRating {
  if (!isCorrect)
    return 0
  const consecutive = card.consecutive_correct ?? 0
  // Easy: 5th consecutive correct (consecutive_correct === 4 before this review)
  if (consecutive >= 4 && card.review_count >= 2)
    return 3
  // Hard: first or second review session
  if (card.review_count <= 1)
    return 1
  // Good: all other correct answers
  return 2
}

// Re-export formatIntervalPreview so callers only need one import
export { formatIntervalPreview } from './srs'
