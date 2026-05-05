import { liveQuery } from 'dexie'
import { useEffect, useState } from 'react'

export function useLiveQuery<T>(
  querier: () => T | Promise<T>,
  deps: unknown[],
): T | undefined {
  const [result, setResult] = useState<T | undefined>(undefined)

  useEffect(() => {
    const subscription = liveQuery(querier).subscribe({
      next: value => setResult(value),
      error: err => console.error('[useLiveQuery]', err),
    })
    return () => subscription.unsubscribe()
    // eslint-disable-next-line react/exhaustive-deps
  }, deps)

  return result
}
