import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { Toaster } from '@/components/ui/sonner'
import { syncPackage } from './db/package-sync'
import { db } from './db/schema'
import { checkForUpdates } from './db/seed'
import { uploadPendingReviews } from './db/sync'
import { initAnonymousUser } from './lib/anonymous-user'
import { routeTree } from './routeTree.gen'
import { useAuthStore } from './stores/authStore'
import { useSettingsStore } from './stores/settingsStore'
import './app.css'

const PACKAGE_SYNC_INTERVAL_MS = 60_000
const UPDATE_CHECK_INTERVAL_MS = 2 * 60 * 60 * 1000

function isSyncAllowed(): boolean {
  const { userId, email } = useAuthStore.getState()
  const { syncEnabled } = useSettingsStore.getState()
  return !!userId && email !== null && syncEnabled
}

function triggerSync(): void {
  if (!isSyncAllowed())
    return
  const { userId } = useAuthStore.getState()
  uploadPendingReviews().catch(() => {})
  syncPackage(userId!).catch(() => {})
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

window.addEventListener('online', triggerSync)
setInterval(triggerSync, PACKAGE_SYNC_INTERVAL_MS)
setInterval(() => checkForUpdates().catch(() => {}), UPDATE_CHECK_INTERVAL_MS)

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible')
    maybeCheckForUpdates()
})

registerSW({ onOfflineReady() {} })

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
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster position="top-right" />
      </QueryClientProvider>
    </StrictMode>,
  )

  const splash = document.getElementById('update-splash')
  if (splash) {
    splash.classList.add('hidden')
    setTimeout(() => splash.remove(), 300)
  }
}

bootstrap().catch(console.error)
