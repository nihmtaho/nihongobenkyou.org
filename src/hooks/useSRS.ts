import type { UseQueryResult } from '@tanstack/react-query'
import type { SRSCard, SRSRating } from '../types/srs'
import type { VocabWithSRS } from '../types/vocabulary'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getDueCards, upsertSRSCard } from '../db/srs-cards'
import { db } from '../db/schema'
import { uploadPendingReviews } from '../db/sync'
import { scheduleFSRS } from '../lib/srs'
import { computeTypeInputRatingForDisplay } from '../lib/srs-utils'

const KNOWN_MIN_SCHEDULED = 21
const KNOWN_MIN_REPS = 5

export interface TypeInputResult {
  rating: SRSRating
  shouldRequeue: boolean
}

type SRSSubject = 'vocab' | 'kanji'

interface VocabSRSReturn {
  dueCards: UseQueryResult<SRSCard[]>
  rate: (card: SRSCard | VocabWithSRS, rating: SRSRating) => void
  answer: (card: SRSCard | VocabWithSRS, isCorrect: boolean) => void
  answerTypeInput: (card: SRSCard | VocabWithSRS, isCorrect: boolean) => TypeInputResult
  isPending: boolean
}

interface KanjiSRSReturn {
  dueCards: UseQueryResult<SRSCard[]>
  rate: (card: SRSCard, rating: SRSRating) => void
  answer: (card: SRSCard, isCorrect: boolean) => void
  answerTypeInput: (card: SRSCard, isCorrect: boolean) => TypeInputResult
  isPending: boolean
}

type SRSReturn<T extends SRSSubject> = T extends 'vocab' ? VocabSRSReturn : KanjiSRSReturn

function toSRSCard(card: SRSCard | VocabWithSRS, userId: string): SRSCard {
  if ('vocab_id' in card) {
    return {
      userId,
      cardId:              card.vocab_id,
      cardType:            'vocab',
      deckId:              null,
      state:               card.state,
      stability:           card.stability,
      difficulty:          card.difficulty,
      elapsed_days:        card.elapsed_days,
      scheduled_days:      card.scheduled_days,
      reps:                card.reps,
      lapses:              card.lapses,
      last_review:         card.last_review,
      due:                 card.due,
      last_rating:         card.last_rating,
      is_known:            card.is_known ?? false,
      consecutive_correct: card.consecutive_correct ?? 0,
      pending_sync:        card.pending_sync,
      updated_at:          card.updated_at,
    }
  }
  return card as SRSCard
}

export function useSRS<T extends SRSSubject>(subject: T, userId: string): SRSReturn<T> {
  const queryClient = useQueryClient()
  const cardType: SRSCard['cardType'] = subject === 'vocab' ? 'vocab' : 'kanji'

  const dueCards = useQuery({
    queryKey: subject === 'vocab' ? ['due-cards', userId] : ['kanji-srs-due', userId],
    queryFn: () => getDueCards(userId, new Date().toISOString(), cardType),
    enabled: !!userId,
    staleTime: 0,
  })

  const mutation = useMutation<void, Error, { card: SRSCard | VocabWithSRS, rating: SRSRating }>({
    mutationFn: async ({ card, rating }) => {
      if (!userId) return
      const srsCard = toSRSCard(card, userId)
      const result = scheduleFSRS(srsCard, rating)
      const newReps = result.reps
      const is_known = result.scheduled_days >= KNOWN_MIN_SCHEDULED && newReps >= KNOWN_MIN_REPS
      const newConsecutiveCorrect = rating === 1 ? 0 : (srsCard.consecutive_correct ?? 0) + 1
      const now = new Date().toISOString()

      await db.review_log.add({
        userId,
        vocabId:       srsCard.cardId,
        bookSource:    srsCard.cardType === 'kanji' ? 'kanji' : 'minna_shokyuu_1',
        cardType:      srsCard.cardType === 'kanji' ? 'kanji' : 'vocab',
        rating,
        scheduledDays: result.scheduled_days,
        stability:     result.stability,
        difficulty:    result.difficulty,
        dueDate:       result.due,
        reviewCount:   newReps,
        isKnown:       is_known,
        reviewedAt:    now,
        pendingSync:   true,
        remoteId:      null,
      })

      await upsertSRSCard({
        ...srsCard,
        ...result,
        last_rating:         rating,
        is_known,
        consecutive_correct: newConsecutiveCorrect,
        pending_sync:        false,
        updated_at:          now,
      })

      uploadPendingReviews().catch(() => {})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-stats', userId] })
      if (subject === 'kanji') {
        queryClient.invalidateQueries({ queryKey: ['kanji-srs-due', userId] })
        queryClient.invalidateQueries({ queryKey: ['kanji-list', userId] })
      }
    },
    retry: 0,
  })

  function rate(card: SRSCard | VocabWithSRS, rating: SRSRating): void {
    if (!userId) return
    mutation.mutate({ card, rating })
  }

  function answer(card: SRSCard | VocabWithSRS, isCorrect: boolean): void {
    rate(card, isCorrect ? 3 : 1)  // Good=3, Again=1
  }

  function answerTypeInput(card: SRSCard | VocabWithSRS, isCorrect: boolean): TypeInputResult {
    if (!isCorrect) {
      const srsCard = toSRSCard(card, userId)
      mutation.mutate({ card: srsCard, rating: 1 })
      return { rating: 1, shouldRequeue: true }
    }
    const srsCard = toSRSCard(card, userId)
    const rating = computeTypeInputRatingForDisplay(srsCard, true)
    return { rating, shouldRequeue: false }
  }

  return { dueCards, rate, answer, answerTypeInput, isPending: mutation.isPending } as unknown as SRSReturn<T>
}

