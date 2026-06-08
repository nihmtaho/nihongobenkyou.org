import type { SRSRating } from '../types/srs'
import type { MeaningLanguage, StudyMode, TypeInputSubMode } from '../types/study'
import type { CardTypeFilter, UnifiedCard } from '../types/unified-card'
import type { VocabWithSRS } from '../types/vocabulary'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { db } from '../db/schema'
import { getDueCards } from '../db/srs-cards'
import { fisherYates } from '../lib/utils'
import { useSettingsStore } from '../stores/settingsStore'
import { useCustomDeckVocabSRS } from './useCustomDeckVocabSRS'
import { useSRS } from './useSRS'

export type UnifiedSessionPhase = 'loading' | 'pre-session' | 'active' | 'complete'

export interface UnifiedSessionStats {
  correct: number
  total: number
  startTime: Date
  ratingCounts: Record<SRSRating, number>
  wrongCards: UnifiedCard[]
}

export interface UnifiedSrsSessionOptions {
  prebuiltQueue?: UnifiedCard[]
  initialMode?: StudyMode
  initialSubMode?: TypeInputSubMode
  customDeckId?: string // when set, vocab ratings go to custom deck SRS
}

function makeStats(): UnifiedSessionStats {
  return { correct: 0, total: 0, startTime: new Date(), ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0 }, wrongCards: [] }
}

function buildRvIdSet(
  allKanji: { lesson_number: number | null, related_vocab: { word: string | null, kana: string }[] | null }[],
): Set<string> {
  const ids = new Set<string>()
  for (const k of allKanji) {
    if (k.lesson_number == null)
      continue
    for (const rv of k.related_vocab ?? []) {
      ids.add(`rv_${k.lesson_number}_${rv.word ?? rv.kana}_${rv.kana}`)
    }
  }
  return ids
}

export function useUnifiedSrsSession(
  userId: string,
  filter: CardTypeFilter,
  options?: UnifiedSrsSessionOptions,
) {
  const prebuilt = options?.prebuiltQueue
  const hasPrebuilt = prebuilt != null && prebuilt.length > 0

  const meaningLanguage = useSettingsStore(s => s.meaningLanguage) as MeaningLanguage
  const newCardsPerDay = useSettingsStore(s => s.newCardsPerDay)
  const vocabSRS = useSRS('vocab', userId)
  const kanjiSRS = useSRS('kanji', userId)
  const customDeckId = options?.customDeckId ?? ''
  const customDeckSRS = useCustomDeckVocabSRS(userId, customDeckId)

  // When a prebuilt queue is provided, start directly at pre-session — no DB load needed.
  const [phase, setPhase] = useState<UnifiedSessionPhase>(hasPrebuilt ? 'pre-session' : 'loading')
  const [queue, setQueue] = useState<UnifiedCard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [stats, setStats] = useState<UnifiedSessionStats>(makeStats)
  const [mode, setMode] = useState<StudyMode>(options?.initialMode ?? 'flashcard')
  const [typeInputSubMode, setTypeInputSubMode] = useState<TypeInputSubMode>(options?.initialSubMode ?? 'word→hira')

  const { data: dueVocab, isLoading: vocabLoading } = useQuery({
    queryKey: ['due-vocab-unified', userId],
    queryFn: async () => {
      const nowISO = new Date().toISOString()
      const allKanji = await db.kanji.toArray()
      const rvIdSet = buildRvIdSet(allKanji)

      // getDueCards applies the due_datetime guard for learning/relearning cards
      const allDue = await getDueCards(userId, nowISO, 'vocab')

      // Bulk-load vocab to avoid N+1
      const regularVocabIds = allDue
        .filter(c => !rvIdSet.has(c.cardId))
        .map(c => c.cardId)
      const vocabItems = await db.vocabulary.where('vocab_id').anyOf(regularVocabIds).toArray()
      const vocabMap = new Map(vocabItems.map(v => [v.vocab_id, v]))

      const vocab: UnifiedCard[] = []
      const kanjiVocab: UnifiedCard[] = []

      for (const card of allDue) {
        if (rvIdSet.has(card.cardId)) {
          const [, lessonStr, ...rest] = card.cardId.split('_')
          const lessonNumber = Number(lessonStr)
          const kana = rest[rest.length - 1]
          const kanjiItem = allKanji.find(
            k => k.lesson_number === lessonNumber
              && (k.related_vocab ?? []).some(rv => rv.kana === kana),
          )
          const rv = kanjiItem?.related_vocab?.find(rv => rv.kana === kana)
          if (rv) {
            kanjiVocab.push({ kind: 'kanji-vocab', card, rv, lessonNumber })
          }
        }
        else {
          const vocabItem = vocabMap.get(card.cardId)
          if (vocabItem) {
            vocab.push({
              kind: 'vocab',
              card: { ...vocabItem, ...card, vocab_id: vocabItem.vocab_id } as VocabWithSRS,
            })
          }
        }
      }

      return { vocab, kanjiVocab }
    },
    enabled: !hasPrebuilt && !!userId && (filter === 'all' || filter === 'vocab'),
    staleTime: 0,
  })

  const { data: dueKanji, isLoading: kanjiLoading } = useQuery({
    queryKey: ['due-kanji-unified', userId],
    queryFn: async () => {
      const todayDate = new Date().toISOString().slice(0, 10)
      const cards = await getDueCards(userId, todayDate, 'kanji')
      const kanjiItems = await db.kanji.where('char').anyOf(cards.map(c => c.cardId)).toArray()
      const kanjiMap = new Map(kanjiItems.map(k => [k.char, k]))
      return cards.flatMap((card): UnifiedCard[] => {
        const kanji = kanjiMap.get(card.cardId)
        return kanji ? [{ kind: 'kanji', card, kanji }] : []
      })
    },
    enabled: !hasPrebuilt && !!userId && (filter === 'all' || filter === 'kanji'),
    staleTime: 0,
  })

  const isLoading = !hasPrebuilt && (vocabLoading || kanjiLoading)

  // Transition loading → pre-session once both queries settle.
  // The `phase === 'loading'` guard ensures this fires at most once, so there
  // is no cascading re-render risk that the react/set-state-in-effect rule warns about.
  useEffect(() => {
    if (phase === 'loading' && !isLoading) {
      // eslint-disable-next-line react/set-state-in-effect
      setPhase('pre-session')
    }
  }, [phase, isLoading])

  // When a new prebuilt queue is provided while the session is already 'complete'
  // (e.g. retrying wrong cards on the same mounted route), reset state so the
  // auto-start effect can fire again for the new queue.
  const prevPrebuiltRef = useRef(prebuilt)
  useEffect(() => {
    const prev = prevPrebuiltRef.current
    prevPrebuiltRef.current = prebuilt
    if (prebuilt != null && prev !== prebuilt && phase === 'complete') {
      // eslint-disable-next-line react/set-state-in-effect
      setPhase('pre-session')
      // eslint-disable-next-line react/set-state-in-effect
      setQueue([])
      // eslint-disable-next-line react/set-state-in-effect
      setCurrentIndex(0)
      // eslint-disable-next-line react/set-state-in-effect
      setStats(makeStats())
    }
  // phase is intentionally read at effect-run time, not re-subscribed
  // eslint-disable-next-line react/exhaustive-deps
  }, [prebuilt])

  function buildQueue(): UnifiedCard[] {
    if (hasPrebuilt)
      return prebuilt

    const all: UnifiedCard[] = []
    if (filter === 'all' || filter === 'vocab') {
      all.push(...(dueVocab?.vocab ?? []))
      all.push(...(dueVocab?.kanjiVocab ?? []))
    }
    if (filter === 'all' || filter === 'kanji') {
      all.push(...(dueKanji ?? []))
    }

    const newCards = all.filter(c => c.card.state === 'new')
    const reviewCards = all.filter(c => c.card.state !== 'new')
    const limitedNewCards = newCards.slice(0, newCardsPerDay)
    return [...reviewCards, ...limitedNewCards]
  }

  function startSession() {
    const built = fisherYates(buildQueue())
    if (built.length === 0)
      return // nothing to study
    setQueue(built)
    setCurrentIndex(0)
    setStats(makeStats())
    setPhase('active')
  }

  function handleRate(card: UnifiedCard, rating: SRSRating) {
    const isCorrect = rating >= 2
    setStats(s => ({
      ...s,
      correct: isCorrect ? s.correct + 1 : s.correct,
      total: s.total + 1,
      ratingCounts: { ...s.ratingCounts, [rating]: s.ratingCounts[rating] + 1 },
      wrongCards: rating === 1 ? [...s.wrongCards, card] : s.wrongCards,
    }))

    if (card.kind === 'kanji') {
      kanjiSRS.rate(card.card, rating)
    }
    else if (card.kind === 'vocab') {
      if (customDeckId) {
        customDeckSRS.rate(card.card, rating)
      }
      else {
        vocabSRS.rate(card.card, rating)
      }
    }
    else {
      // kanji-vocab: card.card is SRSCard
      vocabSRS.rate(card.card, rating)
    }

    const addedToQueue = rating === 1 ? 1 : 0
    if (rating === 1) {
      setQueue(q => [...q, card])
    }

    const next = currentIndex + 1
    if (next >= queue.length + addedToQueue) {
      setPhase('complete')
    }
    else {
      setCurrentIndex(next)
    }
  }

  const allCards = buildQueue()
  const newCount = allCards.filter(c => c.card.state === 'new').length
  const reviewCount = allCards.filter(c => c.card.state !== 'new').length

  // When using a prebuilt queue, compute counts from the queue directly.
  // Gate non-prebuilt counts on filter to avoid stale TanStack Query cache from
  // disabled queries (e.g. dueVocab stays cached when filter switches to 'kanji').
  const vocabCount = hasPrebuilt
    ? prebuilt.filter(c => c.kind === 'vocab').length
    : (filter === 'all' || filter === 'vocab') ? (dueVocab?.vocab.length ?? 0) : 0
  const kanjiVocabCount = hasPrebuilt
    ? prebuilt.filter(c => c.kind === 'kanji-vocab').length
    : (filter === 'all' || filter === 'vocab') ? (dueVocab?.kanjiVocab.length ?? 0) : 0
  const kanjiCount = hasPrebuilt
    ? prebuilt.filter(c => c.kind === 'kanji').length
    : (filter === 'all' || filter === 'kanji') ? (dueKanji?.length ?? 0) : 0

  return {
    phase,
    queue,
    currentIndex,
    currentCard: queue[currentIndex] ?? null,
    stats,
    mode,
    setMode,
    typeInputSubMode,
    setTypeInputSubMode,
    meaningLanguage,
    startSession,
    handleRate,
    isLoading,
    totalDue: allCards.length,
    vocabCount,
    kanjiVocabCount,
    kanjiCount,
    newCount,
    reviewCount,
  }
}
