import { useQuery } from '@tanstack/react-query'
import { db } from '../db/schema'
import { SRS_THRESHOLDS } from '../lib/srs-constants'

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
  vocabLearning: number
  vocabReview: number
  vocabMature: number
  kanjiLearning: number
  kanjiReview: number
  kanjiMature: number
  customDecksLearning: number
  customDecksReview: number
  customDecksMature: number
  vocabDueTomorrow: number
  vocabDueThisWeek: number
  vocabDue21Days: number
  kanjiDueTomorrow: number
  kanjiDueThisWeek: number
  kanjiDue21Days: number
  nextDueLaterTodayMs: number | null
  nextDueTomorrowMs: number | null
  nextDueThisWeekMs: number | null
  nextDue21DaysMs: number | null
  customDecksDueToday: number
  customDecksDueTomorrow: number
  customDecksDueThisWeek: number
  customDecksDue21Days: number
}

export function useUnifiedDueStats(userId: string) {
  return useQuery<UnifiedDueStats>({
    queryKey: ['unified-due-stats', userId],
    queryFn: async () => {
      const now = new Date()
      const todayDate = now.toISOString().slice(0, 10)
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      const days21End = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

      const allKanji = await db.kanji.toArray()
      const rvIdSet = new Set<string>()
      for (const k of allKanji) {
        if (k.lesson_number == null)
          continue
        for (const rv of k.related_vocab ?? []) {
          rvIdSet.add(`rv_${k.lesson_number}_${rv.word ?? rv.kana}_${rv.kana}`)
        }
      }

      const allUserCards = await db.srs_cards
        .filter(c => c.userId === userId && !c.is_known)
        .toArray()

      const vocabCards = allUserCards.filter(c => c.cardType === 'vocab' && !rvIdSet.has(c.cardId))
      const kanjiVocabCards = allUserCards.filter(c => c.cardType === 'vocab' && rvIdSet.has(c.cardId))
      const kanjiCards = allUserCards.filter(c => c.cardType === 'kanji')
      const customCards = allUserCards.filter(c => c.cardType === 'custom_vocab')

      const vocabDue = vocabCards.filter(c => c.due <= todayDate).length
      const kanjiVocabDue = kanjiVocabCards.filter(c => c.due <= todayDate).length
      const kanjiDue = kanjiCards.filter(c => c.due <= todayDate).length
      const customDeckDue = customCards.filter(c => c.due <= todayDate).length

      const allCards = [...vocabCards, ...kanjiVocabCards, ...kanjiCards]
      const learning = allCards.filter(c => c.scheduled_days < SRS_THRESHOLDS.learning).length
        + customCards.filter(c => c.reps >= 1 && c.scheduled_days < SRS_THRESHOLDS.learning).length
      const review = allCards.filter(c => c.scheduled_days >= SRS_THRESHOLDS.learning && c.scheduled_days < SRS_THRESHOLDS.review).length
        + customCards.filter(c => c.scheduled_days >= SRS_THRESHOLDS.learning && c.scheduled_days < SRS_THRESHOLDS.review).length
      const mature = allCards.filter(c => c.scheduled_days >= SRS_THRESHOLDS.review).length
        + customCards.filter(c => c.scheduled_days >= SRS_THRESHOLDS.review).length

      // NOTE: kanjiVocabCards (vocab-type cards linked to kanji entries) are intentionally
      // excluded from per-type buckets. They appear in the global learning/review/mature
      // totals but not in vocabLearning/kanjiLearning etc., consistent with how vocabDue
      // and kanjiDue are scoped.
      const vocabLearning = vocabCards.filter(c => c.scheduled_days < SRS_THRESHOLDS.learning).length
      const vocabReview = vocabCards.filter(c => c.scheduled_days >= SRS_THRESHOLDS.learning && c.scheduled_days < SRS_THRESHOLDS.review).length
      const vocabMature = vocabCards.filter(c => c.scheduled_days >= SRS_THRESHOLDS.review).length

      const kanjiLearning = kanjiCards.filter(c => c.scheduled_days < SRS_THRESHOLDS.learning).length
      const kanjiReview = kanjiCards.filter(c => c.scheduled_days >= SRS_THRESHOLDS.learning && c.scheduled_days < SRS_THRESHOLDS.review).length
      const kanjiMature = kanjiCards.filter(c => c.scheduled_days >= SRS_THRESHOLDS.review).length

      const customDecksLearning = customCards.filter(c => c.reps >= 1 && c.scheduled_days < SRS_THRESHOLDS.learning).length
      const customDecksReview = customCards.filter(c => c.scheduled_days >= SRS_THRESHOLDS.learning && c.scheduled_days < SRS_THRESHOLDS.review).length
      const customDecksMature = customCards.filter(c => c.scheduled_days >= SRS_THRESHOLDS.review).length

      // Per-type upcoming
      const vocabFuture = vocabCards.filter(c => c.due > todayDate)
      const kanjiFuture = kanjiCards.filter(c => c.due > todayDate)

      const vocabDueTomorrow = vocabFuture.filter(c => c.due === tomorrow).length
      const vocabDueThisWeek = vocabFuture.filter(c => c.due > tomorrow && c.due <= weekEnd).length
      const vocabDue21Days = vocabFuture.filter(c => c.due > weekEnd && c.due <= days21End).length

      const kanjiDueTomorrow = kanjiFuture.filter(c => c.due === tomorrow).length
      const kanjiDueThisWeek = kanjiFuture.filter(c => c.due > tomorrow && c.due <= weekEnd).length
      const kanjiDue21Days = kanjiFuture.filter(c => c.due > weekEnd && c.due <= days21End).length

      const dueToday = vocabDue + kanjiVocabDue + kanjiDue + customDeckDue

      // All non-due upcoming cards (due date after today — date comparison only)
      const allDueFuture = allCards.filter(c => c.due > todayDate)

      const dueLaterToday = 0 // FSRS uses date-only due, so no intra-day bucket
      const dueTomorrow = allDueFuture.filter(c => c.due === tomorrow).length
      const dueThisWeek = allDueFuture.filter(c => c.due > tomorrow && c.due <= weekEnd).length
      const due21Days = allDueFuture.filter(c => c.due > weekEnd && c.due <= days21End).length

      const customFuture = customCards.filter(r => r.due > todayDate)
      const customDecksDueTomorrow = customFuture.filter(r => r.due === tomorrow).length
      const customDecksDueThisWeek = customFuture.filter(r => r.due > tomorrow && r.due <= weekEnd).length
      const customDecksDue21Days = customFuture.filter(r => r.due > weekEnd && r.due <= days21End).length

      function earliestMs(cards: Array<{ due: string }>): number | null {
        if (cards.length === 0)
          return null
        return Math.min(...cards.map(c => new Date(c.due).getTime()))
      }

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
        vocabLearning,
        vocabReview,
        vocabMature,
        kanjiLearning,
        kanjiReview,
        kanjiMature,
        customDecksLearning,
        customDecksReview,
        customDecksMature,
        vocabDueTomorrow,
        vocabDueThisWeek,
        vocabDue21Days,
        kanjiDueTomorrow,
        kanjiDueThisWeek,
        kanjiDue21Days,
        nextDueLaterTodayMs: null,
        nextDueTomorrowMs: earliestMs(allDueFuture.filter(c => c.due === tomorrow)),
        nextDueThisWeekMs: earliestMs(allDueFuture.filter(c => c.due > tomorrow && c.due <= weekEnd)),
        nextDue21DaysMs: earliestMs(allDueFuture.filter(c => c.due > weekEnd && c.due <= days21End)),
        customDecksDueToday: customDeckDue,
        customDecksDueTomorrow,
        customDecksDueThisWeek,
        customDecksDue21Days,
      }
    },
    staleTime: 0,
    enabled: !!userId,
  })
}
