import { useQuery } from '@tanstack/react-query'
import Dexie from 'dexie'

import { db } from '../db/schema'

export function useNextKanjiDue(userId: string) {
  return useQuery<string | null>({
    queryKey: ['next-kanji-due', userId],
    queryFn: async () => {
      if (!userId)
        return null
      const today = new Date().toISOString().slice(0, 10)
      const cards = await db.kanji_cards
        .where('[userId+due_date]')
        .between([userId, today], [userId, Dexie.maxKey], false, true)
        .sortBy('due_date')
      return cards[0]?.due_date ?? null
    },
    staleTime: 60_000,
    enabled: !!userId,
  })
}
