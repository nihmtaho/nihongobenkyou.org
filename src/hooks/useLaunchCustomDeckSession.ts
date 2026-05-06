import type { CustomDeck } from '../types/custom-deck'
import type { SRSRating } from '../types/srs'
import type { StudyMode, TypeInputSubMode } from '../types/study'
import type { UnifiedCard } from '../types/unified-card'
import type { VocabWithSRS } from '../types/vocabulary'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { bulkUpsertCustomDeckSRS, getCustomDeckSRS } from '../db/custom-deck-srs'
import { getDeckWords, updateDeck } from '../db/custom-decks-local'
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

      // Load existing SRS state from custom_deck_srs
      const existingSRS = await getCustomDeckSRS(userId, deck.id)
      const srsMap = new Map(existingSRS.map(s => [s.itemId, s]))

      // Initialise SRS entries for words that have never been rated
      const newEntries = words
        .filter(w => !srsMap.has(w.id))
        .map(w => ({
          userId,
          itemId: w.id,
          deckId: deck.id,
          interval_days: 0,
          ease_factor: 2.5,
          due_date: today,
          review_count: 0,
          card_stage: 'learning' as const,
          learning_step: 0,
          lapse_count: 0,
          last_rating: null as SRSRating | null,
          consecutive_correct: 0,
          pending_sync: true,
          updated_at: now,
        }))

      if (newEntries.length > 0) {
        await bulkUpsertCustomDeckSRS(newEntries)
        for (const entry of newEntries)
          srsMap.set(entry.itemId, entry)
      }

      let queue: VocabWithSRS[] = words.map((w) => {
        const s = srsMap.get(w.id)
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
          interval_days: s?.interval_days ?? 0,
          ease_factor: s?.ease_factor ?? 2.5,
          due_date: s?.due_date ?? today,
          review_count: s?.review_count ?? 0,
          last_rating: (s?.last_rating ?? null) as SRSRating | null,
          pending_sync: false,
          updated_at: s?.updated_at ?? now,
          is_known: false,
          consecutive_correct: s?.consecutive_correct ?? 0,
          card_stage: s?.card_stage ?? 'learning',
          learning_step: s?.learning_step ?? 0,
          lapse_count: s?.lapse_count ?? 0,
        }
      })

      queue = [...queue].sort(() => Math.random() - 0.5)
      if (cardCount !== 'all')
        queue = queue.slice(0, cardCount)

      if (queue.length === 0)
        return

      const unifiedQueue: UnifiedCard[] = queue.map(card => ({ kind: 'vocab' as const, card }))
      initSession(unifiedQueue, mode, subMode, 'custom-deck', 'all', deck.id)
      navigate({ to: '/study/review', search: { filter: 'all' } })
    }
    finally {
      setIsLaunching(false)
    }
  }

  return { launch, isLaunching }
}
