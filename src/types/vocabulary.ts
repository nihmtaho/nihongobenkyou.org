import type { CardState, SRSRating } from './srs'

export interface Example {
  ja: string
  en: string
  vi: string
  fr?: string
  pitch_pattern?: ('H' | 'L')[] | null
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
  kanji_chars?: string[]
}

export interface VocabWithSRS extends VocabItem {
  // SRSCard identity fields — present on real cards, optional on ephemeral new-card objects
  userId?: string
  cardId?: string
  cardType?: 'vocab' | 'kanji' | 'custom_vocab'
  deckId?: string | null
  state: CardState
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  reps: number
  lapses: number
  last_review: string
  due: string
  last_rating: SRSRating | null
  pending_sync: boolean
  updated_at: string
  is_known: boolean
  consecutive_correct: number
}
