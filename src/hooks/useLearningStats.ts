import { useMemo } from 'react'
import { db } from '../db/schema'
import { useLiveQuery } from '../lib/use-live-query'

export interface SubjectStats {
  total: number
  new: number
  learning: number
  review: number
  mature: number
  nextDueDate: string | null
}

export interface LearningStats {
  vocab: SubjectStats
  kanji: SubjectStats
}

function classify(
  total: number,
  cards: Array<{ scheduled_days: number, due: string }>,
  now: string,
): SubjectStats {
  let learning = 0
  let review = 0
  let mature = 0
  let nextDueDate: string | null = null

  for (const card of cards) {
    if (card.scheduled_days >= 21)
      mature++
    else if (card.scheduled_days >= 8)
      review++
    else
      learning++

    if (card.due > now && (nextDueDate === null || card.due < nextDueDate)) {
      nextDueDate = card.due
    }
  }

  return {
    total,
    new: Math.max(0, total - cards.length),
    learning,
    review,
    mature,
    nextDueDate,
  }
}

export function useLearningStats(userId: string) {
  const vocabCards = useLiveQuery(
    () => db.srs_cards.filter(c => c.userId === userId && c.cardType === 'vocab').toArray(),
    [userId],
  )
  const kanjiCards = useLiveQuery(
    () => db.srs_cards.filter(c => c.userId === userId && c.cardType === 'kanji').toArray(),
    [userId],
  )
  const totalVocab = useLiveQuery(() => db.vocabulary.count(), [])
  const totalKanji = useLiveQuery(() => db.kanji.count(), [])

  const isLoading = vocabCards === undefined || kanjiCards === undefined
    || totalVocab === undefined || totalKanji === undefined

  const now = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const data: LearningStats | undefined = isLoading
    ? undefined
    : {
        vocab: classify(totalVocab, vocabCards, now),
        kanji: classify(totalKanji, kanjiCards, now),
      }

  return { data: data ?? null, isLoading }
}
