import type { SRSRating } from '../types/srs'
import { useMotionValue, useTransform } from 'framer-motion'
import { useEffect, useState } from 'react'

export function useFlipCardState(onRate: (rating: SRSRating) => void) {
  const [isFlipped, setIsFlipped] = useState(false)
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-300, 0, 300], [-12, 0, 12])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
        return
      if (e.code === 'Space') {
        e.preventDefault()
        setIsFlipped(f => !f)
        return
      }
      if (!isFlipped)
        return
      if (e.key >= '1' && e.key <= '4') {
        const ratings: SRSRating[] = [0, 1, 2, 3]
        onRate(ratings[Number(e.key) - 1])
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isFlipped, onRate])

  function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (!isFlipped)
      return
    if (info.offset.x > 100)
      onRate(2)
    else if (info.offset.x < -100)
      onRate(0)
    else
      x.set(0)
  }

  return { isFlipped, setIsFlipped, x, rotate, handleDragEnd }
}
