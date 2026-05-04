import type { StudyMode } from '../types/study'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useStudySessionStore } from '../stores/studySessionStore'

export function useLaunchActiveKanjiDeckSession(userId: string) {
  const navigate = useNavigate()
  const initSession = useStudySessionStore(s => s.initSession)
  const [isLaunching, setIsLaunching] = useState(false)

  async function launch(mode: StudyMode = 'flashcard') {
    if (isLaunching || !userId)
      return
    setIsLaunching(true)
    try {
      // Set deckSource so kanji/review.tsx uses active_kanji_srs instead of kanji_cards.
      // Queue is empty — kanji review manages its own local queue from the active deck SRS query.
      initSession([], mode, undefined, 'active-kanji-deck')
      navigate({ to: '/kanji/review' })
    }
    finally {
      setIsLaunching(false)
    }
  }

  return { launch, isLaunching }
}
