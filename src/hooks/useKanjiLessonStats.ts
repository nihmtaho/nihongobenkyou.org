import { useQuery } from '@tanstack/react-query'
import { db } from '../db/schema'

export interface KanjiLessonSRSStats {
  total: number
  new: number
  learning: number
  review: number
  mature: number
  due: number
  next_due_date: string | null
}

export interface KanjiLessonStats {
  lessonNumber: number
  kanji: KanjiLessonSRSStats
  vocab: KanjiLessonSRSStats
}

export function useKanjiLessonStats(userId: string) {
  return useQuery<KanjiLessonStats[]>({
    queryKey: ['kanji-lesson-stats', userId],
    queryFn: async () => {
      if (!userId)
        return []

      const [allKanji, allKanjiCards] = await Promise.all([
        db.kanji.toArray(),
        db.srs_cards
          .where('[userId+cardType]')
          .equals([userId, 'kanji'])
          .toArray(),
      ])

      const now = new Date().toISOString().slice(0, 10)
      const kanjiCardMap = new Map(allKanjiCards.map(c => [c.cardId, c]))

      const kanjiByLesson = new Map<number, typeof allKanji>()
      for (const k of allKanji) {
        if (k.lesson_number == null)
          continue
        const arr = kanjiByLesson.get(k.lesson_number) ?? []
        arr.push(k)
        kanjiByLesson.set(k.lesson_number, arr)
      }

      const rvIdsByLesson = new Map<number, string[]>()
      for (const [lesson, kanjiItems] of kanjiByLesson) {
        const seen = new Set<string>()
        const ids: string[] = []
        for (const k of kanjiItems) {
          for (const rv of k.related_vocab ?? []) {
            const id = `rv_${lesson}_${rv.word ?? rv.kana}_${rv.kana}`
            if (!seen.has(id)) {
              seen.add(id)
              ids.push(id)
            }
          }
        }
        rvIdsByLesson.set(lesson, ids)
      }

      const allRvIds = [...new Set([...rvIdsByLesson.values()].flat())]
      const rvCards = allRvIds.length > 0
        ? await db.srs_cards
            .filter(c => c.userId === userId && c.cardType === 'vocab' && allRvIds.includes(c.cardId))
            .toArray()
        : []
      const rvCardMap = new Map(rvCards.map(c => [c.cardId, c]))

      const lessonNumbers = [...kanjiByLesson.keys()].sort((a, b) => a - b)

      function computeKanjiStats(chars: string[]): KanjiLessonSRSStats {
        const cardList = chars.flatMap(c => { const card = kanjiCardMap.get(c); return card ? [card] : [] })
        return {
          total: chars.length,
          new:      chars.length - cardList.length,
          learning: cardList.filter(c => c.scheduled_days < 8).length,
          review:   cardList.filter(c => c.scheduled_days >= 8 && c.scheduled_days < 21).length,
          mature:   cardList.filter(c => c.scheduled_days >= 21).length,
          due:      cardList.filter(c => c.due <= now).length,
          next_due_date: cardList.filter(c => c.due > now).map(c => c.due).sort()[0] ?? null,
        }
      }

      function computeRvVocabStats(rvIds: string[]): KanjiLessonSRSStats {
        const cardList = rvIds.flatMap(id => { const card = rvCardMap.get(id); return card ? [card] : [] })
        return {
          total:    rvIds.length,
          new:      rvIds.length - cardList.length,
          learning: cardList.filter(c => c.scheduled_days < 8 && !c.is_known).length,
          review:   cardList.filter(c => c.scheduled_days >= 8 && c.scheduled_days < 21 && !c.is_known).length,
          mature:   cardList.filter(c => c.scheduled_days >= 21 || c.is_known).length,
          due:      cardList.filter(c => !c.is_known && c.due <= now).length,
          next_due_date: cardList.filter(c => !c.is_known && c.due > now).map(c => c.due).sort()[0] ?? null,
        }
      }

      return lessonNumbers.map((lessonNumber) => {
        const kanjiItems = kanjiByLesson.get(lessonNumber) ?? []
        const chars = kanjiItems.map(k => k.char)
        const rvIds = rvIdsByLesson.get(lessonNumber) ?? []

        return {
          lessonNumber,
          kanji: computeKanjiStats(chars),
          vocab: computeRvVocabStats(rvIds),
        }
      })
    },
    staleTime: 0,
    enabled: !!userId,
  })
}
