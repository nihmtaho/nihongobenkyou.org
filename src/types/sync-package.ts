import type { StreakData } from '../db/schema'
import type { CustomDeck, CustomVocabItem } from './custom-deck'
import type { ReviewLogEntry } from './review-log'
import type { SRSCard } from './srs'

export interface SyncPackagePayload {
  srs_cards:        SRSCard[]
  custom_decks:     CustomDeck[]
  custom_vocabulary: CustomVocabItem[]
  review_log:       ReviewLogEntry[]
  streaks:          StreakData[]
}

export interface RemoteSyncPackage {
  user_id:    string
  version:    number
  device_id:  string
  updated_at: string
  payload:    SyncPackagePayload
}
