import type { SRSRating } from '../types/srs'
import type { MeaningLanguage, TypeInputSubMode } from '../types/study'
import type { VocabWithSRS } from '../types/vocabulary'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { db } from '../db/schema'
import { useAuthStore } from '../stores/authStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useSRS } from './useSRS'
import { useStreak } from './useStreak'

export type SrsState = 'loading' | 'empty' | 'pre-session' | 'active' | 'complete'

export interface SrsStats {
  correct: number
  total: number
  startTime: Date
  ratingCounts: Record<SRSRating, number>
}

export interface UseSrsSessionReturn {
  phase: SrsState
  queue: VocabWithSRS[]
  currentIndex: number
  stats: SrsStats
  elapsed: number
  srsMode: 'flashcard' | 'type-input'
  setSrsMode: (m: 'flashcard' | 'type-input') => void
  typeInputSubMode: TypeInputSubMode
  setTypeInputSubMode: (m: TypeInputSubMode) => void
  startSession: () => void
  handleRate: (rating: SRSRating) => void
  handleAnswer: (isCorrect: boolean) => void
  startError: string | null
  vocabLoadFailed: boolean
  dueCards: VocabWithSRS[] | undefined
  futureCards: { due_date: string }[] | undefined
  totalCardCount: number | undefined
  vocabItems: { vocab_id: string }[] | undefined
  isVocabReady: boolean
  streak: number | undefined
  meaningLanguage: MeaningLanguage
}

const MAX_AGAIN_REQUEUES = 3

function makeInitialStats(): SrsStats {
  return { correct: 0, total: 0, startTime: new Date(), ratingCounts: { 0: 0, 1: 0, 2: 0, 3: 0 } }
}

export function useSrsSession(): UseSrsSessionReturn {
  const userId = useAuthStore(s => s.userId)
  const meaningLanguage = useSettingsStore(s => s.meaningLanguage)
  const srs = useSRS('vocab', userId ?? '')
  const { data: dueCards, isLoading } = srs.dueCards
  const { data: streak } = useStreak(userId ?? '')

  const [phase, setPhase] = useState<SrsState>('loading')
  const [startError, setStartError] = useState<string | null>(null)
  const [srsMode, setSrsMode] = useState<'flashcard' | 'type-input'>('flashcard')
  const [typeInputSubMode, setTypeInputSubMode] = useState<TypeInputSubMode>('word→hira')
  const [queue, setQueue] = useState<VocabWithSRS[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [stats, setStats] = useState<SrsStats>(makeInitialStats)
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionWrittenRef = useRef(false)
  const againCountRef = useRef<Map<string, number>>(new Map())
  const [vocabLoadFailed, setVocabLoadFailed] = useState(false)
  const vocabItemsRef = useRef<{ vocab_id: string }[] | undefined>(undefined)

  const { data: futureCards } = useQuery({
    queryKey: ['future-due-cards', userId],
    queryFn: async () =>
      db.user_cards
        .where('due_date')
        .above(new Date().toISOString().slice(0, 10))
        .filter(c => c.userId === userId && !c.is_known)
        .toArray(),
    enabled: !!userId && phase === 'empty',
    staleTime: 0,
  })

  const { data: totalCardCount } = useQuery({
    queryKey: ['total-user-cards', userId],
    queryFn: () => db.user_cards.where('userId').equals(userId ?? '').count(),
    enabled: !!userId && phase === 'empty',
    staleTime: 0,
  })

  const vocabIds = (dueCards ?? []).map(c => c.vocabId)
  const { data: vocabItems } = useQuery({
    queryKey: ['srs-vocab-prefetch', vocabIds],
    queryFn: () => db.vocabulary.where('vocab_id').anyOf(vocabIds).toArray(),
    enabled: phase === 'pre-session' && vocabIds.length > 0 && !vocabLoadFailed,
    staleTime: 0,
    refetchInterval: query =>
      !vocabLoadFailed && (!query.state.data || query.state.data.length === 0) ? 2000 : false,
  })
  vocabItemsRef.current = vocabItems

  const vocabIdsKey = vocabIds.join(',')

  useEffect(() => {
    if (phase !== 'pre-session' || vocabIds.length === 0) {
      // eslint-disable-next-line react/set-state-in-effect
      setVocabLoadFailed(false)
      return
    }
    const timer = setTimeout(() => {
      if (!vocabItemsRef.current || vocabItemsRef.current.length === 0)
        setVocabLoadFailed(true)
    }, 8000)
    return () => clearTimeout(timer)
  }, [phase, vocabIdsKey, vocabIds.length])

  useEffect(() => {
    if (isLoading)
      return
    if (!dueCards || dueCards.length === 0) {
      // eslint-disable-next-line react/set-state-in-effect
      setPhase('empty')
    }
    else if (phase === 'loading') {
      // eslint-disable-next-line react/set-state-in-effect
      setPhase('pre-session')
    }
  }, [isLoading, dueCards, phase])

  useEffect(() => {
    if (phase === 'active') {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    }
    return () => {
      if (intervalRef.current)
        clearInterval(intervalRef.current)
    }
  }, [phase])

  useEffect(() => {
    if (phase !== 'complete' || sessionWrittenRef.current || !userId)
      return
    sessionWrittenRef.current = true

    const today = new Date().toISOString().slice(0, 10)
    const correct = stats.correct
    const total = stats.total

    async function writeRecords() {
      await db.sessions.add({
        user_id: userId!,
        mode: srsMode,
        lesson_ids: [],
        cards_reviewed: total,
        correct_count: correct,
        duration_sec: elapsed,
        studied_at: new Date(),
      })

      const existing = await db.streaks.get(today)
      if (existing) {
        await db.streaks.put({
          ...existing,
          cards_reviewed: existing.cards_reviewed + total,
        })
      }
      else {
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
        const prev = await db.streaks.where('date').equals(yesterday).first()
        await db.streaks.put({
          date: today,
          userId: userId!,
          cards_reviewed: total,
          current_streak: (prev?.current_streak ?? 0) + 1,
          max_streak: Math.max((prev?.max_streak ?? 0), (prev?.current_streak ?? 0) + 1),
        })
      }
    }

    writeRecords().catch(console.error)
  }, [phase, userId, stats, elapsed, srsMode])

  function startSession() {
    if (!dueCards || dueCards.length === 0 || !vocabItems || vocabItems.length === 0)
      return

    const cardMap = new Map(dueCards.map(c => [c.vocabId, c]))
    const merged: VocabWithSRS[] = vocabItems
      .filter(v => cardMap.has(v.vocab_id))
      .map(v => ({
        ...v,
        ...cardMap.get(v.vocab_id)!,
        is_known: cardMap.get(v.vocab_id)?.is_known ?? false,
      }))

    if (merged.length === 0) {
      setStartError('Không tìm thấy dữ liệu thẻ. Vui lòng thử lại.')
      return
    }

    setStartError(null)
    setQueue(merged)
    setCurrentIndex(0)
    setStats(makeInitialStats())
    setElapsed(0)
    sessionWrittenRef.current = false
    againCountRef.current = new Map()
    srs.resetTypeInputTracking()
    setPhase('active')
  }

  function handleRate(rating: SRSRating) {
    if (!userId)
      return
    const card = queue[currentIndex]
    if (!card)
      return

    const isCorrect = rating >= 2
    setStats(s => ({
      ...s,
      correct: isCorrect ? s.correct + 1 : s.correct,
      total: s.total + 1,
      ratingCounts: { ...s.ratingCounts, [rating]: s.ratingCounts[rating] + 1 },
    }))

    if (rating === 0) {
      const count = againCountRef.current.get(card.vocab_id) ?? 0
      if (count < MAX_AGAIN_REQUEUES) {
        // Re-queue at end of session without changing Dexie until final rating
        againCountRef.current.set(card.vocab_id, count + 1)
        setQueue(q => [...q, card])
        setCurrentIndex(i => i + 1)
        return
      }
      // 4th Again: write to Dexie as due tomorrow and remove from session
    }

    srs.rate(card, rating)

    const next = currentIndex + 1
    if (next >= queue.length) {
      setPhase('complete')
    }
    else {
      setCurrentIndex(next)
    }
  }

  function handleAnswer(isCorrect: boolean) {
    const card = queue[currentIndex]
    if (!card)
      return

    const { rating, shouldRequeue } = srs.answerTypeInput(card, isCorrect)

    setStats(s => ({
      ...s,
      correct: rating >= 2 ? s.correct + 1 : s.correct,
      total: s.total + 1,
      ratingCounts: { ...s.ratingCounts, [rating]: s.ratingCounts[rating] + 1 },
    }))

    if (shouldRequeue) {
      setQueue(q => [...q, card])
      setCurrentIndex(i => i + 1)
    }
    else {
      const next = currentIndex + 1
      if (next >= queue.length)
        setPhase('complete')
      else
        setCurrentIndex(next)
    }
  }

  return {
    phase,
    queue,
    currentIndex,
    stats,
    elapsed,
    srsMode,
    setSrsMode,
    typeInputSubMode,
    setTypeInputSubMode,
    startSession,
    handleRate,
    handleAnswer,
    startError,
    vocabLoadFailed,
    isVocabReady: !!(vocabItems && vocabItems.length > 0) || vocabLoadFailed,
    dueCards: dueCards as VocabWithSRS[] | undefined,
    futureCards: futureCards as { due_date: string }[] | undefined,
    totalCardCount,
    vocabItems,
    streak: streak?.current_streak,
    meaningLanguage,
  }
}
