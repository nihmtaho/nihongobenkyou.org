import type { CustomDeck } from '../types/custom-deck'
import type { CardState } from '../types/srs'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { getDeckWords, updateDeck } from '../db/custom-decks-local'
import { db } from '../db/schema'
import { CUSTOM_DECKS_KEY } from './useCustomDecks'

async function seedUserCards(userId: string, deckId: string): Promise<void> {
  const words = await getDeckWords(deckId)
  const today = new Date().toISOString().slice(0, 10)
  const now = new Date().toISOString()

  const toAdd: CardState[] = []
  for (const word of words) {
    const existing = await db.user_cards.get([userId, word.id])
    if (!existing) {
      toAdd.push({
        userId,
        vocabId: word.id,
        interval_days: 1,
        ease_factor: 2.5,
        due_date: today,
        review_count: 0,
        last_rating: null,
        pending_sync: false,
        updated_at: now,
        is_known: false,
        consecutive_correct: 0,
      })
    }
  }
  if (toAdd.length > 0) {
    await db.user_cards.bulkAdd(toAdd)
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
      await seedUserCards(userId, deck.id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CUSTOM_DECKS_KEY(userId) })
      navigate({ to: '/study', search: { tab: 'decks' } })
    },
  })
}
