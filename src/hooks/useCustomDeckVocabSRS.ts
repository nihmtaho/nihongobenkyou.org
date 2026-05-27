import type { SRSRating } from '../types/srs'
import type { VocabWithSRS } from '../types/vocabulary'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '../db/schema'
import { initSRSCard, upsertSRSCard } from '../db/srs-cards'
import { uploadPendingReviews } from '../db/sync'
import { scheduleFSRS } from '../lib/srs'

const KNOWN_MIN_SCHEDULED = 60
const KNOWN_MIN_REPS = 8

export function useCustomDeckVocabSRS(userId: string, deckId: string) {
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({ card, rating }: { card: VocabWithSRS, rating: SRSRating }) => {
      await initSRSCard(userId, card.vocab_id, 'custom_vocab', deckId || null)
      const existing = await db.srs_cards.get([userId, card.vocab_id])
      if (!existing)
        return

      const result = scheduleFSRS(existing, rating)
      const is_known = result.scheduled_days >= KNOWN_MIN_SCHEDULED && result.reps >= KNOWN_MIN_REPS
      const newConsecutiveCorrect = rating === 1 ? 0 : (existing.consecutive_correct ?? 0) + 1
      const now = new Date().toISOString()

      await db.review_log.add({
        userId,
        vocabId: card.vocab_id,
        bookSource: 'custom_vocab',
        cardType: 'custom_vocab',
        rating,
        scheduledDays: result.scheduled_days,
        stability: result.stability,
        difficulty: result.difficulty,
        dueDate: result.due,
        reviewCount: result.reps,
        isKnown: is_known,
        reviewedAt: now,
        pendingSync: true,
        remoteId: null,
      })

      await upsertSRSCard({
        ...existing,
        ...result,
        last_rating: rating,
        is_known,
        due_datetime: result.due_datetime,
        consecutive_correct: newConsecutiveCorrect,
        pending_sync: true,
        updated_at: now,
      })

      uploadPendingReviews().catch(() => {})
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-deck-progress', userId, deckId] })
      qc.invalidateQueries({ queryKey: ['unified-due-stats', userId] })
      qc.invalidateQueries({ queryKey: ['review-stats', userId] })
    },
    retry: 0,
  })

  return {
    rate: (card: VocabWithSRS, rating: SRSRating) => mutation.mutate({ card, rating }),
    isPending: mutation.isPending,
  }
}
