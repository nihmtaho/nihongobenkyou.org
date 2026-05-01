import type { CardState } from '../types/srs'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { AuthError } from '../api/auth'
import { db } from '../db/schema'
import { downloadNewReviews } from '../db/sync'

const REMOTE_SYNC_STALE_TIME = 5 * 60 * 1000

function useRemoteCardSync(userId: string) {
  return useQuery({
    queryKey: ['remote-card-sync', userId],
    queryFn: async () => {
      try {
        await downloadNewReviews(userId)
        return Date.now()
      }
      catch (err) {
        if (err instanceof AuthError)
          throw err
        return null
      }
    },
    staleTime: REMOTE_SYNC_STALE_TIME,
    retry: 0,
    enabled: !!userId,
  })
}

export function useUserCards(userId: string, vocabIds: string[]) {
  const queryClient = useQueryClient()
  const syncQuery = useRemoteCardSync(userId)

  useEffect(() => {
    if (syncQuery.dataUpdatedAt > 0) {
      queryClient.invalidateQueries({ queryKey: ['user-cards', userId] })
    }
  }, [syncQuery.dataUpdatedAt, queryClient, userId])

  return useQuery<Map<string, CardState>>({
    queryKey: ['user-cards', userId, vocabIds],
    queryFn: async () => {
      const cards = await db.user_cards
        .where('[userId+vocabId]')
        .anyOf(vocabIds.map(id => [userId, id]))
        .toArray()
      return new Map(cards.map(c => [c.vocabId, c]))
    },
    staleTime: 0,
    enabled: vocabIds.length > 0,
  })
}
