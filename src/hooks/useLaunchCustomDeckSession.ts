import type { SRSRating } from '../types/srs'
import type { CustomDeck } from '../types/custom-deck'
import type { StudyMode, TypeInputSubMode } from '../types/study'
import type { VocabWithSRS } from '../types/vocabulary'
import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { getDeckWords, updateDeck } from '../db/custom-decks-local'
import { db } from '../db/schema'
import { useStudySessionStore } from '../stores/studySessionStore'
import { CUSTOM_DECKS_KEY } from './useCustomDecks'

export function useLaunchCustomDeckSession(userId: string) {
  const navigate = useNavigate()
  const initSession = useStudySessionStore(s => s.initSession)
  const qc = useQueryClient()
  const [isLaunching, setIsLaunching] = useState(false)

  async function launch(
    deck: CustomDeck,
    mode: StudyMode,
    subMode?: TypeInputSubMode,
    cardCount: number | 'all' = 'all',
  ) {
    if (isLaunching || !userId)
      return
    setIsLaunching(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const now = new Date().toISOString()

      if (!deck.is_active) {
        await updateDeck(deck.id, { is_active: true })
        qc.invalidateQueries({ queryKey: CUSTOM_DECKS_KEY(userId) })
      }

      const words = await getDeckWords(deck.id)
      if (words.length === 0)
        return

      const existingCards = await db.user_cards
        .where('[userId+vocabId]')
        .anyOf(words.map(w => [userId, w.id]))
        .toArray()
      const existingIds = new Set(existingCards.map(c => c.vocabId))

      const toAdd = words
        .filter(w => !existingIds.has(w.id))
        .map(w => ({
          userId,
          vocabId: w.id,
          interval_days: 1,
          ease_factor: 2.5,
          due_date: today,
          review_count: 0,
          last_rating: null as SRSRating | null,
          pending_sync: false,
          updated_at: now,
          is_known: false,
          consecutive_correct: 0,
        }))
      if (toAdd.length > 0)
        await db.user_cards.bulkAdd(toAdd)

      const allCards = await db.user_cards
        .where('[userId+vocabId]')
        .anyOf(words.map(w => [userId, w.id]))
        .toArray()
      const cardMap = new Map(allCards.map(c => [c.vocabId, c]))

      let queue: VocabWithSRS[] = words.map((w) => {
        const c = cardMap.get(w.id)
        return {
          vocab_id: w.id,
          word: w.kanji ?? null,
          reading: w.kana,
          romaji: '',
          meaning_en: '',
          meaning_vi: w.meaning_vi,
          han_viet: w.han_viet ?? null,
          pitch_pattern: null,
          pitch_type: null,
          audio_filename: null,
          pos: [],
          jlpt_level: null,
          book_source: 'custom',
          lesson_number: 0,
          examples: [],
          tags: [],
          deprecated: false,
          userId,
          vocabId: w.id,
          interval_days: c?.interval_days ?? 1,
          ease_factor: c?.ease_factor ?? 2.5,
          due_date: c?.due_date ?? today,
          review_count: c?.review_count ?? 0,
          last_rating: (c?.last_rating ?? null) as SRSRating | null,
          pending_sync: false,
          updated_at: c?.updated_at ?? now,
          is_known: false,
          consecutive_correct: c?.consecutive_correct ?? 0,
        }
      })

      queue = [...queue].sort(() => Math.random() - 0.5)
      if (cardCount !== 'all')
        queue = queue.slice(0, cardCount)

      if (queue.length === 0)
        return

      initSession(queue, mode, subMode)
      navigate({ to: '/study/$mode', params: { mode }, search: { returnTab: 'decks' } })
    }
    finally {
      setIsLaunching(false)
    }
  }

  return { launch, isLaunching }
}
