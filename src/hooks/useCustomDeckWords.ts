import type { CustomVocabItem } from '../types/custom-deck'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getDeckWords } from '../db/custom-decks-local'
import { useHiddenVocab } from './useHiddenVocab'

export const DECK_WORDS_KEY = (deckId: string) => ['custom-deck-words', deckId]

export function useCustomDeckWords(deckId: string | null, userId: string) {
  const hiddenIds = useHiddenVocab(userId, 'custom')
  const query = useQuery<CustomVocabItem[]>({
    queryKey: DECK_WORDS_KEY(deckId ?? ''),
    queryFn: () => getDeckWords(deckId!),
    enabled: !!deckId,
    staleTime: 0,
  })
  return {
    ...query,
    data: useMemo(
      () => query.data?.filter(item => !hiddenIds.has(item.id)),
      [query.data, hiddenIds],
    ),
  }
}
