import type { CustomVocabItem } from '../types/custom-deck'
import { useQuery } from '@tanstack/react-query'
import { getDeckWords } from '../db/custom-decks-local'

export const DECK_WORDS_KEY = (deckId: string) => ['custom-deck-words', deckId]

export function useCustomDeckWords(deckId: string | null) {
  return useQuery<CustomVocabItem[]>({
    queryKey: DECK_WORDS_KEY(deckId ?? ''),
    queryFn: () => getDeckWords(deckId!),
    enabled: !!deckId,
    staleTime: 0,
  })
}
