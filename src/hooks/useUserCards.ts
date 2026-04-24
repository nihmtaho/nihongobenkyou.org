import type { CardState } from '../types/srs'

import { useQuery } from '@tanstack/react-query'

import { db } from '../db/schema'

export function useUserCards(userId: string, vocabIds: string[]) {
  return useQuery<Map<string, CardState>>({
    queryKey: ['user-cards', userId, vocabIds],
    queryFn: async () => {
      const cards = await db.user_cards
        .where('[userId+vocabId]')
        .anyOf(vocabIds.map(id => [userId, id]))
        .toArray()
      return new Map(cards.map(c => [c.vocabId, c]))
    },
    staleTime: 0,
    enabled: vocabIds.length > 0,
  })
}
