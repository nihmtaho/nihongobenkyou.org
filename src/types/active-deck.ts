// user_id uses snake_case to match the custom_decks / custom_vocabulary pattern (item tables).
// SRS state types (ActiveVocabSRS, ActiveKanjiSRS) use userId camelCase to match user_cards.
export interface ActiveVocabItem {
  vocab_id: string // PK — references vocabulary.vocab_id
  user_id: string
  added_at: string // ISO timestamp
}

export interface ActiveKanjiItem {
  char: string // PK — references kanji.char
  user_id: string
  added_at: string
}

// No pending_sync field: active deck SRS is local-only (no Supabase sync).
// This differs from CardState (user_cards) which requires pending_sync for background flush.
// SRS field names follow user_cards convention: userId/vocabId camelCase for compound PK,
// snake_case for other fields
export interface ActiveVocabSRS {
  userId: string
  vocabId: string
  interval_days: number
  ease_factor: number
  due_date: string // ISO date YYYY-MM-DD
  review_count: number
  last_rating: number | null
  updated_at: string
}

// No pending_sync field: active deck SRS is local-only (no Supabase sync).
// This differs from CardState (user_cards) which requires pending_sync for background flush.
export interface ActiveKanjiSRS {
  userId: string
  char: string
  interval_days: number
  ease_factor: number
  due_date: string
  review_count: number
  last_rating: number | null
  updated_at: string
}

export interface ActiveDeckExport {
  version: 1
  exported_at: string
  vocab: string[] // vocab_id list
  kanji: string[] // char list
}
