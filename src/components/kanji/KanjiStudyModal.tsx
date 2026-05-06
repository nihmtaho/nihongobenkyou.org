import type { LessonStats, StudyMode } from '../../types/study'
import { useLaunchKanjiLessonSession } from '../../hooks/useLaunchKanjiLessonSession'
import { useAuthStore } from '../../stores/authStore'
import { KANJI_STUDY_SECTIONS } from '../study/config/kanji-study-modes.config'
import { StudyModal } from '../study/StudyModal'

export type { LessonStats } from '../../types/study'

interface KanjiStudyModalProps {
  lessonNum: number
  stats: LessonStats
  type?: 'kanji' | 'vocab'
  dueOnly?: boolean
  onClose: () => void
}

export function KanjiStudyModal({ lessonNum, stats, type, dueOnly, onClose }: KanjiStudyModalProps) {
  const userId = useAuthStore(s => s.userId) ?? ''
  const { launch } = useLaunchKanjiLessonSession(userId)
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
        void launch(
          lessonNum,
          options.sectionId as 'kanji' | 'vocab',
          dueOnly ?? false,
          mode as StudyMode,
        )
      }}
      onClose={onClose}
    />
  )
}
