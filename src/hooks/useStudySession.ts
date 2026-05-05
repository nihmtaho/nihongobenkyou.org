import type { CustomVocabItem } from '../types/custom-deck'
import type { StudyConfig } from '../types/study'
import type { VocabWithSRS } from '../types/vocabulary'
import { useQuery } from '@tanstack/react-query'
import { db } from '../db/schema'

function customVocabToVocabItem(item: CustomVocabItem): import('../types/vocabulary').VocabItem {
  return {
    vocab_id: item.id,
    word: item.kanji ?? null,
    reading: item.kana,
    romaji: '',
    meaning_en: '',
    meaning_vi: item.meaning_vi,
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
  }
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

const NOW_ISO = () => new Date().toISOString()
const TODAY = () => NOW_ISO().slice(0, 10)

export function useStudySession(userId: string, config: StudyConfig) {
  return useQuery<VocabWithSRS[]>({
    queryKey: ['study-session', userId, config],
    queryFn: async () => {
      // Custom deck source: resolve from custom_vocabulary Dexie cache
      if (config.source === 'custom' && config.deckId) {
        const customWords = await db.custom_vocabulary
          .where('deck_id')
          .equals(config.deckId)
          .toArray()

        const vocabItems = customWords.map(customVocabToVocabItem)
        const vocabIds = vocabItems.map(v => v.vocab_id)
        const cards = await db.user_cards
          .where('[userId+vocabId]')
          .anyOf(vocabIds.map(id => [userId, id]))
          .toArray()
        const cardMap = new Map(cards.map(c => [c.vocabId, c]))

        let merged: VocabWithSRS[] = vocabItems.map((v) => {
          const c = cardMap.get(v.vocab_id)
          if (c)
            return { ...v, ...c, consecutive_correct: c.consecutive_correct ?? 0 }
          return {
            ...v,
            userId,
            vocabId: v.vocab_id,
            interval_days: 1,
            ease_factor: 2.5,
            due_date: TODAY(),
            review_count: 0,
            last_rating: null,
            pending_sync: false,
            updated_at: NOW_ISO(),
            is_known: false,
            consecutive_correct: 0,
          }
        })

        if (config.order === 'random')
          merged = shuffle(merged)
        if (config.cardCount !== 'all')
          merged = merged.slice(0, config.cardCount)
        return merged
      }

      const vocab
        = config.lessonIds.length > 0
          ? await db.vocabulary
              .where('[book_source+lesson_number]')
              .anyOf(
                config.lessonIds.map((id) => {
                  const [src, lesson] = id.split(':')
                  return [src, Number(lesson)] as [string, number]
                }),
              )
              .toArray()
          : await db.vocabulary.toArray()

      const vocabIds = vocab.map(v => v.vocab_id)
      const cards = await db.user_cards
        .where('[userId+vocabId]')
        .anyOf(vocabIds.map(id => [userId, id]))
        .toArray()
      const cardMap = new Map(cards.map(c => [c.vocabId, c]))

      let merged: VocabWithSRS[] = vocab.map((v) => {
        const c = cardMap.get(v.vocab_id)
        if (c)
          return { ...v, ...c, consecutive_correct: c.consecutive_correct ?? 0 }
        return {
          ...v,
          userId,
          vocabId: v.vocab_id,
          interval_days: 1,
          ease_factor: 2.5,
          due_date: TODAY(),
          review_count: 0,
          last_rating: null,
          pending_sync: false,
          updated_at: NOW_ISO(),
          is_known: false,
          consecutive_correct: 0,
        }
      })

      if (config.order === 'random')
        merged = shuffle(merged)
      if (config.cardCount !== 'all')
        merged = merged.slice(0, config.cardCount)

      return merged
    },
    staleTime: 0,
    enabled: !!userId,
  })
}
