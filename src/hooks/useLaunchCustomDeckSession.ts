import type { CustomDeck } from '../types/custom-deck'
import type { StudyMode, TypeInputSubMode } from '../types/study'
import type { UnifiedCard } from '../types/unified-card'
import type { VocabWithSRS } from '../types/vocabulary'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { getDeckWords, updateDeck } from '../db/custom-decks-local'
import { getHiddenIds } from '../db/hidden-vocab'
import { getSRSCardsForDeck, initSRSCard } from '../db/srs-cards'
import { fisherYates } from '../lib/utils'
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

      const hiddenIds = new Set(await getHiddenIds(userId, 'custom'))

      // Load existing SRS state from srs_cards
      const existingCards = await getSRSCardsForDeck(userId, deck.id)
      const srsMap = new Map(existingCards.map(c => [c.cardId, c]))

      // Initialise SRS entries for words that have never been rated
      const newWords = words.filter(w => !srsMap.has(w.id))
      if (newWords.length > 0) {
        await Promise.all(newWords.map(w => initSRSCard(userId, w.id, 'custom_vocab', deck.id)))
        // Re-fetch to populate srsMap with newly created cards
        const refreshed = await getSRSCardsForDeck(userId, deck.id)
        for (const card of refreshed) srsMap.set(card.cardId, card)
        qc.invalidateQueries({ queryKey: ['all-custom-deck-srs-summary', userId] })
        qc.invalidateQueries({ queryKey: ['started-deck-ids', userId] })
        qc.invalidateQueries({ queryKey: ['custom-deck-progress', userId, deck.id] })
      }

      const nowDate = new Date(now)
      const hasDueEligible = words.some((w) => {
        const s = srsMap.get(w.id)
        if (!s || s.is_known || hiddenIds.has(w.id))
          return false
        if ((s.state === 'learning' || s.state === 'relearning') && s.due_datetime) {
          return new Date(s.due_datetime) <= nowDate
        }
        return s.due <= today
      })

      let queue: VocabWithSRS[] = words.flatMap((w) => {
        const s = srsMap.get(w.id)
        if (!s || s.is_known || hiddenIds.has(w.id))
          return []
        if (hasDueEligible) {
          const isDue = (s.state === 'learning' || s.state === 'relearning') && s.due_datetime
            ? new Date(s.due_datetime) <= nowDate
            : s.due <= today
          if (!isDue)
            return []
        }
        return [{
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
          cardId: w.id,
          cardType: 'custom_vocab' as const,
          deckId: deck.id,
          state: s?.state ?? 'new',
          stability: s?.stability ?? 0,
          difficulty: s?.difficulty ?? 0,
          elapsed_days: s?.elapsed_days ?? 0,
          scheduled_days: s?.scheduled_days ?? 0,
          reps: s?.reps ?? 0,
          lapses: s?.lapses ?? 0,
          last_review: s?.last_review ?? today,
          due: s?.due ?? today,
          last_rating: s?.last_rating ?? null,
          is_known: s?.is_known ?? false,
          consecutive_correct: s?.consecutive_correct ?? 0,
          pending_sync: false,
          updated_at: s?.updated_at ?? now,
        }]
      })

      queue = fisherYates(queue)
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
