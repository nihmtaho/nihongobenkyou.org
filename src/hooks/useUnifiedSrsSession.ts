import type { SRSCard, SRSRating } from '../types/srs'
import type { MeaningLanguage, StudyMode, TypeInputSubMode } from '../types/study'
import type { CardTypeFilter, UnifiedCard } from '../types/unified-card'
import type { VocabWithSRS } from '../types/vocabulary'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { db } from '../db/schema'
import { getDueCards, upsertSRSCard } from '../db/srs-cards'
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

interface UndoEntry {
  card: UnifiedCard
  snapshot: SRSCard | VocabWithSRS
  reviewLogId: number
  wasRequeued: boolean
}

const MAX_UNDO_DEPTH = 10

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
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([])

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
      const nowISO = new Date().toISOString()
      const cards = await getDueCards(userId, nowISO, 'kanji')
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
    const built = buildQueue()

    if (!hasPrebuilt) {
      const allAvailableNew = [
        ...(dueVocab?.vocab ?? []),
        ...(dueVocab?.kanjiVocab ?? []),
        ...(dueKanji ?? []),
      ].filter(c => c.card.state === 'new')
      const overflow = allAvailableNew.length - newCardsPerDay
      if (overflow > 0) {
        toast.info(`Giới hạn ${newCardsPerDay} thẻ mới hôm nay (${overflow} thẻ còn lại cho ngày mai)`)
      }
    }

    const shuffled = fisherYates(built)
    if (shuffled.length === 0)
      return // nothing to study
    setQueue(shuffled)
    setCurrentIndex(0)
    setStats(makeStats())
    setUndoStack([])
    setPhase('active')
  }

  async function handleRate(card: UnifiedCard, rating: SRSRating) {
    const snapshot = card.card
    const wasRequeued = rating === 1

    let reviewLogId = 0
    if (card.kind === 'kanji') {
      reviewLogId = await kanjiSRS.rateAsync(card.card, rating)
    }
    else if (card.kind === 'vocab') {
      if (customDeckId) {
        reviewLogId = await customDeckSRS.rateAsync(card.card, rating)
      }
      else {
        reviewLogId = await vocabSRS.rateAsync(card.card, rating)
      }
    }
    else {
      // kanji-vocab: card.card is SRSCard
      reviewLogId = await vocabSRS.rateAsync(card.card, rating)
    }

    // Push to undo stack (capped at MAX_UNDO_DEPTH)
    setUndoStack(stack => [
      ...stack.slice(-(MAX_UNDO_DEPTH - 1)),
      { card, snapshot, reviewLogId, wasRequeued },
    ])

    const isCorrect = rating >= 2
    setStats(s => ({
      ...s,
      correct: isCorrect ? s.correct + 1 : s.correct,
      total: s.total + 1,
      ratingCounts: { ...s.ratingCounts, [rating]: s.ratingCounts[rating] + 1 },
      wrongCards: wasRequeued ? [...s.wrongCards, card] : s.wrongCards,
    }))

    const addedToQueue = wasRequeued ? 1 : 0
    if (wasRequeued) {
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

  async function undo() {
    if (undoStack.length === 0)
      return

    const entry = undoStack[undoStack.length - 1]
    setUndoStack(stack => stack.slice(0, -1))

    // Delete the review_log entry by id
    if (entry.reviewLogId > 0) {
      await db.review_log.delete(entry.reviewLogId)
    }

    // Restore the SRS card to its pre-rating snapshot
    await upsertSRSCard(entry.snapshot as SRSCard)

    // Remove the re-queued tail entry if the card had been rated Again
    if (entry.wasRequeued) {
      setQueue(q => q.slice(0, -1))
    }

    // Step currentIndex back by 1
    setCurrentIndex(i => Math.max(0, i - 1))

    // Revert completed phase back to active
    setPhase(p => (p === 'complete' ? 'active' : p))
  }

  const canUndo = undoStack.length > 0

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
    undo,
    canUndo,
    isLoading,
    totalDue: allCards.length,
    vocabCount,
    kanjiVocabCount,
    kanjiCount,
    newCount,
    reviewCount,
  }
}
