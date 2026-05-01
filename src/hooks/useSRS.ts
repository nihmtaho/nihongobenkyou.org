import type { UseQueryResult } from '@tanstack/react-query'
import type { KanjiCardState } from '../types/kanji'
import type { CardState, SRSRating } from '../types/srs'
import type { VocabWithSRS } from '../types/vocabulary'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { getDueKanjiCards, updateKanjiCard } from '../db/kanji'
import { db } from '../db/schema'
import { uploadPendingReviews } from '../db/sync'
import { calculateNextReview } from '../lib/srs'

const KNOWN_MIN_INTERVAL = 21
const KNOWN_MIN_REVIEWS = 5

export interface TypeInputResult {
  rating: SRSRating
  // True when rating is Hard (1) — caller should requeue the card for one retry
  shouldRequeue: boolean
}

type SRSSubject = 'vocab' | 'kanji'
type AnyCard = VocabWithSRS | KanjiCardState

interface VocabSRSReturn {
  dueCards: UseQueryResult<CardState[]>
  rate: (card: VocabWithSRS, rating: SRSRating) => void
  answer: (card: VocabWithSRS, isCorrect: boolean) => void
  answerTypeInput: (card: VocabWithSRS, isCorrect: boolean) => TypeInputResult
  resetTypeInputTracking: () => void
  isPending: boolean
}

interface KanjiSRSReturn {
  dueCards: UseQueryResult<KanjiCardState[]>
  rate: (card: KanjiCardState, rating: SRSRating) => void
  answer: (card: KanjiCardState, isCorrect: boolean) => void
  answerTypeInput: (card: KanjiCardState, isCorrect: boolean) => TypeInputResult
  resetTypeInputTracking: () => void
  isPending: boolean
}

type SRSReturn<T extends SRSSubject> = T extends 'vocab' ? VocabSRSReturn : KanjiSRSReturn

function getCardId(card: AnyCard): string {
  return 'vocab_id' in card ? card.vocab_id : card.char
}

function toCardState(card: AnyCard, userId: string): CardState {
  if ('vocab_id' in card) {
    return {
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
    }
  }
  return {
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
  }
}

export function useSRS<T extends SRSSubject>(subject: T, userId: string): SRSReturn<T> {
  const queryClient = useQueryClient()
  const wrongOnceRef = useRef<Set<string>>(new Set())

  const dueCards = useQuery({
    queryKey: subject === 'vocab' ? ['due-cards', userId] : ['kanji-srs-due', userId],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10)
      if (subject === 'vocab') {
        return db.user_cards
          .where('due_date')
          .belowOrEqual(today)
          .filter(c => c.userId === userId && !c.is_known)
          .toArray()
      }
      return getDueKanjiCards(userId, today)
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
        })
        uploadPendingReviews().catch(() => {})
      }
    },
    onSuccess: () => {
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
    const id = getCardId(card)
    const wasWrong = wrongOnceRef.current.has(id)

    if (isCorrect) {
      const rating: SRSRating = wasWrong ? 3 : 2
      rate(card, rating)
      return { rating, shouldRequeue: false }
    }
    if (!wasWrong) {
      wrongOnceRef.current.add(id)
      rate(card, 1)
      return { rating: 1, shouldRequeue: true }
    }
    rate(card, 0)
    return { rating: 0, shouldRequeue: false }
  }

  function resetTypeInputTracking(): void {
    wrongOnceRef.current = new Set()
  }

  return {
    dueCards,
    rate,
    answer,
    answerTypeInput,
    resetTypeInputTracking,
    isPending: mutation.isPending,
  } as unknown as SRSReturn<T>
}
