export interface Example {
  ja: string
  en: string
  vi: string
  fr?: string
}

export type PitchType = 'heiban' | 'atamadaka' | 'nakadaka' | 'odaka' | 'odd' | null

export interface VocabItem {
  vocab_id: string
  word: string | null // kanji form; null if none
  reading: string // kana
  romaji: string
  meaning_en: string
  meaning_vi: string
  pitch_pattern: number | null
  pitch_type: PitchType
  audio_filename: string | null
  audio_filename_alt?: string | null
  pos: string[]
  jlpt_level: number | null
  book_source: string
  lesson_number: number
  examples: Example[]
  tags: string[]
  deprecated: boolean
  edition?: number[]
  sort_order?: number
  han_viet?: string | null
}

import type { CardStage } from './srs'

export interface VocabWithSRS extends VocabItem {
  interval_days: number
  ease_factor: number
  due_date: string
  review_count: number
  last_rating: 0 | 1 | 2 | 3 | null
  pending_sync: boolean
  updated_at: string
  is_known: boolean
  consecutive_correct: number
  card_stage: CardStage
  learning_step: number
  lapse_count: number
}
