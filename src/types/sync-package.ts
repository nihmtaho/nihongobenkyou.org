import type { StreakData } from '../db/schema'
import type { CustomDeck, CustomVocabItem } from './custom-deck'
import type { SRSCard } from './srs'

export interface SyncPackagePayload {
  srs_cards: SRSCard[]
  custom_decks: CustomDeck[]
  custom_vocabulary: CustomVocabItem[]
  streaks: StreakData[]
  /** @deprecated review_log is synced via its own channel — ignored when present */
  review_log?: unknown[]
}

export interface RemoteSyncPackage {
  user_id: string
  version: number
  device_id: string
  updated_at: string
  payload: SyncPackagePayload
}
