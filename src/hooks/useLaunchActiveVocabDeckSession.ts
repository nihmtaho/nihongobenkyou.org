import type { SRSRating } from '../types/srs'
import type { StudyMode, TypeInputSubMode } from '../types/study'
import type { VocabWithSRS } from '../types/vocabulary'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { getActiveDeckVocab, getActiveDeckVocabSRSMap } from '../db/active-deck'
import { db } from '../db/schema'
import { useStudySessionStore } from '../stores/studySessionStore'

export function useLaunchActiveVocabDeckSession(userId: string) {
  const navigate = useNavigate()
  const initSession = useStudySessionStore(s => s.initSession)
  const [isLaunching, setIsLaunching] = useState(false)

  async function launch(
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

      const [deckItems, srsMap] = await Promise.all([
        getActiveDeckVocab(userId),
        getActiveDeckVocabSRSMap(userId),
      ])

      if (deckItems.length === 0)
        return

      const vocabRows = await db.vocabulary.bulkGet(deckItems.map(i => i.vocab_id))
      const vocabMap = new Map(
        vocabRows.filter(Boolean).map(v => [v!.vocab_id, v!]),
      )

      const queue: VocabWithSRS[] = deckItems.flatMap((item) => {
        const vocab = vocabMap.get(item.vocab_id)
        if (!vocab)
          return []
        const srs = srsMap.get(item.vocab_id)

        if (dueOnly && srs && srs.due_date > today)
          return []

        // SRS defaults match addVocabToDeck initial state — srs is always present for deck items.
        // Fallbacks guard against edge-case timing gaps only.
        return [{
          ...vocab,
          userId,
          vocabId: vocab.vocab_id,
          interval_days: srs?.interval_days ?? 1,
          ease_factor: srs?.ease_factor ?? 2.5,
          due_date: srs?.due_date ?? today,
          review_count: srs?.review_count ?? 0,
          last_rating: (srs?.last_rating ?? null) as SRSRating | null,
          pending_sync: false,
          updated_at: srs?.updated_at ?? timestamp,
          is_known: false,
          consecutive_correct: 0,
        }]
      })

      if (queue.length === 0)
        return

      const shuffled = [...queue].sort(() => Math.random() - 0.5)
      initSession(shuffled, mode, subMode, 'active-vocab-deck')
      navigate({ to: '/study/$mode', params: { mode }, search: { returnTab: 'vocab' } })
    }
    finally {
      setIsLaunching(false)
    }
  }

  return { launch, isLaunching }
}
