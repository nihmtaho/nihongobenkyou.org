import type { KanjiItem } from '../types/kanji'
import type { SRSCard } from '../types/srs'
import { useQuery } from '@tanstack/react-query'
import { getAllKanji } from '../db/kanji'
import { db } from '../db/schema'

export interface KanjiWithSRS extends KanjiItem {
  card?: SRSCard
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
      const items = await getAllKanji(filters)
      const chars = items.map(k => k.char)

      const allCards = await db.srs_cards
        .where('[userId+cardType]')
        .equals([userId, 'kanji'])
        .filter(c => chars.includes(c.cardId))
        .toArray()
      const allCardMap = new Map(allCards.map(c => [c.cardId, c]))

      return items.map(k => ({
        ...k,
        card: allCardMap.get(k.char),
      }))
    },
    staleTime: Infinity,
    enabled: !!userId,
  })
}
