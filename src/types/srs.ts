export type SRSRating = 0 | 1 | 2 | 3

export interface CardState {
  userId: string
  vocabId: string
  interval_days: number
  ease_factor: number
  due_date: string
  review_count: number
  last_rating: SRSRating | null
  pending_sync: boolean
  updated_at: string
  is_known: boolean
}

export interface ReviewResult {
  vocab_id: string
  new_interval: number
  new_ease: number
  due_date: string
}
