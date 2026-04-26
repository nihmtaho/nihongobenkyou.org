import { db } from '../db/schema'
import { useAuthStore } from '../stores/authStore'

export async function initAnonymousUser(): Promise<string> {
  const stored = await db.settings.get('anonymous_user_id')
  const userId = (stored?.value as string | undefined) ?? crypto.randomUUID()

  if (!stored) {
    await db.settings.put({ key: 'anonymous_user_id', value: userId })
  }

  useAuthStore.setState({ userId, isAuthenticated: true })
  return userId
}
