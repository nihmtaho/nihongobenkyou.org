import type { SRSRating } from './srs'

export type CardType = 'vocab' | 'kanji'

export interface ReviewLogEntry {
  id?: number
  userId: string
  vocabId: string
  bookSource: string
  cardType: CardType
  rating: SRSRating // 1=Again 2=Hard 3=Good 4=Easy
  scheduledDays: number // was intervalDays
  stability: number // new FSRS field
  difficulty: number // new FSRS field
  dueDate: string
  reviewCount: number
  isKnown: boolean
  reviewedAt: string
  pendingSync: boolean
  remoteId: number | null
}

export interface RemoteReviewEvent {
  id: number
  user_id: string
  vocab_id: string
  book_source: string
  card_type: CardType
  rating: number
  // FSRS fields (sent on insert; present on newer rows)
  scheduled_days?: number
  stability?: number
  difficulty?: number
  // SM-2 legacy fields (present on older rows from Supabase download)
  interval_days?: number
  ease_factor?: number
  due_date: string
  review_count: number
  is_known: boolean
  reviewed_at: string
}

export interface RemoteSnapshot {
  user_id: string
  vocab_id: string
  card_type: CardType
  interval_days: number
  ease_factor: number
  due_date: string
  review_count: number
  last_rating: number | null
  is_known: boolean
  snapshot_at: string
  cursor_id: number
}
