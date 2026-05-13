import type { SRSRating } from './srs'

export interface CustomDeck {
  id: string
  user_id: string
  title: string
  description: string | null
  is_active: boolean
  word_count: number
  created_at: string
  updated_at: string
}

export interface CustomVocabItem {
  id: string
  deck_id: string
  user_id: string
  kana: string
  kanji: string | null
  han_viet: string | null
  meaning_vi: string
  source: 'manual' | 'json' | 'csv'
  created_at: string
}

export interface ParsedVocabItem {
  word: string | null // kanji form (if present)
  kana: string
  han_viet: string | null
  meaning_vi: string
}

export interface VocabParseResult {
  items: ParsedVocabItem[]
  errors: Array<{ row: number, reason: string }>
}

/**
 * SRS state for a custom deck vocabulary item.
 * Unlike CardState, card_stage / learning_step / lapse_count are
 * required — custom deck SRS is always fully initialised on first insert.
 */
export interface CustomDeckSRS {
  userId: string
  itemId: string // custom_vocabulary.id (unique per word per deck)
  deckId: string // custom_decks.id — stored for index queries
  interval_days: number
  ease_factor: number
  due_date: string // YYYY-MM-DD date string
  review_count: number
  card_stage: string
  learning_step: number
  lapse_count: number
  last_rating: SRSRating | null
  consecutive_correct: number
  pending_sync: boolean
  updated_at: string // ISO 8601 datetime string
}
