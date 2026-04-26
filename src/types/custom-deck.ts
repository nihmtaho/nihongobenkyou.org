export interface CustomDeck {
  id: string
  user_id: string
  title: string
  description: string | null
  is_public: boolean
  share_code: string
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
  meaning_vi: string
  meaning_en: string | null
  pitch_pattern: number | null
  source: 'manual' | 'csv' | 'imported'
  created_at: string
}

export interface CsvRow {
  kana: string
  kanji?: string
  meaning_vi: string
  meaning_en?: string
}

export interface CsvImportResult {
  imported: number
  skipped: number
  errors: Array<{ row: number, reason: string }>
}
