import type { StudyMode, TypeInputSubMode } from '../types/study'
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
  ) {
    if (isLaunching || !userId)
      return
    setIsLaunching(true)

    try {
      const today = new Date().toISOString().slice(0, 10)
      const timestamp = new Date().toISOString()

      const allVocab = await db.vocabulary
        .where('[book_source+lesson_number]')
        .equals([bookSource, lessonNumber])
        .toArray()

      if (allVocab.length === 0)
        return

      const vocabIds = allVocab.map(v => v.vocab_id)
      const cards = await db.user_cards
        .where('[userId+vocabId]')
        .anyOf(vocabIds.map(id => [userId, id]))
        .toArray()

      const cardMap = new Map(cards.map(c => [c.vocabId, c]))

      const queue: VocabWithSRS[] = allVocab.flatMap((v) => {
        const c = cardMap.get(v.vocab_id)

        if (dueOnly) {
          if (!c || c.due_date > today || c.is_known)
            return []
          return [{ ...v, ...c }]
        }

        if (c)
          return [{ ...v, ...c }]

        return [{
          ...v,
          userId,
          vocabId: v.vocab_id,
          interval_days: 0,
          ease_factor: 2.5,
          due_date: today,
          review_count: 0,
          last_rating: null,
          pending_sync: false,
          updated_at: timestamp,
          is_known: false,
        }]
      })

      if (queue.length === 0)
        return

      initSession(queue, mode, subMode)
      navigate({ to: '/study/$mode', params: { mode } })
    }
    finally {
      setIsLaunching(false)
    }
  }

  return launch
}
