import { useQuery } from '@tanstack/react-query'
import { db } from '../db/schema'

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
  today: string,
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

    if (card.due_date > today && (nextDueDate === null || card.due_date < nextDueDate)) {
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

async function fetchLearningStats(userId: string): Promise<LearningStats> {
  const today = new Date().toISOString().slice(0, 10)

  const [vocabCards, totalVocab, kanjiCards, totalKanji] = await Promise.all([
    db.user_cards.toArray().then(all => all.filter(c => c.userId === userId)),
    db.vocabulary.count(),
    db.kanji_cards.toArray().then(all => all.filter(c => c.userId === userId)),
    db.kanji.count(),
  ])

  return {
    vocab: classify(totalVocab, vocabCards, today),
    kanji: classify(totalKanji, kanjiCards, today),
  }
}

export function useLearningStats(userId: string) {
  return useQuery({
    queryKey: ['learning-stats', userId],
    queryFn: () => fetchLearningStats(userId),
    staleTime: 0,
    enabled: Boolean(userId),
  })
}
