import type { SRSCard } from '../types/srs'
import { useQuery } from '@tanstack/react-query'
import { getDueCards } from '../db/srs-cards'

export function useDueCards(userId: string) {
  return useQuery<SRSCard[]>({
    queryKey: ['due-cards', userId],
    queryFn: () => getDueCards(userId, new Date().toISOString()),
    enabled: !!userId,
    staleTime: 0,
  })
}
