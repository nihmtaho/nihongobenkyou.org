import { useQuery } from '@tanstack/react-query'
import { db } from '../db/schema'

export function useNextKanjiDue(userId: string) {
  return useQuery<string | null>({
    queryKey: ['next-kanji-due', userId],
    queryFn: async () => {
      if (!userId)
        return null
      const today = new Date().toISOString().slice(0, 10)
      const cards = await db.srs_cards
        .where('[userId+due]')
        .between([userId, today], [userId, '9999-99-99'], false, true)
        .filter(c => c.cardType === 'kanji')
        .sortBy('due')
      return cards[0]?.due ?? null
    },
    staleTime: 60_000,
    enabled: !!userId,
  })
}
