import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { syncPackage } from './db/package-sync'
import { seedDatabase, seedKanji } from './db/seed'
import { uploadPendingReviews } from './db/sync'
import { initAnonymousUser } from './lib/anonymous-user'
import { routeTree } from './routeTree.gen'
import { useAuthStore } from './stores/authStore'
import { useSettingsStore } from './stores/settingsStore'
import './app.css'

const PACKAGE_SYNC_INTERVAL_MS = 60_000

// Sync is only allowed for users with a real account (email !== null) who have
// opted in. Anonymous (guest) users work entirely offline.
// IndexedDB is namespaced by userId, so multiple browser windows sharing the same
// profile are naturally isolated per user; concurrent writes are serialised by Dexie.
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

window.addEventListener('online', triggerSync)
setInterval(triggerSync, PACKAGE_SYNC_INTERVAL_MS)

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

  seedDatabase().then((result) => {
    if (result === 'seeded') {
      window.dispatchEvent(new CustomEvent('dataset-updated'))
    }
  }).catch(console.error)

  seedKanji().then((result) => {
    if (result === 'seeded') {
      window.dispatchEvent(new CustomEvent('kanji-seeded'))
    }
  }).catch(console.error)

  ReactDOM.createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
}

bootstrap().catch(console.error)
