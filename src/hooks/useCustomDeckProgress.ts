import { useQuery } from '@tanstack/react-query'
import { db } from '../db/schema'
import { getSRSCardsForDeck } from '../db/srs-cards'

export interface DeckProgress {
  total: number
  started: number
  learning: number
  learned: number
  mature: number
  dueToday: number
  percentComplete: number
  nextDueDateStr: string | null
}

export function useCustomDeckProgress(userId: string, deckId: string) {
  return useQuery<DeckProgress>({
    queryKey: ['custom-deck-progress', userId, deckId],
    queryFn: async () => {
      const [deck, srsRows] = await Promise.all([
        db.custom_decks.get(deckId),
        getSRSCardsForDeck(userId, deckId),
      ])

      const total = deck?.word_count ?? 0
      const today = new Date().toISOString().slice(0, 10)

      // Custom decks can contain kanji entries; progress tracks vocab cards only
      const vocabRows = srsRows.filter(r => r.cardType !== 'kanji')

      const reviewed = vocabRows.filter(r => r.reps >= 1)
      const started = reviewed.length
      const learning = reviewed.filter(r => r.scheduled_days < 7).length
      const learned = reviewed.filter(r => r.scheduled_days >= 7 && r.scheduled_days < 21).length
      const mature = reviewed.filter(r => r.scheduled_days >= 21).length
      const dueToday = vocabRows.filter(r => r.due <= today && !r.is_known).length
      const percentComplete = total === 0 ? 0 : Math.round(((learned + mature) / total) * 100)

      const futureDates = vocabRows.filter(r => r.due > today).map(r => r.due)
      const nextDueDateStr = futureDates.length > 0 ? futureDates.sort()[0] : null

      return { total, started, learning, learned, mature, dueToday, percentComplete, nextDueDateStr }
    },
    enabled: !!userId && !!deckId,
    staleTime: 0,
  })
}
