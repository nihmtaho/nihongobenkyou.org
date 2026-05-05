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
      initSession([], mode, undefined, 'active-kanji-deck')
      navigate({ to: '/study/review', search: { filter: 'kanji' } })
    }
    finally {
      setIsLaunching(false)
    }
  }

  return { launch, isLaunching }
}
