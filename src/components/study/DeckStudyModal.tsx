import type { StudyMode, TypeInputSubMode } from '../../types/study'
import { StudyModal } from './StudyModal'
import { CUSTOM_DECK_SECTIONS } from './config/active-deck-modes.config'

interface Props {
  title: string
  wordCount: number
  onLaunch: (mode: StudyMode, subMode?: TypeInputSubMode) => void
  onClose: () => void
}

export function DeckStudyModal({ title, wordCount, onLaunch, onClose }: Props) {
  return (
    <StudyModal
      open
      title={title}
      context="all"
      cardCount={wordCount}
      sections={CUSTOM_DECK_SECTIONS}
      onLaunch={(mode, options) =>
        onLaunch(mode as StudyMode, options.subMode as TypeInputSubMode | undefined)}
      onClose={onClose}
    />
  )
}
