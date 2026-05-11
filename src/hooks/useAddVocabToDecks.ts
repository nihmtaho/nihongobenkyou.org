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
      return { results, deckIds }
    },
    onSuccess: ({ results, deckIds }) => {
      const succeeded = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      deckIds.forEach((deckId) => {
        qc.invalidateQueries({ queryKey: DECK_WORDS_KEY(deckId) })
      })
      qc.invalidateQueries({ queryKey: CUSTOM_DECKS_KEY(userId) })

      if (succeeded > 0)
        toast.success(`Đã thêm vào ${succeeded} deck`)
      if (failed > 0)
        toast.error(`Không thêm được vào ${failed} deck`)
    },
  })
}
