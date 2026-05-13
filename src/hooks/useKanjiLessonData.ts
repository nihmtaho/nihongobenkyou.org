import type { KanjiItem } from '../types/kanji'
import type { SRSCard } from '../types/srs'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getAllKanji } from '../db/kanji'
import { db } from '../db/schema'

export interface KanjiQueueItem {
  kanji: KanjiItem
  card: SRSCard | null
}

async function getKanjiSRSCards(userId: string, chars: string[]): Promise<SRSCard[]> {
  if (chars.length === 0)
    return []
  return db.srs_cards
    .where('[userId+cardType]')
    .equals([userId, 'kanji'])
    .filter(c => chars.includes(c.cardId))
    .toArray()
}

export function useKanjiLessonData(userId: string, lesson: number) {
  const kanjiQuery = useQuery({
    queryKey: ['kanji-lesson-items', lesson],
    queryFn: () => getAllKanji({ lesson_number: lesson }),
    staleTime: Infinity,
  })

  const chars = useMemo(() => kanjiQuery.data?.map(k => k.char) ?? [], [kanjiQuery.data])

  const cardsQuery = useQuery({
    queryKey: ['kanji-lesson-cards', userId, lesson],
    queryFn: () => getKanjiSRSCards(userId, chars),
    enabled: chars.length > 0,
    staleTime: 0,
  })

  const items = useMemo<KanjiQueueItem[]>(
    () => (kanjiQuery.data ?? []).map(k => ({
      kanji: k,
      card: cardsQuery.data?.find(c => c.cardId === k.char) ?? null,
    })),
    [kanjiQuery.data, cardsQuery.data],
  )

  return {
    items,
    isLoading: kanjiQuery.isLoading || (chars.length > 0 && cardsQuery.isLoading),
  }
}
