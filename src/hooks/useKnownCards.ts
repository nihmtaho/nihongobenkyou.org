import { useQueryClient } from '@tanstack/react-query'

import { db } from '../db/schema'

const DEFAULT_EASE_FACTOR = 2.5
const DEFAULT_INTERVAL_DAYS = 0

export function useKnownCards() {
  const queryClient = useQueryClient()

  async function toggleKnown(userId: string, vocabId: string, current: boolean): Promise<void> {
    const existing = await db.user_cards.get([userId, vocabId])
    const now = new Date().toISOString()

    if (existing) {
      await db.user_cards.put({
        ...existing,
        is_known: !current,
        pending_sync: true,
        updated_at: now,
      })
    }
    else {
      await db.user_cards.put({
        userId,
        vocabId,
        interval_days: DEFAULT_INTERVAL_DAYS,
        ease_factor: DEFAULT_EASE_FACTOR,
        due_date: now,
        review_count: 0,
        last_rating: null,
        pending_sync: true,
        updated_at: now,
        is_known: true,
        consecutive_correct: 0,
      })
    }

    await queryClient.invalidateQueries({ queryKey: ['due-cards', userId] })
  }

  async function isKnown(userId: string, vocabId: string): Promise<boolean> {
    const card = await db.user_cards.get([userId, vocabId])
    return card?.is_known === true
  }

  return { toggleKnown, isKnown }
}
