import type { UnifiedCard } from './unified-card'
import type { VocabItem } from './vocabulary'

export type StudyMode
  = | 'flashcard'
    | 'quiz'
    | 'type-input'
    | 'sentence-flashcard'
    | 'listening'
    | 'reading-comprehension'
    | 'pitch-discrimination'

export type FontSize = 'sm' | 'md' | 'lg'

export type MeaningLanguage = 'vi' | 'en' | 'both'

export type QuizQuestionType = 'word→meaning' | 'meaning→word' | 'word→reading'

export type TypeInputSubMode = 'word→hira' | 'vi→hira' | 'word→vi' | 'word→han_viet'

export interface StudyConfig {
  mode: StudyMode
  cardCount: number | 'all'
  order: 'random' | 'sequential'
  lessonIds: string[]
  source?: 'textbook' | 'custom'
  deckId?: string
  typeInputSubMode?: TypeInputSubMode
}

export interface SessionStats {
  correct: number
  total: number
  startTime: Date
  wrongCards: UnifiedCard[]
}

export interface StudySession {
  id?: number
  user_id: string
  mode: StudyMode
  lesson_ids: string[]
  cards_reviewed: number
  correct_count: number
  duration_sec: number
  studied_at: Date
}

export interface LessonStats {
  total: number
  new: number
  learning: number
  review: number
  mature: number
}
