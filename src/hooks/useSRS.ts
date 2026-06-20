import type { UseQueryResult } from '@tanstack/react-query'
import type { Grade } from 'ts-fsrs'
import type { SRSCard, SRSRating } from '../types/srs'
import type { VocabWithSRS } from '../types/vocabulary'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { db } from '../db/schema'
import { getDueCards, upsertSRSCard } from '../db/srs-cards'
import { uploadPendingReviews } from '../db/sync'
import { createFSRS, STATE_MAP, STATE_REVERSE } from '../lib/srs'
import { computeTypeInputRatingForDisplay } from '../lib/srs-utils'
import { useSettingsStore } from '../stores/settingsStore'

const KNOWN_MIN_SCHEDULED = 60
const KNOWN_MIN_REPS = 8

export interface TypeInputResult {
  rating: SRSRating
  shouldRequeue: boolean
}

type SRSSubject = 'vocab' | 'kanji'

interface VocabSRSReturn {
  dueCards: UseQueryResult<SRSCard[]>
  rate: (card: SRSCard | VocabWithSRS, rating: SRSRating) => void
  rateAsync: (card: SRSCard | VocabWithSRS, rating: SRSRating) => Promise<number>
  answer: (card: SRSCard | VocabWithSRS, isCorrect: boolean) => void
  answerTypeInput: (card: SRSCard | VocabWithSRS, isCorrect: boolean) => TypeInputResult
  isPending: boolean
}

interface KanjiSRSReturn {
  dueCards: UseQueryResult<SRSCard[]>
  rate: (card: SRSCard, rating: SRSRating) => void
  rateAsync: (card: SRSCard, rating: SRSRating) => Promise<number>
  answer: (card: SRSCard, isCorrect: boolean) => void
  answerTypeInput: (card: SRSCard, isCorrect: boolean) => TypeInputResult
  isPending: boolean
}

type SRSReturn<T extends SRSSubject> = T extends 'vocab' ? VocabSRSReturn : KanjiSRSReturn

function toSRSCard(card: SRSCard | VocabWithSRS, userId: string): SRSCard {
  if ('vocab_id' in card) {
    return {
      userId,
      cardId: card.vocab_id,
      cardType: (card as Partial<SRSCard>).cardType ?? 'vocab',
      deckId: (card as Partial<SRSCard>).deckId ?? null,
      state: card.state,
      stability: card.stability,
      difficulty: card.difficulty,
      elapsed_days: card.elapsed_days,
      scheduled_days: card.scheduled_days,
      reps: card.reps,
      lapses: card.lapses,
      last_review: card.last_review,
      due: card.due,
      last_rating: card.last_rating,
      is_known: card.is_known ?? false,
      consecutive_correct: card.consecutive_correct ?? 0,
      pending_sync: card.pending_sync,
      updated_at: card.updated_at,
    }
  }
  return card as SRSCard
}

// Export for testing.
// Emits Easy(4) after 3+ consecutive correct answers; Good(3) otherwise; Again(1) on incorrect.
export function computeAnswerRating(
  card: Pick<SRSCard, 'consecutive_correct'>,
  isCorrect: boolean,
): SRSRating {
  if (!isCorrect)
    return 1
  return (card.consecutive_correct ?? 0) >= 3 ? 4 : 3
}

export function useSRS<T extends SRSSubject>(subject: T, userId: string): SRSReturn<T> {
  const queryClient = useQueryClient()
  const cardType: SRSCard['cardType'] = subject === 'vocab' ? 'vocab' : 'kanji'
  const requestRetention = useSettingsStore(s => s.requestRetention)
  const fsrsInstance = useMemo(() => createFSRS(requestRetention), [requestRetention])

  const dueCards = useQuery({
    queryKey: subject === 'vocab' ? ['due-cards', userId] : ['kanji-srs-due', userId],
    queryFn: () => getDueCards(userId, new Date().toISOString(), cardType),
    enabled: !!userId,
    staleTime: 0,
  })

  const mutation = useMutation<number, Error, { card: SRSCard | VocabWithSRS, rating: SRSRating }>({
    mutationFn: async ({ card, rating }) => {
      if (!userId)
        return 0
      const srsCard = toSRSCard(card, userId)
      const now = new Date()
      const fsrsCard = {
        due: new Date(srsCard.due),
        stability: srsCard.stability,
        difficulty: srsCard.difficulty,
        elapsed_days: srsCard.elapsed_days,
        scheduled_days: srsCard.scheduled_days,
        learning_steps: 0,
        reps: srsCard.reps,
        lapses: srsCard.lapses,
        state: STATE_MAP[srsCard.state],
        last_review: new Date(srsCard.last_review),
      }
      const next = fsrsInstance.repeat(fsrsCard, now)[rating as Grade].card
      const result = {
        due: next.due.toISOString().slice(0, 10),
        due_datetime: next.due.toISOString(),
        state: STATE_REVERSE[next.state],
        stability: next.stability,
        difficulty: next.difficulty,
        elapsed_days: next.elapsed_days,
        scheduled_days: next.scheduled_days,
        reps: next.reps,
        lapses: next.lapses,
        last_review: now.toISOString().slice(0, 10),
      }
      const newReps = result.reps
      const is_known = result.scheduled_days >= KNOWN_MIN_SCHEDULED && newReps >= KNOWN_MIN_REPS
      const newConsecutiveCorrect = rating === 1 ? 0 : (srsCard.consecutive_correct ?? 0) + 1
      const nowIso = now.toISOString()

      const reviewLogId = await db.review_log.add({
        userId,
        vocabId: srsCard.cardId,
        bookSource: srsCard.cardType === 'kanji'
          ? 'kanji'
          : srsCard.cardType === 'custom_vocab'
            ? 'custom_vocab'
            : 'minna_shokyuu_1',
        cardType: srsCard.cardType === 'kanji'
          ? 'kanji'
          : srsCard.cardType === 'custom_vocab'
            ? 'custom_vocab'
            : 'vocab',
        rating,
        scheduledDays: result.scheduled_days,
        stability: result.stability,
        difficulty: result.difficulty,
        dueDate: result.due,
        reviewCount: newReps,
        isKnown: is_known,
        reviewedAt: nowIso,
        pendingSync: true,
        remoteId: null,
      }) as number

      await upsertSRSCard({
        ...srsCard,
        ...result,
        last_rating: rating,
        is_known,
        due_datetime: result.due_datetime,
        consecutive_correct: newConsecutiveCorrect,
        pending_sync: false,
        updated_at: nowIso,
      })

      uploadPendingReviews().catch(() => {})
      return reviewLogId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-stats', userId] })
      queryClient.invalidateQueries({ queryKey: ['due-cards', userId] })
      queryClient.invalidateQueries({ queryKey: ['unified-due-stats', userId] })
      queryClient.invalidateQueries({ queryKey: ['review-forecast', userId] })
      queryClient.invalidateQueries({ queryKey: ['next-vocab-due', userId] })
      if (subject === 'kanji') {
        queryClient.invalidateQueries({ queryKey: ['kanji-srs-due', userId] })
        queryClient.invalidateQueries({ queryKey: ['kanji-list', userId] })
        queryClient.invalidateQueries({ queryKey: ['due-kanji-unified', userId] })
      }
    },
    retry: 0,
  })

  function rate(card: SRSCard | VocabWithSRS, rating: SRSRating): void {
    if (!userId)
      return
    mutation.mutate({ card, rating })
  }

  function rateAsync(card: SRSCard | VocabWithSRS, rating: SRSRating): Promise<number> {
    if (!userId)
      return Promise.resolve(0)
    return mutation.mutateAsync({ card, rating })
  }

  function answer(card: SRSCard | VocabWithSRS, isCorrect: boolean): void {
    const srsCard = toSRSCard(card, userId)
    rate(srsCard, computeAnswerRating(srsCard, isCorrect))
  }

  function answerTypeInput(card: SRSCard | VocabWithSRS, isCorrect: boolean): TypeInputResult {
    if (!isCorrect) {
      const srsCard = toSRSCard(card, userId)
      mutation.mutate({ card: srsCard, rating: 1 })
      return { rating: 1, shouldRequeue: true }
    }
    const srsCard = toSRSCard(card, userId)
    const rating = computeTypeInputRatingForDisplay(srsCard, true)
    mutation.mutate({ card: srsCard, rating })
    return { rating, shouldRequeue: false }
  }

  return { dueCards, rate, rateAsync, answer, answerTypeInput, isPending: mutation.isPending } as unknown as SRSReturn<T>
}

export const useVocabSRS = (userId: string) => useSRS('vocab', userId)
export const useKanjiSRS = (userId: string) => useSRS('kanji', userId)
