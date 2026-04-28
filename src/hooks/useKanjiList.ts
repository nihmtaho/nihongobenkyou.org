import type { KanjiCardState, KanjiItem } from '../types/kanji'
import { useQuery } from '@tanstack/react-query'
import { getAllKanji, getDueKanjiCards } from '../db/kanji'

export interface KanjiWithSRS extends KanjiItem {
  card?: KanjiCardState
}

interface KanjiFilters {
  jlpt_level?: KanjiItem['jlpt_level']
  lesson_number?: number
  radical?: string
  stroke_count?: number
}

export function useKanjiList(userId: string, filters?: KanjiFilters) {
  return useQuery<KanjiWithSRS[]>({
    queryKey: ['kanji-list', userId, filters],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10)
      const [items, cards] = await Promise.all([
        getAllKanji(filters),
        getDueKanjiCards(userId, today),
      ])

      const cardMap = new Map(cards.map(c => [c.char, c]))

      // Also fetch all kanji_cards (not just due) for mastery badge
      const { db } = await import('../db/schema')
      const allCards = await db.kanji_cards
        .where('userId')
        .equals(userId)
        .toArray()
      const allCardMap = new Map(allCards.map(c => [c.char, c]))

      return items.map(k => ({
        ...k,
        card: allCardMap.get(k.char) ?? cardMap.get(k.char),
      }))
    },
    staleTime: Infinity,
    enabled: !!userId,
  })
}
