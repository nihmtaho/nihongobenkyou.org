import type { KanjiCardState, KanjiItem } from '../types/kanji'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getAllKanji, getKanjiCardsForChars } from '../db/kanji'

export interface KanjiQueueItem {
  kanji: KanjiItem
  card: KanjiCardState | null
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
    queryFn: () => getKanjiCardsForChars(userId, chars),
    enabled: chars.length > 0,
    staleTime: 0,
  })

  const items = useMemo<KanjiQueueItem[]>(
    () => (kanjiQuery.data ?? []).map(k => ({
      kanji: k,
      card: cardsQuery.data?.find(c => c.char === k.char) ?? null,
    })),
    [kanjiQuery.data, cardsQuery.data],
  )

  return {
    items,
    isLoading: kanjiQuery.isLoading || (chars.length > 0 && cardsQuery.isLoading),
  }
}
