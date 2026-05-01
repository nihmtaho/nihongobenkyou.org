import type { LessonMeta } from '../types/dataset'
import { useQuery } from '@tanstack/react-query'
import { db } from '../db/schema'

export interface LessonVocabStats extends LessonMeta {
  new: number
  learning: number
  review: number
  mature: number
  due: number
  next_due_date: string | null
}

export async function fetchVocabLessonStats(userId: string, bookSource: string): Promise<LessonVocabStats[]> {
  if (!userId)
    return []

  const [lessons, allVocab] = await Promise.all([
    db.lessons.where('book_source').equals(bookSource).sortBy('lesson_number'),
    db.vocabulary.where('book_source').equals(bookSource).toArray(),
  ])

  const vocabIdsByLesson = new Map<number, string[]>()
  for (const v of allVocab) {
    const arr = vocabIdsByLesson.get(v.lesson_number) ?? []
    arr.push(v.vocab_id)
    vocabIdsByLesson.set(v.lesson_number, arr)
  }

  const allIds = allVocab.map(v => v.vocab_id)
  const cards = allIds.length > 0
    ? await db.user_cards
        .where('[userId+vocabId]')
        .anyOf(allIds.map(id => [userId, id]))
        .toArray()
    : []

  const cardMap = new Map(cards.map(c => [c.vocabId, c]))
  const today = new Date().toISOString().slice(0, 10)

  return lessons.map((lesson) => {
    const vocabIds = vocabIdsByLesson.get(lesson.lesson_number) ?? []
    const lessonCards = vocabIds.flatMap((id) => {
      const c = cardMap.get(id)
      return c ? [c] : []
    })

    return {
      ...lesson,
      new: Math.max(0, vocabIds.length - lessonCards.length),
      learning: lessonCards.filter(c => c.interval_days < 8 && !c.is_known).length,
      review: lessonCards.filter(c => c.interval_days >= 8 && c.interval_days < 21 && !c.is_known).length,
      mature: lessonCards.filter(c => c.interval_days >= 21 || c.is_known).length,
      due: lessonCards.filter(c => !c.is_known && c.due_date <= today).length,
      next_due_date: lessonCards
        .filter(c => !c.is_known && c.due_date > today)
        .map(c => c.due_date)
        .sort()[0] ?? null,
    }
  })
}

export function useVocabLessonStats(userId: string, bookSource: string) {
  return useQuery<LessonVocabStats[]>({
    queryKey: ['vocab-lesson-stats', userId, bookSource],
    queryFn: () => fetchVocabLessonStats(userId, bookSource),
    staleTime: 0,
    enabled: !!userId && !!bookSource,
  })
}
