import { useQuery } from '@tanstack/react-query'
import { getPassagesForLesson } from '../db/passages'

export function usePassages(bookSource: string, lessonNumber: number) {
  return useQuery({
    queryKey: ['passages', bookSource, lessonNumber],
    queryFn: () => getPassagesForLesson(bookSource, lessonNumber),
    staleTime: Infinity,
  })
}
