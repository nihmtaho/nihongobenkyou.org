import type { VocabItem } from '../types/vocabulary'
import { useQuery } from '@tanstack/react-query'
import { db } from '../db/schema'

export function useVocabulary(bookSource: string, lessonNumber: number) {
  return useQuery<VocabItem[]>({
    queryKey: ['vocabulary', bookSource, lessonNumber],
    queryFn: () =>
      db.vocabulary
        .where('[book_source+lesson_number]')
        .equals([bookSource, lessonNumber])
        .toArray(),
    staleTime: Infinity,
  })
}
