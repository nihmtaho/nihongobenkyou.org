import type { LessonMeta } from '../types/dataset'

import { useQuery } from '@tanstack/react-query'

import { db } from '../db/schema'

export function useLessons(bookSource: string) {
  return useQuery<LessonMeta[]>({
    queryKey: ['lessons', bookSource],
    queryFn: () =>
      db.lessons
        .where('book_source')
        .equals(bookSource)
        .sortBy('lesson_number'),
    staleTime: Infinity,
  })
}
