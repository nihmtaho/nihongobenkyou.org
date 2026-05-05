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
  cards: Array<{ interval_days: number, due_date: string }>,
  now: string,
): SubjectStats {
  let learning = 0
  let review = 0
  let mature = 0
  let nextDueDate: string | null = null

  for (const card of cards) {
    if (card.interval_days >= 21)
      mature++
    else if (card.interval_days >= 8)
      review++
    else learning++

    if (card.due_date > now && (nextDueDate === null || card.due_date < nextDueDate)) {
      nextDueDate = card.due_date
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
    () => db.user_cards.toArray().then(all => all.filter(c => c.userId === userId)),
    [userId],
  )
  const kanjiCards = useLiveQuery(
    () => db.kanji_cards.toArray().then(all => all.filter(c => c.userId === userId)),
    [userId],
  )
  const totalVocab = useLiveQuery(() => db.vocabulary.count(), [])
  const totalKanji = useLiveQuery(() => db.kanji.count(), [])

  const isLoading = vocabCards === undefined || kanjiCards === undefined
    || totalVocab === undefined || totalKanji === undefined

  const data: LearningStats | undefined = isLoading
    ? undefined
    : {
        vocab: classify(totalVocab, vocabCards, new Date().toISOString()),
        kanji: classify(totalKanji, kanjiCards, new Date().toISOString()),
      }

  return { data: data ?? null, isLoading }
}
