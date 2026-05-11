import type { CustomVocabItem } from '../types/custom-deck'
import type { VocabItem } from '../types/vocabulary'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getHiddenIds, hideVocab, unhideVocab } from '../db/hidden-vocab'
import { db } from '../db/schema'

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
      if (source === 'lesson') {
        void qc.invalidateQueries({ queryKey: ['active-deck-vocab', userId] })
        void qc.invalidateQueries({ queryKey: ['active-deck-due', userId] })
      }
    },
  })
}

export interface HiddenVocabDisplayItem {
  itemId: string
  word: string
  reading: string
  meaning: string
}

export function useHiddenVocabDetails(userId: string, source: 'lesson' | 'custom') {
  const hiddenIds = useHiddenVocab(userId, source)
  const idArray = useMemo(() => Array.from(hiddenIds), [hiddenIds])

  const { data: items = [] } = useQuery<HiddenVocabDisplayItem[]>({
    queryKey: ['hidden-vocab-details', userId, source, idArray.slice().sort().join(',')],
    queryFn: async () => {
      if (source === 'lesson') {
        const vocabs = (await db.vocabulary.bulkGet(idArray)).filter((v): v is VocabItem => v != null)
        return vocabs.map(v => ({
          itemId: v.vocab_id,
          word: v.word ?? v.reading,
          reading: v.reading,
          meaning: v.meaning_vi,
        }))
      }
      const customs = (await db.custom_vocabulary.bulkGet(idArray)).filter((v): v is CustomVocabItem => v != null)
      return customs.map(v => ({
        itemId: v.id,
        word: v.kanji ?? v.kana,
        reading: v.kana,
        meaning: v.meaning_vi,
      }))
    },
    enabled: idArray.length > 0,
    staleTime: Infinity,
  })

  return { hiddenIds, items }
}
