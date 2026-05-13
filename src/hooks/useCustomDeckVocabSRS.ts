import type { SRSRating } from '../types/srs'
import type { VocabWithSRS } from '../types/vocabulary'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '../db/schema'
import { initSRSCard, upsertSRSCard } from '../db/srs-cards'
import { scheduleFSRS } from '../lib/srs'

export function useCustomDeckVocabSRS(userId: string, deckId: string) {
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({ card, rating }: { card: VocabWithSRS, rating: SRSRating }) => {
      // Ensure the card exists in srs_cards before updating
      await initSRSCard(userId, card.vocab_id, 'custom_vocab', deckId || null)
      const existing = await db.srs_cards.get([userId, card.vocab_id])
      if (!existing)
        return

      const result = scheduleFSRS(existing, rating)
      const newConsecutiveCorrect = rating === 1 ? 0 : (existing.consecutive_correct ?? 0) + 1
      const now = new Date().toISOString()

      await upsertSRSCard({
        ...existing,
        ...result,
        last_rating: rating,
        consecutive_correct: newConsecutiveCorrect,
        pending_sync: true,
        updated_at: now,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-deck-progress', userId, deckId] })
      qc.invalidateQueries({ queryKey: ['unified-due-stats', userId] })
    },
    retry: 0,
  })

  return {
    rate: (card: VocabWithSRS, rating: SRSRating) => mutation.mutate({ card, rating }),
    isPending: mutation.isPending,
  }
}
