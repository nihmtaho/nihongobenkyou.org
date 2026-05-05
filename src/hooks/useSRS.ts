import type { UseQueryResult } from '@tanstack/react-query'
import type { KanjiCardState } from '../types/kanji'
import type { CardState, SRSRating } from '../types/srs'
import type { VocabWithSRS } from '../types/vocabulary'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getDueKanjiCards, updateKanjiCard } from '../db/kanji'
import { db } from '../db/schema'
import { uploadPendingReviews } from '../db/sync'
import { calculateNextReview } from '../lib/srs'
import { computeTypeInputRatingForDisplay, toCardState } from '../lib/srs-utils'

const KNOWN_MIN_INTERVAL = 21
const KNOWN_MIN_REVIEWS = 5

export interface TypeInputResult {
  rating: SRSRating
  // True when the user answered incorrectly (rating === 0 / Again).
  // Caller should requeue the card without writing to Dexie.
  shouldRequeue: boolean
}

type SRSSubject = 'vocab' | 'kanji'
type AnyCard = VocabWithSRS | KanjiCardState

interface VocabSRSReturn {
  dueCards: UseQueryResult<CardState[]>
  rate: (card: VocabWithSRS, rating: SRSRating) => void
  answer: (card: VocabWithSRS, isCorrect: boolean) => void
  answerTypeInput: (card: VocabWithSRS, isCorrect: boolean) => TypeInputResult
  isPending: boolean
}

interface KanjiSRSReturn {
  dueCards: UseQueryResult<KanjiCardState[]>
  rate: (card: KanjiCardState, rating: SRSRating) => void
  answer: (card: KanjiCardState, isCorrect: boolean) => void
  answerTypeInput: (card: KanjiCardState, isCorrect: boolean) => TypeInputResult
  isPending: boolean
}

type SRSReturn<T extends SRSSubject> = T extends 'vocab' ? VocabSRSReturn : KanjiSRSReturn

export function useSRS<T extends SRSSubject>(subject: T, userId: string): SRSReturn<T> {
  const queryClient = useQueryClient()

  const dueCards = useQuery({
    queryKey: subject === 'vocab' ? ['due-cards', userId] : ['kanji-srs-due', userId],
    queryFn: async () => {
      const now = new Date().toISOString()
      if (subject === 'vocab') {
        return db.user_cards
          .where('due_date')
          .belowOrEqual(now)
          .filter(c => c.userId === userId && !c.is_known)
          .toArray()
      }
      return getDueKanjiCards(userId, now)
    },
    enabled: !!userId,
    staleTime: 0,
  })

  const mutation = useMutation<void, Error, { card: AnyCard, rating: SRSRating }>({
    mutationFn: async ({ card, rating }) => {
      if (!userId)
        return
      const cardState = toCardState(card, userId)
      const result = calculateNextReview(cardState, rating)
      const newReviewCount = cardState.review_count + 1
      const is_known = result.new_interval >= KNOWN_MIN_INTERVAL && newReviewCount >= KNOWN_MIN_REVIEWS
      const newConsecutiveCorrect = rating === 0
        ? 0
        : (cardState.consecutive_correct ?? 0) + 1

      const now = new Date().toISOString()

      if ('vocab_id' in card) {
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
          consecutive_correct: newConsecutiveCorrect,
          card_stage: result.new_card_stage,
          learning_step: result.new_learning_step,
          lapse_count: result.new_lapse_count,
        })
        uploadPendingReviews().catch(() => {})
      }
      else {
        await db.review_log.add({
          userId,
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
        await updateKanjiCard({
          ...card,
          interval_days: result.new_interval,
          ease_factor: result.new_ease,
          due_date: result.due_date,
          review_count: newReviewCount,
          last_rating: rating,
          pending_sync: false,
          updated_at: now,
          consecutive_correct: newConsecutiveCorrect,
          card_stage: result.new_card_stage,
          learning_step: result.new_learning_step,
          lapse_count: result.new_lapse_count,
        })
        uploadPendingReviews().catch(() => {})
      }
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

  function rate(card: AnyCard, rating: SRSRating): void {
    if (!userId)
      return
    mutation.mutate({ card, rating })
  }

  function answer(card: AnyCard, isCorrect: boolean): void {
    rate(card, isCorrect ? 2 : 0)
  }

  function answerTypeInput(card: AnyCard, isCorrect: boolean): TypeInputResult {
    if (!isCorrect) {
      // Write SRS (rating 0 → 6-10min delay) immediately — no re-queue.
      mutation.mutate({ card, rating: 0 })
      return { rating: 0, shouldRequeue: true }
    }
    const cardState = toCardState(card, userId)
    const rating = computeTypeInputRatingForDisplay(cardState, true)
    return { rating, shouldRequeue: false }
  }

  return {
    dueCards,
    rate,
    answer,
    answerTypeInput,
    isPending: mutation.isPending,
  } as unknown as SRSReturn<T>
}
