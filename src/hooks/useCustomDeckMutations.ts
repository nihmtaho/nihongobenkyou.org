import type { CustomDeck } from '../types/custom-deck'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createDeck,
  deleteDeck,
  updateDeck,
} from '../api/custom-decks'
import { addWord, deleteWord } from '../api/custom-vocabulary'

export function useCustomDeckMutations(userId: string) {
  const queryClient = useQueryClient()

  const invalidateDecks = () =>
    queryClient.invalidateQueries({ queryKey: ['custom-decks', userId] })

  const invalidateWords = (deckId: string) =>
    queryClient.invalidateQueries({ queryKey: ['custom-vocabulary', deckId] })

  const createDeckMutation = useMutation({
    mutationFn: (input: { title: string, description?: string }) =>
      createDeck(userId, input),
    onSuccess: () => invalidateDecks(),
  })

  const updateDeckMutation = useMutation({
    mutationFn: ({
      deckId,
      updates,
    }: {
      deckId: string
      updates: Partial<Pick<CustomDeck, 'title' | 'description' | 'is_public'>>
    }) => updateDeck(deckId, updates),
    onSuccess: () => invalidateDecks(),
  })

  const deleteDeckMutation = useMutation({
    mutationFn: (deckId: string) => deleteDeck(deckId),
    onSuccess: () => invalidateDecks(),
  })

  const addWordMutation = useMutation({
    mutationFn: ({
      deckId,
      input,
    }: {
      deckId: string
      input: { kana: string, kanji?: string, meaning_vi: string, meaning_en?: string }
    }) => addWord(deckId, userId, input),
    onSuccess: (_, { deckId }) => {
      invalidateWords(deckId)
      invalidateDecks()
    },
  })

  const deleteWordMutation = useMutation({
    mutationFn: ({ wordId, deckId }: { wordId: string, deckId: string }) =>
      deleteWord(wordId).then(() => deckId),
    onSuccess: (deckId) => {
      invalidateWords(deckId)
      invalidateDecks()
    },
  })

  const refreshDeckAndWords = (deckId: string) => {
    invalidateDecks()
    invalidateWords(deckId)
  }

  return {
    createDeck: createDeckMutation,
    updateDeck: updateDeckMutation,
    deleteDeck: deleteDeckMutation,
    addWord: addWordMutation,
    deleteWord: deleteWordMutation,
    refresh: refreshDeckAndWords,
  }
}
