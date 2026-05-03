import type { LessonStats, StudyMode, TypeInputSubMode } from '../../types/study'
import { VOCAB_STUDY_SECTIONS } from './config/vocab-study-modes.config'
import { StudyModal } from './StudyModal'

type VocabStudyModalProps = {
  stats?: LessonStats
  onLaunch: (mode: StudyMode, subMode?: TypeInputSubMode, order?: 'random' | 'sequential') => void
  onClose: () => void
} & (
  | { context: 'all', title: string, dueCount?: never }
  | { context: 'due', title: string, dueCount: number }
)

export function VocabStudyModal({ title, context, dueCount, stats, onLaunch, onClose }: VocabStudyModalProps) {
  return (
    <StudyModal
      open
      title={title}
      context={context}
      cardCount={context === 'due' ? dueCount : stats?.total}
      stats={stats}
      sections={VOCAB_STUDY_SECTIONS}
      onLaunch={(mode, options) =>
        onLaunch(
          mode as StudyMode,
          options.subMode as TypeInputSubMode | undefined,
          options.order,
        )}
      onClose={onClose}
    />
  )
}
