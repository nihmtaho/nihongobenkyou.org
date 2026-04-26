import { useEffect, useState } from 'react'

export function useSyncStatus(): { syncJustCompleted: boolean } {
  const [syncJustCompleted, setSyncJustCompleted] = useState(false)

  useEffect(() => {
    let resetTimer: ReturnType<typeof setTimeout>

    function handleSyncComplete() {
      setSyncJustCompleted(true)
      resetTimer = setTimeout(setSyncJustCompleted, 3000, false)
    }

    window.addEventListener('sync-complete', handleSyncComplete)
    return () => {
      window.removeEventListener('sync-complete', handleSyncComplete)
      clearTimeout(resetTimer)
    }
  }, [])

  return { syncJustCompleted }
}
