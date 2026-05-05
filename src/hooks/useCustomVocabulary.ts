import type { CustomVocabItem } from '../types/custom-deck'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getDeckWords } from '../db/custom-decks-local'

export function useCustomVocabulary(deckId: string) {
  const queryClient = useQueryClient()

  const query = useQuery<CustomVocabItem[]>({
    queryKey: ['custom-vocabulary', deckId],
    queryFn: () => getDeckWords(deckId),
    enabled: !!deckId,
    staleTime: 60_000,
  })

  // Re-fetch after a short delay to pick up async pitch lookup patches
  function schedulePitchRefresh() {
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['custom-vocabulary', deckId] })
    }, 2000)
  }

  return { ...query, schedulePitchRefresh }
}
