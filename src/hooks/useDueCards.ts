import type { CardState } from '../types/srs'
import { useQuery } from '@tanstack/react-query'
import { db } from '../db/schema'

export function useDueCards(userId: string) {
  return useQuery<CardState[]>({
    queryKey: ['due-cards', userId],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10)
      return db.user_cards
        .where('due_date')
        .belowOrEqual(today)
        .filter(card => card.userId === userId && !card.is_known)
        .toArray()
    },
    enabled: !!userId,
    staleTime: 0,
  })
}
