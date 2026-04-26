export interface ComprehensionQuestion {
  question_vi: string
  options: string[]
  correct_index: number
}

export interface Passage {
  passage_id: string
  book_source: string
  lesson_number: number
  text_ja: string
  text_vi: string
  vocab_ids: string[]
  questions: ComprehensionQuestion[]
}
