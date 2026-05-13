import { useQueryClient } from '@tanstack/react-query'
import { db } from '../db/schema'
import { initSRSCard, upsertSRSCard } from '../db/srs-cards'

export function useKnownCards() {
  const queryClient = useQueryClient()

  async function toggleKnown(userId: string, vocabId: string, current: boolean): Promise<void> {
    const existing = await db.srs_cards.get([userId, vocabId])
    const now = new Date().toISOString()

    if (existing) {
      await upsertSRSCard({ ...existing, is_known: !current, pending_sync: true, updated_at: now })
    }
    else {
      await initSRSCard(userId, vocabId, 'vocab', null)
      const created = await db.srs_cards.get([userId, vocabId])
      if (created)
        await upsertSRSCard({ ...created, is_known: true, pending_sync: true, updated_at: now })
    }

    await queryClient.invalidateQueries({ queryKey: ['due-cards', userId] })
  }

  async function isKnown(userId: string, vocabId: string): Promise<boolean> {
    const card = await db.srs_cards.get([userId, vocabId])
    return card?.is_known === true
  }

  return { toggleKnown, isKnown }
}
