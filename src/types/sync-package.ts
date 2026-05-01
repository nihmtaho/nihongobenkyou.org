import type { StreakData } from '../db/schema'
import type { CustomDeck, CustomVocabItem } from './custom-deck'
import type { KanjiCardState } from './kanji'
import type { ReviewLogEntry } from './review-log'
import type { CardState } from './srs'

export interface SyncPackagePayload {
  user_cards: CardState[]
  kanji_cards: KanjiCardState[]
  custom_decks: CustomDeck[]
  custom_vocabulary: CustomVocabItem[]
  review_log: ReviewLogEntry[]
  streaks: StreakData[]
}

export interface RemoteSyncPackage {
  user_id: string
  version: number
  device_id: string
  updated_at: string
  payload: SyncPackagePayload
}
