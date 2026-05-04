import { useQuery } from '@tanstack/react-query'

import { db } from '../db/schema'

export function useNextVocabDue(userId: string) {
  return useQuery<string | null>({
    queryKey: ['next-vocab-due', userId],
    queryFn: async () => {
      if (!userId)
        return null
      const cards = await db.user_cards
        .where('due_date')
        .above(new Date().toISOString())
        .filter(c => c.userId === userId && !c.is_known)
        .sortBy('due_date')
      return cards[0]?.due_date ?? null
    },
    staleTime: 60_000,
    enabled: !!userId,
  })
}
