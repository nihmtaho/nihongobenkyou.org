import type { CustomDeck } from '../types/custom-deck'
import { useQuery } from '@tanstack/react-query'
import { getDecks } from '../db/custom-decks-local'

export const CUSTOM_DECKS_KEY = (userId: string) => ['custom-decks', userId]

export function useCustomDecks(userId: string) {
  return useQuery<CustomDeck[]>({
    queryKey: CUSTOM_DECKS_KEY(userId),
    queryFn: () => getDecks(userId),
    enabled: !!userId,
    staleTime: 0,
  })
}
