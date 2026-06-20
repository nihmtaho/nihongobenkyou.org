import { useEffect, useState } from 'react'
import { db } from '../db/schema'
import { useLiveQuery } from '../lib/use-live-query'

export function useSyncStatus(): {
  syncJustCompleted: boolean
  isSyncing: boolean
  lastError: string | null
  pendingCount: number
} {
  const [syncJustCompleted, setSyncJustCompleted] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  const pendingCount = useLiveQuery(
    () => db.srs_cards.where('pending_sync').equals(1).count(),
    [],
  ) ?? 0

  useEffect(() => {
    let resetTimer: ReturnType<typeof setTimeout>

    function handleSyncStart() {
      setIsSyncing(true)
      setLastError(null)
    }

    function handleSyncComplete() {
      setIsSyncing(false)
      setSyncJustCompleted(true)
      resetTimer = setTimeout(setSyncJustCompleted, 3000, false)
    }

    function handleSyncError(e: Event) {
      setIsSyncing(false)
      const msg = (e as CustomEvent<{ message: string }>).detail?.message ?? 'Sync failed'
      setLastError(msg)
    }

    window.addEventListener('sync-start', handleSyncStart)
    window.addEventListener('sync-complete', handleSyncComplete)
    window.addEventListener('sync-error', handleSyncError)
    return () => {
      window.removeEventListener('sync-start', handleSyncStart)
      window.removeEventListener('sync-complete', handleSyncComplete)
      window.removeEventListener('sync-error', handleSyncError)
      clearTimeout(resetTimer)
    }
  }, [])

  return { syncJustCompleted, isSyncing, lastError, pendingCount }
}
