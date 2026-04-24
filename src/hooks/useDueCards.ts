import type { CardState } from '../types/srs'
import { useQuery } from '@tanstack/react-query'
import { db } from '../db/schema'

export function useDueCards(userId: string) {
  return useQuery<CardState[]>({
    queryKey: ['due-cards', userId],
    queryFn: async () => {
      const now = new Date().toISOString()
      return db.user_cards
        .where('due_date')
        .belowOrEqual(now)
        .filter(card => card.userId === userId)
        .toArray()
    },
    staleTime: 0,
  })
}
