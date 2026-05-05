import type { CustomDeck } from '../types/custom-deck'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createDeck, deleteDeck, getDeck, updateDeck } from '../db/custom-decks-local'
import { CUSTOM_DECKS_KEY } from './useCustomDecks'

export function useCustomDeckMutations(userId: string) {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: CUSTOM_DECKS_KEY(userId) })

  const createDeckMutation = useMutation({
    mutationFn: (input: { title: string, description?: string }) =>
      createDeck(userId, input),
    onSuccess: () => invalidate(),
  })

  const updateDeckMutation = useMutation({
    mutationFn: ({ deckId, updates }: {
      deckId: string
      updates: Partial<Pick<CustomDeck, 'title' | 'description'>>
    }) => updateDeck(deckId, updates),
    onSuccess: () => invalidate(),
  })

  const deleteDeckMutation = useMutation({
    mutationFn: (deckId: string) => deleteDeck(deckId),
    onSuccess: () => invalidate(),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async (deckId: string) => {
      const deck = await getDeck(deckId)
      if (!deck)
        throw new Error('Deck not found')
      await updateDeck(deckId, { is_active: !deck.is_active })
    },
    onSuccess: () => invalidate(),
  })

  return {
    createDeck: createDeckMutation,
    updateDeck: updateDeckMutation,
    deleteDeck: deleteDeckMutation,
    toggleActive: toggleActiveMutation,
  }
}
