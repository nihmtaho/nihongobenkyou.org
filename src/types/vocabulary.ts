export interface Example {
  ja: string
  en: string
  vi: string
  audio?: string
}

export type PitchType = 'heiban' | 'atamadaka' | 'nakadaka' | 'odaka'

export interface VocabItem {
  vocab_id: string
  word: string
  reading: string
  romaji: string | null
  meaning_vi: string[]
  meaning_en: string[]
  pitch_pattern: number | null
  pitch_type: PitchType | null
  audio_filename: string | null
  pos: string | null
  jlpt_level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | null
  book_source: string
  lesson_number: number
  examples: Example[] | null
  tags: string[] | null
  deprecated: boolean | null
}

export interface VocabWithSRS extends VocabItem {
  interval_days: number
  ease_factor: number
  due_date: string
  review_count: number
  last_rating: 0 | 1 | 2 | 3 | null
  pending_sync: boolean
  updated_at: string
  is_known?: boolean
}
