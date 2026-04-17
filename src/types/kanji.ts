export interface StrokeData {
  stroke_index: number
  path: string
  stroke_type_ja: string
  stroke_type_vi: string
}

export interface KanjiItem {
  char: string
  jlpt_level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | null
  radical: string | null
  stroke_count: number
  onyomi: string[]
  kunyomi: string[]
  meaning_en: string[]
  meaning_vi: string[]
  han_viet: string | null
  mnemonic_vi: string | null
  components: string[] | null
  stroke_paths: StrokeData[] | null
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
}
