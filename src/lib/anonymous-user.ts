import { supabase } from '../api/supabase'
import { db } from '../db/schema'
import { useAuthStore } from '../stores/authStore'

export async function initAnonymousUser(): Promise<string> {
  // 1. Existing Supabase session persisted from a previous visit — reuse it.
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) {
    useAuthStore.setState({ userId: session.user.id, isAuthenticated: true })
    return session.user.id
  }

  // 2. No session — sign in anonymously to get a real Supabase JWT.
  // onAuthStateChange (SIGNED_IN) in useAuth will call handleFirstSignIn,
  // which migrates any existing local Dexie data to the new Supabase user ID.
  try {
    const { data, error } = await supabase.auth.signInAnonymously()
    if (!error && data.session?.user) {
      useAuthStore.setState({ userId: data.session.user.id, isAuthenticated: true })
      return data.session.user.id
    }
  }
  catch {
    // Supabase unreachable — fall through to offline UUID
  }

  // 3. Offline fallback: local UUID only. Supabase writes will fail until
  // the network is restored and a real session can be established.
  const stored = await db.settings.get('anonymous_user_id')
  const userId = (stored?.value as string | undefined) ?? crypto.randomUUID()
  if (!stored) {
    await db.settings.put({ key: 'anonymous_user_id', value: userId })
  }
  useAuthStore.setState({ userId, isAuthenticated: true })
  return userId
}
