import type { CustomDeck } from '../types/custom-deck'
import { useQuery } from '@tanstack/react-query'
import { NetworkError } from '../api/auth'
import { fetchDecks } from '../api/custom-decks'
import { cacheDecks, getCachedDecks } from '../db/custom-decks'

export function useCustomDecks(userId: string) {
  return useQuery<CustomDeck[]>({
    queryKey: ['custom-decks', userId],
    queryFn: async () => {
      try {
        const decks = await fetchDecks(userId)
        await cacheDecks(decks)
        return decks
      }
      catch (err) {
        if (err instanceof NetworkError)
          return getCachedDecks(userId)
        throw err
      }
    },
    enabled: !!userId,
    staleTime: 60_000,
  })
}
