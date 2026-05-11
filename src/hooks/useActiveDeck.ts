import type { ActiveKanjiItem, ActiveVocabItem } from '../types/active-deck'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import {
  addKanjiToDeck,
  addVocabToDeck,
  clearKanjiDeck,
  clearVocabDeck,
  getActiveDeckKanji,
  getActiveDeckVocab,
  getDueActiveKanjiSRS,
  getDueActiveVocabSRS,
  removeKanjiFromDeck,
  removeVocabFromDeck,
} from '../db/active-deck'
import { useHiddenVocab } from './useHiddenVocab'

export function useActiveDeckVocab(userId: string) {
  const hiddenIds = useHiddenVocab(userId, 'lesson')
  const query = useQuery<ActiveVocabItem[]>({
    queryKey: ['active-deck-vocab', userId],
    queryFn: () => getActiveDeckVocab(userId),
    enabled: !!userId,
    staleTime: 0,
  })
  return {
    ...query,
    data: useMemo(
      () => query.data?.filter(item => !hiddenIds.has(item.vocab_id)),
      [query.data, hiddenIds],
    ),
  }
}

export function useActiveDeckKanji(userId: string) {
  return useQuery<ActiveKanjiItem[]>({
    queryKey: ['active-deck-kanji', userId],
    queryFn: () => getActiveDeckKanji(userId),
    enabled: !!userId,
    staleTime: 0,
  })
}

export function useActiveDeckDueCounts(userId: string) {
  return useQuery<{ vocab: number, kanji: number }>({
    queryKey: ['active-deck-due', userId],
    queryFn: async () => {
      const [vocab, kanji] = await Promise.all([
        getDueActiveVocabSRS(userId),
        getDueActiveKanjiSRS(userId),
      ])
      return { vocab: vocab.length, kanji: kanji.length }
    },
    enabled: !!userId,
    staleTime: 0,
  })
}

export function useToggleVocabInDeck(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ vocabId, inDeck }: { vocabId: string, inDeck: boolean }) => {
      if (inDeck)
        await removeVocabFromDeck(userId, vocabId)
      else
        await addVocabToDeck(userId, vocabId)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['active-deck-vocab', userId] })
      qc.invalidateQueries({ queryKey: ['active-deck-due', userId] })
    },
    retry: 0,
  })
}

export function useToggleKanjiInDeck(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ char, inDeck }: { char: string, inDeck: boolean }) => {
      if (inDeck)
        await removeKanjiFromDeck(userId, char)
      else
        await addKanjiToDeck(userId, char)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['active-deck-kanji', userId] })
      qc.invalidateQueries({ queryKey: ['active-deck-due', userId] })
    },
    retry: 0,
  })
}

export function useClearVocabDeck(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => clearVocabDeck(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['active-deck-vocab', userId] })
      qc.invalidateQueries({ queryKey: ['active-deck-due', userId] })
    },
    retry: 0,
  })
}

export function useClearKanjiDeck(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => clearKanjiDeck(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['active-deck-kanji', userId] })
      qc.invalidateQueries({ queryKey: ['active-deck-due', userId] })
    },
    retry: 0,
  })
}
