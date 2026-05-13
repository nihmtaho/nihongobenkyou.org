import type { ActiveTab } from '../components/study/study.config'
import type { StudyMode, TypeInputSubMode } from '../types/study'
import type { UnifiedCard } from '../types/unified-card'
import type { VocabWithSRS } from '../types/vocabulary'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { db } from '../db/schema'
import { useStudySessionStore } from '../stores/studySessionStore'

export function useLaunchVocabSession(userId: string) {
  const navigate = useNavigate()
  const initSession = useStudySessionStore(s => s.initSession)
  const [isLaunching, setIsLaunching] = useState(false)

  async function launch(
    bookSource: string,
    lessonNumber: number,
    dueOnly: boolean,
    mode: StudyMode = 'flashcard',
    subMode?: TypeInputSubMode,
    order?: 'random' | 'sequential',
    _returnTab?: ActiveTab,
  ) {
    if (isLaunching || !userId)
      return
    setIsLaunching(true)

    try {
      const today = new Date().toISOString().slice(0, 10)
      const now = new Date().toISOString()

      const allVocab = await db.vocabulary
        .where('[book_source+lesson_number]')
        .equals([bookSource, lessonNumber])
        .toArray()

      if (allVocab.length === 0)
        return

      const vocabIds = allVocab.map(v => v.vocab_id)
      const cards = await db.srs_cards
        .where('[userId+cardId]')
        .anyOf(vocabIds.map(id => [userId, id]))
        .toArray()

      const cardMap = new Map(cards.map(c => [c.cardId, c]))

      const queue: VocabWithSRS[] = allVocab.flatMap((v): VocabWithSRS[] => {
        const c = cardMap.get(v.vocab_id)

        if (dueOnly) {
          if (!c || c.due > today || c.is_known)
            return []
          return [{ ...v, ...c }]
        }

        if (c) {
          if (c.is_known)
            return []
          return [{ ...v, ...c }]
        }

        // New card with FSRS defaults
        return [{
          ...v,
          userId,
          cardId: v.vocab_id,
          cardType: 'vocab' as const,
          deckId: null,
          state: 'new' as const,
          stability: 0,
          difficulty: 0,
          elapsed_days: 0,
          scheduled_days: 0,
          reps: 0,
          lapses: 0,
          last_review: today,
          due: today,
          last_rating: null,
          pending_sync: false,
          updated_at: now,
          is_known: false,
          consecutive_correct: 0,
        }]
      })

      if (queue.length === 0)
        return

      const finalQueue = (order === 'sequential' ? queue : [...queue].sort(() => Math.random() - 0.5))
        .map((card): UnifiedCard => ({ kind: 'vocab', card }))
      initSession(finalQueue, mode, subMode, 'lesson', 'vocab')
      navigate({ to: '/study/review', search: { filter: 'vocab' } })
    }
    finally {
      setIsLaunching(false)
    }
  }

  return launch
}
