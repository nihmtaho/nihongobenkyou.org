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

      const cards = await db.srs_cards
        .where('[userId+cardId]')
        .anyOf(vocabIds.map(id => [userId, id]))
        .filter(c => c.cardType === 'vocab')
        .toArray()

      const today = new Date().toISOString().slice(0, 10)

      const futureDates = cards.map(c => c.due).filter(d => d > today).sort()

      return {
        total:       allVocab.length,
        known:       cards.filter(c => c.is_known).length,
        studied:     cards.filter(c => c.reps > 0 && !c.is_known).length,
        due:         cards.filter(c => !c.is_known && c.due <= today).length,
        newCards:    Math.max(0, vocabIds.length - cards.length),
        learning:    cards.filter(c => c.scheduled_days < 8).length,
        review:      cards.filter(c => c.scheduled_days >= 8 && c.scheduled_days < 21).length,
        mature:      cards.filter(c => c.scheduled_days >= 21).length,
        nextDueDate: futureDates[0] ?? null,
      }
    },
    staleTime: 0,
    enabled: !!userId && !!bookSource,
  })
}
