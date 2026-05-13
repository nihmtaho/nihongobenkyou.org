import type { EntityTable } from 'dexie'
import type { LessonMeta } from '../types/dataset'
import type { KanjiItem } from '../types/kanji'
import type { Passage } from '../types/passages'
import type { ReviewLogEntry } from '../types/review-log'
import type { SRSCard } from '../types/srs'
import type { StudySession } from '../types/study'
import type { VocabItem } from '../types/vocabulary'
import type { CustomDeck, CustomVocabItem } from '../types/custom-deck'
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

export interface HiddenVocabEntry {
  userId: string
  item_id: string
  source: 'lesson' | 'custom'
  hidden_at: string
}

export class NihongoDB extends Dexie {
  vocabulary!: EntityTable<VocabItem, 'vocab_id'>
  lessons!: EntityTable<LessonMeta, 'lesson_id'>
  srs_cards!: EntityTable<SRSCard, never>
  sync_queue!: EntityTable<SyncQueueItem, 'id'>
  streaks!: EntityTable<StreakData, 'date'>
  settings!: EntityTable<SettingsItem, 'key'>
  kanji!: EntityTable<KanjiItem, 'char'>
  sessions!: EntityTable<StudySession, 'id'>
  custom_decks!: EntityTable<CustomDeck, 'id'>
  custom_vocabulary!: EntityTable<CustomVocabItem, 'id'>
  passages!: EntityTable<Passage, 'passage_id'>
  review_log!: EntityTable<ReviewLogEntry, 'id'>
  hidden_vocab!: EntityTable<HiddenVocabEntry, never>

  constructor() {
    super('NihongoDB')
    // v1–v13: preserved (Dexie requires all versions present for upgrade path)
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
    this.version(2).stores({ sessions: '++id, user_id, mode, studied_at, [user_id+studied_at]' })
    this.version(3).stores({ custom_decks: 'id, user_id, share_code', custom_vocabulary: 'id, deck_id, user_id' })
    this.version(4).stores({ passages: 'passage_id, book_source, lesson_number, [book_source+lesson_number]' })
    this.version(5).stores({ kanji: 'char, jlpt_level, radical, stroke_count, lesson_number' })
    this.version(6).stores({ kanji_cards: '[userId+char], due_date, pending_sync, [userId+due_date]' })
    this.version(7).stores({ review_log: '++id, [userId+vocabId+cardType], pendingSync, reviewedAt' })
    this.version(8).stores({
      active_vocab_items: 'vocab_id, user_id, added_at',
      active_kanji_items: 'char, user_id, added_at',
      active_vocab_srs: '[userId+vocabId], due_date, [userId+due_date]',
      active_kanji_srs: '[userId+char], due_date, [userId+due_date]',
    })
    this.version(9).upgrade((tx) => Promise.all([
      tx.table('user_cards').toCollection().modify((c) => { c.consecutive_correct ??= 0 }),
      tx.table('kanji_cards').toCollection().modify((c) => { c.consecutive_correct ??= 0 }),
    ]))
    this.version(10).upgrade((tx) => Promise.all([
      tx.table('custom_decks').toCollection().modify((d) => { d.is_active ??= false }),
      tx.table('custom_vocabulary').toCollection().modify((w) => { w.han_viet ??= null }),
    ]))
    this.version(11).upgrade((tx) => Promise.all([
      tx.table('user_cards').toCollection().modify((c) => {
        c.card_stage ??= 'review'; c.learning_step ??= 0; c.lapse_count ??= 0
      }),
      tx.table('kanji_cards').toCollection().modify((c) => {
        c.card_stage ??= 'review'; c.learning_step ??= 0; c.lapse_count ??= 0
      }),
    ]))
    this.version(12).stores({
      custom_deck_srs: '[userId+itemId], deckId, due_date, pending_sync, [userId+deckId], [userId+deckId+due_date]',
    })
    this.version(13).stores({ hidden_vocab: '[userId+item_id], [userId+source]' })
    // v14: Unify all SRS into srs_cards (FSRS-4.5). Remove active deck + old SRS tables.
    this.version(14).stores({
      srs_cards: '[userId+cardId], due, [userId+due], pending_sync, cardType, deckId, [userId+cardType], [userId+deckId+due]',
      user_cards:         null,
      kanji_cards:        null,
      custom_deck_srs:    null,
      active_vocab_items: null,
      active_kanji_items: null,
      active_vocab_srs:   null,
      active_kanji_srs:   null,
    }).upgrade(async (tx) => {
      const now = new Date().toISOString()
      const today = now.slice(0, 10)

      function clamp(v: number, min: number, max: number) { return Math.min(max, Math.max(min, v)) }

      function migrateCard(card: Record<string, unknown>, cardType: 'vocab' | 'kanji' | 'custom_vocab', deckId: string | null): SRSCard {
        const ef = (card.ease_factor as number | undefined) ?? 2.5
        return {
          userId:             card.userId as string,
          cardId:             (card.vocabId ?? card.char ?? card.itemId) as string,
          cardType,
          deckId,
          state:              (card.card_stage as SRSCard['state'] | undefined) ?? 'review',
          stability:          (card.interval_days as number | undefined) || 1,
          difficulty:         clamp(10 - (ef - 1.3) * 3.86, 1, 10),
          elapsed_days:       0,
          scheduled_days:     (card.interval_days as number | undefined) || 1,
          reps:               (card.review_count as number | undefined) ?? 0,
          lapses:             (card.lapse_count as number | undefined) ?? 0,
          last_review:        ((card.updated_at as string | undefined) ?? now).slice(0, 10),
          due:                ((card.due_date as string | undefined) ?? today).slice(0, 10),
          last_rating:        card.last_rating != null ? (card.last_rating as number) + 1 as SRSCard['last_rating'] : null,
          is_known:           (card.is_known as boolean | undefined) ?? false,
          consecutive_correct: (card.consecutive_correct as number | undefined) ?? 0,
          pending_sync:       (card.pending_sync as boolean | undefined) ?? false,
          updated_at:         (card.updated_at as string | undefined) ?? now,
        }
      }

      // 1. Migrate user_cards (textbook vocab)
      const userCards: Record<string, unknown>[] = await tx.table('user_cards').toArray()
      if (userCards.length > 0) {
        await tx.table('srs_cards').bulkPut(
          userCards.map(c => migrateCard(c, 'vocab', null))
        )
      }

      // 2. Migrate kanji_cards
      const kanjiCards: Record<string, unknown>[] = await tx.table('kanji_cards').toArray()
      if (kanjiCards.length > 0) {
        await tx.table('srs_cards').bulkPut(
          kanjiCards.map(c => migrateCard(c, 'kanji', null))
        )
      }

      // 3. Migrate custom_deck_srs
      const customSRS: Record<string, unknown>[] = await tx.table('custom_deck_srs').toArray()
      if (customSRS.length > 0) {
        await tx.table('srs_cards').bulkPut(
          customSRS.map(c => migrateCard(c, 'custom_vocab', c.deckId as string))
        )
      }

      // 4. Update review_log: rating +1, rename SM-2 fields to FSRS
      await tx.table('review_log').toCollection().modify((entry: Record<string, unknown>) => {
        entry.rating = (entry.rating as number) + 1
        entry.scheduledDays = entry.intervalDays
        entry.stability = entry.intervalDays ?? 1
        const ef = (entry.easeFactor as number | undefined) ?? 2.5
        entry.difficulty = clamp(10 - (ef - 1.3) * 3.86, 1, 10)
        delete entry.intervalDays
        delete entry.easeFactor
      })
    })
  }
}

export const db = new NihongoDB()
