import { useEffect, useRef, useState } from 'react'

export type ScrollDirection = 'up' | 'down' | 'top'

const DEFAULT_THRESHOLD = 10

export function useScrollDirection(threshold = DEFAULT_THRESHOLD): ScrollDirection {
  const [direction, setDirection] = useState<ScrollDirection>('top')
  const lastYRef = useRef(0)
  const rafIdRef = useRef<ReturnType<typeof requestAnimationFrame>>(0)

  useEffect(() => {
    function onScroll() {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = requestAnimationFrame(() => {
        const y = window.scrollY
        const prev = lastYRef.current
        lastYRef.current = y
        if (y < threshold) {
          setDirection('top')
        }
        else if (y > prev) {
          setDirection('down')
        }
        else if (y < prev) {
          setDirection('up')
        }
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(rafIdRef.current)
    }
  }, [threshold])

  return direction
}
