import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { toast } from 'sonner'
import { registerSW } from 'virtual:pwa-register'
import { Toaster } from '@/components/ui/sonner'
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

const updateSW = registerSW({
  onNeedRefresh() {
    toast('Có phiên bản mới!', {
      description: 'Nhấn Cập nhật để tải phiên bản mới nhất',
      action: {
        label: 'Cập nhật',
        onClick: () => updateSW(true),
      },
      duration: Infinity,
    })
  },
  onOfflineReady() {
    toast('Ứng dụng sẵn sàng dùng offline', { duration: 3000 })
  },
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

  seedDatabase().then((result) => {
    if (result === 'seeded') {
      toast('Đã cập nhật dữ liệu từ vựng!', {
        description: 'Trang sẽ tự động tải lại sau 3 giây...',
        duration: 3000,
      })
      setTimeout(() => window.location.reload(), 3000)
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
        <Toaster position="top-right" />
      </QueryClientProvider>
    </StrictMode>,
  )
}

bootstrap().catch(console.error)
