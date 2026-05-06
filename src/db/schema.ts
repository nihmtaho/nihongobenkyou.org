import type { EntityTable } from 'dexie'
import type { ActiveKanjiItem, ActiveKanjiSRS, ActiveVocabItem, ActiveVocabSRS } from '../types/active-deck'
import type { CustomDeck, CustomDeckSRS, CustomVocabItem } from '../types/custom-deck'
import type { LessonMeta } from '../types/dataset'
import type { KanjiCardState, KanjiItem } from '../types/kanji'
import type { Passage } from '../types/passages'
import type { ReviewLogEntry } from '../types/review-log'
import type { CardState } from '../types/srs'
import type { StudySession } from '../types/study'
import type { VocabItem } from '../types/vocabulary'
import Dexie from 'dexie'

interface SyncQueueItem {
  id?: number
  payload: string
  created_at: string
  status: 'pending' | 'done' | 'failed'
}

interface SettingsItem {
  key: string
  value: unknown
}

export interface StreakData {
  date: string
  userId: string
  cards_reviewed: number
  current_streak: number
  max_streak: number
}

export class NihongoDB extends Dexie {
  vocabulary!: EntityTable<VocabItem, 'vocab_id'>
  lessons!: EntityTable<LessonMeta, 'lesson_id'>
  user_cards!: EntityTable<CardState, never>
  sync_queue!: EntityTable<SyncQueueItem, 'id'>
  streaks!: EntityTable<StreakData, 'date'>
  settings!: EntityTable<SettingsItem, 'key'>
  kanji!: EntityTable<KanjiItem, 'char'>
  kanji_cards!: EntityTable<KanjiCardState, never>
  sessions!: EntityTable<StudySession, 'id'>
  custom_decks!: EntityTable<CustomDeck, 'id'>
  custom_vocabulary!: EntityTable<CustomVocabItem, 'id'>
  passages!: EntityTable<Passage, 'passage_id'>
  review_log!: EntityTable<ReviewLogEntry, 'id'>
  active_vocab_items!: EntityTable<ActiveVocabItem, 'vocab_id'>
  active_kanji_items!: EntityTable<ActiveKanjiItem, 'char'>
  active_vocab_srs!: EntityTable<ActiveVocabSRS, never>
  active_kanji_srs!: EntityTable<ActiveKanjiSRS, never>
  custom_deck_srs!: EntityTable<CustomDeckSRS, never>

  constructor() {
    super('NihongoDB')
    this.version(1).stores({
      vocabulary: 'vocab_id, book_source, lesson_number, [book_source+lesson_number], jlpt_level',
      lessons: 'lesson_id, book_source, lesson_number',
      user_cards: '[userId+vocabId], due_date, pending_sync, [userId+dueDate]',
      sync_queue: '++id, created_at, status',
      streaks: 'date, userId',
      settings: 'key',
      kanji: 'char, jlpt_level, radical, stroke_count',
      kanji_cards: '[userId+char], due_date, pending_sync',
    })
    this.version(2).stores({
      sessions: '++id, user_id, mode, studied_at, [user_id+studied_at]',
    })
    this.version(3).stores({
      custom_decks: 'id, user_id, share_code',
      custom_vocabulary: 'id, deck_id, user_id',
    })
    this.version(4).stores({
      passages: 'passage_id, book_source, lesson_number, [book_source+lesson_number]',
    })
    this.version(5).stores({
      kanji: 'char, jlpt_level, radical, stroke_count, lesson_number',
    })
    this.version(6).stores({
      kanji_cards: '[userId+char], due_date, pending_sync, [userId+due_date]',
    })
    this.version(7).stores({
      review_log: '++id, [userId+vocabId+cardType], pendingSync, reviewedAt',
    })
    this.version(8).stores({
      active_vocab_items: 'vocab_id, user_id, added_at',
      active_kanji_items: 'char, user_id, added_at',
      active_vocab_srs: '[userId+vocabId], due_date, [userId+due_date]',
      active_kanji_srs: '[userId+char], due_date, [userId+due_date]',
    })
    // v9: backfill consecutive_correct (client-side only streak counter)
    this.version(9).upgrade((tx) => {
      return Promise.all([
        tx.table('user_cards').toCollection().modify((card) => {
          card.consecutive_correct ??= 0
        }),
        tx.table('kanji_cards').toCollection().modify((card) => {
          card.consecutive_correct ??= 0
        }),
      ])
    })
    // v10: add is_active to custom_decks; add han_viet to custom_vocabulary (local-only)
    this.version(10).upgrade((tx) => {
      return Promise.all([
        tx.table('custom_decks').toCollection().modify((deck) => {
          deck.is_active ??= false
        }),
        tx.table('custom_vocabulary').toCollection().modify((word) => {
          word.han_viet ??= null
        }),
      ])
    })
    // v11: add card_stage, learning_step, lapse_count for SM-2 learning steps
    this.version(11).upgrade((tx) => {
      return Promise.all([
        tx.table('user_cards').toCollection().modify((card) => {
          card.card_stage ??= 'review'
          card.learning_step ??= 0
          card.lapse_count ??= 0
        }),
        tx.table('kanji_cards').toCollection().modify((card) => {
          card.card_stage ??= 'review'
          card.learning_step ??= 0
          card.lapse_count ??= 0
        }),
      ])
    })
    // v12: custom_deck_srs — independent SRS per custom deck vocabulary item
    this.version(12).stores({
      custom_deck_srs: '[userId+itemId], deckId, due_date, pending_sync, [userId+deckId], [userId+deckId+due_date]',
    }).upgrade(async (tx) => {
      const allCustomVocab = await tx.table('custom_vocabulary').toArray()
      if (allCustomVocab.length === 0)
        return

      const customIdToDeckId = new Map<string, string>(
        allCustomVocab.map((v: CustomVocabItem) => [v.id, v.deck_id]),
      )
      const customIds = new Set(customIdToDeckId.keys())

      const customCards = await tx.table('user_cards')
        .filter((c: { vocabId: string }) => customIds.has(c.vocabId))
        .toArray()

      if (customCards.length === 0)
        return

      const now = new Date().toISOString()
      type MigratedCard = Partial<CardState> & { userId: string, vocabId: string }
      const typedCards = customCards as MigratedCard[]
      const srsEntries: CustomDeckSRS[] = typedCards.map(c => ({
        userId: c.userId,
        itemId: c.vocabId,
        deckId: customIdToDeckId.get(c.vocabId)!,
        interval_days: c.interval_days ?? 0,
        ease_factor: c.ease_factor ?? 2.5,
        due_date: c.due_date ?? now.slice(0, 10),
        review_count: c.review_count ?? 0,
        card_stage: (c.card_stage === 'learning' || c.card_stage === 'review' || c.card_stage === 'relearning')
          ? c.card_stage
          : 'learning',
        learning_step: c.learning_step ?? 0,
        lapse_count: c.lapse_count ?? 0,
        last_rating: c.last_rating ?? null,
        consecutive_correct: c.consecutive_correct ?? 0,
        pending_sync: c.pending_sync ?? false,
        updated_at: c.updated_at ?? now,
      }))

      await tx.table('custom_deck_srs').bulkAdd(srsEntries)

      const keysToDelete = customCards.map((c: MigratedCard) => [c.userId, c.vocabId])
      await tx.table('user_cards').bulkDelete(keysToDelete)

      // Second pass: clean up orphaned user_cards for custom vocab IDs that no
      // longer have a parent custom_vocabulary record (vocab was deleted)
      const allCustomIds = new Set(allCustomVocab.map((v: CustomVocabItem) => v.id))
      const remainingCustomCards = await tx.table('user_cards')
        .filter((c: { vocabId: string }) => allCustomIds.has(c.vocabId))
        .toArray() as MigratedCard[]
      if (remainingCustomCards.length > 0) {
        const orphanKeys = remainingCustomCards.map(c => [c.userId, c.vocabId])
        await tx.table('user_cards').bulkDelete(orphanKeys)
      }
    })
  }
}

export const db = new NihongoDB()
