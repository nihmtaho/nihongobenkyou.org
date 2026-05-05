import type { EntityTable } from 'dexie'
import type { ActiveKanjiItem, ActiveKanjiSRS, ActiveVocabItem, ActiveVocabSRS } from '../types/active-deck'
import type { CustomDeck, CustomVocabItem } from '../types/custom-deck'
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
  }
}

export const db = new NihongoDB()
