import type { KanjiCardState, KanjiItem, RelatedVocabItem } from './kanji'
import type { CardState } from './srs'
import type { VocabWithSRS } from './vocabulary'

export type CardTypeFilter = 'all' | 'vocab' | 'kanji' | 'decks'

/** A synthetic kanji-vocab card: SRS state from user_cards (vocabId = rv_*) + display data */
export interface KanjiVocabCardData {
  card: CardState
  rv: RelatedVocabItem
  lessonNumber: number
}

export type UnifiedCard
  = | { kind: 'vocab', card: VocabWithSRS }
    | { kind: 'kanji', card: KanjiCardState, kanji: KanjiItem }
    | { kind: 'kanji-vocab', card: CardState, rv: RelatedVocabItem, lessonNumber: number }

/** Returns the due_date of the underlying card for sorting/display. */
export function unifiedCardDueDate(c: UnifiedCard): string {
  if (c.kind === 'kanji')
    return c.card.due_date
  return c.card.due_date
}
