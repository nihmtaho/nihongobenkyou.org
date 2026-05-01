import type { SRSRating } from '../types/srs'
import type { VocabWithSRS } from '../types/vocabulary'
import { useMutation } from '@tanstack/react-query'
import { db } from '../db/schema'
import { uploadPendingReviews } from '../db/sync'
import { calculateNextReview } from '../lib/srs'

const KNOWN_MIN_INTERVAL = 21
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
      const now = new Date().toISOString()

      await db.review_log.add({
        userId,
        vocabId: card.vocab_id,
        bookSource: card.book_source ?? 'minna_shokyuu_1',
        cardType: 'vocab',
        rating,
        intervalDays: result.new_interval,
        easeFactor: result.new_ease,
        dueDate: result.due_date,
        reviewCount: newReviewCount,
        isKnown: is_known,
        reviewedAt: now,
        pendingSync: true,
        remoteId: null,
      })

      await db.user_cards.put({
        userId,
        vocabId: card.vocab_id,
        interval_days: result.new_interval,
        ease_factor: result.new_ease,
        due_date: result.due_date,
        review_count: newReviewCount,
        last_rating: rating,
        pending_sync: false,
        updated_at: now,
        is_known,
      })

      uploadPendingReviews().catch(() => {})
    },
    retry: 0,
  })
}
