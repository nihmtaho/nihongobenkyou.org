import { useSyncExternalStore } from 'react'

function hasMatchMedia(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => {
      if (!hasMatchMedia())
        return () => {}
      const media = window.matchMedia(query)
      media.addEventListener('change', callback)
      return () => media.removeEventListener('change', callback)
    },
    () => hasMatchMedia() && window.matchMedia(query).matches,
    () => false,
  )
}
