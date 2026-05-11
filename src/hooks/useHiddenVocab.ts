import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getHiddenIds, hideVocab, unhideVocab } from '../db/hidden-vocab'

export function HIDDEN_VOCAB_KEY(userId: string, source: 'lesson' | 'custom') {
  return ['hidden-vocab', userId, source] as const
}

export function useHiddenVocab(userId: string, source: 'lesson' | 'custom'): Set<string> {
  const { data = [] } = useQuery({
    queryKey: HIDDEN_VOCAB_KEY(userId, source),
    queryFn: () => getHiddenIds(userId, source),
    enabled: !!userId,
    staleTime: 0,
  })
  return useMemo(() => new Set(data), [data])
}

export function useHideVocab() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, source, userId }: { itemId: string, source: 'lesson' | 'custom', userId: string }) =>
      hideVocab(itemId, source, userId),
    onSuccess: (_, { source, userId }) => {
      void qc.invalidateQueries({ queryKey: HIDDEN_VOCAB_KEY(userId, source) })
      void qc.invalidateQueries({ queryKey: ['due-cards', userId] })
      if (source === 'lesson') {
        void qc.invalidateQueries({ queryKey: ['active-deck-vocab', userId] })
        void qc.invalidateQueries({ queryKey: ['active-deck-due', userId] })
      }
    },
    onError: (_, { source, userId }) => {
      void qc.invalidateQueries({ queryKey: HIDDEN_VOCAB_KEY(userId, source) })
    },
  })
}

export function useUnhideVocab() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, userId }: { itemId: string, source: 'lesson' | 'custom', userId: string }) =>
      unhideVocab(userId, itemId),
    onSuccess: (_, { source, userId }) => {
      void qc.invalidateQueries({ queryKey: HIDDEN_VOCAB_KEY(userId, source) })
    },
  })
}
