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
    ? await db.srs_cards
        .where('[userId+cardId]')
        .between([userId, ''], [userId, '￿'], true, true)
        .filter(c => c.cardType === 'vocab' && allIds.includes(c.cardId))
        .toArray()
    : []

  const cardMap = new Map(cards.map(c => [c.cardId, c]))
  const now = new Date().toISOString().slice(0, 10)

  return lessons.map((lesson) => {
    const vocabIds = vocabIdsByLesson.get(lesson.lesson_number) ?? []
    const lessonCards = vocabIds.flatMap((id) => {
      const c = cardMap.get(id)
      return c ? [c] : []
    })

    return {
      ...lesson,
      new:      Math.max(0, vocabIds.length - lessonCards.length),
      learning: lessonCards.filter(c => c.scheduled_days < 8 && !c.is_known).length,
      review:   lessonCards.filter(c => c.scheduled_days >= 8 && c.scheduled_days < 21 && !c.is_known).length,
      mature:   lessonCards.filter(c => c.scheduled_days >= 21 || c.is_known).length,
      due:      lessonCards.filter(c => !c.is_known && c.due <= now).length,
      next_due_date: lessonCards
        .filter(c => !c.is_known && c.due > now)
        .map(c => c.due)
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
