import { useQuery } from '@tanstack/react-query'
import { getCustomDeckSRS } from '../db/custom-deck-srs'
import { db } from '../db/schema'

export interface DeckProgress {
  total: number
  started: number
  learned: number
  mature: number
  dueToday: number
  percentComplete: number
}

export function useCustomDeckProgress(userId: string, deckId: string) {
  return useQuery<DeckProgress>({
    queryKey: ['custom-deck-progress', userId, deckId],
    queryFn: async () => {
      const [deck, srsRows] = await Promise.all([
        db.custom_decks.get(deckId),
        getCustomDeckSRS(userId, deckId),
      ])

      const total = deck?.word_count ?? 0
      const now = new Date().toISOString()
      const today = now.slice(0, 10)

      // started = any row exists (all rows have review_count >= 1 on first write)
      const started = srsRows.filter(r => r.review_count >= 1).length
      const learned = srsRows.filter(r => r.interval_days >= 7 && r.interval_days < 21).length
      const mature = srsRows.filter(r => r.interval_days >= 21).length
      const dueToday = srsRows.filter(r => r.due_date <= today).length
      const percentComplete = total === 0 ? 0 : Math.round(((learned + mature) / total) * 100)

      return { total, started, learned, mature, dueToday, percentComplete }
    },
    enabled: !!userId && !!deckId,
    staleTime: 0,
  })
}
