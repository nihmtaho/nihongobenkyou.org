import type { CustomDeck } from '../types/custom-deck'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { getDeckWords, updateDeck } from '../db/custom-decks-local'
import { initSRSCard } from '../db/srs-cards'
import { CUSTOM_DECKS_KEY } from './useCustomDecks'

async function seedSRSCards(userId: string, deckId: string): Promise<void> {
  const words = await getDeckWords(deckId)
  for (const word of words) {
    await initSRSCard(userId, word.id, 'custom_vocab', deckId)
  }
}

export function useActivateStudyDeck(userId: string) {
  const qc = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async (deck: CustomDeck) => {
      if (!deck.is_active) {
        await updateDeck(deck.id, { is_active: true })
      }
      await seedSRSCards(userId, deck.id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CUSTOM_DECKS_KEY(userId) })
      navigate({ to: '/study', search: { tab: 'decks' } })
    },
  })
}
