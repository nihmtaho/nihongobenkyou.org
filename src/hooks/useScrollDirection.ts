import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

export type ScrollDirection = 'up' | 'down' | 'top'

export function useScrollDirection(threshold = 10): ScrollDirection {
  const [direction, setDirection] = useState<ScrollDirection>('top')
  const lastYRef = useRef(0)
  const rafIdRef = useRef(0)

  useEffect(() => {
    function onScroll() {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = requestAnimationFrame(() => {
        const y = window.scrollY
        const prev = lastYRef.current
        lastYRef.current = y
        // NOTE: flushSync ensures the state update commits synchronously inside the
        // RAF callback so that tests using vi.runAllTimersAsync() can observe the
        // updated value without wrapping dispatches in act(). Overhead is negligible
        // for a single boolean-like state on a passive scroll listener.
        // eslint-disable-next-line react-dom/no-flush-sync
        flushSync(() => {
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
