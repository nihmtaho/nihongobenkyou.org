
export interface StrokeData {
  stroke_index: number
  path: string
  stroke_type_ja: string
  stroke_type_vi: string
}

export interface KanjiExample {
  ja: string
  en: string
  vi: string
  fr?: string
}

export interface RelatedVocabItem {
  word: string | null
  kana: string
  han_viet: string | null
  meaning_vi: string
  example: { ja: string, vi: string } | null
}

export interface KanjiItem {
  char: string
  jlpt_level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | null
  lesson_number: number | null
  radical: string | null
  stroke_count: number
  onyomi: string[]
  kunyomi: string[]
  meaning_en: string[]
  meaning_vi: string[]
  han_viet: string | null
  mnemonic_vi: string | null
  components: { char: string, meaning_en: string, meaning_vi: string, han_viet: string | null }[] | null
  stroke_paths: StrokeData[] | null
  examples: KanjiExample[] | null
  related_vocab: RelatedVocabItem[] | null
}

export interface KanjiCardState {
  userId: string
  char: string
  interval_days: number
  ease_factor: number
  due_date: string
  review_count: number
  last_rating: 0 | 1 | 2 | 3 | null
  pending_sync: boolean
  updated_at: string
  consecutive_correct: number
  card_stage?: string
  learning_step?: number
  lapse_count?: number
}
