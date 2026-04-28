import type { KanjiCardState } from '../types/kanji'
import type { SRSRating } from '../types/srs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { flushKanjiCards } from '../api/kanji-cards'
import { getDueKanjiCards, updateKanjiCard } from '../db/kanji'
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
      // calculateNextReview expects CardState shape — adapt char→vocabId for the pure function
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

      const updated: KanjiCardState = {
        ...card,
        interval_days: result.new_interval,
        ease_factor: result.new_ease,
        due_date: result.due_date,
        review_count: card.review_count + 1,
        last_rating: rating,
        pending_sync: true,
        updated_at: new Date().toISOString(),
      }

      await updateKanjiCard(updated)
      flushKanjiCards(userId).catch(() => {})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanji-srs-due', userId] })
      queryClient.invalidateQueries({ queryKey: ['kanji-list', userId] })
    },
    retry: 0,
  })

  return { dueCards, reviewMutation }
}
