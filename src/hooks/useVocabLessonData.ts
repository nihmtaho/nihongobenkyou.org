import type { RelatedVocabItem } from '../types/kanji'
import type { VocabWithSRS } from '../types/vocabulary'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getAllKanji, getKanjiByChars } from '../db/kanji'
import { useUserCards } from './useUserCards'

export function useVocabLessonData(userId: string, lesson: number) {
  const kanjiQuery = useQuery({
    queryKey: ['kanji-lesson-items', lesson],
    queryFn: () => getAllKanji({ lesson_number: lesson }),
    staleTime: Infinity,
  })

  // Extract unique related_vocab items from all kanji in this lesson
  const relatedVocabItems = useMemo<RelatedVocabItem[]>(() => {
    const seen = new Set<string>()
    const items: RelatedVocabItem[] = []
    for (const k of kanjiQuery.data ?? []) {
      for (const rv of k.related_vocab ?? []) {
        const key = `${rv.word ?? rv.kana}:${rv.kana}`
        if (!seen.has(key)) {
          seen.add(key)
          items.push(rv)
        }
      }
    }
    return items
  }, [kanjiQuery.data])

  const vocabIds = useMemo(
    () => relatedVocabItems.map(rv => `rv_${rv.word ?? rv.kana}_${rv.kana}`),
    [relatedVocabItems],
  )

  const { data: cards } = useUserCards(userId, vocabIds)

  // Collect unique kanji chars across all related_vocab words for per-char han_viet lookup
  const kanjiCharsInVocab = useMemo(() => {
    const set = new Set<string>()
    for (const rv of relatedVocabItems) {
      if (rv.word) {
        for (const ch of rv.word) {
          if (ch >= '一' && ch <= '鿿')
            set.add(ch)
        }
      }
    }
    return [...set]
  }, [relatedVocabItems])

  const { data: kanjiForHanViet } = useQuery({
    queryKey: ['kanji-han-viet', kanjiCharsInVocab],
    queryFn: () => getKanjiByChars(kanjiCharsInVocab),
    enabled: kanjiCharsInVocab.length > 0,
    staleTime: Infinity,
  })

  const hanVietMap = useMemo(() => {
    const map = new Map<string, string>()
    // Build per-char map from compound han_viet in each vocab item (e.g. "Hoa Ốc" → {花:Hoa, 屋:Ốc})
    for (const rv of relatedVocabItems) {
      if (!rv.word || !rv.han_viet)
        continue
      const kanjiChars = [...rv.word].filter(ch => ch >= '一' && ch <= '鿿')
      const hvParts = rv.han_viet.trim().split(/\s+/)
      if (kanjiChars.length === hvParts.length) {
        kanjiChars.forEach((ch, i) => {
          if (!map.has(ch))
            map.set(ch, hvParts[i])
        })
      }
    }
    // Fallback: single-char entries from kanji DB for any chars not yet resolved
    kanjiForHanViet?.forEach((k) => {
      if (k.han_viet && !map.has(k.char))
        map.set(k.char, k.han_viet)
    })
    return map
  }, [relatedVocabItems, kanjiForHanViet])

  const sessionTimestamp = useMemo(() => new Date().toISOString(), [])
  const sessionToday = sessionTimestamp.slice(0, 10)

  const merged = useMemo<VocabWithSRS[]>(
    () => relatedVocabItems.map((rv) => {
      const vocabId = `rv_${rv.word ?? rv.kana}_${rv.kana}`
      const c = cards?.get(vocabId)
      const base = {
        vocab_id: vocabId,
        word: rv.word,
        reading: rv.kana,
        romaji: '',
        meaning_en: '',
        meaning_vi: rv.meaning_vi,
        pitch_pattern: null,
        pitch_type: null as null,
        audio_filename: null,
        pos: [] as string[],
        jlpt_level: null as null,
        book_source: '',
        lesson_number: lesson,
        examples: rv.example ? [{ ja: rv.example.ja, en: '', vi: rv.example.vi }] : [],
        tags: [] as string[],
        deprecated: false,
        han_viet: rv.han_viet,
      }
      if (c) {
        return {
          ...base,
          interval_days: c.interval_days,
          ease_factor: c.ease_factor,
          due_date: c.due_date,
          review_count: c.review_count,
          last_rating: c.last_rating,
          pending_sync: c.pending_sync,
          updated_at: c.updated_at,
          is_known: c.is_known ?? false,
        }
      }
      return {
        ...base,
        interval_days: 1,
        ease_factor: 2.5,
        due_date: sessionToday,
        review_count: 0,
        last_rating: null,
        pending_sync: false,
        updated_at: sessionTimestamp,
        is_known: false,
      }
    }),
    [relatedVocabItems, cards, lesson, sessionToday, sessionTimestamp],
  )

  return {
    vocab: merged,
    hanVietMap,
    isLoading: kanjiQuery.isLoading,
  }
}
