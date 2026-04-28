import { useQuery } from '@tanstack/react-query'
import { db } from '../db/schema'

export interface BookProgressStats {
  total: number
  known: number
  studied: number
  due: number
  newCards: number
  learning: number
  review: number
  mature: number
  nextDueDate: string | null
}

export function useBookProgress(userId: string, bookSource: string) {
  return useQuery<BookProgressStats | null>({
    queryKey: ['book-progress', userId, bookSource],
    queryFn: async () => {
      if (!userId)
        return null

      const allVocab = await db.vocabulary.where('book_source').equals(bookSource).toArray()
      const vocabIds = allVocab.map(v => v.vocab_id)

      const cards = await db.user_cards
        .where('[userId+vocabId]')
        .anyOf(vocabIds.map(id => [userId, id]))
        .toArray()

      const today = new Date().toISOString().slice(0, 10)

      const futureDates = cards.map(c => c.due_date).filter(d => d > today).sort()

      return {
        total: allVocab.length,
        known: cards.filter(c => c.is_known).length,
        studied: cards.filter(c => c.review_count > 0 && !c.is_known).length,
        due: cards.filter(c => !c.is_known && c.due_date <= today).length,
        newCards: Math.max(0, vocabIds.length - cards.length),
        learning: cards.filter(c => c.interval_days < 8).length,
        review: cards.filter(c => c.interval_days >= 8 && c.interval_days < 21).length,
        mature: cards.filter(c => c.interval_days >= 21).length,
        nextDueDate: futureDates[0] ?? null,
      }
    },
    staleTime: 0,
    enabled: !!userId && !!bookSource,
  })
}
