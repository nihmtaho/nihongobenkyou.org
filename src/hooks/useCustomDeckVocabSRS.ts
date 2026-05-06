import type { SRSRating } from '../types/srs'
import type { VocabWithSRS } from '../types/vocabulary'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { upsertCustomDeckSRS } from '../db/custom-deck-srs'
import { calculateNextReview } from '../lib/srs'
import { toCardState } from '../lib/srs-utils'

export function useCustomDeckVocabSRS(userId: string, deckId: string) {
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({ card, rating }: { card: VocabWithSRS, rating: SRSRating }) => {
      const state = toCardState(card, userId)
      const result = calculateNextReview(state, rating)
      const newReviewCount = (card.review_count ?? 0) + 1
      const newConsecutiveCorrect = rating === 0 ? 0 : (card.consecutive_correct ?? 0) + 1

      await upsertCustomDeckSRS({
        userId,
        itemId: card.vocab_id,
        deckId,
        interval_days: result.new_interval,
        ease_factor: result.new_ease,
        due_date: result.due_date.slice(0, 10),
        review_count: newReviewCount,
        card_stage: result.new_card_stage,
        learning_step: result.new_learning_step,
        lapse_count: result.new_lapse_count,
        last_rating: rating,
        consecutive_correct: newConsecutiveCorrect,
        pending_sync: true,
        updated_at: new Date().toISOString(),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-deck-progress', userId, deckId] })
      qc.invalidateQueries({ queryKey: ['all-custom-deck-srs-summary', userId] })
      qc.invalidateQueries({ queryKey: ['unified-due-stats', userId] })
      // TODO: trigger Supabase sync flush for custom_deck_srs when sync layer is implemented
    },
    retry: 0,
  })

  return {
    rate: (card: VocabWithSRS, rating: SRSRating) => mutation.mutate({ card, rating }),
    isPending: mutation.isPending,
  }
}
