import type { VocabItem } from './vocabulary'

export type StudyMode = 'flashcard' | 'quiz' | 'type-input'

export type FontSize = 'sm' | 'md' | 'lg'

export type MeaningLanguage = 'vi' | 'en' | 'both'

export type QuizQuestionType = 'word→meaning' | 'meaning→word' | 'word→reading'

export interface StudyConfig {
  mode: StudyMode
  cardCount: number | 'all'
  order: 'random' | 'sequential'
  lessonIds: string[]
  source?: 'textbook' | 'custom'
  deckId?: string
}

export interface SessionStats {
  correct: number
  total: number
  startTime: Date
  wrongCards: VocabItem[]
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
