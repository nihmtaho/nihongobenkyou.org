import type { VocabItem } from '../types/vocabulary'
import { useQuery } from '@tanstack/react-query'
import { db } from '../db/schema'

export function useVocabulary(bookSource: string, lessonNumber: number) {
  return useQuery<VocabItem[]>({
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
}
