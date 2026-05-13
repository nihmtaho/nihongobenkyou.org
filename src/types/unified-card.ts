import type { KanjiItem, RelatedVocabItem } from './kanji'
import type { SRSCard } from './srs'
import type { VocabWithSRS } from './vocabulary'

export type CardTypeFilter = 'all' | 'vocab' | 'kanji' | 'decks'

/** A synthetic kanji-vocab card: SRS state from srs_cards (cardId = rv_*) + display data */
export interface KanjiVocabCardData {
  card: SRSCard
  rv: RelatedVocabItem
  lessonNumber: number
}

export type UnifiedCard
  = | { kind: 'vocab', card: VocabWithSRS }
    | { kind: 'kanji', card: SRSCard, kanji: KanjiItem }
    | { kind: 'kanji-vocab', card: SRSCard, rv: RelatedVocabItem, lessonNumber: number }

/** Returns the due date of the underlying card for sorting/display. */
export function unifiedCardDueDate(c: UnifiedCard): string {
  return c.card.due
}
