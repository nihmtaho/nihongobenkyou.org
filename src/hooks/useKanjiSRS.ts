import type { KanjiCardState } from '../types/kanji'
import type { SRSRating } from '../types/srs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getDueKanjiCards } from '../db/kanji'
import { db } from '../db/schema'
import { uploadPendingReviews } from '../db/sync'
import { calculateNextReview } from '../lib/srs'

interface KanjiReviewVars {
  card: KanjiCardState
  rating: SRSRating
}

export function useKanjiSRS(userId: string) {
  const queryClient = useQueryClient()

  const dueCards = useQuery<KanjiCardState[]>({
    queryKey: ['kanji-srs-due', userId],
    queryFn: () => {
      const today = new Date().toISOString().slice(0, 10)
      return getDueKanjiCards(userId, today)
    },
    enabled: !!userId,
    staleTime: 0,
  })

  const reviewMutation = useMutation<void, Error, KanjiReviewVars>({
    mutationFn: async ({ card, rating }) => {
      const result = calculateNextReview(
        {
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
        },
        rating,
      )

      const now = new Date().toISOString()
      const newReviewCount = card.review_count + 1

      await db.review_log.add({
        userId: card.userId,
        vocabId: card.char,
        bookSource: 'kanji',
        cardType: 'kanji',
        rating,
        intervalDays: result.new_interval,
        easeFactor: result.new_ease,
        dueDate: result.due_date,
        reviewCount: newReviewCount,
        isKnown: false,
        reviewedAt: now,
        pendingSync: true,
        remoteId: null,
      })

      await db.kanji_cards.put({
        ...card,
        interval_days: result.new_interval,
        ease_factor: result.new_ease,
        due_date: result.due_date,
        review_count: newReviewCount,
        last_rating: rating,
        pending_sync: false,
        updated_at: now,
      })

      uploadPendingReviews().catch(() => {})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanji-srs-due', userId] })
      queryClient.invalidateQueries({ queryKey: ['kanji-list', userId] })
    },
    retry: 0,
  })

  return { dueCards, reviewMutation }
}
