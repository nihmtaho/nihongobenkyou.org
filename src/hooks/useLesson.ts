import type { LessonMeta } from '../types/dataset'
import { useQuery } from '@tanstack/react-query'
import { db } from '../db/schema'

export function useLesson(lessonId: string) {
  return useQuery<LessonMeta | undefined>({
    queryKey: ['lesson', lessonId],
    queryFn: () => db.lessons.get(lessonId),
    staleTime: Infinity,
  })
}
