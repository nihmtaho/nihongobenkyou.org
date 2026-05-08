import { useEffect, useRef, useState } from 'react'

export function useScrollY(): number {
  const [scrollY, setScrollY] = useState(0)
  const rafIdRef = useRef<ReturnType<typeof requestAnimationFrame>>(0)

  useEffect(() => {
    function onScroll() {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = requestAnimationFrame(() => {
        setScrollY(window.scrollY)
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(rafIdRef.current)
    }
  }, [])

  return scrollY
}
