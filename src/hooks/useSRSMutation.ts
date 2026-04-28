import type { SRSRating } from '../types/srs'
import type { VocabWithSRS } from '../types/vocabulary'
import { useMutation } from '@tanstack/react-query'
import { db } from '../db/schema'
import { flushPendingSync } from '../db/sync'
import { calculateNextReview } from '../lib/srs'

// A card is considered "known" when it has been reviewed enough times
// and its interval is long enough to indicate durable retention.
const KNOWN_MIN_INTERVAL = 21 // days — roughly Anki's "mature" threshold
const KNOWN_MIN_REVIEWS = 5

interface SRSMutationVars {
  userId: string
  card: VocabWithSRS
  rating: SRSRating
}

export function useSRSMutation() {
  return useMutation<void, Error, SRSMutationVars>({
    mutationFn: async ({ userId, card, rating }) => {
      const result = calculateNextReview(
        {
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
        },
        rating,
      )

      const newReviewCount = (card.review_count ?? 0) + 1
      const is_known = result.new_interval >= KNOWN_MIN_INTERVAL && newReviewCount >= KNOWN_MIN_REVIEWS

      await db.user_cards.put({
        userId,
        vocabId: card.vocab_id,
        interval_days: result.new_interval,
        ease_factor: result.new_ease,
        due_date: result.due_date,
        review_count: newReviewCount,
        last_rating: rating,
        pending_sync: true,
        updated_at: new Date().toISOString(),
        is_known,
      })

      flushPendingSync().catch(() => {})
    },
    retry: 0,
  })
}
