export type SRSRating = 1 | 2 | 3 | 4 // 1=Again 2=Hard 3=Good 4=Easy

export type CardState = 'new' | 'learning' | 'review' | 'relearning'

export interface SRSCard {
  // Identity
  userId: string
  cardId: string // vocab_id | kanji char | custom_vocabulary.id
  cardType: 'vocab' | 'kanji' | 'custom_vocab'
  deckId: string | null // null = textbook; UUID = custom deck

  // FSRS-4.5 State
  state: CardState
  stability: number // days until P(recall) = 90%
  difficulty: number // 1–10
  elapsed_days: number
  scheduled_days: number
  reps: number
  lapses: number
  last_review: string // YYYY-MM-DD
  due: string // YYYY-MM-DD

  // Rating
  last_rating: SRSRating | null

  // Carry-over
  is_known: boolean
  consecutive_correct: number

  // Sync
  pending_sync: boolean
  updated_at: string // ISO 8601
}

export interface FSRSResult {
  due: string
  state: CardState
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  reps: number
  lapses: number
  last_review: string
}
