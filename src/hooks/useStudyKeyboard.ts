import type { SRSRating } from '../types/srs'
import { useEffect } from 'react'

const RATING_KEYS = new Set(['1', '2', '3', '4'])
const BLOCKED_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

export function useStudyKeyboard(phase: string, onRate: (r: SRSRating) => void): void {
  useEffect(() => {
    if (phase !== 'reviewing')
      return

    function handleKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey)
        return
      if (!RATING_KEYS.has(e.key))
        return
      const tag = (document.activeElement as HTMLElement | null)?.tagName ?? ''
      if (BLOCKED_TAGS.has(tag))
        return
      e.preventDefault()
      onRate(Number(e.key) as SRSRating)
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [phase, onRate])
}
