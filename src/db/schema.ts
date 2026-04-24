import type { EntityTable } from 'dexie'
import type { LessonMeta } from '../types/dataset'
import type { KanjiCardState, KanjiItem } from '../types/kanji'
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
  }
}

export const db = new NihongoDB()
