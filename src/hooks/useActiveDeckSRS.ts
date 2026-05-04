import type { KanjiCardState } from '../types/kanji'
import type { SRSRating } from '../types/srs'
import type { VocabWithSRS } from '../types/vocabulary'
import type { TypeInputResult } from './useSRS'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { upsertActiveKanjiSRS, upsertActiveVocabSRS } from '../db/active-deck'
import { calculateNextReview } from '../lib/srs'

// Used in $mode.tsx when deckSource === 'active-vocab-deck'
export function useActiveDeckVocabSRS(userId: string) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: async ({ card, rating }: { card: VocabWithSRS, rating: SRSRating }) => {
      const result = calculateNextReview(
        {
          userId,
          vocabId: card.vocab_id,
          interval_days: card.interval_days,
          ease_factor: card.ease_factor,
          due_date: card.due_date,
          review_count: card.review_count,
          last_rating: card.last_rating,
          // active-deck SRS is local-only; pending_sync and is_known are not stored
          pending_sync: false,
          is_known: false,
          updated_at: card.updated_at,
          consecutive_correct: 0,
        },
        rating,
      )
      await upsertActiveVocabSRS({
        userId,
        vocabId: card.vocab_id,
        interval_days: result.new_interval,
        ease_factor: result.new_ease,
        due_date: result.due_date,
        review_count: card.review_count + 1,
        last_rating: rating,
        updated_at: new Date().toISOString(),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['active-deck-due', userId] })
    },
    retry: 0,
  })

  return {
    rate: (card: VocabWithSRS, rating: SRSRating) => mutation.mutate({ card, rating }),
    answer: (card: VocabWithSRS, isCorrect: boolean) =>
      mutation.mutate({ card, rating: isCorrect ? 2 : 0 }),
    answerTypeInput: (card: VocabWithSRS, isCorrect: boolean): TypeInputResult => {
      // NOTE: Active deck type-input is intentionally simplified — no wrong-once requeue.
      // shouldRequeue is always false; callers that act on shouldRequeue will not requeue cards.
      const rating: SRSRating = isCorrect ? 2 : 0
      mutation.mutate({ card, rating })
      return { rating, shouldRequeue: false }
    },
    resetTypeInputTracking: () => {},
    isPending: mutation.isPending,
  }
}

// Used in kanji/review.tsx when deckSource === 'active-kanji-deck'
export function useActiveDeckKanjiSRS(userId: string) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: async ({ card, rating }: { card: KanjiCardState, rating: SRSRating }) => {
      const result = calculateNextReview(
        {
          userId: card.userId,
          vocabId: card.char,
          interval_days: card.interval_days,
          ease_factor: card.ease_factor,
          due_date: card.due_date,
          review_count: card.review_count,
          last_rating: card.last_rating,
          // active-deck SRS is local-only; pending_sync and is_known are not stored
          pending_sync: false,
          is_known: false,
          updated_at: card.updated_at,
          consecutive_correct: 0,
        },
        rating,
      )
      await upsertActiveKanjiSRS({
        userId,
        char: card.char,
        interval_days: result.new_interval,
        ease_factor: result.new_ease,
        due_date: result.due_date,
        review_count: card.review_count + 1,
        last_rating: rating,
        updated_at: new Date().toISOString(),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['active-kanji-due', userId] })
      qc.invalidateQueries({ queryKey: ['active-deck-due', userId] })
    },
    retry: 0,
  })

  return {
    rate: (card: KanjiCardState, rating: SRSRating) => mutation.mutate({ card, rating }),
    answer: (card: KanjiCardState, isCorrect: boolean) =>
      mutation.mutate({ card, rating: isCorrect ? 2 : 0 }),
    answerTypeInput: (card: KanjiCardState, isCorrect: boolean): TypeInputResult => {
      // NOTE: Active deck type-input is intentionally simplified — no wrong-once requeue.
      // shouldRequeue is always false; callers that act on shouldRequeue will not requeue cards.
      const rating: SRSRating = isCorrect ? 2 : 0
      mutation.mutate({ card, rating })
      return { rating, shouldRequeue: false }
    },
    resetTypeInputTracking: () => {},
    isPending: mutation.isPending,
  }
}
