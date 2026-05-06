import { useQuery } from '@tanstack/react-query'

import { getDueKanjiCards } from '../db/kanji'
import { db } from '../db/schema'

export interface UnifiedDueStats {
  dueToday: number
  dueLaterToday: number
  dueTomorrow: number
  dueThisWeek: number
  due21Days: number
  vocabDue: number
  kanjiDue: number
  kanjiVocabDue: number
  learning: number
  review: number
  mature: number
  nextDueLaterTodayMs: number | null
  nextDueTomorrowMs: number | null
  nextDueThisWeekMs: number | null
  nextDue21DaysMs: number | null
}

export function useUnifiedDueStats(userId: string) {
  return useQuery<UnifiedDueStats>({
    queryKey: ['unified-due-stats', userId],
    queryFn: async () => {
      const now = new Date()
      const todayISO = now.toISOString()
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

      const allKanji = await db.kanji.toArray()
      const rvIdSet = new Set<string>()
      for (const k of allKanji) {
        if (k.lesson_number == null)
          continue
        for (const rv of k.related_vocab ?? []) {
          rvIdSet.add(`rv_${k.lesson_number}_${rv.word ?? rv.kana}_${rv.kana}`)
        }
      }

      const [vocabCards, kanjiCards] = await Promise.all([
        db.user_cards.filter(c => c.userId === userId && !c.is_known).toArray(),
        getDueKanjiCards(userId, todayISO),
      ])

      const regularVocab = vocabCards.filter(c => !rvIdSet.has(c.vocabId))
      const kanjiVocabCards = vocabCards.filter(c => rvIdSet.has(c.vocabId))

      const vocabDue = regularVocab.filter(c => c.due_date <= todayISO).length
      const kanjiVocabDue = kanjiVocabCards.filter(c => c.due_date <= todayISO).length
      const kanjiDue = kanjiCards.length

      const allCards = [...regularVocab, ...kanjiVocabCards]
      const learning = allCards.filter(c => c.interval_days < 8).length
      const review = allCards.filter(c => c.interval_days >= 8 && c.interval_days < 21).length
      const mature = allCards.filter(c => c.interval_days >= 21 || c.is_known).length

      const dueToday = vocabDue + kanjiVocabDue + kanjiDue

      const todayDate = todayISO.slice(0, 10)
      const allDueFuture = [
        ...regularVocab.filter(c => c.due_date > todayISO),
        ...kanjiVocabCards.filter(c => c.due_date > todayISO),
      ]
      // Cards in learning steps (e.g. 6 min, 1 hr) have a full datetime due later today.
      // They pass the `> todayISO` check but their date portion equals today — not tomorrow.
      const dueLaterToday = allDueFuture.filter(c => c.due_date.slice(0, 10) === todayDate).length
      const dueTomorrow = allDueFuture.filter(c => c.due_date.slice(0, 10) === tomorrow).length
      const dueThisWeek = allDueFuture.filter(c => c.due_date.slice(0, 10) > tomorrow && c.due_date.slice(0, 10) <= weekEnd).length

      // 21 days window: after weekEnd up to 21 days from now
      const days21End = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      const due21Days = allDueFuture.filter(c => c.due_date.slice(0, 10) > weekEnd && c.due_date.slice(0, 10) <= days21End).length

      // Earliest due times per bucket (for countdown display in UI)
      const laterTodayCards = allDueFuture.filter(c => c.due_date.slice(0, 10) === todayDate)
      const tomorrowCards = allDueFuture.filter(c => c.due_date.slice(0, 10) === tomorrow)
      const thisWeekCards = allDueFuture.filter(c => c.due_date.slice(0, 10) > tomorrow && c.due_date.slice(0, 10) <= weekEnd)
      const next21DaysCards = allDueFuture.filter(c => c.due_date.slice(0, 10) > weekEnd && c.due_date.slice(0, 10) <= days21End)

      function earliestMs(cards: typeof allDueFuture): number | null {
        if (cards.length === 0)
          return null
        return Math.min(...cards.map(c => new Date(c.due_date).getTime()))
      }

      const nextDueLaterTodayMs = earliestMs(laterTodayCards)
      const nextDueTomorrowMs = earliestMs(tomorrowCards)
      const nextDueThisWeekMs = earliestMs(thisWeekCards)
      const nextDue21DaysMs = earliestMs(next21DaysCards)

      return {
        dueToday,
        dueLaterToday,
        dueTomorrow,
        dueThisWeek,
        due21Days,
        vocabDue,
        kanjiDue,
        kanjiVocabDue,
        learning,
        review,
        mature,
        nextDueLaterTodayMs,
        nextDueTomorrowMs,
        nextDueThisWeekMs,
        nextDue21DaysMs,
      }
    },
    staleTime: 0,
    enabled: !!userId,
  })
}
