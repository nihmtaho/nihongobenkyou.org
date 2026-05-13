import { useQueryClient } from '@tanstack/react-query'
import { db } from '../db/schema'
import { initSRSCard } from '../db/srs-cards'

export function useKnownCards() {
  const queryClient = useQueryClient()

  async function toggleKnown(userId: string, vocabId: string, current: boolean): Promise<void> {
    const now = new Date().toISOString()

    const modified = await db.srs_cards
      .where('[userId+cardId]')
      .equals([userId, vocabId])
      .modify({ is_known: !current, pending_sync: true, updated_at: now })

    if (modified === 0) {
      await initSRSCard(userId, vocabId, 'vocab', null)
      await db.srs_cards
        .where('[userId+cardId]')
        .equals([userId, vocabId])
        .modify({ is_known: !current, pending_sync: true, updated_at: now })
    }

    await queryClient.invalidateQueries({ queryKey: ['due-cards', userId] })
  }

  async function isKnown(userId: string, vocabId: string): Promise<boolean> {
    const card = await db.srs_cards.get([userId, vocabId])
    return card?.is_known === true
  }

  async function knownCount(userId: string): Promise<number> {
    return db.srs_cards
      .filter(c => c.userId === userId && c.cardType === 'vocab' && c.is_known === true)
      .count()
  }

  return { toggleKnown, isKnown, knownCount }
}
