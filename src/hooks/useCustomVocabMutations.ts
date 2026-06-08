import type { CustomVocabItem, ParsedVocabItem } from '../types/custom-deck'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { addWords, deleteWord, updateWord } from '../db/custom-decks-local'
import { CUSTOM_DECKS_KEY } from './useCustomDecks'
import { DECK_WORDS_KEY } from './useCustomDeckWords'

export function useCustomVocabMutations(deckId: string, userId: string) {
  const qc = useQueryClient()

  function invalidate() {
    qc.invalidateQueries({ queryKey: DECK_WORDS_KEY(deckId) })
    qc.invalidateQueries({ queryKey: CUSTOM_DECKS_KEY(userId) })
    qc.invalidateQueries({ queryKey: ['custom-deck-progress', userId, deckId] })
  }

  const addWordsMutation = useMutation({
    mutationFn: ({
      items,
      source,
    }: {
      items: ParsedVocabItem[]
      source?: 'manual' | 'json' | 'csv'
    }) => addWords(deckId, userId, items, source),
    onSuccess: () => invalidate(),
    onError: (err: Error) => {
      if (err.message.startsWith('WORD_LIMIT_REACHED')) {
        const [, max, remaining] = err.message.split(':')
        toast.error(`Giới hạn ${max} từ/deck. Còn ${remaining} chỗ trống.`)
      }
      else {
        toast.error('Không thêm được từ. Vui lòng thử lại.')
      }
    },
  })

  const deleteWordMutation = useMutation({
    mutationFn: (wordId: string) => deleteWord(wordId, deckId, userId),
    onSuccess: () => invalidate(),
  })

  const updateWordMutation = useMutation({
    mutationFn: ({
      wordId,
      updates,
    }: {
      wordId: string
      updates: Partial<Pick<CustomVocabItem, 'kana' | 'kanji' | 'han_viet' | 'meaning_vi'>>
    }) => updateWord(wordId, updates),
    onSuccess: () => invalidate(),
  })

  return {
    addWords: addWordsMutation,
    deleteWord: deleteWordMutation,
    updateWord: updateWordMutation,
  }
}
