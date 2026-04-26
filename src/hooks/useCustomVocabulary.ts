import type { CustomVocabItem } from '../types/custom-deck'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { NetworkError } from '../api/auth'
import { fetchWords } from '../api/custom-vocabulary'
import { cacheWords, getCachedWords } from '../db/custom-decks'

export function useCustomVocabulary(deckId: string) {
  const queryClient = useQueryClient()

  const query = useQuery<CustomVocabItem[]>({
    queryKey: ['custom-vocabulary', deckId],
    queryFn: async () => {
      try {
        const words = await fetchWords(deckId)
        await cacheWords(words)
        return words
      }
      catch (err) {
        if (err instanceof NetworkError)
          return getCachedWords(deckId)
        throw err
      }
    },
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
