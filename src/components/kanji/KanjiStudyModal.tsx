import type { LessonStats } from '../../types/study'
import type { VocabTypeSubMode } from './KanjiVocabTypeInputCard'
import { useNavigate } from '@tanstack/react-router'
import { KANJI_STUDY_SECTIONS } from '../study/config/kanji-study-modes.config'
import { StudyModal } from '../study/StudyModal'

export type { LessonStats } from '../../types/study'

interface KanjiStudyModalProps {
  lessonNum: number
  stats: LessonStats
  type?: 'kanji' | 'vocab'
  onClose: () => void
}

export function KanjiStudyModal({ lessonNum, stats, type, onClose }: KanjiStudyModalProps) {
  const navigate = useNavigate()
  const { total, new: newCount, learning, review, mature } = stats

  const sections = type === 'kanji'
    ? KANJI_STUDY_SECTIONS.filter(s => s.id === 'kanji')
    : type === 'vocab'
      ? KANJI_STUDY_SECTIONS.filter(s => s.id === 'vocab')
      : KANJI_STUDY_SECTIONS

  const srsStats = { total, new: newCount, learning, review, mature }

  return (
    <StudyModal
      open
      title={`Bài ${String(lessonNum).padStart(2, '0')}`}
      context="all"
      cardCount={total}
      stats={srsStats}
      sections={sections}
      onLaunch={(mode, options) => {
        onClose()
        navigate({
          to: '/kanji/lesson-study',
          search: {
            lesson: lessonNum,
            type: options.sectionId as 'kanji' | 'vocab',
            mode: mode as 'flashcard' | 'quiz' | 'type',
            ...(options.subMode ? { vocabSubMode: options.subMode as VocabTypeSubMode } : {}),
          },
        })
      }}
      onClose={onClose}
    />
  )
}
