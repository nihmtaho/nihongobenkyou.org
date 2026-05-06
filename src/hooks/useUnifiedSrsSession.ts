import type { SRSRating } from '../types/srs'
import type { MeaningLanguage, StudyMode, TypeInputSubMode } from '../types/study'
import type { CardTypeFilter, UnifiedCard } from '../types/unified-card'
import type { VocabWithSRS } from '../types/vocabulary'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { getDueKanjiCards } from '../db/kanji'
import { db } from '../db/schema'
import { randomAgainDelay } from '../lib/srs'
import { useSettingsStore } from '../stores/settingsStore'
import { useCustomDeckVocabSRS } from './useCustomDeckVocabSRS'
import { useSRS } from './useSRS'

export type UnifiedSessionPhase = 'loading' | 'pre-session' | 'active' | 'complete'

export interface UnifiedSessionStats {
  correct: number
  total: number
  startTime: Date
  ratingCounts: Record<SRSRating, number>
}

export interface UnifiedSrsSessionOptions {
  prebuiltQueue?: UnifiedCard[]
  initialMode?: StudyMode
  initialSubMode?: TypeInputSubMode
  customDeckId?: string // when set, vocab ratings go to custom_deck_srs
}

function makeStats(): UnifiedSessionStats {
  return { correct: 0, total: 0, startTime: new Date(), ratingCounts: { 0: 0, 1: 0, 2: 0, 3: 0 } }
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

function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function useUnifiedSrsSession(
  userId: string,
  filter: CardTypeFilter,
  options?: UnifiedSrsSessionOptions,
) {
  const prebuilt = options?.prebuiltQueue
  const hasPrebuilt = prebuilt != null && prebuilt.length > 0

  const meaningLanguage = useSettingsStore(s => s.meaningLanguage) as MeaningLanguage
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
  const [deferred, setDeferred] = useState<{ card: UnifiedCard, showAfter: number }[]>([])

  const { data: dueVocab, isLoading: vocabLoading } = useQuery({
    queryKey: ['due-vocab-unified', userId],
    queryFn: async () => {
      const now = new Date().toISOString()
      const allKanji = await db.kanji.toArray()
      const rvIdSet = buildRvIdSet(allKanji)

      const allDue = await db.user_cards
        .where('due_date')
        .belowOrEqual(now)
        .filter(c => c.userId === userId && !c.is_known)
        .toArray()

      // Bulk-load vocab to avoid N+1
      const regularVocabIds = allDue
        .filter(c => !rvIdSet.has(c.vocabId))
        .map(c => c.vocabId)
      const vocabItems = await db.vocabulary.where('vocab_id').anyOf(regularVocabIds).toArray()
      const vocabMap = new Map(vocabItems.map(v => [v.vocab_id, v]))

      // Fall back to custom_vocabulary for IDs not found in standard vocabulary
      const missingIds = regularVocabIds.filter(id => !vocabMap.has(id))
      if (missingIds.length > 0) {
        const customItems = await db.custom_vocabulary.where('id').anyOf(missingIds).toArray()
        for (const cv of customItems) {
          vocabMap.set(cv.id, {
            vocab_id: cv.id,
            word: cv.kanji ?? null,
            reading: cv.kana,
            romaji: '',
            meaning_en: '',
            meaning_vi: cv.meaning_vi,
            han_viet: cv.han_viet ?? null,
            pitch_pattern: null,
            pitch_type: null,
            audio_filename: null,
            pos: [],
            jlpt_level: null,
            book_source: 'custom',
            lesson_number: 0,
            examples: [],
            tags: [],
            deprecated: false,
          })
        }
      }

      const vocab: UnifiedCard[] = []
      const kanjiVocab: UnifiedCard[] = []

      for (const card of allDue) {
        if (rvIdSet.has(card.vocabId)) {
          const [, lessonStr, ...rest] = card.vocabId.split('_')
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
          const vocabItem = vocabMap.get(card.vocabId)
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
      const now = new Date().toISOString()
      const cards = await getDueKanjiCards(userId, now)
      const kanjiItems = await db.kanji.where('char').anyOf(cards.map(c => c.char)).toArray()
      const kanjiMap = new Map(kanjiItems.map(k => [k.char, k]))
      return cards.flatMap((card): UnifiedCard[] => {
        const kanji = kanjiMap.get(card.char)
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
    return all
  }

  function startSession() {
    const built = fisherYates(buildQueue())
    if (built.length === 0)
      return // nothing to study
    setQueue(built)
    setCurrentIndex(0)
    setStats(makeStats())
    setDeferred([])
    setPhase('active')
  }

  function handleRate(card: UnifiedCard, rating: SRSRating) {
    const isCorrect = rating >= 2
    setStats(s => ({
      ...s,
      correct: isCorrect ? s.correct + 1 : s.correct,
      total: s.total + 1,
      ratingCounts: { ...s.ratingCounts, [rating]: s.ratingCounts[rating] + 1 },
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
      // kanji-vocab: card.card is CardState (has vocabId, not vocab_id) — coerce for useSRS
      vocabSRS.rate({ ...card.card, vocab_id: card.card.vocabId } as never, rating)
    }

    if (rating === 0) {
      const showAfter = Date.now() + randomAgainDelay()
      setDeferred(d => [...d, { card, showAfter }])
    }

    const next = currentIndex + 1
    if (next >= queue.length) {
      const now = Date.now()
      const ready = deferred.filter(d => d.showAfter <= now)
      if (ready.length > 0) {
        setQueue(ready.map(d => d.card))
        setDeferred(d => d.filter(x => x.showAfter > now))
        setCurrentIndex(0)
      }
      else {
        setPhase('complete')
      }
    }
    else {
      setCurrentIndex(next)
    }
  }

  const allCards = buildQueue()

  // When using a prebuilt queue, compute counts from the queue directly.
  const vocabCount = hasPrebuilt
    ? prebuilt.filter(c => c.kind === 'vocab').length
    : (dueVocab?.vocab.length ?? 0)
  const kanjiVocabCount = hasPrebuilt
    ? prebuilt.filter(c => c.kind === 'kanji-vocab').length
    : (dueVocab?.kanjiVocab.length ?? 0)
  const kanjiCount = hasPrebuilt
    ? prebuilt.filter(c => c.kind === 'kanji').length
    : (dueKanji?.length ?? 0)

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
  }
}
