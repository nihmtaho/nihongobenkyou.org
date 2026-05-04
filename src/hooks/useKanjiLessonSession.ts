import type { KanjiCardState } from '../types/kanji'
import type { SRSRating } from '../types/srs'
import type { VocabWithSRS } from '../types/vocabulary'
import type { KanjiQueueItem } from './useKanjiLessonData'
import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useKanjiLessonData } from './useKanjiLessonData'
import { useSRS } from './useSRS'
import { useVocabLessonData } from './useVocabLessonData'

export type KanjiLessonPhase = 'loading' | 'pre-session' | 'active' | 'complete'

export interface KanjiLessonStats {
  correct: number
  total: number
  startTime: Date
  ratingCounts: Record<SRSRating, number>
}

export interface UseKanjiLessonSessionReturn {
  phase: KanjiLessonPhase
  kanjiQueue: KanjiQueueItem[]
  vocabQueue: VocabWithSRS[]
  currentIndex: number
  stats: KanjiLessonStats
  totalItems: number
  hanVietMap: Map<string, string>
  isLoading: boolean
  handleStart: () => void
  handleKanjiRate: (rating: SRSRating) => void
  handleKanjiAnswer: (correct: boolean) => void
  handleVocabRate: (rating: SRSRating) => void
  handleVocabAnswer: (correct: boolean) => void
}

export function useKanjiLessonSession(
  lesson: number,
  type: 'kanji' | 'vocab',
  dueOnly?: boolean,
): UseKanjiLessonSessionReturn {
  const userId = useAuthStore(s => s.userId) ?? ''

  const kanjiSRS = useSRS('kanji', userId)
  const vocabSRS = useSRS('vocab', userId)

  const kanjiData = useKanjiLessonData(userId, lesson)
  const vocabData = useVocabLessonData(userId, lesson)

  const isLoading = type === 'kanji' ? kanjiData.isLoading : vocabData.isLoading

  const [phase, setPhase] = useState<KanjiLessonPhase>('loading')
  const [kanjiQueue, setKanjiQueue] = useState<KanjiQueueItem[]>([])
  const [vocabQueue, setVocabQueue] = useState<VocabWithSRS[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [stats, setStats] = useState<KanjiLessonStats>(() => ({
    correct: 0,
    total: 0,
    startTime: new Date(),
    ratingCounts: { 0: 0, 1: 0, 2: 0, 3: 0 },
  }))

  useEffect(() => {
    if (phase !== 'loading')
      return
    if (!isLoading) {
      // eslint-disable-next-line react/set-state-in-effect
      setPhase('pre-session')
    }
  }, [phase, isLoading])

  const totalItems = type === 'kanji' ? kanjiData.items.length : vocabData.vocab.length

  function handleStart() {
    const today = new Date().toISOString().slice(0, 10)
    if (type === 'kanji') {
      const source = dueOnly
        ? kanjiData.items.filter(item => item.card !== null && item.card.due_date <= today)
        : kanjiData.items
      setKanjiQueue([...source].sort(() => Math.random() - 0.5))
    }
    else {
      const source = dueOnly
        ? vocabData.vocab.filter(v => v.review_count > 0 && v.due_date <= today && !v.is_known)
        : vocabData.vocab
      setVocabQueue([...source].sort(() => Math.random() - 0.5))
    }
    setCurrentIndex(0)
    setStats({
      correct: 0,
      total: 0,
      startTime: new Date(),
      ratingCounts: { 0: 0, 1: 0, 2: 0, 3: 0 },
    })
    setPhase('active')
  }

  function advance(isCorrect: boolean, rating: SRSRating) {
    setStats(s => ({
      ...s,
      correct: isCorrect ? s.correct + 1 : s.correct,
      total: s.total + 1,
      ratingCounts: { ...s.ratingCounts, [rating]: s.ratingCounts[rating] + 1 },
    }))
    const queueLength = type === 'kanji' ? kanjiQueue.length : vocabQueue.length
    if (currentIndex + 1 >= queueLength) {
      setPhase('complete')
    }
    else {
      setCurrentIndex(i => i + 1)
    }
  }

  function buildStubCard(char: string): KanjiCardState {
    const now = new Date()
    return {
      userId,
      char,
      interval_days: 0,
      ease_factor: 2.5,
      due_date: now.toISOString().slice(0, 10),
      review_count: 0,
      last_rating: null,
      pending_sync: false,
      updated_at: now.toISOString(),
      consecutive_correct: 0,
    }
  }

  function handleKanjiRate(rating: SRSRating) {
    const item = kanjiQueue[currentIndex]
    if (!item)
      return
    kanjiSRS.rate(item.card ?? buildStubCard(item.kanji.char), rating)
    advance(rating >= 2, rating)
  }

  function handleKanjiAnswer(correct: boolean) {
    handleKanjiRate(correct ? 2 : 0)
  }

  function handleVocabRate(rating: SRSRating) {
    const vocab = vocabQueue[currentIndex]
    if (!vocab)
      return
    vocabSRS.rate(vocab, rating)
    advance(rating >= 2, rating)
  }

  function handleVocabAnswer(correct: boolean) {
    handleVocabRate(correct ? 2 : 0)
  }

  return {
    phase,
    kanjiQueue,
    vocabQueue,
    currentIndex,
    stats,
    totalItems,
    hanVietMap: vocabData.hanVietMap,
    isLoading,
    handleStart,
    handleKanjiRate,
    handleKanjiAnswer,
    handleVocabRate,
    handleVocabAnswer,
  }
}
