import type { RelatedVocabItem } from '../types/kanji'
import type { StudyMode } from '../types/study'
import type { SRSCard } from '../types/srs'
import type { CardTypeFilter, UnifiedCard } from '../types/unified-card'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { db } from '../db/schema'
import { useStudySessionStore } from '../stores/studySessionStore'

function makeDefaultSRSCard(userId: string, cardId: string, cardType: SRSCard['cardType'], today: string, now: string): SRSCard {
  return {
    userId,
    cardId,
    cardType,
    deckId:              null,
    state:               'new',
    stability:           0,
    difficulty:          0,
    elapsed_days:        0,
    scheduled_days:      0,
    reps:                0,
    lapses:              0,
    last_review:         today,
    due:                 today,
    last_rating:         null,
    is_known:            false,
    consecutive_correct: 0,
    pending_sync:        false,
    updated_at:          now,
  }
}

export function useLaunchKanjiLessonSession(userId: string) {
  const navigate = useNavigate()
  const initSession = useStudySessionStore(s => s.initSession)
  const [isLaunching, setIsLaunching] = useState(false)

  async function launch(
    lessonNumber: number,
    type: 'kanji' | 'vocab',
    dueOnly: boolean,
    mode: StudyMode = 'flashcard',
  ) {
    if (isLaunching || !userId)
      return
    setIsLaunching(true)
    try {
      const now = new Date().toISOString()
      const today = now.slice(0, 10)
      const queue: UnifiedCard[] = []

      const allKanji = await db.kanji
        .where('lesson_number')
        .equals(lessonNumber)
        .toArray()

      if (type === 'kanji') {
        const chars = allKanji.map(k => k.char)
        const cards = await db.srs_cards
          .where('[userId+cardType]')
          .equals([userId, 'kanji'])
          .filter(c => chars.includes(c.cardId))
          .toArray()
        const cardMap = new Map(cards.map(c => [c.cardId, c]))

        for (const kanji of allKanji) {
          const card = cardMap.get(kanji.char)
          if (dueOnly && (!card || card.due > today))
            continue
          queue.push({
            kind: 'kanji',
            card: card ?? makeDefaultSRSCard(userId, kanji.char, 'kanji', today, now),
            kanji,
          })
        }
      }

      if (type === 'vocab') {
        const rvEntries: Array<{ id: string, rv: RelatedVocabItem, lessonNumber: number }> = []
        for (const k of allKanji) {
          for (const rv of k.related_vocab ?? []) {
            const id = `rv_${lessonNumber}_${rv.word ?? rv.kana}_${rv.kana}`
            rvEntries.push({ id, rv, lessonNumber })
          }
        }
        const cards = await db.srs_cards
          .where('[userId+cardId]')
          .anyOf(rvEntries.map(r => [userId, r.id]))
          .toArray()
        const cardMap = new Map(cards.map(c => [c.cardId, c]))

        for (const { id, rv, lessonNumber: ln } of rvEntries) {
          const card = cardMap.get(id)
          if (dueOnly && (!card || card.due > today))
            continue
          queue.push({
            kind: 'kanji-vocab',
            card: card ?? makeDefaultSRSCard(userId, id, 'vocab', today, now),
            rv,
            lessonNumber: ln,
          })
        }
      }

      if (queue.length === 0)
        return

      const shuffled = [...queue].sort(() => Math.random() - 0.5)
      const filter: CardTypeFilter = type === 'kanji' ? 'kanji' : 'vocab'
      initSession(shuffled, mode, undefined, 'lesson', filter)
      navigate({ to: '/study/review', search: { filter } })
    }
    finally {
      setIsLaunching(false)
    }
  }

  return { launch, isLaunching }
}
