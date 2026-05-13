import type { SRSCard, SRSRating } from '../types/srs'
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
    ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0 },
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
        ? kanjiData.items.filter(item => item.card !== null && item.card.due <= today)
        : kanjiData.items
      setKanjiQueue([...source].sort(() => Math.random() - 0.5))
    }
    else {
      const source = dueOnly
        ? vocabData.vocab.filter(v => v.reps > 0 && v.due <= today && !v.is_known)
        : vocabData.vocab
      setVocabQueue([...source].sort(() => Math.random() - 0.5))
    }
    setCurrentIndex(0)
    setStats({
      correct: 0,
      total: 0,
      startTime: new Date(),
      ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0 },
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

  function buildStubCard(char: string): SRSCard {
    const today = new Date().toISOString().slice(0, 10)
    const now = new Date().toISOString()
    return {
      userId,
      cardId: char,
      cardType: 'kanji',
      deckId: null,
      state: 'new',
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      last_review: today,
      due: today,
      last_rating: null,
      is_known: false,
      consecutive_correct: 0,
      pending_sync: false,
      updated_at: now,
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
    handleKanjiRate(correct ? 3 : 1)
  }

  function handleVocabRate(rating: SRSRating) {
    const vocab = vocabQueue[currentIndex]
    if (!vocab)
      return
    vocabSRS.rate(vocab, rating)
    advance(rating >= 2, rating)
  }

  function handleVocabAnswer(correct: boolean) {
    handleVocabRate(correct ? 3 : 1)
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
