import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { syncPackage } from './db/package-sync'
import { db } from './db/schema'
import { checkForUpdates } from './db/seed'
import { uploadPendingReviews } from './db/sync'
import { initAnonymousUser } from './lib/anonymous-user'
import { routeTree } from './routeTree.gen'
import { useAuthStore } from './stores/authStore'
import { useSettingsStore } from './stores/settingsStore'
import './app.css'

const SYNC_BASE_DELAY_MS = 60_000
const SYNC_MAX_DELAY_MS = 8 * 60 * 1000
const UPDATE_CHECK_INTERVAL_MS = 2 * 60 * 60 * 1000

function isSyncAllowed(): boolean {
  const { userId, email } = useAuthStore.getState()
  const { syncEnabled } = useSettingsStore.getState()
  return !!userId && email !== null && syncEnabled
}

async function triggerSync(): Promise<void> {
  if (!isSyncAllowed())
    return
  const { userId } = useAuthStore.getState()
  await uploadPendingReviews()
  await syncPackage(userId!)
}

async function maybeCheckForUpdates(): Promise<void> {
  const lastCheck = await db.settings.get('last_update_check').catch(() => undefined)
  if (lastCheck?.value) {
    const elapsed = Date.now() - new Date(lastCheck.value as string).getTime()
    if (elapsed < UPDATE_CHECK_INTERVAL_MS)
      return
  }
  checkForUpdates().catch(() => {})
}

let syncFailCount = 0

function scheduleNextSync(): void {
  const delayMs = Math.min(SYNC_BASE_DELAY_MS * (2 ** syncFailCount), SYNC_MAX_DELAY_MS)
  setTimeout(async () => {
    try {
      await triggerSync()
      syncFailCount = 0
    }
    catch {
      syncFailCount++
    }
    scheduleNextSync()
  }, delayMs)
}

function resetSyncBackoff(): void {
  syncFailCount = 0
}

window.addEventListener('online', resetSyncBackoff)
window.addEventListener('sync-complete' as keyof WindowEventMap, resetSyncBackoff)
setInterval(() => checkForUpdates().catch(() => {}), UPDATE_CHECK_INTERVAL_MS)

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible')
    maybeCheckForUpdates()
})

const queryClient = new QueryClient()
const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById('root')!

async function bootstrap() {
  await initAnonymousUser()
  await checkForUpdates()

  ReactDOM.createRoot(rootElement).render(
    <StrictMode>
      <App queryClient={queryClient} router={router} />
    </StrictMode>,
  )

  const splash = document.getElementById('update-splash')
  if (splash) {
    splash.classList.add('hidden')
    setTimeout(() => splash.remove(), 300)
  }
}

bootstrap().catch(console.error)
scheduleNextSync()
