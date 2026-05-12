import type { ParsedVocabItem } from '../types/custom-deck'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { addWords } from '../db/custom-decks-local'
import { CUSTOM_DECKS_KEY } from './useCustomDecks'
import { DECK_WORDS_KEY } from './useCustomDeckWords'

export function useAddVocabToDecks(userId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      deckIds,
      parsedItem,
    }: {
      deckIds: string[]
      parsedItem: ParsedVocabItem
    }) => {
      const results = await Promise.allSettled(
        deckIds.map(deckId => addWords(deckId, userId, [parsedItem], 'manual')),
      )
      const failed = results.filter(r => r.status === 'rejected')
      if (failed.length === deckIds.length)
        throw new Error(`Failed to add vocab to all ${deckIds.length} decks`)
      return { results, deckIds }
    },
    onSuccess: ({ results, deckIds }) => {
      const succeededIds = deckIds.filter((_, i) => results[i].status === 'fulfilled')
      const failed = deckIds.length - succeededIds.length

      succeededIds.forEach(deckId =>
        qc.invalidateQueries({ queryKey: DECK_WORDS_KEY(deckId) }),
      )
      succeededIds.forEach(deckId =>
        qc.invalidateQueries({ queryKey: ['custom-deck-progress', userId, deckId] }),
      )
      if (succeededIds.length > 0)
        qc.invalidateQueries({ queryKey: CUSTOM_DECKS_KEY(userId) })

      if (succeededIds.length > 0)
        toast.success(`Đã thêm vào ${succeededIds.length} deck`)
      if (failed > 0)
        toast.error(`Không thêm được vào ${failed} deck`)
    },
    onError: () => {
      toast.error(`Không thêm được vào bất kỳ deck nào`)
    },
  })
}
