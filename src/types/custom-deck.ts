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
