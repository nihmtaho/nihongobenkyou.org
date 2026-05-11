import type { VocabItem } from '../types/vocabulary'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { db } from '../db/schema'
import { useHiddenVocab } from './useHiddenVocab'

export function useVocabulary(bookSource: string, lessonNumber: number, userId: string) {
  const hiddenIds = useHiddenVocab(userId, 'lesson')
  const query = useQuery<VocabItem[]>({
    queryKey: ['vocabulary', bookSource, lessonNumber],
    queryFn: async () => {
      const items = await db.vocabulary
        .where('[book_source+lesson_number]')
        .equals([bookSource, lessonNumber])
        .toArray()
      return items.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    },
    staleTime: Infinity,
  })
  return {
    ...query,
    data: useMemo(
      () => query.data?.filter(item => !hiddenIds.has(item.vocab_id)),
      [query.data, hiddenIds],
    ),
  }
}
