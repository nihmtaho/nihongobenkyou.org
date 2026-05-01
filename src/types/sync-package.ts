import type { CustomDeck, CustomVocabItem } from './custom-deck'
import type { KanjiCardState } from './kanji'
import type { CardState } from './srs'

export interface SyncPackagePayload {
  user_cards: CardState[]
  kanji_cards: KanjiCardState[]
  custom_decks: CustomDeck[]
  custom_vocabulary: CustomVocabItem[]
}

export interface RemoteSyncPackage {
  user_id: string
  version: number
  device_id: string
  updated_at: string
  payload: SyncPackagePayload
}
