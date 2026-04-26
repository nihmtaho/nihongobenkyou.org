import { useEffect, useState } from 'react'
import { supabase } from '../api/supabase'
import { useAuthStore } from '../stores/authStore'

export function useOfflineAuthNotice(): { showNotice: boolean } {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const email = useAuthStore(s => s.email)
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  const [jwtExpired, setJwtExpired] = useState(false)

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
      setJwtExpired(false)
    }
    function handleOffline() {
      setIsOnline(false)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT')
        setJwtExpired(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Poll JWT expiry while offline and authenticated as a real (non-anonymous) user
  useEffect(() => {
    const isRealUser = isAuthenticated && email !== null
    if (isOnline || !isRealUser)
      return

    async function checkExpiry() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.expires_at)
        return
      setJwtExpired(session.expires_at < Date.now() / 1000)
    }

    void checkExpiry()
    const interval = setInterval(checkExpiry, 30_000)
    return () => clearInterval(interval)
  }, [isOnline, isAuthenticated, email])

  const showNotice = !isOnline && jwtExpired && isAuthenticated && email !== null
  return { showNotice }
}
